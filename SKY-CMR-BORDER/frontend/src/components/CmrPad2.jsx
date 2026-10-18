import React from 'react';
import { useCmr, cleanCmrNumber } from '../context/CmrContext';
import { PartyQuickSelector } from './PartyQuickSelector';

export const CmrPad2 = () => {
  const { fields, updateField, zoom } = useCmr();

  const baseWidth = 794;
  const baseHeight = 1120;

  const toggleP2Checkbox = (fieldKey) => {
    const current = fields[fieldKey];
    updateField(fieldKey, current === '✓' ? '' : '✓');
  };

  return (
    <div id="pad2_container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="cmr-page-wrapper" id="wrapper_pad2" style={{ width: `${baseWidth * zoom}px`, height: `${baseHeight * zoom}px` }}>
        <div className="cmr-page-sheet" id="pad2_sheet" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', padding: '10px 14px', background: '#fff' }}>
          
          {/* =========================================================================
              UPPER SECTION: BOXES 1-5 & 16-18
              ========================================================================= */}
          <table className="p2-exact-table" style={{ borderBottom: 'none' }}>
            <tbody>
              {/* ROW 1: BOX 1 (SENDER) & TOP-RIGHT CMR HEADER */}
              <tr>
                <td style={{ width: '56%', height: '105px', verticalAlign: 'top' }}>
                  <div className="p2-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="p2-en-title">1. Sender (name,address,country)</span>
                      <span className="p2-ru-title">Отправитель (имя,адрес,страна)</span>
                    </div>
                    <PartyQuickSelector type="sender" />
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_sender"
                    style={{ minHeight: '68px', fontSize: '11.5px', fontWeight: 'bold', lineHeight: '1.32', whiteSpace: 'pre-line' }}
                    onBlur={(e) => updateField('f2_sender', e.target.innerText)}
                  >
                    {fields.f2_sender}
                  </div>
                </td>

                <td style={{ width: '44%', height: '105px', padding: '4px 6px', verticalAlign: 'top' }}>
                  <div className="p2-header-cell">
                    <div className="p2-doc-title">INTERNATIONAL CONSIGNMENT NOTE</div>

                    <div className="p2-cmr-row">
                      <span className="p2-cmr-black">CMR</span>
                      <div className="p2-cmr-num-container">
                        <span className="p2-cmr-no-lbl">No</span>
                        <span
                          className="editable-cmr-badge p2-cmr-underline"
                          contentEditable
                          suppressContentEditableWarning
                          id="f2_cmr_number"
                          title="Click to edit CMR No"
                          onBlur={(e) => updateField('f2_cmr_number', cleanCmrNumber(e.target.innerText.trim()))}
                        >
                          {cleanCmrNumber(fields.f2_cmr_number) || cleanCmrNumber(fields.inv_number) || '110'}
                        </span>
                      </div>
                    </div>

                    <div className="p2-header-clause">
                      This carriage is subject, notwithstanding any clause to the contrary, to the Conventionon the Contract for the International Carriage of goods by road (CMR)
                    </div>
                  </div>
                </td>
              </tr>

              {/* ROW 2: BOX 2 (CONSIGNEE) & BOX 16 (COURIER / CARRIER) */}
              <tr>
                <td style={{ width: '56%', height: '95px', verticalAlign: 'top' }}>
                  <div className="p2-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="p2-en-title">2. Consignee (name,address,country)</span>
                      <span className="p2-ru-title">Грузополчатель (имя,адрес,страна,дата)</span>
                    </div>
                    <PartyQuickSelector type="consignee" />
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_consignee"
                    style={{ minHeight: '60px', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3', whiteSpace: 'pre-line' }}
                    onBlur={(e) => updateField('f2_consignee', e.target.innerText)}
                  >
                    {fields.f2_consignee}
                  </div>
                </td>

                <td style={{ width: '44%', height: '95px', verticalAlign: 'top' }}>
                  <div className="p2-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="p2-en-title">16. Courier (name, address, country)</span>
                      <span className="p2-ru-title">Первозчик (ИМЯ ,адрес,страна)</span>
                    </div>
                    <PartyQuickSelector type="carrier" />
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_carrier"
                    style={{ minHeight: '60px', textAlign: 'center', fontWeight: 'bold', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    onBlur={(e) => updateField('f2_carrier', e.target.innerText)}
                  >
                    {fields.f2_carrier}
                  </div>
                </td>
              </tr>

              {/* ROW 3: BOX 3 (DELIVERY PLACE) & BOX 17 (SUCCESSIVE CARRIERS) */}
              <tr>
                <td style={{ width: '56%', height: '42px', verticalAlign: 'top' }}>
                  <div className="p2-box-header">
                    <span className="p2-en-title">3. Place of delivery of the goods (place, country)</span>
                    <span className="p2-ru-title">Место Резгрузки (город, страна,дата)</span>
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_delivery_place"
                    style={{ minHeight: '18px', fontWeight: 'bold', fontSize: '11px' }}
                    onBlur={(e) => updateField('f2_delivery_place', e.target.innerText)}
                  >
                    {fields.f2_delivery_place}
                  </div>
                </td>

                <td style={{ width: '44%', height: '42px', verticalAlign: 'top' }}>
                  <div className="p2-box-header">
                    <span className="p2-en-title">17. Successive carriers (name, address, country)</span>
                    <span className="p2-ru-title">Следующий перевоозчик (ИМЯ ,адрес,страна)</span>
                  </div>
                  <div
                    className="blue-field"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_succ_carrier"
                    style={{ minHeight: '18px', fontSize: '9.5px' }}
                    onBlur={(e) => updateField('f2_succ_carrier', e.target.innerText)}
                  >
                    {fields.f2_succ_carrier}
                  </div>
                </td>
              </tr>

              {/* ROW 4 & 5: BOX 4 & 5 ON LEFT; BOX 18 SPANNING ROWS ON RIGHT */}
              <tr>
                {/* BOX 4 */}
                <td style={{ width: '56%', height: '48px', verticalAlign: 'top' }}>
                  <div className="p2-box-header">
                    <span className="p2-en-title">4. Place and date talking over the goods (Place, country, date)</span>
                    <span className="p2-ru-title">Место Погрузки (горд, страна, дата)</span>
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_taking_place"
                    style={{ minHeight: '18px', fontWeight: 'bold', fontSize: '11px' }}
                    onBlur={(e) => updateField('f2_taking_place', e.target.innerText)}
                  >
                    {fields.f2_taking_place}
                  </div>
                </td>

                {/* BOX 18 (SPANS DOWN BESIDE BOX 4 & 5) */}
                <td rowSpan={2} style={{ width: '44%', verticalAlign: 'top', padding: '3px 6px' }}>
                  <div className="p2-box-header">
                    <span className="p2-en-title">18. Carrier’s reservations and observation</span>
                    <span className="p2-ru-title">Замечания Перевозчика</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Водитель :</div>
                    <div className="p2-truck-line" style={{ margin: '4px 0' }}>
                      <span className="p2-truck-lbl" style={{ fontSize: '12px' }}>№ Машина :</span>
                      <div
                        className="blue-field p2-content-serif"
                        contentEditable
                        suppressContentEditableWarning
                        id="f2_truck_no"
                        style={{ width: '150px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px', paddingLeft: '15px' }}
                        onBlur={(e) => updateField('f2_truck_no', e.target.innerText)}
                      >
                        {fields.f2_truck_no}
                      </div>
                    </div>
                    <div className="p2-truck-line" style={{ margin: '4px 0' }}>
                      <span className="p2-truck-lbl" style={{ fontSize: '12px' }}>№ Працеп :</span>
                      <div
                        className="blue-field p2-content-serif"
                        contentEditable
                        suppressContentEditableWarning
                        id="f2_trailer_no"
                        style={{ width: '150px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px', paddingLeft: '15px' }}
                        onBlur={(e) => updateField('f2_trailer_no', e.target.innerText)}
                      >
                        {fields.f2_trailer_no}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* BOX 5 */}
              <tr>
                <td style={{ width: '56%', height: '48px', verticalAlign: 'top' }}>
                  <div className="p2-box-header">
                    <span className="p2-en-title">5. Documents attached</span>
                    <span className="p2-ru-title">Документы Приложеные отправителем</span>
                  </div>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_docs_attached"
                    style={{ fontWeight: 'bold', fontSize: '11px', minHeight: '18px', marginTop: '2px' }}
                    onBlur={(e) => updateField('f2_docs_attached', e.target.innerText)}
                  >
                    {fields.f2_docs_attached}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* =========================================================================
              GOODS TABLE: BOXES 6 TO 12 (EXACT 7 COLUMNS)
              ========================================================================= */}
          <table className="p2-exact-goods" style={{ marginTop: '-1px' }}>
            <thead>
              <tr>
                <th style={{ width: '11%' }}>
                  <span className="p2-th-en">6. Marks and Nos</span>
                  <span className="p2-th-ru">Знаки</span>
                </th>
                <th style={{ width: '13%' }}>
                  <span className="p2-th-en">7. Number of packages</span>
                  <span className="p2-th-ru">Количество мест</span>
                </th>
                <th style={{ width: '12%' }}>
                  <span className="p2-th-en">8. Mithod of packing</span>
                  <span className="p2-th-ru">Род упаковки</span>
                </th>
                <th style={{ width: '25%' }}>
                  <span className="p2-th-en">9. Nature of the goods</span>
                  <span className="p2-th-ru">Наименование Груза</span>
                </th>
                <th style={{ width: '15%' }}>
                  <span className="p2-th-en">10. Statistical Number</span>
                  <span className="p2-th-ru">Статистический номер</span>
                </th>
                <th style={{ width: '16%' }}>
                  <span className="p2-th-en">11.Gross Weight in Kg</span>
                  <span className="p2-th-ru">Вес брутто кг</span>
                </th>
                <th style={{ width: '8%' }}>
                  <span className="p2-th-en">12.</span>
                  <span className="p2-th-ru">Volume in m³</span>
                  <span className="p2-th-ru">Объем в м³</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* SUBHEADER: H.S CODE & TOTAL WEIGHT */}
              <tr style={{ height: '22px' }}>
                <td colSpan={4} style={{ borderRight: '1px solid #000' }}></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '1px', borderRight: '1px solid #000' }}>
                  H.S Code
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', padding: '1px', borderRight: '1px solid #000' }}>
                  TOTAL WEIGHT
                </td>
                <td></td>
              </tr>

              {/* MAIN GOODS ROW */}
              <tr style={{ height: '82px' }}>
                <td colSpan={4} style={{ verticalAlign: 'middle', padding: '6px 8px', borderRight: '1px solid #000' }}>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_goods_desc"
                    style={{ minHeight: '65px', fontWeight: 'bold', fontSize: '12px', lineHeight: '1.4', display: 'flex', alignItems: 'center' }}
                    onBlur={(e) => updateField('f2_goods_desc', e.target.innerText)}
                  >
                    {fields.f2_goods_desc}
                  </div>
                </td>

                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px', borderRight: '1px solid #000' }}>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_hs_code"
                    style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center', minHeight: '20px' }}
                    onBlur={(e) => updateField('f2_hs_code', e.target.innerText)}
                  >
                    {fields.f2_hs_code}
                  </div>
                </td>

                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px', borderRight: '1px solid #000' }}>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_net_wt"
                    style={{ fontWeight: 'bold', fontSize: '11.5px', textAlign: 'center', minHeight: '20px' }}
                    title="Net Weight / Weight"
                    onBlur={(e) => updateField('f2_net_wt', e.target.innerText)}
                  >
                    {fields.f2_net_wt || 'N.W: 10000 KG'}
                  </div>
                </td>

                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                  <div
                    className="blue-field"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_vol"
                    style={{ minHeight: '20px', textAlign: 'center' }}
                    onBlur={(e) => updateField('f2_vol', e.target.innerText)}
                  >
                    {fields.f2_vol}
                  </div>
                </td>
              </tr>

              {/* TOTAL SUMMARY ROW */}
              <tr style={{ height: '26px', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ padding: '2px 8px', verticalAlign: 'middle', borderRight: '1px solid #000' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12.5px' }}>TOTAL:</span>
                    <div
                      className="blue-field p2-content-serif"
                      contentEditable
                      suppressContentEditableWarning
                      id="f2_total_packages"
                      style={{ flex: 1, fontWeight: 'bold', fontSize: '12px' }}
                      onBlur={(e) => updateField('f2_total_packages', e.target.innerText)}
                    >
                      {fields.f2_total_packages}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '2px 4px', borderRight: '1px solid #000' }}>
                  <div
                    className="blue-field p2-content-serif"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_total_weight"
                    style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px' }}
                    onBlur={(e) => updateField('f2_total_weight', e.target.innerText)}
                  >
                    {fields.f2_total_weight}
                  </div>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* =========================================================================
              BOTTOM SECTION: BOXES 13, 14, 21 ON LEFT; 19, 20 ON RIGHT
              ========================================================================= */}
          <table className="p2-exact-table" style={{ marginTop: '-1px', borderBottom: 'none' }}>
            <tbody>
              <tr>
                {/* LEFT COLUMN (56%): BOXES 13, 14, 21 */}
                <td style={{ width: '56%', verticalAlign: 'top', padding: 0 }}>
                  
                  {/* BOX 13: SENDER'S INSTRUCTIONS */}
                  <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', height: '105px', boxSizing: 'border-box' }}>
                    <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                      <span className="p2-en-title">13. Sender’s instructions</span>
                      <span className="p2-ru-title">Указания отправителя</span>
                    </div>
                    <div
                      className="blue-field p2-content-serif"
                      contentEditable
                      suppressContentEditableWarning
                      id="f2_sender_inst"
                      style={{ minHeight: '70px', fontWeight: 'bold', fontSize: '12px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-line' }}
                      onBlur={(e) => updateField('f2_sender_inst', e.target.innerText)}
                    >
                      {fields.f2_sender_inst}
                    </div>
                  </div>

                  {/* BOX 14: INSTRUCTION AS TO PAYMENT */}
                  <div style={{ padding: '4px 6px', borderBottom: '1px solid #000', height: '56px', boxSizing: 'border-box' }}>
                    <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                      <span className="p2-en-title">14 Instruction as to payment for carriage</span>
                      <span className="p2-ru-title">Распоряжения о расплате по ценам</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px', fontSize: '9px', paddingLeft: '15px' }}>
                      <div className="clickable-checkbox" onClick={() => toggleP2Checkbox('chk_p2_paid')}>
                        <span className="chk-box-square" id="chk_p2_paid">{fields.chk_p2_paid || ''}</span>
                        <span style={{ fontSize: '9.5px' }}>Carriage paid &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Оплаченная перевозка</span>
                      </div>
                      <div className="clickable-checkbox" onClick={() => toggleP2Checkbox('chk_p2_fwd')}>
                        <span className="chk-box-square" id="chk_p2_fwd">{fields.chk_p2_fwd || ''}</span>
                        <span style={{ fontSize: '9.5px' }}>Carriage forward &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Форвард первозки</span>
                      </div>
                    </div>
                  </div>

                  {/* BOX 21: ESTABLISHED IN */}
                  <div style={{ padding: '4px 6px', height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      <span className="p2-en-title">21. Established in</span>
                      <span className="p2-ru-title">Изготовлен в</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '10px', margin: '6px 0' }}>
                      <span style={{ fontWeight: 'bold' }}>On:</span>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="f2_est_date"
                        style={{ width: '110px', textAlign: 'center', fontWeight: 'bold', fontSize: '10.5px' }}
                        onBlur={(e) => updateField('f2_est_date', e.target.innerText)}
                      >
                        {fields.f2_est_date || '___/___/___'}
                      </div>
                    </div>
                    <div style={{ fontSize: '9px', marginLeft: '10px' }}>На</div>
                  </div>
                </td>

                {/* RIGHT COLUMN (44%): BOXES 19, 20 */}
                <td style={{ width: '44%', verticalAlign: 'top', padding: 0, borderLeft: '1px solid #000' }}>
                  
                  {/* BOX 19: SPECIAL AGREEMENTS */}
                  <div style={{ padding: '3px 5px', borderBottom: '1px solid #000', height: '32px', boxSizing: 'border-box' }}>
                    <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      <span className="p2-en-title">19. Special agreements</span>
                      <span className="p2-ru-title" style={{ fontSize: '7px' }}>Особые условия перевозки</span>
                    </div>
                  </div>

                  {/* BOX 20: CHARGES TABLE */}
                  <div style={{ padding: 0 }}>
                    <table className="p2-charges-grid">
                      <thead>
                        <tr>
                          <th style={{ width: '32%', textAlign: 'left' }}>
                            <div className="th-b">20. To bt paid by</div>
                            <div>Подлежит оплате</div>
                          </th>
                          <th style={{ width: '22%' }}>
                            <div className="th-b">Senders</div>
                            <div>Перевзчки</div>
                          </th>
                          <th style={{ width: '22%' }}>
                            <div className="th-b">Currency</div>
                            <div>Валюта</div>
                          </th>
                          <th style={{ width: '24%' }}>
                            <div className="th-b">Consignee</div>
                            <div>Грузополчатель</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Carriage charges<br /><span style={{ fontSize: '6.5px' }}>Расхды по перевозке</span></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_c_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_c_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_c_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                        <tr>
                          <td>Dtductions,Отчист<br /><span style={{ fontSize: '6.5px' }}>ислет</span></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_d_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_d_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_d_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                        <tr>
                          <td>Balanc Баланс</td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_bal_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_bal_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_bal_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                        <tr>
                          <td>Supplies, Charges<br /><span style={{ fontSize: '6.5px' }}>Расходы поставки</span></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_sup_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_sup_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_sup_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                        <tr>
                          <td>Other charges<br /><span style={{ fontSize: '6.5px' }}>Другие Расходы</span></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_oth_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_oth_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_oth_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                        <tr style={{ fontWeight: 'bold' }}>
                          <td>TOTAL ИТОГО:</td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_tot_send" style={{ minHeight: '12px' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_tot_curr" style={{ minHeight: '12px', textAlign: 'center' }}></div></td>
                          <td><div className="blue-field" contentEditable suppressContentEditableWarning id="f2_c_tot_rec" style={{ minHeight: '12px' }}></div></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Security decorative lines */}
                    <div className="p2-bottom-lines">
                      <div className="p2-stripe"></div>
                      <div className="p2-stripe"></div>
                      <div className="p2-stripe"></div>
                      <div className="p2-stripe"></div>
                      <div className="p2-stripe"></div>
                      <div className="p2-stripe"></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* =========================================================================
              BOTTOM SIGNATURE ROW: BOXES 22, 23, 24
              ========================================================================= */}
          <table className="p2-exact-table" style={{ marginTop: '-1px' }}>
            <tbody>
              <tr>
                {/* BOX 22: SENDER */}
                <td style={{ width: '34%', height: '98px', verticalAlign: 'top', padding: '3px 5px' }}>
                  <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                    <span className="p2-en-title">22 Signature and stamp of the sender</span>
                    <span className="p2-ru-title">Подпись и печать отправителя</span>
                  </div>
                  <div
                    className="blue-field"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_sender_sign"
                    style={{ height: '68px', marginTop: '2px' }}
                    onBlur={(e) => updateField('f2_sender_sign', e.target.innerText)}
                  >
                    {fields.f2_sender_sign}
                  </div>
                </td>

                {/* BOX 23: CARRIER */}
                <td style={{ width: '33%', height: '98px', verticalAlign: 'top', padding: '3px 5px' }}>
                  <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                    <span className="p2-en-title">23. Signature and stamp of the carrier</span>
                    <span className="p2-ru-title">Подпись и печать перевозчика</span>
                  </div>
                  <div
                    className="blue-field"
                    contentEditable
                    suppressContentEditableWarning
                    id="f2_carrier_sign"
                    style={{ height: '68px', marginTop: '2px' }}
                    onBlur={(e) => updateField('f2_carrier_sign', e.target.innerText)}
                  >
                    {fields.f2_carrier_sign}
                  </div>
                </td>

                {/* BOX 24: CONSIGNEE */}
                <td style={{ width: '33%', height: '98px', verticalAlign: 'top', padding: '3px 5px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                        <span className="p2-en-title">24. Goods received</span>
                        <span className="p2-ru-title">Груз полчен</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', marginTop: '2px' }}>
                        <span>Place</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>On</span>
                          <div
                            className="blue-field"
                            contentEditable
                            suppressContentEditableWarning
                            id="f2_rec_date"
                            style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '9.5px' }}
                            onBlur={(e) => updateField('f2_rec_date', e.target.innerText)}
                          >
                            {fields.f2_rec_date || '___/___/___'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '3px' }}>
                      <div className="p2-box-header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                        <span className="p2-en-title" style={{ fontSize: '7.8px' }}>Signature and stamp of the consignee</span>
                        <span className="p2-ru-title" style={{ fontSize: '6.8px' }}>Подпись и печать грузополучателя</span>
                      </div>
                      <div
                        className="blue-field"
                        contentEditable
                        suppressContentEditableWarning
                        id="f2_consignee_sign"
                        style={{ height: '32px', marginTop: '1px' }}
                        onBlur={(e) => updateField('f2_consignee_sign', e.target.innerText)}
                      >
                        {fields.f2_consignee_sign}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
};


