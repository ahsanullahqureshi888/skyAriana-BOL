const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { offscreen: true } });
  await win.loadURL('http://127.0.0.1:3001');
  await new Promise(r => setTimeout(r, 1000));
  await win.webContents.executeJavaScript(`
    try {
      localStorage.setItem('skybol:user', JSON.stringify({ id: 'usr-1', username: 'admin', role: 'superadmin', name: 'Admin' }));
    } catch(e) {}
  `);
  await win.loadURL('http://127.0.0.1:3001');
  await new Promise(r => setTimeout(r, 1500));
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('skybol:navigate-view', { detail: { view: 'bol' } }));
  `);
  await new Promise(r => setTimeout(r, 1500));
  await win.webContents.executeJavaScript(`
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('Preview'));
    if (tab) {
      tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      tab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      tab.click();
    }
  `);
  await new Promise(r => setTimeout(r, 2000));
  const toolbarHtml = await win.webContents.executeJavaScript(`
    (() => {
      const tb = document.querySelector('.a4-preview-toolbar') || document.querySelector('[role="toolbar"]');
      if (!tb) return 'TOOLBAR NOT FOUND: ' + (document.body ? document.body.innerText.slice(0, 200) : 'no body');
      const btns = Array.from(tb.querySelectorAll('button')).map(b => ({
        text: (b.innerText || b.textContent || '').trim(),
        title: b.title || '',
        dataFitPage: b.getAttribute('data-fit-page'),
        dataFitWidth: b.getAttribute('data-fit-width'),
        outer: b.outerHTML.slice(0, 120)
      }));
      return JSON.stringify(btns, null, 2);
    })()
  `);
  console.log('TOOLBAR BUTTONS:\n' + toolbarHtml);
  app.quit();
});
