import { addDays, isoDay } from "../dates.js";
import { decodeText, parseAmount, parseDelimited, unzipFirst } from "../parsers.js";
import { googleToken } from "./google.js";

// Google Play bulk reports live in the developer's Cloud Storage bucket. They
// are monthly files rewritten as Google posts new days, so every object is
// fetched conditionally on its generation and unchanged months cost a 304.
const MONTHS = 3;
const DEFAULT_FEE_RATE = 0.15;

function bucketName(env) {
  return String(env.GOOGLE_PLAY_REPORTS_BUCKET || "")
    .trim()
    .replace(/^gs:\/\//u, "")
    .replace(/\/.*$/u, "");
}

function monthKey(day) {
  return day.slice(0, 7).replace("-", "");
}

function recentMonths(today = isoDay()) {
  const months = [];
  const cursor = new Date(`${today.slice(0, 7)}-15T12:00:00Z`);
  for (let index = 0; index < MONTHS; index += 1) {
    months.push(isoDay(cursor).slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return months;
}

function monthEnd(month) {
  const value = new Date(`${month}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return isoDay(value);
}

async function fetchObject(env, bucket, name, previous) {
  const parameters = new URLSearchParams({ alt: "media" });
  if (previous?.generation) parameters.set("ifGenerationNotMatch", previous.generation);
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?${parameters}`,
    { headers: { Authorization: `Bearer ${await googleToken(env)}` } },
  );
  if (response.status === 304) return { unchanged: true };
  if (response.status === 404) return { missing: true };
  if (response.status === 401 || response.status === 403)
    return { forbidden: true, status: response.status };
  if (!response.ok) throw new Error(`Play report ${name.split("/").at(-1)} returned ${response.status}`);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    generation: response.headers.get("x-goog-generation") || null,
    updatedAt: response.headers.get("last-modified")
      ? new Date(response.headers.get("last-modified")).toISOString()
      : new Date().toISOString(),
  };
}

async function listObjects(env, bucket, prefix) {
  const parameters = new URLSearchParams({ prefix, fields: "items(name,generation,updated)" });
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${parameters}`,
    { headers: { Authorization: `Bearer ${await googleToken(env)}` } },
  );
  if (response.status === 401 || response.status === 403) return { forbidden: true };
  if (response.status === 404) return { items: [] };
  if (!response.ok) throw new Error(`Play report listing returned ${response.status}`);
  return { items: (await response.json()).items || [] };
}

function column(row, ...names) {
  for (const name of names) if (row[name] !== undefined && row[name] !== "") return row[name];
  return undefined;
}

function reportDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/u.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(`${raw} 12:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : isoDay(parsed);
}

function count(value) {
  const amount = parseAmount(value);
  return amount === null ? null : Math.round(amount);
}

export function parseInstalls(text) {
  return parseDelimited(text, ",")
    .map((row) => {
      const date = reportDate(row.Date);
      if (!date) return null;
      return {
        date,
        installs: count(column(row, "Daily User Installs", "Daily Device Installs")),
        uninstalls: count(column(row, "Daily User Uninstalls", "Daily Device Uninstalls")),
        updates: count(column(row, "Daily Device Upgrades")),
        activeDevices: count(column(row, "Installs on active devices", "Active Device Installs", "Current Device Installs")),
        totalInstalls: count(column(row, "Total User Installs")),
      };
    })
    .filter(Boolean);
}

export function parseCountryInstalls(text) {
  return parseDelimited(text, ",")
    .map((row) => ({
      date: reportDate(row.Date),
      code: column(row, "Country") || "—",
      installs: count(column(row, "Daily User Installs", "Daily Device Installs")) || 0,
    }))
    .filter((row) => row.date && row.installs > 0);
}

export function parseRatings(text) {
  return parseDelimited(text, ",")
    .map((row) => ({
      date: reportDate(row.Date),
      daily: parseAmount(column(row, "Daily Average Rating")),
      total: parseAmount(column(row, "Total Average Rating")),
    }))
    .filter((row) => row.date && (row.daily !== null || row.total !== null));
}

// Estimated sales list every order in the buyer's currency, before Google's
// fee and excluding tax (Item Price). Only EUR is estimated as net revenue so
// the dashboard never applies invented exchange rates.
export function summarizeSales(text, packageName, currency, feeRate = DEFAULT_FEE_RATE) {
  const days = new Map();
  for (const row of parseDelimited(text, ",")) {
    const product = column(row, "Package ID", "Product ID");
    if (product && product !== packageName) continue;
    const date = reportDate(column(row, "Order Charged Date"));
    if (!date) continue;
    const status = String(column(row, "Financial Status") || "").toLowerCase();
    const refund = /refund|charge ?back|chargeback/u.test(status);
    if (!refund && status && status !== "charged") continue;
    const amount = Math.abs(parseAmount(column(row, "Item Price")) || 0) * (refund ? -1 : 1);
    const saleCurrency = column(row, "Currency of Sale") || currency;
    const day = days.get(date) || {
      date,
      orders: 0,
      refunds: 0,
      subscriptions: 0,
      grossByCurrency: {},
      netEstimate: 0,
    };
    if (refund) day.refunds += 1;
    else {
      day.orders += 1;
      if (/subscription/u.test(String(column(row, "Product Type") || "").toLowerCase())) day.subscriptions += 1;
    }
    day.grossByCurrency[saleCurrency] = (day.grossByCurrency[saleCurrency] || 0) + amount;
    if (saleCurrency === currency) day.netEstimate += amount * (1 - feeRate);
    days.set(date, day);
  }
  for (const day of days.values()) {
    day.netEstimate = Math.round(day.netEstimate * 1_000_000) / 1_000_000;
    for (const code of Object.keys(day.grossByCurrency))
      day.grossByCurrency[code] = Math.round(day.grossByCurrency[code] * 100) / 100;
  }
  return [...days.values()].sort((left, right) => left.date.localeCompare(right.date));
}

// Earnings reports arrive once a month, after it closes, with every charge,
// Google fee, tax and refund already converted to the merchant currency. Their
// sum per transaction day is the real net that replaces the sales estimate.
export function parseEarnings(text, packageName, currency) {
  const days = new Map();
  for (const row of parseDelimited(text, ",")) {
    const product = column(row, "Product id", "Product ID", "Package ID");
    if (product && product !== packageName) continue;
    if ((column(row, "Merchant Currency") || currency) !== currency) continue;
    const date = reportDate(column(row, "Transaction Date"));
    const amount = parseAmount(column(row, "Amount (Merchant Currency)"));
    if (!date || amount === null) continue;
    days.set(date, (days.get(date) || 0) + amount);
  }
  return [...days.entries()]
    .map(([date, net]) => ({ date, net: Math.round(net * 1_000_000) / 1_000_000 }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function emptySalesDay(date) {
  return { date, orders: 0, refunds: 0, subscriptions: 0, grossByCurrency: {}, netEstimate: 0 };
}

// Closed months with an earnings report use its real net; later days keep the
// estimate from the sales report.
export function applyEarnings(sales, earnings) {
  const months = new Set(earnings.map((row) => row.month));
  if (!months.size) return sales;
  const net = new Map();
  for (const row of earnings) for (const day of row.rows) net.set(day.date, (net.get(day.date) || 0) + day.net);
  const byDate = new Map(sales.map((row) => [row.date, row]));
  for (const month of months) {
    for (let date = `${month}-01`; date <= monthEnd(month); date = addDays(date, 1)) {
      const day = byDate.get(date) || emptySalesDay(date);
      byDate.set(date, { ...day, netEstimate: Math.round((net.get(date) || 0) * 1_000_000) / 1_000_000, netSource: "earnings" });
    }
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

// A sales file covers every day up to the day before Google last rewrote it;
// days without orders inside that range are genuine zeros.
function salesCoverage(month, updatedAt) {
  const end = monthEnd(month);
  const covered = addDays(isoDay(updatedAt), -1);
  return covered < `${month}-01` ? null : covered > end ? end : covered;
}

function fillSales(month, rows, coveredThrough) {
  if (!coveredThrough) return [];
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const filled = [];
  for (let date = `${month}-01`; date <= coveredThrough; date = addDays(date, 1)) {
    filled.push(byDate.get(date) || emptySalesDay(date));
  }
  return filled;
}

export async function refreshPlayReports(env, existing = {}) {
  const bucket = bucketName(env);
  if (!bucket) return { notConfigured: true, daily: [] };
  const pkg = env.GOOGLE_PLAY_PACKAGE;
  const currency = env.DEFAULT_CURRENCY || "EUR";
  const feeRate = Number.isFinite(Number(env.GOOGLE_PLAY_FEE_RATE)) && env.GOOGLE_PLAY_FEE_RATE !== undefined
    ? Number(env.GOOGLE_PLAY_FEE_RATE)
    : DEFAULT_FEE_RATE;
  const months = recentMonths();
  const previousObjects = existing.objects || {};
  const objects = {};
  const denied = new Set();

  const load = async (kind, month, name, parse, knownGeneration) => {
    const previous = previousObjects[name];
    // A listing already told us the generation; an unchanged file needs no request.
    if (previous && knownGeneration && previous.generation === knownGeneration) {
      objects[name] = previous;
      return;
    }
    const result = await fetchObject(env, bucket, name, previous);
    if (result.forbidden) {
      denied.add(kind);
      if (previous) objects[name] = previous;
      return;
    }
    if (result.missing) return;
    if (result.unchanged) {
      objects[name] = previous;
      return;
    }
    objects[name] = {
      kind,
      month,
      generation: result.generation,
      updatedAt: result.updatedAt,
      rows: await parse(result.bytes, month, result.updatedAt),
    };
  };

  await Promise.all(
    months.flatMap((month) => {
      const compact = monthKey(`${month}-01`);
      const jobs = [
        load("installs", month, `stats/installs/installs_${pkg}_${compact}_overview.csv`, (bytes) => parseInstalls(decodeText(bytes))),
        load("ratings", month, `stats/ratings/ratings_${pkg}_${compact}_overview.csv`, (bytes) => parseRatings(decodeText(bytes))),
        load("sales", month, `sales/salesreport_${compact}.zip`, async (bytes, reportMonth, updatedAt) => {
          const csv = await unzipFirst(bytes);
          if (!csv) return [];
          return fillSales(reportMonth, summarizeSales(decodeText(csv), pkg, currency, feeRate), salesCoverage(reportMonth, updatedAt));
        }),
      ];
      // Country detail only matters for the 30-day window.
      if (month >= months[1])
        jobs.push(load("countries", month, `stats/installs/installs_${pkg}_${compact}_country.csv`, (bytes) => parseCountryInstalls(decodeText(bytes))));
      jobs.push(
        listObjects(env, bucket, `earnings/earnings_${compact}`).then((listing) => {
          if (listing.forbidden) {
            denied.add("earnings");
            return;
          }
          return Promise.all(
            listing.items
              .filter((item) => item.name.endsWith(".zip") || item.name.endsWith(".csv"))
              .map((item) =>
                load("earnings", month, item.name, async (bytes) => {
                  const csv = item.name.endsWith(".zip") ? await unzipFirst(bytes) : bytes;
                  return csv ? parseEarnings(decodeText(csv), pkg, currency) : [];
                }, String(item.generation)),
              ),
          );
        }),
      );
      return jobs;
    }),
  );

  if (denied.has("installs") && !Object.keys(objects).length)
    throw new Error("Play bulk reports denied: grant the service account access to download reports");

  const rowsOf = (kind) =>
    Object.values(objects)
      .filter((object) => object.kind === kind)
      .flatMap((object) => object.rows || []);
  const byDate = new Map();
  for (const row of rowsOf("installs")) byDate.set(row.date, { ...(byDate.get(row.date) || {}), ...row });
  const installsDaily = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  const ratings = rowsOf("ratings").sort((left, right) => left.date.localeCompare(right.date));
  const latestRating = [...ratings].reverse().find((row) => row.total !== null) || null;
  const earnings = Object.values(objects).filter((object) => object.kind === "earnings");
  const sales = applyEarnings(
    rowsOf("sales").sort((left, right) => left.date.localeCompare(right.date)),
    earnings,
  );
  const earningsMonths = earnings.map((object) => object.month).sort();

  return {
    daily: installsDaily.slice(-90),
    sales: sales.slice(-90),
    countries: rowsOf("countries").filter((row) => row.date >= addDays(isoDay(), -40)),
    rating: latestRating
      ? { average: latestRating.total, date: latestRating.date, dailyAverage: latestRating.daily }
      : null,
    ratingsDaily: ratings.slice(-60).map(({ date, daily }) => ({ date, daily })),
    salesAvailable: !denied.has("sales") || earnings.length > 0,
    earningsThrough: earningsMonths.length ? monthEnd(earningsMonths.at(-1)) : null,
    feeRate,
    denied: [...denied],
    objects,
  };
}

export const playReportsInternals = { bucketName, fillSales, monthEnd, recentMonths, salesCoverage };
