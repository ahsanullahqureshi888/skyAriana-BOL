import React from 'react';
import { useCmr } from '../context/CmrContext';

export const CommercialInvoice = () => {
  const { fields, updateField, zoom } = useCmr();

  const baseWidth = 794;
  const baseHeight = 1080;

  return (
    <div id="invoice_container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="cmr-page-wrapper" id="wrapper_invoice" style={{ width: `${baseWidth * zoom}px`, height: `${baseHeight * zoom}px` }}>
        <div className="cmr-page-sheet inv-sheet" id="invoice_sheet" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <div className="inv-bg-watermark">
            <img 
              src="/sky_ariana_logo.jpg" 
              alt="Sky Ariana Company Watermark" 
              className="inv-watermark-img" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="inv-inner-content">
            <div>
              {/* TOP HEADER */}
              <div className="inv-top-header">
                <div className="inv-brand-left">
                  <h2>SKY ARIANA LIMITED</h2>
                  <div className="inv-subtitle">GLOBAL LOGISTICS • INTERNATIONAL FREIGHT • TRADING & TRANSIT</div>
                </div>

                <div className="inv-logo-center">
                  <img 
                    src="/sky_ariana_logo.jpg" 
                    alt="Sky Ariana Ltd Logo" 
                    className="inv-logo-img" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e3a8a', boxShadow: '0 3px 10px rgba(30,58,138,0.25)' }} 
                  />
                  <div className="inv-logo-fallback" style={{ display: 'none' }}>
                    <span style={{ fontWeight: 900, color: '#1e3a8a', fontSize: '11px' }}>SKY ARIANA</span>
                  </div>
                </div>

                <div className="inv-brand-right">
                  <div className="inv-stamp-lbl">COMMERCIAL INVOICE</div>
                  <div className="inv-off-lbl">OFFICIAL EXPORT DOCUMENT</div>
                </div>
              </div>

              {/* OFFICE DETAILS BANNER */}
              <div className="inv-office-card">
                <div className="inv-office-bar">AFGHANISTAN CENTRAL EXPORT DESK & TRANSIT MANAGEMENT</div>
                <div className="inv-office-grid">
                  <div className="inv-office-col-left">
                    <strong>KANDAHAR HEAD OFFICE:</strong> 2nd Floor, 16 No. Office, Shahidano Chowk, Etimad Rahmi Market, Kandahar, Afghanistan.<br />
                    <strong>KABUL TRANSIT DESK:</strong> Shahr-e-Naw, Haji Yaqoob Square, Kabul, Afghanistan.
                  </div>
                  <div className="inv-office-col-right">
                    <strong>LICENCE NUMBER:</strong> 2401-2198 | <strong>CUSTOMS CODE:</strong> AF-KDR-881<br />
                    <strong>EMAIL:</strong> info@skyariana.com | transport@skyariana.com<br />
                    <strong>TEL / MOB:</strong> +93 700 939 565 | +93 711 435 529
                  </div>
                </div>
              </div>

              {/* INVOICE TITLE & MULTI-META BAR */}
              <div className="inv-meta-grid-bar">
                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">INVOICE NO:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_number"
                    style={{ fontWeight: 900, color: '#1e3a8a' }}
                    onBlur={(e) => updateField('inv_number', e.target.innerText)}
                  >
                    {fields.inv_number || 'SA-179'}
                  </div>
                </div>

                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">DATE:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_date"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_date', e.target.innerText)}
                  >
                    {fields.inv_date || '09.08.2026'}
                  </div>
                </div>

                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">CMR WAYBILL REF:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_cmr_ref"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_cmr_ref', e.target.innerText)}
                  >
                    {fields.inv_cmr_ref || 'CMR #75'}
                  </div>
                </div>

                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">TERMS OF DELIVERY:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_incoterms"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_incoterms', e.target.innerText)}
                  >
                    {fields.inv_incoterms || 'CFR Termiz, Uzbekistan'}
                  </div>
                </div>

                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">TERMS OF PAYMENT:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_payment_terms"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_payment_terms', e.target.innerText)}
                  >
                    {fields.inv_payment_terms || '100% Advance T.T'}
                  </div>
                </div>

                <div className="inv-meta-item">
                  <span className="inv-meta-lbl">CURRENCY:</span>
                  <div
                    className="blue-field inv-meta-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_currency"
                    style={{ fontWeight: 900, color: '#059669' }}
                    onBlur={(e) => updateField('inv_currency', e.target.innerText)}
                  >
                    {fields.inv_currency || 'USD ($)'}
                  </div>
                </div>
              </div>

              {/* SELLER & BUYER GRID */}
              <div className="inv-parties-grid">
                <div className="inv-party-col">
                  <div className="inv-party-header">
                    <span>1. SELLER / EXPORTER (فرستنده و صادرکننده)</span>
                    <span style={{ fontSize: '8px', opacity: 0.85 }}>ORIGIN</span>
                  </div>
                  <div className="inv-party-body">
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      id="inv_seller"
                      style={{ minHeight: '82px', fontWeight: 'bold', fontSize: '9.8px', lineHeight: 1.35 }}
                      onBlur={(e) => updateField('inv_seller', e.target.innerText)}
                    >
                      {fields.inv_seller}
                    </div>
                  </div>
                </div>

                <div className="inv-party-col">
                  <div className="inv-party-header">
                    <span>2. BUYER / IMPORTER / NOTIFY PARTY (گیرنده و واردکننده)</span>
                    <span style={{ fontSize: '8px', opacity: 0.85 }}>DESTINATION</span>
                  </div>
                  <div className="inv-party-body">
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      id="inv_buyer"
                      style={{ minHeight: '82px', fontWeight: 'bold', fontSize: '9.8px', lineHeight: 1.35 }}
                      onBlur={(e) => updateField('inv_buyer', e.target.innerText)}
                    >
                      {fields.inv_buyer}
                    </div>
                  </div>
                </div>
              </div>

              {/* TRANSIT & LOGISTICS ROUTE STRIP */}
              <div className="inv-route-strip">
                <div className="inv-route-cell">
                  <span className="r-lbl">COUNTRY OF ORIGIN</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_origin"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_origin', e.target.innerText)}
                  >
                    {fields.inv_origin || 'AFGHANISTAN'}
                  </div>
                </div>

                <div className="inv-route-cell">
                  <span className="r-lbl">FINAL DESTINATION</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_dest_country"
                    style={{ fontWeight: 800 }}
                    onBlur={(e) => updateField('inv_dest_country', e.target.innerText)}
                  >
                    {fields.inv_dest_country || 'REPUBLIC OF UZBEKISTAN'}
                  </div>
                </div>

                <div className="inv-route-cell">
                  <span className="r-lbl">PORT OF LOADING</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_loading_place"
                    onBlur={(e) => updateField('inv_loading_place', e.target.innerText)}
                  >
                    {fields.inv_loading_place || 'Hairatan Customs Terminal, Afghanistan'}
                  </div>
                </div>

                <div className="inv-route-cell">
                  <span className="r-lbl">PORT OF DISCHARGE / DELIVERY</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_delivery_place"
                    onBlur={(e) => updateField('inv_delivery_place', e.target.innerText)}
                  >
                    {fields.inv_delivery_place || 'Termiz Customs Post (Code: 22005), Uzbekistan'}
                  </div>
                </div>

                <div className="inv-route-cell">
                  <span className="r-lbl">TRUCK & TRAILER NO.</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_vehicle_no"
                    style={{ fontWeight: 900, color: '#1e3a8a' }}
                    onBlur={(e) => updateField('inv_vehicle_no', e.target.innerText)}
                  >
                    {fields.inv_vehicle_no || 'BLH815L / BLH815L'}
                  </div>
                </div>

                <div className="inv-route-cell">
                  <span className="r-lbl">CARRIER / DRIVER</span>
                  <div
                    className="blue-field r-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_driver_name"
                    onBlur={(e) => updateField('inv_driver_name', e.target.innerText)}
                  >
                    {fields.inv_driver_name || 'Mohammad Anwar'}
                  </div>
                </div>
              </div>

              {/* ITEM DETAILS TABLE (PROFESSIONAL MULTI-COLUMN) */}
              <div style={{ marginTop: '6px' }}>
                <table className="inv-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center' }}>NO.</th>
                      <th style={{ width: '38%' }}>DESCRIPTION OF GOODS & COMMODITY</th>
                      <th style={{ width: '13%', textAlign: 'center' }}>HS CODE</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>PACKAGES / QTY</th>
                      <th style={{ width: '13%', textAlign: 'center' }}>NET WT / GW</th>
                      <th style={{ width: '16%', textAlign: 'center' }}>UNIT PRICE</th>
                      <th style={{ width: '15%', textAlign: 'right', paddingRight: '8px' }}>AMOUNT (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="inv-row-main">
                      <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_no"
                          style={{ textAlign: 'center', fontWeight: 'bold' }}
                          onBlur={(e) => updateField('inv_item_no', e.target.innerText)}
                        >
                          {fields.inv_item_no || '1'}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '6px 8px' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_desc"
                          style={{ minHeight: '60px', fontWeight: 'bold', fontSize: '10.5px', lineHeight: 1.35 }}
                          onBlur={(e) => updateField('inv_item_desc', e.target.innerText)}
                        >
                          {fields.inv_item_desc}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '3px' }}>
                          Standard Export Transit Cargo • Inspected & Cleared
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_hs"
                          style={{ fontWeight: 'bold', textAlign: 'center', minHeight: '22px', fontSize: '10px' }}
                          onBlur={(e) => updateField('inv_item_hs', e.target.innerText)}
                        >
                          {fields.inv_item_hs || '9603100000'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_qty"
                          style={{ fontWeight: 'bold', textAlign: 'center', minHeight: '22px', fontSize: '10px' }}
                          onBlur={(e) => updateField('inv_item_qty', e.target.innerText)}
                        >
                          {fields.inv_item_qty || '360 BUNDLES (16000 PCS)'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                          <div
                            className="blue-field"
                            contentEditable
                            suppressContentEditableWarning
                            id="inv_item_net_wt"
                            style={{ fontWeight: 'bold', textAlign: 'center', minHeight: '18px', fontSize: '9.5px', width: '95%' }}
                            onBlur={(e) => updateField('inv_item_net_wt', e.target.innerText)}
                            title="Net Weight"
                          >
                            {fields.inv_item_net_wt || 'N.W: 10000 KG'}
                          </div>
                          <div
                            className="blue-field"
                            contentEditable
                            suppressContentEditableWarning
                            id="inv_item_gross_wt"
                            style={{ fontWeight: '600', textAlign: 'center', minHeight: '18px', fontSize: '9px', width: '95%', color: '#475569' }}
                            onBlur={(e) => updateField('inv_item_gross_wt', e.target.innerText)}
                            title="Gross Weight"
                          >
                            {fields.inv_item_gross_wt || 'G.W: 10000 KG'}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_unitprice"
                          style={{ fontWeight: 'bold', textAlign: 'center', minHeight: '22px', fontSize: '10px', color: '#1e3a8a' }}
                          onBlur={(e) => updateField('inv_item_unitprice', e.target.innerText)}
                        >
                          {fields.inv_item_unitprice || '4.45 USD / KG'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '8px' }}>
                        <div
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_item_total"
                          style={{ fontWeight: 900, textAlign: 'right', minHeight: '22px', fontSize: '11.5px', color: '#0f172a' }}
                          onBlur={(e) => updateField('inv_item_total', e.target.innerText)}
                        >
                          {fields.inv_item_total || fields.inv_subtotal || '44,500.00 USD'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* FINANCIAL TOTALS & SUMMARY GRID */}
                <div className="inv-summary-grid">
                  <div className="inv-summary-left">
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span className="lbl-bold">TOTAL PACKAGES:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_total_packages"
                        style={{ fontWeight: 'bold' }}
                        onBlur={(e) => updateField('inv_total_packages', e.target.innerText)}
                      >
                        {fields.inv_total_packages || fields.inv_item_qty || '360 BUNDLES (16,000 PCS)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: '1px dotted #cbd5e1' }}>
                      <span className="lbl-bold">TOTAL NET WEIGHT:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_total_net_wt"
                        style={{ fontWeight: 'bold' }}
                        onBlur={(e) => updateField('inv_total_net_wt', e.target.innerText)}
                      >
                        {fields.inv_total_net_wt || '10,000.00 KG'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: '1px dotted #cbd5e1' }}>
                      <span className="lbl-bold">TOTAL GROSS WEIGHT:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_total_gross_wt"
                        style={{ fontWeight: 'bold' }}
                        onBlur={(e) => updateField('inv_total_gross_wt', e.target.innerText)}
                      >
                        {fields.inv_total_gross_wt || '10,000.00 KG'}
                      </span>
                    </div>
                  </div>

                  <div className="inv-summary-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                      <span style={{ fontSize: '10px', color: '#475569' }}>SUB TOTAL:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_subtotal"
                        style={{ fontWeight: 'bold', fontSize: '11px', minWidth: '85px', textAlign: 'right' }}
                        onBlur={(e) => updateField('inv_subtotal', e.target.innerText)}
                      >
                        {fields.inv_subtotal || '44,500.00 USD'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', borderTop: '1px dotted #cbd5e1' }}>
                      <span style={{ fontSize: '10px', color: '#475569' }}>FREIGHT & TRANSIT:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_freight"
                        style={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}
                        onBlur={(e) => updateField('inv_freight', e.target.innerText)}
                      >
                        {fields.inv_freight || 'INCLUDED (CFR)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderTop: '1.5px solid #1e3a8a', marginTop: '2px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#1e3a8a' }}>TOTAL AMOUNT:</span>
                      <span
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_total_amount"
                        style={{ fontWeight: 900, fontSize: '13px', color: '#1e3a8a', textAlign: 'right' }}
                        onBlur={(e) => updateField('inv_total_amount', e.target.innerText)}
                      >
                        {fields.inv_total_amount || '44,500.00 USD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TOTAL AMOUNT IN WORDS RIBBON */}
                <div className="inv-words-ribbon">
                  <span className="w-lbl">AMOUNT IN WORDS:</span>
                  <div
                    className="blue-field w-val"
                    contentEditable
                    suppressContentEditableWarning
                    id="inv_words"
                    style={{ flex: 1, fontWeight: 'bold', fontStyle: 'italic' }}
                    onBlur={(e) => updateField('inv_words', e.target.innerText)}
                  >
                    {fields.inv_words || 'Say: Forty-Four Thousand Five Hundred US Dollars Only'}
                  </div>
                </div>

                {/* BANK DETAILS & CUSTOMS DECLARATION CARD */}
                <div className="inv-bank-decl-grid">
                  <div className="inv-bank-card">
                    <div className="inv-card-header">BENEFICIARY BANKING DETAILS (FOR T.T WIRE TRANSFER)</div>
                    <div className="inv-bank-body">
                      <div className="bank-row">
                        <span className="b-lbl">BANK NAME:</span>
                        <span
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_bank_name"
                          style={{ fontWeight: 'bold' }}
                          onBlur={(e) => updateField('inv_bank_name', e.target.innerText)}
                        >
                          {fields.inv_bank_name || 'Afghanistan International Bank (AIB)'}
                        </span>
                      </div>
                      <div className="bank-row">
                        <span className="b-lbl">ACCOUNT NAME:</span>
                        <span
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_bank_account"
                          style={{ fontWeight: 'bold' }}
                          onBlur={(e) => updateField('inv_bank_account', e.target.innerText)}
                        >
                          {fields.inv_bank_account || 'Saboor Adel Trading Co. / Sky Ariana Transit'}
                        </span>
                      </div>
                      <div className="bank-row">
                        <span className="b-lbl">IBAN / A/C NO:</span>
                        <span
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_bank_iban"
                          style={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                          onBlur={(e) => updateField('inv_bank_iban', e.target.innerText)}
                        >
                          {fields.inv_bank_iban || 'AF92AIBK0000001010411161'}
                        </span>
                      </div>
                      <div className="bank-row">
                        <span className="b-lbl">SWIFT / BIC:</span>
                        <span
                          className="blue-field"
                          contentEditable
                          suppressContentEditableWarning
                          id="inv_bank_swift"
                          style={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                          onBlur={(e) => updateField('inv_bank_swift', e.target.innerText)}
                        >
                          {fields.inv_bank_swift || 'AIBKAFKB'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="inv-decl-card">
                    <div className="inv-card-header">EXPORTER DECLARATION & CERTIFICATION</div>
                    <div className="inv-decl-body">
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="inv_declaration"
                        style={{ fontSize: '8.8px', lineHeight: 1.35, color: '#1e293b' }}
                        onBlur={(e) => updateField('inv_declaration', e.target.innerText)}
                      >
                        {fields.inv_declaration || 'We hereby certify that this invoice shows the actual price of the goods described, and that all particulars, quantities, and weights are true, accurate and authentic.'}
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '8px', color: '#64748b', fontStyle: 'italic' }}>
                        Issued in accordance with international trade rules, Incoterms 2020 & UN/ECE CMR border customs transit conventions.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* BOTTOM SIGNATURES & OFFICIAL SEAL */}
            <div>
              <div className="inv-sign-section">
                <div className="inv-sign-box">
                  <div className="inv-sign-line"></div>
                  <div style={{ fontWeight: 800, fontSize: '9.5px', color: '#0f172a' }}>AUTHORIZED SIGNATURE & STAMP</div>
                  <div style={{ fontSize: '8px', color: '#64748b' }}>For Exporter / Seller</div>
                </div>

                {/* OFFICIAL STAMP BADGE (AUTHENTIC CURVED SVG EMBASSY / TRANSIT SEAL) */}
                <div className="inv-stamp-badge" title="Official Sky Ariana Customs & Transit Stamp">
                  <svg viewBox="0 0 200 200" width="124" height="124" className="official-stamp-svg" style={{ transform: 'rotate(-5deg)' }}>
                    <defs>
                      {/* Top arc: Clockwise from 9 o'clock to 3 o'clock */}
                      <path id="invStampTopArc" d="M 26,100 A 74,74 0 1,1 174,100" fill="none" />
                      {/* Bottom arc: Counter-clockwise from 9 o'clock to 3 o'clock */}
                      <path id="invStampBotArc" d="M 30,100 A 70,70 0 0,0 170,100" fill="none" />
                    </defs>
                    {/* Outer serrated notched security ring */}
                    <circle cx="100" cy="100" r="95" fill="none" stroke="#b91c1c" strokeWidth="2.4" strokeDasharray="4,2.5" />
                    {/* Outer solid border */}
                    <circle cx="100" cy="100" r="88" fill="none" stroke="#b91c1c" strokeWidth="2" />
                    {/* Inner solid border */}
                    <circle cx="100" cy="100" r="62" fill="none" stroke="#b91c1c" strokeWidth="1.2" />
                    
                    {/* Arched Top Text: ★ SKY ARIANA LIMITED ★ */}
                    <text fill="#b91c1c" fontSize="13.5" fontWeight="900" fontFamily="'Plus Jakarta Sans', Arial, sans-serif" letterSpacing="2.2">
                      <textPath href="#invStampTopArc" startOffset="50%" textAnchor="middle">
                        ★ SKY ARIANA LIMITED ★
                      </textPath>
                    </text>
                    
                    {/* Arched Bottom Text: ★ REG: 2401-2198 • KANDAHAR ★ */}
                    <text fill="#b91c1c" fontSize="10" fontWeight="800" fontFamily="'Plus Jakarta Sans', Arial, sans-serif" letterSpacing="1.4">
                      <textPath href="#invStampBotArc" startOffset="50%" textAnchor="middle">
                        ★ REG: 2401-2198 • KANDAHAR ★
                      </textPath>
                    </text>
                    
                    {/* Center Security Box */}
                    <line x1="42" y1="76" x2="158" y2="76" stroke="#b91c1c" strokeWidth="1.6" />
                    <line x1="48" y1="79" x2="152" y2="79" stroke="#b91c1c" strokeWidth="0.8" />
                    
                    <text x="100" y="97" fill="#b91c1c" fontSize="17.5" fontWeight="900" fontFamily="'Plus Jakarta Sans', Arial, sans-serif" textAnchor="middle" letterSpacing="2.5">
                      OFFICIAL
                    </text>
                    <text x="100" y="111" fill="#b91c1c" fontSize="8.8" fontWeight="800" fontFamily="'Plus Jakarta Sans', Arial, sans-serif" textAnchor="middle" letterSpacing="1.5">
                      TRANSIT &amp; CUSTOMS
                    </text>
                    
                    <line x1="48" y1="117" x2="152" y2="117" stroke="#b91c1c" strokeWidth="0.8" />
                    <line x1="42" y1="120" x2="158" y2="120" stroke="#b91c1c" strokeWidth="1.6" />

                    {/* Side Star Badges */}
                    <circle cx="23" cy="100" r="2" fill="#b91c1c" />
                    <circle cx="177" cy="100" r="2" fill="#b91c1c" />
                  </svg>
                </div>

                <div className="inv-sign-box" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e3a8a' }}>SKY ARIANA LIMITED</div>
                  <div style={{ fontSize: '8.5px', color: '#475569', marginTop: '1px', fontWeight: 700 }}>International Transit & Issuing Agent</div>
                  <div style={{ fontSize: '7.8px', color: '#64748b', marginTop: '1px' }}>Signature & Date: {fields.inv_date || '09.08.2026'}</div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="inv-footer">
                Thank you for your business • info@skyariana.com • transport@skyariana.com • www.skyariana.com
                <div style={{ marginTop: '1px', fontWeight: 700 }}>SKY ARIANA LIMITED | Official Commercial Invoice & Transit Document</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

