import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboard } from "../src/analytics.js";
import { addDays, isoDay } from "../src/dates.js";
import { convertRevenueRows, fxIsStale, parseRates, refreshFx, toEur } from "../src/fx.js";

const rates = { EUR: 1, USD: 1.25, PYG: 7500 };

test("rates keep three-letter currencies and always include EUR", () => {
  const parsed = parseRates({ eur: { usd: 1.1, pyg: 8000, "1inch": 14, bad: 0 } });
  assert.deepEqual(parsed, { USD: 1.1, PYG: 8000, EUR: 1 });
});

test("toEur converts known currencies and reports missing rates", () => {
  const missing = {};
  assert.equal(toEur({ EUR: 2, USD: 5, XYZ: 9 }, rates, "EUR", missing), 6);
  assert.deepEqual(missing, { XYZ: 9 });
});

test("revenue rows fold other currencies into EUR but leave earnings exact", () => {
  const { apple, sales } = convertRevenueRows(
    {
      apple: [{ date: "2026-10-01", proceeds: 1, proceedsByCurrency: { EUR: 1, USD: 2.5 } }],
      sales: [
        { date: "2026-10-01", netEstimate: 0.85, grossByCurrency: { EUR: 1, PYG: 30000 } },
        { date: "2026-09-01", netEstimate: 3, netSource: "earnings", grossByCurrency: { PYG: 30000 } },
      ],
    },
    rates,
    "EUR",
    0.15,
  );
  assert.equal(apple[0].proceeds, 3);
  assert.equal(sales[0].netEstimate, 0.85 + 4 * 0.85);
  assert.equal(sales[1].netEstimate, 3);
});

test("dashboard totals, daily rows and footnotes include converted sales", () => {
  const day = addDays(isoDay(), -2);
  const state = {
    currency: "EUR",
    fx: { date: day, fetchedAt: new Date().toISOString(), source: "test", rates },
    sources: {
      apple: { data: { daily: [{ date: day, proceeds: 0, proceedsByCurrency: { USD: 2.5 } }] } },
      playReports: { data: { feeRate: 0.15, daily: [], sales: [{ date: day, netEstimate: 0, grossByCurrency: { PYG: 30000 } }] } },
    },
  };
  const dashboard = buildDashboard(state);
  const row = dashboard.daily.find((item) => item.date === day);
  assert.equal(row.appleRevenue, 2);
  assert.equal(row.playRevenue, 3.4);
  assert.equal(dashboard.periods[30].revenue.total, 5.4);
  assert.deepEqual(dashboard.periods[30].revenue.playOtherCurrencies, [{ code: "PYG", amount: 30000, eur: 3.4 }]);
  assert.equal(dashboard.flags.hasUnconvertedAppleRevenue, false);
});

test("without rates foreign amounts stay out of the total and are flagged", () => {
  const day = addDays(isoDay(), -2);
  const dashboard = buildDashboard({
    sources: { apple: { data: { daily: [{ date: day, proceeds: 0, proceedsByCurrency: { USD: 2.5 } }] } } },
  });
  assert.equal(dashboard.periods[30].revenue.total, 0);
  assert.equal(dashboard.periods[30].revenue.otherCurrencies[0].eur, null);
  assert.equal(dashboard.flags.hasUnconvertedAppleRevenue, true);
});

test("FX refresh falls back to the mirror and caches the rates", async () => {
  const stored = new Map();
  const env = { PULSE_CACHE: { put: async (key, value) => stored.set(key, value) } };
  const eur = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`c${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`, 1 + i]));
  let calls = 0;
  const fx = await refreshFx(env, async () => (++calls === 1 ? new Response("", { status: 503 }) : Response.json({ date: "2026-10-30", eur: { ...eur, pyg: 7500 } })));
  assert.equal(calls, 2);
  assert.equal(fx.rates.PYG, 7500);
  assert.equal(fx.source, "latest.currency-api.pages.dev");
  assert.ok(stored.has("tindrop-pulse:fx:v1"));
  assert.equal(fxIsStale(fx), false);
  assert.equal(fxIsStale({ fetchedAt: "2026-01-01T00:00:00Z" }), true);
});
