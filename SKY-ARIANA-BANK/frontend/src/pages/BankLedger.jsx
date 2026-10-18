import React, { useState, useEffect } from 'react';
import { Building, Plus, Printer, FileSpreadsheet, Loader2, Save, Trash2, Edit2, X } from 'lucide-react';
import { bankAPI } from '../api/client';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../utils/formatters';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';

const currencies = ['USD', 'Toman', 'Dirham', 'Afghani'];

const defaultAccountForm = {
  account_name: '',
  bank_name: '',
  account_number: '',
  currency: 'USD',
  opening_balance: '',
};

export default function BankLedger() {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('sky_banking_user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isViewer = user.role === 'Viewer';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [ledgerRows, setLedgerRows] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // CRUD Bank Account Form States
  const [form, setForm] = useState(defaultAccountForm);
  const [editMode, setEditMode] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAccounts = async (selectFirst = false) => {
    setLoadingAccounts(true);
    try {
      const res = await bankAPI.list();
      setAccounts(res.data);
      if (res.data.length > 0) {
        if (selectFirst || !selectedAccountId) {
          setSelectedAccountId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchAccounts(true);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      setLedgerRows([]);
      return;
    }
    setLoadingLedger(true);
    bankAPI.getLedger(selectedAccountId)
      .then((res) => {
        setLedgerRows(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingLedger(false);
      });
  }, [selectedAccountId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!form.account_name || !form.bank_name || !form.account_number) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSavingAccount(true);
    setFormError('');

    try {
      if (editMode) {
        const payload = {
          account_name: form.account_name,
          bank_name: form.bank_name,
          account_number: form.account_number,
          currency: form.currency,
          opening_balance: Number(form.opening_balance || 0),
        };
        await bankAPI.update(selectedAccountId, payload);
        alert('Bank account details updated successfully.');
        setForm(defaultAccountForm);
        setEditMode(false);
        fetchAccounts(false);
      } else {
        const payload = {
          ...form,
          opening_balance: Number(form.opening_balance || 0),
        };
        const res = await bankAPI.create(payload);
        setForm(defaultAccountForm);
        alert('Bank account registered successfully.');
        setSelectedAccountId(res.data.id);
        fetchAccounts(false);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Failed to save bank account details.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleEditClick = () => {
    const activeAcc = accounts.find(a => a.id === Number(selectedAccountId));
    if (!activeAcc) return;
    setForm({
      account_name: activeAcc.account_name || '',
      bank_name: activeAcc.bank_name || '',
      account_number: activeAcc.account_number || '',
      currency: activeAcc.currency || 'USD',
      opening_balance: activeAcc.opening_balance || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setForm(defaultAccountForm);
    setEditMode(false);
    setFormError('');
  };

  const handleDeleteAccount = async () => {
    const activeAcc = accounts.find(a => a.id === Number(selectedAccountId));
    if (!activeAcc) return;

    if (window.confirm(`Are you sure you want to permanently delete bank account "${activeAcc.account_name}"? This action cannot be undone.`)) {
      try {
        await bankAPI.delete(selectedAccountId);
        alert('Bank account deleted successfully.');
        const remaining = accounts.filter(a => a.id !== selectedAccountId);
        setAccounts(remaining);
        setSelectedAccountId(remaining.length > 0 ? remaining[0].id : '');
        setEditMode(false);
        setForm(defaultAccountForm);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to delete bank account. Verify it has no transaction history.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const selectedAcc = accounts.find((a) => a.id === Number(selectedAccountId));
    const filename = `${selectedAcc?.account_name || 'bank'}-ledger.csv`;

    let csvContent = 'Date,Description,Debit,Credit,Balance\n';
    ledgerRows.forEach((row) => {
      csvContent += `"${row.date}","${row.description.replace(/'/g, "''")}",${row.debit || 0},${row.credit || 0},${row.balance}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedAcc = accounts.find((a) => a.id === Number(selectedAccountId));
  const currentCurrency = selectedAcc?.currency || 'USD';

  // Summarize details
  const totalDebit = ledgerRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);
  const finalBalance = ledgerRows.length > 0 ? ledgerRows.at(-1)?.balance || 0 : 0;

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sky-900 leading-tight font-sans">{t('bankLedger.title')}</h1>
          <p className="text-sm text-sky-500 font-medium mt-1">{t('bankLedger.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={ledgerRows.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-sky-50 border border-sky-100 font-bold text-xs text-sky-800 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Printer size={14} />
            <span>{t('bankLedger.print')}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={ledgerRows.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/15 transition-all text-xs disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            <span>{t('bankLedger.export')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Ledger statement list */}
        <div className={isViewer ? "xl:col-span-3 space-y-6" : "xl:col-span-2 space-y-6"}>
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-sky-100/80 pb-4 gap-3 mb-5">
              <h2 className="text-base font-extrabold text-sky-900">{t('bankLedger.select_ledger')}</h2>
              {loadingAccounts ? (
                <Loader2 className="animate-spin text-sky-500" size={18} />
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    className="px-4 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    value={selectedAccountId}
                    onChange={(e) => {
                      setSelectedAccountId(e.target.value);
                      setEditMode(false);
                      setForm(defaultAccountForm);
                    }}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({a.bank_name} - {a.account_number})
                      </option>
                    ))}
                  </select>

                  {/* CRUD action buttons */}
                  {!isViewer && selectedAcc && (
                    <div className="flex gap-1.5 ml-2">
                      <button
                        onClick={handleEditClick}
                        className="p-2 border border-sky-100 bg-white hover:bg-sky-50 text-sky-800 rounded-xl transition-all"
                        title="Edit Account Details"
                      >
                        <Edit2 size={13} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={handleDeleteAccount}
                          className="p-2 border border-rose-100 bg-rose-550/5 hover:bg-rose-100 text-rose-700 rounded-xl transition-all"
                          title="Delete Bank Account"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedAcc ? (
              <div className="space-y-6">
                
                {/* Metric Summary Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                    <span className="text-[10px] font-bold text-sky-500/70 uppercase block mb-1">{t('bankLedger.total_debit')}</span>
                    <strong className="text-sm font-black text-rose-600">
                      {formatCurrency(totalDebit, currentCurrency)}
                    </strong>
                  </div>
                  <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                    <span className="text-[10px] font-bold text-sky-500/70 uppercase block mb-1">{t('bankLedger.total_credit')}</span>
                    <strong className="text-sm font-black text-emerald-600">
                      {formatCurrency(totalCredit, currentCurrency)}
                    </strong>
                  </div>
                  <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                    <span className="text-[10px] font-bold text-sky-500/70 uppercase block mb-1">{t('bankLedger.current_balance')}</span>
                    <strong className="text-sm font-black text-sky-900">
                      {formatCurrency(finalBalance, currentCurrency)}
                    </strong>
                  </div>
                </div>

                {/* Account Transactions Ledger */}
                {loadingLedger ? (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-sky-500 mb-3" size={24} />
                    <p className="text-xs font-semibold text-sky-600">{t('bankLedger.loading')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-sky-100/50 text-[10px] font-bold text-sky-500 uppercase tracking-wider">
                          <th className="pb-3 pr-2">{t('bankLedger.date')}</th>
                          <th className="pb-3 px-2">{t('bankLedger.description')}</th>
                          <th className="pb-3 px-2 text-right">{t('bankLedger.debit_out')}</th>
                          <th className="pb-3 px-2 text-right">{t('bankLedger.credit_in')}</th>
                          <th className="pb-3 pl-2 text-right">{t('bankLedger.balance')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100/30 text-xs font-semibold text-sky-900/90">
                        {ledgerRows.map((row) => (
                          <tr key={row.id} className="hover:bg-sky-50/20 transition-colors">
                            <td className="py-3.5 pr-2 text-sky-500/70">{row.date}</td>
                            <td className="py-3.5 px-2">{row.description}</td>
                            <td className="py-3.5 px-2 text-right font-black text-rose-600">
                              {row.debit ? formatCurrency(row.debit, currentCurrency) : '-'}
                            </td>
                            <td className="py-3.5 px-2 text-right font-black text-emerald-600">
                              {row.credit ? formatCurrency(row.credit, currentCurrency) : '-'}
                            </td>
                            <td className="py-3.5 pl-2 text-right font-black text-sky-900">
                              {formatCurrency(row.balance, currentCurrency)}
                            </td>
                          </tr>
                        ))}
                        {ledgerRows.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-sky-400 font-semibold">
                              No statement entries recorded for this account.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            ) : (
              <div className="py-20 text-center text-sky-400 font-semibold">
                No bank accounts registered. Fill in the form on the right to start.
              </div>
            )}
          </GlassCard>
        </div>

        {/* Add/Edit Bank Account form (Visible to Admins/Accountants) */}
        {!isViewer && (
          <div className="xl:col-span-1">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3 mb-5">
                <h2 className="text-base font-extrabold text-sky-900 flex items-center gap-1.5">
                  {editMode ? <Edit2 size={16} className="text-sky-500" /> : <Building size={18} className="text-sky-500" />}
                  <span>{editMode ? 'Edit Account' : 'Add Bank Account'}</span>
                </h2>
                {editMode && (
                  <button onClick={handleCancelEdit} className="text-sky-400 hover:text-sky-600 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="account_name"
                    className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    placeholder="Dubai Hawala Desk, Main vault"
                    value={form.account_name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    placeholder="AIB Bank, Hawala Desk"
                    value={form.bank_name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    placeholder="DXB-HWL-443"
                    value={form.account_number}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                    value={form.currency}
                    onChange={handleFormChange}
                    disabled={editMode} // Disable currency change on edit to preserve balance audit integrity
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {!editMode && (
                  <div>
                    <label className="block text-[10px] font-bold text-sky-900/60 uppercase tracking-wide mb-1">
                      Opening Balance
                    </label>
                    <input
                      type="number"
                      name="opening_balance"
                      className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                      placeholder="0.00"
                      value={form.opening_balance}
                      onChange={handleFormChange}
                    />
                  </div>
                )}

                {formError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-[11px] font-semibold text-red-600">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingAccount}
                  className="w-full py-3 bg-gradient-to-tr from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/10 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {savingAccount ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  <span>{editMode ? 'Update Bank Account' : 'Save Bank Account'}</span>
                </button>
              </form>
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
}
