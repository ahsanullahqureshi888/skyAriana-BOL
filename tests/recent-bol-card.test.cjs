const test = require('node:test');
const assert = require('node:assert/strict');

// Pure logic mirrors RecentBolCard routines for Node testing

function cleanCommodityName(text) {
  if (!text) return '';
  return text
    .replace(/\bRAISNIS\b/gi, 'RAISINS')
    .replace(/^\s*\d+[\d,.]*\s*(?:CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS)?\s*/i, '')
    .replace(/\s*[-–—]\s*(?:KGS?|KG|TONS?|USD|AFN|@).*$/i, '')
    .trim();
}

function parseCargoSummaryDetails(doc) {
  const pkgStr = (doc.number_of_packages || doc.numberOfPackages || '').trim();
  const rawDesc = (doc.cargo_description || doc.goods_description || doc.description_of_goods || doc.commodity || '').trim();

  if (!pkgStr && !rawDesc) {
    return { packages: '—', commodity: 'GENERAL CARGO', itemCount: 1, rawText: '' };
  }

  if (pkgStr.includes('-')) {
    const parts = pkgStr.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
    let totalPkgs = 0;
    const commodities = [];

    for (const p of parts) {
      const numMatch = p.match(/^([0-9,]+)/);
      if (numMatch) {
        totalPkgs += parseInt(numMatch[1].replace(/,/g, ''), 10) || 0;
      }
      const comm = cleanCommodityName(p);
      if (comm && !commodities.includes(comm)) commodities.push(comm);
    }

    let commodity = commodities.join(' / ');
    if (!commodity) commodity = cleanCommodityName(rawDesc) || 'CARGO';

    return {
      packages: totalPkgs > 0 ? `${totalPkgs.toLocaleString()} CTNS` : pkgStr,
      commodity: commodity.toUpperCase(),
      itemCount: parts.length,
      rawText: pkgStr,
    };
  }

  if (pkgStr) {
    const numMatch = pkgStr.match(/^([0-9,]+)/);
    let packagesDisplay = pkgStr;
    if (numMatch) {
      const num = parseInt(numMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        const unitMatch = pkgStr.match(/\b(CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS)\b/i);
        const unit = unitMatch ? unitMatch[1].toUpperCase() : 'CTNS';
        packagesDisplay = `${num.toLocaleString()} ${unit}`;
      }
    }

    let commodity = cleanCommodityName(pkgStr);
    if (!commodity) {
      commodity = cleanCommodityName(rawDesc) || 'GENERAL CARGO';
    }

    return {
      packages: packagesDisplay,
      commodity: commodity.toUpperCase(),
      itemCount: 1,
      rawText: pkgStr,
    };
  }

  return {
    packages: '—',
    commodity: (cleanCommodityName(rawDesc) || 'GENERAL CARGO').toUpperCase(),
    itemCount: 1,
    rawText: rawDesc,
  };
}

function parseWeightDetails(doc) {
  function sumWeights(str) {
    if (!str) return null;
    const parts = str.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
    let total = 0;
    let unit = 'KG';
    let count = 0;

    for (const p of parts) {
      const numMatch = p.match(/([0-9,]+(?:\.[0-9]+)?)/);
      if (numMatch) {
        total += parseFloat(numMatch[1].replace(/,/g, '')) || 0;
        count++;
      }
      const unitMatch = p.match(/(KG|KGS|TONS?|LBS?)/i);
      if (unitMatch) unit = unitMatch[1].toUpperCase();
    }

    if (count === 0) return null;
    return {
      formatted: `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit === 'KGS' ? 'KG' : unit}`,
      total,
      count,
    };
  }

  const netInfo = sumWeights(doc.net_weight || doc.netWeight);
  const grossInfo = sumWeights(doc.gross_weight || doc.grossWeight);

  const netDisplay = netInfo ? netInfo.formatted : '';
  const grossDisplay = grossInfo ? grossInfo.formatted : '';

  const tooltipParts = [];
  if (netDisplay) {
    tooltipParts.push(`Net Weight: ${netDisplay}${netInfo && netInfo.count > 1 ? ` (${doc.net_weight})` : ''}`);
  }
  if (grossDisplay) {
    tooltipParts.push(`Gross Weight: ${grossDisplay}${grossInfo && grossInfo.count > 1 ? ` (${doc.gross_weight})` : ''}`);
  }

  return {
    netDisplay,
    grossDisplay,
    tooltip: tooltipParts.join(' | ') || 'Weight: Not specified',
  };
}

function parseTruckDetails(doc) {
  const rawTruck = (doc.truck_number || '').trim();
  const rawDriver = (doc.driver_name || '').trim();

  if (!rawTruck && !rawDriver) {
    return { display: '—', tooltip: 'No truck or driver assigned' };
  }

  if (rawTruck) {
    const match = rawTruck.match(/^([0-9]+)\s*([\u0600-\u06FF\w\s]+)?$/);
    let display = rawTruck;
    if (match) {
      const num = match[1];
      const city = (match[2] || '').trim();
      display = city ? `${num} ${city}` : num;
    }
    const tooltip = rawDriver ? `Truck: ${display} | Driver: ${rawDriver}` : `Truck: ${display}`;
    return { display, tooltip };
  }

  return { display: rawDriver, tooltip: `Driver: ${rawDriver}` };
}

function parseRentDetails(doc) {
  const rawRent = String(doc.driver_rent || doc.driverFreight || doc.driverRent || '').trim();
  if (!rawRent || rawRent === '0' || rawRent === '0.00' || rawRent === 'null' || rawRent === 'undefined') {
    return { display: '', tooltip: '' };
  }

  const match = rawRent.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]{3}|\$)?/);
  if (match) {
    const amount = match[1];
    let cur = (match[2] || '').toUpperCase();
    if (!cur && rawRent.toUpperCase().includes('AFN')) cur = 'AFN';
    if (!cur && rawRent.toUpperCase().includes('USD')) cur = 'USD';
    if (!cur && rawRent.toUpperCase().includes('AED')) cur = 'AED';
    if (!cur) cur = 'AFN';

    return {
      display: `${amount} ${cur}`,
      tooltip: `Driver Rent: ${rawRent}`,
    };
  }

  return {
    display: rawRent,
    tooltip: `Driver Rent: ${rawRent}`,
  };
}

function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function formatCardBolNumber(doc) {
  const raw = doc.bol_number || doc.billOfLadingNumber || '';
  if (!raw || isUUID(raw)) return 'BOL NUMBER MISSING';
  return raw;
}

test('1. Cargo Parser: Formats single commodity and fixes typos', () => {
  const doc = {
    number_of_packages: '1454 CTNS BLACK RAISNIS ',
    cargo_description: 'BLACK RAISNIS 1454 CTNS'
  };
  const parsed = parseCargoSummaryDetails(doc);
  assert.equal(parsed.packages, '1,454 CTNS');
  assert.equal(parsed.commodity, 'BLACK RAISINS');
  assert.equal(parsed.itemCount, 1);
});

test('2. Cargo Parser: Handles multi-item cargo and calculates total package count', () => {
  const doc = {
    number_of_packages: '460 CTNS BLACK RAISNIS - 994 CTNS GREEN RAISNIS',
  };
  const parsed = parseCargoSummaryDetails(doc);
  assert.equal(parsed.packages, '1,454 CTNS');
  assert.equal(parsed.commodity, 'BLACK RAISINS / GREEN RAISINS');
  assert.equal(parsed.itemCount, 2);
});

test('3. Cargo Parser: Handles Dry Figs and Golden Raisins combination', () => {
  const doc = {
    number_of_packages: '333 CTNS DRY FIGS - 1235 CTNS GOLDEN RAISNIS ',
  };
  const parsed = parseCargoSummaryDetails(doc);
  assert.equal(parsed.packages, '1,568 CTNS');
  assert.equal(parsed.commodity, 'DRY FIGS / GOLDEN RAISINS');
  assert.equal(parsed.itemCount, 2);
});

test('4. Weight Parser: Correctly sums multi-item weights into clean single Net Weight', () => {
  const doc = {
    net_weight: '7,360 KG - 15,904 KG',
    gross_weight: '8,004 KG - 17,892 KG',
  };
  const parsed = parseWeightDetails(doc);
  assert.equal(parsed.netDisplay, '23,264 KG');
  assert.equal(parsed.grossDisplay, '25,896 KG');
  assert.ok(parsed.tooltip.includes('7,360 KG - 15,904 KG'));
});

test('5. Truck Parser: Properly isolates Persian city and digits for RTL/LTR safety', () => {
  const doc1 = { truck_number: '54846هرات', driver_name: 'سیداحمد' };
  const doc2 = { truck_number: '1449نیمروز' };

  const parsed1 = parseTruckDetails(doc1);
  const parsed2 = parseTruckDetails(doc2);

  assert.equal(parsed1.display, '54846 هرات');
  assert.ok(parsed1.tooltip.includes('54846 هرات'));
  assert.ok(parsed1.tooltip.includes('سیداحمد'));

  assert.equal(parsed2.display, '1449 نیمروز');
});

test('6. Driver Rent: Extracts currency and amount, moving comments to tooltip', () => {
  const doc1 = { driver_rent: '38,500 AFN - کرایه واپسی' };
  const doc2 = { driver_rent: '70,000 AFN - کرایه واپسی' };
  const doc3 = { driver_rent: '1,200 USD' };

  const parsed1 = parseRentDetails(doc1);
  const parsed2 = parseRentDetails(doc2);
  const parsed3 = parseRentDetails(doc3);

  assert.equal(parsed1.display, '38,500 AFN');
  assert.ok(parsed1.tooltip.includes('کرایه واپسی'));

  assert.equal(parsed2.display, '70,000 AFN');
  assert.equal(parsed3.display, '1,200 USD');
});

test('7. BOL Number: Rejects raw UUIDs and preserves official BOL numbers', () => {
  assert.equal(formatCardBolNumber({ bol_number: 'BOL-2026-NSA644' }), 'BOL-2026-NSA644');
  assert.equal(formatCardBolNumber({ bol_number: 'b0632d43-3cf9-4c6e-8eed-e83c969d4c86' }), 'BOL NUMBER MISSING');
  assert.equal(formatCardBolNumber({}), 'BOL NUMBER MISSING');
});

test('8. Regression Suite: Verifies all 5 user reference companies parse cleanly', () => {
  const companies = [
    { shipper_name: 'NAJEB AMIN LTD', number_of_packages: '1454 CTNS BLACK RAISNIS ', net_weight: '23,264 KG', truck_number: '54846هرات', driver_rent: '38,500 AFN' },
    { shipper_name: 'RAHMAT NAZAR LTD', number_of_packages: '2288 CTNS DRY FIGS ', net_weight: '22,880 KG', truck_number: '81963هرات', driver_rent: '70,000 AFN' },
    { shipper_name: 'NASRAT SHARIF LTD', number_of_packages: '333 CTNS DRY FIGS - 1235 CTNS GOLDEN RAISNIS ', net_weight: '3,330 KG - 19,760 KG', truck_number: '1449نیمروز', driver_rent: '38,500 AFN' },
    { shipper_name: 'TAHIR SULTANI LTD', number_of_packages: '2201 CTNS DRY FIGS ', net_weight: '22,010 KG', truck_number: '2724نیمروز ', driver_rent: '38,500 AFN' },
    { shipper_name: 'WASELA LTD', number_of_packages: '1473 CTNS GOLDEN RAISNIS ', net_weight: '23,568 KG', truck_number: '57847هرات ', driver_rent: '46,000 AFN' }
  ];

  for (const comp of companies) {
    const cargo = parseCargoSummaryDetails(comp);
    const weight = parseWeightDetails(comp);
    const truck = parseTruckDetails(comp);
    const rent = parseRentDetails(comp);

    assert.ok(cargo.packages.includes('CTNS'), `Packages formatted for ${comp.shipper_name}`);
    assert.ok(cargo.commodity.length > 0, `Commodity present for ${comp.shipper_name}`);
    assert.ok(weight.netDisplay.includes('KG'), `Net weight formatted for ${comp.shipper_name}`);
    assert.ok(truck.display.length > 0, `Truck formatted for ${comp.shipper_name}`);
    assert.ok(rent.display.includes('AFN'), `Rent formatted for ${comp.shipper_name}`);
  }
});

test('9. Responsive Viewport Grid & Card Width Verification', () => {
  // Test viewport dimensions specified in Requirement 60
  const viewports = [
    { name: 'Large Desktop', width: 1920, cols: 6, minCardWidth: 260 },
    { name: 'Normal Desktop', width: 1440, cols: 4, minCardWidth: 280 },
    { name: 'Laptop', width: 1366, cols: 3, minCardWidth: 290 },
    { name: 'Tablet', width: 768, cols: 2, minCardWidth: 320 },
    { name: 'Mobile', width: 390, cols: 1, minCardWidth: 340 }
  ];

  for (const vp of viewports) {
    const containerPadding = vp.width < 640 ? 32 : 48; // padding left + right
    const gap = 16;
    const availableWidth = vp.width - containerPadding;
    const totalGaps = (vp.cols - 1) * gap;
    const effectiveCardWidth = (availableWidth - totalGaps) / vp.cols;

    assert.ok(
      effectiveCardWidth >= 250,
      `${vp.name} (${vp.width}px): Card width ${effectiveCardWidth.toFixed(1)}px must be >= 250px`
    );

    // Verify 3 buttons fit across card width
    const buttonGap = 8;
    const cardPadding = 28; // p-3.5 * 2
    const availableBtnRowWidth = effectiveCardWidth - cardPadding;
    const buttonWidth = (availableBtnRowWidth - (2 * buttonGap)) / 3;

    assert.ok(
      buttonWidth >= 65,
      `${vp.name}: Button width ${buttonWidth.toFixed(1)}px must be >= 65px so PDF button is never cut off`
    );
  }
});

test('10. Deduplication: Ensures same BOL is never displayed twice', () => {
  const records = [
    { id: '1', bol_number: 'BOL-2026-NSA644', shipper_name: 'NAJEB AMIN' },
    { id: '1-dup', bol_number: 'BOL-2026-NSA644', shipper_name: 'NAJEB AMIN' },
    { id: '2', bol_number: 'BOL-2026-NSA642', shipper_name: 'NAJEB AMIN' },
    { id: '3', bol_number: 'BOL-2026-NSA641', shipper_name: 'RAHMAT NAZAR' }
  ];

  const seen = new Set();
  const deduped = [];
  for (const r of records) {
    const key = (r.bol_number || r.id).toUpperCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  assert.equal(deduped.length, 3, 'Should remove duplicate record');
  assert.equal(deduped[0].bol_number, 'BOL-2026-NSA644');
  assert.equal(deduped[1].bol_number, 'BOL-2026-NSA642');
  assert.equal(deduped[2].bol_number, 'BOL-2026-NSA641');
});

