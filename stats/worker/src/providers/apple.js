import { pemBytes, signJwt } from "../crypto.js";
import { addDays, isoDay } from "../dates.js";
import { parseDelimited, responseTextPossiblyGzipped } from "../parsers.js";

const DOWNLOAD_TYPES = new Set(["1", "1-B", "1E", "1EP", "1EU", "1F", "1T"]);
const BACKFILL_DAYS = 3;
const HISTORY_DAYS = 60;
let cachedToken = null;
let tokenExpiresAt = 0;

async function appleToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) return cachedToken;
  const now = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(env.APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  cachedToken = await signJwt({
    header: { alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" },
    payload: {
      iss: env.APPLE_ISSUER_ID,
      iat: now,
      exp: now + 15 * 60,
      aud: "appstoreconnect-v1",
    },
    key,
    algorithm: { name: "ECDSA", hash: "SHA-256" },
  });
  tokenExpiresAt = (now + 15 * 60) * 1000;
  return cachedToken;
}

function summarizeRows(rows, appId, appSku, reportDate, currency) {
  let downloads = 0;
  let refunds = 0;
  let transactions = 0;
  const proceedsByCurrency = {};
  const countries = {};
  for (const row of rows) {
    const belongsToApp =
      String(row["Apple Identifier"] || "") === String(appId) ||
      String(row["Parent Identifier"] || "") === String(appSku);
    if (!belongsToApp) continue;
    const units = Number(row.Units || 0);
    if (DOWNLOAD_TYPES.has(row["Product Type Identifier"]) && units > 0)
      downloads += units;
    if (units < 0) refunds += Math.abs(units);
    else transactions += units;
    const rowCurrency = row["Currency of Proceeds"] || currency;
    const proceeds = Number(row["Developer Proceeds"] || 0) * units;
    proceedsByCurrency[rowCurrency] =
      (proceedsByCurrency[rowCurrency] || 0) + proceeds;
    const country = row["Country Code"] || "—";
    const countryData = countries[country] || {
      code: country,
      downloads: 0,
      proceeds: 0,
    };
    if (DOWNLOAD_TYPES.has(row["Product Type Identifier"]) && units > 0)
      countryData.downloads += units;
    if (rowCurrency === currency) countryData.proceeds += proceeds;
    countries[country] = countryData;
  }
  for (const code of Object.keys(proceedsByCurrency))
    proceedsByCurrency[code] =
      Math.round(proceedsByCurrency[code] * 1_000_000) / 1_000_000;
  return {
    date: reportDate,
    downloads,
    refunds,
    transactions,
    proceeds: proceedsByCurrency[currency] || 0,
    proceedsByCurrency,
    countries: Object.values(countries),
    currency,
  };
}

async function fetchAppleReviews(env) {
  const parameters = new URLSearchParams({ limit: "10", sort: "-createdDate" });
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/apps/${env.APPLE_APP_ID}/customerReviews?${parameters}`,
    {
      headers: {
        Authorization: `Bearer ${await appleToken(env)}`,
        Accept: "application/json",
      },
    },
  );
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok)
    throw new Error(`App Store reviews returned ${response.status}`);
  const body = await response.json();
  const recent = (body.data || []).map((review) => ({
    id: review.id,
    rating: Number(review.attributes?.rating || 0),
    title: review.attributes?.title || "",
    body: review.attributes?.body || "",
    author: review.attributes?.reviewerNickname || "",
    createdAt: review.attributes?.createdDate || null,
    territory: review.attributes?.territory || null,
  }));
  return {
    recentCount: recent.length,
    averageRating: recent.length
      ? recent.reduce((total, review) => total + review.rating, 0) /
        recent.length
      : null,
    lastReviewAt: recent[0]?.createdAt || null,
    recent: recent.slice(0, 5),
  };
}

export async function fetchAppleDay(env, reportDate) {
  const parameters = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportDate]": reportDate,
    "filter[reportSubType]": "SUMMARY",
    "filter[reportType]": "SALES",
    "filter[vendorNumber]": env.APPLE_VENDOR_NUMBER,
    "filter[version]": "1_0",
  });
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/salesReports?${parameters}`,
    {
      headers: {
        Authorization: `Bearer ${await appleToken(env)}`,
        Accept: "application/a-gzip",
      },
    },
  );
  if (response.status === 404)
    return { date: reportDate, reportAvailable: false };
  if (!response.ok)
    throw new Error(`App Store sales report returned ${response.status}`);
  const rows = parseDelimited(
    await responseTextPossiblyGzipped(response),
    "\t",
  );
  return summarizeRows(
    rows,
    env.APPLE_APP_ID,
    env.APPLE_APP_SKU,
    reportDate,
    env.DEFAULT_CURRENCY || "EUR",
  );
}

export async function refreshApple(env, existing = {}) {
  await appleToken(env);
  const yesterday = addDays(isoDay(), -1);
  const existingDays = new Set((existing.daily || []).map((item) => item.date));
  const targets = [yesterday];
  // Retry a recently unpublished report while reserving capacity for backfill.
  const retry = (existing.daily || []).find(
    (item) =>
      item.reportAvailable === false &&
      item.date < yesterday &&
      item.date >= addDays(yesterday, -3),
  );
  if (retry) targets.push(retry.date);
  for (
    let offset = 1;
    offset < HISTORY_DAYS && targets.length < BACKFILL_DAYS;
    offset += 1
  ) {
    const candidate = addDays(yesterday, -offset);
    if (!existingDays.has(candidate)) targets.push(candidate);
  }
  const [points, reviewsResult] = await Promise.all([
    Promise.all(targets.map((target) => fetchAppleDay(env, target))),
    fetchAppleReviews(env).catch((error) => {
      console.warn(
        JSON.stringify({
          event: "apple_reviews_unavailable",
          message: String(error?.message || error),
        }),
      );
      return existing.reviews || null;
    }),
  ]);
  const replacedDates = new Set(points.map((point) => point.date));
  const daily = [
    ...(existing.daily || []).filter((item) => !replacedDates.has(item.date)),
    ...points,
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-90);
  const countries = new Map();
  for (const day of daily.slice(-30)) {
    for (const country of day.countries || []) {
      const total = countries.get(country.code) || {
        code: country.code,
        downloads: 0,
        proceeds: 0,
      };
      total.downloads += Number(country.downloads || 0);
      total.proceeds += Number(country.proceeds || 0);
      countries.set(country.code, total);
    }
  }
  return {
    daily,
    backfillComplete: Array.from({ length: HISTORY_DAYS }, (_, offset) =>
      addDays(yesterday, -offset),
    ).every((date) => daily.some((day) => day.date === date)),
    countries: [...countries.values()]
      .sort(
        (left, right) =>
          right.proceeds + right.downloads - (left.proceeds + left.downloads),
      )
      .slice(0, 8),
    reviews: reviewsResult,
  };
}

export const appleInternals = { summarizeRows };
