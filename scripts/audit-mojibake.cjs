const fs = require('fs');
const path = require('path');

// Patterns representing double-encoded UTF-8 (mojibake)
// For Arabic/Persian/Pashto: UTF-8 bytes for U+06xx and U+07xx are 0xD8..0xDF + 0x80..0xBF.
// When decoded as ISO-8859-1 / Windows-1252, 0xD8=Ø, 0xD9=Ù, 0xDA=Ú, 0xDB=Û.
// Followed by characters like §, ©, ª, «, etc.
// For quotes/dashes: 0xE2 0x80 0x9C becomes â€œ.
const mojibakeRegex = /(?:[ØÙÚÛ][\u0080-\u00BF\u00A0-\u00FF]|â€[™œ\u009d\u0093\u0094])/;

console.log('Auditing JSON files...');
const files = fs.readdirSync('.').filter(f => f.endsWith('.json'));
for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(new RegExp(mojibakeRegex, 'g'));
    if (matches) {
      console.log(`FOUND in JSON file: ${file} (${matches.length} occurrences) -> sample: ${matches.slice(0, 5).join(', ')}`);
    }
  } catch (err) {
    // ignore
  }
}

// Check source files in app/, components/, lib/
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git' && entry.name !== 'backups') {
        scanDir(fullPath);
      }
    } else if (/\.(tsx|ts|js|jsx|json)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(new RegExp(mojibakeRegex, 'g'));
        if (matches) {
          console.log(`FOUND in source file: ${fullPath} (${matches.length} occurrences) -> sample: ${matches.slice(0, 5).join(', ')}`);
        }
      } catch (e) {}
    }
  }
}

console.log('Auditing source directories (app, components, lib)...');
['app', 'components', 'lib'].forEach(scanDir);
