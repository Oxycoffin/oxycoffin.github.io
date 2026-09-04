import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboard } from "../src/analytics.js";
import { addDays, isoDay } from "../src/dates.js";
import { parseDelimited } from "../src/parsers.js";
import { appleInternals } from "../src/providers/apple.js";
import { admobInternals } from "../src/providers/admob.js";
import { googleInternals } from "../src/providers/google.js";

function stateWithData() {
  const today = isoDay();
  return {
    currency: "EUR",
    generatedAt: "2026-09-02T10:00:00Z",
    sources: {
      apple: { status: "ready", data: { daily: [
        { date: addDays(today, -35), proceeds: 10, downloads: 4, transactions: 4, refunds: 0 },
        { date: addDays(today, -2), proceeds: 20, downloads: 8, transactions: 9, refunds: 1 }
      ] } },
      admob: { status: "ready", data: { daily: [
        { date: addDays(today, -35), estimatedEarnings: 2, impressions: 100, clicks: 2, matchedRequests: 120, adRequests: 140 },
        { date: addDays(today, -2), estimatedEarnings: 4, impressions: 200, clicks: 10, matchedRequests: 250, adRequests: 300 }
      ] } },
      play: { status: "ready", data: { daily: [{ date: addDays(today, -1), crashRate: 0.002, anrRate: 0.001 }] } }
    }
  };
}

test("dashboard combines revenue and compares equal periods", () => {
  const dashboard = buildDashboard(stateWithData(), { email: "owner@example.com" });
  assert.equal(dashboard.summary.revenue30, 24);
  assert.equal(dashboard.summary.downloads30, 8);
  assert.equal(dashboard.summary.adImpressions30, 200);
  assert.equal(dashboard.summary.revenueChange, 100);
  assert.equal(dashboard.summary.androidCrashRate, 0.002);
  assert.equal(dashboard.trends.revenue.length, 30);
  assert.equal(dashboard.version, 2);
  assert.equal(dashboard.periods[30].ads.ctr, 0.05);
  assert.equal(dashboard.periods[30].ads.matchRate, 250 / 300);
  assert.equal(dashboard.periods[30].acquisition.refunds, 1);
  assert.equal(dashboard.periods[30].quality.anrRate, 0.001);
  assert.equal(dashboard.daily.length, 60);
  assert.equal(dashboard.viewer.email, "owner@example.com");
});

test("delimited parser handles quotes and embedded separators", () => {
  const rows = parseDelimited('Title\tUnits\n"One\tTwo"\t3\n', "\t");
  assert.deepEqual(rows, [{ Title: "One\tTwo", Units: "3" }]);
});

test("Apple rows filter by app and calculate proceeds", () => {
  const rows = [
    { "Apple Identifier": "6756980913", "Product Type Identifier": "1", Units: "2", "Developer Proceeds": "0.5", "Currency of Proceeds": "EUR" },
    { "Apple Identifier": "999", "Parent Identifier": "com.tindrop.tindrop", "Product Type Identifier": "IAY", Units: "1", "Developer Proceeds": "2", "Currency of Proceeds": "USD" },
    { "Apple Identifier": "other", "Product Type Identifier": "1", Units: "20", "Developer Proceeds": "5", "Currency of Proceeds": "EUR" }
  ];
  assert.deepEqual(appleInternals.summarizeRows(rows, "6756980913", "com.tindrop.tindrop", "2026-09-01", "EUR"), {
    date: "2026-09-01", downloads: 2, refunds: 0, transactions: 3, proceeds: 1,
    proceedsByCurrency: { EUR: 1, USD: 2 }, countries: [{ code: "—", downloads: 2, proceeds: 1 }], currency: "EUR"
  });
});

test("empty dashboard reports missing coverage instead of fake zero data", () => {
  const dashboard = buildDashboard({ currency: "EUR", sources: {} });
  assert.deepEqual(dashboard.summary.coverage, { apple: false, admob: false, play: false, revenue: false });
  assert.equal(dashboard.summary.revenueChange, null);
  assert.equal(dashboard.generatedAt, null);
  assert.equal(dashboard.insights[0].code, "data");
});

test("AdMob streamed rows normalize micros and dates", () => {
  const result = admobInternals.reportRows([{ row: {
    dimensionValues: { DATE: { value: "20260901" } },
    metricValues: {
      ESTIMATED_EARNINGS: { microsValue: "1230000" },
      IMPRESSIONS: { integerValue: "42" },
      IMPRESSION_RPM: { microsValue: "2450000" }
    }
  } }], "EUR");
  assert.equal(result[0].date, "2026-09-01");
  assert.equal(result[0].estimatedEarnings, 1.23);
  assert.equal(result[0].impressions, 42);
  assert.equal(result[0].impressionRpm, 2.45);
});

test("AdMob breakdowns expose ranked exact values", () => {
  const result = admobInternals.breakdownRows([{ row: {
    dimensionValues: { AD_UNIT: { value: "unit-1", displayLabel: "Rewarded" } },
    metricValues: { ESTIMATED_EARNINGS: { microsValue: "2500000" }, IMPRESSIONS: { integerValue: "500" }, CLICKS: { integerValue: "20" } }
  } }], "AD_UNIT", "EUR");
  assert.deepEqual(result[0], { id: "unit-1", label: "Rewarded", earnings: 2.5, impressions: 500, clicks: 20, rpm: 5, currency: "EUR" });
});

test("Play daily timelines use the metric set default timezone", () => {
  assert.deepEqual(googleInternals.dateTime("2026-09-01"), { year: 2026, month: 9, day: 1 });
});

test("Play daily timelines stop at each metric set freshness", () => {
  assert.deepEqual(googleInternals.dailyWindow({ freshnessInfo: { freshnesses: [{
    aggregationPeriod: "DAILY",
    latestEndTime: { year: 2026, month: 8, day: 31, timeZone: "America/Los_Angeles" }
  }] } }), {
    startTime: { year: 2026, month: 7, day: 30, timeZone: "America/Los_Angeles" },
    endTime: { year: 2026, month: 8, day: 31, timeZone: "America/Los_Angeles" }
  });
});
