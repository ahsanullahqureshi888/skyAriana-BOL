/**
 * Startup and Module Load Performance Benchmark
 * Measures real timings for AQ COMPANIES Logistics & BOL Management
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function measurePythonAndDatabase() {
  console.log('--- Measuring Python Backend & Database Startup ---');
  const pythonPath = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
  
  if (!fs.existsSync(pythonPath)) {
    console.warn('Python venv executable not found at', pythonPath);
    return { pythonImportMs: 0, initDbMs: 0, healthMs: 0 };
  }

  const projectRoot = path.join(__dirname, '..');

  // 1. Measure DB import and init_db execution using temp python script
  const tempScript1 = path.join(__dirname, '_temp_measure1.py');
  const pyCode1 = `import sys, time, asyncio
sys.path.insert(0, r"${projectRoot}")
t0 = time.perf_counter()
from backend.database import init_db
t1 = time.perf_counter()
asyncio.run(init_db())
t2 = time.perf_counter()
print(f"PY_DB_IMPORT_MS:{(t1-t0)*1000:.2f}")
print(f"PY_INIT_DB_MS:{(t2-t1)*1000:.2f}")
`;
  fs.writeFileSync(tempScript1, pyCode1);
  let pythonImportMs = 0;
  let initDbMs = 0;
  try {
    const out1 = execSync(`"${pythonPath}" "${tempScript1}"`, { cwd: projectRoot, encoding: 'utf8' });
    const importMatch = out1.match(/PY_DB_IMPORT_MS:([\d\.]+)/);
    const initDbMatch = out1.match(/PY_INIT_DB_MS:([\d\.]+)/);
    pythonImportMs = importMatch ? parseFloat(importMatch[1]) : 0;
    initDbMs = initDbMatch ? parseFloat(initDbMatch[1]) : 0;
  } finally {
    if (fs.existsSync(tempScript1)) fs.unlinkSync(tempScript1);
  }

  // 2. Measure FastAPI app import and health check latency
  const tempScript2 = path.join(__dirname, '_temp_measure2.py');
  const pyCode2 = `import sys, time
sys.path.insert(0, r"${projectRoot}")
from fastapi.testclient import TestClient
from backend.main import app
client = TestClient(app)
t0 = time.perf_counter()
res = client.get('/api/v1/health')
t1 = time.perf_counter()
print(f"PY_HEALTH_MS:{(t1-t0)*1000:.2f}")
print(f"PY_HEALTH_CODE:{res.status_code}")
`;
  fs.writeFileSync(tempScript2, pyCode2);
  let healthMs = 0;
  let statusCode = 0;
  try {
    const out2 = execSync(`"${pythonPath}" "${tempScript2}"`, { cwd: projectRoot, encoding: 'utf8' });
    const healthMatch = out2.match(/PY_HEALTH_MS:([\d\.]+)/);
    const codeMatch = out2.match(/PY_HEALTH_CODE:(\d+)/);
    healthMs = healthMatch ? parseFloat(healthMatch[1]) : 0;
    statusCode = codeMatch ? parseInt(codeMatch[1], 10) : 0;
  } finally {
    if (fs.existsSync(tempScript2)) fs.unlinkSync(tempScript2);
  }

  return { pythonImportMs, initDbMs, healthMs, statusCode };
}

function auditRootImports() {
  console.log('\n--- Auditing Root Bundle & Root Layout Imports ---');
  const filesToAudit = [
    'app/layout.tsx',
    'app/page.tsx',
    'lib/app-context.tsx',
    'components/header.tsx'
  ];

  const heavyLibraries = ['jspdf', '@react-pdf', 'pdfmake', 'pdf-lib', 'xlsx', 'exceljs', 'chart.js', 'recharts'];
  const auditResults = {};

  for (const file of filesToAudit) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
    auditResults[file] = {};
    for (const lib of heavyLibraries) {
      const regex = new RegExp(`from\\s+['"][^'"]*${lib}[^'"]*['"]|import\\s*\\(['"][^'"]*${lib}`, 'i');
      auditResults[file][lib] = regex.test(content);
    }
  }

  let allClean = true;
  for (const [file, libs] of Object.entries(auditResults)) {
    const found = Object.entries(libs).filter(([_, has]) => has).map(([lib]) => lib);
    if (found.length > 0) {
      console.log(`[WARNING] Heavy library import detected in ${file}: ${found.join(', ')}`);
      allClean = false;
    } else {
      console.log(`[CLEAN] ${file}: 0 heavy libraries imported directly.`);
    }
  }
  return { allClean, auditResults };
}

async function measureModuleLoadEmulation() {
  console.log('\n--- Measuring Module Disk Read & Parse Latencies ---');
  const modules = [
    { name: 'Bill of Lading (BOLEditor)', path: 'components/bill-of-lading/bol-editor.tsx' },
    { name: 'Saved BOLs / Shipments (ControlTowerView)', path: 'components/control-tower/control-tower-view.tsx' },
    { name: 'Customer Accounts & Ledger (LedgerView)', path: 'components/ledger-view.tsx' },
    { name: 'Invoices (InvoiceView)', path: 'components/invoice-view.tsx' },
    { name: 'Reports Center (ReportsView)', path: 'components/reports-view.tsx' }
  ];

  const results = [];
  for (const mod of modules) {
    const fullPath = path.join(__dirname, '..', mod.path);
    if (!fs.existsSync(fullPath)) continue;
    
    // Cold read
    const t0 = performance.now();
    const stat = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const t1 = performance.now();
    const coldMs = +(t1 - t0).toFixed(2);

    // Warm read
    const t2 = performance.now();
    const contentWarm = fs.readFileSync(fullPath, 'utf8');
    const t3 = performance.now();
    const warmMs = +(t3 - t2).toFixed(2);

    results.push({
      name: mod.name,
      sizeBytes: stat.size,
      coldDiskMs: coldMs,
      warmDiskMs: warmMs
    });
    console.log(`  ${mod.name} (${(stat.size / 1024).toFixed(1)} KB): Cold: ${coldMs}ms | Warm: ${warmMs}ms`);
  }
  return results;
}

async function runBenchmark() {
  const pyResults = await measurePythonAndDatabase();
  console.log(`Python DB Import: ${pyResults.pythonImportMs} ms`);
  console.log(`Database Init (init_db fast-path): ${pyResults.initDbMs} ms`);
  console.log(`FastAPI Health Check: ${pyResults.healthMs} ms (status: ${pyResults.statusCode})`);

  const importAudit = auditRootImports();
  const moduleEmulation = await measureModuleLoadEmulation();

  console.log('\n================ BENCHMARK SUMMARY ================');
  console.log('Backend DB Import Time:', pyResults.pythonImportMs.toFixed(2), 'ms');
  console.log('Database init_db Fast-Path:', pyResults.initDbMs.toFixed(2), 'ms');
  console.log('FastAPI Health Check Latency:', pyResults.healthMs.toFixed(2), 'ms');
  console.log('Root Imports Clean:', importAudit.allClean ? 'YES (0 heavy libraries in root)' : 'NO');
  console.log('====================================================\n');
}

runBenchmark().catch(console.error);
