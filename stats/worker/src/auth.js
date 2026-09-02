import { decodeBase64url, parseJwt } from "./crypto.js";

let cachedKeys = null;
let keysExpireAt = 0;

async function accessKeys(teamDomain) {
  if (cachedKeys && Date.now() < keysExpireAt) return cachedKeys;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Cloudflare Access certificates returned ${response.status}`);
  cachedKeys = await response.json();
  keysExpireAt = Date.now() + 60 * 60 * 1000;
  return cachedKeys;
}

async function importVerificationKey(jwk) {
  if (jwk.kty === "RSA") {
    return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  }
  if (jwk.kty === "EC") {
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  }
  throw new Error(`Unsupported Access key type ${jwk.kty}`);
}

function expectedIssuer(teamDomain) {
  return `https://${teamDomain}`.replace(/\/$/u, "");
}

export async function requireViewer(request, env) {
  if (env.ENVIRONMENT === "local" && env.DEV_AUTH_BYPASS === "true") {
    return { email: "local@development", subject: "local" };
  }

  const token = request.headers.get("CF-Access-Jwt-Assertion");
  if (!token) throw new Response("Cloudflare Access authentication required", { status: 401 });
  const parsed = parseJwt(token);
  const keys = await accessKeys(env.ACCESS_TEAM_DOMAIN);
  const candidates = [...(keys.keys || []), ...(keys.public_certs || [])].filter(key => !parsed.header.kid || key.kid === parsed.header.kid);
  let verified = false;
  for (const candidate of candidates) {
    try {
      const jwk = typeof candidate === "string" ? JSON.parse(new TextDecoder().decode(decodeBase64url(candidate))) : candidate;
      const key = await importVerificationKey(jwk);
      const algorithm = jwk.kty === "EC" ? { name: "ECDSA", hash: "SHA-256" } : { name: "RSASSA-PKCS1-v1_5" };
      if (await crypto.subtle.verify(algorithm, key, parsed.signature, parsed.signed)) { verified = true; break; }
    } catch { /* Try the next published key. */ }
  }
  if (!verified) throw new Response("Invalid Access signature", { status: 401 });

  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(parsed.payload.aud) ? parsed.payload.aud : [parsed.payload.aud];
  if (parsed.payload.exp <= now || parsed.payload.nbf > now + 30) throw new Response("Expired Access session", { status: 401 });
  if (!audience.includes(env.ACCESS_AUD)) throw new Response("Wrong Access audience", { status: 403 });
  if (String(parsed.payload.iss).replace(/\/$/u, "") !== expectedIssuer(env.ACCESS_TEAM_DOMAIN)) throw new Response("Wrong Access issuer", { status: 403 });
  if (String(parsed.payload.email).toLowerCase() !== String(env.ACCESS_ALLOWED_EMAIL).toLowerCase()) throw new Response("Viewer not allowed", { status: 403 });
  return { email: parsed.payload.email, subject: parsed.payload.sub };
}

export function assertRefreshIntent(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) throw new Response("Cross-origin refresh rejected", { status: 403 });
  if (request.headers.get("X-Pulse-Intent") !== "refresh") throw new Response("Refresh intent missing", { status: 400 });
}
