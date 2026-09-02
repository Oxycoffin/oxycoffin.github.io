import { pemBytes, signJwt } from "../crypto.js";
import { addDays, isoDay } from "../dates.js";
import { parseDelimited, responseTextPossiblyGzipped } from "../parsers.js";

const DOWNLOAD_TYPES = new Set(["1", "1-B", "1E", "1EP", "1EU", "1F", "1T"]);
let cachedToken = null;
let tokenExpiresAt = 0;

async function appleToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) return cachedToken;
  const now = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(env.APPLE_PRIVATE_KEY), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  cachedToken = await signJwt({
    header: { alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" },
    payload: { iss: env.APPLE_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: "appstoreconnect-v1" },
    key,
    algorithm: { name: "ECDSA", hash: "SHA-256" }
  });
  tokenExpiresAt = (now + 15 * 60) * 1000;
  return cachedToken;
}

function summarizeRows(rows, appId, appSku, reportDate, currency) {
  let downloads = 0;
  const proceedsByCurrency = {};
  for (const row of rows) {
    const belongsToApp = String(row["Apple Identifier"] || "") === String(appId)
      || String(row["Parent Identifier"] || "") === String(appSku);
    if (!belongsToApp) continue;
    const units = Number(row.Units || 0);
    if (DOWNLOAD_TYPES.has(row["Product Type Identifier"])) downloads += units;
    const rowCurrency = row["Currency of Proceeds"] || currency;
    proceedsByCurrency[rowCurrency] = (proceedsByCurrency[rowCurrency] || 0) + Number(row["Developer Proceeds"] || 0) * units;
  }
  for (const code of Object.keys(proceedsByCurrency)) proceedsByCurrency[code] = Math.round(proceedsByCurrency[code] * 1_000_000) / 1_000_000;
  return { date: reportDate, downloads, proceeds: proceedsByCurrency[currency] || 0, proceedsByCurrency, currency };
}

export async function fetchAppleDay(env, reportDate) {
  const parameters = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportDate]": reportDate,
    "filter[reportSubType]": "SUMMARY",
    "filter[reportType]": "SALES",
    "filter[vendorNumber]": env.APPLE_VENDOR_NUMBER,
    "filter[version]": "1_0"
  });
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${parameters}`, {
    headers: { Authorization: `Bearer ${await appleToken(env)}`, Accept: "application/a-gzip" }
  });
  if (response.status === 404) return { date: reportDate, downloads: 0, proceeds: 0, proceedsByCurrency: {}, currency: env.DEFAULT_CURRENCY || "EUR" };
  if (!response.ok) throw new Error(`App Store sales report returned ${response.status}`);
  const rows = parseDelimited(await responseTextPossiblyGzipped(response), "\t");
  return summarizeRows(rows, env.APPLE_APP_ID, env.APPLE_APP_SKU, reportDate, env.DEFAULT_CURRENCY || "EUR");
}

export async function refreshApple(env, existing = {}) {
  const yesterday = addDays(isoDay(), -1);
  const existingDays = new Set((existing.daily || []).map(item => item.date));
  let target = yesterday;
  if (!existingDays.has(yesterday) || (existing.daily || []).length >= 90) {
    target = yesterday;
  } else {
    const oldest = (existing.daily || []).map(item => item.date).sort()[0];
    target = oldest ? addDays(oldest, -1) : yesterday;
  }
  const point = await fetchAppleDay(env, target);
  const daily = [...(existing.daily || []).filter(item => item.date !== point.date), point]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-90);
  return { daily, backfillComplete: daily.length >= 60 };
}

export const appleInternals = { summarizeRows };
