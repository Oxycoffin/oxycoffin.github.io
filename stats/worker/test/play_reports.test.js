import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboard, dashboardTag } from "../src/analytics.js";
import { addDays, isoDay } from "../src/dates.js";
import { workerInternals } from "../src/index.js";
import { decodeText, unzipFirst } from "../src/parsers.js";
import {
  parseInstalls,
  parseRatings,
  playReportsInternals,
  refreshPlayReports,
  summarizeSales,
} from "../src/providers/play_reports.js";
import { admobInternals } from "../src/providers/admob.js";
import { readState, markAttempt, markSuccess } from "../src/state.js";

function utf16(text) {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let index = 0; index < text.length; index += 1) {
    bytes[2 + index * 2] = text.charCodeAt(index) & 0xff;
    bytes[3 + index * 2] = text.charCodeAt(index) >> 8;
  }
  return bytes;
}

async function zip(name, text) {
  const raw = new TextEncoder().encode(text);
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const data = new Uint8Array(await new Response(stream).arrayBuffer());
  const nameBytes = new TextEncoder().encode(name);
  const local = new Uint8Array(30 + nameBytes.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, raw.length, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, raw.length, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint32(42, 0, true);
  central.set(nameBytes, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length + data.length, true);
  const out = new Uint8Array(local.length + data.length + central.length + end.length);
  out.set(local, 0);
  out.set(data, local.length);
  out.set(central, local.length + data.length);
  out.set(end, local.length + data.length + central.length);
  return out;
}

function memoryKv() {
  const values = new Map();
  let writes = 0;
  return {
    values,
    get writes() {
      return writes;
    },
    async get(key, type) {
      const value = values.get(key);
      return value === undefined ? null : type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      writes += 1;
      values.set(key, value);
    },
  };
}

test("UTF-16 installs report keeps per-day installs and active devices", () => {
  const csv =
    "Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily User Installs,Daily User Uninstalls,Installs on active devices,Total User Installs\n" +
    "2026-10-01,com.tindrop.tindrop,12,3,10,2,850,1200\n" +
    "2026-10-02,com.tindrop.tindrop,8,1,7,1,856,1207\n";
  const rows = parseInstalls(decodeText(utf16(csv)));
  assert.deepEqual(rows[1], {
    date: "2026-10-02",
    installs: 7,
    uninstalls: 1,
    updates: null,
    activeDevices: 856,
    totalInstalls: 1207,
  });
});

test("ratings report exposes the overall store average", () => {
  const rows = parseRatings("Date,Package Name,Daily Average Rating,Total Average Rating\n2026-10-01,x,NA,4.62\n2026-10-02,x,5,4.63\n");
  assert.equal(rows.at(-1).total, 4.63);
  assert.equal(rows[0].daily, null);
});

test("estimated sales count EUR net after the fee and keep other currencies apart", () => {
  const csv =
    "Order Number,Order Charged Date,Financial Status,Product Type,Package ID,Currency of Sale,Item Price,Charged Amount\n" +
    "GPA.1,2026-10-01,Charged,subscription,com.tindrop.tindrop,EUR,\"1,000.00\",1210.00\n" +
    "GPA.2,2026-10-01,Charged,inapp,com.tindrop.tindrop,USD,4.99,4.99\n" +
    "GPA.3,2026-10-02,Refund,inapp,com.tindrop.tindrop,EUR,2.00,2.42\n" +
    "GPA.4,2026-10-02,Charged,inapp,com.other.app,EUR,99.00,99.00\n";
  const days = summarizeSales(csv, "com.tindrop.tindrop", "EUR", 0.15);
  assert.equal(days.length, 2);
  assert.equal(days[0].orders, 2);
  assert.equal(days[0].subscriptions, 1);
  assert.equal(days[0].netEstimate, 850);
  assert.deepEqual(days[0].grossByCurrency, { EUR: 1000, USD: 4.99 });
  assert.equal(days[1].refunds, 1);
  assert.equal(days[1].netEstimate, -1.7);
});

test("sales coverage fills order-free days up to the day before the last rewrite", () => {
  const covered = playReportsInternals.salesCoverage("2026-10", "2026-10-05T08:00:00Z");
  assert.equal(covered, "2026-10-04");
  assert.equal(playReportsInternals.salesCoverage("2026-09", "2026-10-03T00:00:00Z"), "2026-09-30");
  const filled = playReportsInternals.fillSales("2026-10", [{ date: "2026-10-02", orders: 1, refunds: 0, subscriptions: 0, grossByCurrency: { EUR: 1 }, netEstimate: 0.85 }], covered);
  assert.deepEqual(filled.map((row) => row.orders), [0, 1, 0, 0]);
});

test("ZIP reader inflates the sales CSV", async () => {
  const bytes = await zip("salesreport_202610.csv", "Order Number\nGPA.1\n");
  assert.equal(decodeText(await unzipFirst(bytes)), "Order Number\nGPA.1\n");
});

test("Play reports refresh uses generations and reuses unchanged months", async () => {
  const today = isoDay();
  const month = today.slice(0, 7);
  const compact = month.replace("-", "");
  const installs = utf16(`Date,Package Name,Daily User Installs,Daily User Uninstalls,Installs on active devices\n${month}-01,com.tindrop.tindrop,5,1,100\n`);
  const sales = await zip(`salesreport_${compact}.csv`, `Order Number,Order Charged Date,Financial Status,Product Type,Package ID,Currency of Sale,Item Price\nGPA.1,${month}-01,Charged,inapp,com.tindrop.tindrop,EUR,2.00\n`);
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const href = String(url);
    requests.push(href);
    if (href.startsWith("https://oauth2")) return Response.json({ access_token: "t", expires_in: 3600 });
    const object = decodeURIComponent(href.split("/o/")[1].split("?")[0]);
    if (href.includes("ifGenerationNotMatch=")) return new Response(null, { status: 304 });
    const headers = { "x-goog-generation": "7", "last-modified": new Date().toUTCString() };
    if (object === `stats/installs/installs_com.tindrop.tindrop_${compact}_overview.csv`) return new Response(installs, { headers });
    if (object === `sales/salesreport_${compact}.zip`) return new Response(sales, { headers });
    return new Response("not found", { status: 404 });
  };
  try {
    const { privateKey } = await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["sign", "verify"],
    );
    const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", privateKey)).toString("base64");
    const env = {
      GOOGLE_PLAY_REPORTS_BUCKET: "gs://pubsite_prod_rev_123/",
      GOOGLE_PLAY_PACKAGE: "com.tindrop.tindrop",
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "sa@example.com", private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----` }),
    };
    const first = await refreshPlayReports(env, {});
    assert.equal(first.daily[0].installs, 5);
    assert.equal(first.sales[0].netEstimate, 1.7);
    assert.ok(requests.some((href) => href.includes("/b/pubsite_prod_rev_123/o/")));
    requests.length = 0;
    const second = await refreshPlayReports(env, first);
    assert.deepEqual(second.daily, first.daily);
    assert.ok(requests.filter((href) => href.includes("ifGenerationNotMatch=7")).length >= 2);
    assert.deepEqual(await refreshPlayReports({ GOOGLE_PLAY_PACKAGE: "x" }, {}), { notConfigured: true, daily: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dashboard adds Play sales and Android installs to totals", () => {
  const end = addDays(isoDay(), -1);
  const days = Array.from({ length: 60 }, (_, index) => addDays(end, -index));
  const state = {
    currency: "EUR",
    sources: {
      apple: { data: { daily: days.map((date) => ({ date, proceeds: 1, downloads: 2 })) } },
      admob: { data: { daily: days.map((date) => ({ date, estimatedEarnings: 1, impressions: 10 })) } },
      play: { data: { daily: days.map((date) => ({ date, activeUsers: 50, crashRate: 0.001 })) } },
      playReports: {
        data: {
          daily: days.map((date) => ({ date, installs: 3, uninstalls: 1 })),
          sales: days.map((date) => ({ date, orders: 1, refunds: 0, subscriptions: 0, grossByCurrency: { EUR: 1 }, netEstimate: 0.85 })),
          rating: { average: 4.5, date: end },
          salesAvailable: true,
          feeRate: 0.15,
        },
      },
    },
  };
  const dashboard = buildDashboard(state);
  const period = dashboard.periods[30];
  assert.equal(Math.round(period.revenue.total * 100) / 100, 85.5);
  assert.equal(period.revenue.change, 0);
  assert.equal(period.revenue.changeScope, "all");
  assert.equal(period.acquisition.totalDownloads, 150);
  assert.equal(period.acquisition.totalChange, 0);
  assert.equal(period.users.androidAverage, 50);
  assert.equal(dashboard.daily.at(-1).androidInstalls, 3);
  assert.equal(dashboard.ratings.play.average, 4.5);
  assert.equal(dashboard.play.salesAvailable, true);
});

test("Android report lag disables combined comparisons instead of faking a drop", () => {
  const end = addDays(isoDay(), -1);
  const days = Array.from({ length: 60 }, (_, index) => addDays(end, -index));
  const dashboard = buildDashboard({
    sources: {
      apple: { data: { daily: days.map((date) => ({ date, proceeds: 1, downloads: 2 })) } },
      admob: { data: { daily: days.map((date) => ({ date, estimatedEarnings: 1 })) } },
      playReports: { data: { daily: days.slice(3).map((date) => ({ date, installs: 3 })), sales: days.slice(3).map((date) => ({ date, netEstimate: 1 })) } },
    },
  });
  assert.equal(dashboard.periods[30].acquisition.totalChange, 0);
  assert.equal(dashboard.periods[30].acquisition.totalChangeScope, "ios");
  assert.equal(dashboard.periods[30].revenue.change, 0);
  assert.equal(dashboard.periods[30].revenue.changeScope, "appleAdmob");
  assert.equal(dashboard.periods[30].acquisition.downloadsChange, 0);
  assert.equal(dashboard.periods[30].coverage.installsThrough, days[3]);
});

test("today's live AdMob pace uses the last seven complete days", () => {
  const today = isoDay();
  const daily = Array.from({ length: 7 }, (_, index) => ({ date: addDays(today, -index - 1), estimatedEarnings: 2, impressions: 100 }));
  const dashboard = buildDashboard({ sources: { admob: { lastSuccessAt: "2026-10-28T10:00:00Z", data: { daily: [...daily, { date: today, estimatedEarnings: 1, impressions: 40, clicks: 1 }] } } } });
  assert.equal(dashboard.live.revenue, 1);
  assert.equal(dashboard.live.averageRevenue, 2);
  assert.equal(dashboard.live.averageDays, 7);
  assert.equal(dashboard.live.rpm, 25);
});

test("dashboard tag changes only when a source is touched", () => {
  const state = { sources: { admob: { status: "ready", lastSuccessAt: "a" } } };
  const tag = dashboardTag(state);
  assert.equal(dashboardTag(structuredClone(state)), tag);
  state.sources.admob.lastAttemptAt = "b";
  assert.notEqual(dashboardTag(state), tag);
});

test("scheduler runs every due source in one tick and respects manual cooldown", () => {
  const now = Date.now();
  const at = (minutes) => new Date(now - minutes * 60_000).toISOString();
  const yesterday = addDays(isoDay(), -1);
  const state = {
    sources: {
      admob: { lastSuccessAt: at(9.5), lastAttemptAt: at(9.5) },
      play: { lastSuccessAt: at(30), lastAttemptAt: at(30) },
      playReports: { lastSuccessAt: at(200), lastAttemptAt: at(200) },
      apple: { lastSuccessAt: at(60), lastAttemptAt: at(60), data: { backfillComplete: true, daily: [{ date: yesterday }] } },
    },
  };
  assert.deepEqual(workerInternals.dueSources(state), ["playReports", "admob"]);
  state.sources.apple.data.daily = [{ date: yesterday, reportAvailable: false }];
  assert.deepEqual(workerInternals.dueSources(state), ["apple", "playReports", "admob"]);
  state.sources.apple = { status: "error", lastSuccessAt: at(26 * 60), lastAttemptAt: at(31), data: { backfillComplete: true, daily: [{ date: yesterday }] } };
  assert.equal(workerInternals.intervalFor("apple", state.sources.apple), 30 * 60_000);
  assert.deepEqual(workerInternals.dueSources(state), ["apple", "playReports", "admob"]);
  state.sources.play.lastAttemptAt = at(2);
  assert.deepEqual(workerInternals.dueSources(state, true), ["apple", "playReports", "admob"]);
});

test("AdMob incremental refresh keeps older history and replaces the recent week", () => {
  const merged = admobInternals.mergeDaily(
    [{ date: "2026-10-01", estimatedEarnings: 1 }, { date: "2026-10-20", estimatedEarnings: 1 }],
    [{ date: "2026-10-20", estimatedEarnings: 3 }, { date: "2026-10-21", estimatedEarnings: 2 }],
    "2026-10-20",
  );
  assert.deepEqual(merged.map((row) => [row.date, row.estimatedEarnings]), [["2026-10-01", 1], ["2026-10-20", 3], ["2026-10-21", 2]]);
});

test("per-source state migrates from the legacy key without losing other sources", async () => {
  const kv = memoryKv();
  kv.values.set("tindrop-pulse:state:v1", JSON.stringify({ sources: { apple: { status: "ready", lastSuccessAt: "x", data: { daily: [{ date: "2026-10-01" }] } }, admob: { status: "ready", data: { daily: [] } } } }));
  const env = { PULSE_CACHE: kv };
  const before = await markAttempt(env, "admob");
  await markSuccess(env, "admob", before, { daily: [{ date: "2026-10-02" }] });
  const state = await readState(env);
  assert.equal(state.sources.apple.data.daily[0].date, "2026-10-01");
  assert.equal(state.sources.admob.data.daily[0].date, "2026-10-02");
  assert.equal(state.sources.playReports.status, "pending");
  assert.equal(kv.writes, 2);
});
