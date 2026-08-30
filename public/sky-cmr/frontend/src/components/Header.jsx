import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const Header = () => {
  const {
    activePad, setActivePad,
    activeDocPage, setActiveDocPage,
    theme, toggleTheme,
    autoGenerateInvoice, generateNewCmr,
    getCmrNoFromInvoice,
    saveToArchive, setIsSavedDocsOpen, setIsAutoFillOpen,
    triggerPrint, triggerDownloadPdf,
    setFields,
    isMobile,
    isMobileEditorOpen, setIsMobileEditorOpen,
    isInstallable, triggerInstallPrompt,
    fitToScreen
  } = useCmr();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleClear = () => {
    if (window.confirm('Clear all filled form fields?')) {
      setFields({});
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="app-header-container">
      <header className="app-header">
        {/* APP BRAND */}
        <div className="app-brand">
          <div className="brand-logo">CMR</div>
          <div className="brand-text">
            <h1>Sky Ariana Transit</h1>
            <span className="sub-title">Trilingual CMR & Auto-Invoice</span>
          </div>
          <div className="autosave-badge">
            <span className="pulse-dot"></span> <span className="autosave-text">Auto-Saved</span>
          </div>
        </div>

        {/* MOBILE TOP CONTROLS (ONLY ON MOBILE) */}
        <div className="mobile-header-actions">
          {isInstallable && (
            <button
              className="btn btn-install-pwa"
              onClick={triggerInstallPrompt}
              title="Install Web App on Phone"
            >
              📲 <span className="btn-text">Install</span>
            </button>
          )}
          <button
            className={`btn ${isMobileEditorOpen ? 'btn-primary' : 'btn-mobile-edit'}`}
            onClick={() => setIsMobileEditorOpen(prev => !prev)}
            title="Toggle Phone Quick Edit Form"
          >
            ✏️ <span className="btn-text">{isMobileEditorOpen ? 'View Sheet' : 'Edit Form'}</span>
          </button>
          <button
            className="btn btn-icon-only"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="btn btn-icon-only"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            title="Menu & Tools"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* DESKTOP TOOLBAR (HIDDEN ON MOBILE, DISPLAYED ON DESKTOP) */}
        <div className="toolbar-actions desktop-toolbar">
          {/* PAD SELECTION PILLS */}
          <div className="pad-selector-pills">
            <button
              id="padPill1"
              className={`pad-pill-btn ${activePad === 1 ? 'active' : ''}`}
              onClick={() => setActivePad(1)}
            >
              📋 CMR Pad 1 (EN/FA)
            </button>
            <button
              id="padPill2"
              className={`pad-pill-btn ${activePad === 2 ? 'active' : ''}`}
              onClick={() => setActivePad(2)}
            >
              📑 CMR-PAD-2 (EN/RU)
            </button>
            <button
              id="padPillInv"
              className={`pad-pill-btn ${activePad === 3 ? 'active-invoice' : ''}`}
              onClick={() => setActivePad(3)}
            >
              🧾 Commercial Invoice
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <button className="btn btn-amber" id="btnAutoGenerate" onClick={autoGenerateInvoice} title="Auto-Extract from CMR">
            ⚡ Auto-Generate Invoice
          </button>
          <button className="btn" onClick={getCmrNoFromInvoice} title="Get CMR No from Invoice No" style={{ background: '#0284c7', color: '#fff', borderColor: '#0369a1' }}>
            🔗 Get CMR No from Inv
          </button>
          <button className="btn btn-accent" id="btnAutoFill" onClick={() => setIsAutoFillOpen(true)} title="OCR / Preset Loader">
            📸 Auto-Fill OCR
          </button>
          <button className="btn btn-success" id="btnNewCmr" onClick={generateNewCmr} title="Generate Next Serial">
            🔄 New CMR
          </button>

          <div className="btn-group">
            <button className="btn" onClick={saveToArchive} style={{ color: '#2563eb' }}>💾 Save</button>
            <button className="btn" id="btnOpenDocs" onClick={() => setIsSavedDocsOpen(true)}>📋 Docs</button>
            <button className="btn btn-primary" id="btnDownloadPdf" onClick={triggerDownloadPdf}>📥 Download PDF</button>
            <button className="btn" id="btnPrint" onClick={triggerPrint}>🖨️ Print</button>
          </div>

          <div className="btn-group">
            {isInstallable && (
              <button className="btn btn-install-pwa" onClick={triggerInstallPrompt}>
                📲 App
              </button>
            )}
            <button className="btn" id="themeToggleBtn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button className="btn btn-danger" onClick={handleClear} title="Clear form">
              🗑️
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SEGMENTED TABS & ACTION STRIP */}
      <div className="mobile-sub-toolbar">
        <div className="mobile-pad-tabs">
          <button
            className={`m-pad-tab ${activePad === 1 ? 'active' : ''}`}
            onClick={() => setActivePad(1)}
          >
            📋 Pad 1 (EN/FA)
          </button>
          <button
            className={`m-pad-tab ${activePad === 2 ? 'active' : ''}`}
            onClick={() => setActivePad(2)}
          >
            📑 Pad 2 (EN/RU/FA)
          </button>
          <button
            className={`m-pad-tab ${activePad === 3 ? 'active-inv' : ''}`}
            onClick={() => setActivePad(3)}
          >
            🧾 Invoice
          </button>
        </div>

        {/* MOBILE QUICK ACTION BUTTONS */}
        <div className="mobile-quick-actions">
          <button className="m-action-btn m-btn-amber" onClick={autoGenerateInvoice} title="Auto-Generate Invoice">
            ⚡ Invoice
          </button>
          <button className="m-action-btn" onClick={getCmrNoFromInvoice} title="Get CMR No from Invoice No" style={{ background: '#0284c7', color: '#fff', borderColor: '#0369a1' }}>
            🔗 Get CMR#
          </button>
          <button className="m-action-btn m-btn-accent" onClick={() => setIsAutoFillOpen(true)} title="Auto-Fill OCR">
            📸 OCR
          </button>
          <button className="m-action-btn m-btn-success" onClick={generateNewCmr} title="New CMR Serial">
            🔄 New
          </button>
          <button className="m-action-btn m-btn-primary" onClick={triggerDownloadPdf} title="Download PDF">
            📥 PDF
          </button>
          <button className="m-action-btn" onClick={triggerPrint} title="Print">
            🖨️ Print
          </button>
          <button className="m-action-btn" onClick={saveToArchive} title="Save">
            💾 Save
          </button>
          <button className="m-action-btn" onClick={() => setIsSavedDocsOpen(true)} title="Saved Documents">
            📋 Docs
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN / MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <h4>🛠️ Application Menu & Tools</h4>
              <button className="mobile-menu-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
            </div>
            <div className="mobile-menu-grid">
              <button className="m-menu-item" onClick={() => { getCmrNoFromInvoice(); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">🔗</span>
                <div className="m-menu-text">
                  <strong>Get CMR No from Invoice No</strong>
                  <small>Auto-sync CMR number with Invoice No</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { setIsMobileEditorOpen(true); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">✏️</span>
                <div className="m-menu-text">
                  <strong>Mobile Form Editor</strong>
                  <small>Touch-friendly form mode for phone</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { fitToScreen(); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">📐</span>
                <div className="m-menu-text">
                  <strong>Fit to Phone Screen</strong>
                  <small>Auto-scale document width to display</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { setIsAutoFillOpen(true); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">📸</span>
                <div className="m-menu-text">
                  <strong>OCR / Presets Loader</strong>
                  <small>Auto-fill from invoice text or blueprints</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { setIsSavedDocsOpen(true); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">📂</span>
                <div className="m-menu-text">
                  <strong>Saved Archive (Docs)</strong>
                  <small>Browse, search, and reload waybills</small>
                </div>
              </button>
              {isInstallable && (
                <button className="m-menu-item" onClick={() => { triggerInstallPrompt(); setIsMobileMenuOpen(false); }}>
                  <span className="m-menu-icon">📲</span>
                  <div className="m-menu-text">
                    <strong>Install App on Phone</strong>
                    <small>Add Sky CMR to Home Screen</small>
                  </div>
                </button>
              )}
              <button className="m-menu-item" onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <div className="m-menu-text">
                  <strong>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</strong>
                  <small>Change app color theme</small>
                </div>
              </button>
              <button className="m-menu-item m-menu-item-danger" onClick={handleClear}>
                <span className="m-menu-icon">🗑️</span>
                <div className="m-menu-text">
                  <strong>Clear All Form Fields</strong>
                  <small>Reset all inputs to blank</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB BAR FOR PAD 1 PAGES */}
      {activePad === 1 && (
        <div className="desktop-sub-bar" style={{ paddingBottom: '6px' }}>
          <div className="doc-page-tabs">
            <button
              className={`page-tab-btn ${activeDocPage === 1 ? 'active' : ''}`}
              onClick={() => setActiveDocPage(1)}
            >
              📄 Page 1: Consignment Note
            </button>
            <button
              className={`page-tab-btn ${activeDocPage === 2 ? 'active' : ''}`}
              onClick={() => setActiveDocPage(2)}
            >
              📄 Page 2: Carrier Execution
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

