const fs = require('node:fs');
const path = require('node:path');

// Deterministic, self-contained vector artwork: no network or external fonts.
const groups = {
  Mountains: ['Alpine Dawn', 'Glacier Valley', 'Snow Ridge', 'Highland Lake', 'Golden Summit', 'Silent Peaks', 'Mountain Mist', 'Twilight Range'],
  Overland: ['Silk Road', 'Desert Highway', 'Border Crossing', 'Valley Transit', 'Cargo Convoy', 'Rail Corridor', 'Winding Pass', 'Horizon Route'],
  Maritime: ['Ocean Passage', 'Harbor Morning', 'Coastal Freight', 'Container Port', 'Lighthouse Bay', 'Island Channel', 'Deep Blue', 'Sunset Anchorage'],
  Aviation: ['Cloud Atlas', 'Flight Corridor', 'Sky Express', 'Dawn Departure', 'Air Bridge', 'Above the Clouds', 'Global Flight', 'Evening Arrival'],
  Geometric: ['Compass Lines', 'Contour Map', 'Trade Network', 'Meridian Grid', 'Soft Arches', 'Route Geometry', 'Pearl Waves', 'Northern Star'],
};
const colors = ['#2563eb', '#0891b2', '#6366f1', '#0d9488', '#b7791f', '#475569', '#7c3aed', '#be6478'];
const directory = path.join(__dirname, '../public/images/document-backgrounds');
fs.mkdirSync(directory, { recursive: true });
const presets = [];
for (const [category, names] of Object.entries(groups)) names.forEach((label, index) => {
  const color = colors[index];
  const shift = index * 37;
  let art = '';
  if (category === 'Mountains' || category === 'Overland') {
    for (let layer = 0; layer < 4; layer++) {
      const points = Array.from({ length: 12 }, (_, n) => `${n * 90 - 45},${500 + layer * 140 - ((n * 113 + shift + layer * 63) % 260)}`).join(' ');
      art += `<polygon points="-80,1400 ${points} 980,1400" fill="${color}" opacity="${0.28 + layer * 0.15}"/>`;
    }
    if (category === 'Overland') {
      art += `<path d="M${350 + shift},680 Q100,950 600,1400" fill="none" stroke="white" stroke-width="76"/><path d="M${350 + shift},680 Q100,950 600,1400" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="18 22"/>`;
      art += `<g transform="translate(${180 + shift},930)" fill="${color}"><rect width="190" height="85" rx="8"/><path d="M195,20 h55 l30,35 v30 h-85Z"/><circle cx="40" cy="90" r="18"/><circle cx="155" cy="90" r="18"/><circle cx="250" cy="90" r="18"/></g>`;
    }
  } else if (category === 'Maritime') {
    for (let n = 0; n < 10; n++) art += `<path d="M-100,${650 + n * 70} Q${180 + shift},${510 + n * 70} 480,${650 + n * 70} T1100,${650 + n * 70}" fill="none" stroke="${color}" stroke-width="${12 + n * 2}" opacity="${0.32 + n * 0.05}"/>`;
    art += `<g transform="translate(${90 + index * 15},${650 + index * 25})" fill="${color}"><path d="M0,95 H640 L580,175 H90Z"/><rect x="450" y="0" width="90" height="90" rx="4"/>${Array.from({length: 8}, (_, n) => `<rect x="${45 + n % 4 * 96}" y="${Math.floor(n / 4) * 44}" width="88" height="38" opacity="${0.45 + n * .05}"/>`).join('')}</g>`;
  } else if (category === 'Aviation') {
    for (let n = 0; n < 7; n++) art += `<ellipse cx="${(n * 233 + shift) % 1000}" cy="${650 + n * 92}" rx="290" ry="100" fill="${color}" opacity=".25"/>`;
    art += `<path d="M-40,1200 Q${100 + shift},250 950,480" fill="none" stroke="${color}" opacity=".78" stroke-width="3" stroke-dasharray="12 15"/><g transform="translate(${300 + index * 24},${560 + index * 36}) rotate(${-30 + index * 9})" fill="${color}"><path d="M0,-180 Q18,-175 18,-125 L24,-25 155,70 155,95 22,45 16,130 60,165 60,180 0,158 -60,180 -60,165 -16,130 -22,45 -155,95 -155,70 -24,-25 -18,-125 Q-18,-175 0,-180Z"/></g>`;
  } else {
    for (let n = 0; n < 16; n++) art += index % 2 === 0
      ? `<ellipse cx="${720 - shift}" cy="${1000 + shift}" rx="${100 + n * 42}" ry="${150 + n * 50}" fill="none" stroke="${color}" stroke-width="3" opacity=".68" transform="rotate(${index * 12} 450 700)"/>`
      : `<path d="M${n * 80 - 150},1400 Q${850 - shift},${600 + n * 20} ${n * 95},0" fill="none" stroke="${color}" stroke-width="3" opacity=".64"/>`;
  }
  const slug = label.toLowerCase().replaceAll(' ', '-');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1400"><title>${label}</title><defs><linearGradient id="wash" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${color}" stop-opacity=".30"/></linearGradient></defs><rect width="900" height="1400" fill="url(#wash)"/><circle cx="${650 - shift}" cy="${240 + index * 20}" r="${70 + index * 8}" fill="${color}" opacity=".32"/>${art}</svg>`;
  fs.writeFileSync(path.join(directory, `${slug}.svg`), svg);
  const url = label === 'Global Flight'
    ? '/images/document-backgrounds/global-flight-premium.png'
    : `/images/document-backgrounds/${slug}.svg`;
  presets.push({ label, category, url, opacity: label === 'Global Flight' ? 0.22 : 0.18 });
});
fs.writeFileSync(path.join(__dirname, '../lib/document-backgrounds.json'), JSON.stringify(presets, null, 2) + '\n');
console.log(`Created ${presets.length} local document backgrounds.`);
