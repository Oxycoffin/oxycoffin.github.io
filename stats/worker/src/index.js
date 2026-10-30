import { buildDashboard, dashboardTag } from "./analytics.js";
import { assertRefreshIntent, requireViewer } from "./auth.js";
import { addDays, ageMs, isoDay } from "./dates.js";
import { fxIsStale, refreshFx } from "./fx.js";
import { refreshAdmob } from "./providers/admob.js";
import { refreshApple } from "./providers/apple.js";
import { refreshPlay } from "./providers/google.js";
import { refreshPlayReports } from "./providers/play_reports.js";
import { markAttempt, markFailure, markSuccess, readState, SOURCE_NAMES } from "./state.js";

const MINUTE = 60 * 1000;
// The cron fires every 10 minutes; intervals are what each upstream can
// realistically change at, so most ticks only touch AdMob.
export const SOURCE_INTERVALS = {
  admob: 10 * MINUTE,
  play: 60 * MINUTE,
  playReports: 3 * 60 * MINUTE,
  apple: 24 * 60 * MINUTE,
};
const MANUAL_REFRESH_COOLDOWN = 5 * MINUTE;
const APPLE_CATCH_UP_INTERVAL = 30 * MINUTE;
const ERROR_RETRY_INTERVAL = 30 * MINUTE;
// Cron jitter must not push a 10-minute source to the next tick.
const SCHEDULE_SLACK = 90 * 1000;

function json(value, status = 200, extraHeaders = {}) {
  return new Response(status === 304 ? null : JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

const refreshers = {
  apple: refreshApple,
  play: refreshPlay,
  playReports: refreshPlayReports,
  admob: refreshAdmob,
};

async function updateSource(env, sourceName) {
  const refresher = refreshers[sourceName];
  if (!refresher) throw new Error(`Unknown source ${sourceName}`);
  const before = await markAttempt(env, sourceName);
  try {
    await markSuccess(env, sourceName, before, await refresher(env, before.data || {}));
  } catch (error) {
    console.error(JSON.stringify({ event: "source_refresh_failed", source: sourceName, message: String(error?.message || error) }));
    await markFailure(env, sourceName, before, error);
  }
}

// Apple publishes yesterday's report some hours into the day; until it
// arrives (or while history is incomplete) the source is checked more often.
function appleNeedsCatchUp(data = {}) {
  if (data.backfillComplete === false) return true;
  const yesterday = addDays(isoDay(), -1);
  return !(data.daily || []).some((day) => day.date === yesterday && day.reportAvailable !== false);
}

export function intervalFor(name, source = {}) {
  const interval = name === "apple" && appleNeedsCatchUp(source.data)
    ? APPLE_CATCH_UP_INTERVAL
    : SOURCE_INTERVALS[name];
  // A failed or unconfigured source is rechecked within half an hour, so a
  // fix or a newly added secret shows up without waiting a full cadence.
  return source.status === "error" || source.status === "disabled"
    ? Math.min(interval, ERROR_RETRY_INTERVAL)
    : interval;
}

export function dueSources(state, manual = false) {
  return SOURCE_NAMES.filter((name) => {
    const source = state.sources[name] || {};
    if (ageMs(source.lastAttemptAt) < (manual ? MANUAL_REFRESH_COOLDOWN : MINUTE)) return false;
    if (manual) return true;
    const interval = intervalFor(name, source) - SCHEDULE_SLACK;
    return ageMs(source.lastSuccessAt) >= interval && ageMs(source.lastAttemptAt) >= interval;
  });
}

async function api(request, env, ctx, viewer) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    const state = await readState(env);
    const tag = dashboardTag(state);
    if (request.headers.get("If-None-Match") === tag) return json(null, 304, { ETag: tag });
    return json(buildDashboard(state, viewer, intervalFor), 200, { ETag: tag });
  }
  if (request.method === "POST" && url.pathname === "/api/refresh") {
    assertRefreshIntent(request);
    const state = await readState(env);
    const sources = dueSources(state, true);
    if (!sources.length) return json({ accepted: false, reason: "cooldown" }, 200);
    if (fxIsStale(state.fx)) ctx.waitUntil(refreshFx(env));
    for (const source of sources) ctx.waitUntil(updateSource(env, source));
    return json({ accepted: true, sources }, 202);
  }
  return json({ error: "not_found" }, 404);
}

async function handleRequest(request, env, ctx) {
  let viewer;
  try {
    viewer = await requireViewer(request, env);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(JSON.stringify({ event: "access_validation_failed", message: String(error?.message || error) }));
    return new Response("Access validation failed", { status: 401 });
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return api(request, env, ctx, viewer);
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", url.pathname.endsWith(".html") || url.pathname === "/" ? "private, no-store" : "private, max-age=3600");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch: handleRequest,
  async scheduled(_event, env, ctx) {
    const state = await readState(env);
    if (fxIsStale(state.fx)) ctx.waitUntil(refreshFx(env));
    for (const source of dueSources(state, false)) ctx.waitUntil(updateSource(env, source));
  },
};

export const workerInternals = { dueSources, intervalFor, updateSource, SOURCE_INTERVALS, APPLE_CATCH_UP_INTERVAL };
