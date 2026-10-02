const http = require('http');

async function measureUrl(urlPath) {
  const start = process.hrtime.bigint();
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          bytes: Buffer.byteLength(data, 'utf8')
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('====================================================');
  console.log('🚀 RUNNING AQ COMPANIES PERFORMANCE BENCHMARK');
  console.log('====================================================\n');

  console.log('1. Cold page compilation:');
  const coldPage = await measureUrl('/');
  console.log(`   GET / -> ${coldPage.statusCode} (${coldPage.durationMs}ms, ${(coldPage.bytes / 1024).toFixed(1)} KB)`);

  console.log('\n2. Warm page load:');
  const warmPage = await measureUrl('/');
  console.log(`   GET / -> ${warmPage.statusCode} (${warmPage.durationMs}ms, ${(warmPage.bytes / 1024).toFixed(1)} KB)`);

  console.log('\n3. Core API Endpoint Latency & Payloads:');
  const endpoints = [
    '/api/bol',
    '/api/documents',
    '/api/account-ledgers',
    '/api/bol-account-ledgers',
    '/api/invoices',
    '/api/shipments',
    '/api/templates',
    '/api/health'
  ];

  for (const ep of endpoints) {
    try {
      const res = await measureUrl(ep);
      console.log(`   GET ${ep.padEnd(26)} -> ${res.statusCode} (${res.durationMs.toString().padStart(6)}ms, ${(res.bytes / 1024).toFixed(1).padStart(6)} KB)`);
    } catch (e) {
      console.log(`   GET ${ep.padEnd(26)} -> FAILED: ${e.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('🏁 BENCHMARK COMPLETED');
  console.log('====================================================');
}

run().catch(console.error);
