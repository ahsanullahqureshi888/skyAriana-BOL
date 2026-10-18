const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'app', 'globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Normalize line endings
let lines = css.split(/\r?\n/);
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Fix grayscale image filter ordering
  if (line.includes('filter: grayscale') && lines[i + 1] && lines[i + 1].includes('-webkit-filter: grayscale')) {
    const indent = line.match(/^\s*/)[0];
    newLines.push(`${indent}-webkit-filter: grayscale(100%) !important;`);
    newLines.push(`${indent}filter: grayscale(100%) !important;`);
    i++; // skip next line
    continue;
  }

  // Fix image-rendering ordering
  if (line.includes('image-rendering: high-quality') && lines[i + 1] && lines[i + 1].includes('image-rendering: -webkit-optimize-contrast')) {
    const indent = line.match(/^\s*/)[0];
    newLines.push(`${indent}image-rendering: -webkit-optimize-contrast !important;`);
    newLines.push(`${indent}image-rendering: high-quality !important;`);
    i++; // skip next line
    continue;
  }

  // Check backdrop-filter cases
  if (line.includes('backdrop-filter:') && !line.includes('-webkit-backdrop-filter:')) {
    const indent = line.match(/^\s*/)[0];
    const prevLine = newLines[newLines.length - 1] || '';
    const nextLine = lines[i + 1] || '';

    // If previous line was already -webkit-backdrop-filter, keep this line
    if (prevLine.includes('-webkit-backdrop-filter:')) {
      newLines.push(line);
    } 
    // If next line is -webkit-backdrop-filter, swap them
    else if (nextLine.includes('-webkit-backdrop-filter:')) {
      newLines.push(nextLine);
      newLines.push(line);
      i++; // skip next line
    } 
    // If neither, insert -webkit-backdrop-filter before backdrop-filter
    else {
      const val = line.trim().replace(/^backdrop-filter:\s*/, '').replace(/;$/, '');
      newLines.push(`${indent}-webkit-backdrop-filter: ${val};`);
      newLines.push(line);
    }
    continue;
  }

  // Check user-select cases
  if (line.includes('user-select:') && !line.includes('-webkit-user-select:')) {
    const indent = line.match(/^\s*/)[0];
    const prevLine = newLines[newLines.length - 1] || '';
    const nextLine = lines[i + 1] || '';

    if (prevLine.includes('-webkit-user-select:')) {
      newLines.push(line);
    } else if (nextLine.includes('-webkit-user-select:')) {
      newLines.push(nextLine);
      newLines.push(line);
      i++;
    } else {
      const val = line.trim().replace(/^user-select:\s*/, '').replace(/;$/, '');
      newLines.push(`${indent}-webkit-user-select: ${val};`);
      newLines.push(line);
    }
    continue;
  }

  newLines.push(line);
}

fs.writeFileSync(cssPath, newLines.join('\n'), 'utf8');
console.log('Successfully processed app/globals.css for all vendor prefix requirements.');
