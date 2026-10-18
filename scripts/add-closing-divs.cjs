const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'components', 'settings-view.tsx');
let file = fs.readFileSync(targetPath, 'utf8');

const markers = [
  '{/* TAB 3: COMPANY',
  '{/* TAB 4: CLOUD',
  '{/* TAB 5: SECURITY',
  '{/* TAB 6: APP',
  '{/* TAB 7: DATA VAULT',
];

markers.forEach(m => {
  const idx = file.indexOf(m);
  if (idx === -1) {
    console.error('Marker not found:', m);
    return;
  }
  // Search backward from idx for the nearest "</div>\r?\n      )}"
  const sub = file.slice(0, idx);
  const closingMatch = sub.match(/<\/div>(\r?\n\s*\)\}\s*\{\/\* =+ \*\/[\s\S]*?$)/);
  if (closingMatch) {
    const replaceTarget = closingMatch[0];
    const replacement = '</div>\n        </div>' + closingMatch[1];
    file = file.slice(0, sub.length - replaceTarget.length) + replacement + file.slice(idx);
    console.log('Added closing div before marker:', m);
  } else {
    console.error('Could not match closing before marker:', m);
  }
});

const temp = targetPath + '.tmp';
fs.writeFileSync(temp, file, 'utf8');
fs.renameSync(temp, targetPath);

console.log('Finished updating closing divs. New length:', file.length);
