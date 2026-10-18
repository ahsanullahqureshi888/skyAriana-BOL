const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      getFiles(full, files);
    } else {
      files.push({ path: full, size: fs.statSync(full).size });
    }
  }
  return files;
}

const chunks = getFiles(path.join('.next', 'static', 'chunks'))
  .filter(f => f.path.endsWith('.js'))
  .sort((a, b) => b.size - a.size);

console.log('====================================================');
console.log('TOP 20 LARGEST PRODUCTION CHUNKS (.next/static/chunks)');
console.log('====================================================');
chunks.slice(0, 20).forEach((c, idx) => {
  console.log(`${idx + 1}. ${path.basename(c.path)}: ${(c.size / 1024).toFixed(1)} KB`);
});

const totalJsBytes = chunks.reduce((s, c) => s + c.size, 0);
console.log('----------------------------------------------------');
console.log(`TOTAL PRODUCTION JS ASSETS: ${(totalJsBytes / (1024 * 1024)).toFixed(2)} MB`);

// Find initial/shared chunks vs dynamic chunks
const appChunks = chunks.filter(c => c.path.includes('app') || c.path.includes('main') || c.path.includes('webpack'));
const initialBytes = appChunks.reduce((s, c) => s + c.size, 0);
console.log(`INITIAL ENTRY / CORE RUNTIME: ${(initialBytes / 1024).toFixed(1)} KB`);
console.log('====================================================\n');
