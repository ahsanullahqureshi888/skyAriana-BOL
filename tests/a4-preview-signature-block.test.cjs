const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('A4 Preview - Authorized Signature Block & Bottom Document Layout Suite', async (t) => {
  const a4PreviewPath = path.join(__dirname, '..', 'components', 'bill-of-lading', 'a4-preview.tsx');
  assert.ok(fs.existsSync(a4PreviewPath), 'a4-preview.tsx must exist');
  const code = fs.readFileSync(a4PreviewPath, 'utf8');

  await t.test('1. Dedicated AuthorizedSignatureBlock component exists and is exported', () => {
    assert.match(code, /export function AuthorizedSignatureBlock\b/, 'AuthorizedSignatureBlock must be exported');
    assert.match(code, /export interface AuthorizedSignatureBlockProps\b/, 'AuthorizedSignatureBlockProps must be exported');
  });

  await t.test('2. Card Proportions strictly enforce ~25-30% usable A4 width', () => {
    assert.match(code, /w-\[(?:54|58)mm\]\s+min-w-\[(?:50|52)mm\]\s+max-w-\[(?:58|64)mm\]/, 'Must enforce balanced card width');
    assert.match(code, /rounded-xl\s+border\s+border-blue-900\/15\s+bg-white\/95/, 'Must use subtle border and translucent white background');
  });

  await t.test('3. Stamp and Signature are centered horizontally and vertically', () => {
    assert.match(code, /flex\s+items-center\s+justify-center/, 'Chamber must center content via flexbox');
    assert.match(code, /object-contain/, 'Stamp image must use object-fit: contain');
  });

  await t.test('4. Stamp image has safe bounds and opacity controls', () => {
    assert.match(code, /data-company-stamp-img=["']true["']/, 'Must render company stamp image with tracking attribute');
    assert.match(code, /opacity:\s*stampConfig\.opacity/, 'Must support opacity control');
  });

  await t.test('5. Divider line is thin, professional, and centered without touching edges', () => {
    assert.match(code, /w-\[88%\]\s+mx-auto\s+.*border-b\s+border-blue-900\/20/, 'Divider must be 88% width, centered with subtle blue-900/20 border');
    assert.doesNotMatch(code, /border-b-2\s+border-slate-800\/80/, 'Must NOT use the old heavy 2px dark slate divider');
  });

  await t.test('6. English authorization text is centered with structured 2-line title hierarchy', () => {
    assert.match(code, /FOR\s*&\s*ON\s*BEHALF\s*OF/, 'Must parse FOR & ON BEHALF OF prefix');
    assert.match(code, /font-black\s+text-blue-950\s+uppercase\s+tracking-tight\s+leading-tight\s+text-center/, 'English text must be centered uppercase navy bold');
  });

  await t.test('7. Persian/Dari authorization text is optical-balanced and isolated from global font blowups', () => {
    assert.match(code, /font-\[vazirmatn\]\s+text-blue-900\s+font-extrabold\s+leading-tight\s+text-center/, 'Persian text must use Vazirmatn and centered alignment');
    assert.match(code, /dir=["']rtl["']/, 'Must declare dir="rtl" for correct bidirectional rendering');
    assert.match(code, /fontSize:\s*isUltraCompact\s*\?\s*["']5\.0pt["']\s*:\s*isCompact\s*\?\s*["']5\.4pt["']\s*:\s*["']5\.8pt["']/, 'Persian text must have explicit optical font sizing between 5.0pt and 5.8pt');
  });

  await t.test('8. Verified Carrier Block is completely removed from A4 Preview', () => {
    assert.doesNotMatch(code, /VerifiedCarrierBlock/, 'VerifiedCarrierBlock must be completely removed');
    assert.doesNotMatch(code, /data-verified-carrier/, 'Must not contain data-verified-carrier');
  });

  await t.test('9. BottomDocumentArea positions AuthorizedSignatureBlock on the right with safe margins above footer', () => {
    assert.match(code, /export function BottomDocumentArea\b/, 'BottomDocumentArea must be exported');
    assert.match(code, /mt-auto\s+mb-1\.5\s+sm:mb-2\s+flex\s+shrink-0\s+items-end\s+justify-end/, 'Must use mt-auto, justify-end, and safe bottom margin above footer');
  });

  await t.test('10. Stamp inactive state shows dignified sign & seal placeholder', () => {
    assert.match(code, /Authorized Sign & Seal/, 'Must show professional sign prompt when stamp is inactive');
  });

  await t.test('11. SignatureChamber backwards compatibility alias is preserved', () => {
    assert.match(code, /export const SignatureChamber = BottomDocumentArea/, 'SignatureChamber must alias BottomDocumentArea');
  });

  await t.test('12. Issue Date card formats Gregorian and Solar Hijri dates vertically with centered labels', () => {
    assert.match(code, /ISSUE DATE[\s\S]*تاریخ صدور/, 'Issue date labels must be cleanly paired');
    assert.match(code, /flex\s+flex-col\s+items-center\s+justify-center[\s\S]*issueDate[\s\S]*persianDateNumeric/, 'Dates must be flex-col stacked vertically');
  });

  await t.test('13. Driver Rent card features enlarged prominent amount and styled note badge', () => {
    assert.match(code, /DRIVER RENT[\s\S]*کرایه راننده/, 'Driver rent labels must be present');
    assert.match(code, /font-mono\s+font-black\s+text-emerald-950[\s\S]*11\.6pt/, 'Driver rent amount must have enlarged bold monospace emerald scale');
    assert.match(code, /font-\[vazirmatn\]\s+font-black\s+text-emerald-900[\s\S]*bg-emerald-50\/90[\s\S]*border-emerald-200\/90/, 'Driver rent note must render in an emerald tag badge');
  });

  await t.test('14. ShipmentOverview header labels use enlarged high-contrast typography', () => {
    assert.match(code, /text-blue-800[\s\S]*7\.6pt/, 'Shipment overview English label must use blue-800 and 7.6pt max scale');
    assert.match(code, /font-\[vazirmatn\][\s\S]*7\.2pt/, 'Shipment overview Persian label must use vazirmatn and 7.2pt max scale');
  });
});

