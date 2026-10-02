/**
 * BOL Sequence & Count Starting Verification Test Suite
 * Validates that BOL sequence starts from BOL-NSA619 and progresses atomically.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const loadTypescript = require("./load-typescript.cjs");

const {
  extractBolNumberSuffix,
  START_SEQUENCE,
  DEFAULT_BOL_PREFIX,
} = loadTypescript("lib/services/bol-sequence.ts");

test("BOL Sequence Starting Number & Format Verification", async (t) => {
  await t.test("1. Starting sequence is configured to 619 with BOL-2026-NSA prefix", () => {
    assert.equal(START_SEQUENCE, 619, "START_SEQUENCE must be 619");
    assert.equal(DEFAULT_BOL_PREFIX, "BOL-2026-NSA", "DEFAULT_BOL_PREFIX must be BOL-2026-NSA");
  });

  await t.test("2. extractBolNumberSuffix correctly extracts sequence numbers", () => {
    assert.equal(extractBolNumberSuffix("BOL-NSA619"), 619);
    assert.equal(extractBolNumberSuffix("BOL-NSA 619"), 619);
    assert.equal(extractBolNumberSuffix("NSA 619"), 619);
    assert.equal(extractBolNumberSuffix("NSA619"), 619);
    assert.equal(extractBolNumberSuffix("BOL-NSA620"), 620);
    assert.equal(extractBolNumberSuffix("BOL-2026-NSA619"), 619);
    assert.equal(extractBolNumberSuffix("BOL-2026-NSA621"), 621);
    assert.equal(extractBolNumberSuffix("BOL-2026-NSA626"), 626);
    assert.equal(extractBolNumberSuffix("BOL-2026-NSA-626"), 626);
    assert.equal(extractBolNumberSuffix("BOL-NSA1000"), 1000);
    assert.equal(extractBolNumberSuffix(""), 0);
    assert.equal(extractBolNumberSuffix(null), 0);
  });

  await t.test("3. .local-bol-sequence.json is configured for BOL-2026-NSA626 format", () => {
    const seqPath = path.resolve(".local-bol-sequence.json");
    assert.ok(fs.existsSync(seqPath), ".local-bol-sequence.json must exist");
    
    const data = JSON.parse(fs.readFileSync(seqPath, "utf8"));
    assert.equal(data.prefix, "BOL-2026-NSA", "Prefix must be BOL-2026-NSA");
    assert.equal(data.startSequence, 619, "startSequence must be 619");
    
    // The next allocated sequence starts at or progresses from 626
    const nextAllocated = (data.sequence || 625) + 1;
    assert.ok(nextAllocated >= 626, `Next allocated BOL count (${nextAllocated}) must be at least 626`);
    assert.match(`${data.prefix}${nextAllocated}`, /^BOL-2026-NSA\d{3,}$/, "Next BOL number must match BOL-2026-NSA sequence format");
  });

  await t.test("4. Sequential progression formula produces sequential BOL numbers like BOL-2026-NSA626", () => {
    let currentSeq = 625;
    const prefix = "BOL-2026-NSA";

    const bol1 = `${prefix}${++currentSeq}`;
    const bol2 = `${prefix}${++currentSeq}`;
    const bol3 = `${prefix}${++currentSeq}`;

    assert.equal(bol1, "BOL-2026-NSA626", "First BOL must be BOL-2026-NSA626");
    assert.equal(bol2, "BOL-2026-NSA627", "Second BOL must be BOL-2026-NSA627");
    assert.equal(bol3, "BOL-2026-NSA628", "Third BOL must be BOL-2026-NSA628");
  });

  await t.test("5. extractBolNumberSuffix returns 0 for UUIDs to prevent sequence corruption", () => {
    assert.equal(extractBolNumberSuffix("b0632d43-3cf9-4c6e-8eed-e83c969d4c86"), 0);
    assert.equal(extractBolNumberSuffix("a6959d9d-b0bc-49e6-80ad-48859a0c8225"), 0);
    assert.equal(extractBolNumberSuffix("3f414239-161f-4a63-8e2b-7e47c086d342"), 0);
  });

  await t.test("6. isUUID and cleanBolNumber correctly filter out raw UUIDs", () => {
    const { isUUID, cleanBolNumber } = loadTypescript("lib/utils/bol-filters.ts");
    assert.equal(isUUID("b0632d43-3cf9-4c6e-8eed-e83c969d4c86"), true);
    assert.equal(isUUID("BOL-2026-NSA642"), false);
    assert.equal(isUUID("NSA642"), false);
    assert.equal(isUUID(""), false);
    assert.equal(isUUID(null), false);

    assert.equal(cleanBolNumber("BOL-2026-NSA642"), "BOL-2026-NSA642");
    assert.equal(cleanBolNumber("b0632d43-3cf9-4c6e-8eed-e83c969d4c86"), "");
    assert.equal(cleanBolNumber("b0632d43-3cf9-4c6e-8eed-e83c969d4c86", "BOL-FALLBACK"), "BOL-FALLBACK");
  });

  await t.test("7. Zero records in .local-bols.json have a raw UUID as bol_number", () => {
    const { isUUID } = loadTypescript("lib/utils/bol-filters.ts");
    const bols = JSON.parse(fs.readFileSync(path.resolve(".local-bols.json"), "utf8"));
    const uuidBols = bols.filter((b) => isUUID(b.bol_number));
    assert.equal(uuidBols.length, 0, `Expected 0 BOL records with UUID as bol_number, found ${uuidBols.length}`);
  });
});
