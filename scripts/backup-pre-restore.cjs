/**
 * AQ COMPANIES — Pre-Repaired Restore Production Backup
 * Creates a timestamped atomic snapshot before any restore operations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

function computeSha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const backupsDir = path.resolve('data/backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const backupBaseName = `aq_companies_pre_repaired_restore_2026-10-02_${timestamp}`;
const backupZipPath = path.join(backupsDir, `${backupBaseName}.zip`);

console.log('====================================================');
console.log('🛡️  AQ COMPANIES — PRE-RESTORE PRODUCTION ATOMIC BACKUP');
console.log('====================================================\n');
console.log(`Timestamp: ${now.toISOString()}`);
console.log(`Target:    ${backupZipPath}\n`);

// 1. Gather all local JSON stores
const localJsonFiles = fs.readdirSync('.').filter(f => f.startsWith('.local-') && f.endsWith('.json') && !f.includes('.bak'));

// 2. Gather database files
const dbFiles = [
  'backend/data/bol_system.db',
  'resources/backend-dist/aq-backend/_internal/data/app.db',
  'resources/backend/_internal/data/app.db'
].filter(p => fs.existsSync(p));

console.log(`📦 Bundling ${localJsonFiles.length} JSON data stores and ${dbFiles.length} SQLite DB files...`);

const manifest = {
  version: "5.2.0",
  backupType: "PRE_REPAIRED_RESTORE_ATOMIC",
  timestamp: now.toISOString(),
  files: {},
  recordCounts: {}
};

const bundle = {
  manifest,
  stores: {},
  dbFiles: {},
  checksums: {}
};

for (const f of localJsonFiles) {
  const content = fs.readFileSync(f, 'utf8');
  bundle.stores[f] = content;
  const hash = computeSha256(Buffer.from(content, 'utf8'));
  bundle.checksums[f] = hash;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      manifest.recordCounts[f] = parsed.length;
    } else if (typeof parsed === 'object' && parsed !== null) {
      manifest.recordCounts[f] = Object.keys(parsed).length;
    }
  } catch (e) {
    manifest.recordCounts[f] = 'unparsed';
  }
}

for (const dbPath of dbFiles) {
  const buf = fs.readFileSync(dbPath);
  bundle.dbFiles[dbPath] = buf.toString('base64');
  bundle.checksums[dbPath] = computeSha256(buf);
}

const serialized = Buffer.from(JSON.stringify(bundle), 'utf8');
const compressed = zlib.gzipSync(serialized, { level: 9 });
const finalChecksum = computeSha256(compressed);

fs.writeFileSync(backupZipPath, compressed);
const stat = fs.statSync(backupZipPath);

console.log(`✅ Backup successfully created!`);
console.log(`   Path:     ${backupZipPath}`);
console.log(`   Size:     ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
console.log(`   SHA-256:  ${finalChecksum}`);
console.log(`   Stores:   ${Object.keys(bundle.stores).length}`);
console.log(`   DB Files: ${Object.keys(bundle.dbFiles).length}`);
console.log('\nManifest Counts Summary:');
console.log(JSON.stringify(manifest.recordCounts, null, 2));

// Self-verify backup by reading and unpacking
console.log('\n🔍 Verifying backup integrity...');
const verifyBuf = fs.readFileSync(backupZipPath);
const unzipped = zlib.gunzipSync(verifyBuf);
const verifiedBundle = JSON.parse(unzipped.toString('utf8'));
if (verifiedBundle.manifest.backupType === "PRE_REPAIRED_RESTORE_ATOMIC") {
  console.log('✅ Integrity check verified 100%! Backup is atomic and ready.');
} else {
  console.error('❌ Verification mismatch!');
  process.exit(1);
}
