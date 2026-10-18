const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { parseLogisticsRoute } = load('lib/utils/transit-route-parser.ts');

test('Transit Route Parser: BOL-NSA621 exact scenario', () => {
  const input = 'از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)';
  const parsed = parseLogisticsRoute(input);

  assert.equal(parsed.isStructured, true);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[0].origin, 'از نیمروز');
  assert.equal(parsed.legs[0].isDry, true);
  assert.equal(parsed.legs[0].isReefer, false);

  assert.equal(parsed.legs[1].origin, 'از بندرعباس');
  assert.equal(parsed.legs[1].isReefer, true);
  assert.equal(parsed.legs[1].isDry, false);

  assert.equal(parsed.switchBlBadge, 'سوییچ بی ال در دبی / جبل علی');
  assert.equal(parsed.reeferBadge, null);
});

test('Transit Route Parser: BOL-NSA625 Full Way Reefer scenario', () => {
  const input = 'از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی (تمام مسیر یخچالی - Full Way Reefer) (با سوییچ بی ال در دبی / جبل علی)';
  const parsed = parseLogisticsRoute(input);

  assert.equal(parsed.isStructured, true);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[0].origin, 'از دوغارون');
  assert.equal(parsed.legs[0].isReefer, true);
  assert.equal(parsed.legs[1].origin, 'از بندرعباس');
  assert.equal(parsed.legs[1].isReefer, true);

  assert.equal(parsed.switchBlBadge, 'سوییچ بی ال در دبی / جبل علی');
  assert.equal(parsed.reeferBadge, 'تمام مسیر یخچالی - Full Way Reefer');
});

test('Transit Route Parser: Islam Qala multi-word border name', () => {
  const input = 'از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر معمولی (با سوییچ بی ال در دبی / جبل علی)';
  const parsed = parseLogisticsRoute(input);

  assert.equal(parsed.isStructured, true);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[0].origin, 'از اسلام قلعه');
  assert.equal(parsed.legs[0].isDry, true);
  assert.equal(parsed.legs[1].origin, 'از بندرعباس');
  assert.equal(parsed.legs[1].isDry, true);
});

test('Transit Route Parser: Freeform custom text note', () => {
  const input = 'Special direct cargo transit via Herat to Kabul with armed security escort.';
  const parsed = parseLogisticsRoute(input);

  assert.equal(parsed.isStructured, false);
  assert.equal(parsed.legs.length, 0);
  assert.equal(parsed.switchBlBadge, null);
  assert.equal(parsed.reeferBadge, null);
  assert.equal(parsed.originalText, input);
});

test('Transit Route Parser: Dogharoun Nhava Sheva multi-modal scenario with Switch B/L', () => {
  const input = '🗺️از دوغارون با کانتینر معمولی تا بندرعباس، سپس با کانتینر یخچالی از بندرعباس، با سوییچ B/L در دبی / جبل علی، و مقصد نهایی: نهاوا شیوا (Nhava Sheva).';
  const parsed = parseLogisticsRoute(input);

  assert.equal(parsed.isStructured, true);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[0].origin, 'از دوغارون');
  assert.equal(parsed.legs[0].isDry, true);
  assert.equal(parsed.legs[0].isReefer, false);

  assert.equal(parsed.legs[1].origin, 'از بندرعباس');
  assert.equal(parsed.legs[1].isReefer, true);
  assert.equal(parsed.legs[1].isDry, false);

  assert.equal(parsed.switchBlBadge, 'سوییچ بی ال در دبی / جبل علی');
  assert.equal(parsed.destinationBadge, 'نهاوا شیوا (Nhava Sheva)');
});

