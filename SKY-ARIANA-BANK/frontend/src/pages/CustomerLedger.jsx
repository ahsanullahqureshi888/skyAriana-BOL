import React, { useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  FileSpreadsheet,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { customerAPI } from '../api/client';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../utils/formatters';
import GlassCard from '../components/GlassCard';

const COMPANY_NAME = 'Sky Ariana Limited';
const COMPANY_SUBTITLE = 'Money Transaction & Hawala Receipt Management System';
const COMPANY_LOGO = '/sky-bbb-logo.png';

const defaultForm = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const safeFilename = (value) =>
  String(value || 'customer-ledger')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

function LedgerMetricCard({ title, value, tone, icon: Icon }) {
  const toneClasses = {
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white/65 shadow-xl shadow-sky-900/5 backdrop-blur-xl p-5 min-w-0 overflow-hidden">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${toneClasses[tone] || toneClasses.sky}`}>
          <Icon size={21} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-500 leading-snug">
            {title}
          </p>
          <p className="mt-2 text-[clamp(1.15rem,1.7vw,1.55rem)] font-black text-sky-950 tracking-normal whitespace-nowrap leading-none">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLedger() {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('sky_banking_user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isViewer = user.role === 'Viewer';

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ledgerRows, setLedgerRows] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [form, setForm] = useState(defaultForm);
  const [editMode, setEditMode] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async (selectFirst = false) => {
    setLoadingCustomers(true);
    try {
      const res = await customerAPI.list();
      setCustomers(res.data);
      if (res.data.length > 0 && (selectFirst || !selectedCustomerId)) {
        setSelectedCustomerId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setLedgerRows([]);
      return;
    }

    setLoadingLedger(true);
    customerAPI.getLedger(selectedCustomerId)
      .then((res) => setLedgerRows(res.data))
      .catch((err) => console.error('Failed to load customer ledger', err))
      .finally(() => setLoadingLedger(false));
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === Number(selectedCustomerId));

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.address, customer.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }, [customers, customerSearch]);

  const totals = useMemo(() => {
    const debit = ledgerRows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const credit = ledgerRows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    const balance = ledgerRows.length ? Number(ledgerRows.at(-1)?.balance || 0) : 0;
    return { debit, credit, balance };
  }, [ledgerRows]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditMode(false);
    setFormError('');
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }

    setSavingCustomer(true);
    setFormError('');

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editMode) {
        await customerAPI.update(selectedCustomerId, payload);
        await fetchCustomers(false);
        resetForm();
      } else {
        const res = await customerAPI.create(payload);
        await fetchCustomers(false);
        setSelectedCustomerId(res.data.id);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Failed to save customer details.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedCustomer) return;
    setForm({
      name: selectedCustomer.name || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
      notes: selectedCustomer.notes || '',
    });
    setEditMode(true);
    setFormError('');
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Delete customer "${selectedCustomer.name}" permanently?`)) return;

    try {
      await customerAPI.delete(selectedCustomerId);
      const remaining = customers.filter((c) => c.id !== Number(selectedCustomerId));
      setCustomers(remaining);
      setSelectedCustomerId(remaining.length ? remaining[0].id : '');
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete customer. Verify they have no transactions.');
    }
  };

  const buildLedgerPrintHtml = () => {
    const now = new Date().toLocaleString();
    const rows = ledgerRows.map((row) => `
      <tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${row.transaction_id ? `TX-${row.transaction_id}` : 'OP'}</td>
        <td>${escapeHtml(row.description || '-')}</td>
        <td class="amount debit">${row.debit ? formatCurrency(row.debit, 'USD') : '-'}</td>
        <td class="amount credit">${row.credit ? formatCurrency(row.credit, 'USD') : '-'}</td>
        <td class="amount">${formatCurrency(row.balance, 'USD')}</td>
      </tr>
    `).join('');

    return `<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(selectedCustomer?.name || 'Customer')} Ledger</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f2748; background: #fff; }
            .sheet { min-height: 267mm; border: 1px solid #d9e8f7; padding: 22px; }
            .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; border-bottom: 2px solid #0d75dd; padding-bottom: 18px; }
            .logo { width: 86px; height: 58px; border-radius: 16px; border: 1px solid #d9e8f7; background: #fff; display: inline-flex; align-items: center; justify-content: center; margin-right: 14px; overflow: hidden; }
            .logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
            .brand-left { display: flex; align-items: center; }
            h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
            .subtitle { margin-top: 4px; color: #2779c9; font-size: 12px; font-weight: 700; }
            .badge { border: 1px solid #d9e8f7; border-radius: 12px; padding: 10px 14px; text-align: right; font-size: 11px; color: #5d7088; }
            .section-title { margin: 22px 0 12px; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #0d5fb4; }
            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
            .meta div, .summary div { border: 1px solid #e1ecf8; background: #f7fbff; border-radius: 12px; padding: 11px 12px; }
            .label { display: block; color: #6a7b92; text-transform: uppercase; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 5px; }
            .value { font-size: 13px; font-weight: 800; color: #10233f; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
            .summary .value { font-size: 18px; white-space: nowrap; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
            th { text-align: left; font-size: 9px; color: #0d75dd; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #cfe0f3; padding: 9px 6px; }
            td { font-size: 10px; border-bottom: 1px solid #e6eef7; padding: 9px 6px; vertical-align: top; overflow-wrap: anywhere; }
            th:nth-child(3), td:nth-child(3) { width: 34%; }
            .amount { text-align: right; white-space: nowrap; font-weight: 800; overflow-wrap: normal; }
            .debit { color: #dc2f5f; }
            .credit { color: #059669; }
            tfoot td { background: #f3f8ff; font-size: 11px; font-weight: 900; }
            .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; margin-top: 42px; }
            .signature { border-top: 1px solid #7f93aa; padding-top: 8px; color: #5f7085; font-size: 11px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              <div class="brand-left">
                <div class="logo"><img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" /></div>
                <div>
                  <h1>${COMPANY_NAME}</h1>
                  <div class="subtitle">${COMPANY_SUBTITLE}</div>
                </div>
              </div>
              <div class="badge">
                Customer Ledger<br />
                Generated: ${escapeHtml(now)}
              </div>
            </div>

            <h2 class="section-title">{t('customerLedger.customer_statement')}</h2>
            <div class="meta">
              <div><span class="label">Customer</span><span class="value">${escapeHtml(selectedCustomer?.name || '-')}</span></div>
              <div><span class="label">Phone</span><span class="value">${escapeHtml(selectedCustomer?.phone || '-')}</span></div>
              <div><span class="label">Address</span><span class="value">${escapeHtml(selectedCustomer?.address || '-')}</span></div>
            </div>
            <div class="summary">
              <div><span class="label">{t('customerLedger.total_debit')}</span><span class="value">${formatCurrency(totals.debit, 'USD')}</span></div>
              <div><span class="label">{t('customerLedger.total_credit')}</span><span class="value">${formatCurrency(totals.credit, 'USD')}</span></div>
              <div><span class="label">{t('customerLedger.closing_balance')}</span><span class="value">${formatCurrency(totals.balance, 'USD')}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>{t('customerLedger.date')}</th>
                  <th>{t('customerLedger.receipt_no')}</th>
                  <th>{t('customerLedger.description')}</th>
                  <th>{t('customerLedger.debit')}</th>
                  <th>{t('customerLedger.credit')}</th>
                  <th>{t('customerLedger.balance')}</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="6" style="text-align:center; padding:24px;">No ledger entries recorded for this customer.</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3">{t('customerLedger.statement_total')}</td>
                  <td class="amount debit">${formatCurrency(totals.debit, 'USD')}</td>
                  <td class="amount credit">${formatCurrency(totals.credit, 'USD')}</td>
                  <td class="amount">${formatCurrency(totals.balance, 'USD')}</td>
                </tr>
              </tfoot>
            </table>
            <div class="signatures">
              <div class="signature">{t('customerLedger.prepared_by')}</div>
              <div class="signature">{t('customerLedger.auth_signature')}</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>`;
  };

  const handlePrint = () => {
    if (!selectedCustomer) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('Please allow popups to print the ledger.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildLedgerPrintHtml());
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (!selectedCustomer) return;
    const header = [
      'Company',
      'Customer',
      t('customerLedger.date'),
      t('customerLedger.receipt_no'),
      t('customerLedger.description'),
      t('customerLedger.debit'),
      t('customerLedger.credit'),
      t('customerLedger.balance'),
    ];
    const rows = ledgerRows.map((row) => [
      COMPANY_NAME,
      selectedCustomer.name,
      row.date,
      row.transaction_id ? `TX-${row.transaction_id}` : 'OP',
      row.description || '',
      row.debit || 0,
      row.credit || 0,
      row.balance || 0,
    ]);
    rows.push([COMPANY_NAME, selectedCustomer.name, '', 'TOTAL', '', totals.debit, totals.credit, totals.balance]);

    const csvContent = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${safeFilename(selectedCustomer.name)}-ledger.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-sky-950 leading-tight tracking-normal">{t('customerLedger.customer_ledger')}</h1>
          <p className="text-sm text-sky-600 font-semibold mt-1">
            Professional customer statements, balances, receipts, and payment history.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={!selectedCustomer}
            className="h-12 inline-flex items-center justify-center gap-2 px-5 bg-white/75 hover:bg-sky-50 border border-sky-100 font-black text-sm text-sky-800 rounded-2xl shadow-lg shadow-sky-900/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            <span>{t('customerLedger.print_ledger')}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!selectedCustomer}
            className="h-12 inline-flex items-center justify-center gap-2 px-5 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            <span>{t('customerLedger.export_csv')}</span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isViewer ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : 'xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_320px]'} gap-5 items-start`}>
        <GlassCard className="p-5 xl:sticky xl:top-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-black text-sky-500 uppercase tracking-[0.18em]">Accounts</p>
              <h2 className="text-lg font-black text-sky-950">{t('customerLedger.customer_directory')}</h2>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="relative mb-4">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" />
            <input
              type="search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/50 pl-11 pr-4 text-base font-bold text-sky-950 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
              placeholder="Search customers..."
            />
          </div>

          {loadingCustomers ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-sky-500" size={24} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[54vh] min-h-0 overflow-y-auto pr-1 nav-scrollbar">
              {filteredCustomers.map((customer) => {
                const isSelected = Number(selectedCustomerId) === customer.id;
                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      resetForm();
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-2xl transition-all min-w-0 min-h-[48px] flex flex-col justify-center ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20'
                        : 'text-sky-900 hover:bg-white/80'
                    }`}
                  >
                    <span className="block truncate text-sm font-black">{customer.name}</span>
                    {(customer.phone || customer.address) && (
                      <span className={`block truncate text-[10px] mt-0.5 font-bold ${isSelected ? 'text-sky-100' : 'text-sky-400'}`}>
                        {customer.phone || customer.address}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredCustomers.length === 0 && (
                <p className="text-center text-sm text-sky-400 font-bold py-8">
                  No customers found.
                </p>
              )}
            </div>
          )}
        </GlassCard>

        <div className="space-y-5 min-w-0">
          {selectedCustomer ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-4">
                <LedgerMetricCard
                  title={t('customerLedger.total_debit')}
                  value={formatCurrency(totals.debit, 'USD')}
                  icon={UserRound}
                  tone="rose"
                />
                <LedgerMetricCard
                  title={t('customerLedger.total_credit')}
                  value={formatCurrency(totals.credit, 'USD')}
                  icon={UserRound}
                  tone="emerald"
                />
                <LedgerMetricCard
                  title={t('customerLedger.closing_balance')}
                  value={formatCurrency(totals.balance, 'USD')}
                  icon={UserRound}
                  tone="sky"
                />
              </div>

              <GlassCard className="p-5 sm:p-6 min-w-0">
                <div className="border-b border-sky-100 pb-5 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-sky-950 leading-snug truncate">
                      {selectedCustomer.name}
                    </h2>
                    <p className="text-sm font-bold text-sky-500">Account Statement</p>
                  </div>

                  {!isViewer && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleEditClick}
                        className="h-11 px-4 border border-sky-100 bg-white/70 hover:bg-sky-50 text-sky-800 font-black text-xs uppercase rounded-xl shadow-sm inline-flex items-center gap-2 transition-all"
                      >
                        <Edit2 size={13} />
                        <span>{t('customerLedger.edit_account')}</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={handleDeleteCustomer}
                          className="h-11 px-4 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs uppercase rounded-xl shadow-sm inline-flex items-center gap-2 transition-all"
                        >
                          <Trash2 size={13} />
                          <span>{t('customerLedger.delete_account')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {loadingLedger ? (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-sky-500 mb-3" size={30} />
                    <p className="text-sm font-bold text-sky-600">Retrieving account statement...</p>
                  </div>
                ) : (
                  <div>
                    {/* Mobile Cards Statement View */}
                    <div className="block md:hidden space-y-3.5 ios-card-fade-up">
                      {ledgerRows.map((row) => (
                        <div 
                          key={row.id} 
                          className={`p-4 bg-white border border-sky-100 rounded-[20px] space-y-2.5 shadow-sm shadow-sky-950/[0.02] border-l-4 ${
                            row.debit ? 'border-l-rose-500' : row.credit ? 'border-l-emerald-500' : 'border-l-sky-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-sky-600">{formatDate(row.date)}</span>
                              <span className="text-[10px] font-black text-sky-950 bg-sky-50 px-2 py-0.5 rounded-lg">
                                {row.transaction_id ? `TX-${row.transaction_id}` : 'OP'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">{t('customerLedger.running_bal')}</span>
                              <span className="text-xs font-black text-slate-900">{formatCurrency(row.balance, 'USD')}</span>
                            </div>
                          </div>
                          
                          {row.description && (
                            <div className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-sky-100/10 break-words">
                              {row.description}
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center text-xs font-black pt-2 border-t border-sky-50/50">
                            <div>
                              {row.debit ? (
                                <span className="text-rose-600 uppercase tracking-wide text-[10px]">Debit: +{formatCurrency(row.debit, 'USD')}</span>
                              ) : <span className="text-slate-300">-</span>}
                            </div>
                            <div>
                              {row.credit ? (
                                <span className="text-emerald-600 uppercase tracking-wide text-[10px]">Credit: -{formatCurrency(row.credit, 'USD')}</span>
                              ) : <span className="text-slate-300">-</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {ledgerRows.length === 0 && (
                        <div className="py-10 text-center">
                          <p className="text-sky-500 font-bold text-sm">No ledger entries yet</p>
                        </div>
                      )}
                      {ledgerRows.length > 0 && (
                        <div className="p-4 bg-sky-50/80 border border-sky-100/70 rounded-2xl space-y-1.5 text-xs font-black text-sky-950 shadow-sm mt-4">
                          <div className="flex justify-between">
                            <span>{t('customerLedger.statement_debit_total')}</span>
                            <span className="text-rose-600">+{formatCurrency(totals.debit, 'USD')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('customerLedger.statement_credit_total')}</span>
                            <span className="text-emerald-600">-{formatCurrency(totals.credit, 'USD')}</span>
                          </div>
                          <div className="flex justify-between border-t border-sky-200/50 pt-1.5 text-sm">
                            <span>{t('customerLedger.closing_balance_label')}</span>
                            <span>{formatCurrency(totals.balance, 'USD')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto app-scrollbar">
                      <table className="w-full min-w-[760px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-sky-100 text-[11px] font-black text-sky-500 uppercase tracking-[0.14em]">
                            <th className="pb-3 pr-4">{t('customerLedger.date')}</th>
                            <th className="pb-3 px-4">{t('customerLedger.receipt_no')}</th>
                            <th className="pb-3 px-4">{t('customerLedger.description')}</th>
                            <th className="pb-3 px-4 text-right">{t('customerLedger.debit')}</th>
                            <th className="pb-3 px-4 text-right">{t('customerLedger.credit')}</th>
                            <th className="pb-3 pl-4 text-right">{t('customerLedger.balance')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-100/60 text-sm font-bold text-sky-900">
                          {ledgerRows.map((row) => (
                            <tr key={row.id} className="hover:bg-sky-50/40 transition-colors">
                              <td className="py-4 pr-4 text-sky-500 whitespace-nowrap">{formatDate(row.date)}</td>
                              <td className="py-4 px-4 font-black text-sky-950 whitespace-nowrap">
                                {row.transaction_id ? `TX-${row.transaction_id}` : 'OP'}
                              </td>
                              <td className="py-4 px-4 min-w-[220px]">{row.description || '-'}</td>
                              <td className="py-4 px-4 text-right font-black text-rose-600 whitespace-nowrap">
                                {row.debit ? formatCurrency(row.debit, 'USD') : '-'}
                              </td>
                              <td className="py-4 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                                {row.credit ? formatCurrency(row.credit, 'USD') : '-'}
                              </td>
                              <td className="py-4 pl-4 text-right font-black text-sky-950 whitespace-nowrap">
                                {formatCurrency(row.balance, 'USD')}
                              </td>
                            </tr>
                          ))}
                          {ledgerRows.length === 0 && (
                            <tr>
                              <td colSpan="6" className="py-14 text-center">
                                <div className="mx-auto max-w-sm">
                                  <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-3">
                                    <FileSpreadsheet size={22} />
                                  </div>
                                  <p className="text-sky-800 font-black">No ledger entries yet</p>
                                  <p className="text-sky-400 text-xs mt-1">
                                    Saved transactions for this customer will appear here automatically.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-sky-100 bg-sky-50/60 text-sm font-black text-sky-950">
                            <td className="py-4 pr-4" colSpan="3">{t('customerLedger.statement_total')}</td>
                            <td className="py-4 px-4 text-right text-rose-600 whitespace-nowrap">{formatCurrency(totals.debit, 'USD')}</td>
                            <td className="py-4 px-4 text-right text-emerald-600 whitespace-nowrap">{formatCurrency(totals.credit, 'USD')}</td>
                            <td className="py-4 pl-4 text-right whitespace-nowrap">{formatCurrency(totals.balance, 'USD')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard className="py-20 text-center">
              <p className="text-sky-500 font-black">Select or register a customer to view account ledgers.</p>
            </GlassCard>
          )}
        </div>

        {!isViewer && (
          <GlassCard className="p-5 xl:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-5">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4 mb-5">
              <div>
                <p className="text-[11px] font-black text-sky-500 uppercase tracking-[0.16em]">
                  {editMode ? 'Update Profile' : 'New Account'}
                </p>
                <h2 className="text-lg font-black text-sky-950 flex items-center gap-2">
                  {editMode ? 'Edit Customer' : 'Add Customer'}
                </h2>
              </div>
              {editMode ? (
                <button
                  onClick={resetForm}
                  className="h-10 w-10 rounded-xl text-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors inline-flex items-center justify-center"
                  title="Cancel edit"
                >
                  <X size={17} />
                </button>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 inline-flex items-center justify-center">
                  <Plus size={18} />
                </div>
              )}
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-sky-700 uppercase tracking-wide mb-2">
                  Customer / Company Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold text-sky-950"
                  placeholder="Ariana Transport, Kabul Corp"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-sky-700 uppercase tracking-wide mb-2">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  className="h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold text-sky-950"
                  placeholder="+93 799..."
                  value={form.phone}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-sky-700 uppercase tracking-wide mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  className="h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold text-sky-950"
                  placeholder="Kabul, Afghanistan"
                  value={form.address}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-sky-700 uppercase tracking-wide mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows="4"
                  className="w-full px-4 py-3 rounded-2xl border border-sky-100 bg-white/70 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold text-sky-950 resize-none"
                  placeholder="Internal ledger notes..."
                  value={form.notes}
                  onChange={handleFormChange}
                />
              </div>

              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingCustomer}
                className="h-12 w-full bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 transition-all text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingCustomer ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>{editMode ? 'Update Customer' : 'Register Customer'}</span>
              </button>
            </form>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
