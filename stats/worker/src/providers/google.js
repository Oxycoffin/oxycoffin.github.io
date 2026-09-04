import { pemBytes, signJwt } from "../crypto.js";
import { addDays, dayParts } from "../dates.js";
import { decimalValue } from "../parsers.js";

let cachedToken = null;
let tokenExpiresAt = 0;

async function googleToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assertion = await signJwt({
    header: { alg: "RS256", typ: "JWT" },
    payload: {
      iss: serviceAccount.client_email,
      scope:
        "https://www.googleapis.com/auth/playdeveloperreporting https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    key,
    algorithm: { name: "RSASSA-PKCS1-v1_5" },
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}`);
  const body = await response.json();
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return cachedToken;
}

function dateTime(day) {
  // Daily Play metrics use the metric set's default timezone. Google rejects
  // an explicit UTC timezone for metric sets that aggregate in another zone.
  return dayParts(day);
}

function dailyWindow(metricSet) {
  const freshness = metricSet.freshnessInfo?.freshnesses?.find(
    (item) => item.aggregationPeriod === "DAILY",
  );
  if (!freshness?.latestEndTime)
    throw new Error("Play metric set has no DAILY freshness window");
  const latest = freshness.latestEndTime;
  const endDay = [
    latest.year,
    String(latest.month).padStart(2, "0"),
    String(latest.day).padStart(2, "0"),
  ].join("-");
  const zone = latest.timeZone
    ? { timeZone: latest.timeZone }
    : latest.utcOffset
      ? { utcOffset: latest.utcOffset }
      : {};
  return {
    startTime: { ...dateTime(addDays(endDay, -32)), ...zone },
    endTime: { ...dateTime(endDay), ...zone },
  };
}

async function metricSetWindow(env, set) {
  const response = await fetch(
    `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${env.GOOGLE_PLAY_PACKAGE}/${set}`,
    {
      headers: { Authorization: `Bearer ${await googleToken(env)}` },
    },
  );
  if (!response.ok)
    throw new Error(`Play ${set} metadata returned ${response.status}`);
  return dailyWindow(await response.json());
}

async function queryMetricSet(env, set, metrics) {
  const window = await metricSetWindow(env, set);
  const response = await fetch(
    `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${env.GOOGLE_PLAY_PACKAGE}/${set}:query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await googleToken(env)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timelineSpec: { aggregationPeriod: "DAILY", ...window },
        metrics,
        pageSize: 1000,
      }),
    },
  );
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/gu, " ").slice(0, 220);
    throw new Error(`Play ${set} returned ${response.status}: ${detail}`);
  }
  return response.json();
}

function metricDate(row) {
  const value = row.startTime || row.endTime || {};
  return [
    value.year,
    String(value.month).padStart(2, "0"),
    String(value.day).padStart(2, "0"),
  ].join("-");
}

function mergeVitals(crashes, anrs) {
  const days = new Map();
  const metric = (row, name) =>
    decimalValue(row.metrics?.find((item) => item.metric === name));
  for (const row of crashes.rows || []) {
    days.set(metricDate(row), {
      date: metricDate(row),
      crashRate: metric(row, "crashRate"),
      userPerceivedCrashRate: metric(row, "userPerceivedCrashRate"),
    });
  }
  for (const row of anrs.rows || []) {
    const date = metricDate(row);
    days.set(date, {
      ...(days.get(date) || { date }),
      anrRate: metric(row, "anrRate"),
      userPerceivedAnrRate: metric(row, "userPerceivedAnrRate"),
    });
  }
  return [...days.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30);
}

async function fetchReviews(env) {
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.GOOGLE_PLAY_PACKAGE}/reviews?maxResults=100`,
    {
      headers: { Authorization: `Bearer ${await googleToken(env)}` },
    },
  );
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Play reviews returned ${response.status}`);
  const body = await response.json();
  const recent = (body.reviews || [])
    .map((review) => {
      const comment = review.comments?.find(
        (item) => item.userComment,
      )?.userComment;
      if (!comment) return null;
      return {
        id: review.reviewId,
        author: review.authorName || "",
        rating: Number(comment.starRating || 0),
        body: comment.text || "",
        language: comment.reviewerLanguage || null,
        createdAt: comment.lastModified?.seconds
          ? new Date(Number(comment.lastModified.seconds) * 1000).toISOString()
          : null,
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      String(right.createdAt).localeCompare(String(left.createdAt)),
    );
  const ratings = recent.map((review) => review.rating).filter(Boolean);
  return {
    recentCount: ratings.length,
    averageRating: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null,
    lastReviewAt: recent[0]?.createdAt || null,
    recent: recent.slice(0, 5),
  };
}

export async function refreshPlay(env) {
  await googleToken(env);
  const [crashes, anrs, reviews] = await Promise.all([
    queryMetricSet(env, "crashRateMetricSet", [
      "crashRate",
      "userPerceivedCrashRate",
    ]),
    queryMetricSet(env, "anrRateMetricSet", [
      "anrRate",
      "userPerceivedAnrRate",
    ]),
    fetchReviews(env),
  ]);
  return { daily: mergeVitals(crashes, anrs), reviews };
}

export const googleInternals = {
  dailyWindow,
  dateTime,
  mergeVitals,
  metricDate,
};
