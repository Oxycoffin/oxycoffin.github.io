import { dayParts, daysAgo, isoDay } from "../dates.js";
import { decimalValue } from "../parsers.js";

let cachedToken = null;
let tokenExpiresAt = 0;

async function admobToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.ADMOB_CLIENT_ID,
      client_secret: env.ADMOB_CLIENT_SECRET,
      refresh_token: env.ADMOB_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`AdMob OAuth returned ${response.status}`);
  const body = await response.json();
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return cachedToken;
}

async function accountName(env, token) {
  if (env.ADMOB_ACCOUNT)
    return env.ADMOB_ACCOUNT.startsWith("accounts/")
      ? env.ADMOB_ACCOUNT
      : `accounts/${env.ADMOB_ACCOUNT}`;
  const response = await fetch("https://admob.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new Error(`AdMob accounts returned ${response.status}`);
  const body = await response.json();
  if (!body.account?.length)
    throw new Error("No AdMob account is available to this token");
  return body.account[0].name;
}

async function parseStreamingJson(response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

function dimensionDate(row) {
  const raw = row.dimensionValues?.DATE?.value || "";
  if (/^\d{8}$/u.test(raw))
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`;
  return raw;
}

function reportRows(parts, currency) {
  return parts
    .filter((part) => part.row)
    .map(({ row }) => ({
      date: dimensionDate(row),
      estimatedEarnings:
        decimalValue(row.metricValues?.ESTIMATED_EARNINGS) || 0,
      impressions: decimalValue(row.metricValues?.IMPRESSIONS) || 0,
      clicks: decimalValue(row.metricValues?.CLICKS) || 0,
      matchedRequests: decimalValue(row.metricValues?.MATCHED_REQUESTS) || 0,
      adRequests: decimalValue(row.metricValues?.AD_REQUESTS) || 0,
      impressionRpm: decimalValue(row.metricValues?.IMPRESSION_RPM) || 0,
      currency,
    }))
    .filter((row) => row.date)
    .sort((left, right) => left.date.localeCompare(right.date));
}

async function generateReport(account, token, reportSpec) {
  const response = await fetch(
    `https://admob.googleapis.com/v1/${account}/networkReport:generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reportSpec }),
    },
  );
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/gu, " ").slice(0, 220);
    throw new Error(`AdMob report returned ${response.status}: ${detail}`);
  }
  return parseStreamingJson(response);
}

function breakdownRows(parts, dimension, currency) {
  return parts
    .filter((part) => part.row)
    .map(({ row }) => {
      const item = row.dimensionValues?.[dimension] || {};
      const earnings = decimalValue(row.metricValues?.ESTIMATED_EARNINGS) || 0;
      const impressions = decimalValue(row.metricValues?.IMPRESSIONS) || 0;
      return {
        id: item.value || item.displayLabel || "unknown",
        label: item.displayLabel || item.value || "Unknown",
        earnings,
        impressions,
        clicks: decimalValue(row.metricValues?.CLICKS) || 0,
        rpm: impressions ? (earnings / impressions) * 1000 : null,
        currency,
      };
    })
    .sort((left, right) => right.earnings - left.earnings)
    .slice(0, 8);
}

async function optionalBreakdown(
  account,
  token,
  dateRange,
  dimension,
  currency,
) {
  try {
    const parts = await generateReport(account, token, {
      dateRange,
      dimensions: [dimension],
      metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS"],
      localizationSettings: { currencyCode: currency, languageCode: "en-US" },
    });
    return breakdownRows(parts, dimension, currency);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "admob_breakdown_unavailable",
        dimension,
        message: String(error?.message || error),
      }),
    );
    return [];
  }
}

const FULL_HISTORY_INTERVAL = 6 * 60 * 60 * 1000;
const BREAKDOWN_INTERVAL = 60 * 60 * 1000;
const RECENT_DAYS = 7;

function olderThan(timestamp, interval) {
  return !timestamp || Date.now() - Date.parse(timestamp) >= interval;
}

// Frequent refreshes only re-read the last week, where AdMob still revises
// estimates; the full 60-day history is rebuilt a few times a day.
export function mergeDaily(existing, fresh, start) {
  const freshDates = new Set(fresh.map((row) => row.date));
  return [
    ...existing.filter((row) => row.date < start && !freshDates.has(row.date)),
    ...fresh,
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-61);
}

export async function refreshAdmob(env, existing = {}) {
  const token = await admobToken(env);
  const account = existing.account || (await accountName(env, token));
  const currency = env.DEFAULT_CURRENCY || "EUR";
  const full = !existing.daily?.length || olderThan(existing.fullHistoryAt, FULL_HISTORY_INTERVAL);
  const start = daysAgo(full ? 60 : RECENT_DAYS);
  const dateRange = { startDate: dayParts(start), endDate: dayParts(isoDay()) };
  const breakdownRange = {
    startDate: dayParts(daysAgo(29)),
    endDate: dayParts(isoDay()),
  };
  const breakdowns =
    !existing.adUnits?.length || !existing.platforms || olderThan(existing.breakdownAt, BREAKDOWN_INTERVAL);
  const [dailyParts, adUnits, countries, platforms] = await Promise.all([
    generateReport(account, token, {
      dateRange,
      dimensions: ["DATE"],
      metrics: [
        "ESTIMATED_EARNINGS",
        "IMPRESSIONS",
        "CLICKS",
        "MATCHED_REQUESTS",
        "AD_REQUESTS",
        "IMPRESSION_RPM",
      ],
      localizationSettings: { currencyCode: currency, languageCode: "en-US" },
    }),
    breakdowns ? optionalBreakdown(account, token, breakdownRange, "AD_UNIT", currency) : existing.adUnits,
    breakdowns ? optionalBreakdown(account, token, breakdownRange, "COUNTRY", currency) : existing.countries,
    breakdowns ? optionalBreakdown(account, token, breakdownRange, "PLATFORM", currency) : existing.platforms,
  ]);
  const fresh = reportRows(dailyParts, currency);
  const now = new Date().toISOString();
  return {
    account,
    daily: full ? fresh : mergeDaily(existing.daily || [], fresh, start),
    fullHistoryAt: full ? now : existing.fullHistoryAt,
    adUnits,
    countries,
    platforms,
    breakdownAt: breakdowns ? now : existing.breakdownAt,
    breakdownStart: breakdowns ? daysAgo(29) : existing.breakdownStart,
    breakdownEnd: breakdowns ? isoDay() : existing.breakdownEnd,
  };
}

export const admobInternals = { reportRows, dimensionDate, breakdownRows, mergeDaily };
