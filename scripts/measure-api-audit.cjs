const http = require('http');

const endpoints = [
  { name: 'Frontend Shell', url: 'http://127.0.0.1:3001/' },
  { name: 'Current BOL (Next Number)', url: 'http://127.0.0.1:3001/api/bol?action=next-number' },
  { name: 'Saved BOL API (Full List)', url: 'http://127.0.0.1:3001/api/bol' },
  { name: 'Saved BOL API (Paged p=1&limit=50)', url: 'http://127.0.0.1:3001/api/bol?page=1&limit=50' },
  { name: 'Account Ledgers API', url: 'http://127.0.0.1:3001/api/account-ledgers' },
  { name: 'BOL Account Ledgers API', url: 'http://127.0.0.1:3001/api/bol-account-ledgers' },
  { name: 'Treasury Accounts API', url: 'http://127.0.0.1:3001/api/accounting/treasury/accounts' },
  { name: 'FastAPI Health', url: 'http://127.0.0.1:8000/api/v1/health' },
  { name: 'FastAPI BOL List', url: 'http://127.0.0.1:8000/api/v1/bols?page=1&page_size=50' }
];

async function run() {
  console.log('================ PHASE 1: API AUDIT TIMINGS ================');
  for (const ep of endpoints) {
    const t0 = performance.now();
    try {
      const res = await fetch(ep.url);
      const text = await res.text();
      const t1 = performance.now();
      const dur = (t1 - t0).toFixed(2);
      const sizeKb = (Buffer.byteLength(text, 'utf8') / 1024).toFixed(1);
      console.log(`${ep.name.padEnd(35)} : ${dur.padStart(8)} ms | Status: ${res.status} | Size: ${sizeKb.padStart(7)} KB`);
    } catch (err) {
      console.log(`${ep.name.padEnd(35)} : FAILED (${err.message})`);
    }
  }
  console.log('============================================================');
}

run();
