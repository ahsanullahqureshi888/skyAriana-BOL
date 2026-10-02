const test = require('node:test');
const assert = require('node:assert/strict');

// Import the parser utilities or replicate the exact pure functions used in SavedBOLReport
function cleanCargoLine(line) {
  return line.replace(/^[-•*•·]+\s*/, '').trim();
}

function extractCargoItemList(doc) {
  const rawDesc = (doc && (doc.cargo_description || doc.description_of_goods)) || '';
  if (!rawDesc) {
    const rawComm = (doc && doc.commodity) || '';
    return rawComm ? [rawComm] : [];
  }

  const lines = rawDesc
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanLines = lines.filter((l) => {
    const upper = l.toUpperCase();
    if (upper.includes('CONTAINER & CARGO') || upper.includes('CARGO PARTICULARS')) return false;
    if (upper.startsWith('TRANSIT DATE:') || upper.startsWith('BORDER:')) return false;
    if (upper.startsWith('HS CODE:') || upper.startsWith('H.S CODE:')) return false;
    if (upper.startsWith('INVOICE NO:') || upper.startsWith('INV NO:')) return false;
    if (upper.startsWith('TRUCK NO:') || upper.startsWith('DRIVER:')) return false;
    if (upper.startsWith('CARRIER:') || upper.startsWith('VESSEL:')) return false;
    return true;
  });

  const parsedItems = [];
  for (const line of cleanLines) {
    if (line.includes(' - ') && /\d+\s*(?:CTNS|BAGS|PKGS|CARTONS|BOXES|PCS|KGS)/i.test(line)) {
      const parts = line.split(/\s*-\s*/);
      for (const p of parts) {
        const cleaned = cleanCargoLine(p);
        if (cleaned) parsedItems.push(cleaned);
      }
    } else {
      const cleaned = cleanCargoLine(line);
      if (cleaned) parsedItems.push(cleaned);
    }
  }

  if (parsedItems.length > 0) return parsedItems;

  const rawComm = (doc && doc.commodity) || '';
  return rawComm ? [rawComm] : ['-'];
}

test('Saved BOL Report: extracts clean commodity lines and strips boilerplate headers', () => {
  const testDoc = {
    cargo_description: `📦 CONTAINER & CARGO PARTICULARS:
305 CTNS GREEN RAISINS - 603 CTNS BLACK RAISINS - 563 CTNS RED RAISINS
Transit Date: 2026-03-15
HS Code: 08062000
Invoice NO: INV-014`,
    commodity: 'RAISINS'
  };

  const items = extractCargoItemList(testDoc);
  assert.equal(items.length, 3, 'Should extract exactly 3 commodity lines');
  assert.equal(items[0], '305 CTNS GREEN RAISINS');
  assert.equal(items[1], '603 CTNS BLACK RAISINS');
  assert.equal(items[2], '563 CTNS RED RAISINS');
  assert.ok(!items.some(i => i.includes('CONTAINER & CARGO PARTICULARS')), 'Boilerplate must never appear in cargo items');
  assert.ok(!items.some(i => i.includes('Transit Date:')), 'Metadata headers must never appear in cargo items');
});

test('Saved BOL Report: handles multi-line cargo descriptions without collapsing into single dropdown button', () => {
  const testDoc = {
    cargo_description: `1471 CTNS GOLDEN RAISINS
529 CTNS GREEN RAISINS
Gross Wt: 36,000 KGS`,
    commodity: 'GOLDEN RAISINS'
  };

  const items = extractCargoItemList(testDoc);
  assert.equal(items.length, 3);
  assert.equal(items[0], '1471 CTNS GOLDEN RAISINS');
  assert.equal(items[1], '529 CTNS GREEN RAISINS');
  assert.equal(items[2], 'Gross Wt: 36,000 KGS');
});

test('Saved BOL Report: fallback to commodity when cargo_description is empty', () => {
  const testDoc = {
    cargo_description: '',
    commodity: 'DRIED FIGS'
  };

  const items = extractCargoItemList(testDoc);
  assert.deepEqual(items, ['DRIED FIGS']);
});
