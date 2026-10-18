const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

async function runProfile() {
  console.log('====================================================');
  console.log('📊 AQ COMPANIES — COMPREHENSIVE PERFORMANCE PROFILE (BEFORE)');
  console.log('====================================================\n');

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const networkStats = {
    totalRequests: 0,
    apiCalls: [],
    jsRequests: [],
    totalJsBytes: 0,
    totalBytes: 0,
  };

  const requestStartTimes = new Map();

  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    requestStartTimes.set(details.id, Date.now());
    callback({});
  });

  win.webContents.session.webRequest.onCompleted((details) => {
    const start = requestStartTimes.get(details.id) || Date.now();
    const duration = Date.now() - start;
    networkStats.totalRequests++;

    const isApi = details.url.includes('/api/');
    const isJs = details.url.includes('.js') || details.resourceType === 'script';

    if (isApi) {
      networkStats.apiCalls.push({
        url: details.url.replace('http://127.0.0.1:3001', ''),
        statusCode: details.statusCode,
        durationMs: duration
      });
    }
    if (isJs) {
      networkStats.jsRequests.push({
        url: details.url,
        durationMs: duration
      });
    }
  });

  // Pre-seed admin session
  console.log('1. Measuring Cold Application Startup...');
  const tStart = Date.now();
  await win.loadURL('http://127.0.0.1:3001');

  // Wait for initial render
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('main') || (document.body && document.body.innerText && document.body.innerText.length > 50)) {
          resolve(true);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    })
  `);
  const appStartupTime = Date.now() - tStart;
  console.log(`   App startup time: ${appStartupTime} ms`);

  // Ensure Admin login in localStorage
  await win.webContents.executeJavaScript(`
    try {
      const adminUser = {
        id: "usr-admin-1",
        username: "admin",
        name: "System Administrator",
        role: "superadmin",
        email: "admin@skyariana.com",
        avatar: "/logo.png"
      };
      localStorage.setItem("skybol:user", JSON.stringify(adminUser));
      sessionStorage.setItem("skybol:user", JSON.stringify(adminUser));
    } catch(e){}
  `);

  // Reload to test authenticated startup
  console.log('\n2. Measuring Authenticated App Startup & Bundle Metrics...');
  const tAuthStart = Date.now();
  await win.loadURL('http://127.0.0.1:3001');

  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('button') || document.querySelector('[role="tablist"]')) {
          resolve(true);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    })
  `);
  const authStartupTime = Date.now() - tAuthStart;
  console.log(`   Authenticated App startup time: ${authStartupTime} ms`);
  console.log(`   Startup network requests count: ${networkStats.totalRequests}`);
  console.log(`   Startup API calls count: ${networkStats.apiCalls.length}`);
  console.log(`   Startup JS chunks loaded: ${networkStats.jsRequests.length}`);

  // Measure Memory Usage
  const mem = await process.getProcessMemoryInfo();
  console.log(`   Electron Process Memory: Resident = ${(mem.residentSet / 1024).toFixed(1)} MB`);

  const browserMem = await win.webContents.executeJavaScript(`
    (function() {
      if (window.performance && window.performance.memory) {
        return {
          totalJSHeapSize: (window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1),
          usedJSHeapSize: (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1),
          jsHeapSizeLimit: (window.performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1)
        };
      }
      return null;
    })()
  `);
  if (browserMem) {
    console.log(`   Chromium JS Heap: Used = ${browserMem.usedJSHeapSize} MB / Total = ${browserMem.totalJSHeapSize} MB`);
  }

  // Measure Modules Opening Time
  console.log('\n3. Measuring Modules & Tabs Opening Time...');

  // Helper for view switching measurement
  async function measureView(viewName, viewKey, selectorToWaitFor) {
    const t0 = Date.now();
    await win.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('skybol:navigate-view', { detail: { view: '${viewKey}' } }));
    `);

    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          const el = document.querySelector('${selectorToWaitFor}');
          if (el && el.getBoundingClientRect().height > 0) {
            resolve(true);
          } else if (Date.now() - start > 15000) {
            resolve(false);
          } else {
            setTimeout(check, 40);
          }
        };
        check();
      })
    `);
    const duration = Date.now() - t0;
    console.log(`   ${viewName.padEnd(20)}: ${duration} ms`);
    return duration;
  }

  const bolEditorTime = await measureView('BOL Editor', 'bol', 'input');
  
  // Measure A4 Preview Opening Time
  console.log('   Measuring A4 Preview switch...');
  const tA4Start = Date.now();
  await win.webContents.executeJavaScript(`
    (function() {
      window.dispatchEvent(new CustomEvent('skybol:editor-action', { detail: { tab: 'preview' } }));
      const trigger = document.querySelector('[data-tab="preview"]') || document.querySelector('#\\\\:r1\\\\:-trigger-preview') || document.querySelector('[value="preview"]');
      if (trigger) {
        trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    })();
  `);

  const a4Loaded = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const preview = document.querySelector('[data-a4-stage="true"]') || document.querySelector('[data-a4-preview="true"]') || document.querySelector('#bol-a4-preview-document');
        if (preview && preview.getBoundingClientRect().height > 0) {
          resolve(true);
        } else if (Date.now() - start > 15000) {
          resolve(false);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    })
  `);
  const a4PreviewTime = Date.now() - tA4Start;
  console.log(`   A4 Preview Opening  : ${a4PreviewTime} ms (Loaded: ${a4Loaded})`);

  // Saved BOLs
  const savedBolsTime = await measureView('Saved BOLs', 'shipments', 'table, [data-shipment-list], [data-view-root]');

  // Files Center
  const filesTime = await measureView('Files Center', 'file-center', '[data-file-center], table, div');

  // Report Center
  const reportsTime = await measureView('Report Center', 'reports', '[data-reports-center], table, div');

  // BOL Settings
  const settingsTime = await measureView('BOL Settings', 'settings', '[data-settings-view], form, div');

  // Search Response Time
  console.log('\n4. Measuring Search Response Time...');
  const tSearchStart = Date.now();
  const searchResult = await win.webContents.executeJavaScript(`
    (async function() {
      const start = performance.now();
      const res = await fetch('/api/parties/search?role=SHIPPER&q=KABUL&limit=20');
      const data = await res.json();
      return {
        duration: Math.round(performance.now() - start),
        count: Array.isArray(data) ? data.length : 0
      };
    })()
  `);
  console.log(`   Party Search (q=KABUL): ${searchResult.duration} ms (${searchResult.count} results)`);

  const globalSearch = await win.webContents.executeJavaScript(`
    (async function() {
      const start = performance.now();
      const res = await fetch('/api/search?q=NSA');
      const data = await res.json();
      return {
        duration: Math.round(performance.now() - start)
      };
    })()
  `);
  console.log(`   Global Search (q=NSA): ${globalSearch.duration} ms`);

  // Measure Bundle Size in .next / static
  console.log('\n5. Measuring Next.js Bundle Size on Disk...');
  let totalJsSize = 0;
  let jsFileCount = 0;
  const nextStaticDir = path.resolve('.next/static');
  if (fs.existsSync(nextStaticDir)) {
    function walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full);
        else if (entry.isFile() && entry.name.endsWith('.js')) {
          totalJsSize += fs.statSync(full).size;
          jsFileCount++;
        }
      }
    }
    walkDir(nextStaticDir);
    console.log(`   .next/static JavaScript chunks: ${jsFileCount} files, ${(totalJsSize / (1024 * 1024)).toFixed(2)} MB`);
  }

  // Summary Table of Before Metrics
  const profileResults = {
    appStartupTime,
    authStartupTime,
    totalJsSizeMB: (totalJsSize / (1024 * 1024)).toFixed(2),
    startupRequests: networkStats.totalRequests,
    startupApiCalls: networkStats.apiCalls.length,
    bolEditorTime,
    a4PreviewTime,
    savedBolsTime,
    filesTime,
    reportsTime,
    settingsTime,
    searchTime: searchResult.duration,
    globalSearchTime: globalSearch.duration,
    residentMemoryMB: (mem.residentSet / 1024).toFixed(1),
    jsHeapUsedMB: browserMem ? browserMem.usedJSHeapSize : 'N/A',
    apiCalls: networkStats.apiCalls
  };

  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/profile-before.json', JSON.stringify(profileResults, null, 2));

  console.log('\n====================================================');
  console.log('📋 SUMMARY: BEFORE METRICS RECORDED');
  console.log('====================================================');
  console.log(`- App Startup (Cold)   : ${appStartupTime} ms`);
  console.log(`- App Startup (Auth)   : ${authStartupTime} ms`);
  console.log(`- BOL Editor           : ${bolEditorTime} ms`);
  console.log(`- A4 Preview           : ${a4PreviewTime} ms`);
  console.log(`- Saved BOLs           : ${savedBolsTime} ms`);
  console.log(`- Files Module         : ${filesTime} ms`);
  console.log(`- Report Center        : ${reportsTime} ms`);
  console.log(`- BOL Settings         : ${settingsTime} ms`);
  console.log(`- Search Response      : ${searchResult.duration} ms`);
  console.log(`- Initial JS on Disk   : ${(totalJsSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Startup API Calls    : ${networkStats.apiCalls.length}`);
  console.log(`- Memory Usage (RSS)   : ${(mem.residentSet / 1024).toFixed(1)} MB`);
  console.log('====================================================\n');

  app.quit();
}

app.whenReady().then(runProfile);
