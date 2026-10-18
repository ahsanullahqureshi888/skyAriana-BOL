// Mapping from Windows-1252 characters to byte values 0x00 - 0xFF
const cp1252Map = new Map();
for (let i = 0; i < 256; i++) {
  const buf = Buffer.from([i]);
  // Use text decoder or manual map for 0x80-0x9F
}

// Windows-1252 exact byte mapping table:
const windows1252 = {
  '\u20AC': 0x80, // €
  '\u201A': 0x82, // ‚
  '\u0192': 0x83, // ƒ
  '\u201E': 0x84, // „
  '\u2026': 0x85, // …
  '\u2020': 0x86, // †
  '\u2021': 0x87, // ‡
  '\u02C6': 0x88, // ˆ
  '\u2030': 0x89, // ‰
  '\u0160': 0x8A, // Š
  '\u2039': 0x8B, // ‹
  '\u0152': 0x8C, // Œ
  '\u017D': 0x8E, // Ž
  '\u2018': 0x91, // ‘
  '\u2019': 0x92, // ’
  '\u201C': 0x93, // “
  '\u201D': 0x94, // ”
  '\u2022': 0x95, // •
  '\u2013': 0x96, // –
  '\u2014': 0x97, // —
  '\u02DC': 0x98, // ˜
  '\u2122': 0x99, // ™
  '\u0161': 0x9A, // š
  '\u203A': 0x9B, // ›
  '\u0153': 0x9C, // œ
  '\u017E': 0x9E, // ž
  '\u0178': 0x9F, // Ÿ
};

function decodeMojibake(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);
    if (code < 128) {
      bytes.push(code);
    } else if (windows1252[ch] !== undefined) {
      bytes.push(windows1252[ch]);
    } else if (code <= 255) {
      bytes.push(code);
    } else {
      // It's already a unicode character above 255 that wasn't part of windows-1252
      const utf8Buf = Buffer.from(ch, 'utf8');
      for (const b of utf8Buf) bytes.push(b);
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

const testSample1 = 'ØªÙ…Ø§Ù… ÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§';
const testSample2 = 'ðŸŸ¢ Profitable / Ø³ÙˆØ¯Ø¯Ù‡ (> $0)';
const testSample3 = 'ðŸ“¦ All Consignees / ØªÙ…Ø§Ù… Ú¯ÛŒØ±Ù†Ø¯Ù‡â€ŒÙ‡Ø§';

console.log('Sample 1 decoded:', decodeMojibake(testSample1));
console.log('Sample 2 decoded:', decodeMojibake(testSample2));
console.log('Sample 3 decoded:', decodeMojibake(testSample3));
