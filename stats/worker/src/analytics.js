import { addDays, isoDay, lastDays } from "./dates.js";

function rowsInWindow(rows, start, end) {
  return rows.filter(
    (row) =>
      row.date >= start && row.date <= end && row.reportAvailable !== false,
  );
}

function sum(rows, field, start, end) {
  return rowsInWindow(rows, start, end).reduce(
    (total, row) => total + (Number(row[field]) || 0),
    0,
  );
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : null;
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
    error: source.error || null,
  };
}

function latestValue(rows, field) {
  return (
    [...rows]
      .reverse()
      .find((row) => row[field] !== null && row[field] !== undefined)?.[
      field
    ] ?? null
  );
}

function maxValue(rows, field) {
  const values = rows
    .map((row) => row[field])
    .filter((value) => value !== null && value !== undefined)
    .map(Number);
  return values.length ? Math.max(...values) : null;
}

function summarizePeriod(days, today, apple, admob, play, reviews, currency) {
  const start = addDays(today, -(days - 1));
  const previousStart = addDays(start, -days);
  const previousEnd = addDays(start, -1);
  const currentApple = rowsInWindow(apple, start, today);
  const currentAdmob = rowsInWindow(admob, start, today);
  const currentPlay = rowsInWindow(play, start, today);
  const previousApple = rowsInWindow(apple, previousStart, previousEnd);
  const previousAdmob = rowsInWindow(admob, previousStart, previousEnd);
  const complete = (rows) => new Set(rows.map((row) => row.date)).size === days;
  const appleComparable = complete(currentApple) && complete(previousApple);
  const admobComparable = complete(currentAdmob) && complete(previousAdmob);
  const otherCurrencies = {};
  const countries = new Map();
  for (const day of currentApple) {
    for (const [code, amount] of Object.entries(day.proceedsByCurrency || {})) {
      if (code !== currency)
        otherCurrencies[code] = (otherCurrencies[code] || 0) + Number(amount);
    }
    for (const item of day.countries || []) {
      const total = countries.get(item.code) || {
        code: item.code,
        downloads: 0,
        proceeds: 0,
      };
      total.downloads += Number(item.downloads || 0);
      total.proceeds += Number(item.proceeds || 0);
      countries.set(item.code, total);
    }
  }

  const appleRevenue = sum(apple, "proceeds", start, today);
  const admobRevenue = sum(admob, "estimatedEarnings", start, today);
  const previousRevenue =
    sum(apple, "proceeds", previousStart, previousEnd) +
    sum(admob, "estimatedEarnings", previousStart, previousEnd);
  const revenue = appleRevenue + admobRevenue;
  const downloads = sum(apple, "downloads", start, today);
  const previousDownloads = sum(apple, "downloads", previousStart, previousEnd);
  const refunds = sum(apple, "refunds", start, today);
  const transactions = sum(apple, "transactions", start, today);
  const impressions = sum(admob, "impressions", start, today);
  const previousImpressions = sum(
    admob,
    "impressions",
    previousStart,
    previousEnd,
  );
  const clicks = sum(admob, "clicks", start, today);
  const requests = sum(admob, "adRequests", start, today);
  const matchedRequests = sum(admob, "matchedRequests", start, today);
  const latestCrashRate =
    latestValue(currentPlay, "userPerceivedCrashRate") ??
    latestValue(currentPlay, "crashRate");
  const latestAnrRate =
    latestValue(currentPlay, "userPerceivedAnrRate") ??
    latestValue(currentPlay, "anrRate");

  return {
    days,
    start,
    end: today,
    coverage: {
      appleDays: currentApple.length,
      admobDays: currentAdmob.length,
      playDays: currentPlay.length,
      expectedDays: days,
    },
    revenue: {
      total: revenue,
      apple: appleRevenue,
      admob: admobRevenue,
      otherCurrencies,
      appleChange: appleComparable
        ? change(
            appleRevenue,
            sum(apple, "proceeds", previousStart, previousEnd),
          )
        : null,
      admobChange: admobComparable
        ? change(
            admobRevenue,
            sum(admob, "estimatedEarnings", previousStart, previousEnd),
          )
        : null,
      change:
        appleComparable && admobComparable
          ? change(revenue, previousRevenue)
          : null,
    },
    acquisition: {
      downloads,
      refunds,
      transactions,
      countries: [...countries.values()].sort(
        (a, b) => b.downloads - a.downloads,
      ),
      downloadsChange: appleComparable
        ? change(downloads, previousDownloads)
        : null,
    },
    ads: {
      earnings: admobRevenue,
      impressions,
      clicks,
      requests,
      matchedRequests,
      ctr: ratio(clicks, impressions),
      matchRate: ratio(matchedRequests, requests),
      showRate: ratio(impressions, matchedRequests),
      rpm: impressions ? (admobRevenue / impressions) * 1000 : null,
      impressionsChange: admobComparable
        ? change(impressions, previousImpressions)
        : null,
    },
    quality: {
      crashRate: latestCrashRate,
      anrRate: latestAnrRate,
      crashDate:
        [...currentPlay]
          .reverse()
          .find(
            (row) =>
              row.userPerceivedCrashRate != null || row.crashRate != null,
          )?.date || null,
      anrDate:
        [...currentPlay]
          .reverse()
          .find(
            (row) => row.userPerceivedAnrRate != null || row.anrRate != null,
          )?.date || null,
      peakCrashRate:
        maxValue(currentPlay, "userPerceivedCrashRate") ??
        maxValue(currentPlay, "crashRate"),
      peakAnrRate:
        maxValue(currentPlay, "userPerceivedAnrRate") ??
        maxValue(currentPlay, "anrRate"),
    },
    reviews: reviews || {
      recentCount: 0,
      averageRating: null,
      lastReviewAt: null,
      recent: [],
    },
    currency,
  };
}

function mergeDaily(today, apple, admob, play) {
  const appleByDate = new Map(apple.map((item) => [item.date, item]));
  const admobByDate = new Map(admob.map((item) => [item.date, item]));
  const playByDate = new Map(play.map((item) => [item.date, item]));
  return lastDays(60, today).map((date) => {
    const appleCandidate = appleByDate.get(date);
    const appleDay =
      appleCandidate?.reportAvailable === false ? null : appleCandidate;
    const admobDay = admobByDate.get(date);
    const playDay = playByDate.get(date);
    return {
      date,
      appleRevenue: appleDay ? Number(appleDay.proceeds || 0) : null,
      admobRevenue: admobDay ? Number(admobDay.estimatedEarnings || 0) : null,
      downloads: appleDay ? Number(appleDay.downloads || 0) : null,
      refunds: appleDay ? Number(appleDay.refunds || 0) : null,
      impressions: admobDay ? Number(admobDay.impressions || 0) : null,
      clicks: admobDay ? Number(admobDay.clicks || 0) : null,
      requests: admobDay ? Number(admobDay.adRequests || 0) : null,
      matchedRequests: admobDay ? Number(admobDay.matchedRequests || 0) : null,
      rpm: admobDay?.impressions
        ? (Number(admobDay.estimatedEarnings || 0) /
            Number(admobDay.impressions)) *
          1000
        : null,
      crashRate: playDay?.userPerceivedCrashRate ?? playDay?.crashRate ?? null,
      anrRate: playDay?.userPerceivedAnrRate ?? playDay?.anrRate ?? null,
    };
  });
}

function insightsFor(period) {
  const insights = [];
  const revenueChange = period.revenue.change;
  if (revenueChange === null) insights.push({ code: "data", tone: "neutral" });
  else if (revenueChange >= 5)
    insights.push({ code: "revenueUp", tone: "good", value: revenueChange });
  else if (revenueChange <= -5)
    insights.push({ code: "revenueDown", tone: "warn", value: revenueChange });
  else
    insights.push({
      code: "revenueFlat",
      tone: "neutral",
      value: revenueChange,
    });

  if (period.ads.matchRate !== null && period.ads.matchRate < 0.8) {
    insights.push({
      code: "matchRateWarn",
      tone: "warn",
      value: period.ads.matchRate,
      valueType: "percent",
    });
  } else if (period.ads.matchRate !== null) {
    insights.push({
      code: "matchRateGood",
      tone: "good",
      value: period.ads.matchRate,
      valueType: "percent",
    });
  }
  if (period.quality.crashRate !== null)
    insights.push(
      period.quality.crashRate > 0.01
        ? {
            code: "qualityWarn",
            tone: "warn",
            value: period.quality.crashRate,
            valueType: "percent",
          }
        : {
            code: "qualityGood",
            tone: "good",
            value: period.quality.crashRate,
            valueType: "percent",
          },
    );
  if (period.coverage.appleDays < Math.min(period.days, 7)) {
    insights.push({
      code: "appleCoverage",
      tone: "neutral",
      value: period.coverage.appleDays,
    });
  }
  return insights.slice(0, 4);
}

export function buildDashboard(state, viewer = {}) {
  const today = isoDay();
  const end = addDays(today, -1);
  const currency = state.currency || "EUR";
  const appleData = state.sources?.apple?.data || {};
  const admobData = state.sources?.admob?.data || {};
  const playData = state.sources?.play?.data || {};
  const apple = (appleData.daily || []).filter(
    (row) => row.reportAvailable !== false,
  );
  const admob = admobData.daily || [];
  const play = playData.daily || [];
  const reviews = playData.reviews || null;
  const periods = {
    7: summarizePeriod(7, end, apple, admob, play, reviews, currency),
    30: summarizePeriod(30, end, apple, admob, play, reviews, currency),
  };
  const successfulUpdates = Object.values(state.sources || {})
    .map((source) => source.lastSuccessAt)
    .filter(Boolean)
    .sort();
  const hasUnconvertedAppleRevenue = apple.some((day) =>
    Object.entries(day.proceedsByCurrency || {}).some(
      ([code, amount]) => code !== currency && Number(amount) !== 0,
    ),
  );
  const daily = mergeDaily(end, apple, admob, play);

  return {
    version: 2,
    generatedAt: successfulUpdates.at(-1) || null,
    viewer: { email: viewer.email || null },
    currency,
    periods,
    daily,
    today: mergeDaily(today, apple, admob, play).at(-1),
    breakdowns: {
      adUnits: admobData.adUnits || [],
      countries: admobData.countries || [],
      appleCountries: appleData.countries || [],
      start: admobData.breakdownStart || null,
      end: admobData.breakdownEnd || null,
    },
    reviews: {
      play: reviews,
      apple: appleData.reviews || null,
    },
    insights: insightsFor(periods[30]),
    flags: { hasUnconvertedAppleRevenue },
    sources: {
      apple: {
        ...sourcePublic(state.sources?.apple),
        availableDays: apple.length,
        backfillComplete: Boolean(appleData.backfillComplete),
      },
      play: {
        ...sourcePublic(state.sources?.play),
        availableDays: play.length,
      },
      admob: {
        ...sourcePublic(state.sources?.admob),
        availableDays: admob.length,
      },
    },
    summary: {
      currency,
      coverage: {
        apple: apple.length > 0,
        admob: admob.length > 0,
        play: play.length > 0,
        revenue: apple.length > 0 || admob.length > 0,
      },
      revenue30: periods[30].revenue.total,
      revenueChange: periods[30].revenue.change,
      downloads30: periods[30].acquisition.downloads,
      downloadsChange: periods[30].acquisition.downloadsChange,
      adImpressions30: periods[30].ads.impressions,
      adImpressionsChange: periods[30].ads.impressionsChange,
      androidCrashRate: periods[30].quality.crashRate,
    },
    trends: {
      revenue: daily
        .slice(-30)
        .map((day) => ({
          date: day.date,
          apple: day.appleRevenue || 0,
          admob: day.admobRevenue || 0,
        })),
    },
  };
}

export const analyticsInternals = {
  sum,
  change,
  latestValue,
  ratio,
  summarizePeriod,
  mergeDaily,
};
