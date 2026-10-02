const fs = require('fs');
const path = require('path');

console.log('--- Checking app/layout.tsx for UTF-8 metadata ---');
try {
  const layout = fs.readFileSync('app/layout.tsx', 'utf8');
  console.log('app/layout.tsx exists. Has charset?', /charset/i.test(layout));
} catch (e) {
  console.log('Error reading app/layout.tsx:', e.message);
}

// Check all source files
const mojibakeRegex = /(?:[ØÙÚÛ][\u0080-\u00BF\u00A0-\u00FF]|â€[™œ\u009d\u0093\u0094]|Ã[¡-¿])/;
const matches = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'backups', 'dist', 'dist-electron', '.asar-stage'].includes(item.name)) {
        scan(full);
      }
    } else if (/\.(tsx|ts|js|jsx|json|py|html|css|md)$/.test(item.name)) {
      try {
        const text = fs.readFileSync(full, 'utf8');
        const m = text.match(new RegExp(mojibakeRegex, 'g'));
        if (m && m.length > 0) {
          matches.push({ file: full, count: m.length, sample: m.slice(0, 3) });
        }
      } catch (err) {}
    }
  }
}

scan('.');
console.log('Files with detected mojibake:');
console.log(JSON.stringify(matches, null, 2));
