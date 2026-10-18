import React, { createContext, useContext, useState, useEffect } from 'react';
import { LOGISTICS_PRESETS } from '../utils/presets';
import { exportDirectPdf, buildConsignmentPdfFilename } from '../utils/pdfExport';
import { DEFAULT_SAVED_CMRS } from '../utils/archiveSeed';
import { DEFAULT_SAVED_SENDERS, DEFAULT_SAVED_CONSIGNEES, DEFAULT_SAVED_CARRIERS } from '../utils/partiesSeed';

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
  const match1 = clean.match(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*([A-Za-z0-9\-_/]+)/i);
  if (match1 && match1[1]) return match1[1].trim();

  const match2 = clean.match(/\b([A-Z]{1,4}-[0-9A-Za-z]+)\b/i);
  if (match2 && match2[1]) return match2[1].trim();

  const match3 = clean.match(/\b([0-9]{2,8})\b/);
  if (match3 && match3[1]) return match3[1].trim();

  return clean;
}

// Clean CMR Number
export function cleanCmrNumber(text) {
  if (!text) return '';
  const clean = text.toString().trim();
  return clean.replace(/^(?:SA\s*[-_]?\s*|CMR\s*#?\s*|NO\.?\s*)/i, '').trim() || clean;
}

// Extract entity name from multi-line address text
export function extractEntityName(text) {
  if (!text) return 'Unnamed Party';
  const firstLine = text.trim().split('\n')[0].replace(/^["']|["']$/g, '').trim();
  return firstLine.substring(0, 45) || 'Unnamed Party';
}

// Calculation helper: Multiplies Unit Price with Net Weight / Quantity
export function calculateInvoiceTotals(fieldsObj) {
  if (!fieldsObj) return null;
  const netWtText = fieldsObj.inv_item_net_wt || fieldsObj.f2_net_wt || '';
  const descText = fieldsObj.inv_item_desc || '';
  const unitPriceText = fieldsObj.inv_item_unitprice || '4.45 USD / KG';

  let netWeight = 0;
  const nwMatch1 = netWtText.match(/(?:N\.?W\.?|NET\s*WEIGHT)?\s*[:=\-]?\s*([0-9,]+(?:\.[0-9]+)?)/i);
  if (nwMatch1) {
    netWeight = parseFloat(nwMatch1[1].replace(/,/g, '')) || 0;
  } else if (netWtText.trim()) {
    const fallbackNum = netWtText.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (fallbackNum) netWeight = parseFloat(fallbackNum[1].replace(/,/g, '')) || 0;
  }

  if (!netWeight && descText) {
    const nwMatches = [...descText.matchAll(/(?:N\.?W\.?|NET\s*WEIGHT)\s*[:=\-]?\s*([0-9,]+(?:\.[0-9]+)?)/gi)];
    if (nwMatches.length > 0) {
      const lastMatch = nwMatches[nwMatches.length - 1];
      netWeight = parseFloat(lastMatch[1].replace(/,/g, '')) || 0;
    }
  }

  if (!netWeight) {
    const totalWt = fieldsObj.inv_total_net_wt || fieldsObj.f2_total_weight || fieldsObj.f_wt_1 || '';
    const twMatch = totalWt.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (twMatch) netWeight = parseFloat(twMatch[1].replace(/,/g, '')) || 0;
  }

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
  const [activePad, setActivePad] = useState(2);
  const [activeDocPage, setActiveDocPage] = useState(1);
  const [theme, setTheme] = useState('light');
  
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

  // Saved CMR Documents
  const [savedDocs, setSavedDocs] = useState(() => {
    try {
      const v = localStorage.getItem('cmr_archive_version');
      if (v !== 'v4') {
        localStorage.setItem('cmr_archive_version', 'v4');
        localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
        return DEFAULT_SAVED_CMRS;
      }
      const existing = JSON.parse(localStorage.getItem('cmr_saved_archive') || '[]');
      if (!existing || existing.length === 0) {
        localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
        return DEFAULT_SAVED_CMRS;
      }
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

  // Saved Senders (Address Book)
  const [savedSenders, setSavedSenders] = useState(() => {
    try {
      const stored = localStorage.getItem('cmr_saved_senders');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('cmr_saved_senders', JSON.stringify(DEFAULT_SAVED_SENDERS));
    return DEFAULT_SAVED_SENDERS;
  });

  // Saved Consignees (Address Book)
  const [savedConsignees, setSavedConsignees] = useState(() => {
    try {
      const stored = localStorage.getItem('cmr_saved_consignees');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('cmr_saved_consignees', JSON.stringify(DEFAULT_SAVED_CONSIGNEES));
    return DEFAULT_SAVED_CONSIGNEES;
  });

  // Saved Carriers (Address Book)
  const [savedCarriers, setSavedCarriers] = useState(() => {
    try {
      const stored = localStorage.getItem('cmr_saved_carriers');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('cmr_saved_carriers', JSON.stringify(DEFAULT_SAVED_CARRIERS));
    return DEFAULT_SAVED_CARRIERS;
  });

  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [isSavedDocsOpen, setIsSavedDocsOpen] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [partiesActiveTab, setPartiesActiveTab] = useState('sender');

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 820);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    const isDark = theme === 'dark';
    let padClass = 'active-pad-2';
    if (activePad === 1) padClass = 'active-pad-1';
    else if (activePad === 2) padClass = 'active-pad-2';
    else if (activePad === 3) padClass = 'active-invoice';

    document.body.className = `${padClass} ${isDark ? 'theme-dark' : ''} ${isPaperView ? 'clean-print' : ''} ${isMobile ? 'is-mobile-device' : ''}`;
  }, [activePad, theme, isPaperView, isMobile]);

  // Autosave Draft
  useEffect(() => {
    const draftData = {
      activePad,
      cmr_top_number: cmrSerial,
      saved_at: new Date().toISOString(),
      fields
    };
    localStorage.setItem('cmr_active_draft', JSON.stringify(draftData));
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

  // ==========================================
  // SENDER, CONSIGNEE & CARRIER MANAGEMENT
  // ==========================================

  const saveCurrentSender = (customName) => {
    const currentText = fields.f2_sender || fields.f_consignor || fields.inv_seller || '';
    if (!currentText.trim()) {
      showToast('⚠️ Box 1 (Sender) is empty. Enter sender details first.', 'info');
      return;
    }
    const name = customName || extractEntityName(currentText);
    const id = `snd_${Date.now()}`;
    const newSender = {
      id,
      name,
      tag: 'Saved Sender',
      details: currentText.trim(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newSender, ...savedSenders.filter(s => s.name.toLowerCase() !== name.toLowerCase())];
    setSavedSenders(updated);
    localStorage.setItem('cmr_saved_senders', JSON.stringify(updated));
    showToast(`💾 Sender "${name}" saved to Address Book!`, 'success');
  };

  const saveCurrentConsignee = (customName) => {
    const currentText = fields.f2_consignee || fields.f_consignee || fields.inv_buyer || '';
    if (!currentText.trim()) {
      showToast('⚠️ Box 2 (Consignee) is empty. Enter consignee details first.', 'info');
      return;
    }
    const name = customName || extractEntityName(currentText);
    const id = `cns_${Date.now()}`;
    const newConsignee = {
      id,
      name,
      tag: 'Saved Consignee',
      details: currentText.trim(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newConsignee, ...savedConsignees.filter(c => c.name.toLowerCase() !== name.toLowerCase())];
    setSavedConsignees(updated);
    localStorage.setItem('cmr_saved_consignees', JSON.stringify(updated));
    showToast(`💾 Consignee "${name}" saved to Address Book!`, 'success');
  };

  const saveCurrentCarrier = (customName) => {
    const currentText = fields.f2_carrier || fields.f_carrier || fields.inv_carrier_name || '';
    if (!currentText.trim()) {
      showToast('⚠️ Box 16 (Carrier) is empty.', 'info');
      return;
    }
    const name = customName || extractEntityName(currentText);
    const id = `car_${Date.now()}`;
    const newCarrier = {
      id,
      name,
      tag: 'Saved Carrier',
      details: currentText.trim(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newCarrier, ...savedCarriers.filter(c => c.name.toLowerCase() !== name.toLowerCase())];
    setSavedCarriers(updated);
    localStorage.setItem('cmr_saved_carriers', JSON.stringify(updated));
    showToast(`💾 Carrier "${name}" saved to Address Book!`, 'success');
  };

  const applySender = (party) => {
    if (!party) return;
    setFields(prev => ({
      ...prev,
      f2_sender: party.details || party.name,
      f_consignor: party.details || party.name,
      inv_seller: party.details || party.name
    }));
    showToast(`⚡ Loaded Sender: ${party.name}`, 'success');
  };

  const applyConsignee = (party) => {
    if (!party) return;
    setFields(prev => ({
      ...prev,
      f2_consignee: party.details || party.name,
      f_consignee: party.details || party.name,
      inv_buyer: party.details || party.name
    }));
    showToast(`⚡ Loaded Consignee: ${party.name}`, 'success');
  };

  const applyCarrier = (party) => {
    if (!party) return;
    setFields(prev => ({
      ...prev,
      f2_carrier: party.details || party.name,
      f_carrier: party.details || party.name,
      inv_carrier_name: party.details || party.name
    }));
    showToast(`⚡ Loaded Carrier: ${party.name}`, 'success');
  };

  const saveParty = (type, partyObj) => {
    if (type === 'sender') {
      const updated = [partyObj, ...savedSenders.filter(s => s.id !== partyObj.id)];
      setSavedSenders(updated);
      localStorage.setItem('cmr_saved_senders', JSON.stringify(updated));
    } else if (type === 'consignee') {
      const updated = [partyObj, ...savedConsignees.filter(c => c.id !== partyObj.id)];
      setSavedConsignees(updated);
      localStorage.setItem('cmr_saved_consignees', JSON.stringify(updated));
    } else {
      const updated = [partyObj, ...savedCarriers.filter(c => c.id !== partyObj.id)];
      setSavedCarriers(updated);
      localStorage.setItem('cmr_saved_carriers', JSON.stringify(updated));
    }
    showToast(`✅ Saved ${partyObj.name} in directory!`, 'success');
  };

  const deleteParty = (type, id) => {
    if (!window.confirm('Delete this party from address book?')) return;
    if (type === 'sender') {
      const updated = savedSenders.filter(s => s.id !== id);
      setSavedSenders(updated);
      localStorage.setItem('cmr_saved_senders', JSON.stringify(updated));
    } else if (type === 'consignee') {
      const updated = savedConsignees.filter(c => c.id !== id);
      setSavedConsignees(updated);
      localStorage.setItem('cmr_saved_consignees', JSON.stringify(updated));
    } else {
      const updated = savedCarriers.filter(c => c.id !== id);
      setSavedCarriers(updated);
      localStorage.setItem('cmr_saved_carriers', JSON.stringify(updated));
    }
    showToast('🗑️ Party removed from address book.', 'info');
  };

  const openAddressBook = (tab = 'sender') => {
    setPartiesActiveTab(tab);
    setIsPartiesModalOpen(true);
  };

  // ==========================================
  // DOCUMENT SAVING & ARCHIVE SYSTEM
  // ==========================================

  const saveToArchive = () => {
    const cmrNo = fields.f2_cmr_number || cmrSerial || '75';
    const docRecord = {
      id: `doc_cmr_${cmrNo}`,
      cmr_number: cmrNo,
      consignor: extractEntityName(fields.f2_sender || fields.f_consignor || 'NAJIB AMIN LTD'),
      origin: fields.f2_taking_place || fields.f_load_place || 'Hiratan, Afghanistan',
      consignee: extractEntityName(fields.f2_consignee || fields.f_consignee || 'P.D TRADELINK'),
      destination: fields.f2_delivery_place || fields.f_unload_place || 'New Delhi, India',
      commodity: fields.f2_goods_desc || fields.f_desc_1 || 'Black Raisins',
      gross_weight: fields.f2_total_weight || fields.f2_gross_wt || fields.f_wt_1 || '10,000 KG',
      value: fields.inv_total_amount || fields.f_declared_val || '44,000 USD',
      truck: `${fields.f2_truck_no || ''} ${fields.f2_trailer_no ? '/ ' + fields.f2_trailer_no : ''}`.trim() || 'KBL2877',
      driver: fields.f2_driver || fields.f_driver_1 || '',
      date: fields.f2_est_date || '22.08.2026',
      activePad,
      status: '🟢 Dispatched',
      saved_at: new Date().toLocaleString(),
      fields: { ...fields, f2_cmr_number: cmrNo }
    };

    const updated = [docRecord, ...savedDocs.filter(d => String(d.cmr_number) !== String(cmrNo))];
    setSavedDocs(updated);
    localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
    showToast(`💾 Document CMR #${cmrNo} successfully saved!`, 'success');
  };

  const saveCurrentDocAsCopy = () => {
    const baseNo = fields.f2_cmr_number || cmrSerial || '75';
    const newNo = `${baseNo}-COPY`;
    const newFields = {
      ...fields,
      f2_cmr_number: newNo,
      inv_number: `SA-${newNo}`,
      inv_cmr_ref: `CMR #${newNo}`
    };

    const docRecord = {
      id: `doc_${Date.now()}`,
      cmr_number: newNo,
      consignor: extractEntityName(fields.f2_sender || fields.f_consignor || 'NAJIB AMIN LTD'),
      origin: fields.f2_taking_place || fields.f_load_place || 'Hiratan, Afghanistan',
      consignee: extractEntityName(fields.f2_consignee || fields.f_consignee || 'P.D TRADELINK'),
      destination: fields.f2_delivery_place || fields.f_unload_place || 'New Delhi, India',
      commodity: fields.f2_goods_desc || fields.f_desc_1 || 'Black Raisins',
      gross_weight: fields.f2_total_weight || fields.f2_gross_wt || fields.f_wt_1 || '10,000 KG',
      value: fields.inv_total_amount || fields.f_declared_val || '44,000 USD',
      truck: `${fields.f2_truck_no || ''} ${fields.f2_trailer_no ? '/ ' + fields.f2_trailer_no : ''}`.trim() || 'KBL2877',
      driver: fields.f2_driver || fields.f_driver_1 || '',
      date: fields.f2_est_date || '22.08.2026',
      activePad,
      status: '🟢 Draft Copy',
      saved_at: new Date().toLocaleString(),
      fields: newFields
    };

    const updated = [docRecord, ...savedDocs];
    setSavedDocs(updated);
    setFields(newFields);
    setCmrSerial(newNo);
    localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
    showToast(`📑 Cloned & saved new document copy: CMR #${newNo}`, 'success');
  };

  const deleteSavedDoc = (id) => {
    if (!window.confirm('Are you sure you want to delete this saved CMR document?')) return;
    const updated = savedDocs.filter(d => d.id !== id);
    setSavedDocs(updated);
    localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
    showToast('🗑️ Document removed from archive.', 'info');
  };

  const duplicateSavedDoc = (doc) => {
    const newNo = `${doc.cmr_number}-COPY`;
    const cloned = {
      ...doc,
      id: `doc_${Date.now()}`,
      cmr_number: newNo,
      status: '🟢 Cloned Copy',
      saved_at: new Date().toLocaleString(),
      fields: {
        ...(doc.fields || {}),
        f2_cmr_number: newNo,
        inv_number: `SA-${newNo}`,
        inv_cmr_ref: `CMR #${newNo}`
      }
    };
    const updated = [cloned, ...savedDocs];
    setSavedDocs(updated);
    localStorage.setItem('cmr_saved_archive', JSON.stringify(updated));
    showToast(`📑 Duplicated CMR #${doc.cmr_number} -> #${newNo}`, 'success');
  };

  const exportArchiveJson = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      app: 'Sky Ariana CMR & Invoice System',
      version: '4.0',
      savedDocs,
      savedSenders,
      savedConsignees,
      savedCarriers
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sky_CMR_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('📦 Complete archive & address book exported to JSON!', 'success');
  };

  const importArchiveJson = (jsonData) => {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      let count = 0;
      if (parsed.savedDocs && Array.isArray(parsed.savedDocs)) {
        const mergedDocs = [...parsed.savedDocs];
        for (const d of savedDocs) {
          if (!mergedDocs.some(m => m.id === d.id)) mergedDocs.push(d);
        }
        setSavedDocs(mergedDocs);
        localStorage.setItem('cmr_saved_archive', JSON.stringify(mergedDocs));
        count += parsed.savedDocs.length;
      }
      if (parsed.savedSenders && Array.isArray(parsed.savedSenders)) {
        const merged = [...parsed.savedSenders];
        for (const s of savedSenders) {
          if (!merged.some(m => m.id === s.id)) merged.push(s);
        }
        setSavedSenders(merged);
        localStorage.setItem('cmr_saved_senders', JSON.stringify(merged));
      }
      if (parsed.savedConsignees && Array.isArray(parsed.savedConsignees)) {
        const merged = [...parsed.savedConsignees];
        for (const c of savedConsignees) {
          if (!merged.some(m => m.id === c.id)) merged.push(c);
        }
        setSavedConsignees(merged);
        localStorage.setItem('cmr_saved_consignees', JSON.stringify(merged));
      }
      if (parsed.savedCarriers && Array.isArray(parsed.savedCarriers)) {
        const merged = [...parsed.savedCarriers];
        for (const c of savedCarriers) {
          if (!merged.some(m => m.id === c.id)) merged.push(c);
        }
        setSavedCarriers(merged);
        localStorage.setItem('cmr_saved_carriers', JSON.stringify(merged));
      }
      showToast(`🎉 Successfully restored ${count} documents & address book!`, 'success');
    } catch (e) {
      showToast('❌ Invalid JSON backup file format.', 'danger');
    }
  };

  const getCmrNoFromInvoice = () => {
    let rawInv = '';
    if (fields.inv_number && fields.inv_number.trim() && fields.inv_number !== 'SA-') {
      rawInv = fields.inv_number.trim();
    } else if (fields.f2_docs_attached || fields.f_docs_attached) {
      rawInv = extractInvoiceNumber(fields.f2_docs_attached || fields.f_docs_attached || '');
    }

    if (!rawInv) rawInv = fields.f2_cmr_number || cmrSerial || '110';

    const pureCmr = cleanCmrNumber(rawInv) || '110';
    const formattedInv = rawInv.startsWith('SA-') || rawInv.includes('-') ? rawInv : `SA-${rawInv}`;

    let updatedDocs = fields.f2_docs_attached || `INVICE No: ${formattedInv}    DATE:    09 .08.2026`;
    if (/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updatedDocs)) {
      updatedDocs = updatedDocs.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${formattedInv}`);
    } else {
      updatedDocs = `INVICE No: ${formattedInv}    DATE:    09 .08.2026`;
    }

    setCmrSerial(pureCmr);
    setFields(prev => ({
      ...prev,
      f2_cmr_number: pureCmr,
      inv_number: formattedInv,
      inv_cmr_ref: `CMR #${pureCmr}`,
      f2_docs_attached: updatedDocs,
      f_docs_attached: updatedDocs
    }));

    showToast(`✅ CMR No set to ${pureCmr} (Invoice: ${formattedInv})`, 'success');
  };

  const updateField = (id, value) => {
    setFields(prev => {
      const updated = { ...prev, [id]: value };

      if (id === 'inv_number') {
        const cleanVal = (value || '').trim();
        if (cleanVal) {
          const pureCmr = cleanCmrNumber(cleanVal);
          updated.f2_cmr_number = pureCmr || cleanVal;
          updated.inv_cmr_ref = `CMR #${pureCmr || cleanVal}`;
          setCmrSerial(pureCmr || cleanVal);
          if (updated.f2_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f2_docs_attached)) {
            updated.f2_docs_attached = updated.f2_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
          if (updated.f_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f_docs_attached)) {
            updated.f_docs_attached = updated.f_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${cleanVal}`);
          }
        }
      } else if (id === 'f2_cmr_number') {
        const cleanVal = cleanCmrNumber((value || '').trim());
        if (cleanVal) {
          updated.f2_cmr_number = cleanVal;
          updated.inv_cmr_ref = `CMR #${cleanVal}`;
          setCmrSerial(cleanVal);
          if (!updated.inv_number || updated.inv_number === 'SA-') {
            updated.inv_number = `SA-${cleanVal}`;
          }
          if (updated.f2_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f2_docs_attached)) {
            updated.f2_docs_attached = updated.f2_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${updated.inv_number || cleanVal}`);
          }
          if (updated.f_docs_attached && /(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i.test(updated.f_docs_attached)) {
            updated.f_docs_attached = updated.f_docs_attached.replace(/(?:INVOICE|INVICE|INV)\s*(?:NO\.?|NUMBER|#)?\s*[:=\-]?\s*[A-Za-z0-9\-_/]+/i, `INVICE No: ${updated.inv_number || cleanVal}`);
          }
        }
      } else if (id === 'f2_docs_attached' || id === 'f_docs_attached') {
        const extracted = extractInvoiceNumber(value);
        if (extracted && extracted.length >= 2) {
          const pureCmr = cleanCmrNumber(extracted);
          const formattedInv = extracted.startsWith('SA-') || extracted.includes('-') ? extracted : `SA-${extracted}`;
          updated.f2_cmr_number = pureCmr || extracted;
          updated.inv_number = formattedInv;
          updated.inv_cmr_ref = `CMR #${pureCmr || extracted}`;
          setCmrSerial(pureCmr || extracted);
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

  const syncToInvoice = () => {
    const sender = fields.f2_sender || fields.f_consignor || '';
    const buyer = fields.f2_consignee || fields.f_consignee || '';
    const goods = fields.f2_goods_desc || fields.f_desc_1 || '';
    const hs = fields.f2_hs_code || fields.f_stat_1 || '08062010';
    const pkgs = fields.f2_total_packages || fields.f_pkg_1 || '630 CTNS - BLACK-RAISINS (BEST)';
    const gross = fields.f2_gross_wt || fields.f_wt_1 || '10,565.00 KG';
    const net = fields.f2_net_wt || '10,080.00 KG';
    const truck = fields.f2_truck_no || fields.f_tractor_reg || 'KBL2877';
    const trailer = fields.f2_trailer_no || fields.f_trailer_reg || '75W415XA / 75-8267AA';
    const veh = `${truck}${trailer ? ' / ' + trailer : ''}`.trim();
    const date = fields.f2_est_date || fields.f2_rec_date || '22.08.2026';
    
    let invNo = fields.inv_number || '';
    if (!invNo || invNo === 'SA-') {
      invNo = extractInvoiceNumber(fields.f2_docs_attached || fields.f_docs_attached || '') || fields.f2_cmr_number || cmrSerial || '110';
    }
    const cmrNum = cleanCmrNumber(invNo);

    // Clean Carrier & Driver
    const carrierRaw = fields.f2_carrier || fields.f_carrier || fields.inv_carrier_name || 'SKY ARIANA LIMITED';
    const carrierName = extractEntityName(carrierRaw);
    const driverName = fields.f2_driver || fields.f_driver_1 || fields.inv_driver_name || '';
    const carrierDriver = driverName ? `${carrierName} / ${driverName}` : carrierName;

    // Origin Country
    let originCountry = 'AFGHANISTAN';
    if (sender.toUpperCase().includes('AFGHANISTAN')) originCountry = 'AFGHANISTAN';
    else if (sender.toUpperCase().includes('UZBEKISTAN')) originCountry = 'UZBEKISTAN';

    // Destination Country
    let destCountry = 'INDIA';
    if (buyer.toUpperCase().includes('INDIA') || (fields.f2_delivery_place || '').toUpperCase().includes('INDIA')) destCountry = 'INDIA';
    else if (buyer.toUpperCase().includes('UZBEKISTAN') || (fields.f2_delivery_place || '').toUpperCase().includes('UZBEKISTAN')) destCountry = 'REPUBLIC OF UZBEKISTAN';
    else if (buyer.toUpperCase().includes('GERMANY')) destCountry = 'GERMANY';

    // Clean Loading Port / Terminal
    let loadPlace = 'HAIRATAN BORDER / CUSTOMS, AFGHANISTAN';
    const rawLoad = fields.f2_taking_place || fields.f_load_place || '';
    if (rawLoad.toLowerCase().includes('hiratan') || rawLoad.toLowerCase().includes('hairatan')) {
      loadPlace = 'HAIRATAN BORDER / CUSTOMS, AFGHANISTAN';
    } else if (rawLoad.toLowerCase().includes('kandahar')) {
      loadPlace = 'KANDAHAR CUSTOMS TERMINAL, AFGHANISTAN';
    } else if (rawLoad.toLowerCase().includes('kabul')) {
      loadPlace = 'KABUL CUSTOMS TERMINAL, AFGHANISTAN';
    } else if (rawLoad.toLowerCase().includes('mazar')) {
      loadPlace = 'MAZAR-I-SHARIF CUSTOMS, AFGHANISTAN';
    } else if (rawLoad.trim()) {
      loadPlace = rawLoad.replace(/^Export From\s*/i, '').trim();
    }

    // Clean Discharge Port / Delivery Place
    let deliveryPlace = 'NEW DELHI / NAVI MUMBAI, INDIA (VIA TASHKENT AIR TRANSIT)';
    const rawDel = fields.f2_delivery_place || fields.f_unload_place || '';
    if (rawDel.toUpperCase().includes('NEW DELHI')) {
      deliveryPlace = 'NEW DELHI, INDIA (VIA TASHKENT AIR TRANSIT)';
    } else if (rawDel.toUpperCase().includes('MUMBAI') || buyer.toUpperCase().includes('MUMBAI')) {
      deliveryPlace = 'NAVI MUMBAI, INDIA (VIA TASHKENT AIR TRANSIT)';
    } else if (rawDel.toUpperCase().includes('TERMEZ') || rawDel.toUpperCase().includes('TERMIZ')) {
      deliveryPlace = 'TERMEZ CUSTOMS POST (CODE: 22005), UZBEKISTAN';
    } else if (rawDel.toUpperCase().includes('TASHKENT')) {
      deliveryPlace = 'TASHKENT AVIA YUKLAR CUSTOMS, UZBEKISTAN';
    } else if (rawDel.trim()) {
      deliveryPlace = rawDel.replace(/^VIA:\s*/i, '').trim();
    }

    const tempFields = {
      ...fields,
      inv_item_net_wt: net,
      f2_net_wt: net,
      inv_item_desc: goods || '1. 630 CTNS - BLACK-RAISINS (BEST)',
      inv_item_unitprice: fields.inv_item_unitprice || '4.45 USD / NET WEIGHT'
    };
    const calc = calculateInvoiceTotals(tempFields);
    const subtotal = calc ? calc.formattedTotal : (fields.inv_subtotal || '44,856.00 USD');
    const words = calc ? calc.words : 'Say: Forty-Four Thousand Eight Hundred Fifty-Six US Dollars Only';

    setFields(prev => ({
      ...prev,
      f2_cmr_number: cmrNum,
      inv_number: invNo,
      inv_date: date,
      inv_cmr_ref: `CMR #${cmrNum}`,
      inv_seller: sender,
      inv_buyer: buyer,
      inv_origin: originCountry,
      inv_dest_country: destCountry,
      inv_loading_place: loadPlace,
      inv_delivery_place: deliveryPlace,
      inv_carrier_name: carrierName,
      inv_vehicle_no: veh,
      inv_veh_sub: veh,
      inv_driver_name: carrierDriver,
      inv_item_no: '1',
      inv_item_desc: goods || '1. 630 CTNS - BLACK-RAISINS (BEST)',
      inv_item_hs: hs,
      inv_item_qty: pkgs,
      inv_item_net_wt: net,
      inv_item_gross_wt: gross,
      inv_item_unitprice: prev.inv_item_unitprice || '4.45 USD / NET WEIGHT',
      inv_item_total: subtotal,
      inv_total_packages: pkgs,
      inv_total_net_wt: net,
      inv_total_gross_wt: gross,
      inv_subtotal: subtotal,
      inv_total_amount: subtotal,
      inv_words: words
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
    localStorage.setItem('cmr_archive_version', 'v4');
    localStorage.setItem('cmr_saved_archive', JSON.stringify(DEFAULT_SAVED_CMRS));
    showToast('🔄 Real Afghan Customs CMRs (106-110) Restored!', 'success');
  };

  const restoreFromArchive = (doc) => {
    if (doc) {
      if (doc.fields) {
        setFields(prev => ({ ...prev, ...doc.fields }));
        if (doc.activePad) setActivePad(doc.activePad);
        if (doc.cmr_number) setCmrSerial(doc.cmr_number);
      } else if (doc.fullData && doc.fullData.fields) {
        setFields(prev => ({ ...prev, ...doc.fullData.fields }));
        if (doc.fullData.activePad) setActivePad(doc.fullData.activePad);
        if (doc.fullData.cmr_top_number) setCmrSerial(doc.fullData.cmr_top_number);
      }
      setIsSavedDocsOpen(false);
      showToast(`📂 Restored document: CMR #${doc.cmr_number}`, 'success');
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
    if (activePad === 1) {
      elementId = activeDocPage === 1 ? 'wrapper_page1' : 'wrapper_page2';
    } else if (activePad === 3) {
      elementId = 'wrapper_invoice';
    }

    const filename = buildConsignmentPdfFilename(fields, activePad, activeDocPage, cmrSerial);
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
      savedDocs, saveToArchive, saveCurrentDocAsCopy, deleteSavedDoc, duplicateSavedDoc, restoreFromArchive, resetToRealPdfs,
      savedSenders, savedConsignees, savedCarriers,
      saveCurrentSender, saveCurrentConsignee, saveCurrentCarrier,
      applySender, applyConsignee, applyCarrier,
      saveParty, deleteParty, openAddressBook,
      isPartiesModalOpen, setIsPartiesModalOpen,
      partiesActiveTab, setPartiesActiveTab,
      exportArchiveJson, importArchiveJson,
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
