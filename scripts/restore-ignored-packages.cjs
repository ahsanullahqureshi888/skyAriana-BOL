const fs = require('fs');
const path = require('path');

const targetNm = path.resolve(__dirname, '../node_modules');

console.log('Target node_modules:', targetNm);
if (!fs.existsSync(targetNm)) {
  console.error('node_modules not found!');
  process.exit(1);
}

const entries = fs.readdirSync(targetNm);
const ignoredList = entries.filter(e => e.startsWith('.ignored_'));
console.log(`Found ${ignoredList.length} .ignored_* packages.`);

let restored = 0;
let errors = 0;

for (const item of ignoredList) {
  const originalName = item.slice('.ignored_'.length);
  const oldPath = path.join(targetNm, item);
  const newPath = path.join(targetNm, originalName);

  if (fs.existsSync(newPath)) {
    console.log(`[SKIP] ${originalName} already exists.`);
  } else {
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`[RESTORED] ${item} -> ${originalName}`);
      restored++;
    } catch (err) {
      console.error(`[ERROR] Failed to rename ${item}:`, err.message);
      errors++;
    }
  }
}

// Also check .bin
const binDir = path.join(targetNm, '.bin');
if (fs.existsSync(binDir)) {
  const binEntries = fs.readdirSync(binDir);
  for (const b of binEntries) {
    if (b.startsWith('.') && b.includes('-')) {
      const match = b.match(/^\.([a-zA-Z0-9_\-\.]+)\-[a-zA-Z0-9]+$/);
      if (match) {
        const cleanBin = match[1];
        const currentBinPath = path.join(binDir, b);
        const cleanBinPath = path.join(binDir, cleanBin);
        if (!fs.existsSync(cleanBinPath)) {
          try {
            fs.copyFileSync(currentBinPath, cleanBinPath);
            console.log(`[BIN RESTORED] ${b} -> ${cleanBin}`);
          } catch (e) {
            console.warn(`[BIN WARN] Could not copy ${b}:`, e.message);
          }
        }
      }
    }
  }
}

console.log(`Done! Restored: ${restored}, Errors: ${errors}`);
