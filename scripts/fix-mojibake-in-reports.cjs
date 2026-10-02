const fs = require('fs');

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
      const utf8Buf = Buffer.from(ch, 'utf8');
      for (const b of utf8Buf) bytes.push(b);
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

// Check how many regex matches exist
const mojibakeRegex = /(?:[ØÙÚÛ][\u0080-\u00BF\u00A0-\u00FF]|â€[™œ\u009d\u0093\u0094]|ðŸ[Ÿ”]|âš[¡]|ðŸ“|ðŸ‘)/;

const content = fs.readFileSync('components/reports-view.tsx', 'utf8');
const lines = content.split('\n');
let fixedCount = 0;

const newLines = lines.map((line, idx) => {
  if (mojibakeRegex.test(line)) {
    try {
      const fixed = decodeMojibake(line);
      // Verify that the fixed line doesn't throw and looks valid
      if (fixed !== line) {
        fixedCount++;
        return fixed;
      }
    } catch (e) {
      console.error(`Error on line ${idx + 1}:`, e.message);
    }
  }
  return line;
});

console.log(`Replaced mojibake on ${fixedCount} lines.`);

// Save fixed file
fs.writeFileSync('components/reports-view.tsx', newLines.join('\n'), 'utf8');
console.log('Saved fixed components/reports-view.tsx');
