import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboard } from "../src/analytics.js";
import { addDays, isoDay } from "../src/dates.js";
import { parseDelimited } from "../src/parsers.js";
import { appleInternals } from "../src/providers/apple.js";
import { admobInternals } from "../src/providers/admob.js";

function stateWithData() {
  const today = isoDay();
  return {
    currency: "EUR",
    generatedAt: "2026-09-02T10:00:00Z",
    sources: {
      apple: { status: "ready", data: { daily: [
        { date: addDays(today, -35), proceeds: 10, downloads: 4 },
        { date: addDays(today, -2), proceeds: 20, downloads: 8 }
      ] } },
      admob: { status: "ready", data: { daily: [
        { date: addDays(today, -35), estimatedEarnings: 2, impressions: 100 },
        { date: addDays(today, -2), estimatedEarnings: 4, impressions: 200 }
      ] } },
      play: { status: "ready", data: { daily: [{ date: addDays(today, -1), crashRate: 0.002 }] } }
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
    date: "2026-09-01", downloads: 2, proceeds: 1, proceedsByCurrency: { EUR: 1, USD: 2 }, currency: "EUR"
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
    metricValues: { ESTIMATED_EARNINGS: { microsValue: "1230000" }, IMPRESSIONS: { integerValue: "42" } }
  } }], "EUR");
  assert.equal(result[0].date, "2026-09-01");
  assert.equal(result[0].estimatedEarnings, 1.23);
  assert.equal(result[0].impressions, 42);
});
