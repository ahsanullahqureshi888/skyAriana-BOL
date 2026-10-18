const fs = require('fs');
const content = fs.readFileSync('components/bill-of-lading/bol-editor.tsx', 'utf8');

const regex = /name:\s*["']([^"']+)["']/g;
const startIdx = content.indexOf('const predefinedLocations:');
const endIdx = content.indexOf('const quickLocationMatches', startIdx);
const slice = content.slice(startIdx, endIdx);

const names = [];
let match;
while ((match = regex.exec(slice)) !== null) {
  names.push(match[1]);
}

const counts = {};
const dupes = [];
for (const n of names) {
  counts[n] = (counts[n] || 0) + 1;
  if (counts[n] === 2) dupes.push(n);
}

console.log('Total location names:', names.length);
console.log('Duplicates found:', dupes);
