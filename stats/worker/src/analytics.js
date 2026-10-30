import { addDays, isoDay, lastDays } from "./dates.js";
import { convertRevenueRows, toEur } from "./fx.js";

const DASHBOARD_VERSION = 4;

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

function average(rows, field) {
  const values = rows
    .map((row) => row[field])
    .filter((value) => value !== null && value !== undefined)
    .map(Number);
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function latestDate(rows) {
  return rows.reduce((latest, row) => (row.date > (latest || "") ? row.date : latest), null);
}

function addCurrencies(target, amounts = {}, skip) {
  for (const [code, amount] of Object.entries(amounts)) {
    if (code !== skip && Number(amount))
      target[code] = (target[code] || 0) + Number(amount);
  }
  return target;
}

// Native amounts already folded into the totals, with their approximate value
// in the dashboard currency (null when no rate was available).
function convertedAmounts(amounts, rates, currency, factor = 1) {
  return Object.entries(amounts)
    .map(([code, amount]) => {
      const missing = {};
      const eur = toEur({ [code]: amount }, rates, currency, missing);
      return { code, amount, eur: missing[code] ? null : eur * factor };
    })
    .sort((a, b) => (b.eur ?? 0) - (a.eur ?? 0));
}

function rankCountries(rows, field) {
  const totals = new Map();
  for (const row of rows) {
    const total = totals.get(row.code) || { code: row.code, [field]: 0 };
    total[field] += Number(row[field] || 0);
    totals.set(row.code, total);
  }
  return [...totals.values()].sort((a, b) => b[field] - a[field]);
}

function summarizePeriod(days, today, apple, admob, play, reviews, currency, android = {}, fx = {}) {
  const installs = android.installs || [];
  const sales = android.sales || [];
  const start = addDays(today, -(days - 1));
  const previousStart = addDays(start, -days);
  const previousEnd = addDays(start, -1);
  const currentApple = rowsInWindow(apple, start, today);
  const currentAdmob = rowsInWindow(admob, start, today);
  const currentPlay = rowsInWindow(play, start, today);
  const currentInstalls = rowsInWindow(installs, start, today);
  const currentSales = rowsInWindow(sales, start, today);
  const previousApple = rowsInWindow(apple, previousStart, previousEnd);
  const previousAdmob = rowsInWindow(admob, previousStart, previousEnd);
  const previousPlay = rowsInWindow(play, previousStart, previousEnd);
  const previousInstalls = rowsInWindow(installs, previousStart, previousEnd);
  const previousSales = rowsInWindow(sales, previousStart, previousEnd);
  const complete = (rows) => new Set(rows.map((row) => row.date)).size === days;
  const appleComparable = complete(currentApple) && complete(previousApple);
  const admobComparable = complete(currentAdmob) && complete(previousAdmob);
  // Play sources only gate comparisons once they are connected at all.
  const salesConnected = sales.length > 0;
  const installsConnected = installs.length > 0;
  const salesComparable = complete(currentSales) && complete(previousSales);
  const installsComparable = complete(currentInstalls) && complete(previousInstalls);
  const otherCurrencies = {};
  const countries = new Map();
  for (const day of currentApple) {
    addCurrencies(otherCurrencies, day.proceedsByCurrency, currency);
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
  const playOtherCurrencies = {};
  for (const day of currentSales) {
    if (day.netSource !== "earnings")
      addCurrencies(playOtherCurrencies, day.grossByCurrency, currency);
  }

  const appleRevenue = sum(apple, "proceeds", start, today);
  const admobRevenue = sum(admob, "estimatedEarnings", start, today);
  const playRevenue = sum(sales, "netEstimate", start, today);
  const previousAppleRevenue = sum(apple, "proceeds", previousStart, previousEnd);
  const previousAdmobRevenue = sum(admob, "estimatedEarnings", previousStart, previousEnd);
  const previousPlayRevenue = sum(sales, "netEstimate", previousStart, previousEnd);
  const revenue = appleRevenue + admobRevenue + playRevenue;
  const previousRevenue = previousAppleRevenue + previousAdmobRevenue + previousPlayRevenue;
  const downloads = sum(apple, "downloads", start, today);
  const previousDownloads = sum(apple, "downloads", previousStart, previousEnd);
  const androidInstalls = sum(installs, "installs", start, today);
  const previousAndroidInstalls = sum(installs, "installs", previousStart, previousEnd);
  const impressions = sum(admob, "impressions", start, today);
  const previousImpressions = sum(admob, "impressions", previousStart, previousEnd);
  const clicks = sum(admob, "clicks", start, today);
  const requests = sum(admob, "adRequests", start, today);
  const matchedRequests = sum(admob, "matchedRequests", start, today);
  const activeUsers = average(currentPlay, "activeUsers");
  const previousActiveUsers = average(previousPlay, "activeUsers");
  const usersComparable =
    currentPlay.filter((row) => row.activeUsers != null).length >= days * 0.8 &&
    previousPlay.filter((row) => row.activeUsers != null).length >= days * 0.8;
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
      installDays: currentInstalls.length,
      salesDays: currentSales.length,
      installsThrough: latestDate(installs),
      salesThrough: latestDate(sales),
      expectedDays: days,
    },
    revenue: {
      total: revenue,
      apple: appleRevenue,
      admob: admobRevenue,
      play: playRevenue,
      otherCurrencies: convertedAmounts(otherCurrencies, fx.rates, currency),
      playOtherCurrencies: convertedAmounts(playOtherCurrencies, fx.rates, currency, 1 - (fx.feeRate ?? 0.15)),
      appleChange: appleComparable ? change(appleRevenue, previousAppleRevenue) : null,
      admobChange: admobComparable ? change(admobRevenue, previousAdmobRevenue) : null,
      playChange: salesComparable ? change(playRevenue, previousPlayRevenue) : null,
      // Play posts days late; until it catches up the comparison falls back
      // to Apple + AdMob and says so instead of disappearing.
      ...(appleComparable && admobComparable && (!salesConnected || salesComparable)
        ? { change: change(revenue, previousRevenue), changeScope: "all" }
        : appleComparable && admobComparable
          ? {
              change: change(
                appleRevenue + admobRevenue,
                previousAppleRevenue + previousAdmobRevenue,
              ),
              changeScope: "appleAdmob",
            }
          : { change: null, changeScope: null }),
    },
    acquisition: {
      downloads,
      refunds: sum(apple, "refunds", start, today),
      transactions: sum(apple, "transactions", start, today),
      countries: [...countries.values()].sort(
        (a, b) => b.downloads - a.downloads,
      ),
      downloadsChange: appleComparable
        ? change(downloads, previousDownloads)
        : null,
      androidInstalls,
      androidUninstalls: sum(installs, "uninstalls", start, today),
      androidActiveDevices: latestValue(currentInstalls, "activeDevices"),
      androidCountries: rankCountries(
        rowsInWindow(android.countries || [], start, today),
        "installs",
      ),
      androidChange: installsComparable
        ? change(androidInstalls, previousAndroidInstalls)
        : null,
      totalDownloads: downloads + androidInstalls,
      ...(appleComparable && (!installsConnected || installsComparable)
        ? {
            totalChange: change(downloads + androidInstalls, previousDownloads + previousAndroidInstalls),
            totalChangeScope: "all",
          }
        : appleComparable
          ? { totalChange: change(downloads, previousDownloads), totalChangeScope: "ios" }
          : { totalChange: null, totalChangeScope: null }),
    },
    play: {
      orders: sum(sales, "orders", start, today),
      refunds: sum(sales, "refunds", start, today),
      subscriptions: sum(sales, "subscriptions", start, today),
    },
    users: {
      androidAverage: activeUsers,
      androidLatest: latestValue(currentPlay, "activeUsers"),
      androidChange: usersComparable && previousActiveUsers
        ? change(activeUsers, previousActiveUsers)
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

function mergeDaily(today, apple, admob, play, android = {}, count = 60) {
  const appleByDate = new Map(apple.map((item) => [item.date, item]));
  const admobByDate = new Map(admob.map((item) => [item.date, item]));
  const playByDate = new Map(play.map((item) => [item.date, item]));
  const installsByDate = new Map((android.installs || []).map((item) => [item.date, item]));
  const salesByDate = new Map((android.sales || []).map((item) => [item.date, item]));
  return lastDays(count, today).map((date) => {
    const appleCandidate = appleByDate.get(date);
    const appleDay =
      appleCandidate?.reportAvailable === false ? null : appleCandidate;
    const admobDay = admobByDate.get(date);
    const playDay = playByDate.get(date);
    const installDay = installsByDate.get(date);
    const salesDay = salesByDate.get(date);
    return {
      date,
      appleRevenue: appleDay ? Number(appleDay.proceeds || 0) : null,
      admobRevenue: admobDay ? Number(admobDay.estimatedEarnings || 0) : null,
      playRevenue: salesDay ? Number(salesDay.netEstimate || 0) : null,
      downloads: appleDay ? Number(appleDay.downloads || 0) : null,
      androidInstalls: installDay?.installs ?? null,
      androidUninstalls: installDay?.uninstalls ?? null,
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
      activeUsers: playDay?.activeUsers ?? null,
      crashRate: playDay?.userPerceivedCrashRate ?? playDay?.crashRate ?? null,
      anrRate: playDay?.userPerceivedAnrRate ?? playDay?.anrRate ?? null,
    };
  });
}

// Today is provisional and only AdMob reports it; the pace compares it with
// the average of the last seven complete AdMob days.
function liveToday(today, admob, admobSource = {}) {
  const day = admob.find((row) => row.date === today) || null;
  const recent = rowsInWindow(admob, addDays(today, -7), addDays(today, -1));
  const averageRevenue = recent.length
    ? recent.reduce((total, row) => total + Number(row.estimatedEarnings || 0), 0) / recent.length
    : null;
  const averageImpressions = recent.length
    ? recent.reduce((total, row) => total + Number(row.impressions || 0), 0) / recent.length
    : null;
  return {
    date: today,
    revenue: day ? Number(day.estimatedEarnings || 0) : null,
    impressions: day ? Number(day.impressions || 0) : null,
    clicks: day ? Number(day.clicks || 0) : null,
    rpm: day?.impressions ? (Number(day.estimatedEarnings || 0) / Number(day.impressions)) * 1000 : null,
    averageRevenue,
    averageImpressions,
    averageDays: recent.length,
    updatedAt: admobSource.lastSuccessAt || null,
  };
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
      period.quality.crashRate > 0.0109
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

// Weak validator for conditional dashboard polling: it changes whenever a
// source is touched or the calendar day (and so every window) moves.
export function dashboardTag(state) {
  const parts = [DASHBOARD_VERSION, isoDay(), state.fx?.fetchedAt];
  for (const [name, source] of Object.entries(state.sources || {}).sort()) {
    parts.push(name, source.status, source.lastAttemptAt, source.lastSuccessAt);
  }
  let hash = 0x811c9dc5;
  for (const character of parts.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `W/"${hash.toString(36)}"`;
}

function nextUpdateAt(name, source, intervalFor) {
  if (!intervalFor || !source) return null;
  const base = Math.max(
    Date.parse(source.lastSuccessAt || 0) || 0,
    source.status === "error" ? Date.parse(source.lastAttemptAt || 0) || 0 : 0,
  );
  if (!base) return null;
  return new Date(base + intervalFor(name, source)).toISOString();
}

export function buildDashboard(state, viewer = {}, intervalFor = null) {
  const today = isoDay();
  const end = addDays(today, -1);
  const currency = state.currency || "EUR";
  const appleData = state.sources?.apple?.data || {};
  const admobData = state.sources?.admob?.data || {};
  const playData = state.sources?.play?.data || {};
  const reportsData = state.sources?.playReports?.data || {};
  const fxRates = state.fx?.rates || null;
  const feeRate = reportsData.feeRate ?? 0.15;
  // Other currencies are folded into EUR here, so every total, chart and
  // export below already works with the approximate amount that is paid out.
  const converted = convertRevenueRows(
    {
      apple: (appleData.daily || []).filter((row) => row.reportAvailable !== false),
      sales: reportsData.sales || [],
    },
    fxRates,
    currency,
    feeRate,
  );
  const apple = converted.apple;
  const admob = admobData.daily || [];
  const play = playData.daily || [];
  const android = {
    installs: reportsData.daily || [],
    sales: converted.sales,
    countries: reportsData.countries || [],
  };
  const reviews = playData.reviews || null;
  const periods = {
    7: summarizePeriod(7, end, apple, admob, play, reviews, currency, android, { rates: fxRates, feeRate }),
    30: summarizePeriod(30, end, apple, admob, play, reviews, currency, android, { rates: fxRates, feeRate }),
  };
  const successfulUpdates = Object.values(state.sources || {})
    .map((source) => source.lastSuccessAt)
    .filter(Boolean)
    .sort();
  const unconverted = {};
  for (const day of apple) toEur(day.proceedsByCurrency, fxRates, currency, unconverted);
  const hasUnconvertedAppleRevenue = Object.keys(unconverted).length > 0;
  const daily = mergeDaily(end, apple, admob, play, android);
  const sources = {};
  for (const name of ["apple", "play", "playReports", "admob"]) {
    const source = state.sources?.[name];
    sources[name] = {
      ...sourcePublic(source),
      nextUpdateAt: nextUpdateAt(name, source, intervalFor),
    };
  }
  sources.apple.availableDays = apple.length;
  sources.apple.backfillComplete = Boolean(appleData.backfillComplete);
  sources.play.availableDays = play.length;
  sources.admob.availableDays = admob.length;
  sources.playReports.availableDays = android.installs.length;
  sources.playReports.configured = !reportsData.notConfigured && sources.playReports.status !== "disabled";
  sources.playReports.denied = reportsData.denied || [];

  return {
    version: DASHBOARD_VERSION,
    generatedAt: successfulUpdates.at(-1) || null,
    serverTime: new Date().toISOString(),
    viewer: { email: viewer.email || null },
    currency,
    periods,
    daily,
    today: mergeDaily(today, apple, admob, play, android, 1).at(-1),
    live: liveToday(today, admob, state.sources?.admob),
    breakdowns: {
      adUnits: admobData.adUnits || [],
      countries: admobData.countries || [],
      platforms: admobData.platforms || [],
      appleCountries: appleData.countries || [],
      start: admobData.breakdownStart || null,
      end: admobData.breakdownEnd || null,
    },
    reviews: {
      play: reviews,
      apple: appleData.reviews || null,
    },
    ratings: {
      apple: appleData.rating || null,
      play: reportsData.rating || null,
    },
    play: {
      feeRate: reportsData.feeRate ?? null,
      earningsThrough: reportsData.earningsThrough || null,
      salesAvailable: Boolean(reportsData.salesAvailable && android.sales.length),
    },
    insights: insightsFor(periods[30]),
    flags: { hasUnconvertedAppleRevenue },
    fx: state.fx ? { date: state.fx.date, fetchedAt: state.fx.fetchedAt, source: state.fx.source } : null,
    sources,
    summary: {
      currency,
      coverage: {
        apple: apple.length > 0,
        admob: admob.length > 0,
        play: play.length > 0,
        playReports: android.installs.length > 0,
        revenue: apple.length > 0 || admob.length > 0 || android.sales.length > 0,
      },
      revenue30: periods[30].revenue.total,
      revenueChange: periods[30].revenue.change,
      downloads30: periods[30].acquisition.downloads,
      downloadsChange: periods[30].acquisition.downloadsChange,
      androidInstalls30: periods[30].acquisition.androidInstalls,
      adImpressions30: periods[30].ads.impressions,
      adImpressionsChange: periods[30].ads.impressionsChange,
      androidCrashRate: periods[30].quality.crashRate,
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
  liveToday,
};
