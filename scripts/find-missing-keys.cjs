const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath);
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('.map(')) {
      // Look ahead up to 12 lines
      const snippet = lines.slice(i, Math.min(lines.length, i + 12)).join('\n');
      // If snippet contains a JSX element opening like <div, <button, <span, <React.Fragment, <>, etc.
      // Check if it returns JSX
      if (/\.map\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/.test(snippet)) {
        // If there is JSX in the return
        if (/<[a-zA-Z0-9_]+|<\s*>/i.test(snippet)) {
          // Check if key= exists
          if (!snippet.includes('key=') && !snippet.includes('key={')) {
            console.log(`FILE: ${filePath} at line ${i + 1}`);
            console.log(snippet.slice(0, 300));
            console.log('--------------------------------------------------');
          }
        }
      }
    }
  }
}

scanDir('components/bill-of-lading');
scanDir('app');
console.log('Done scanning!');
