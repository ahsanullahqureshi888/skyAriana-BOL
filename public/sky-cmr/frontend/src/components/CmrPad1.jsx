import React from 'react';
import { useCmr } from '../context/CmrContext';

export const CmrPad1 = () => {
  const { activeDocPage, fields, updateField, zoom } = useCmr();

  const baseWidth = 794;
  const baseHeight = 1080;

  return (
    <div id="pad1_container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {activeDocPage === 1 && (
        <div className="cmr-page-wrapper" id="wrapper_page1" style={{ width: `${baseWidth * zoom}px`, height: `${baseHeight * zoom}px` }}>
          <div className="cmr-page-sheet" id="page1" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div className="top-meta-header">
              <div className="top-meta-left">
                <span className="fa-t">پیوست شماره ۱ به دستورالعمل ساخت، حسابداری، تکمیل و پردازش بارنامه‌ها و راهنامه‌های بین‌المللی حمل کالا</span>
                <span className="en-t">Annex No. 1 to the Instructions for the Preparation of Consignment Notes No. 1382</span>
              </div>
              <div className="top-meta-right">
                <span>Form CMR / فرم CMR</span>
              </div>
            </div>

            <table className="grid-table">
              <tbody>
                <tr>
                  <td style={{ width: '50%' }} className="h-b1">
                    <div className="box-lbl">
                      <span className="fa-title">1. فرستنده (نام، نشانی، کشور)</span>
                      <span className="en-title">Consignor (name, address, country)</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '56px' }}
                      onBlur={(e) => updateField('f_consignor', e.target.innerText)}
                    >
                      {fields.f_consignor}
                    </div>
                  </td>
                  <td style={{ width: '50%' }} className="h-b1">
                    <div className="cmr-header-box">
                      <div className="cmr-hdr-left">
                        <div>
                          <div className="main-heading-fa">راهنامه بین‌المللی حمل و نقل جاده‌ای کالا</div>
                          <div className="main-heading-en">INTERNATIONAL CONSIGNMENT NOTE</div>
                        </div>
                        <div className="clause-fa">
                          این حمل و نقل طبق مقررات کنوانسیون CMR انجام می‌گیرد.
                        </div>
                      </div>
                      <div className="cmr-hdr-right">
                        <div className="top-id-row">
                          <span>UAART</span>
                          <span
                            className="editable-cmr-badge"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateField('f2_cmr_number', e.target.innerText)}
                          >
                            CMR NO {fields.f2_cmr_number || '75'}
                          </span>
                        </div>
                        <div className="clause-en">
                          This carriage is subject to the CMR convention.
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="h-b2">
                    <div className="box-lbl">
                      <span className="fa-title">2. گیرنده (نام، نشانی، کشور)</span>
                      <span className="en-title">Consignee (name, address, country)</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '56px' }}
                      onBlur={(e) => updateField('f_consignee', e.target.innerText)}
                    >
                      {fields.f_consignee}
                    </div>
                  </td>
                  <td className="h-b16">
                    <div className="box-lbl">
                      <span className="fa-title">16. متصدی حمل (نام، نشانی، کشور)</span>
                      <span className="en-title">Carrier (name, address, country)</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '56px' }}
                      onBlur={(e) => updateField('f_carrier', e.target.innerText)}
                    >
                      {fields.f_carrier}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="h-b3">
                    <div className="box-lbl">
                      <span className="fa-title">3. محل تحویل کالا (محل، کشور)</span>
                      <span className="en-title">Place of delivery of the goods (place, country)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ flex: 1.2 }}
                        onBlur={(e) => updateField('f_unload_place', e.target.innerText)}
                      >
                        {fields.f_unload_place}
                      </div>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ flex: 1 }}
                        onBlur={(e) => updateField('f_unload_country', e.target.innerText)}
                      >
                        {fields.f_unload_country}
                      </div>
                    </div>
                  </td>
                  <td className="h-b17">
                    <div className="box-lbl">
                      <span className="fa-title">17. متصدیان بعدی حمل</span>
                      <span className="en-title">Successive carriers (name, address, country)</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '32px' }}
                      onBlur={(e) => updateField('f_successive_carrier', e.target.innerText)}
                    >
                      {fields.f_successive_carrier}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="h-b4">
                    <div className="box-lbl">
                      <span className="fa-title">4. محل و تاریخ بارگیری کالا</span>
                      <span className="en-title">Place and date of taking over the goods</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ flex: 1.2 }}
                        onBlur={(e) => updateField('f_load_place', e.target.innerText)}
                      >
                        {fields.f_load_place}
                      </div>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ flex: 1 }}
                        onBlur={(e) => updateField('f_load_country', e.target.innerText)}
                      >
                        {fields.f_load_country}
                      </div>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ width: '100%' }}
                      onBlur={(e) => updateField('f_load_date', e.target.innerText)}
                    >
                      {fields.f_load_date}
                    </div>
                  </td>
                  <td className="h-b18" rowSpan={2}>
                    <div className="box-lbl">
                      <span className="fa-title">18. ملاحظات و شروط متصدی حمل</span>
                      <span className="en-title">Carrier's reservations and observations</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '90px' }}
                      onBlur={(e) => updateField('f_carrier_reservations', e.target.innerText)}
                    >
                      {fields.f_carrier_reservations}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="h-b5">
                    <div className="box-lbl">
                      <span className="fa-title">5. اسناد پیوست</span>
                      <span className="en-title">Documents attached</span>
                    </div>
                    <div
                      className="blue-field"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ height: '20px' }}
                      onBlur={(e) => updateField('f_docs_attached', e.target.innerText)}
                    >
                      {fields.f_docs_attached}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* GOODS TABLE */}
            <table className="goods-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}><span className="th-fa">6. علائم</span><span className="th-en">Marks</span></th>
                  <th style={{ width: '10%' }}><span className="th-fa">7. تعداد</span><span className="th-en">Packages</span></th>
                  <th style={{ width: '10%' }}><span className="th-fa">8. بسته‌بندی</span><span className="th-en">Packing</span></th>
                  <th style={{ width: '32%' }}><span className="th-fa">9. شرح کالا</span><span className="th-en">Description</span></th>
                  <th style={{ width: '14%' }}><span className="th-fa">10. کد آماری</span><span className="th-en">HS Code</span></th>
                  <th style={{ width: '12%' }}><span className="th-fa">11. وزن ناخالص</span><span className="th-en">Weight (kg)</span></th>
                  <th style={{ width: '12%' }}><span className="th-fa">12. حجم</span><span className="th-en">Volume (m³)</span></th>
                </tr>
              </thead>
              <tbody>
                <tr className="goods-row-main">
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px' }} onBlur={(e) => updateField('f_marks_1', e.target.innerText)}>{fields.f_marks_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px' }} onBlur={(e) => updateField('f_pkg_1', e.target.innerText)}>{fields.f_pkg_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px' }} onBlur={(e) => updateField('f_meth_1', e.target.innerText)}>{fields.f_meth_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px', fontWeight: 'bold' }} onBlur={(e) => updateField('f_desc_1', e.target.innerText)}>{fields.f_desc_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px' }} onBlur={(e) => updateField('f_stat_1', e.target.innerText)}>{fields.f_stat_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px', fontWeight: 'bold' }} onBlur={(e) => updateField('f_wt_1', e.target.innerText)}>{fields.f_wt_1}</div></td>
                  <td><div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '48px' }} onBlur={(e) => updateField('f_vol_1', e.target.innerText)}>{fields.f_vol_1}</div></td>
                </tr>
              </tbody>
            </table>

            {/* BOTTOM SECTION */}
            <table className="bottom-table">
              <tbody>
                <tr>
                  <td style={{ width: '50%', height: '220px' }}>
                    <div className="b13-container">
                      <div>
                        <div className="box-lbl">
                          <span className="fa-title">13. دستورات فرستنده</span>
                          <span className="en-title">Senders instructions</span>
                        </div>
                        <div className="blue-field" contentEditable suppressContentEditableWarning style={{ height: '75px' }} onBlur={(e) => updateField('f_sender_inst', e.target.innerText)}>{fields.f_sender_inst}</div>
                      </div>
                      <div className="declared-value-container">
                        <div className="declared-val-row">
                          <span className="en-title" style={{ display: 'inline', fontSize: '8.5px', paddingLeft: 0 }}>Declared value / ارزش:</span>
                          <div className="blue-field" contentEditable suppressContentEditableWarning style={{ flex: 1 }} onBlur={(e) => updateField('f_declared_val', e.target.innerText)}>{fields.f_declared_val}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '50%', height: '220px' }}>
                    <div style={{ padding: '8px', fontSize: '9px' }}>
                      <strong>19. To be paid by / مبالغ قابل پرداخت</strong>
                      <div style={{ marginTop: '8px', border: '1px solid #ccc', padding: '6px' }}>
                        Carriage charges: 200 USD
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
