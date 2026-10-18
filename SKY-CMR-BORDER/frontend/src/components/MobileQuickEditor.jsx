import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const MobileQuickEditor = () => {
  const {
    isMobileEditorOpen,
    setIsMobileEditorOpen,
    fields,
    updateField,
    activePad,
    setActivePad,
    cmrSerial,
    setCmrSerial,
    autoGenerateInvoice,
    getCmrNoFromInvoice,
    triggerDownloadPdf,
    triggerPrint,
    setIsAutoFillOpen,
    setIsSavedDocsOpen
  } = useCmr();

  const [activeTab, setActiveTab] = useState('parties');

  if (!isMobileEditorOpen) return null;

  return (
    <div className="mobile-editor-overlay">
      <div className="mobile-editor-sheet">
        {/* DRAG HANDLE & HEADER */}
        <div className="mobile-editor-handle-bar" onClick={() => setIsMobileEditorOpen(false)}>
          <div className="mobile-editor-handle"></div>
        </div>

        <div className="mobile-editor-header">
          <div className="mobile-editor-title-box">
            <span className="mobile-editor-tag">📱 Phone Form Mode</span>
            <h3>Quick Document Editor</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => setIsMobileEditorOpen(false)}
            >
              👁️ View Sheet
            </button>
            <button
              className="mobile-editor-close-btn"
              onClick={() => setIsMobileEditorOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SECTION TABS */}
        <div className="mobile-editor-tabs-bar">
          <button
            className={`m-tab-btn ${activeTab === 'parties' ? 'active' : ''}`}
            onClick={() => setActiveTab('parties')}
          >
            🏢 Exporter / Consignee
          </button>
          <button
            className={`m-tab-btn ${activeTab === 'goods' ? 'active' : ''}`}
            onClick={() => setActiveTab('goods')}
          >
            📦 Goods & Weights
          </button>
          <button
            className={`m-tab-btn ${activeTab === 'transport' ? 'active' : ''}`}
            onClick={() => setActiveTab('transport')}
          >
            🚚 Transport & Driver
          </button>
          <button
            className={`m-tab-btn ${activeTab === 'customs' ? 'active' : ''}`}
            onClick={() => setActiveTab('customs')}
          >
            📑 Customs & Route
          </button>
          <button
            className={`m-tab-btn ${activeTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice')}
          >
            🧾 Commercial Invoice
          </button>
        </div>

        {/* FORM CONTENT */}
        <div className="mobile-editor-body">
          {/* TAB 1: PARTIES (EXPORTER & BUYER) */}
          {activeTab === 'parties' && (
            <div className="m-form-section">
              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">1</span> Sender / Exporter (فرستنده / Отправитель)
                </label>
                <textarea
                  className="m-textarea"
                  rows={4}
                  value={fields.f2_sender || fields.f_consignor || ''}
                  onChange={(e) => {
                    updateField('f2_sender', e.target.value);
                    updateField('f_consignor', e.target.value);
                    updateField('inv_seller', e.target.value);
                  }}
                  placeholder="Company Name, Address, City, Phone, TIN / Tax ID..."
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">2</span> Consignee / Buyer (گیرنده / Грузополучатель)
                </label>
                <textarea
                  className="m-textarea"
                  rows={4}
                  value={fields.f2_consignee || fields.f_consignee || ''}
                  onChange={(e) => {
                    updateField('f2_consignee', e.target.value);
                    updateField('f_consignee', e.target.value);
                    updateField('inv_buyer', e.target.value);
                  }}
                  placeholder="Recipient Company Name, Address, Destination, TIN..."
                />
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">CMR Number (شماره راهنامه)</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.f2_cmr_number || cmrSerial || ''}
                    onChange={(e) => {
                      updateField('f2_cmr_number', e.target.value);
                      setCmrSerial(e.target.value);
                    }}
                    placeholder="e.g. 110"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Invoice Number</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.inv_number || ''}
                    onChange={(e) => updateField('inv_number', e.target.value)}
                    placeholder="e.g. SA-179"
                  />
                </div>
              </div>

              <div style={{ marginTop: '2px' }}>
                <button
                  type="button"
                  className="btn flex-1"
                  style={{ width: '100%', fontSize: '11px', padding: '6px 10px', background: '#0284c7', color: '#fff', borderColor: '#0369a1', fontWeight: 800 }}
                  onClick={getCmrNoFromInvoice}
                >
                  🔗 Get CMR No from Invoice No ({fields.inv_number || '110'})
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOODS & WEIGHTS */}
          {activeTab === 'goods' && (
            <div className="m-form-section">
              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">9</span> Goods Nature / Cargo Description (شرح کالا / Наименование)
                </label>
                <textarea
                  className="m-textarea"
                  rows={3}
                  value={fields.f2_goods_desc || fields.f_desc_1 || ''}
                  onChange={(e) => {
                    updateField('f2_goods_desc', e.target.value);
                    updateField('f_desc_1', e.target.value);
                  }}
                  placeholder="e.g. 1. 360 BUNDLES 16000 PCS 10000 KG AFGHAN BROOM"
                />
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">HS Code (کد کالا)</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.f2_hs_code || fields.f_stat_1 || ''}
                    onChange={(e) => {
                      updateField('f2_hs_code', e.target.value);
                      updateField('f_stat_1', e.target.value);
                    }}
                    placeholder="e.g. 9603100000"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Total Packages (تعداد بسته‌ها)</label>
                  <input
                    type="text"
                    className="m-input font-bold"
                    value={fields.f2_total_packages || fields.f_pkg_1 || ''}
                    onChange={(e) => {
                      updateField('f2_total_packages', e.target.value);
                      updateField('f_pkg_1', e.target.value);
                    }}
                    placeholder="e.g. 360 BUNDLES 16000 PCS"
                  />
                </div>
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">Gross Weight (وزن ناخالص)</label>
                  <input
                    type="text"
                    className="m-input font-bold"
                    value={fields.f2_gross_wt || fields.f_wt_1 || ''}
                    onChange={(e) => {
                      updateField('f2_gross_wt', e.target.value);
                      updateField('f_wt_1', e.target.value);
                    }}
                    placeholder="e.g. G.W: 10000 KG"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Net Weight (وزن خالص)</label>
                  <input
                    type="text"
                    className="m-input font-bold"
                    value={fields.f2_net_wt || ''}
                    onChange={(e) => updateField('f2_net_wt', e.target.value)}
                    placeholder="e.g. N.W: 10000 KG"
                  />
                </div>
              </div>

              <div className="m-field-group">
                <label className="m-label">Volume (حجم کالا)</label>
                <input
                  type="text"
                  className="m-input"
                  value={fields.f2_vol || fields.f_vol_1 || ''}
                  onChange={(e) => {
                    updateField('f2_vol', e.target.value);
                    updateField('f_vol_1', e.target.value);
                  }}
                  placeholder="e.g. 45 CBM"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPORT & DRIVER */}
          {activeTab === 'transport' && (
            <div className="m-form-section">
              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">16</span> Carrier / Transport Co (حمل‌کننده / Перевозчик)
                </label>
                <textarea
                  className="m-textarea"
                  rows={2}
                  value={fields.f2_carrier || fields.f_carrier || ''}
                  onChange={(e) => {
                    updateField('f2_carrier', e.target.value);
                    updateField('f_carrier', e.target.value);
                  }}
                  placeholder="Carrier Company Name & Transit Details..."
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">18</span> Driver Name (نام راننده / Водитель)
                </label>
                <input
                  type="text"
                  className="m-input font-bold"
                  value={fields.f2_driver || fields.f_driver_1 || ''}
                  onChange={(e) => {
                    updateField('f2_driver', e.target.value);
                    updateField('f_driver_1', e.target.value);
                  }}
                  placeholder="e.g. Mohammad Anwar"
                />
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">Truck / Tractor No (شماره موتر)</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.f2_truck_no || fields.f_tractor_reg || ''}
                    onChange={(e) => {
                      updateField('f2_truck_no', e.target.value);
                      updateField('f_tractor_reg', e.target.value);
                    }}
                    placeholder="e.g. BLH815L"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Trailer No (شماره تریلر / پالت)</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.f2_trailer_no || fields.f_trailer_reg || ''}
                    onChange={(e) => {
                      updateField('f2_trailer_no', e.target.value);
                      updateField('f_trailer_reg', e.target.value);
                    }}
                    placeholder="e.g. BLH815L"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMS & ROUTE */}
          {activeTab === 'customs' && (
            <div className="m-form-section">
              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">4</span> Place & Date Taking Over Goods (محل بارگیری)
                </label>
                <textarea
                  className="m-textarea"
                  rows={2}
                  value={fields.f2_taking_place || fields.f_load_place || ''}
                  onChange={(e) => {
                    updateField('f2_taking_place', e.target.value);
                    updateField('f_load_place', e.target.value);
                  }}
                  placeholder="Export From Hiratan-Afghanistan to republic of Uzbekistan"
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">3</span> Place of Delivery of Goods (محل تحویل کالا)
                </label>
                <input
                  type="text"
                  className="m-input font-bold"
                  value={fields.f2_delivery_place || fields.f_unload_place || ''}
                  onChange={(e) => {
                    updateField('f2_delivery_place', e.target.value);
                    updateField('f_unload_place', e.target.value);
                  }}
                  placeholder="Termiz city, republic of Uzbekistan"
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">13</span> Sender's Instructions & Customs Post (دستورات فرستنده)
                </label>
                <textarea
                  className="m-textarea"
                  rows={2}
                  value={fields.f2_sender_inst || fields.f_sender_inst || ''}
                  onChange={(e) => {
                    updateField('f2_sender_inst', e.target.value);
                    updateField('f_sender_inst', e.target.value);
                  }}
                  placeholder="CUSTOM POST 'Termiz'\nCODE POST: 22005"
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">
                  <span className="m-num">5</span> Documents Attached (اسناد پیوست)
                </label>
                <input
                  type="text"
                  className="m-input"
                  value={fields.f2_docs_attached || fields.f_docs_attached || ''}
                  onChange={(e) => {
                    updateField('f2_docs_attached', e.target.value);
                    updateField('f_docs_attached', e.target.value);
                  }}
                  placeholder="INVICE No: SA-179   DATE: 09.08.2026"
                />
              </div>
            </div>
          )}

          {/* TAB 5: COMMERCIAL INVOICE */}
          {activeTab === 'invoice' && (
            <div className="m-form-section">
              <div className="m-quick-actions-bar" style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-amber flex-1"
                  onClick={() => {
                    autoGenerateInvoice();
                  }}
                >
                  ⚡ Calculate from CMR
                </button>
                <button
                  className="btn flex-1"
                  style={{ background: '#0284c7', color: '#fff', borderColor: '#0369a1', fontSize: '11px', fontWeight: 800 }}
                  onClick={getCmrNoFromInvoice}
                >
                  🔗 Set CMR# = Invoice#
                </button>
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">Invoice Number</label>
                  <input
                    type="text"
                    className="m-input font-mono font-bold"
                    value={fields.inv_number || 'SA-179'}
                    onChange={(e) => updateField('inv_number', e.target.value)}
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Invoice Date (تاریخ)</label>
                  <input
                    type="text"
                    className="m-input"
                    value={fields.inv_date || '09.08.2026'}
                    onChange={(e) => updateField('inv_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">Delivery Terms (Incoterms)</label>
                  <input
                    type="text"
                    className="m-input font-bold"
                    value={fields.inv_incoterms || 'CFR Termiz, Uzbekistan'}
                    onChange={(e) => updateField('inv_incoterms', e.target.value)}
                    placeholder="e.g. CFR Termiz / CIP / FOB"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Payment Terms</label>
                  <input
                    type="text"
                    className="m-input"
                    value={fields.inv_payment_terms || '100% Advance T.T'}
                    onChange={(e) => updateField('inv_payment_terms', e.target.value)}
                    placeholder="e.g. 100% Advance T.T"
                  />
                </div>
              </div>

              <div className="m-field-row">
                <div className="m-field-group flex-1">
                  <label className="m-label">Unit Price ($)</label>
                  <input
                    type="text"
                    className="m-input font-bold text-blue-600"
                    value={fields.inv_item_unitprice || '4.45 USD / KG'}
                    onChange={(e) => updateField('inv_item_unitprice', e.target.value)}
                    placeholder="e.g. 4.45 USD / KG"
                  />
                </div>
                <div className="m-field-group flex-1">
                  <label className="m-label">Currency</label>
                  <input
                    type="text"
                    className="m-input font-bold"
                    value={fields.inv_currency || 'USD ($)'}
                    onChange={(e) => updateField('inv_currency', e.target.value)}
                  />
                </div>
              </div>

              <div className="m-field-group">
                <label className="m-label">Total Amount / Subtotal (مبلغ کل فاکتور)</label>
                <input
                  type="text"
                  className="m-input font-mono font-bold text-blue-600"
                  value={fields.inv_total_amount || '44,500.00 USD'}
                  onChange={(e) => {
                    updateField('inv_total_amount', e.target.value);
                    updateField('inv_subtotal', e.target.value);
                  }}
                  placeholder="e.g. 44,500.00 USD"
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">Amount in Words (حروف)</label>
                <input
                  type="text"
                  className="m-input italic"
                  value={fields.inv_words || 'Say: Forty-Four Thousand Five Hundred US Dollars Only'}
                  onChange={(e) => updateField('inv_words', e.target.value)}
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">Beneficiary Bank Name</label>
                <input
                  type="text"
                  className="m-input font-bold"
                  value={fields.inv_bank_name || 'Afghanistan International Bank (AIB)'}
                  onChange={(e) => updateField('inv_bank_name', e.target.value)}
                />
              </div>

              <div className="m-field-group">
                <label className="m-label">IBAN / Account Number</label>
                <input
                  type="text"
                  className="m-input font-mono"
                  value={fields.inv_bank_iban || 'AF92AIBK0000001010411161'}
                  onChange={(e) => updateField('inv_bank_iban', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM QUICK ACTIONS FOOTER */}
        <div className="mobile-editor-footer">
          <button
            className="btn btn-accent"
            onClick={() => setIsAutoFillOpen(true)}
            title="OCR / Preset Loader"
          >
            📸 OCR
          </button>
          <button
            className="btn"
            onClick={() => setIsSavedDocsOpen(true)}
            title="Saved Documents"
          >
            📋 Docs
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              setIsMobileEditorOpen(false);
              triggerDownloadPdf();
            }}
          >
            📥 PDF
          </button>
          <button
            className="btn"
            onClick={() => {
              setIsMobileEditorOpen(false);
              triggerPrint();
            }}
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
};
