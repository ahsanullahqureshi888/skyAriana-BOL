const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const appDataRoot = path.join(process.env.APPDATA || '', 'AQ COMPANIES', 'data');
const winUnpackedData = path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'seed-data');
const programFilesData = path.join('C:', 'Program Files', 'AQ COMPANIES', 'resources', 'seed-data');

console.log('=====================================================');
console.log(' AQ COMPANIES - Sync Desktop Data to AppData & Seed');
console.log('=====================================================');

if (!fs.existsSync(appDataRoot)) {
  fs.mkdirSync(appDataRoot, { recursive: true });
}

// 1. Create timestamped backup of existing AppData
const backupDir = path.join(process.env.APPDATA || '', 'AQ COMPANIES', 'data_backups', `backup-${Date.now()}`);
fs.mkdirSync(backupDir, { recursive: true });

const existingAppDataFiles = fs.readdirSync(appDataRoot);
let backedUpCount = 0;
for (const f of existingAppDataFiles) {
  const src = path.join(appDataRoot, f);
  if (fs.statSync(src).isFile()) {
    fs.copyFileSync(src, path.join(backupDir, f));
    backedUpCount++;
  }
}
console.log(`[1] Created timestamped backup of AppData: ${backedUpCount} files in ${backupDir}`);

// 2. Identify all .local-*.json files in project root
const DATA_FILE_PATTERN = /^(?:\.local-[a-z0-9-]+\.json|\.(?:bol|invoice)-counter)$/i;
const projectFiles = fs.readdirSync(projectRoot).filter(f => DATA_FILE_PATTERN.test(f));

const targetDirs = [appDataRoot];
if (fs.existsSync(winUnpackedData)) targetDirs.push(winUnpackedData);
if (fs.existsSync(programFilesData)) targetDirs.push(programFilesData);

for (const targetDir of targetDirs) {
  try {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    let copied = 0;
    for (const f of projectFiles) {
      const src = path.join(projectRoot, f);
      const dest = path.join(targetDir, f);
      try {
        fs.copyFileSync(src, dest);
        copied++;
      } catch (e) {
        // Skip protected directories like C:\Program Files if running without elevated admin
      }
    }
    console.log(`[2] Copied ${copied} data files -> ${targetDir}`);
  } catch (err) {
    console.warn(`[2] Skipping non-writable target: ${targetDir}`);
  }
}

// 3. Synchronize app.db
const srcDb = path.join(projectRoot, 'data', 'app.db');
if (fs.existsSync(srcDb)) {
  const dbTargets = [
    path.join(appDataRoot, 'app.db'),
    path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'seed-data', 'data', 'app.db'),
    path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'seed-data', 'app.db'),
    path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'backend', 'data', 'app.db'),
  ];

  for (const dest of dbTargets) {
    try {
      const dir = path.dirname(dest);
      if (fs.existsSync(path.dirname(dir)) || fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(srcDb, dest);
        console.log(`[3] Copied app.db -> ${dest} (${(fs.statSync(dest).size / (1024*1024)).toFixed(2)} MB)`);
      }
    } catch (e) {}
  }
}

// 4. Synchronize public/uploads
const srcUploads = path.join(projectRoot, 'public', 'uploads');
if (fs.existsSync(srcUploads)) {
  const uploadTargets = [
    path.join(appDataRoot, 'uploads'),
    path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'app-server', 'public', 'uploads'),
  ];

  function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      const srcItem = path.join(src, item);
      const destItem = path.join(dest, item);
      if (fs.statSync(srcItem).isDirectory()) {
        copyDirRecursive(srcItem, destItem);
      } else {
        try { fs.copyFileSync(srcItem, destItem); } catch (e) {}
      }
    }
  }

  for (const dest of uploadTargets) {
    try {
      const parent = path.dirname(dest);
      if (fs.existsSync(parent)) {
        copyDirRecursive(srcUploads, dest);
        console.log(`[4] Synced uploads directory -> ${dest}`);
      }
    } catch (e) {}
  }
}

// 5. Verification
const verifiedBols = JSON.parse(fs.readFileSync(path.join(appDataRoot, '.local-bols.json'), 'utf8'));
console.log(`\nVerification:`);
console.log(`  AppData .local-bols.json count: ${verifiedBols.length}`);
console.log(`  Project .local-bols.json count: ${JSON.parse(fs.readFileSync(path.join(projectRoot, '.local-bols.json'), 'utf8')).length}`);
console.log('Sync complete successfully!\n');
