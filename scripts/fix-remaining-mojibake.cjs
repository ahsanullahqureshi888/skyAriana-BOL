const fs = require('fs');

let c = fs.readFileSync('components/reports-view.tsx', 'utf8');

c = c.replace(/â˜€ï¸\s*/g, '☀️ ');
c = c.replace(/ðŸŒ™/g, '🌙');
c = c.replace(/ðŸ’±/g, '💱');
c = c.replace(/â\x8F³/g, '⏳');
c = c.replace(/â†—/g, '↗');
c = c.replace(/â†™/g, '↙');
c = c.replace(/â†”/g, '↔');
c = c.replace(/â†’/g, '→');

fs.writeFileSync('components/reports-view.tsx', c, 'utf8');
console.log('Reports view mojibake successfully fixed!');
