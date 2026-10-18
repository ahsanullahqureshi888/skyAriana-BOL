const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sequenceFileRoot = path.join(root, '.local-bol-sequence.json');
const sequenceFileData = path.join(root, 'data', '.local-bol-sequence.json');

const targetSequencePayload = {
  year: 2026,
  sequence: 683,
  startSequence: 684,
  prefix: 'BOL-2026-NSA',
  updated_at: new Date().toISOString()
};

function writeAtomically(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, serialized, 'utf8');
  fs.renameSync(tmpPath, filePath);
  console.log(`[OK] Successfully atomically updated: ${filePath}`);
}

console.log('--- Applying Starting BOL Sequence BOL-2026-NSA684 (Finale BOL: 683) ---');
writeAtomically(sequenceFileRoot, targetSequencePayload);
if (fs.existsSync(path.dirname(sequenceFileData))) {
  writeAtomically(sequenceFileData, targetSequencePayload);
}

// Verification:
const verifyRoot = JSON.parse(fs.readFileSync(sequenceFileRoot, 'utf8'));
const nextExpected = `${verifyRoot.prefix}${Math.max(verifyRoot.sequence + 1, verifyRoot.startSequence)}`;
console.log('Verified Root State:', verifyRoot);
console.log('Next Available BOL Number will be:', nextExpected);

if (nextExpected !== 'BOL-2026-NSA684') {
  console.error(`[ERROR] Verification failed: expected BOL-2026-NSA684 but got ${nextExpected}`);
  process.exit(1);
} else {
  console.log('[SUCCESS] Verified next sequence number is BOL-2026-NSA684');
}
