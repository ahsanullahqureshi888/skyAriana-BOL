const http = require('http');
const fs = require('fs');
const path = require('path');

async function measureEndpoint(url) {
  const start = performance.now();
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = performance.now() - start;
        const bytes = Buffer.byteLength(data, 'utf8');
        let parsed = null;
        try { parsed = JSON.parse(data); } catch(e) {}
        resolve({
          url,
          status: res.statusCode,
          durationMs: Math.round(duration * 100) / 100,
          payloadBytes: bytes,
          payloadKb: Math.round(bytes / 1024 * 10) / 10,
          itemCount: Array.isArray(parsed) ? parsed.length : (parsed && Array.isArray(parsed.data) ? parsed.data.length : null)
        });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 AQ COMPANIES v5.2.0 — LIVE PERFORMANCE BENCHMARK');
  console.log('====================================================\n');

  // Check file sizes on disk
  const localBolsPath = path.join(__dirname, '..', '.local-bols.json');
  if (fs.existsSync(localBolsPath)) {
    const stats = fs.statSync(localBolsPath);
    console.log(`📁 .local-bols.json file size: ${(stats.size / 1024).toFixed(1)} KB`);
  }

  const endpoints = [
    'http://localhost:3001/api/bol',
    'http://localhost:3001/api/bol?limit=25',
    'http://localhost:3001/api/bol/recent',
    'http://localhost:3001/api/bol/summary',
    'http://localhost:3001/api/bol/BOL-2026-NSA626',
    'http://localhost:3001/api/notifications?user=admin&role=superadmin&activeOnly=true',
    'http://localhost:3001/api/backup/operations',
    'http://localhost:3001/api/sync/gdrive?action=status',
    'http://localhost:3001/?tab=saved-documents'
  ];

  console.log('\nMeasuring API Endpoints (Current Baseline):');
  console.log('----------------------------------------------------');
  for (const ep of endpoints) {
    const res = await measureEndpoint(ep);
    if (res.error) {
      console.log(`❌ ${ep} -> Error: ${res.error}`);
    } else {
      console.log(`⚡ ${res.url}`);
      console.log(`   Status: ${res.status} | Duration: ${res.durationMs}ms | Size: ${res.payloadKb} KB | Items: ${res.itemCount ?? 'N/A'}`);
    }
  }

  console.log('\n====================================================\n');
}

runAudit();
