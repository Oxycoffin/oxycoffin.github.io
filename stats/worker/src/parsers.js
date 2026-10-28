export function parseDelimited(text, delimiter = "\t") {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some(cell => cell !== "")) rows.push(row);
      row = [];
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(header => header.trim());
  return rows.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export async function responseTextPossiblyGzipped(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export function decimalValue(metric) {
  const raw = metric?.decimalValue?.value ?? metric?.doubleValue ?? metric?.integerValue ?? metric?.microsValue;
  if (raw === undefined || raw === null || raw === "") return null;
  return metric?.microsValue !== undefined ? Number(raw) / 1_000_000 : Number(raw);
}

// Play bulk statistics are UTF-16LE with a BOM; sales reports are UTF-8.
// The UTF-16 path is decoded by hand because runtimes differ in which
// TextDecoder labels they ship.
export function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    let text = "";
    const total = (bytes.length - 2) >> 1;
    for (let first = 0; first < total; first += 8192) {
      const units = new Uint16Array(Math.min(8192, total - first));
      for (let unit = 0; unit < units.length; unit += 1) {
        const offset = 2 + (first + unit) * 2;
        units[unit] = bytes[offset] | (bytes[offset + 1] << 8);
      }
      text += String.fromCharCode(...units);
    }
    return text;
  }
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder().decode(bytes.subarray(start));
}

// Minimal reader for the single-file archives Google Play publishes: walks the
// central directory and inflates the first matching entry.
export async function unzipFirst(bytes, matcher = (name) => name.endsWith(".csv")) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("ZIP end of central directory not found");
  const entries = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);
  for (let entry = 0; entry < entries; entry += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("Malformed ZIP central directory");
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
    pointer += 46 + nameLength + extraLength + commentLength;
    if (!matcher(name)) continue;
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) return compressed;
    if (method !== 8) throw new Error(`Unsupported ZIP compression ${method}`);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return null;
}

export function parseAmount(value) {
  const cleaned = String(value ?? "").replace(/[\s,]/gu, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}
