// Approximate EUR conversion for sales Apple and Google report in the buyer's
// currency. Rates come from a free daily EUR-based feed (covers PYG and other
// currencies the ECB omits) and are cached in KV; the dashboard applies them at
// build time, so stored history never needs rewriting.
const FX_KEY = "tindrop-pulse:fx:v1";
const FX_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/eur.min.json",
];
const FX_MAX_AGE = 12 * 60 * 60 * 1000;

export async function readFx(env) {
  return (await env.PULSE_CACHE.get(FX_KEY, "json")) || null;
}

export function fxIsStale(fx, now = Date.now()) {
  return !fx?.fetchedAt || now - Date.parse(fx.fetchedAt) >= FX_MAX_AGE;
}

export function parseRates(payload) {
  const rates = {};
  for (const [code, value] of Object.entries(payload?.eur || {})) {
    if (/^[a-z]{3}$/.test(code) && Number(value) > 0) rates[code.toUpperCase()] = Number(value);
  }
  rates.EUR = 1;
  return rates;
}

export async function refreshFx(env, fetcher = fetch) {
  let lastError;
  for (const url of FX_URLS) {
    try {
      const response = await fetcher(url, { cf: { cacheTtl: 3600 } });
      if (!response.ok) throw new Error(`FX ${response.status}`);
      const payload = await response.json();
      const rates = parseRates(payload);
      if (Object.keys(rates).length < 30) throw new Error("FX payload incomplete");
      const fx = { date: payload.date || null, fetchedAt: new Date().toISOString(), source: new URL(url).host, rates };
      await env.PULSE_CACHE.put(FX_KEY, JSON.stringify(fx));
      return fx;
    } catch (error) {
      lastError = error;
    }
  }
  console.error(JSON.stringify({ event: "fx_refresh_failed", message: String(lastError?.message || lastError) }));
  return null;
}

// Units of `code` per euro, or null when the rate is unknown.
function rateFor(rates, code) {
  const rate = Number(rates?.[code]);
  return rate > 0 ? rate : null;
}

// Converts a {currency: amount} map to EUR. `unconverted` collects currencies
// without a rate so the panel can still name them.
export function toEur(amounts = {}, rates, currency = "EUR", unconverted = null) {
  let total = 0;
  for (const [code, amount] of Object.entries(amounts)) {
    const value = Number(amount);
    if (!value) continue;
    if (code === currency) {
      total += value;
      continue;
    }
    const rate = rateFor(rates, code);
    const eurRate = rateFor(rates, currency);
    if (rate && eurRate) total += (value / rate) * eurRate;
    else if (unconverted) unconverted[code] = (unconverted[code] || 0) + value;
  }
  return total;
}

// Returns copies of the Apple and Play sales rows whose revenue fields already
// include other currencies converted to the dashboard currency.
export function convertRevenueRows({ apple = [], sales = [] }, rates, currency = "EUR", feeRate = 0.15) {
  const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
  return {
    apple: apple.map((day) => {
      if (!day.proceedsByCurrency) return day;
      const converted = toEur(day.proceedsByCurrency, rates, currency);
      return { ...day, proceeds: round(converted), proceedsNative: day.proceeds };
    }),
    sales: sales.map((day) => {
      // Earnings rows are Google's own merchant-currency payout.
      if (day.netSource === "earnings") return day;
      const foreign = Object.fromEntries(
        Object.entries(day.grossByCurrency || {}).filter(([code]) => code !== currency),
      );
      const extra = toEur(foreign, rates, currency) * (1 - feeRate);
      return extra ? { ...day, netEstimate: round(Number(day.netEstimate || 0) + extra) } : day;
    }),
  };
}
