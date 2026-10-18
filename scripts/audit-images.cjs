const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      getFiles(full, files);
    } else {
      const ext = path.extname(full).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'].includes(ext)) {
        files.push({ path: full, rel: path.relative(path.resolve(__dirname, '..'), full), size: fs.statSync(full).size });
      }
    }
  }
  return files;
}

const images = getFiles(path.join(__dirname, '..', 'public')).sort((a, b) => b.size - a.size);

console.log('====================================================');
console.log('IMAGE ASSETS AUDIT (public/)');
console.log('====================================================');
images.forEach((img, idx) => {
  console.log(`${idx + 1}. ${img.rel}: ${(img.size / 1024).toFixed(1)} KB`);
});
const totalBytes = images.reduce((s, i) => s + i.size, 0);
console.log('----------------------------------------------------');
console.log(`TOTAL STATIC IMAGES: ${(totalBytes / 1024).toFixed(1)} KB`);
console.log('====================================================\n');
