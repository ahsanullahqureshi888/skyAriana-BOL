const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'globals.css');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix order when backdrop-filter precedes -webkit-backdrop-filter
content = content.replace(/(?:\r?\n)([ \t]*)backdrop-filter:([^;\n]+);(?:\r?\n)[ \t]*-webkit-backdrop-filter:[^;\n]+;/g, (match, indent, val) => {
  return '\n' + indent + '-webkit-backdrop-filter:' + val + ';\n' + indent + 'backdrop-filter:' + val + ';';
});

// 2. Add -webkit-backdrop-filter before standalone backdrop-filter
content = content.replace(/(?:\r?\n)([ \t]*)(?<!-webkit-)backdrop-filter:([^;\n]+);/g, (match, indent, val) => {
  return '\n' + indent + '-webkit-backdrop-filter:' + val + ';\n' + indent + 'backdrop-filter:' + val + ';';
});

// Clean up duplicate -webkit-backdrop-filter lines
content = content.replace(/([ \t]*-webkit-backdrop-filter:[^;\n]+;\r?\n)([ \t]*-webkit-backdrop-filter:[^;\n]+;\r?\n)+/g, '$1');

// 3. user-select vendor prefix
content = content.replace(/([ \t]*)user-select:\s*none;/g, '$1-webkit-user-select: none;\n$1user-select: none;');

// 4. remove deprecated color-adjust
content = content.replace(/[ \t]*color-adjust:\s*exact\s*!important;(?:\r?\n)?/g, '');

// 5. filter vendor prefix order
content = content.replace(/([ \t]*)filter:\s*grayscale\(100%\)\s*!important;\s*\r?\n[ \t]*-webkit-filter:\s*grayscale\(100%\)\s*!important;/g, '$1-webkit-filter: grayscale(100%) !important;\n$1filter: grayscale(100%) !important;');

// 6. image-rendering order
content = content.replace(/([ \t]*)image-rendering:\s*high-quality\s*!important;\s*\r?\n[ \t]*-webkit-optimize-contrast\s*!important;/g, '$1image-rendering: -webkit-optimize-contrast !important;\n$1image-rendering: high-quality !important;');
content = content.replace(/([ \t]*)image-rendering:\s*high-quality\s*!important;\s*\r?\n[ \t]*image-rendering:\s*-webkit-optimize-contrast\s*!important;/g, '$1image-rendering: -webkit-optimize-contrast !important;\n$1image-rendering: high-quality !important;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated app/globals.css');
