const STATE_KEY = "tindrop-pulse:state:v1";

export function emptyState(currency = "EUR") {
  return {
    version: 1,
    currency,
    generatedAt: null,
    sources: {
      apple: { status: "pending", data: { daily: [] } },
      play: { status: "pending", data: { daily: [] } },
      admob: { status: "pending", data: { daily: [] } }
    }
  };
}

export async function readState(env) {
  const state = await env.PULSE_CACHE.get(STATE_KEY, "json");
  return state || emptyState(env.DEFAULT_CURRENCY || "EUR");
}

export async function writeState(env, state) {
  state.generatedAt = new Date().toISOString();
  await env.PULSE_CACHE.put(STATE_KEY, JSON.stringify(state));
  return state;
}

export async function markAttempt(env, sourceName) {
  const state = await readState(env);
  state.sources[sourceName] = {
    ...state.sources[sourceName],
    status: state.sources[sourceName]?.lastSuccessAt ? "ready" : "pending",
    lastAttemptAt: new Date().toISOString(),
    error: null
  };
  return writeState(env, state);
}

export async function markSuccess(env, sourceName, data) {
  const state = await readState(env);
  state.sources[sourceName] = {
    ...state.sources[sourceName],
    status: "ready",
    lastAttemptAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    error: null,
    data
  };
  return writeState(env, state);
}

export async function markFailure(env, sourceName, error) {
  const state = await readState(env);
  state.sources[sourceName] = {
    ...state.sources[sourceName],
    status: "error",
    lastAttemptAt: new Date().toISOString(),
    error: String(error?.message || error).slice(0, 240)
  };
  return writeState(env, state);
}
