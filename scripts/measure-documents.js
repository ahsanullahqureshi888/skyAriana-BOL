const fs = require('fs');
const { performance } = require('perf_hooks');

console.log('=== STEP 1: CURRENT DOCUMENT ARCHITECTURE BENCHMARK ===');

// Test 1: XLSX Generation in JS
const xlsxStart = performance.now();
const XLSX = require('xlsx');
const wsData = [
  ['Date', 'BOL', 'Description', 'Debit', 'Credit', 'Balance'],
];
for (let i = 0; i < 5000; i++) {
  wsData.push(['2026-09-24', 'BOL-2026-TEST-' + i, 'DRY FIGS (BEST) 2000 CTNS', 3200, 0, 3200 * (i + 1)]);
}
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const xlsxDuration = performance.now() - xlsxStart;
console.log('JS XLSX (5,000 rows):', xlsxDuration.toFixed(2), 'ms', 'Buffer size:', (buf.length / 1024).toFixed(1), 'KB');

// Test 2: jsPDF Generation in JS
const jspdfStart = performance.now();
const { jsPDF } = require('jspdf');
const doc = new jsPDF();
doc.text('SKY ARIANA LIMITED', 10, 10);
doc.text('Bill of Lading: BOL-2026-TEST', 10, 20);
for (let i = 0; i < 50; i++) {
  doc.text('Line item ' + i + ': Carton cargo description and weights', 10, 30 + (i % 25) * 6);
  if (i === 24) doc.addPage();
}
const pdfOutput = doc.output('arraybuffer');
const jspdfDuration = performance.now() - jspdfStart;
console.log('jsPDF (2-page document):', jspdfDuration.toFixed(2), 'ms', 'Output size:', (pdfOutput.byteLength / 1024).toFixed(1), 'KB');
