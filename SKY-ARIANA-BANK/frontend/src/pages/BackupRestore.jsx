import React, { useState, useEffect, useRef } from 'react';
import { Database, Download, Upload, ClipboardCopy, Loader2, Calendar, ShieldAlert, FileArchive, Globe, Laptop, RefreshCw } from 'lucide-react';
import { backupAPI, settingsAPI } from '../api/client';
import { formatDate } from '../utils/formatters';
import GlassCard from '../components/GlassCard';

const formatBytes = (bytes) => {
  if (bytes === 0 || bytes === '0') return '0 Bytes';
  if (!bytes) return 'N/A';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function BackupRestore() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoringAttachments, setRestoringAttachments] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await backupAPI.status();
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch backup status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await backupAPI.auditLogs();
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadData = () => {
    fetchStatus();
    fetchLogs();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAutoBackup = async () => {
    if (!status) return;
    const newAutoValue = !status.auto_backup;
    try {
      await settingsAPI.update({ auto_backup: newAutoValue });
      setStatus(prev => ({ ...prev, auto_backup: newAutoValue }));
      setMessage({ text: `Automatic backup setting updated to: ${newAutoValue ? 'ENABLED' : 'DISABLED'}`, type: 'success' });
      fetchLogs();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to update auto backup setting.', type: 'error' });
    }
  };

  const handleExportBackup = async () => {
    try {
      setMessage({ text: '', type: '' });
      const res = await backupAPI.export();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `sky-banking-db-backup-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMessage({ text: 'Database JSON backup file downloaded successfully.', type: 'success' });
      fetchStatus();
      fetchLogs();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to generate database backup export.', type: 'error' });
    }
  };

  const handleExportAttachments = async () => {
    try {
      setMessage({ text: '', type: '' });
      const res = await backupAPI.exportAttachments();
      const blob = new Blob([res.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', downloadUrl);
      downloadAnchor.setAttribute('download', `sky-banking-attachments-${Date.now()}.zip`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setMessage({ text: 'Attachments ZIP archive file downloaded successfully.', type: 'success' });
      fetchStatus();
      fetchLogs();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to generate attachments archive export.', type: 'error' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleZipImportClick = () => {
    zipInputRef.current?.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('WARNING: Restoring the database will overwrite all existing transactions, ledgers, customer accounts, and settings. Are you sure you want to proceed?')) {
      setRestoring(true);
      setMessage({ text: '', type: '' });
      try {
        const res = await backupAPI.import(file);
        if (res.data.ok) {
          setMessage({ text: 'Database restored successfully! Page will refresh to reload records.', type: 'success' });
          loadData();
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (err) {
        console.error(err);
        setMessage({ text: err.response?.data?.detail || 'Failed to restore database backup.', type: 'error' });
      } finally {
        setRestoring(false);
      }
    }
    // Reset file input
    e.target.value = '';
  };

  const handleZipImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('Restore attachments from backup archive? This will extract all transaction images and PDF receipts.')) {
      setRestoringAttachments(true);
      setMessage({ text: '', type: '' });
      try {
        const res = await backupAPI.importAttachments(file);
        if (res.data.ok) {
          setMessage({ text: `Attachments extracted successfully. Restored ${res.data.extracted_count} receipt files.`, type: 'success' });
          loadData();
        }
      } catch (err) {
        console.error(err);
        setMessage({ text: err.response?.data?.detail || 'Failed to restore attachments archive.', type: 'error' });
      } finally {
        setRestoringAttachments(false);
      }
    }
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sky-900 leading-tight">Backup & Restore Vault</h1>
          <p className="text-sm text-sky-500 font-medium mt-1">Export SQLite database records, download attachments archives, or inspect safety trails.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-sky-100 bg-white/60 hover:bg-sky-50 text-sky-800 font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
        >
          <RefreshCw size={12} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`p-4 border rounded-xl text-xs font-semibold leading-relaxed shadow-sm flex items-start gap-2.5 ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <ShieldAlert size={16} className={message.type === 'success' ? 'text-emerald-500 mt-0.5 shrink-0' : 'text-red-500 mt-0.5 shrink-0'} />
          <div>{message.text}</div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Actions & Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Metrics Card */}
          <GlassCard className="p-6 space-y-5">
            <h2 className="text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 flex items-center gap-2">
              <Database size={18} className="text-sky-500" />
              <span>Storage Metrics</span>
            </h2>

            {loadingStatus ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin text-sky-500" size={24} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs border-b border-sky-50/50 pb-2">
                  <span className="text-sky-500 font-bold">Database File Size</span>
                  <span className="text-sky-900 font-extrabold font-mono">{formatBytes(status?.db_size_bytes)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-sky-50/50 pb-2">
                  <span className="text-sky-500 font-bold">Attachments Size</span>
                  <span className="text-sky-900 font-extrabold font-mono">{formatBytes(status?.attachments_size_bytes)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-sky-50/50 pb-2">
                  <span className="text-sky-500 font-bold">Last Vault Backup</span>
                  <span className="text-sky-900 font-extrabold font-mono">
                    {status?.last_backup_at ? formatDate(status.last_backup_at) : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-sky-500 font-bold">Auto Backup System</span>
                  <button 
                    onClick={handleToggleAutoBackup}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      status?.auto_backup ? 'bg-sky-550' : 'bg-sky-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        status?.auto_backup ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Backup Operations Card */}
          <GlassCard className="p-6 space-y-4">
            <h2 className="text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 flex items-center gap-2">
              <Download size={18} className="text-sky-500" />
              <span>Operations Panel</span>
            </h2>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              className="hidden"
              accept=".json"
            />
            <input
              type="file"
              ref={zipInputRef}
              onChange={handleZipImportChange}
              className="hidden"
              accept=".zip"
            />

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-gradient-to-tr from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Download size={14} />
                <span>Export Database (JSON)</span>
              </button>

              <button
                onClick={handleExportAttachments}
                className="w-full py-3 bg-gradient-to-tr from-sky-800 to-sky-900 hover:from-sky-900 hover:to-sky-950 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
              >
                <FileArchive size={14} />
                <span>Export Attachments (ZIP)</span>
              </button>

              <button
                onClick={handleImportClick}
                disabled={restoring}
                className="w-full py-3 border border-sky-100 bg-white hover:bg-sky-50 text-sky-800 font-bold rounded-xl shadow-sm text-xs flex items-center justify-center gap-2 transition-all"
              >
                {restoring ? <Loader2 className="animate-spin text-sky-500" size={14} /> : <Upload size={14} />}
                <span>Restore Database JSON</span>
              </button>

              <button
                onClick={handleZipImportClick}
                disabled={restoringAttachments}
                className="w-full py-3 border border-sky-100 bg-white hover:bg-sky-50 text-sky-850 font-bold rounded-xl shadow-sm text-xs flex items-center justify-center gap-2 transition-all"
              >
                {restoringAttachments ? <Loader2 className="animate-spin text-sky-500" size={14} /> : <FileArchive size={14} />}
                <span>Restore Attachments ZIP</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Security Trails and Logs Table */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3 mb-5">
            <h2 className="text-base font-extrabold text-sky-900">Security Audit Trail</h2>
            <button
              onClick={fetchLogs}
              className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={10} />
              <span>Refresh Trail</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-20 flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-sky-500" size={28} />
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto min-h-[40vh] max-h-[60vh] pr-1">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-sky-100 text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                    <th className="py-3 pr-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 pl-4">Network Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50/50 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3 pr-4 text-sky-500 font-medium whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          log.action === 'create' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          log.action === 'update' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          log.action === 'delete' ? 'bg-red-50 text-red-600 border border-red-100' :
                          log.action === 'import' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                          'bg-sky-50 text-sky-600 border border-sky-100'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-sky-850 max-w-[150px] truncate">
                        {log.user_email || 'System'}
                      </td>
                      <td className="py-3 px-4 text-sky-700 font-medium min-w-[200px]">
                        {log.description}
                      </td>
                      <td className="py-3 pl-4 text-sky-400 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-[10px] font-mono">
                          <span className="flex items-center gap-1">
                            <Globe size={9} />
                            {log.ip_address || 'Localhost'}
                          </span>
                          <span className="flex items-center gap-1 max-w-[150px] truncate" title={log.device_info}>
                            <Laptop size={9} />
                            {log.device_info ? log.device_info.split(')')[0].replace('Mozilla/5.0 (', '') : 'CLI / System'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sky-400 font-semibold">
                        No security actions recorded in audit trail.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
}
