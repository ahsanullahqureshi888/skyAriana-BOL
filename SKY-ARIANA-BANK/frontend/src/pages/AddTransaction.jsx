import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Printer, Download, ArrowLeft, Loader2, FileCheck } from 'lucide-react';
import { transactionAPI, bankAPI, settingsAPI } from '../api/client';
import GlassCard from '../components/GlassCard';
import { formatCurrency } from '../utils/formatters';
import { useTranslation } from 'react-i18next';

const currencies = ['USD', 'Toman', 'Dirham', 'Afghani'];
const methods = ['Bank Transfer', 'Cash', 'Hawala'];
const statuses = ['Completed', 'Pending', 'Cancelled'];
const BRAND_NAME = 'Sky Ariana Limited';
const BRAND_SUBTITLE = 'Money Transaction & Hawala Receipt Management System';
const BRAND_LOGO = '/sky-bbb-logo.png';

function BilingualLabel({ en, fa, light = false }) {
  return (
    <span className={`block ${light ? 'text-slate-500' : 'text-blue-600'}`}>
      <span className="block">{en}</span>
      <span dir="rtl" className="mt-0.5 block text-[9px] font-bold tracking-normal opacity-75 print:text-[9px]">
        {fa}
      </span>
    </span>
  );
}

const defaultForm = {
  receipt_no: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'Received',
  customer_name: '',
  company_name: '',
  subject: '',
  amount: '',
  currency: 'USD',
  equivalent_amount: '',
  equivalent_currency: 'Afghani',
  payment_method: 'Bank Transfer',
  bank_account_id: '',
  receiver_name: '',
  status: 'Completed',
  description: '',
};

export default function AddTransaction() {
  const { t } = useTranslation();
  const [form, setForm] = useState(defaultForm);
  const [banks, setBanks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  useEffect(() => {
    // Load banks & settings
    const loadPrerequisites = async () => {
      try {
        const [bankRes, settingsRes] = await Promise.allSettled([
          bankAPI.list(),
          settingsAPI.get(),
        ]);
        setBanks(bankRes.status === 'fulfilled' && Array.isArray(bankRes.value?.data) ? bankRes.value.data : []);
        setSettings(settingsRes.status === 'fulfilled' && settingsRes.value?.data && typeof settingsRes.value.data === 'object' ? settingsRes.value.data : null);

        // Check if editing
        if (id) {
          const txRes = await transactionAPI.get(id);
          const tx = txRes.data;
          setForm({
            receipt_no: tx.receipt_no || '',
            date: tx.date || new Date().toISOString().slice(0, 10),
            type: tx.type || 'Received',
            customer_name: tx.customer_name || '',
            company_name: tx.company_name || '',
            subject: tx.subject || '',
            amount: tx.amount || '',
            currency: tx.currency || 'USD',
            equivalent_amount: tx.equivalent_amount || '',
            equivalent_currency: tx.equivalent_currency || 'Afghani',
            payment_method: tx.payment_method || 'Bank Transfer',
            bank_account_id: tx.bank_account_id || '',
            receiver_name: tx.receiver_name || '',
            status: tx.status || 'Completed',
            description: tx.description || '',
          });
        } else if (location.state && location.state.ocrData) {
          // If we redirected from OCR page with extracted fields
          const ocr = location.state.ocrData;
          setForm((prev) => ({
            ...prev,
            ...ocr,
            receipt_no: ocr.receipt_no || prev.receipt_no,
            date: ocr.date || prev.date,
          }));
        } else {
          try {
            const nextRes = await settingsAPI.getNextReceiptNo();
            setForm((prev) => ({
              ...prev,
            receipt_no: nextRes.data?.receipt_no || `TX-${Date.now().toString().slice(-6)}`,
            }));
          } catch (nextErr) {
            console.error(nextErr);
            setForm((prev) => ({
              ...prev,
              receipt_no: `TX-${Date.now().toString().slice(-6)}`,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load transaction prerequisites', err);
      }
    };
    loadPrerequisites();

  }, [id, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingFile(e.target.files[0]);
    }
  };

  const saveTransaction = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Sanitize values
    const payload = {
      ...form,
      amount: Number(form.amount || 0),
      equivalent_amount: Number(form.equivalent_amount || 0),
      bank_account_id: form.bank_account_id ? Number(form.bank_account_id) : null,
    };

    try {
      let savedTx;
      if (id) {
        const res = await transactionAPI.update(id, payload);
        savedTx = res.data;
      } else {
        const res = await transactionAPI.create(payload);
        savedTx = res.data;
      }

      // If there's an attachment to upload
      if (uploadingFile && savedTx.id) {
        await transactionAPI.uploadReceipt(savedTx.id, uploadingFile);
      }

      return savedTx;
    } catch (err) {
      console.error('Failed to save transaction', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to save transaction record.');
      setLoading(false);
      return null;
    }
  };

  const handleSave = async (e) => {
    const result = await saveTransaction(e);
    if (result) {
      navigate('/transactions');
    }
  };

  const handleSaveAndPrint = async (e) => {
    const result = await saveTransaction(e);
    if (result) {
      setLoading(false);
      // Trigger native browser print for the printed receipt element
      window.print();
      navigate('/transactions');
    }
  };

  const handleDownloadPDF = async (e) => {
    const result = await saveTransaction(e);
    if (result) {
      setLoading(false);
      await transactionAPI.downloadPDF(result.id, `${result.receipt_no || `transaction-${result.id}`}.pdf`);
      navigate('/transactions');
    }
  };

  // Find selected bank information for live preview
  const selectedBank = banks.find((b) => b.id === Number(form.bank_account_id));

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white/70 text-sky-700 shadow-sm transition-all hover:bg-sky-50"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black leading-tight text-slate-900 md:text-3xl">
            {id ? 'Edit Transaction Details' : 'Record New Transaction'}
          </h1>
          <p className="mt-1 text-sm font-semibold text-sky-600">
            Input money transaction, Hawala slips, or paid bank statements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        
        {/* Form panel */}
        <GlassCard className="p-5 md:p-6">
          <form className="transaction-form grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 pb-20 md:pb-0">
            
            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Receipt No / Payment No
              </label>
              <input
                type="text"
                name="receipt_no"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.receipt_no}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                name="date"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Transaction Direction
              </label>
              <select
                name="type"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.type}
                onChange={handleChange}
              >
                <option value="Received">{t('transaction.received_inflow')}</option>
                <option value="Paid">{t('transaction.paid_outflow')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                name="customer_name"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                placeholder="Ariana Transport, etc."
                value={form.customer_name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                placeholder="Customer company or account name"
                value={form.company_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Subject / Purpose
              </label>
              <input
                type="text"
                name="subject"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                placeholder="Hawala settlement, Invoice payment"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Currency
                </label>
                <select
                  name="currency"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                  value={form.currency}
                  onChange={handleChange}
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Equivalent Amount
                </label>
                <input
                  type="number"
                  step="any"
                  name="equivalent_amount"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                  placeholder="0.00"
                  value={form.equivalent_amount}
                  onChange={handleChange}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Currency
                </label>
                <select
                  name="equivalent_currency"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                  value={form.equivalent_currency}
                  onChange={handleChange}
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Payment Method
              </label>
              <select
                name="payment_method"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.payment_method}
                onChange={handleChange}
              >
                {methods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Bank Account
              </label>
              <select
                name="bank_account_id"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.bank_account_id}
                onChange={handleChange}
              >
                <option value="">-- {t('transaction.no_bank_account')} --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name} ({b.bank_name} - {b.account_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Receiver / Beneficiary Name
              </label>
              <input
                type="text"
                name="receiver_name"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                placeholder="Finance Dept, Cashier office"
                value={form.receiver_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Status
              </label>
              <select
                name="status"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                value={form.status}
                onChange={handleChange}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Description / Notes
              </label>
              <textarea
                name="description"
                rows="3"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-900 transition-all font-semibold"
                placeholder="Add receipt confirmation, exchange rate details, etc."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                Upload Receipt Slip (PDF/Image)
              </label>
              <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-sky-100 bg-white/30 px-6 pb-5 pt-5">
                <div className="space-y-1 text-center">
                  <div className="flex text-sm text-sky-600 justify-center">
                    <label className="relative cursor-pointer bg-white/40 rounded-md font-bold text-sky-500 hover:text-sky-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-500/20 px-2 py-1 border border-sky-100">
                      <span>{t('transaction.upload_file')}</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-sky-400 font-bold">{t('transaction.upload_desc')}</p>
                  {uploadingFile && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-600 font-bold bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100/50 mt-3 inline-flex">
                      <FileCheck size={14} className="text-emerald-500" />
                      <span className="truncate max-w-[200px]">{uploadingFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="md:col-span-2 p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Action buttons */}
            <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:bg-white/90 max-md:backdrop-blur-xl max-md:border-t max-md:border-sky-100 max-md:px-4 max-md:pt-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))] max-md:flex-row max-md:gap-2 max-md:shadow-[0_-4px_24px_rgba(15,32,60,0.08)]">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-sm font-extrabold text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 ios-button-tap"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>
                  <span className="hidden xs:inline">{t('transaction.save_transaction')}</span>
                  <span className="xs:hidden">{t('transaction.save')}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndPrint}
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white/70 text-sm font-extrabold text-sky-800 shadow-md transition-all hover:bg-sky-50 disabled:opacity-50 ios-button-tap"
              >
                <Printer size={16} />
                <span>
                  <span className="hidden xs:inline">{t('transaction.save_and_print')}</span>
                  <span className="xs:hidden">{t('transaction.print')}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white/70 text-sm font-extrabold text-sky-800 shadow-md transition-all hover:bg-sky-50 disabled:opacity-50 ios-button-tap"
              >
                <Download size={16} />
                <span>
                  <span className="hidden xs:inline">{t('transaction.download_pdf')}</span>
                  <span className="xs:hidden">{t('transaction.pdf')}</span>
                </span>
              </button>
            </div>

          </form>
        </GlassCard>

        {/* Live A4 Print Design Receipt Preview Panel (Right column) - Hidden on mobile screen to prevent layout scroll */}
        <div className="min-w-0 space-y-4 hidden xl:block print:block">
          <h3 className="pl-1 text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">{t('transaction.live_receipt_preview')}</h3>
          
          {/* Printable Receipt layout */}
          <div
            id="receipt-print-area"
            className="receipt-document w-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/88 p-6 font-sans text-slate-900 shadow-2xl shadow-sky-950/[0.12] ring-1 ring-sky-100/70 backdrop-blur-xl print:m-0 print:rounded-none print:border print:border-slate-200 print:bg-white print:p-0 print:shadow-none print:ring-0"
          >
            <div className="receipt-inner flex min-h-[720px] flex-col print:min-h-0">
              <header className="receipt-header mb-4 overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-sky-50/95 via-white/80 to-blue-50/90 shadow-lg shadow-sky-900/[0.06] backdrop-blur-xl print:rounded-2xl print:border-sky-100 print:bg-sky-50 print:shadow-none">
                <div className="h-2 bg-gradient-to-r from-[#0f2a4a] via-[#1677ff] to-[#0f2a4a]" />
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between print:p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white text-lg font-black text-white shadow-xl shadow-blue-500/25 ring-4 ring-white/90 print:h-11 print:w-16 print:shadow-none">
                      <img
                        src={BRAND_LOGO}
                        alt={BRAND_NAME}
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="hidden flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#1677ff] to-[#0f2a4a] text-white">
                        SA
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[18px] font-black leading-tight text-[#0f2a4a] print:text-[20px]">
                        {BRAND_NAME}
                      </h2>
                      <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] leading-snug text-blue-600 print:text-[11px]">
                        {BRAND_SUBTITLE}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/80 bg-white/78 p-3.5 text-[10px] font-black text-blue-600 shadow-md shadow-sky-900/[0.05] backdrop-blur-xl print:min-w-[225px] print:border-sky-200 print:bg-white print:shadow-none">
                    <div className="text-slate-500">{t('transaction.receipt_no')} <strong className="text-slate-800">#{form.receipt_no || '---'}</strong></div>
                    <div className="text-slate-500">{t('transaction.date')} <strong className="text-slate-800">{form.date}</strong></div>
                    <div className="text-slate-500">{t('transaction.status')} <strong className="text-slate-800">{form.status}</strong></div>
                  </div>
                </div>
              </header>

              <div className="receipt-title-block mb-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/95 via-white/80 to-sky-50/95 px-4 py-3.5 text-center shadow-sm shadow-sky-900/[0.04] print:rounded-none print:border-x-0 print:bg-[#eff6ff] print:shadow-none">
                <div className="bg-sky-50 text-sky-900 px-4 py-2 text-center text-sm font-bold tracking-widest uppercase mb-6 border-y border-sky-200">
                  {t('transaction.official_receipt')}
                </div>
              </div>

              <section className="receipt-summary mb-4 grid grid-cols-2 gap-3 rounded-3xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/95 via-white/88 to-sky-50/95 p-4 shadow-lg shadow-emerald-900/[0.05] backdrop-blur-xl print:grid-cols-4 print:rounded-2xl print:bg-white print:shadow-none">
                <div className="col-span-2 print:col-span-1">
                  <div className="text-slate-500 text-xs uppercase tracking-wider">{t('transaction.amount')}</div>
                  <strong className="mt-1 block whitespace-nowrap text-[20px] font-black text-[#0f2a4a] print:text-[22px]">
                    {formatCurrency(form.amount, form.currency)}
                  </strong>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">{t('transaction.equivalent')}</div>
                  <strong className="mt-1 block whitespace-nowrap text-[13px] font-black text-slate-900">{formatCurrency(form.equivalent_amount, form.equivalent_currency)}</strong>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">{t('transaction.method')}</div>
                  <strong className="mt-1 block text-[13px] font-black text-slate-900">{form.payment_method}</strong>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">{t('transaction.status')}</div>
                  <strong className="mt-1 block text-[13px] font-black text-emerald-700">{form.status}</strong>
                </div>
              </section>

              <section className="receipt-info-panel mb-4 overflow-hidden rounded-2xl border border-white/80 bg-white/78 shadow-md shadow-sky-900/[0.04] backdrop-blur-xl print:border-sky-100 print:bg-white print:shadow-none">
                <div className="bg-[#0f2a4a] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  Party Details <span dir="rtl" className="ml-2 tracking-normal">/ مشخصات طرف معامله</span>
                </div>
                <div className="grid grid-cols-[118px_minmax(0,1fr)] divide-y divide-sky-100 text-[12px] print:grid-cols-[145px_minmax(0,1fr)] print:text-[12px]">
                  {[
                    [{ en: 'Customer', fa: 'مشتری' }, form.customer_name || '-'],
                    [{ en: 'Company', fa: 'شرکت' }, form.company_name || '-'],
                    [{ en: 'Subject', fa: 'موضوع' }, form.subject || '-'],
                    [{ en: 'Receiver', fa: 'دریافت کننده' }, form.receiver_name || '-'],
                  ].map(([label, value]) => (
                    <React.Fragment key={label.en}>
                      <dt className="bg-sky-50/70 px-3 py-2.5 font-black uppercase tracking-[0.04em] text-blue-600">
                        <BilingualLabel en={label.en} fa={label.fa} />
                      </dt>
                      <dd className="min-w-0 break-words px-4 py-2.5 font-extrabold text-slate-900">
                        {value}
                      </dd>
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section className="receipt-info-panel mb-4 overflow-hidden rounded-2xl border border-white/80 bg-white/78 shadow-md shadow-sky-900/[0.04] backdrop-blur-xl print:border-sky-100 print:bg-white print:shadow-none">
                <div className="bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                  Payment Information <span dir="rtl" className="ml-2 tracking-normal">/ معلومات پرداخت</span>
                </div>
                <div className="grid grid-cols-[118px_minmax(0,1fr)] divide-y divide-sky-100 text-[12px] print:grid-cols-[145px_minmax(0,1fr)] print:text-[12px]">
                  {[
                    [{ en: 'Payment Method', fa: 'روش پرداخت' }, form.payment_method],
                    [
                      { en: 'Bank Account', fa: 'حساب بانکی' },
                      form.payment_method === 'Bank Transfer' && selectedBank
                        ? `${selectedBank.account_name} (${selectedBank.bank_name} - ${selectedBank.account_number})`
                        : 'No bank account selected',
                    ],
                    [{ en: 'Currency', fa: 'واحد پول' }, form.currency],
                    [{ en: 'Equivalent Currency', fa: 'واحد پول معادل' }, form.equivalent_currency],
                  ].map(([label, value]) => (
                    <React.Fragment key={label.en}>
                      <dt className="bg-white px-3 py-2.5 font-black uppercase tracking-[0.04em] text-slate-500">
                        <BilingualLabel en={label.en} fa={label.fa} light />
                      </dt>
                      <dd className="min-w-0 break-words px-4 py-2.5 font-extrabold text-slate-900">
                        {value}
                      </dd>
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section className="receipt-notes mb-4 rounded-2xl border border-white/80 bg-slate-50/80 p-4 shadow-md shadow-sky-900/[0.035] backdrop-blur-xl print:border-sky-100 print:bg-slate-50 print:shadow-none">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-sky-600">
                  Description / Notes
                  <span dir="rtl" className="ml-2 tracking-normal">/ توضیحات</span>
                </span>
                <p className="min-h-12 text-[12px] font-semibold leading-relaxed text-slate-700 print:text-[13px]">
                  {form.description || 'No description notes.'}
                </p>
              </section>

              <section className="receipt-signatures mt-auto grid grid-cols-1 gap-4 border-t-2 border-sky-100 pt-5 text-center sm:grid-cols-3 print:grid-cols-3">
                <div className="receipt-sign-card flex min-h-28 flex-col justify-end rounded-2xl border border-white/80 bg-white/82 p-4 shadow-md shadow-sky-900/[0.04] backdrop-blur-xl print:border-sky-100 print:bg-white print:shadow-none">
                  <div className="mb-2 h-11 border-b border-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600">{t('transaction.prepared_by')} <span dir="rtl" className="block tracking-normal">تهیه کننده</span></span>
                  <div className="mt-2 border-b border-dotted border-slate-300 text-[9px] text-transparent">{t('transaction.date_plain')}</div>
                  <small className="mt-1 text-[9px] font-semibold text-slate-400">{t('transaction.authorized_officer')}</small>
                </div>
                <div className="receipt-sign-card flex min-h-28 flex-col justify-end rounded-2xl border border-white/80 bg-white/82 p-4 shadow-md shadow-sky-900/[0.04] backdrop-blur-xl print:border-sky-100 print:bg-white print:shadow-none">
                  <div className="mb-2 h-11 border-b border-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600">{t('transaction.customer_signature')} <span dir="rtl" className="block tracking-normal">امضای مشتری</span></span>
                  <div className="mt-2 border-b border-dotted border-slate-300 text-[9px] text-transparent">{t('transaction.date_plain')}</div>
                  <small className="mt-1 text-[9px] font-semibold text-slate-400">{t('transaction.received_and_confirmed')}</small>
                </div>
                <div className="receipt-sign-card flex min-h-28 flex-col items-center justify-end rounded-2xl border border-white/80 bg-white/82 p-4 shadow-md shadow-sky-900/[0.04] backdrop-blur-xl print:border-sky-100 print:bg-white print:shadow-none">
                  <div className="receipt-stamp-box mb-2 flex h-[78px] w-32 items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 text-[9px] font-black uppercase tracking-[0.18em] text-sky-400">
                    {t('transaction.company_stamp')}
                    <span dir="rtl" className="mt-1 block tracking-normal">مهر شرکت</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600">{t('transaction.company_stamp')} <span dir="rtl" className="block tracking-normal">مهر شرکت</span></span>
                  <div className="mt-2 w-full border-b border-dotted border-slate-300 text-[9px] text-transparent">{t('transaction.date_plain')}</div>
                  <small className="mt-1 text-[9px] font-semibold text-slate-400">{t('transaction.official_seal_area')}</small>
                </div>
              </section>

              <footer className="receipt-footer mt-6 border-t border-sky-100 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-500">
                  Official receipt generated by {BRAND_NAME}.
                </p>
                <p dir="rtl" className="mt-1 text-[9px] font-semibold text-slate-500">
                  رسید رسمی ایجاد شده توسط {BRAND_NAME}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-sky-500">
                  Printed on {new Date().toLocaleString()} - This receipt is system-generated and valid for office accounting records. Page 1 of 1.
                </p>
              </footer>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
