// Read WOFF2 cmap tables directly to verify actual glyph coverage without system fonts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { brotliDecompressSync } = require('node:zlib');
const root = path.join(__dirname, '../public');
function cmapFor(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
  let cursor = 48, offset = 0, cmap;
  const uint128 = () => {
    let value = 0, part;
    do { part = bytes[cursor++]; value = value * 128 + (part & 127); } while (part & 128);
    return value;
  };
  for (let i = 0; i < bytes.readUInt16BE(12); i++) {
    const flags = bytes[cursor++], tag = flags & 63, version = flags >> 6;
    if (tag === 63) cursor += 4;
    const original = uint128();
    const transformed = tag === 10 || tag === 11 ? version !== 3 : version !== 0;
    const length = transformed ? uint128() : original;
    if (tag === 0) cmap = { offset, length };
    offset += length;
  }
  assert.ok(cmap, 'font contains cmap');
  const raw = brotliDecompressSync(bytes.subarray(cursor, cursor + bytes.readUInt32BE(20)));
  return raw.subarray(cmap.offset, cmap.offset + cmap.length);
}
function coverage(file) {
  const table = cmapFor(file), result = new Set();
  for (let i = 0; i < table.readUInt16BE(2); i++) {
    const start = table.readUInt32BE(8 + i * 8);
    const format = table.readUInt16BE(start);
    if (format === 4) {
      const segments = table.readUInt16BE(start + 6) / 2;
      const ends = start + 14, starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2, ranges = deltas + segments * 2;
      for (let seg = 0; seg < segments; seg++) {
        const first = table.readUInt16BE(starts + seg * 2), last = table.readUInt16BE(ends + seg * 2);
        const delta = table.readInt16BE(deltas + seg * 2), range = table.readUInt16BE(ranges + seg * 2);
        for (let code = first; code <= last; code++) {
          let glyph = range ? table.readUInt16BE(ranges + seg * 2 + range + (code - first) * 2) : code;
          if (!range || glyph) glyph = (glyph + delta) & 65535;
          if (glyph) result.add(code);
        }
      }
    } else if (format === 12) {
      for (let group = 0; group < table.readUInt32BE(start + 12); group++) {
        const entry = start + 16 + group * 12;
        const first = table.readUInt32BE(entry), last = table.readUInt32BE(entry + 4), glyph = table.readUInt32BE(entry + 8);
        for (let code = first; code <= last; code++) if (glyph + code - first) result.add(code);
      }
    }
  }
  return result;
}
const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ĂÂĐÊÔƠƯăâđêôơưÀÁÃÈÉÌÍÒÓÕÙÚÝàáãèéìíòóõùúý' +
  Array.from({ length: 0x1ef9 - 0x1ea0 + 1 }, (_, i) => String.fromCodePoint(0x1ea0 + i)).join('');
const css = fs.readFileSync(path.join(root, 'fonts/studio/fonts.css'), 'utf8');
const groups = new Map();
for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
  const rule = match[1], family = rule.match(/font-family: '([^']+)'/)[1], weight = rule.match(/font-weight: ([^;]+)/)[1];
  const file = rule.match(/url\(([^)]+)\)/)[1];
  assert.ok(file.startsWith('/fonts/studio/'));
  const key = `${family}-${weight}`;
  const glyphs = groups.get(key) || new Set();
  coverage(path.join(root, file)).forEach(code => glyphs.add(code));
  groups.set(key, glyphs);
}
assert.equal(groups.size, 10);
for (const [name, glyphs] of groups) for (const char of sample) assert.ok(glyphs.has(char.codePointAt(0)), `${name} missing ${char}`);
const noto = new Set();
for (const subset of ['latin', 'latin-ext', 'vietnamese']) coverage(path.join(root, `fonts/greeting-card/noto-serif-${subset}.woff2`)).forEach(code => noto.add(code));
for (const char of sample) assert.ok(noto.has(char.codePointAt(0)), `Noto Serif missing ${char}`);
console.log('All 6 Studio fonts cover Vietnamese upper/lowercase glyphs, with local Latin and Vietnamese subsets');
