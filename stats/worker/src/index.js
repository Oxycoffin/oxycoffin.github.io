import { buildDashboard } from "./analytics.js";
import { assertRefreshIntent, requireViewer } from "./auth.js";
import { ageMs } from "./dates.js";
import { refreshAdmob } from "./providers/admob.js";
import { refreshApple } from "./providers/apple.js";
import { refreshPlay } from "./providers/google.js";
import { markAttempt, markFailure, markSuccess, readState } from "./state.js";

const SOURCE_INTERVALS = {
  admob: 30 * 60 * 1000,
  play: 2 * 60 * 60 * 1000,
  apple: 24 * 60 * 60 * 1000
};
const MANUAL_REFRESH_COOLDOWN = 5 * 60 * 1000;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

async function updateSource(env, sourceName) {
  const before = await markAttempt(env, sourceName);
  try {
    let data;
    if (sourceName === "apple") data = await refreshApple(env, before.sources.apple.data);
    else if (sourceName === "play") data = await refreshPlay(env);
    else if (sourceName === "admob") data = await refreshAdmob(env);
    else throw new Error(`Unknown source ${sourceName}`);
    await markSuccess(env, sourceName, data);
  } catch (error) {
    console.error(JSON.stringify({ event: "source_refresh_failed", source: sourceName, message: String(error?.message || error) }));
    await markFailure(env, sourceName, error);
  }
}

async function mostOverdueSource(env, manual = false) {
  const state = await readState(env);
  const candidates = Object.keys(SOURCE_INTERVALS).map(name => {
    const source = state.sources[name] || {};
    const dueBy = manual ? MANUAL_REFRESH_COOLDOWN : SOURCE_INTERVALS[name];
    return { name, overdue: ageMs(source.lastSuccessAt) - dueBy, attemptAge: ageMs(source.lastAttemptAt) };
  }).filter(candidate => candidate.overdue >= 0 && candidate.attemptAge >= (manual ? MANUAL_REFRESH_COOLDOWN : 60_000));
  candidates.sort((left, right) => right.overdue - left.overdue);
  return candidates[0]?.name || null;
}

async function api(request, env, ctx, viewer) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    return json(buildDashboard(await readState(env), viewer));
  }
  if (request.method === "POST" && url.pathname === "/api/refresh") {
    assertRefreshIntent(request);
    const source = await mostOverdueSource(env, true);
    if (!source) return json({ accepted: false, reason: "cooldown" }, 200);
    ctx.waitUntil(updateSource(env, source));
    return json({ accepted: true, source }, 202);
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
    const source = await mostOverdueSource(env, false);
    if (source) ctx.waitUntil(updateSource(env, source));
  }
};

export const workerInternals = { mostOverdueSource, updateSource, SOURCE_INTERVALS };
