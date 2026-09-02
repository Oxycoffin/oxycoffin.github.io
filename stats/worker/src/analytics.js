import { addDays, isoDay, lastDays } from "./dates.js";

function sum(rows, field, start, end) {
  return rows.filter(row => row.date >= start && row.date <= end).reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function change(current, previous) {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function sourcePublic(source = {}) {
  return {
    status: source.status || "pending",
    lastSuccessAt: source.lastSuccessAt || null,
    lastAttemptAt: source.lastAttemptAt || null,
    error: source.error || null
  };
}

function latestValue(rows, field) {
  return [...rows].reverse().find(row => row[field] !== null && row[field] !== undefined)?.[field] ?? 0;
}

export function buildDashboard(state, viewer = {}) {
  const today = isoDay();
  const currentStart = addDays(today, -29);
  const previousStart = addDays(today, -59);
  const previousEnd = addDays(today, -30);
  const apple = state.sources?.apple?.data?.daily || [];
  const admob = state.sources?.admob?.data?.daily || [];
  const play = state.sources?.play?.data?.daily || [];
  const coverage = { apple: apple.length > 0, admob: admob.length > 0, play: play.length > 0 };
  coverage.revenue = coverage.apple || coverage.admob;
  const appleRevenue30 = sum(apple, "proceeds", currentStart, today);
  const previousAppleRevenue = sum(apple, "proceeds", previousStart, previousEnd);
  const admobRevenue30 = sum(admob, "estimatedEarnings", currentStart, today);
  const previousAdmobRevenue = sum(admob, "estimatedEarnings", previousStart, previousEnd);
  const downloads30 = sum(apple, "downloads", currentStart, today);
  const previousDownloads = sum(apple, "downloads", previousStart, previousEnd);
  const impressions30 = sum(admob, "impressions", currentStart, today);
  const previousImpressions = sum(admob, "impressions", previousStart, previousEnd);
  const revenue30 = appleRevenue30 + admobRevenue30;
  const previousRevenue = previousAppleRevenue + previousAdmobRevenue;
  const crashRate = latestValue(play, "userPerceivedCrashRate") || latestValue(play, "crashRate");
  const hasUnconvertedAppleRevenue = apple.some(day => Object.entries(day.proceedsByCurrency || {})
    .some(([currency, amount]) => currency !== (state.currency || "EUR") && Number(amount) !== 0));

  const appleByDate = new Map(apple.map(item => [item.date, item]));
  const admobByDate = new Map(admob.map(item => [item.date, item]));
  const revenueTrend = lastDays(30).map(date => ({
    date,
    apple: Number(appleByDate.get(date)?.proceeds || 0),
    admob: Number(admobByDate.get(date)?.estimatedEarnings || 0)
  }));

  const revenueChange = coverage.revenue ? change(revenue30, previousRevenue) : null;
  const insights = [];
  if (revenueChange === null) insights.push({ code: "data", tone: "neutral" });
  else if (revenueChange >= 5) insights.push({ code: "revenueUp", tone: "good", value: revenueChange });
  else if (revenueChange <= -5) insights.push({ code: "revenueDown", tone: "warn", value: revenueChange });
  else insights.push({ code: "revenueFlat", tone: "neutral", value: revenueChange });
  if (play.length) insights.push(crashRate > 0.01
    ? { code: "qualityWarn", tone: "warn", value: crashRate, valueType: "percent" }
    : { code: "qualityGood", tone: "good", value: crashRate, valueType: "percent" });
  if (hasUnconvertedAppleRevenue) insights.push({ code: "currencyCoverage", tone: "neutral" });

  const successfulUpdates = Object.values(state.sources || {}).map(source => source.lastSuccessAt).filter(Boolean).sort();

  return {
    version: 1,
    generatedAt: successfulUpdates.at(-1) || null,
    viewer: { email: viewer.email || null },
    summary: {
      currency: state.currency || "EUR",
      coverage,
      revenue30,
      revenueChange,
      downloads30,
      downloadsChange: coverage.apple ? change(downloads30, previousDownloads) : null,
      adImpressions30: impressions30,
      adImpressionsChange: coverage.admob ? change(impressions30, previousImpressions) : null,
      androidCrashRate: crashRate
    },
    trends: { revenue: revenueTrend },
    insights,
    sources: {
      apple: sourcePublic(state.sources?.apple),
      play: sourcePublic(state.sources?.play),
      admob: sourcePublic(state.sources?.admob)
    }
  };
}

export const analyticsInternals = { sum, change, latestValue };
