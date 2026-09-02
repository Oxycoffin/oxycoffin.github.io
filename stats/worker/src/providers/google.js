import { pemBytes, signJwt } from "../crypto.js";
import { dayParts, daysAgo, isoDay } from "../dates.js";
import { decimalValue } from "../parsers.js";

let cachedToken = null;
let tokenExpiresAt = 0;

async function googleToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(serviceAccount.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const assertion = await signJwt({
    header: { alg: "RS256", typ: "JWT" },
    payload: {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/playdeveloperreporting https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    },
    key,
    algorithm: { name: "RSASSA-PKCS1-v1_5" }
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}`);
  const body = await response.json();
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return cachedToken;
}

function dateTime(day) {
  return { ...dayParts(day), timeZone: { id: "UTC" } };
}

async function queryMetricSet(env, set, metrics) {
  const response = await fetch(`https://playdeveloperreporting.googleapis.com/v1beta1/apps/${env.GOOGLE_PLAY_PACKAGE}/${set}:query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await googleToken(env)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timelineSpec: { aggregationPeriod: "DAILY", startTime: dateTime(daysAgo(32)), endTime: dateTime(isoDay()) },
      metrics,
      pageSize: 1000
    })
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/gu, " ").slice(0, 220);
    throw new Error(`Play ${set} returned ${response.status}: ${detail}`);
  }
  return response.json();
}

function metricDate(row) {
  const value = row.startTime || row.endTime || {};
  return [value.year, String(value.month).padStart(2, "0"), String(value.day).padStart(2, "0")].join("-");
}

function mergeVitals(crashes, anrs) {
  const days = new Map();
  for (const row of crashes.rows || []) {
    days.set(metricDate(row), {
      date: metricDate(row),
      crashRate: decimalValue(row.metrics?.crashRate),
      userPerceivedCrashRate: decimalValue(row.metrics?.userPerceivedCrashRate)
    });
  }
  for (const row of anrs.rows || []) {
    const date = metricDate(row);
    days.set(date, {
      ...(days.get(date) || { date }),
      anrRate: decimalValue(row.metrics?.anrRate),
      userPerceivedAnrRate: decimalValue(row.metrics?.userPerceivedAnrRate)
    });
  }
  return [...days.values()].sort((left, right) => left.date.localeCompare(right.date)).slice(-30);
}

async function fetchReviews(env) {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.GOOGLE_PLAY_PACKAGE}/reviews?maxResults=100`, {
    headers: { Authorization: `Bearer ${await googleToken(env)}` }
  });
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Play reviews returned ${response.status}`);
  const body = await response.json();
  const ratings = (body.reviews || []).map(review => review.comments?.find(comment => comment.userComment)?.userComment?.starRating).filter(Boolean);
  return {
    recentCount: ratings.length,
    averageRating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
    lastReviewAt: (body.reviews || []).map(review => review.comments?.[0]?.userComment?.lastModified?.seconds).filter(Boolean).sort().at(-1) || null
  };
}

export async function refreshPlay(env) {
  const [crashes, anrs, reviews] = await Promise.all([
    queryMetricSet(env, "crashRateMetricSet", ["crashRate", "userPerceivedCrashRate"]),
    queryMetricSet(env, "anrRateMetricSet", ["anrRate", "userPerceivedAnrRate"]),
    fetchReviews(env)
  ]);
  return { daily: mergeVitals(crashes, anrs), reviews };
}

export const googleInternals = { mergeVitals, metricDate };
