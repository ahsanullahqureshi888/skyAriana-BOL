import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  UploadCloud, FileText, ArrowRight, Loader2, RefreshCw, Trash2, 
  CheckCircle, AlertTriangle, HelpCircle, Layers, Image as ImageIcon, Save
} from 'lucide-react';
import { ocrAPI, customerAPI, bankAPI } from '../api/client';
import GlassCard from '../components/GlassCard';

export default function ReceiptUpload() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [lookupError, setLookupError] = useState('');
  
  // OCR Extracted Receipts List
  const [receipts, setReceipts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // DB Lists for Dropdowns
  const [customers, setCustomers] = useState([]);
  const [banks, setBanks] = useState([]);
  
  // Import Status Results
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
  const fileSize = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '';

  const loadLookupData = async () => {
    setLookupError('');
    const [customerResult, bankResult] = await Promise.allSettled([
      customerAPI.list(),
      bankAPI.list(),
    ]);

    if (customerResult.status === 'fulfilled') {
      setCustomers(Array.isArray(customerResult.value.data) ? customerResult.value.data : []);
    } else {
      setCustomers([]);
    }

    if (bankResult.status === 'fulfilled') {
      setBanks(Array.isArray(bankResult.value.data) ? bankResult.value.data : []);
    } else {
      setBanks([]);
    }

    if (customerResult.status === 'rejected' || bankResult.status === 'rejected') {
      setLookupError('Customer or bank lookup data is temporarily unavailable. You can still upload and review receipts, then retry loading account lists.');
    }
  };

  useEffect(() => {
    loadLookupData();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setupFile(e.target.files[0]);
    }
  };

  const setupFile = (uploadedFile) => {
    const isSupportedFile = uploadedFile.type.startsWith('image/') || uploadedFile.type === 'application/pdf' || uploadedFile.name?.toLowerCase().endsWith('.pdf');
    if (!isSupportedFile) {
      setOcrError('Unsupported file type. Please upload a PDF, PNG, JPG, or another image receipt.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(uploadedFile);
    setOcrError('');
    setReceipts([]);
    setImportResult(null);
    setUploadProgress(0);

    // Create local preview URL if image
    if (uploadedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(uploadedFile));
    } else {
      setPreviewUrl(''); // PDF or other files
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setReceipts([]);
    setSelectedIndex(0);
    setOcrError('');
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setUploadProgress(15);
    setOcrError('');
    setImportResult(null);

    let progressTimer;
    try {
      progressTimer = window.setInterval(() => {
        setUploadProgress((prev) => (prev >= 88 ? prev : prev + 9));
      }, 220);
      const res = await ocrAPI.extract(file);
      setUploadProgress(100);
      // Backend returns list[ExtractedReceipt]
      if (res.data && res.data.length > 0) {
        // Ensure every receipt has date in string format YYYY-MM-DD
        const sanitized = res.data.map(item => ({
          ...item,
          date: item.date || new Date().toISOString().slice(0, 10),
          subject: item.subject || 'Imported OCR Receipt',
          currency: item.currency || 'USD',
          equivalent_currency: item.equivalent_currency || 'Afghani',
          payment_method: item.payment_method || 'Bank Transfer',
          amount: item.amount || 0,
          equivalent_amount: item.equivalent_amount || 0,
          bank_account_id: item.bank_account_id || '',
        }));
        setReceipts(sanitized);
        setSelectedIndex(0);
      } else {
        setOcrError('No receipts could be processed or extracted from the file.');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'OCR service is unavailable right now. Please keep the page open and retry after checking the backend OCR setup.';
      setOcrError(msg);
      setUploadProgress(0);
    } finally {
      if (progressTimer) window.clearInterval(progressTimer);
      window.setTimeout(() => setLoading(false), 250);
    }
  };

  // Update specific field in a receipt
  const handleFieldChange = (index, field, value) => {
    // eslint-disable-next-line security/detect-object-injection
    setReceipts(prev => prev.map((r, i) => {
      if (i !== index) return r;
      
      const newR = { ...r, [field]: value };
      
      if (field === 'customer_name') {
        const matched = customers.find(c => c.name.toLowerCase() === value.toLowerCase());
        newR.customer_id = matched ? matched.id : null;
      }
      
      if (field === 'amount' || field === 'date' || field === 'customer_name' || field === 'receipt_no') {
        const isReceiptDup = prev.some((pr, idx) => idx !== index && pr.receipt_no && pr.receipt_no === newR.receipt_no);
        if (isReceiptDup) {
          newR.is_duplicate = true;
          newR.duplicate_reason = 'Duplicate receipt number within this batch.';
        } else {
          newR.is_duplicate = false;
          newR.duplicate_reason = '';
        }
      }
      return newR;
    }));
  };

  const handleSaveAll = async () => {
    if (receipts.length === 0) return;
    setLoading(true);
    setImportResult(null);

    // Sanitize transactions payload
    const payload = {
      transactions: receipts.map(r => ({
        receipt_no: r.receipt_no || `BB-OCR-${Date.now().toString().slice(-6)}`,
        date: r.date,
        type: 'Received',
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        customer_name: r.customer_name || 'Walk-in Customer',
        company_name: r.customer_name || '',
        subject: r.subject || 'Imported OCR Receipt',
        amount: Number(r.amount || 0),
        currency: r.currency || 'USD',
        equivalent_amount: Number(r.equivalent_amount || 0),
        equivalent_currency: r.equivalent_currency || 'Afghani',
        payment_method: r.payment_method || 'Bank Transfer',
        bank_account_id: r.bank_account_id ? Number(r.bank_account_id) : null,
        receiver_name: r.receiver_name || '',
        description: r.description || `Parsed from scanned document.\nOCR Raw Text Snippet:\n${(r.raw_text || '').slice(0, 150)}...`,
        status: 'Completed',
        temp_image_path: r.temp_image_path || null
      }))
    };

    try {
      const res = await ocrAPI.saveTransaction(payload);
      setImportResult(res.data);
      // Clear receipts list if they successfully imported all without errors
      if (res.data.failed_count === 0) {
        setReceipts([]);
        setFile(null);
        setPreviewUrl('');
      }
    } catch (err) {
      console.error(err);
      setOcrError(err.response?.data?.detail || 'Failed to save imported transactions. Please review the extracted data and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExtractedData = () => {
    if (!receipts.length) return;
    const blob = new Blob([JSON.stringify(receipts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocr-extracted-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // eslint-disable-next-line security/detect-object-injection
  const activeReceipt = receipts[selectedIndex] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-sky-900 leading-tight">{t('receiptUpload.title')}</h1>
        <p className="text-sm text-sky-500 font-medium mt-1">
          Upload bank receipts, Hawala transfers or PDF statement scans to automatically parse ledger items.
        </p>
      </div>

      {lookupError && (
        <GlassCard className="border-amber-100 bg-amber-50/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
              <div>
                <p className="text-sm font-black text-amber-800">OCR page is available with limited account data</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-sky-700">{lookupError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadLookupData}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-100 bg-white/70 px-4 text-xs font-black text-amber-700 transition hover:bg-amber-50"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Document upload & Table list (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* File Upload Zone */}
          {receipts.length === 0 && (
            <GlassCard className="p-5 sm:p-6 flex flex-col justify-center min-h-[350px]">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-[28px] p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-sky-500 bg-sky-50/50 scale-[0.99] shadow-lg shadow-sky-500/5' 
                    : 'border-sky-100 bg-white/20 hover:bg-sky-50/20'
                }`}
              >
                {file && previewUrl ? (
                  <div className="mb-5 h-44 w-full max-w-md overflow-hidden rounded-3xl border border-sky-100 bg-white/70 p-2 shadow-inner">
                    <img src={previewUrl} alt="Receipt preview" className="h-full w-full rounded-2xl object-contain" />
                  </div>
                ) : file && isPdf ? (
                  <div className="mb-5 flex h-44 w-full max-w-md flex-col items-center justify-center rounded-3xl border border-sky-100 bg-white/70 text-sky-600 shadow-inner">
                    <FileText size={42} />
                    <span className="mt-2 text-xs font-black uppercase tracking-wide">PDF document ready</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 mb-4 shadow-lg shadow-sky-500/5">
                    <UploadCloud size={32} />
                  </div>
                )}
                
                {file ? (
                  <div className="space-y-2">
                    <strong className="text-sky-900 text-sm font-bold block">{file.name}</strong>
                    <span className="text-xs text-sky-400 font-bold block">
                      {fileSize} - {file.type || 'Document'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong className="text-sky-900 text-sm font-black block">{t('receiptUpload.drag_drop')}</strong>
                    <span className="text-xs text-sky-400 font-bold block mt-1">
                      Supports high-resolution PNG, JPEG images or PDF books
                    </span>
                  </div>
                )}

                {file && (
                  <div className="mt-5 w-full max-w-md">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-sky-500">
                      <span>{loading ? 'Processing OCR' : 'Ready to upload'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sky-50">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              {file && (
                <div className="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading}
                    className="py-3 border border-sky-100 hover:bg-sky-50 text-sky-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="py-3 border border-sky-100 hover:bg-sky-50 text-sky-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <UploadCloud size={14} />
                    <span>Upload Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={loading}
                    className="py-3 bg-gradient-to-tr from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    <span>Process OCR</span>
                  </button>
                </div>
              )}
            </GlassCard>
          )}

          {/* Import Results Banner */}
          {importResult && (
            <GlassCard className="p-5 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-emerald-600" size={24} />
                <h3 className="font-bold text-emerald-900 text-sm">{t('receiptUpload.import_complete')}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs font-bold text-sky-900/80 mt-3 bg-white/40 p-3 rounded-xl border border-sky-100/30">
                <div className="text-center border-r border-sky-100/50">
                  <span className="text-[10px] text-sky-500 block uppercase mb-0.5">{t('receiptUpload.imported')}</span>
                  <span className="text-lg text-emerald-600 font-black">{importResult.imported_count}</span>
                </div>
                <div className="text-center border-r border-sky-100/50">
                  <span className="text-[10px] text-sky-500 block uppercase mb-0.5">{t('receiptUpload.dup_skipped')}</span>
                  <span className="text-lg text-amber-600 font-black">{importResult.skipped_count}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-sky-500 block uppercase mb-0.5">{t('receiptUpload.failed')}</span>
                  <span className="text-lg text-rose-600 font-black">{importResult.failed_count}</span>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-700 max-h-[120px] overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => <div key={i}>- {err}</div>)}
                </div>
              )}
            </GlassCard>
          )}

          {/* OCR Error Box */}
          {ocrError && (
            <GlassCard className="p-6 border-rose-150 bg-rose-50/30 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>{t('receiptUpload.ocr_failed')}</span>
              </div>
              <p className="text-xs text-sky-900/70 font-semibold leading-relaxed">{ocrError}</p>
              <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl space-y-2">
                <strong className="text-[10px] text-sky-700 uppercase tracking-wide block">{t('receiptUpload.win_help')}</strong>
                <ol className="text-[10px] text-sky-900/80 font-medium space-y-1 list-decimal list-inside">
                  <li>{t('receiptUpload.help1')}</li>
                  <li>{t('receiptUpload.help2')}</li>
                  <li>{t('receiptUpload.help3')}</li>
                </ol>
              </div>
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-sky-100 hover:bg-sky-50 text-sky-700 font-bold rounded-xl text-xs transition-all"
              >
                Clear and Try Again
              </button>
            </GlassCard>
          )}

          {/* Loader Overlay while Running OCR */}
          {loading && receipts.length === 0 && (
            <GlassCard className="p-12 flex flex-col items-center justify-center min-h-[350px]">
              <Loader2 className="animate-spin text-sky-500 mb-4" size={40} />
              <strong className="text-sky-900 text-sm font-black animate-pulse">{t('receiptUpload.running_ocr')}</strong>
              <p className="text-xs text-sky-400 font-bold mt-1 max-w-[280px] text-center leading-normal">
                Applying computer vision filters, splitting document nodes, and normalizing Persian text characters.
              </p>
            </GlassCard>
          )}

          {/* Multi-page Receipts Table Grid */}
          {receipts.length > 0 && (
            <GlassCard className="p-6 flex-1 flex flex-col min-h-[450px]">
              <div className="flex flex-col gap-3 border-b border-sky-100/50 pb-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-sky-500" />
                  <h2 className="text-base font-extrabold text-sky-900">Extracted Receipts ({receipts.length})</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadExtractedData}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white/60 px-3 py-2 text-xs font-black text-sky-700 transition-all hover:bg-sky-50"
                  >
                    <FileText size={14} />
                    <span>Download Extracted Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs font-black text-rose-600 transition-all hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                    <span>{t('receiptUpload.clear_all')}</span>
                  </button>
                </div>
              </div>

              {/* Grid Table */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold text-sky-900/80">
                  <thead>
                    <tr className="border-b border-sky-100/50 text-[10px] text-sky-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 pr-2">{t('receiptUpload.page')}</th>
                      <th className="py-2.5 px-2">{t('receiptUpload.receipt_no')}</th>
                      <th className="py-2.5 px-2">{t('receiptUpload.cust_account')}</th>
                      <th className="py-2.5 px-2 text-right">{t('receiptUpload.amount')}</th>
                      <th className="py-2.5 px-2 text-center">{t('receiptUpload.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r, index) => (
                      <tr 
                        key={index} 
                        onClick={() => setSelectedIndex(index)}
                        className={`border-b border-sky-50/50 hover:bg-sky-50/30 cursor-pointer transition-all ${
                          selectedIndex === index ? 'bg-sky-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 pr-2 font-bold text-sky-500">#{r.page_number}</td>
                        <td className="py-3.5 px-2 font-bold text-sky-900">{r.receipt_no || 'Missing'}</td>
                        <td className="py-3.5 px-2 truncate max-w-[120px]">{r.customer_name || 'Walk-in'}</td>
                        <td className="py-3.5 px-2 text-right font-extrabold text-sky-950">
                          {r.amount ? `${Number(r.amount).toLocaleString()} ${r.currency}` : '0 USD'}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {r.is_duplicate ? (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold text-[9px] border border-amber-100 uppercase"
                              title={r.duplicate_reason}
                            >
                              <AlertTriangle size={10} />
                              <span>{t('receiptUpload.dup')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[9px] border border-emerald-100 uppercase">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bulk Actions */}
              <div className="pt-6 border-t border-sky-100/50 mt-4 flex items-center justify-between">
                <span className="text-[10px] text-sky-400 font-bold uppercase">
                  Verify details in the sidebar before importing
                </span>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={loading}
                  className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-sky-500/15 disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{t('receiptUpload.save_all')}</span>
                </button>
              </div>
            </GlassCard>
          )}

        </div>

        {/* Right Side: Active Receipt Review & Preview Form (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col">
          
          {activeReceipt ? (
            <div className="space-y-6">
              
              {/* Document Image Page Preview */}
              <GlassCard className="p-4 flex flex-col justify-center items-center">
                <div className="w-full flex items-center justify-between border-b border-sky-100/50 pb-3 mb-3">
                  <span className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">
                    Page #{activeReceipt.page_number} Scan File Preview
                  </span>
                  <div className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    TEMP PREVIEW
                  </div>
                </div>

                <div className="w-full border border-sky-100 bg-sky-50/10 rounded-xl overflow-hidden flex items-center justify-center p-1.5 h-64">
                  {activeReceipt.temp_image_path ? (
                    <img
                      src={ocrAPI.getTempPreviewUrl(activeReceipt.temp_image_path)}
                      alt={`Receipt page ${activeReceipt.page_number} preview`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-sky-100/50"
                    />
                  ) : (
                    <div className="text-center text-sky-400 flex flex-col items-center gap-1">
                      <ImageIcon size={32} />
                      <span>{t('receiptUpload.preview_not_found')}</span>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Edit Details Form */}
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-sm font-extrabold text-sky-950 border-b border-sky-100/50 pb-3">
                  Review & Adjust Parameters
                </h2>

                {activeReceipt.is_duplicate && (
                  <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-700 flex gap-2">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-800 mb-0.5">{t('receiptUpload.duplicate_warning')}</strong>
                      {activeReceipt.duplicate_reason}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  
                  {/* Receipt Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Receipt No / Payment No
                    </label>
                    <input
                      type="text"
                      value={activeReceipt.receipt_no || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'receipt_no', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Receipt Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={activeReceipt.date || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'date', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    />
                  </div>

                  {/* Customer Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={activeReceipt.customer_name || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'customer_name', e.target.value)}
                      list="customer-suggestions"
                      placeholder="Type customer account name..."
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    />
                    <datalist id="customer-suggestions">
                      {customers.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Subject / Invoice Line
                    </label>
                    <input
                      type="text"
                      value={activeReceipt.subject || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'subject', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    />
                  </div>

                  {/* Amount & Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={activeReceipt.amount || ''}
                        onChange={(e) => handleFieldChange(selectedIndex, 'amount', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                        Currency
                      </label>
                      <select
                        value={activeReceipt.currency || 'USD'}
                        onChange={(e) => handleFieldChange(selectedIndex, 'currency', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                      >
                        {['USD', 'Toman', 'Dirham', 'Afghani'].map(cur => (
                          <option key={cur} value={cur}>{cur}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Equivalent Amount & Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                        Equivalent Amount
                      </label>
                      <input
                        type="number"
                        value={activeReceipt.equivalent_amount || ''}
                        onChange={(e) => handleFieldChange(selectedIndex, 'equivalent_amount', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                        Equivalent Currency
                      </label>
                      <select
                        value={activeReceipt.equivalent_currency || 'Afghani'}
                        onChange={(e) => handleFieldChange(selectedIndex, 'equivalent_currency', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                      >
                        {['USD', 'Toman', 'Dirham', 'Afghani'].map(cur => (
                          <option key={cur} value={cur}>{cur}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bank Account Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Link Bank Account
                    </label>
                    <select
                      value={activeReceipt.bank_account_id || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'bank_account_id', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    >
                      <option value="">{t('receiptUpload.none_cash')}</option>
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} - {b.account_number} ({b.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Receiver Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Receiver / Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={activeReceipt.receiver_name || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'receiver_name', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    />
                  </div>

                  {/* Description / Description */}
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Notes / Description
                    </label>
                    <textarea
                      value={activeReceipt.description || ''}
                      onChange={(e) => handleFieldChange(selectedIndex, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-medium text-sky-900"
                      placeholder="Parsed details from scanned copy..."
                    />
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-sky-400 font-semibold uppercase">
                  Selected row details sync automatically
                </div>
              </GlassCard>
            </div>
          ) : (
            <GlassCard className="p-8 text-center text-sky-400 font-semibold flex-1 flex flex-col items-center justify-center min-h-[300px]">
              <HelpCircle size={40} className="text-sky-200 mb-2" />
              <span>{t('receiptUpload.review_form')}</span>
              <p className="text-[10px] text-sky-500/50 max-w-[200px] leading-normal mt-1">
                Select an extracted page from the list to review and adjust parameters.
              </p>
            </GlassCard>
          )}

        </div>

      </div>
    </div>
  );
}
