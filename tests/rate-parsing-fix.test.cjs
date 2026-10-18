const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  splitMultiCargoItems,
  parseSyncedCargoItems,
} = load('lib/utils/cargo-grid.ts');

test('Rate Parsing: splits "2.50 - USD - 2.50 - USD" into exactly 2 rate items with numbers', () => {
  const result = splitMultiCargoItems('2.50 - USD - 2.50 - USD');
  console.log('Result for "2.50 - USD - 2.50 - USD":', result);
  assert.equal(result.length, 2);
  assert.equal(result[0], '2.50 USD');
  assert.equal(result[1], '2.50 USD');
});

test('Rate Parsing: splits "3.50 - USD - 8.00 - USD" into 2 distinct rate items', () => {
  const result = splitMultiCargoItems('3.50 - USD - 8.00 - USD');
  console.log('Result for "3.50 - USD - 8.00 - USD":', result);
  assert.equal(result.length, 2);
  assert.equal(result[0], '3.50 USD');
  assert.equal(result[1], '8.00 USD');
});

test('Rate Parsing: handles single rate with trailing USD "6.50 -USD"', () => {
  const result = splitMultiCargoItems('6.50 -USD');
  assert.equal(result.length, 1);
  assert.equal(result[0], '6.50 USD');
});

test('Rate Parsing: handles trailing solitary USD like "3.50 - 3.25 - 6.35 - USD"', () => {
  const result = splitMultiCargoItems('3.50 - 3.25 - 6.35 - USD');
  assert.equal(result.length, 3);
  assert.equal(result[0], '3.50 USD');
  assert.equal(result[1], '3.25 USD');
  assert.equal(result[2], '6.35 USD');
});

test('Rate Parsing: BOL-2026-NSA670 exact screenshot scenario produces 2 rows, no phantom row, and correct rates', () => {
  const formData = {
    number_of_packages: '1419 CTNS GOLDEN RAISINS - 31 CTNS GREEN RAISNIS ',
    kgs_per_carton: '16.0-KGS - 16.0-KGS',
    gross_weight_per_carton: '17.7004933-KGS - 17.7096-KGS',
    net_weight: '22,704 KG - 496 KG',
    gross_weight: '25,117 KG - 549 KG',
    rate_per_kgs: '2.50 - USD - 2.50 - USD',
    goods_value: '56,760.00 USD - 1,240.00 USD'
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.items.length, 2, 'Must have exactly 2 cargo items, not 3');
  assert.equal(synced.items[0].rate, '2.50 USD');
  assert.equal(synced.items[0].goodsValue, '56,760.00 USD');
  assert.equal(synced.items[1].rate, '2.50 USD');
  assert.equal(synced.items[1].goodsValue, '1,240.00 USD');
  assert.equal(synced.totals.totalGoodsValue, 58000);
});

test('Rate Parsing: single rate applies to all rows when multi-item shipment', () => {
  const formData = {
    number_of_packages: '1000 CTNS - 500 CTNS',
    kgs_per_carton: '10 KGS - 10 KGS',
    gross_weight_per_carton: '11 KGS - 11 KGS',
    net_weight: '10,000 KG - 5,000 KG',
    gross_weight: '11,000 KG - 5,500 KG',
    rate_per_kgs: '2.50 USD',
    goods_value: '25,000.00 USD - 12,500.00 USD'
  };

  const synced = parseSyncedCargoItems(formData);
  assert.equal(synced.items.length, 2);
  assert.equal(synced.items[0].rate, '2.50 USD');
  assert.equal(synced.items[1].rate, '2.50 USD');
});

test('Rate Parsing: splits goods_value with dollar signs correctly', () => {
  const result = splitMultiCargoItems('$17,500.00 - $15,200.00 - $9,600.00');
  console.log('Result for dollar goods_value:', result);
  assert.equal(result.length, 3);
  assert.equal(result[0], '$17,500.00');
  assert.equal(result[1], '$15,200.00');
  assert.equal(result[2], '$9,600.00');
});

