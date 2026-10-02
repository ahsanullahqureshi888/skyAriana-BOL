const fs = require('fs');
const path = require('path');
const bg = require('../lib/document-backgrounds.json');

const classic = [
  'mountain-watermark-premium.png',
  'afghan_mountain_blueprint_bg.jpg',
  'overland_transit_blueprint.svg',
  'maritime_shipping_blueprint.svg',
  'air_cargo_blueprint.svg',
  'sky_freight_cargo_plane.jpg',
  'afghan_cargo_fleet_pass.jpg',
  'maritime_port_cargo_ship.jpg'
];

console.log('--- Classic Assets Audit ---');
for (const f of classic) {
  const p = path.join(__dirname, '..', 'public', 'images', f);
  const exists = fs.existsSync(p);
  const stat = exists ? fs.statSync(p) : null;
  console.log(`[${exists ? 'PASS' : 'FAIL'}] ${f} (${stat ? (stat.size / 1024).toFixed(1) + ' KB' : 'MISSING'})`);
}

console.log('\n--- Library Backgrounds Audit (40 SVGs) ---');
let errors = 0;
for (const item of bg) {
  const rel = item.url.replace(/^\//, '');
  const p = path.join(__dirname, '..', 'public', rel.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) {
    console.error(`[FAIL - MISSING] ${item.label} (${p})`);
    errors++;
    continue;
  }
  const stat = fs.statSync(p);
  if (stat.size === 0) {
    console.error(`[FAIL - EMPTY] ${item.label}`);
    errors++;
    continue;
  }
  if (p.endsWith('.svg')) {
    const text = fs.readFileSync(p, 'utf8');
    const vb = text.match(/viewBox=["']([^"']+)["']/);
    const hasSvgTag = text.includes('<svg') && text.includes('</svg>');
    if (!hasSvgTag) {
      console.error(`[FAIL - MALFORMED SVG] ${item.label}`);
      errors++;
    } else if (!vb) {
      console.warn(`[WARN - NO VIEWBOX] ${item.label}`);
    }
  }
}

console.log(`\nAudit complete: ${errors} errors found out of ${bg.length + classic.length} assets.`);
