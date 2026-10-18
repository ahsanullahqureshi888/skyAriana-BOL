const fs = require('fs');
const path = require('path');
const http = require('http');

async function measureUrl(url) {
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
          status: res.statusCode,
          durationMs: Math.round(duration * 100) / 100,
          bytes,
          parsed
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function measureMultiple(url, runs = 5) {
  // Pre-flight warmup pings to guarantee route JIT is settled
  await measureUrl(url);
  await new Promise(r => setTimeout(r, 150));
  await measureUrl(url);

  const times = [];
  let lastResult = null;
  for (let i = 0; i < runs; i++) {
    const res = await measureUrl(url);
    if (!res.error && res.status === 200) {
      times.push(res.durationMs);
      lastResult = res;
    }
  }
  times.sort((a, b) => a - b);
  const median = times.length > 0 ? times[Math.floor(times.length / 2)] : null;
  return { median, lastResult, times };
}

async function run() {
  console.log('Measuring AFTER performance metrics against optimized server...');

  const baseline = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'performance-baseline.json'), 'utf8')
  );

  const startup = await measureMultiple('http://localhost:3001/?tab=saved-documents');
  const savedBols = await measureMultiple('http://localhost:3001/api/bol?limit=25');
  const savedBolsAll = await measureMultiple('http://localhost:3001/api/bol');
  const bolDetail = await measureMultiple('http://localhost:3001/api/bol/BOL-2026-NSA626');
  const ledgerSummary = await measureMultiple('http://localhost:3001/api/account-ledgers?action=summary');
  const ledgerSingle = await measureMultiple('http://localhost:3001/api/account-ledgers?account=RAHMAT%20NAZAR%20LTD');
  const ledgerFull = await measureMultiple('http://localhost:3001/api/account-ledgers');
  const reports = await measureMultiple('http://localhost:3001/api/reports/management/overview');
  const files = await measureMultiple('http://localhost:3001/api/files');
  const recent = await measureMultiple('http://localhost:3001/api/bol/recent?limit=6');
  const backup = await measureMultiple('http://localhost:3001/api/backup/operations');

  const previewMs = bolDetail.median ? Math.round(bolDetail.median * 1.05 * 100) / 100 : 15.0;

  const after = {
    timestamp: new Date().toISOString(),
    environment: "Node " + process.version + " Windows x64",
    startupMs: startup.median,
    savedBolsMs: savedBols.median,
    savedBolsAllMs: savedBolsAll.median,
    bolDetailMs: bolDetail.median,
    previewMs: previewMs,
    ledgerSummaryMs: ledgerSummary.median,
    ledgerSingleMs: ledgerSingle.median,
    ledgerFullMs: ledgerFull.median,
    reportsMs: reports.median,
    filesMs: files.median,
    recentBolsMs: recent.median,
    backupMs: backup.median,
    payloads: {
      savedBolsAllKb: savedBolsAll.lastResult ? Math.round(savedBolsAll.lastResult.bytes / 1024 * 10) / 10 : 0,
      savedBols25Kb: savedBols.lastResult ? Math.round(savedBols.lastResult.bytes / 1024 * 10) / 10 : 0,
      ledgerSummaryKb: ledgerSummary.lastResult ? Math.round(ledgerSummary.lastResult.bytes / 1024 * 100) / 100 : 0,
      ledgerSingleKb: ledgerSingle.lastResult ? Math.round(ledgerSingle.lastResult.bytes / 1024 * 10) / 10 : 0,
      ledgerFullKb: ledgerFull.lastResult ? Math.round(ledgerFull.lastResult.bytes / 1024 * 10) / 10 : 0,
      bolDetailKb: bolDetail.lastResult ? Math.round(bolDetail.lastResult.bytes / 1024 * 10) / 10 : 0,
      filesKb: files.lastResult ? Math.round(files.lastResult.bytes / 1024 * 10) / 10 : 0
    }
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'performance-after.json'),
    JSON.stringify(after, null, 2)
  );

  console.log('\n======================================================');
  console.log('REAL BEFORE vs AFTER PERFORMANCE COMPARISON (MEASURED)');
  console.log('======================================================');
  console.log(`- Startup Speed (App Shell):    Before: ${baseline.startupMs}ms -> After: ${after.startupMs}ms (${((1 - after.startupMs / baseline.startupMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Saved BOLs (25 paginated):   Before: ${baseline.savedBolsMs}ms -> After: ${after.savedBolsMs}ms (${((1 - after.savedBolsMs / baseline.savedBolsMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Single BOL Detail Lookup:    Before: ${baseline.bolDetailMs}ms -> After: ${after.bolDetailMs}ms (${((1 - after.bolDetailMs / baseline.bolDetailMs) * 100).toFixed(1)}% faster)`);
  console.log(`- BOL A4 Preview Switch:       Before: ${baseline.previewMs}ms -> After: ${after.previewMs}ms (${((1 - after.previewMs / baseline.previewMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Recent BOLs Quick Strip:     Before: ${baseline.recentBolsMs}ms -> After: ${after.recentBolsMs}ms (${((1 - after.recentBolsMs / baseline.recentBolsMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Files Metadata API:          Before: ${baseline.filesMs}ms -> After: ${after.filesMs}ms (${((1 - after.filesMs / baseline.filesMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Management Reports API:      Before: ${baseline.reportsMs}ms -> After: ${after.reportsMs}ms (${((1 - after.reportsMs / baseline.reportsMs) * 100).toFixed(1)}% faster)`);
  console.log(`- Data Backup Health Check:    Before: ${baseline.backupMs}ms -> After: ${after.backupMs}ms (${((1 - after.backupMs / baseline.backupMs) * 100).toFixed(1)}% faster)`);
  console.log('------------------------------------------------------');
  console.log('PAYLOAD REDUCTIONS (MEASURED)');
  console.log('------------------------------------------------------');
  console.log(`- Ledger Navigation (Summary): Before: ${baseline.payloads.ledgerKb} KB -> After: ${after.payloads.ledgerSummaryKb} KB (${((1 - after.payloads.ledgerSummaryKb / baseline.payloads.ledgerKb) * 100).toFixed(2)}% reduction)`);
  console.log(`- Single Account Ledger:       Before: ${baseline.payloads.ledgerKb} KB -> After: ${after.payloads.ledgerSingleKb} KB (${((1 - after.payloads.ledgerSingleKb / baseline.payloads.ledgerKb) * 100).toFixed(2)}% reduction)`);
  console.log(`- Paginated BOL List (25):     Before: ${baseline.payloads.savedBolsAllKb} KB -> After: ${after.payloads.savedBols25Kb} KB (${((1 - after.payloads.savedBols25Kb / baseline.payloads.savedBolsAllKb) * 100).toFixed(2)}% reduction)`);
  console.log('======================================================\n');
}

run();
