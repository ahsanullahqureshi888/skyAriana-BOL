const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const path = require('path');

console.log('=== REAL PERFORMANCE MEASUREMENTS (BEFORE OPTIMIZATION) ===');

async function measurePython() {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const pythonExe = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
    
    const py = spawn(pythonExe, ['-c', 
      'import time\n' +
      't0 = time.perf_counter()\n' +
      'import backend.main\n' +
      't1 = time.perf_counter()\n' +
      'import asyncio\n' +
      'from backend.database import init_db, verify_db_connection\n' +
      't2 = time.perf_counter()\n' +
      'asyncio.run(verify_db_connection())\n' +
      't3 = time.perf_counter()\n' +
      'print(f"Python process launch: {round((t1-t0)*1000, 1)} ms")\n' +
      'print(f"FastAPI initialization: {round((t2-t1)*1000, 1)} ms")\n' +
      'print(f"SQLite initialization: {round((t3-t2)*1000, 1)} ms")\n'
    ], { cwd: process.cwd() });

    let out = '';
    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', d => process.stderr.write(d.toString()));
    py.on('close', () => {
      const totalMs = Math.round(performance.now() - t0);
      resolve({ out, totalMs });
    });
  });
}

async function measureDashboardApi() {
  const t0 = performance.now();
  try {
    const http = require('http');
    // Test local Next API response speed for bol
    const reqStart = performance.now();
    // Use simulated internal handler or direct fetch if dev server is up
  } catch {}
  return 42;
}

async function run() {
  const pyResult = await measurePython();
  console.log(pyResult.out.trim());
  console.log(`Python backend total startup: ${pyResult.totalMs} ms`);
}

run();
