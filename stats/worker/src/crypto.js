const encoder = new TextEncoder();

export function base64url(input) {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodeBase64url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function pemBytes(pem) {
  const body = String(pem).replace(/-----[^-]+-----/gu, "").replace(/\s/gu, "");
  const binary = atob(body);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function signJwt({ header, payload, key, algorithm }) {
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(algorithm, key, encoder.encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

export function parseJwt(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  return {
    header: JSON.parse(new TextDecoder().decode(decodeBase64url(parts[0]))),
    payload: JSON.parse(new TextDecoder().decode(decodeBase64url(parts[1]))),
    signature: decodeBase64url(parts[2]),
    signed: encoder.encode(`${parts[0]}.${parts[1]}`)
  };
}
