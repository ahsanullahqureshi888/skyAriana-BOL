const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Mojibake & UTF-8 Encoding Regression Protection', async (t) => {
  // Common double-encoded UTF-8 mojibake pattern:
  // e.g. Arabic/Persian/Pashto double encoded: Ø, Ù, Ú, Û followed by 0x80-0xBF or 0xA0-0xFF
  // or quotes/symbols: â€ followed by special bytes
  const mojibakeRegex = /(?:[ØÙÚÛ][\u0080-\u00BF\u00A0-\u00FF]|â€[™œ\u009d\u0093\u0094¢—]|Ã[¡-¿])/;

  const violations = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'backups', 'dist', 'dist-electron', '.asar-stage', 'public'].includes(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (/\.(tsx|ts|jsx|js|json)$/.test(entry.name)) {
        // Skip test files, mock files, backups or binaries
        if (entry.name.includes('.backup') || entry.name.includes('.bak')) continue;
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(new RegExp(mojibakeRegex, 'g'));
          if (matches && matches.length > 0) {
            violations.push({
              file: fullPath,
              count: matches.length,
              sample: matches.slice(0, 3)
            });
          }
        } catch (e) {}
      }
    }
  }

  await t.test('Root JSON data files must not contain mojibake', () => {
    const jsonFiles = fs.readdirSync('.').filter(f => f.startsWith('.local-') && f.endsWith('.json') && !f.includes('.backup') && !f.includes('.bak'));
    const jsonViolations = [];
    for (const f of jsonFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const matches = content.match(new RegExp(mojibakeRegex, 'g'));
      if (matches) {
        jsonViolations.push(`${f} (${matches.length} corrupted tokens)`);
      }
    }
    assert.deepEqual(jsonViolations, [], `Corrupted encoding found in data files: ${jsonViolations.join(', ')}`);
  });

  await t.test('Components and App source code must not contain mojibake', () => {
    ['app', 'components', 'lib'].forEach(scanDirectory);
    assert.equal(
      violations.length,
      0,
      `Found mojibake in source code files:\n${violations.map(v => `${v.file}: ${v.count} occurrences (e.g. ${v.sample.join(', ')})`).join('\n')}`
    );
  });

  await t.test('app/layout.tsx explicitly includes UTF-8 charset in head', () => {
    const layout = fs.readFileSync('app/layout.tsx', 'utf8');
    assert.ok(/charSet="utf-8"/i.test(layout), 'app/layout.tsx must contain <meta charSet="utf-8" />');
  });
});
