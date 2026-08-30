import React, { createContext, useContext, useState, useEffect } from 'react';
import { LOGISTICS_PRESETS } from '../utils/presets';
import { exportDirectPdf } from '../utils/pdfExport';
import { DEFAULT_SAVED_CMRS } from '../utils/archiveSeed';

const CmrContext = createContext();

// Number to Words Converter for International Export Invoices
export function numberToWordsUSD(amount, currency = 'USD') {
  if (isNaN(amount) || amount <= 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(num) {
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' ';
    } else if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(amount);
  const cents = Math.round((amount - intPart) * 100);

  if (intPart === 0 && cents === 0) return '';

  const billions = Math.floor(intPart / 1000000000);
  const millions = Math.floor((intPart % 1000000000) / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const remainder = intPart % 1000;

  let result = '';
  if (billions) result += convertGroup(billions) + ' Billion ';
  if (millions) result += convertGroup(millions) + ' Million ';
  if (thousands) result += convertGroup(thousands) + ' Thousand ';
  if (remainder) result += convertGroup(remainder) + ' ';

  result = result.trim();
  const currLabel = currency === 'USD' || currency === '$' ? 'US Dollars' : currency === 'EUR' || currency === '€' ? 'Euros' : currency === 'AFN' ? 'Afghanis' : currency;

  if (cents > 0) {
    result += ` ${currLabel} and ${convertGroup(cents)} Cents`;
  } else {
    result += ` ${currLabel}`;
  }

  return `Say: ${result} Only`;
}

// Extract Invoice Number from raw text or Box 5 docs attached string
export function extractInvoiceNumber(text) {
  if (!text) return '';
  const clean = text.trim();
  // 1. Explicit pattern like "INVICE No: SA-179" or "INVOICE NO: 179" or "Invoice #SA-179"
  const match1 = clean.match(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*([A-Za-z0-9\-_/]+)/i);
  if (match1 && match1[1]) return match1[1].trim();

  // 2. Pattern like "SA-179" or "SA179" or "EXP-179"
  const match2 = clean.match(/\b([A-Z]{1,4}-[0-9A-Za-z]+)\b/i);
  if (match2 && match2[1]) return match2[1].trim();

  // 3. Simple standalone code or number e.g. "179"
  const match3 = clean.match(/\b([0-9]{2,8})\b/);
  if (match3 && match3[1]) return match3[1].trim();

  return clean;
}

// Calculation helper: Multiplies Unit Price with Net Weight / Quantity
export function calculateInvoiceTotals(fieldsObj) {
  if (!fieldsObj) return null;
  const netWtText = fieldsObj.inv_item_net_wt || fieldsObj.f2_net_wt || '';
  const descText = fieldsObj.inv_item_desc || '';
  const unitPriceText = fieldsObj.inv_item_unitprice || '4.45 USD / KG';

  let netWeight = 0;
  // 1. Try inv_item_net_wt / f2_net_wt e.g. "N.W: 10000 KG" or "10,000.00 KG"
  const nwMatch1 = netWtText.match(/(?:N\.?W\.?|NET\s*WEIGHT)?\s*[:=\-]?\s*([0-9,]+(?:\.[0-9]+)?)/i);
  if (nwMatch1) {
    netWeight = parseFloat(nwMatch1[1].replace(/,/g, '')) || 0;
  } else if (netWtText.trim()) {
    const fallbackNum = netWtText.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (fallbackNum) netWeight = parseFloat(fallbackNum[1].replace(/,/g, '')) || 0;
  }

  // 2. If not found, check desc
  if (!netWeight && descText) {
    const nwMatches = [...descText.matchAll(/(?:N\.?W\.?|NET\s*WEIGHT)\s*[:=\-]?\s*([0-9,]+(?:\.[0-9]+)?)/gi)];
    if (nwMatches.length > 0) {
      const lastMatch = nwMatches[nwMatches.length - 1];
      netWeight = parseFloat(lastMatch[1].replace(/,/g, '')) || 0;
    }
  }

  // 3. If still not found, check f2_total_weight or f_wt_1
  if (!netWeight) {
    const totalWt = fieldsObj.inv_total_net_wt || fieldsObj.f2_total_weight || fieldsObj.f_wt_1 || '';
    const twMatch = totalWt.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (twMatch) netWeight = parseFloat(twMatch[1].replace(/,/g, '')) || 0;
  }

  // Extract Unit Price number and Currency
  let unitPrice = 0;
  const upMatch = unitPriceText.match(/([0-9,]+(?:\.[0-9]+)?)/);
  if (upMatch) {
    unitPrice = parseFloat(upMatch[1].replace(/,/g, '')) || 0;
  }

  let currency = 'USD';
  const currMatch = unitPriceText.match(/\b(USD|EUR|AFN|AED|INR|GBP|PKR|RUB|CNY|\$|€|£)\b/i);
  if (currMatch) {
    currency = currMatch[1].toUpperCase();
  }

  if (netWeight > 0 && unitPrice > 0) {
    const total = netWeight * unitPrice;
    const formattedTotal = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
    const formattedNetWt = netWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' KG';
    const words = numberToWordsUSD(total, currency);

    return {
      netWeight,
      formattedNetWt,
      unitPrice,
      currency,
      total,
      formattedTotal,
      words
    };
  }

  return null;
}

const INITIAL_FIELDS = DEFAULT_SAVED_CMRS[0].fields;

export const CmrProvider = ({ children }) => {
  const [activePad, setActivePad] = useState(2); // 1 = CMR 1, 2 = CMR 2, 3 = Commercial Invoice
  const [activeDocPage, setActiveDocPage] = useState(1); // For Pad 1: Page 1 or Page 2
  const [theme, setTheme] = useState('light');
  
  // Responsive auto-fit zoom for mobile devices
  const getInitialZoom = () => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 820) {
        return Math.min(1.0, Math.max(0.35, (w - 16) / 794));
      }
    }
    return 1.0;
  };

  const [zoom, setZoom] = useState(getInitialZoom);
  const [isPaperView, setIsPaperView] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 820);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  
  const [fields, setFields] = useState(() => {
    const saved = localStorage.getItem('cmr_active_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_FIELDS, ...(parsed.fields || {}) };
      } catch (e) {
        return INITIAL_FIELDS;
      }
    }
    return INITIAL_FIELDS;
  });

  const [cmrSerial, setCmrSerial] = useState(() => {
    return localStorage.getItem('cmr_serial_counter') || '75';
  });

  const [savedDocs, setSavedDocs] = useState(() => {
    try {
      const v = localStorage.getItem('cmr_archive_version');
      if (v !== 'v3') {
        localStorage.setItem('cmr_archive_version', 'v3');
        localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
        return DEFAULT_SAVED_CMRS;
      }
      const existing = JSON.parse(localStorage.getItem('cmr_saved_archive') || '[]');
      if (!existing || existing.length === 0) {
        localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
        return DEFAULT_SAVED_CMRS;
      }
      // Map to replace old placeholder records with authentic real PDF records
      const realMap = new Map(DEFAULT_SAVED_CMRS.map(d => [String(d.cmr_number), d]));
      const updated = existing.map(d => realMap.get(String(d.cmr_number)) || d);
      for (const realDoc of DEFAULT_SAVED_CMRS) {
        if (!updated.some(d => String(d.cmr_number) === String(realDoc.cmr_number))) {
          updated.unshift(realDoc);
        }
      }
      localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
      return updated;
    } catch (e) {
      return DEFAULT_SAVED_CMRS;
    }
  });

  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [isSavedDocsOpen, setIsSavedDocsOpen] = useState(false);

  // Resize listener for mobile viewport & auto-fit
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const mobile = w <= 820;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      showToast('🎉 Sky CMR App installed successfully!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstallPrompt = async () => {
    if (!deferredPrompt) {
      showToast('💡 To install: tap Share/Menu in your browser and select "Add to Home Screen" or "Install App".', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const fitToScreen = () => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const margin = w <= 480 ? 12 : 24;
      const fitScale = Math.min(1.0, Math.max(0.35, (w - margin) / 794));
      setZoom(Number(fitScale.toFixed(3)));
    }
  };

  // Sync state with body class for styling
  useEffect(() => {
    const isDark = theme === 'dark';
    let padClass = 'active-pad-2';
    if (activePad === 1) padClass = 'active-pad-1';
    else if (activePad === 2) padClass = 'active-pad-2';
    else if (activePad === 3) padClass = 'active-invoice';

    document.body.className = `${padClass} ${isDark ? 'theme-dark' : ''} ${isPaperView ? 'clean-print' : ''} ${isMobile ? 'is-mobile-device' : ''}`;
  }, [activePad, theme, isPaperView, isMobile]);

  // Autosave
  useEffect(() => {
    const draftData = {
      activePad,
      cmr_top_number: cmrSerial,
      saved_at: new Date().toISOString(),
      fields
    };
    localStorage.setItem('cmr_active_draft', JSON.stringify(draftData));
    
    // Attempt backend sync
    fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData)
    }).catch(() => {});
  }, [fields, activePad, cmrSerial]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const getCmrNoFromInvoice = () => {
    let detected = '';
    if (fields.inv_number && fields.inv_number.trim() && fields.inv_number !== 'SA-') {
      detected = fields.inv_number.trim();
    } else if (fields.f2_docs_attached || fields.f_docs_attached) {
      detected = extractInvoiceNumber(fields.f2_docs_attached || fields.f_docs_attached || '');
    }

    if (!detected) detected = 'SA-179';

    const formatted = detected.startsWith('SA-') || detected.includes('-') ? detected : `SA-${detected}`;

    let updatedDocs = fields.f2_docs_attached || `INVICE No: ${formatted}    DATE:    09 .08.2026`;
    if (/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updatedDocs)) {
      updatedDocs = updatedDocs.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${formatted}`);
    } else {
      updatedDocs = `INVICE No: ${formatted}    DATE:    09 .08.2026`;
    }

    setCmrSerial(formatted);
    setFields(prev => ({
      ...prev,
      f2_cmr_number: formatted,
      inv_number: formatted,
      inv_cmr_ref: `CMR #${formatted}`,
      f2_docs_attached: updatedDocs,
      f_docs_attached: updatedDocs
    }));

    showToast(`✅ CMR No synchronized from Invoice: ${formatted}`, 'success');
  };

  const updateField = (id, value) => {
    setFields(prev => {
      const updated = { ...prev, [id]: value };

      // LIVE AUTO-SYNC: INVOICE NUMBER ⇄ CMR NUMBER ⇄ BOX 5
      if (id === 'inv_number') {
        const cleanVal = (value || '').trim();
        if (cleanVal) {
          updated.f2_cmr_number = cleanVal;
          updated.inv_cmr_ref = cleanVal.startsWith('CMR') ? cleanVal : `CMR #${cleanVal}`;
          setCmrSerial(cleanVal);
          if (updated.f2_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f2_docs_attached)) {
            updated.f2_docs_attached = updated.f2_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
          if (updated.f_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f_docs_attached)) {
            updated.f_docs_attached = updated.f_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
        }
      } else if (id === 'f2_cmr_number') {
        const cleanVal = (value || '').trim();
        if (cleanVal) {
          updated.inv_number = cleanVal;
          updated.inv_cmr_ref = cleanVal.startsWith('CMR') ? cleanVal : `CMR #${cleanVal}`;
          setCmrSerial(cleanVal);
          if (updated.f2_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f2_docs_attached)) {
            updated.f2_docs_attached = updated.f2_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
          if (updated.f_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f_docs_attached)) {
            updated.f_docs_attached = updated.f_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
        }
      } else if (id === 'f2_docs_attached' || id === 'f_docs_attached') {
        const extracted = extractInvoiceNumber(value);
        if (extracted && extracted.length >= 2) {
          const formatted = extracted.startsWith('SA-') || extracted.includes('-') ? extracted : `SA-${extracted}`;
          updated.f2_cmr_number = formatted;
          updated.inv_number = formatted;
          updated.inv_cmr_ref = `CMR #${formatted}`;
          setCmrSerial(formatted);
        }
      }

      if (
        id === 'inv_item_unitprice' || 
        id === 'inv_item_desc' || 
        id === 'inv_item_net_wt' || 
        id === 'f2_net_wt' || 
        id === 'f2_gross_wt' || 
        id === 'f_wt_1' ||
        id === 'inv_total_net_wt'
      ) {
        const calc = calculateInvoiceTotals(updated);
        if (calc) {
          updated.inv_item_total = calc.formattedTotal;
          updated.inv_subtotal = calc.formattedTotal;
          updated.inv_total_amount = calc.formattedTotal;
          updated.f_declared_val = calc.formattedTotal;
          updated.inv_words = calc.words;
          if (!updated.inv_item_net_wt) updated.inv_item_net_wt = calc.formattedNetWt;
          if (!updated.inv_total_net_wt) updated.inv_total_net_wt = calc.formattedNetWt;
        }
      }
      return updated;
    });
  };

  // Sync CMR details to Enhanced Commercial Invoice
  const syncToInvoice = () => {
    const sender = fields.f2_sender || fields.f_consignor || '';
    const buyer = fields.f2_consignee || fields.f_consignee || '';
    const goods = fields.f2_goods_desc || fields.f_desc_1 || '';
    const hs = fields.f2_hs_code || fields.f_stat_1 || '9603100000';
    const pkgs = fields.f2_total_packages || fields.f_pkg_1 || '360 BUNDLES (16,000 PCS)';
    const gross = fields.f2_gross_wt || fields.f_wt_1 || '10,000.00 KG';
    const net = fields.f2_net_wt || '10,000.00 KG';
    const truck = fields.f2_truck_no || fields.f_tractor_reg || 'BLH815L';
    const trailer = fields.f2_trailer_no || fields.f_trailer_reg || 'BLH815L';
    const veh = `${truck} / ${trailer}`;
    const date = fields.f2_est_date || fields.f2_rec_date || '09.08.2026';
    
    // Priority: inv_number, or extracted from Box 5 docs_attached, or f2_cmr_number
    let invNo = fields.inv_number || '';
    if (!invNo || invNo === 'SA-') {
      invNo = extractInvoiceNumber(fields.f2_docs_attached || fields.f_docs_attached || '') || fields.f2_cmr_number || cmrSerial || 'SA-179';
    }
    const cmrNum = invNo;
    const carrier = fields.f2_carrier || fields.f_carrier || '“MANDUZAY TRANSPORTATION COMPANY”';
    const driver = fields.f2_driver || fields.f_driver_1 || 'Mohammad Anwar';
    const loadPlace = fields.f2_taking_place || fields.f_load_place || 'Hairatan Customs Terminal, Afghanistan';
    const deliveryPlace = fields.f2_delivery_place || fields.f_unload_place || 'Termiz Customs Post (Code: 22005), Uzbekistan';

    const tempFields = {
      ...fields,
      inv_item_net_wt: net,
      f2_net_wt: net,
      inv_item_desc: goods || 'AFGHAN NATURAL BROOM (GRADE AAA)',
      inv_item_unitprice: fields.inv_item_unitprice || '4.45 USD / KG'
    };
    const calc = calculateInvoiceTotals(tempFields);
    const subtotal = calc ? calc.formattedTotal : (fields.inv_subtotal || '44,500.00 USD');
    const words = calc ? calc.words : 'Say: Forty-Four Thousand Five Hundred US Dollars Only';

    setFields(prev => ({
      ...prev,
      f2_cmr_number: cmrNum,
      inv_number: invNo,
      inv_date: date,
      inv_cmr_ref: `CMR #${cmrNum}`,
      inv_contract_no: prev.inv_contract_no || 'EXP-2026-AF-UZB',
      inv_incoterms: prev.inv_incoterms || 'CFR Termiz (Republic of Uzbekistan)',
      inv_payment_terms: prev.inv_payment_terms || '100% Advance T.T Wire Transfer',
      inv_currency: prev.inv_currency || 'USD ($)',
      inv_seller: sender,
      inv_buyer: buyer,
      inv_origin: 'AFGHANISTAN',
      inv_dest_country: 'REPUBLIC OF UZBEKISTAN',
      inv_loading_place: loadPlace,
      inv_delivery_place: deliveryPlace,
      inv_carrier_name: carrier,
      inv_vehicle_no: veh,
      inv_veh_sub: veh,
      inv_driver_name: driver,
      inv_item_no: '1',
      inv_item_desc: goods || 'AFGHAN NATURAL BROOM (GRADE AAA)',
      inv_item_hs: hs,
      inv_item_qty: pkgs,
      inv_item_net_wt: net,
      inv_item_gross_wt: gross,
      inv_item_unitprice: prev.inv_item_unitprice || '4.45 USD / KG',
      inv_item_total: subtotal,
      inv_total_packages: pkgs,
      inv_total_net_wt: net,
      inv_total_gross_wt: gross,
      inv_subtotal: subtotal,
      inv_freight: prev.inv_freight || 'INCLUDED (CFR)',
      inv_total_amount: subtotal,
      inv_words: words,
      inv_declaration: prev.inv_declaration || 'We hereby certify that this invoice shows the actual price of the goods described and that all particulars are true, accurate and authentic.',
      inv_bank_name: prev.inv_bank_name || 'Afghanistan International Bank (AIB)',
      inv_bank_account: prev.inv_bank_account || 'Saboor Adel Trading Co. / Sky Ariana Transit',
      inv_bank_iban: prev.inv_bank_iban || 'AF92AIBK0000001010411161',
      inv_bank_swift: prev.inv_bank_swift || 'AIBKAFKB'
    }));
  };

  const autoGenerateInvoice = () => {
    syncToInvoice();
    setActivePad(3);
    showToast('⚡ Commercial Invoice generated & synced from CMR!', 'success');
  };

  const generateNewCmr = () => {
    const nextNum = parseInt(cmrSerial || '75') + 1;
    const serialStr = nextNum.toString();
    setCmrSerial(serialStr);
    localStorage.setItem('cmr_serial_counter', serialStr);

    setFields(prev => ({
      ...prev,
      f2_cmr_number: serialStr,
      inv_number: `SA-${serialStr}`,
      inv_cmr_ref: `CMR #${serialStr}`
    }));

    showToast(`✅ New CMR Number generated: ${serialStr}`, 'success');
  };

  const resetToRealPdfs = () => {
    setSavedDocs(DEFAULT_SAVED_CMRS);
    localStorage.setItem('cmr_archive_version', 'v3');
    localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
    showToast('🔄 Real PDF Archive Restored (CMRs 107-111)!', 'success');
  };

  const saveToArchive = () => {
    const cmrNo = fields.f2_cmr_number || cmrSerial || '75';
    const docRecord = {
      id: `doc_${Date.now()}`,
      cmr_number: cmrNo,
      consignor: (fields.f2_sender || fields.f_consignor || '').split('\n')[0],
      origin: fields.f2_taking_place || fields.f_load_place || 'Hiratan, Afghanistan',
      consignee: (fields.f2_consignee || fields.f_consignee || '').split('\n')[0],
      destination: fields.f2_delivery_place || fields.f_unload_place || 'Termiz, Uzbekistan',
      commodity: fields.f2_goods_desc || fields.f_desc_1 || 'General Goods',
      gross_weight: fields.f2_gross_wt || fields.f_wt_1 || '10000 KG',
      value: fields.inv_total_amount || fields.f_declared_val || '200 USD',
      truck: fields.f2_truck_no || fields.f_tractor_reg || 'BLH815L',
      driver: fields.f2_driver || fields.f_driver_1 || 'Mohammad Anwar',
      status: '🟢 Ready',
      saved_at: new Date().toLocaleString(),
      fullData: { activePad, fields, cmr_top_number: cmrNo }
    };

    const updated = [docRecord, ...savedDocs.filter(d => d.cmr_number !== cmrNo)];
    setSavedDocs(updated);
    localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
    showToast(`💾 Document ${cmrNo} saved to archive!`, 'success');
  };

  const restoreFromArchive = (doc) => {
    if (doc) {
      if (doc.fullData && doc.fullData.fields) {
        setFields(prev => ({ ...prev, ...doc.fullData.fields }));
        if (doc.fullData.activePad) setActivePad(doc.fullData.activePad);
        if (doc.fullData.cmr_top_number) setCmrSerial(doc.fullData.cmr_top_number);
      } else if (doc.fields) {
        setFields(prev => ({ ...prev, ...doc.fields }));
        if (doc.activePad) setActivePad(doc.activePad);
        if (doc.cmr_number) setCmrSerial(doc.cmr_number);
      }
      setIsSavedDocsOpen(false);
      showToast(`📂 Restored document: ${doc.cmr_number}`, 'success');
    }
  };

  const triggerPrint = () => {
    const origTitle = document.title;
    document.title = "";
    setIsPaperView(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = origTitle;
        setIsPaperView(false);
      }, 500);
    }, 100);
  };

  const triggerDownloadPdf = async () => {
    let elementId = 'wrapper_pad2';
    let filename = `CMR_No_${fields.f2_cmr_number || cmrSerial || '75'}.pdf`;

    if (activePad === 1) {
      elementId = activeDocPage === 1 ? 'wrapper_page1' : 'wrapper_page2';
      filename = `CMR_Pad1_Page${activeDocPage}.pdf`;
    } else if (activePad === 3) {
      elementId = 'wrapper_invoice';
      const invNo = fields.inv_number || 'SA-179';
      filename = `Commercial_Invoice_${invNo}.pdf`;
    }

    showToast(`⏳ Generating High-Definition 1-Page PDF: ${filename}`, 'info');
    try {
      await exportDirectPdf(elementId, filename);
      showToast(`✅ PDF Downloaded: ${filename}`, 'success');
    } catch (e) {
      showToast(`⚠️ PDF Generation fallback triggered`, 'info');
    }
  };

  const applyPreset = (presetKey) => {
    const preset = LOGISTICS_PRESETS[presetKey];
    if (!preset) return;
    setFields(prev => ({ ...prev, ...preset.fields }));
    syncToInvoice();
    setIsAutoFillOpen(false);
    showToast('⚡ Preset details successfully applied!', 'success');
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <CmrContext.Provider value={{
      activePad, setActivePad,
      activeDocPage, setActiveDocPage,
      theme, toggleTheme,
      zoom, setZoom, fitToScreen,
      isPaperView, setIsPaperView,
      fields, updateField, setFields,
      cmrSerial, setCmrSerial,
      savedDocs, saveToArchive, restoreFromArchive,
      isAutoFillOpen, setIsAutoFillOpen,
      isSavedDocsOpen, setIsSavedDocsOpen,
      autoGenerateInvoice, generateNewCmr,
      getCmrNoFromInvoice,
      triggerPrint, triggerDownloadPdf,
      applyPreset,
      toasts, showToast,
      isMobile,
      isMobileEditorOpen, setIsMobileEditorOpen,
      isMobileMenuOpen, setIsMobileMenuOpen,
      isInstallable, isAppInstalled, triggerInstallPrompt
    }}>
      {children}
    </CmrContext.Provider>
  );
};

export const useCmr = () => useContext(CmrContext);
