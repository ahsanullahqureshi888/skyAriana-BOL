/**
 * Sky Ariana BOL — Full Automated E2E Browser Testing Engine
 * Powered by Chromium (Electron Headless/Offscreen)
 * Implements Phases 3, 4, 5, 6, 11, 12, 14
 */

const fs = require('fs');
const path = require('path');

const logFile = path.resolve('test-results/e2e-run.log');
fs.writeFileSync(logFile, `[${new Date().toISOString()}] E2E Suite Initializing...\n`);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  process.stdout.write(msg + '\n');
}

const { app, BrowserWindow } = require('electron');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

const SCREEN_SIZES = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1600x900',  width: 1600, height: 900 },
  { name: '1440x900',  width: 1440, height: 900 },
  { name: '1366x768',  width: 1366, height: 768 },
  { name: '1280x720',  width: 1280, height: 720 },
  { name: '1024x768',  width: 1024, height: 768 },
  { name: '768x1024',  width: 768,  height: 1024 },
  { name: '430x932',   width: 430,  height: 932, isMobile: true },
  { name: '390x844',   width: 390,  height: 844, isMobile: true }
];

const MAJOR_VIEWS = [
  { name: 'BOL Editor', viewKey: 'bol' },
  { name: 'Saved BOLs', viewKey: 'shipments' },
  { name: 'Files Center', viewKey: 'file-center' },
  { name: 'Report Center', viewKey: 'reports' },
  { name: 'Account Ledger', viewKey: 'ledger' },
  { name: 'BOL Settings', viewKey: 'settings' }
];

const results = {
  startedAt: new Date().toISOString(),
  phases: {},
  consoleErrors: [],
  failedRequests: [],
  screenshots: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

function recordTest(phase, name, passed, details = {}) {
  results.summary.total++;
  if (passed) {
    results.summary.passed++;
    log(`  ✅ [PASS] ${name}`);
  } else {
    results.summary.failed++;
    log(`  ❌ [FAIL] ${name}: ${JSON.stringify(details)}`);
  }
  if (!results.phases[phase]) results.phases[phase] = [];
  results.phases[phase].push({ name, passed, details });
}

async function captureScreenshot(win, fileName) {
  try {
    const img = await win.webContents.capturePage();
    const outPath = path.resolve('test-results/screenshots', fileName);
    fs.writeFileSync(outPath, img.toPNG());
    results.screenshots.push(fileName);
    log(`  📸 Screenshot saved: ${fileName}`);
    return outPath;
  } catch (err) {
    log(`Failed to capture screenshot: ${err.message}`);
    return null;
  }
}

app.whenReady().then(async () => {
  log('====================================================');
  log('🚢 SKY ARIANA BOL - AUTOMATED E2E TEST SUITE');
  log(`   Chromium Engine v${process.versions.chrome}`);
  log('====================================================\n');

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

  win.webContents.on('console-message', (event) => {
    if (event.level >= 3) {
      results.consoleErrors.push({
        message: event.message,
        source: event.sourceId,
        line: event.lineNumber
      });
      log(`  ⚠️ Console Error: ${event.message}`);
    }
  });

  win.webContents.session.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400 && !details.url.includes('favicon') && !details.url.includes('_rsc')) {
      results.failedRequests.push({
        url: details.url,
        statusCode: details.statusCode,
        method: details.method
      });
      log(`  ⚠️ Failed Request: [${details.statusCode}] ${details.url}`);
    }
  });

  try {
    log('🌐 Loading App at http://127.0.0.1:3001 ...');
    await win.loadURL('http://127.0.0.1:3001');

    // Wait for App to mount
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const check = () => {
          if (document.querySelector('main') || document.querySelector('[data-a4-stage]') || (document.body && document.body.innerText && document.body.innerText.length > 30)) {
            resolve(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      })
    `);

    // Ensure session is authenticated as admin for full view access
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
      } catch (e) {}
    `);

    // Reload with authenticated storage
    await win.loadURL('http://127.0.0.1:3001');
    await new Promise(r => setTimeout(r, 1000));

    // ====================================================
    // PHASE 3 & PHASE 6: RESPONSIVE OVERFLOW & MULTI-VIEWPORT TESTS
    // ====================================================
    log('\n--- PHASE 3 & 6: RESPONSIVE OVERFLOW & MULTI-VIEWPORT TESTS ---');

    for (const size of SCREEN_SIZES) {
      log(`\nTesting Viewport: ${size.name} (${size.width}x${size.height})`);
      win.setSize(size.width, size.height);
      await new Promise(r => setTimeout(r, 200));

      for (const view of MAJOR_VIEWS) {
        // Dispatch navigation event
        await win.webContents.executeJavaScript(`
          window.dispatchEvent(new CustomEvent('skybol:navigate-view', { detail: { view: '${view.viewKey}' } }));
        `);
        await new Promise(r => setTimeout(r, 350));

        // Evaluate scrollWidth vs clientWidth
        const overflowData = await win.webContents.executeJavaScript(`
          (() => {
            const root = document.documentElement;
            const scrollW = root.scrollWidth;
            const clientW = root.clientWidth;
            const overflow = scrollW - clientW;

            let offendingSelector = null;
            let offendingPixels = 0;

            if (overflow > 1) {
              const allEls = document.querySelectorAll('*');
              for (const el of allEls) {
                const rect = el.getBoundingClientRect();
                if (rect.right > clientW + 1) {
                  offendingSelector = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '');
                  offendingPixels = Math.round(rect.right - clientW);
                  break;
                }
              }
            }

            return {
              scrollW,
              clientW,
              overflow: Math.max(0, overflow),
              offendingSelector,
              offendingPixels
            };
          })()
        `);

        const hasNoOverflow = overflowData.overflow <= 1;
        if (!hasNoOverflow) {
          const ssName = `${view.viewKey}-overflow-${size.name}.png`;
          await captureScreenshot(win, ssName);
        }

        recordTest(
          'Phase 6 - Responsive Overflow',
          `No horizontal overflow on ${view.name} at ${size.name}`,
          hasNoOverflow,
          overflowData
        );
      }
    }

    // Helper: Wait for condition in webContents
    async function waitFor(fnStr, timeoutMs = 8000, intervalMs = 150) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await win.webContents.executeJavaScript(fnStr);
          if (res) return res;
        } catch (e) {}
        await new Promise(r => setTimeout(r, intervalMs));
      }
      return null;
    }

    // ====================================================
    // PHASE 4: A4 PREVIEW INTERACTIVITY & SCALE TESTS
    // ====================================================
    log('\n--- PHASE 4: A4 PREVIEW INTERACTIVITY TESTS ---');
    win.setSize(1920, 1080);
    await win.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('skybol:navigate-view', { detail: { view: 'bol' } }));
    `);

    // Wait for BOL Editor to be mounted in DOM
    const editorMounted = await waitFor(`
      Boolean(document.querySelector('[data-tab="preview"]') || document.querySelector('[role="tab"]'))
    `, 10000);
    log(`  BOL Editor mounted: ${Boolean(editorMounted)}`);
    await new Promise(r => setTimeout(r, 1500));

    // Switch to Preview Tab inside BOL Editor via editor action and tab trigger
    await win.webContents.executeJavaScript(`
      (() => {
        window.dispatchEvent(new CustomEvent('skybol:editor-action', { detail: { action: 'preview', tab: 'preview' } }));
        const previewBtn = document.querySelector('[data-tab="preview"]') || Array.from(document.querySelectorAll('[role="tab"]')).find(el => (el.textContent || '').includes('Preview'));
        if (previewBtn) {
          previewBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          previewBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          previewBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
          previewBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          previewBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()
    `);

    // Wait specifically for A4 Preview toolbar and Fit Page button to render (with retry)
    let toolbarRendered = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      toolbarRendered = await win.webContents.executeJavaScript(`
        Boolean(document.querySelector('[data-fit-page="true"]') || document.querySelector('.a4-preview-toolbar'))
      `);
      if (toolbarRendered) break;
      await win.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('skybol:editor-action', { detail: { action: 'preview', tab: 'preview' } }));
      `);
      await new Promise(r => setTimeout(r, 500));
    }
    log(`  A4 Preview toolbar rendered: ${Boolean(toolbarRendered)}`);
    await new Promise(r => setTimeout(r, 600));

    // Verify A4 Preview is visible and metrics are valid
    const a4Metrics = await win.webContents.executeJavaScript(`
      (() => {
        const doc = document.querySelector('[data-bol-a4="true"]') || document.querySelector('[data-a4-stage="true"]');
        if (!doc) return { found: false, visible: false, width: 0, height: 0 };

        const rect = doc.getBoundingClientRect();
        const style = window.getComputedStyle(doc);

        return {
          found: true,
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          opacity: parseFloat(style.opacity || '1'),
          display: style.display,
          visibility: style.visibility,
          transform: style.transform
        };
      })()
    `);

    recordTest('Phase 4 - A4 Preview', 'A4 document is visible and rendered', a4Metrics.found && a4Metrics.visible, a4Metrics);
    recordTest('Phase 4 - A4 Preview', 'A4 dimensions are strictly positive', a4Metrics.width > 0 && a4Metrics.height > 0, { width: a4Metrics.width, height: a4Metrics.height });

    // Test Fit Page, Fit Width, and Zoom steppers
    const zoomControls = await win.webContents.executeJavaScript(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent ? b.textContent.trim() : '',
          title: b.title || ''
        }));
        const fitPageBtn = document.querySelector('[data-fit-page="true"]') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent && b.textContent.includes('Fit Page')) || (b.title && b.title.includes('Fit complete')));
        const fitWidthBtn = document.querySelector('[data-fit-width="true"]') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent && b.textContent.includes('Fit Width')) || (b.title && b.title.includes('Fit document width')));
        const zoomInBtn = document.querySelector('button[title*="Zoom In"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('+'));
        const zoomOutBtn = document.querySelector('button[title*="Zoom Out"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('-'));

        return {
          hasFitPage: Boolean(fitPageBtn),
          hasFitWidth: Boolean(fitWidthBtn),
          hasZoomIn: Boolean(zoomInBtn),
          hasZoomOut: Boolean(zoomOutBtn),
          buttons
        };
      })()
    `);

    recordTest('Phase 4 - A4 Preview', 'Fit Page button available', zoomControls.hasFitPage, { hasFitPage: zoomControls.hasFitPage });
    recordTest('Phase 4 - A4 Preview', 'Fit Width button available', zoomControls.hasFitWidth, { hasFitWidth: zoomControls.hasFitWidth });
    recordTest('Phase 4 - A4 Preview', 'Zoom controls available', zoomControls.hasZoomIn && zoomControls.hasZoomOut, { hasZoomIn: zoomControls.hasZoomIn, hasZoomOut: zoomControls.hasZoomOut });

    // Click Fit Page and capture screenshot
    await win.webContents.executeJavaScript(`
      (() => {
        const b = document.querySelector('[data-fit-page="true"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Fit Page'));
        if (b) b.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));
    await captureScreenshot(win, 'a4-preview-fit-page-1920x1080.png');

    // Click Fit Width and capture screenshot
    await win.webContents.executeJavaScript(`
      (() => {
        const b = document.querySelector('[data-fit-width="true"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Fit Width'));
        if (b) b.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));
    await captureScreenshot(win, 'a4-preview-fit-width-1920x1080.png');

    // ====================================================
    // PHASE 5: BLANK A4 PERMANENT REGRESSION TEST
    // ====================================================
    log('\n--- PHASE 5: BLANK A4 PERMANENT REGRESSION SUITE ---');

    // Wait for document to settle in DOM
    await waitFor(`
      Boolean(document.querySelector('[data-bol-a4="true"]') || document.querySelector('[data-bol-page="true"]') || document.querySelector('.bol-a4-page') || document.querySelector('[data-a4-stage="true"]'))
    `, 6000);

    const blankA4Check = await win.webContents.executeJavaScript(`
      (() => {
        const doc = document.querySelector('[data-bol-a4="true"]') || document.querySelector('[data-bol-page="true"]') || document.querySelector('.bol-a4-page') || document.querySelector('[data-a4-stage="true"]');
        if (!doc) return { pass: false, reason: 'BOLDocument element not found in DOM' };

        const style = window.getComputedStyle(doc);
        const rect = doc.getBoundingClientRect();

        if (style.display === 'none') return { pass: false, reason: 'display is none' };
        if (style.visibility === 'hidden') return { pass: false, reason: 'visibility is hidden' };
        if (parseFloat(style.opacity || '1') === 0) return { pass: false, reason: 'opacity is 0' };
        if (rect.width === 0 || rect.height === 0) return { pass: false, reason: 'width or height is 0' };
        if (style.transform && style.transform.includes('NaN')) return { pass: false, reason: 'transform contains NaN' };
        if (style.transform && style.transform.includes('scale(0)')) return { pass: false, reason: 'scale is 0' };

        const hasContent = doc.textContent && doc.textContent.length > 50;
        if (!hasContent) return { pass: false, reason: 'document content is empty' };

        return {
          pass: true,
          width: rect.width,
          height: rect.height,
          opacity: style.opacity,
          transform: style.transform
        };
      })()
    `);

    recordTest('Phase 5 - Blank A4 Regression', 'Permanent Blank A4 Regression Invariance holds', blankA4Check.pass, blankA4Check);

    // ====================================================
    // PHASE 11: WATERMARK SETTINGS TESTS
    // ====================================================
    log('\n--- PHASE 11: WATERMARK SETTINGS & ASSETS SUITE ---');

    // First go back to form to expose the tabs navigation ribbon
    await win.webContents.executeJavaScript(`
      (() => {
        const backBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('BOL Editor'));
        if (backBtn) {
          backBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          backBtn.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Open PDF Settings / Watermark tab
    await win.webContents.executeJavaScript(`
      (() => {
        window.dispatchEvent(new CustomEvent('skybol:editor-action', { detail: { tab: 'pdf-settings' } }));
        const settingsTab = document.querySelector('[data-tab="pdf-settings"]') || Array.from(document.querySelectorAll('[role="tab"], button')).find(el => el.textContent && el.textContent.includes('Settings'));
        if (settingsTab) {
          settingsTab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          settingsTab.click();
        }
      })()
    `);

    // Wait for watermark cards or panel to mount
    const watermarkPanelMounted = await waitFor(`
      Boolean(document.querySelectorAll('[data-watermark-card="true"], [data-testid="watermark-card"], [aria-label*="watermark"]').length > 0)
    `, 8000);
    log(`  Watermark panel mounted: ${Boolean(watermarkPanelMounted)}`);

    const watermarkAudit = await win.webContents.executeJavaScript(`
      (() => {
        const watermarkCards = document.querySelectorAll('[data-watermark-card="true"], [data-testid="watermark-card"], [aria-label*="watermark"]');
        const thumbnails = document.querySelectorAll('img[src*="/images/document-backgrounds/"], svg');

        return {
          cardCount: watermarkCards.length,
          thumbnailsFound: thumbnails.length,
          hasPresets: thumbnails.length > 0 || watermarkCards.length > 0
        };
      })()
    `);

    recordTest('Phase 11 - Watermarks', 'Watermark preset cards rendered and accessible', watermarkAudit.hasPresets, watermarkAudit);

    // ====================================================
    // PHASE 12: CONSOLE TESTING & ZERO-ERROR AUDIT
    // ====================================================
    log('\n--- PHASE 12: CONSOLE ERROR & NETWORK FAILURE AUDIT ---');

    const fatalErrors = results.consoleErrors.filter(e => 
      !e.message.includes('Download the React DevTools') &&
      !e.message.includes('Warning: Extra attributes')
    );

    recordTest('Phase 12 - Console Testing', 'Zero fatal uncaught console errors', fatalErrors.length === 0, { errors: fatalErrors });
    recordTest('Phase 12 - Console Testing', 'Zero failed API requests during navigation', results.failedRequests.length === 0, { failed: results.failedRequests });

  } catch (err) {
    log(`E2E Runner Encountered Fatal Exception: ${err.stack || err.message}`);
    recordTest('Execution', 'E2E Runner Execution', false, { error: err.message });
  } finally {
    results.completedAt = new Date().toISOString();
    fs.writeFileSync('test-results/e2e-report.json', JSON.stringify(results, null, 2));

    log('\n====================================================');
    log(`🏁 E2E SUITE FINISHED: ${results.summary.passed}/${results.summary.total} PASSED (${results.summary.failed} FAILED)`);
    log('====================================================\n');

    win.destroy();
    app.quit();
    process.exit(results.summary.failed > 0 ? 1 : 0);
  }
});
