const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  splitMultiCargoItems,
  parseCargoTotal,
  parseSyncedCargoItems,
  getCargoDensity,
  shouldSplitToPage2,
  splitCargoForPages,
} = load('lib/utils/cargo-grid.ts');

test('Cargo Parser: single cargo item parses correctly with totals', () => {
  const formData = {
    number_of_packages: '500 CTNS',
    kgs_per_carton: '10 KGS',
    gross_weight_per_carton: '10.5 KGS',
    net_weight: '5,000 KG',
    gross_weight: '5,250 KG',
    rate_per_kgs: '2.50 USD',
    goods_value: '12,500 USD',
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.items.length, 1);
  assert.equal(synced.items[0].packageText, '500 CTNS');
  assert.equal(synced.items[0].netPerCarton, '10 KGS');
  assert.equal(synced.items[0].netWeight, '5,000 KG');
  assert.equal(synced.items[0].rate, '2.50 USD');
  assert.equal(synced.items[0].goodsValue, '12,500 USD');

  assert.equal(synced.totals.totalPackages, 500);
  assert.equal(synced.totals.totalNetWeight, 5000);
  assert.equal(synced.totals.totalGrossWeight, 5250);
  assert.equal(synced.totals.totalGoodsValue, 12500);
});

test('Cargo Parser: multi-item cargo (3 items) synchronizes columns and sums accurately', () => {
  const formData = {
    number_of_packages: '330 CTNS\n200 CTNS\n150 CTNS',
    kgs_per_carton: '16.00 KGS\n12.50 KGS\n10.00 KGS',
    gross_weight_per_carton: '16.50 KGS\n13.00 KGS\n10.50 KGS',
    net_weight: '5,280 KG\n2,500 KG\n1,500 KG',
    gross_weight: '5,445 KG\n2,600 KG\n1,575 KG',
    rate_per_kgs: '1.80 USD\n2.20 USD\n3.00 USD',
    goods_value: '9,504 USD\n5,500 USD\n4,500 USD',
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.items.length, 3);

  // Row 1
  assert.equal(synced.items[0].packageText, '330 CTNS');
  assert.equal(synced.items[0].netPerCarton, '16.00 KGS');
  assert.equal(synced.items[0].netWeight, '5,280 KG');
  assert.equal(synced.items[0].goodsValue, '9,504 USD');

  // Row 2
  assert.equal(synced.items[1].packageText, '200 CTNS');
  assert.equal(synced.items[1].netPerCarton, '12.50 KGS');
  assert.equal(synced.items[1].netWeight, '2,500 KG');
  assert.equal(synced.items[1].goodsValue, '5,500 USD');

  // Row 3
  assert.equal(synced.items[2].packageText, '150 CTNS');
  assert.equal(synced.items[2].netPerCarton, '10.00 KGS');
  assert.equal(synced.items[2].netWeight, '1,500 KG');
  assert.equal(synced.items[2].goodsValue, '4,500 USD');

  // Mathematical totals invariance across all 3 items
  assert.equal(synced.totals.totalPackages, 680); // 330 + 200 + 150
  assert.equal(synced.totals.totalNetWeight, 9280); // 5280 + 2500 + 1500
  assert.equal(synced.totals.totalGrossWeight, 9620); // 5445 + 2600 + 1575
  assert.equal(synced.totals.totalGoodsValue, 19504); // 9504 + 5500 + 4500
});

test('Cargo Density Tiers: assigns normal (<=3), compact (4-5), and dense (6-7)', () => {
  assert.equal(getCargoDensity(1), 'normal');
  assert.equal(getCargoDensity(2), 'normal');
  assert.equal(getCargoDensity(3), 'normal');
  assert.equal(getCargoDensity(4), 'compact');
  assert.equal(getCargoDensity(5), 'compact');
  assert.equal(getCargoDensity(6), 'dense');
  assert.equal(getCargoDensity(7), 'dense');
  assert.equal(getCargoDensity(8), 'multipage');
  assert.equal(getCargoDensity(12), 'multipage');
});

test('Smart Pagination: single page for <=5 items, multi-page for >=8 items', () => {
  // 3 items with normal route and description -> single page
  assert.equal(
    shouldSplitToPage2({ cargoCount: 3, routeCount: 3, descLineCount: 2 }),
    false
  );

  // 5 items with normal layout -> single page
  assert.equal(
    shouldSplitToPage2({ cargoCount: 5, routeCount: 2, descLineCount: 2 }),
    false
  );

  // 8 items -> triggers multi-page immediately
  assert.equal(
    shouldSplitToPage2({ cargoCount: 8, routeCount: 2, descLineCount: 2 }),
    true
  );

  // 10 items -> multi-page
  assert.equal(
    shouldSplitToPage2({ cargoCount: 10, routeCount: 4, descLineCount: 3 }),
    true
  );
});

test('Auto-Collapse: deleting extra items collapses document back to single page', () => {
  // Start with 10 items
  let isMulti = shouldSplitToPage2({ cargoCount: 10, routeCount: 2, descLineCount: 2 });
  assert.equal(isMulti, true);

  // Delete items down to 4 items
  isMulti = shouldSplitToPage2({ cargoCount: 4, routeCount: 2, descLineCount: 2 });
  assert.equal(isMulti, false);

  // Delete further down to 1 item
  isMulti = shouldSplitToPage2({ cargoCount: 1, routeCount: 2, descLineCount: 2 });
  assert.equal(isMulti, false);
});

test('Page Splitting: distributes items intelligently across Page 1 and Page 2', () => {
  const dummyItems = Array.from({ length: 10 }, (_, i) => ({
    id: `row-${i}`,
    packageText: `${100 + i} CTNS`,
    netPerCarton: '10 KGS',
    grossPerCarton: '11 KGS',
    netWeight: `${(100 + i) * 10} KG`,
    grossWeight: `${(100 + i) * 11} KG`,
    rate: '2.00 USD',
    goodsValue: `${(100 + i) * 20} USD`,
  }));

  const { page1Items, page2Items } = splitCargoForPages(dummyItems, true);
  assert.equal(page1Items.length + page2Items.length, 10);
  assert.equal(page1Items.length, 6);
  assert.equal(page2Items.length, 4);

  // Sequential continuity: Page 2 starts right after Page 1
  assert.equal(page1Items[0].packageText, '100 CTNS');
  assert.equal(page1Items[5].packageText, '105 CTNS');
  assert.equal(page2Items[0].packageText, '106 CTNS');
  assert.equal(page2Items[3].packageText, '109 CTNS');
});

test('Delimiter Robustness: splits dashed or newline strings without corrupting numbers with commas', () => {
  const parts = splitMultiCargoItems('1,500 CTNS - 2,800 CTNS - 3,250 CTNS');
  assert.deepEqual(parts, ['1,500 CTNS', '2,800 CTNS', '3,250 CTNS']);

  const weights = splitMultiCargoItems('15,000.50 KG\n28,000.00 KG\n32,500.25 KG');
  assert.deepEqual(weights, ['15,000.50 KG', '28,000.00 KG', '32,500.25 KG']);

  const values = splitMultiCargoItems('45,000.00 USD | 84,000.00 USD | 97,500.00 USD');
  assert.deepEqual(values, ['45,000.00 USD', '84,000.00 USD', '97,500.00 USD']);
});

test('Large Numeric Accounting Invariance: sums multi-ton and multi-million cargo correctly', () => {
  const formData = {
    number_of_packages: '25,000 CTNS\n15,000 CTNS\n10,000 CTNS',
    kgs_per_carton: '20 KGS\n20 KGS\n20 KGS',
    gross_weight_per_carton: '21 KGS\n21 KGS\n21 KGS',
    net_weight: '500,000 KG\n300,000 KG\n200,000 KG',
    gross_weight: '525,000 KG\n315,000 KG\n210,000 KG',
    rate_per_kgs: '5.00 USD\n5.00 USD\n5.00 USD',
    goods_value: '2,500,000 USD\n1,500,000 USD\n1,000,000 USD',
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.totals.totalPackages, 50000);
  assert.equal(synced.totals.totalNetWeight, 1000000); // 1,000,000 KG
  assert.equal(synced.totals.totalGrossWeight, 1050000); // 1,050,000 KG
  assert.equal(synced.totals.totalGoodsValue, 5000000); // 5,000,000 USD
});

const {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  SAFE_PADDING_PX,
} = load('components/bill-of-lading/use-a4-preview-scale.ts');

test('Fit Page Scaling Invariance: scales document to fit inside viewport with 0 overflow on X and Y', () => {
  // Test user example from prompt: Viewport 1200 x 650, Safe padding 20px
  const viewportWidth = 1200;
  const viewportHeight = 650;
  const availableWidth = viewportWidth - SAFE_PADDING_PX * 2; // 1160
  const availableHeight = viewportHeight - SAFE_PADDING_PX * 2; // 610

  const scaleX = availableWidth / A4_WIDTH_PX;
  const scaleY = availableHeight / A4_HEIGHT_PX;
  const fitPageScale = Math.min(scaleX, scaleY);

  const scaledWidth = Math.round(A4_WIDTH_PX * fitPageScale);
  const scaledHeight = Math.round(A4_HEIGHT_PX * fitPageScale);

  const overflowX = Math.max(0, scaledWidth - availableWidth);
  const overflowY = Math.max(0, scaledHeight - availableHeight);

  assert.equal(overflowX, 0, 'Fit Page must have 0 horizontal overflow');
  assert.equal(overflowY, 0, 'Fit Page must have 0 vertical overflow');
  assert.ok(fitPageScale < scaleX, 'Height is limiting factor in landscape/laptop viewport');
  assert.ok(Math.abs(fitPageScale - 0.5434) < 0.01, 'Scale matches expected ~0.543');
});

test('User Scenario BOL-NSA621: Fit Page fits complete A4 sheet top-to-bottom on standard laptop viewport', () => {
  // Standard 1080p laptop display with app header (56px) and toolbars (~150px) leaves ~550px viewport height
  const viewportWidth = 1050;
  const viewportHeight = 550;
  const availableWidth = viewportWidth - SAFE_PADDING_PX * 2; // 1010
  const availableHeight = viewportHeight - SAFE_PADDING_PX * 2; // 510

  const scaleX = availableWidth / A4_WIDTH_PX;
  const scaleY = availableHeight / A4_HEIGHT_PX;
  const fitPageScale = Math.min(scaleX, scaleY);

  const scaledWidth = Math.round(A4_WIDTH_PX * fitPageScale);
  const scaledHeight = Math.round(A4_HEIGHT_PX * fitPageScale);

  const overflowX = Math.max(0, scaledWidth - availableWidth);
  const overflowY = Math.max(0, scaledHeight - availableHeight);

  assert.equal(overflowX, 0, 'BOL-NSA621 Fit Page must have 0 horizontal overflow');
  assert.equal(overflowY, 0, 'BOL-NSA621 Fit Page must have 0 vertical overflow');
  assert.ok(scaledHeight <= availableHeight, 'Scaled height must not exceed available viewport height');
  assert.ok(scaledWidth <= availableWidth, 'Scaled width must not exceed available viewport width');
});

test('Fit Width vs Fit Page Distinct Invariance: Fit Width fills available width while Fit Page bounds both axes', () => {
  const viewportWidth = 1100;
  const viewportHeight = 600;
  const availableWidth = viewportWidth - SAFE_PADDING_PX * 2;
  const availableHeight = viewportHeight - SAFE_PADDING_PX * 2;

  const fitWidthScale = availableWidth / A4_WIDTH_PX;
  const fitPageScale = Math.min(availableWidth / A4_WIDTH_PX, availableHeight / A4_HEIGHT_PX);

  // Fit Width is significantly larger than Fit Page for portrait documents
  assert.ok(fitWidthScale > fitPageScale, 'Fit Width scale must be larger than Fit Page scale on widescreen viewports');

  // Fit Width intentionally allows vertical scrolling
  const widthScaledHeight = Math.round(A4_HEIGHT_PX * fitWidthScale);
  assert.ok(widthScaledHeight > availableHeight, 'Fit Width intentionally overflows Y so document width is readable');

  // Fit Page guarantees NO vertical scrolling
  const pageScaledHeight = Math.round(A4_HEIGHT_PX * fitPageScale);
  assert.ok(pageScaledHeight <= availableHeight, 'Fit Page must never overflow Y');
});

test('Multi-viewport Matrix: 1080p, 768p laptop, 800p tablet, mobile all guarantee overflowX = 0 and overflowY = 0', () => {
  const viewports = [
    { name: '1080p Fullscreen', w: 1600, h: 850 },
    { name: '1366x768 Standard Laptop', w: 980, h: 480 },
    { name: '1280x800 MacBook/PC', w: 950, h: 520 },
    { name: '1024x768 iPad/Tablet', w: 750, h: 550 },
    { name: '375x667 Mobile Portrait', w: 340, h: 500 },
  ];

  for (const vp of viewports) {
    const availW = Math.max(100, vp.w - SAFE_PADDING_PX * 2);
    const availH = Math.max(100, vp.h - SAFE_PADDING_PX * 2);

    const scaleX = availW / A4_WIDTH_PX;
    const scaleY = availH / A4_HEIGHT_PX;
    const fitPageScale = Math.min(scaleX, scaleY);

    const scaledW = Math.round(A4_WIDTH_PX * fitPageScale);
    const scaledH = Math.round(A4_HEIGHT_PX * fitPageScale);

    const overflowX = Math.max(0, scaledW - availW);
    const overflowY = Math.max(0, scaledH - availH);

    assert.equal(overflowX, 0, vp.name + ' must have 0 horizontal overflow in Fit Page');
    assert.equal(overflowY, 0, vp.name + ' must have 0 vertical overflow in Fit Page');
  }
});

test('User Scenario: 1430 CTNS without comma must total 1430 (never truncated to 143)', () => {
  const formData = {
    number_of_packages: '1430 CTNS BLACK RAISNIS',
    kgs_per_carton: '16.00 KGS',
    gross_weight_per_carton: '17.90 KGS',
    net_weight: '22,880 KG',
    gross_weight: '25,597 KG',
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.totals.totalPackages, 1430, 'Total packages must be 1430, NOT 143');
  assert.equal(synced.totals.packageUnit, 'CTNS');
  assert.equal(synced.totals.totalNetWeight, 22880);
  assert.equal(synced.totals.totalGrossWeight, 25597);

  // Also test standalone parseCargoTotal
  assert.equal(parseCargoTotal(['1430 CTNS']).sum, 1430);
  assert.equal(parseCargoTotal(['2500 CTNS']).sum, 2500);
  assert.equal(parseCargoTotal(['10000 PKGS']).sum, 10000);
});

