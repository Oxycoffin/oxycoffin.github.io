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
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) throw new Error(`AdMob OAuth returned ${response.status}`);
  const body = await response.json();
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return cachedToken;
}

async function accountName(env, token) {
  if (env.ADMOB_ACCOUNT) return env.ADMOB_ACCOUNT.startsWith("accounts/") ? env.ADMOB_ACCOUNT : `accounts/${env.ADMOB_ACCOUNT}`;
  const response = await fetch("https://admob.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`AdMob accounts returned ${response.status}`);
  const body = await response.json();
  if (!body.account?.length) throw new Error("No AdMob account is available to this token");
  return body.account[0].name;
}

async function parseStreamingJson(response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return text.split("\n").filter(Boolean).map(line => JSON.parse(line));
  }
}

function dimensionDate(row) {
  const raw = row.dimensionValues?.DATE?.value || "";
  if (/^\d{8}$/u.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`;
  return raw;
}

function reportRows(parts, currency) {
  return parts.filter(part => part.row).map(({ row }) => ({
    date: dimensionDate(row),
    estimatedEarnings: decimalValue(row.metricValues?.ESTIMATED_EARNINGS) || 0,
    impressions: decimalValue(row.metricValues?.IMPRESSIONS) || 0,
    clicks: decimalValue(row.metricValues?.CLICKS) || 0,
    matchedRequests: decimalValue(row.metricValues?.MATCHED_REQUESTS) || 0,
    adRequests: decimalValue(row.metricValues?.AD_REQUESTS) || 0,
    observedEcpm: decimalValue(row.metricValues?.OBSERVED_ECPM) || 0,
    currency
  })).filter(row => row.date).sort((left, right) => left.date.localeCompare(right.date));
}

export async function refreshAdmob(env) {
  const token = await admobToken(env);
  const account = await accountName(env, token);
  const currency = env.DEFAULT_CURRENCY || "EUR";
  const response = await fetch(`https://admob.googleapis.com/v1/${account}/networkReport:generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reportSpec: {
      dateRange: { startDate: dayParts(daysAgo(60)), endDate: dayParts(isoDay()) },
      dimensions: ["DATE"],
      metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS", "MATCHED_REQUESTS", "AD_REQUESTS", "OBSERVED_ECPM"],
      localizationSettings: { currencyCode: currency, languageCode: "en-US" }
    } })
  });
  if (!response.ok) throw new Error(`AdMob report returned ${response.status}`);
  return { account, daily: reportRows(await parseStreamingJson(response), currency) };
}

export const admobInternals = { reportRows, dimensionDate };
