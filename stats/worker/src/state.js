import { readFx } from "./fx.js";

// Each source lives under its own key so concurrent refreshes of different
// sources never overwrite each other. The v1 combined key is read only as a
// fallback until every source has been rewritten under the new layout.
const LEGACY_STATE_KEY = "tindrop-pulse:state:v1";
const SOURCE_KEY_PREFIX = "tindrop-pulse:source:v2:";

export const SOURCE_NAMES = ["apple", "play", "playReports", "admob"];

function emptySource() {
  return { status: "pending", data: { daily: [] } };
}

export function emptyState(currency = "EUR") {
  return {
    version: 2,
    currency,
    sources: Object.fromEntries(SOURCE_NAMES.map((name) => [name, emptySource()])),
  };
}

export async function readSource(env, sourceName) {
  const stored = await env.PULSE_CACHE.get(`${SOURCE_KEY_PREFIX}${sourceName}`, "json");
  if (stored) return stored;
  const legacy = await env.PULSE_CACHE.get(LEGACY_STATE_KEY, "json");
  return legacy?.sources?.[sourceName] || emptySource();
}

export async function readState(env) {
  const [fx, ...stored] = await Promise.all([
    readFx(env),
    ...SOURCE_NAMES.map((name) => env.PULSE_CACHE.get(`${SOURCE_KEY_PREFIX}${name}`, "json")),
  ]);
  const legacy = stored.some((source) => !source)
    ? await env.PULSE_CACHE.get(LEGACY_STATE_KEY, "json")
    : null;
  const state = emptyState(env.DEFAULT_CURRENCY || "EUR");
  state.fx = fx;
  SOURCE_NAMES.forEach((name, index) => {
    state.sources[name] = stored[index] || legacy?.sources?.[name] || emptySource();
  });
  return state;
}

async function writeSource(env, sourceName, source) {
  await env.PULSE_CACHE.put(`${SOURCE_KEY_PREFIX}${sourceName}`, JSON.stringify(source));
  return source;
}

export async function markAttempt(env, sourceName) {
  const source = await readSource(env, sourceName);
  return writeSource(env, sourceName, {
    ...source,
    status: source.lastSuccessAt ? "ready" : "pending",
    lastAttemptAt: new Date().toISOString(),
    error: null,
  });
}

export async function markSuccess(env, sourceName, previous, data) {
  const now = new Date().toISOString();
  return writeSource(env, sourceName, {
    ...previous,
    status: data?.notConfigured ? "disabled" : "ready",
    lastAttemptAt: now,
    lastSuccessAt: now,
    error: null,
    data,
  });
}

export async function markFailure(env, sourceName, previous, error) {
  return writeSource(env, sourceName, {
    ...previous,
    status: "error",
    lastAttemptAt: new Date().toISOString(),
    error: String(error?.message || error).slice(0, 240),
  });
}
