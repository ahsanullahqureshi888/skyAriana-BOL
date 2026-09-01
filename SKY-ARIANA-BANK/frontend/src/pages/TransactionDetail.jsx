import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, FileText, User, DollarSign, Building, Landmark, Paperclip, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { transactionAPI } from '../api/client';
import GlassCard from '../components/GlassCard';
import { formatCurrency } from '../utils/formatters';

const safeFilename = (value) =>
  String(value || 'receipt-attachment')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attachmentObjectUrl, setAttachmentObjectUrl] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await transactionAPI.get(id);
        setTransaction(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch transaction details. Verify the record exists.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (!transaction?.attachment_path) {
      setAttachmentObjectUrl('');
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;
    setAttachmentLoading(true);

    transactionAPI.getAttachmentBlobUrl(transaction.id)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setAttachmentObjectUrl(url);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setAttachmentObjectUrl('');
      })
      .finally(() => {
        if (!cancelled) setAttachmentLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [transaction]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-sky-500 mb-4" size={40} />
        <p className="text-sky-600 font-semibold animate-pulse">Loading transaction archive...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-12">
        <GlassCard className="p-8 text-center border-rose-100">
          <div className="text-rose-500 font-extrabold text-lg mb-3">Error Loading Receipt</div>
          <p className="text-sky-900/70 text-sm mb-6">{error || 'Record not found.'}</p>
          <button
            onClick={() => navigate('/transactions')}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition-all"
          >
            Back to Archive
          </button>
        </GlassCard>
      </div>
    );
  }

  const isPDF = transaction.attachment_path?.toLowerCase().endsWith('.pdf');
  const attachmentFilename = transaction.attachment_path?.split(/[\\/]/).pop() || `${transaction.receipt_no}-attachment`;

  const handleViewAttachment = async () => {
    if (attachmentObjectUrl) {
      const opened = window.open(attachmentObjectUrl, '_blank');
      if (!opened) alert('Please allow popups to view the receipt attachment.');
      return;
    }

    try {
      await transactionAPI.openAttachment(transaction.id, attachmentFilename);
    } catch (err) {
      console.error(err);
      alert('Failed to open receipt attachment.');
    }
  };

  const handleDownloadAttachment = async () => {
    try {
      await transactionAPI.downloadAttachment(transaction.id, safeFilename(attachmentFilename));
    } catch (err) {
      console.error(err);
      alert('Failed to download receipt attachment.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between border-b border-sky-100/50 pb-4">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-800 font-bold text-sm transition-all"
        >
          <ArrowLeft size={16} />
          <span>Back to Archive</span>
        </button>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            transaction.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
            transaction.status === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
            'bg-rose-100 text-rose-700 border border-rose-200'
          }`}>
            {transaction.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Transaction Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6 md:p-8 space-y-8">
            {/* Main Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-sky-100/50">
              <div>
                <span className="text-[10px] text-sky-500 font-bold tracking-wider uppercase">Receipt Details</span>
                <h1 className="text-3xl font-black text-sky-900 mt-1">{transaction.receipt_no}</h1>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] text-sky-500 font-bold tracking-wider uppercase block">Transaction Date</span>
                <strong className="text-sky-900 text-sm font-extrabold flex items-center gap-1.5 mt-1">
                  <Calendar size={14} className="text-sky-500" />
                  {transaction.date}
                </strong>
              </div>
            </div>

            {/* Core Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Entry Type</span>
                <strong className={`text-base font-extrabold block mt-1 ${
                  transaction.type === 'Received' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {transaction.type === 'Received' ? 'Money Received' : 'Money Paid'}
                </strong>
              </div>

              {/* Payment Method */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Payment Method</span>
                <strong className="text-sky-900 text-base font-extrabold block mt-1">
                  {transaction.payment_method}
                </strong>
              </div>

              {/* Amount */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl md:col-span-2">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Principal Amount</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <strong className="text-3xl font-black text-sky-950">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </strong>
                </div>
              </div>

              {/* Equivalent Amount */}
              {transaction.equivalent_amount > 0 && (
                <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl md:col-span-2">
                  <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Equivalent Exchange Amount</span>
                  <strong className="text-sky-900 text-xl font-black block mt-1">
                    {formatCurrency(transaction.equivalent_amount, transaction.equivalent_currency)}
                  </strong>
                </div>
              )}

              {/* Customer */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Customer Account</span>
                <div className="flex items-center gap-2 mt-1">
                  <User size={16} className="text-sky-500" />
                  <strong className="text-sky-900 text-sm font-extrabold">{transaction.customer_name}</strong>
                </div>
                {transaction.company_name && (
                  <span className="text-[11px] text-sky-500/70 block mt-0.5">Company: {transaction.company_name}</span>
                )}
              </div>

              {/* Bank Account */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Bank Ledger Account</span>
                <div className="flex items-center gap-2 mt-1">
                  <Building size={16} className="text-sky-500" />
                  <strong className="text-sky-900 text-sm font-extrabold">
                    {transaction.bank_account_id ? 'Linked Bank Account' : 'No Account Linked'}
                  </strong>
                </div>
                {transaction.bank_account_id && (
                  <span className="text-[11px] text-sky-500/70 block mt-0.5">Account ID: {transaction.bank_account_id}</span>
                )}
              </div>

              {/* Subject */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl md:col-span-2">
                <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Subject / Invoice Title</span>
                <strong className="text-sky-900 text-sm font-extrabold block mt-1">
                  {transaction.subject}
                </strong>
              </div>

              {/* Receiver */}
              {transaction.receiver_name && (
                <div className="p-4 bg-sky-50/40 border border-sky-100/30 rounded-2xl md:col-span-2">
                  <span className="text-[10px] text-sky-500/80 font-bold tracking-wider uppercase block">Receiver / Beneficiary Name</span>
                  <strong className="text-sky-900 text-sm font-extrabold block mt-1">
                    {transaction.receiver_name}
                  </strong>
                </div>
              )}
            </div>

            {/* Description Notes */}
            {transaction.description && (
              <div className="pt-6 border-t border-sky-100/50">
                <span className="text-[10px] text-sky-500 font-bold tracking-wider uppercase block mb-2">Description / Office Notes</span>
                <div className="p-4 bg-white/40 border border-sky-100/30 rounded-2xl text-xs font-medium text-sky-900/80 whitespace-pre-line leading-relaxed">
                  {transaction.description}
                </div>
              </div>
            )}

            {/* Audit validation */}
            <div className="pt-6 border-t border-sky-100/50 flex items-center gap-2 text-emerald-600">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold tracking-wider uppercase">Audit Logged and Recalculated</span>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Document Viewer (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between border-b border-sky-100/50 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Paperclip size={18} className="text-sky-500" />
                <h2 className="text-base font-extrabold text-sky-900">Receipt Attachment</h2>
              </div>
              
              {transaction.attachment_path && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleViewAttachment}
                    className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAttachment}
                    className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all flex items-center gap-1 text-xs font-bold shadow-md shadow-sky-500/10"
                    title="Download document"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {transaction.attachment_path ? (
              <div className="flex-1 border border-sky-100 bg-sky-50/10 rounded-2xl overflow-hidden flex items-center justify-center p-2 min-h-[400px]">
                {attachmentLoading ? (
                  <div className="flex flex-col items-center gap-3 text-sky-500 font-bold text-sm">
                    <Loader2 className="animate-spin" size={28} />
                    <span>Loading secured attachment...</span>
                  </div>
                ) : !attachmentObjectUrl ? (
                  <div className="text-center text-sky-500 font-bold text-sm px-4">
                    Attachment preview is unavailable. Use Download to retry with authentication.
                  </div>
                ) : isPDF ? (
                  <iframe
                    src={`${attachmentObjectUrl}#toolbar=0`}
                    className="w-full h-full min-h-[450px] border-0 rounded-xl"
                    title="Receipt PDF Preview"
                  />
                ) : (
                  <img
                    src={attachmentObjectUrl}
                    alt="Receipt Attachment"
                    className="max-w-full max-h-[450px] object-contain rounded-xl shadow-lg border border-sky-100/50"
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-sky-100 bg-white/20 rounded-2xl p-8 text-center text-sky-400 font-semibold min-h-[400px]">
                <FileText size={48} className="text-sky-200 mb-3 animate-pulse" />
                <span>No scan attachment uploaded.</span>
                <p className="text-[10px] text-sky-500/50 max-w-[200px] font-medium mt-1">
                  You can upload files using the edit button in the Archive menu.
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
