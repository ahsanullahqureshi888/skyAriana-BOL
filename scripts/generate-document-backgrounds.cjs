const fs = require('node:fs');
const path = require('node:path');

// High-Fidelity Vector Security Watermarks for Sky Ariana Logistics Bills of Lading & Waybills
// 100% self-contained, offline vector SVGs with mathematical spirographs, topographic contours,
// 32-point nautical compass roses, 3D orthographic globe graticules, and great-circle flight arcs.

const groups = {
  Mountains: [
    'Alpine Dawn',
    'Glacier Valley',
    'Snow Ridge',
    'Highland Lake',
    'Golden Summit',
    'Silent Peaks',
    'Mountain Mist',
    'Twilight Range',
  ],
  Overland: [
    'Silk Road',
    'Desert Highway',
    'Border Crossing',
    'Valley Transit',
    'Cargo Convoy',
    'Rail Corridor',
    'Winding Pass',
    'Horizon Route',
  ],
  Maritime: [
    'Ocean Passage',
    'Harbor Morning',
    'Coastal Freight',
    'Container Port',
    'Lighthouse Bay',
    'Island Channel',
    'Deep Blue',
    'Sunset Anchorage',
  ],
  Aviation: [
    'Cloud Atlas',
    'Flight Corridor',
    'Sky Express',
    'Dawn Departure',
    'Air Bridge',
    'Above the Clouds',
    'Global Flight',
    'Evening Arrival',
  ],
  Geometric: [
    'Compass Lines',
    'Contour Map',
    'Trade Network',
    'Meridian Grid',
    'Soft Arches',
    'Route Geometry',
    'Pearl Waves',
    'Northern Star',
  ],
};

// Refined security ink color palettes
const palettes = {
  Mountains: ['#1e3a8a', '#0f766e', '#1e40af', '#0369a1', '#b45309', '#334155', '#4338ca', '#374151'],
  Overland: ['#78350f', '#92400e', '#065f46', '#1e3a8a', '#334155', '#047857', '#854d0e', '#1e293b'],
  Maritime: ['#0f2942', '#0369a1', '#1e3a8a', '#0284c7', '#0f766e', '#172554', '#1d4ed8', '#1e293b'],
  Aviation: ['#1d4ed8', '#0284c7', '#2563eb', '#0369a1', '#4338ca', '#3b82f6', '#1e40af', '#1e293b'],
  Geometric: ['#1e3a8a', '#065f46', '#334155', '#78350f', '#1d4ed8', '#4338ca', '#0f766e', '#1e293b'],
};

// --- Mathematical Artwork Generators ---

// 1. Banknote Guilloche Rosette (Hypotrochoid / Epitrochoid)
function generateGuillochePath(cx, cy, R, r, p, revolutions = 1, phase = 0) {
  const points = [];
  const totalSteps = 720 * revolutions;
  for (let i = 0; i <= totalSteps; i++) {
    const theta = (i / 720) * 2 * Math.PI + phase;
    const k = (R - r) / r;
    const x = cx + (R - r) * Math.cos(theta) + p * Math.cos(k * theta);
    const y = cy + (R - r) * Math.sin(theta) - p * Math.sin(k * theta);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ') + 'Z';
}

// 2. Corner Guilloche Rosette
function generateCornerRosette(cx, cy, radius, color, opacity) {
  let s = `<g transform="translate(${cx},${cy})">`;
  s += `<circle cx="0" cy="0" r="${radius}" fill="none" stroke="${color}" stroke-width="0.8" opacity="${opacity}" />`;
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const px = (radius * 0.5) * Math.cos(angle);
    const py = (radius * 0.5) * Math.sin(angle);
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(radius * 0.5).toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.6" opacity="${(opacity * 0.7).toFixed(2)}" />`;
  }
  s += `</g>`;
  return s;
}

// 3. 32-Point Nautical Compass Rose
function generateCompassRose(cx, cy, radius, color, index) {
  let s = `<g transform="translate(${cx},${cy})">`;
  // Concentric dials
  s += `<circle cx="0" cy="0" r="${radius * 1.05}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.6" />`;
  s += `<circle cx="0" cy="0" r="${radius * 0.98}" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.4" stroke-dasharray="3 3" />`;
  s += `<circle cx="0" cy="0" r="${radius * 0.6}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.5" />`;
  s += `<circle cx="0" cy="0" r="${radius * 0.25}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.6" />`;

  // Degree ticks every 10 degrees
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const len = deg % 30 === 0 ? 12 : 6;
    const x1 = (radius * 1.05) * Math.cos(rad);
    const y1 = (radius * 1.05) * Math.sin(rad);
    const x2 = (radius * 1.05 - len) * Math.cos(rad);
    const y2 = (radius * 1.05 - len) * Math.sin(rad);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${deg % 30 === 0 ? 1 : 0.6}" opacity="0.6" />`;
  }

  // 16 Primary and secondary points with faceted shading
  const points = [
    { deg: 0, len: radius * 0.95, w: 14 },
    { deg: 45, len: radius * 0.75, w: 11 },
    { deg: 90, len: radius * 0.95, w: 14 },
    { deg: 135, len: radius * 0.75, w: 11 },
    { deg: 180, len: radius * 0.95, w: 14 },
    { deg: 225, len: radius * 0.75, w: 11 },
    { deg: 270, len: radius * 0.95, w: 14 },
    { deg: 315, len: radius * 0.75, w: 11 },
  ];

  // Tertiary points
  for (let deg = 22.5; deg < 360; deg += 45) {
    points.push({ deg, len: radius * 0.55, w: 7 });
  }

  for (const pt of points) {
    const rad = ((pt.deg - 90) * Math.PI) / 180;
    const radLeft = ((pt.deg - 90 - 90) * Math.PI) / 180;
    const radRight = ((pt.deg - 90 + 90) * Math.PI) / 180;

    const tipX = pt.len * Math.cos(rad);
    const tipY = pt.len * Math.sin(rad);
    const baseX1 = (pt.w * 0.5) * Math.cos(radLeft);
    const baseY1 = (pt.w * 0.5) * Math.sin(radLeft);
    const baseX2 = (pt.w * 0.5) * Math.cos(radRight);
    const baseY2 = (pt.w * 0.5) * Math.sin(radRight);

    // Dark facet
    s += `<polygon points="0,0 ${baseX1.toFixed(1)},${baseY1.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)}" fill="${color}" opacity="0.45" />`;
    // Light facet
    s += `<polygon points="0,0 ${baseX2.toFixed(1)},${baseY2.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.6" />`;
  }

  // Cardinal letters
  const cardinals = [
    { label: 'N', x: 0, y: -radius * 1.12 },
    { label: 'E', x: radius * 1.12, y: 4 },
    { label: 'S', x: 0, y: radius * 1.16 },
    { label: 'W', x: -radius * 1.12, y: 4 },
  ];
  for (const c of cardinals) {
    s += `<text x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="${color}" opacity="0.8" text-anchor="middle" dominant-baseline="middle">${c.label}</text>`;
  }

  // Rhumb lines extending outward
  for (let a = 0; a < 360; a += 45) {
    const r = (a * Math.PI) / 180;
    const x2 = 650 * Math.cos(r);
    const y2 = 650 * Math.sin(r);
    s += `<line x1="0" y1="0" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="0.6" stroke-dasharray="8 12" opacity="0.3" />`;
  }

  // Central pivot pin
  s += `<circle cx="0" cy="0" r="5" fill="${color}" opacity="0.8" />`;
  s += `<circle cx="0" cy="0" r="2" fill="#ffffff" />`;
  s += `</g>`;
  return s;
}

// 4. Container Ship Vector Profile
function generateContainerShip(x, y, scale, color) {
  let containers = '';
  for (let col = 0; col < 9; col++) {
    const cx = -180 + col * 38;
    const h1 = 28;
    const h2 = col % 2 === 0 ? 54 : 42;
    containers += `<rect x="${cx}" y="${10 - h1}" width="34" height="${h1}" rx="1" />`;
    containers += `<rect x="${cx}" y="${10 - h2}" width="34" height="${h2 - h1}" rx="1" />`;
    containers += `<line x1="${cx + 17}" y1="${10 - h2}" x2="${cx + 17}" y2="10" stroke-width="0.5" stroke-dasharray="2 2" />`;
  }

  return `
    <g transform="translate(${x},${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.75">
      <!-- Waterline & Bulbous Bow -->
      <path d="M-220,50 L200,50 L250,50 C270,50 285,42 290,30 L270,10 L-220,10 Z" fill="${color}" fill-opacity="0.15" />
      <path d="M-220,50 C-230,50 -240,40 -245,20 L-235,10" />
      <line x1="-250" y1="52" x2="310" y2="52" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.5" />
      <!-- Container Stacks Tier 1 to 4 -->
      <g fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="0.8">
        ${containers}
      </g>
      <!-- Bridge & Superstructure -->
      <g fill="${color}" fill-opacity="0.25">
        <rect x="170" y="-55" width="45" height="65" rx="2" />
        <rect x="165" y="-68" width="55" height="13" rx="1" />
        <rect x="175" y="-95" width="22" height="27" rx="1" />
        <!-- Radar Mast -->
        <line x1="186" y1="-95" x2="186" y2="-125" stroke-width="1.5" />
        <line x1="176" y1="-115" x2="196" y2="-115" stroke-width="1.2" />
        <line x1="180" y1="-122" x2="192" y2="-122" stroke-width="1" />
        <circle cx="186" cy="-127" r="2.5" fill="${color}" />
        <!-- Exhaust Funnel -->
        <path d="M198,-90 L212,-90 L210,-60 L198,-60 Z" />
      </g>
      <!-- Cranes & Gantry Line Art -->
      <path d="M-80,-20 L-60,-55 L-40,-20" stroke-width="0.8" />
      <path d="M80,-20 L100,-55 L120,-20" stroke-width="0.8" />
    </g>
  `;
}

// 5. 3D Orthographic Globe Wireframe
function generateGlobeGraticule(cx, cy, radius, color) {
  let s = `<g transform="translate(${cx},${cy})">`;
  // Outer perimeter & horizon ring
  s += `<circle cx="0" cy="0" r="${radius}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.7" />`;
  s += `<circle cx="0" cy="0" r="${radius + 12}" fill="none" stroke="${color}" stroke-width="0.6" stroke-dasharray="4 6" opacity="0.4" />`;

  // Latitude parallels (ellipses)
  const lats = [0.25, 0.5, 0.72, 0.88];
  for (const lat of lats) {
    const ry = radius * Math.sin(Math.acos(lat));
    const h = radius * lat;
    s += `<ellipse cx="0" cy="${h.toFixed(1)}" rx="${ry.toFixed(1)}" ry="${(ry * 0.32).toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.45" stroke-dasharray="5 4" />`;
    s += `<ellipse cx="0" cy="${(-h).toFixed(1)}" rx="${ry.toFixed(1)}" ry="${(ry * 0.32).toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.45" stroke-dasharray="5 4" />`;
  }
  // Equator
  s += `<ellipse cx="0" cy="0" rx="${radius}" ry="${(radius * 0.32).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.65" />`;

  // Longitude meridians (vertical ellipses)
  const lons = [0.22, 0.45, 0.68, 0.88];
  for (const lon of lons) {
    const rx = radius * lon;
    s += `<ellipse cx="0" cy="0" rx="${rx.toFixed(1)}" ry="${radius}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.45" />`;
  }
  // Prime meridian line
  s += `<line x1="0" y1="${-radius}" x2="0" y2="${radius}" stroke="${color}" stroke-width="1.2" opacity="0.65" />`;

  // Airport waypoints across globe with Great-Circle Arcs
  const hubs = [
    { code: 'KBL', x: -20, y: -45 },
    { code: 'DXB', x: -80, y: 10 },
    { code: 'IST', x: -140, y: -70 },
    { code: 'FRA', x: -190, y: -110 },
    { code: 'DEL', x: 40, y: 25 },
    { code: 'URC', x: 75, y: -80 },
  ];

  for (let i = 0; i < hubs.length - 1; i++) {
    const h1 = hubs[i];
    const h2 = hubs[i + 1];
    const midX = (h1.x + h2.x) * 0.5;
    const midY = (h1.y + h2.y) * 0.5 - 35;
    s += `<path d="M${h1.x},${h1.y} Q${midX.toFixed(1)},${midY.toFixed(1)} ${h2.x},${h2.y}" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7" />`;
  }

  for (const h of hubs) {
    s += `<circle cx="${h.x}" cy="${h.y}" r="4" fill="${color}" opacity="0.8" />`;
    s += `<circle cx="${h.x}" cy="${h.y}" r="8" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.6" />`;
    s += `<text x="${h.x + 8}" y="${h.y - 6}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${color}" opacity="0.85">${h.code}</text>`;
  }

  s += `</g>`;
  return s;
}

// 6. Modern Cargo Aircraft Silhouette
function generateCargoAircraft(cx, cy, scale, angle, color) {
  return `
    <g transform="translate(${cx},${cy}) rotate(${angle}) scale(${scale})" fill="${color}" opacity="0.75">
      <!-- Fuselage -->
      <path d="M0,-160 C12,-155 16,-120 16,-60 L20,30 L135,110 L135,128 L20,70 L15,160 L50,195 L50,210 L0,190 L-50,210 L-50,195 L-15,160 L-20,70 L-135,128 L-135,110 L-20,30 L-16,-60 C-16,-120 -12,-155 0,-160 Z" />
      <!-- Turbofan Engine Nacelles -->
      <ellipse cx="65" cy="55" rx="8" ry="22" />
      <ellipse cx="-65" cy="55" rx="8" ry="22" />
      <!-- Cockpit Windows -->
      <path d="M-6,-135 L6,-135 L8,-128 L-8,-128 Z" fill="#ffffff" opacity="0.9" />
      <!-- Contrail Streamlines -->
      <path d="M-65,77 L-65,280" stroke="${color}" stroke-width="1.2" stroke-dasharray="6 8" opacity="0.4" fill="none" />
      <path d="M65,77 L65,280" stroke="${color}" stroke-width="1.2" stroke-dasharray="6 8" opacity="0.4" fill="none" />
      <!-- Navigation strobe beacon -->
      <circle cx="0" cy="-160" r="3" fill="${color}" opacity="0.9" />
    </g>
  `;
}

// 7. Topographic Mountain Elevation Contours
function generateTopoElevation(shift, color) {
  let s = `<g fill="none" stroke="${color}" stroke-linecap="round">`;
  const baseLines = [
    { y: 600, amp: 140, freq: 0.006, elev: '4,450 M' },
    { y: 680, amp: 160, freq: 0.005, elev: '3,820 M' },
    { y: 760, amp: 150, freq: 0.0065, elev: '3,200 M' },
    { y: 840, amp: 170, freq: 0.0055, elev: '2,650 M' },
    { y: 920, amp: 140, freq: 0.006, elev: '2,100 M' },
    { y: 1000, amp: 130, freq: 0.007, elev: '1,650 M' },
    { y: 1080, amp: 120, freq: 0.005, elev: '1,200 M' },
    { y: 1160, amp: 110, freq: 0.006, elev: '850 M' },
  ];

  baseLines.forEach((line, idx) => {
    const isIndex = idx % 2 === 0;
    const strokeWidth = isIndex ? '1.4' : '0.7';
    const opacity = isIndex ? '0.6' : '0.35';
    const dash = 'none';

    let pathD = `M -60,${line.y + Math.sin(shift * 0.05) * 30}`;
    const segments = 12;
    for (let seg = 1; seg <= segments; seg++) {
      const x = -60 + (seg * (1020 / segments));
      const wave = Math.sin((x + shift * 40) * line.freq) * line.amp + Math.cos((x * 0.5 + shift * 20) * line.freq * 1.5) * (line.amp * 0.4);
      const prevX = -60 + ((seg - 1) * (1020 / segments));
      const midX = (prevX + x) * 0.5;
      const y = line.y + wave;
      pathD += ` Q ${midX.toFixed(1)},${(y + (seg % 2 === 0 ? 25 : -25)).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    }

    s += `<path d="${pathD}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-dasharray="${dash}" />`;

    // Elevation label on index contours
    if (isIndex) {
      const labelX = 220 + ((idx * 160 + shift * 40) % 500);
      s += `<rect x="${labelX - 4}" y="${line.y - 18}" width="58" height="14" fill="#ffffff" opacity="0.8" rx="2" />`;
      s += `<text x="${labelX}" y="${line.y - 7}" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="${color}" opacity="0.8">${line.elev}</text>`;
    }
  });

  // Triangulation summit peaks with elevation markers
  const peaks = [
    { x: 320 + (shift % 100), y: 520, name: 'MT. PAMIR 4,450 M' },
    { x: 620 - (shift % 80), y: 480, name: 'HINDU KUSH 5,120 M' },
  ];
  for (const p of peaks) {
    s += `
      <g transform="translate(${p.x},${p.y})" opacity="0.75">
        <polygon points="0,-16 -12,8 12,8" fill="none" stroke="${color}" stroke-width="1.2" />
        <circle cx="0" cy="0" r="2.5" fill="${color}" />
        <text x="0" y="24" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="${color}" text-anchor="middle">${p.name}</text>
      </g>
    `;
  }

  s += `</g>`;
  return s;
}

// 8. Overland Silk Road Corridors & Waypoints
function generateSilkRoadTransit(shift, color) {
  let s = `<g stroke="${color}">`;
  // Highway corridor alignment curve
  s += `<path d="M-40,1150 Q${250 + shift},850 ${450 + shift},650 T940,320" fill="none" stroke-width="4" stroke-opacity="0.15" />`;
  s += `<path d="M-40,1150 Q${250 + shift},850 ${450 + shift},650 T940,320" fill="none" stroke-width="1.6" stroke-dasharray="10 8" stroke-opacity="0.75" />`;

  // Secondary rail corridor
  s += `<path d="M-40,1220 Q${200 + shift},920 ${490 + shift},730 T940,420" fill="none" stroke-width="1" stroke-dasharray="3 4" stroke-opacity="0.5" />`;

  // Major Customs & Border Waypoints
  const waypoints = [
    { name: 'TORGHUNDI BORDER STATION', code: 'TRG-01', x: 120 + shift, y: 1040 },
    { name: 'ISLAM QALA CUSTOMS TERMINAL', code: 'ISQ-02', x: 310 + shift, y: 840 },
    { name: 'SALANG HIGHWAY CORRIDOR', code: 'SLG-03', x: 520 + shift, y: 640 },
    { name: 'HAIRATAN DRY PORT HUB', code: 'HRT-04', x: 740 + shift, y: 460 },
  ];

  for (const wp of waypoints) {
    s += `
      <g transform="translate(${wp.x},${wp.y})">
        <circle cx="0" cy="0" r="14" fill="none" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.5" />
        <circle cx="0" cy="0" r="6" fill="${color}" fill-opacity="0.2" stroke-width="1.2" opacity="0.8" />
        <circle cx="0" cy="0" r="2.5" fill="${color}" opacity="0.9" />
        <rect x="18" y="-14" width="165" height="26" fill="#ffffff" fill-opacity="0.8" rx="3" stroke="${color}" stroke-width="0.6" opacity="0.6" />
        <text x="24" y="-2" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="${color}" opacity="0.9">${wp.name}</text>
        <text x="24" y="9" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="${color}" opacity="0.6">${wp.code} · INTERMODAL ROUTE</text>
      </g>
    `;
  }

  // Freight Convoy Silhouette at bottom
  s += `
    <g transform="translate(${160 + shift},1200)" fill="${color}" stroke="none" opacity="0.7">
      <!-- Tractor Cab -->
      <rect x="0" y="-38" width="55" height="38" rx="3" fill-opacity="0.3" />
      <path d="M35,-38 L55,-22 L55,0 L35,0 Z" fill-opacity="0.4" />
      <rect x="36" y="-34" width="14" height="12" rx="1" fill="#ffffff" fill-opacity="0.8" />
      <!-- Cargo Trailer -->
      <rect x="-180" y="-50" width="170" height="50" rx="3" fill-opacity="0.2" stroke="${color}" stroke-width="1" />
      <!-- Wheels -->
      <circle cx="-160" cy="4" r="10" fill="${color}" fill-opacity="0.8" />
      <circle cx="-135" cy="4" r="10" fill="${color}" fill-opacity="0.8" />
      <circle cx="-35" cy="4" r="10" fill="${color}" fill-opacity="0.8" />
      <circle cx="-10" cy="4" r="10" fill="${color}" fill-opacity="0.8" />
      <circle cx="40" cy="4" r="10" fill="${color}" fill-opacity="0.8" />
    </g>
  `;

  s += `</g>`;
  return s;
}

// Security Microline Border Framework
function generateSecurityFrame(color) {
  return `
    <g fill="none" stroke="${color}" opacity="0.45">
      <rect x="25" y="25" width="850" height="1350" rx="6" stroke-width="1.2" />
      <rect x="33" y="33" width="834" height="1334" rx="4" stroke-width="0.6" stroke-dasharray="4 3" />
      <!-- Corner Tick Brackets -->
      <path d="M20,50 L20,20 L50,20" stroke-width="1.5" />
      <path d="M880,50 L880,20 L850,20" stroke-width="1.5" />
      <path d="M20,1350 L20,1380 L50,1380" stroke-width="1.5" />
      <path d="M880,1350 L880,1380 L850,1380" stroke-width="1.5" />
      <!-- Micro-line Security Text -->
      <text x="450" y="21" font-family="Arial, sans-serif" font-size="7" font-weight="bold" letter-spacing="3" text-anchor="middle" fill="${color}" opacity="0.6">★ SKY ARIANA LOGISTICS · OFFICIAL MULTI-MODAL BILL OF LADING SECURITY SYSTEM ★</text>
      <text x="450" y="1390" font-family="Arial, sans-serif" font-size="7" font-weight="bold" letter-spacing="3" text-anchor="middle" fill="${color}" opacity="0.6">★ INTERNATIONAL LOGISTICS SECURITY WATERMARK · VERIFIED CARGO NETWORK ★</text>
    </g>
  `;
}

// --- Main Generation Loop ---

const directory = path.join(__dirname, '../public/images/document-backgrounds');
fs.mkdirSync(directory, { recursive: true });

const presets = [];

for (const [category, names] of Object.entries(groups)) {
  names.forEach((label, index) => {
    const color = palettes[category][index % palettes[category].length];
    const shift = index * 24;
    let art = '';

    // Standard Banknote Corner Rosettes for all official security backgrounds
    art += generateCornerRosette(80, 80, 40, color, 0.45);
    art += generateCornerRosette(820, 80, 40, color, 0.45);
    art += generateCornerRosette(80, 1320, 40, color, 0.45);
    art += generateCornerRosette(820, 1320, 40, color, 0.45);
    art += generateSecurityFrame(color);

    if (category === 'Geometric') {
      // Banknote Guilloche Rosettes & Spirograph Security Medallions
      const cx = 450;
      const cy = 700;

      // Concentric Moiré Rosettes
      art += `<path d="${generateGuillochePath(cx, cy, 240, 15, 120, 1, 0)}" fill="none" stroke="${color}" stroke-width="0.9" opacity="0.55" />`;
      art += `<path d="${generateGuillochePath(cx, cy, 240, 15, 120, 1, Math.PI / 16)}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.45" />`;
      art += `<path d="${generateGuillochePath(cx, cy, 180, 20, 80, 1, 0)}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.6" />`;
      art += `<path d="${generateGuillochePath(cx, cy, 120, 12, 50, 1, Math.PI / 10)}" fill="none" stroke="${color}" stroke-width="0.9" opacity="0.65" />`;

      // Central Security Star & Radial Sunburst
      art += `<g transform="translate(${cx},${cy})">`;
      art += `<circle cx="0" cy="0" r="55" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.7" />`;
      art += `<circle cx="0" cy="0" r="45" fill="none" stroke="${color}" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.5" />`;
      for (let ray = 0; ray < 32; ray++) {
        const rad = (ray * Math.PI) / 16;
        const x1 = 300 * Math.cos(rad);
        const y1 = 300 * Math.sin(rad);
        const x2 = 330 * Math.cos(rad);
        const y2 = 330 * Math.sin(rad);
        art += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="0.6" opacity="0.4" />`;
      }
      art += `</g>`;

      // Outer wave borders
      for (let n = 0; n < 4; n++) {
        const rad = 320 + n * 25;
        art += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${color}" stroke-width="0.6" opacity="${0.45 - n * 0.08}" stroke-dasharray="${n % 2 === 0 ? '6 4' : '3 6'}" />`;
      }

    } else if (category === 'Maritime') {
      // 32-Point Nautical Compass Rose & Ocean Navigational Graticules
      art += generateCompassRose(450, 620 + (index % 2) * 40, 175, color, index);
      // Container Ship profile in lower quadrant
      art += generateContainerShip(450, 1080, 0.85, color);
      // Bathymetric wave depth curves
      for (let w = 0; w < 5; w++) {
        const yWave = 1180 + w * 35;
        art += `<path d="M-40,${yWave} Q${220 + shift},${yWave - 20} ${450 + shift},${yWave} T940,${yWave}" fill="none" stroke="${color}" stroke-width="${1.2 - w * 0.15}" opacity="${0.5 - w * 0.06}" />`;
      }

    } else if (category === 'Aviation') {
      // 3D Orthographic Globe Wireframe & Geodesic Arcs
      art += generateGlobeGraticule(450, 640 + (index % 2) * 30, 230, color);
      // High-detail Cargo Freighter Aircraft
      art += generateCargoAircraft(450 + (index % 2 === 0 ? 30 : -30), 1040, 0.75, -20 + (index % 3) * 15, color);
      // Navigation radar rings at top right
      art += `<g transform="translate(720,240)">`;
      art += `<circle cx="0" cy="0" r="90" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.4" />`;
      art += `<circle cx="0" cy="0" r="60" fill="none" stroke="${color}" stroke-width="0.6" stroke-dasharray="3 3" opacity="0.35" />`;
      art += `<circle cx="0" cy="0" r="30" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.5" />`;
      art += `<line x1="-95" y1="0" x2="95" y2="0" stroke="${color}" stroke-width="0.6" opacity="0.4" />`;
      art += `<line x1="0" y1="-95" x2="0" y2="95" stroke="${color}" stroke-width="0.6" opacity="0.4" />`;
      art += `<path d="M0,0 L63,-63" stroke="${color}" stroke-width="1.2" opacity="0.6" />`;
      art += `</g>`;

    } else if (category === 'Overland') {
      // Silk Road Trade Corridors, Border Stations, & Topo Contours
      art += generateTopoElevation(shift, color);
      art += generateSilkRoadTransit(shift, color);

    } else if (category === 'Mountains') {
      // High-Altitude Alpine Peaks & Triangulation Topography
      art += generateTopoElevation(shift * 1.5, color);
      // Central mountain medallion rosette
      art += `<path d="${generateGuillochePath(450, 480, 160, 16, 70, 1, 0)}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.5" />`;
      // Alpine sunrise rays
      art += `<g transform="translate(450,480)" stroke="${color}" opacity="0.35">`;
      for (let ray = 0; ray < 24; ray++) {
        const rad = (ray * Math.PI) / 12;
        const x1 = 180 * Math.cos(rad);
        const y1 = 180 * Math.sin(rad);
        const x2 = 260 * Math.cos(rad);
        const y2 = 260 * Math.sin(rad);
        art += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="0.6" stroke-dasharray="4 6" />`;
      }
      art += `</g>`;
    }

    const slug = label.toLowerCase().replaceAll(' ', '-');
    // Pure vector SVG with transparent background (no wash rectangle that soils white document sheets)
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1400" width="100%" height="100%">
  <title>${label} — Sky Ariana Logistics Security Watermark</title>
  <defs>
    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Transparent Base: Preserves Pristine Document Paper Legibility -->
  ${art}
</svg>`;

    fs.writeFileSync(path.join(directory, `${slug}.svg`), svg);

    const url = label === 'Global Flight'
      ? '/images/document-backgrounds/global-flight-premium.png'
      : `/images/document-backgrounds/${slug}.svg`;

    // Recommended clean default opacities for crisp legibility
    const defaultOpacity = label === 'Global Flight' ? 0.20 : 0.14;

    presets.push({
      label,
      category,
      url,
      opacity: defaultOpacity,
    });
  });
}

fs.writeFileSync(
  path.join(__dirname, '../lib/document-backgrounds.json'),
  JSON.stringify(presets, null, 2) + '\n'
);

console.log(`Successfully generated ${presets.length} high-fidelity document security backgrounds.`);

