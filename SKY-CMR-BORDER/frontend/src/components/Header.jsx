import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const Header = () => {
  const {
    activePad, setActivePad,
    theme, toggleTheme,
    autoGenerateInvoice, generateNewCmr,
    getCmrNoFromInvoice,
    saveToArchive, saveCurrentDocAsCopy, setIsSavedDocsOpen, setIsAutoFillOpen,
    openAddressBook,
    triggerPrint, triggerDownloadPdf,
    setFields,
    isMobile,
    isMobileEditorOpen, setIsMobileEditorOpen,
    isInstallable, triggerInstallPrompt,
    fitToScreen,
    currentUser, logout
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
      {/* ========================================================
          TIER 1: MAIN NAVIGATION & BRAND BAR
          ======================================================== */}
      <header className="app-header-top">
        {/* BRAND & STATUS */}
        <div className="app-brand-section">
          <div className="brand-logo" onClick={() => setActivePad(2)} style={{ cursor: 'pointer' }} title="Sky Ariana Logistics">
            CMR
          </div>
          <div className="brand-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Sky Ariana Transit</h1>
              <div className="autosave-badge">
                <span className="pulse-dot"></span> <span className="autosave-text">Auto-Saved</span>
              </div>
            </div>
            <span className="sub-title">Trilingual Customs CMR & Export Invoice Portal</span>
          </div>
        </div>

        {/* CENTER: MODE TABS (DESKTOP) */}
        <nav className="header-nav-tabs desktop-only-flex">
          <button
            id="padPill1"
            className={`nav-tab-btn ${activePad === 1 ? 'active' : ''}`}
            onClick={() => setActivePad(1)}
            title="CMR Trilingual Form 1 (English / Persian)"
          >
            <span className="tab-icon">📋</span>
            <span className="tab-label">CMR Pad 1</span>
            <span className="tab-tag">EN/FA</span>
          </button>

          <button
            id="padPill2"
            className={`nav-tab-btn ${activePad === 2 ? 'active' : ''}`}
            onClick={() => setActivePad(2)}
            title="CMR International Waybill Form 2 (English / Russian / Persian)"
          >
            <span className="tab-icon">📑</span>
            <span className="tab-label">CMR-PAD-2</span>
            <span className="tab-tag">EN/RU</span>
          </button>

          <button
            id="padPillInv"
            className={`nav-tab-btn tab-invoice ${activePad === 3 ? 'active' : ''}`}
            onClick={() => setActivePad(3)}
            title="Official Commercial Export Invoice"
          >
            <span className="tab-icon">🧾</span>
            <span className="tab-label">Commercial Invoice</span>
          </button>

          <button
            id="padPillAnalytics"
            className={`nav-tab-btn tab-analytics ${activePad === 4 ? 'active' : ''}`}
            onClick={() => setActivePad(4)}
            title="Logistics Analytics & Data Intelligence"
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Analytics & Data</span>
            <span className="tab-pulse-badge">LIVE</span>
          </button>
        </nav>

        {/* RIGHT: SYSTEM & USER PROFILE */}
        <div className="header-system-controls desktop-only-flex">
          {isInstallable && (
            <button
              className="btn btn-install-pwa"
              onClick={triggerInstallPrompt}
              title="Install Web Application"
            >
              📲 App
            </button>
          )}

          <button
            className="btn btn-icon-round"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="user-profile-badge" title={`Logged in as ${currentUser?.name || 'Ahsanullah'} (${currentUser?.email || 'ahsanullah@skyariana.com'})`}>
            <span className="user-avatar-circle">👤</span>
            <span className="user-name-label">{currentUser?.name || 'Ahsanullah'}</span>
            <span className="user-online-status" title="Active Session"></span>
          </div>

          <button
            className="btn btn-logout-btn"
            onClick={logout}
            title="Sign Out of Portal"
          >
            🚪 <span className="logout-text">Sign Out</span>
          </button>
        </div>

        {/* MOBILE HEADER ACTIONS */}
        <div className="mobile-header-actions">
          {isInstallable && (
            <button className="btn btn-install-pwa" onClick={triggerInstallPrompt} title="Install App">
              📲
            </button>
          )}
          <button
            className={`btn ${isMobileEditorOpen ? 'btn-primary' : 'btn-mobile-edit'}`}
            onClick={() => setIsMobileEditorOpen(prev => !prev)}
            title="Toggle Mobile Form Editor"
          >
            ✏️ {isMobileEditorOpen ? 'Sheet' : 'Edit'}
          </button>
          <button className="btn btn-icon-only" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-icon-only" onClick={() => setIsMobileMenuOpen(prev => !prev)}>
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ========================================================
          TIER 2: ACTION TOOLBAR STRIP (DESKTOP)
          ======================================================== */}
      <div className="app-toolbar-strip desktop-only-flex">
        {/* LEFT GROUP: SMART AUTOMATION */}
        <div className="toolbar-btn-group">
          <button
            className="btn btn-amber"
            id="btnAutoGenerate"
            onClick={autoGenerateInvoice}
            title="Automatically populate Commercial Invoice from active CMR"
          >
            ⚡ Auto-Generate Invoice
          </button>
          <button
            className="btn btn-cyan"
            onClick={getCmrNoFromInvoice}
            title="Sync & clean CMR number from active Invoice number"
          >
            🔗 Get CMR No from Inv
          </button>
          <button
            className="btn btn-accent"
            id="btnAutoFill"
            onClick={() => setIsAutoFillOpen(true)}
            title="Smart OCR Text Extraction & Logistics Presets"
          >
            📸 Auto-Fill OCR
          </button>
          <button
            className="btn btn-success"
            id="btnNewCmr"
            onClick={generateNewCmr}
            title="Generate Next Sequential CMR Number"
          >
            🔄 New CMR
          </button>
        </div>

        {/* RIGHT GROUP: DOCUMENT & DIRECTORY ACTIONS */}
        <div className="toolbar-btn-group">
          <button
            className="btn btn-save"
            onClick={saveToArchive}
            title="Save current shipment details to local archive & cloud"
          >
            💾 Save Form
          </button>
          <button
            className="btn btn-directory"
            onClick={() => openAddressBook('sender')}
            title="Open Senders & Consignees Address Book"
          >
            🏢 Directory
          </button>
          <button
            className="btn"
            id="btnOpenDocs"
            onClick={() => setIsSavedDocsOpen(true)}
            title="Open CMR Archive & History Manager"
          >
            📋 Saved Docs
          </button>
          <button
            className="btn btn-primary"
            id="btnDownloadPdf"
            onClick={triggerDownloadPdf}
            title="Download crisp 1-Page PDF"
          >
            📥 Download PDF
          </button>
          <button
            className="btn btn-print"
            id="btnPrint"
            onClick={triggerPrint}
            title="Print document on clean paper layout"
          >
            🖨️ Print
          </button>
          <button
            className="btn btn-danger"
            onClick={handleClear}
            title="Clear all fields in active form"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* ========================================================
          MOBILE VIEW: TABS & ACTION TOOLBAR
          ======================================================== */}
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
            📑 Pad 2 (EN/RU)
          </button>
          <button
            className={`m-pad-tab ${activePad === 3 ? 'active-inv' : ''}`}
            onClick={() => setActivePad(3)}
          >
            🧾 Invoice
          </button>
          <button
            className={`m-pad-tab ${activePad === 4 ? 'active-analytics' : ''}`}
            onClick={() => setActivePad(4)}
          >
            📊 Analytics
          </button>
        </div>

        {/* MOBILE QUICK ACTION BUTTONS */}
        <div className="mobile-quick-actions">
          <button className="m-action-btn m-btn-amber" onClick={autoGenerateInvoice} title="Auto-Generate Invoice">
            ⚡ Invoice
          </button>
          <button className="m-action-btn" onClick={getCmrNoFromInvoice} title="Get CMR No" style={{ background: '#0284c7', color: '#fff' }}>
            🔗 CMR#
          </button>
          <button className="m-action-btn m-btn-accent" onClick={() => setIsAutoFillOpen(true)} title="Auto-Fill OCR">
            📸 OCR
          </button>
          <button className="m-action-btn m-btn-success" onClick={generateNewCmr} title="New CMR Serial">
            🔄 New
          </button>
          <button className="m-action-btn" onClick={() => openAddressBook('sender')} title="Address Book">
            🏢 Directory
          </button>
          <button className="m-action-btn m-btn-primary" onClick={triggerDownloadPdf} title="Download PDF">
            📥 PDF
          </button>
          <button className="m-action-btn" onClick={triggerPrint} title="Print">
            🖨️ Print
          </button>
          <button className="m-action-btn" onClick={saveToArchive} title="Save Document">
            💾 Save
          </button>
          <button className="m-action-btn" onClick={() => setIsSavedDocsOpen(true)} title="Saved Documents">
            📋 Docs
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <h4>🛠️ Application Menu & Tools</h4>
              <button className="mobile-menu-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
            </div>
            <div className="mobile-menu-grid">
              <button className="m-menu-item" onClick={() => { setActivePad(4); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">📊</span>
                <div className="m-menu-text">
                  <strong>Analytics & Data Dashboard</strong>
                  <small>Real-time transit metrics, revenue & routes</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { openAddressBook('sender'); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">🏢</span>
                <div className="m-menu-text">
                  <strong>Party Directory & Address Book</strong>
                  <small>Saved Senders, Consignees & Carriers</small>
                </div>
              </button>
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
                <span className="m-menu-icon">📋</span>
                <div className="m-menu-text">
                  <strong>Saved Documents Archive</strong>
                  <small>Manage past waybills & invoices</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { triggerDownloadPdf(); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">📥</span>
                <div className="m-menu-text">
                  <strong>Download PDF</strong>
                  <small>Export clean single-page PDF</small>
                </div>
              </button>
              <button className="m-menu-item" onClick={() => { triggerPrint(); setIsMobileMenuOpen(false); }}>
                <span className="m-menu-icon">🖨️</span>
                <div className="m-menu-text">
                  <strong>Print Document</strong>
                  <small>Send directly to printer</small>
                </div>
              </button>

              <div className="m-user-profile-divider"></div>
              <div className="m-user-profile-box">
                <span className="m-user-avatar">👤</span>
                <div className="m-user-meta">
                  <strong>{currentUser?.name || 'Ahsanullah'}</strong>
                  <small>{currentUser?.email || 'ahsanullah@skyariana.com'}</small>
                </div>
              </div>
              <button className="m-menu-item m-menu-item-signout" onClick={logout}>
                <span className="m-menu-icon">🚪</span>
                <div className="m-menu-text">
                  <strong style={{ color: '#ef4444' }}>Sign Out</strong>
                  <small>Log out of Sky Ariana Portal</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
