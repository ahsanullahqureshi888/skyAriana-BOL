import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { backupApi } from '../services/api'
import { Database, Download, Trash2, RefreshCw, Upload, FileSpreadsheet, FileJson, CheckCircle2, History, AlertCircle } from 'lucide-react'

const Backups: React.FC = () => {
  const queryClient = useQueryClient()
  const token = localStorage.getItem('token') || ''

  // States
  const [restoring, setRestoring] = useState(false)
  const [importingCust, setImportingCust] = useState(false)
  const [importingProd, setImportingProd] = useState(false)

  // Queries
  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: backupApi.list
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: backupApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      alert('Database backup created successfully!')
    },
    onError: (err: any) => {
      alert('Failed to create backup: ' + (err.response?.data?.detail || err.message))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: backupApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      alert('Backup file deleted successfully!')
    },
    onError: (err: any) => {
      alert('Failed to delete backup: ' + (err.response?.data?.detail || err.message))
    }
  })

  // Handlers
  const handleCreateBackup = () => {
    createMutation.mutate()
  }

  const handleDeleteBackup = (filename: string) => {
    if (confirm(`Are you sure you want to permanently delete backup file "${filename}"?`)) {
      deleteMutation.mutate(filename)
    }
  }

  const handleDownload = (filename: string) => {
    const url = backupApi.downloadUrl(filename, token)
    window.open(url, '_blank')
  }

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!confirm('WARNING: Restoring the database will overwrite all current invoices, customers, and product records. This cannot be undone. Are you sure you want to proceed?')) {
      return
    }

    setRestoring(true)
    try {
      await backupApi.restore(file)
      queryClient.invalidateQueries()
      alert('Database restored successfully! The page will now refresh.')
      window.location.reload()
    } catch (err: any) {
      alert('Database restore failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setRestoring(false)
    }
  }

  const handleImportCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingCust(true)
    try {
      await backupApi.importCustomers(file)
      queryClient.invalidateQueries()
      alert('Customers imported successfully!')
    } catch (err: any) {
      alert('Failed to import customers: ' + (err.response?.data?.detail || err.message))
    } finally {
      setImportingCust(false)
    }
  }

  const handleImportProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingProd(true)
    try {
      await backupApi.importProducts(file)
      queryClient.invalidateQueries()
      alert('Products imported successfully!')
    } catch (err: any) {
      alert('Failed to import products: ' + (err.response?.data?.detail || err.message))
    } finally {
      setImportingProd(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get Excel/JSON download URLs with Auth token appended
  const excelExportUrl = `${backupApi.exportExcelUrl()}?token=${token}`
  const jsonExportUrl = `${backupApi.exportJsonUrl()}?token=${token}`

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Utility Suite</span>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
            <Database className="text-blue-600" size={24} />
            Backup & Restore
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Export datasets, download SQLite database snapshots, or restore system backups.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateBackup}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={createMutation.isPending ? 'animate-spin' : ''} />
            Create Backup Snapshot
          </button>
        </div>
      </div>

      {/* Main utilities grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Backup History */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <History size={16} className="text-blue-600" />
              Backup History Logs
            </h3>

            {isLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-[10px] text-slate-400 mt-2">Loading backup logs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-3">Filename</th>
                      <th className="p-3">File Size</th>
                      <th className="p-3">Created Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups?.map((b: any, index: number) => (
                      <tr key={index} className="hover:bg-blue-50/10 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-700">{b.filename}</td>
                        <td className="p-3 text-slate-500 font-medium">{formatBytes(b.size)}</td>
                        <td className="p-3 text-slate-400 font-mono text-[10px]">
                          {new Date(b.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleDownload(b.filename)}
                            className="inline-flex p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all cursor-pointer"
                            title="Download Backup"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(b.filename)}
                            className="inline-flex p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all cursor-pointer"
                            title="Delete Backup"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!backups || backups.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No backup snapshots found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Import Panel */}
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <Upload size={16} className="text-blue-600" />
              Import Datasets (Excel)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Import Customers */}
              <div className="border border-slate-200 border-dashed rounded-2xl p-5 flex flex-col items-center justify-between text-center min-h-[140px] bg-slate-50/50">
                <FileSpreadsheet className="text-blue-500 mb-2" size={28} />
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Import Customers Template</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Upload `.xlsx` sheet containing customer records.</p>
                </div>
                <label className="mt-4 px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                  <Upload size={12} className="text-blue-600" />
                  {importingCust ? 'Importing...' : 'Select Excel Sheet'}
                  <input type="file" accept=".xlsx, .xls" onChange={handleImportCustomers} className="hidden" disabled={importingCust} />
                </label>
              </div>

              {/* Import Products */}
              <div className="border border-slate-200 border-dashed rounded-2xl p-5 flex flex-col items-center justify-between text-center min-h-[140px] bg-slate-50/50">
                <FileSpreadsheet className="text-indigo-500 mb-2" size={28} />
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Import Products Template</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Upload `.xlsx` sheet containing commodity catalog.</p>
                </div>
                <label className="mt-4 px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                  <Upload size={12} className="text-blue-600" />
                  {importingProd ? 'Importing...' : 'Select Excel Sheet'}
                  <input type="file" accept=".xlsx, .xls" onChange={handleImportProducts} className="hidden" disabled={importingProd} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Guide & Controls */}
        <div className="space-y-6">
          {/* Quick Exports */}
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Download size={14} className="text-blue-500" />
              Corporate Exports
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Download the entire logistics invoices database in structured data formats.
            </p>
            <div className="space-y-2 pt-2">
              <a
                href={excelExportUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all text-center"
              >
                <FileSpreadsheet size={14} />
                Export to Excel (.xlsx)
              </a>
              <a
                href={jsonExportUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all text-center"
              >
                <FileJson size={14} />
                Export to JSON (.json)
              </a>
            </div>
          </div>

          {/* Database restore alert card */}
          <div className="glass-panel p-5 space-y-4 border-l-4 border-l-red-500">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} />
              Restore Database
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a valid `.db` SQLite database snapshot file. This will **overwrite** the entire system state.
            </p>
            <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center">
              <Upload size={14} />
              {restoring ? 'Restoring DB...' : 'Upload & Restore (.db)'}
              <input type="file" accept=".db" onChange={handleRestoreBackup} className="hidden" disabled={restoring} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Backups
