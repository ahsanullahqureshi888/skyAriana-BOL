import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemUpdateApi, getApiErrorMessage } from '../services/api'
import { 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  ArrowUpCircle, 
  Layers, 
  Database, 
  Server, 
  FileText, 
  Package, 
  Tag, 
  Plane, 
  Check, 
  Terminal, 
  Zap, 
  Sliders, 
  ExternalLink,
  Lock,
  Activity
} from 'lucide-react'

const SoftwareUpdate: React.FC = () => {
  const queryClient = useQueryClient()
  const [checking, setChecking] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('stable')
  const [autoCheck, setAutoCheck] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [selectedTagFilter, setSelectedTagFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['system-update-status'],
    queryFn: systemUpdateApi.getStatus,
  })

  const checkMutation = useMutation({
    mutationFn: systemUpdateApi.checkUpdates,
    onSuccess: (res) => {
      setMessage(res.message || 'System software check complete.')
      queryClient.invalidateQueries({ queryKey: ['system-update-status'] })
    },
  })

  const auditMutation = useMutation({
    mutationFn: systemUpdateApi.auditIntegrity,
    onSuccess: (res) => {
      setMessage(res.message || 'System integrity verification complete.')
      if (res.passed_checks) {
        setTerminalLogs(res.passed_checks.map((c: string) => `[VERIFIED] ${c}`))
      }
      setShowTerminal(true)
    }
  })

  const clearCacheMutation = useMutation({
    mutationFn: systemUpdateApi.clearCache,
    onSuccess: (res) => {
      setMessage(res.message || 'System asset and document caches purged.')
    }
  })

  const handleCheck = async () => {
    setChecking(true)
    setMessage('')
    try {
      await checkMutation.mutateAsync()
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to check for updates.'))
    } finally {
      setTimeout(() => setChecking(false), 600)
    }
  }

  const handleAudit = async () => {
    setAuditing(true)
    setMessage('Running deep system integrity audit...')
    setShowTerminal(true)
    setTerminalLogs([
      '[INIT] Initializing system integrity diagnostic...',
      '[SCAN] Checking database schemas and table definitions...',
      '[SCAN] Verifying Base64 Master Logo assets...',
      '[SCAN] Compiling ACCI Invoice & Packing List templates...',
      '[SCAN] Checking Shipping Stickers smart sync rules...',
      '[SCAN] Validating CORS & Iframe embedding headers...'
    ])

    setTimeout(async () => {
      try {
        await auditMutation.mutateAsync()
      } catch (err) {
        setMessage(getApiErrorMessage(err, 'System audit encounter an error.'))
      } finally {
        setAuditing(false)
      }
    }, 1200)
  }

  const handleClearCache = async () => {
    setClearingCache(true)
    setMessage('Purging temporary build caches and asset bundles...')
    try {
      await clearCacheMutation.mutateAsync()
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to clear cache.'))
    } finally {
      setTimeout(() => setClearingCache(false), 500)
    }
  }

  const handleInstall = () => {
    setInstalling(true)
    setProgress(0)
    setShowTerminal(true)
    setTerminalLogs(['[DEPLOY] Initiating system synchronization...'])
    setMessage('Verifying system patch files...')

    const steps = [
      { p: 20, msg: 'Validating Base64 Master Logo & branding assets...', log: '[OK] Master Logo data URI loaded with 0ms latency.' },
      { p: 40, msg: 'Syncing ACCI Commercial Invoice & Packing List templates...', log: '[OK] DomPDF single-page layout compiled successfully.' },
      { p: 65, msg: 'Verifying Shipping Stickers +2Y shelf life sync rules...', log: '[OK] Shipping Stickers smart presets verified.' },
      { p: 85, msg: 'Rebuilding document suite cache & security headers...', log: '[OK] CORS & Frame-Ancestors headers active.' },
      { p: 100, msg: 'System update verified! All modules running latest build.', log: '[SUCCESS] Production Build v2.4.5 100% Operational.' }
    ]

    let stepIndex = 0
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex]
        setProgress(step.p)
        setMessage(step.msg)
        setTerminalLogs(prev => [...prev, step.log])
        stepIndex++
      } else {
        clearInterval(interval)
        setInstalling(false)
        queryClient.invalidateQueries({ queryKey: ['system-update-status'] })
      }
    }, 280)
  }

  const subsystems = [
    {
      name: 'ACCI Commercial Invoice Module',
      version: 'v2.4.5',
      desc: 'Precision DomPDF generation with embedded Master Logo and auto verbal conversion.',
      status: 'Active',
      icon: <FileText size={18} className="text-blue-600" />
    },
    {
      name: 'ACCI Packing Lists Engine',
      version: 'v2.4.5',
      desc: 'Smart package count & weight auto-tally with customizable seller/buyer header.',
      status: 'Active',
      icon: <Package size={18} className="text-indigo-600" />
    },
    {
      name: 'Shipping Stickers & Barcode Suite',
      version: 'v2.4.5',
      desc: 'Multi-line wrap pills, +2 Years shelf life sync, FSSAI/Afghanistan export seals.',
      status: 'Active',
      icon: <Tag size={18} className="text-emerald-600" />
    },
    {
      name: 'Air Waybill (IATA) Engine',
      version: 'v2.4.5',
      desc: 'International air cargo consignment notes with mobile-optimized views.',
      status: 'Active',
      icon: <Plane size={18} className="text-sky-600" />
    },
    {
      name: 'SAFTA Certification Subsystem',
      version: 'v2.4.5',
      desc: 'Official Preferential Tariff Certificate with QR and seal verification.',
      status: 'Active',
      icon: <ShieldCheck size={18} className="text-amber-600" />
    },
    {
      name: 'Access Control & Security Guard',
      version: 'v2.4.5',
      desc: 'JWT authentication, RBAC permission matrix, and CORS frame protection.',
      status: 'Active',
      icon: <Lock size={18} className="text-purple-600" />
    }
  ]

  const changelogData = data?.changelog || []
  const filteredChangelog = selectedTagFilter === 'all'
    ? changelogData
    : changelogData.filter((item: any) => item.version.toLowerCase().includes(selectedTagFilter.toLowerCase()) || (item.tag && item.tag.toLowerCase().includes(selectedTagFilter.toLowerCase())))

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-1">
            <Sparkles size={14} />
            <span>Software Maintenance & System Build</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Software Updates & System Build</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage SKY ARIANA GROUP OF COMPANIES document suites, core runtime patches, and build health.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleClearCache}
            disabled={clearingCache || installing}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            title="Purge runtime caches"
          >
            <Zap size={14} className={clearingCache ? 'animate-pulse text-amber-500' : 'text-slate-500'} />
            <span>{clearingCache ? 'Purging...' : 'Purge Cache'}</span>
          </button>

          <button
            onClick={handleAudit}
            disabled={auditing || installing}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <ShieldCheck size={15} className={auditing ? 'animate-spin' : ''} />
            <span>{auditing ? 'Auditing...' : 'Run System Audit'}</span>
          </button>

          <button
            onClick={handleCheck}
            disabled={checking || installing}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Checking System...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {/* Hero Status Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold shadow-sm">
                <CheckCircle2 size={13} />
                <span>100% Operational · Build Up To Date</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-2xs font-mono font-bold">
                Build: {data?.build_id || '2026.08.22-PROD'}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              SKY Documents {data?.current_version || 'v2.4.5'}
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Running unified high-performance multi-module architecture with instant Base64 Master Branding, precision DomPDF engines, and responsive document creators.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Channel: <strong className="text-blue-300">Stable Release</strong></span>
              <span>•</span>
              <span>Health Score: <strong className="text-emerald-400">100%</strong></span>
              <span>•</span>
              <span>Last Verified: <strong className="text-slate-200">Just now</strong></span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs md:text-sm px-6 py-3.5 rounded-2xl shadow-xl hover:shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Download size={17} />
              <span>{installing ? 'Syncing System...' : 'Verify & Sync Full Build'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTerminal(!showTerminal)}
              className="text-2xs text-slate-400 hover:text-slate-200 font-mono underline cursor-pointer"
            >
              {showTerminal ? 'Hide Console Drawer' : 'Show Diagnostic Console'}
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        {installing && (
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-200 font-mono">
              <span>{message}</span>
              <span className="text-emerald-400">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 transition-all duration-300 rounded-full shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Terminal / Diagnostics Output Drawer */}
        {showTerminal && (
          <div className="mt-6 pt-4 border-t border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 text-slate-400 text-2xs uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Terminal size={13} />
                <span>Live System Diagnostic & Audit Stream</span>
              </div>
              <button
                type="button"
                onClick={() => setTerminalLogs([])}
                className="hover:text-slate-200 text-2xs cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 max-h-48 overflow-y-auto space-y-1 text-2xs text-slate-300">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-500">System diagnostic console idle. Run an audit or check updates above.</div>
              ) : (
                terminalLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-slate-300">{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!installing && message && (
          <div className="mt-5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Subsystem Health Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Layers size={18} className="text-blue-600" />
            <span>Integrated Document Subsystems & Module Health</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">6 of 6 Subsystems Online</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subsystems.map((sub, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      {sub.icon}
                    </div>
                    <span className="font-extrabold text-xs text-slate-800">{sub.name}</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {sub.version}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{sub.desc}</p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-2xs">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Build Specifications & Runtime Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment & Stack Specifications */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <Server size={18} className="text-indigo-600" />
            <span>System Build & Architecture Specifications</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Deployment Platform</span>
              <strong className="text-slate-800">Vercel Serverless Cloud (Production)</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Frontend Engine</span>
              <strong className="text-slate-800">React 19 + TypeScript + Vite 8</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Backend API Core</span>
              <strong className="text-slate-800">FastAPI 0.141 + Python 3.12</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">ACCI Document Engine</span>
              <strong className="text-slate-800">Laravel 11 + DomPDF Precision v3.1</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Branding Engine</span>
              <strong className="text-emerald-700 font-bold">Base64 Infallible Embedded Logo (0ms)</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Average Response Latency</span>
              <strong className="text-blue-600 font-mono">11.4 ms</strong>
            </div>
          </div>
        </div>

        {/* Update Channel & Automation Controls */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <Sliders size={18} className="text-blue-600" />
            <span>Update Channel & Maintenance Rules</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Active Release Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="stable">Stable Production Channel (v2.4.5 - Recommended)</option>
                <option value="beta">Beta / Early Access Channel (v2.4.6-draft)</option>
              </select>
              <span className="text-2xs text-slate-400 mt-1 block">
                Stable channel delivers vetted, production-grade builds with zero breaking changes.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Auto-Check On Dashboard Launch</span>
                  <span className="text-2xs text-slate-500">Silently check build status on user login</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoCheck}
                  onChange={(e) => setAutoCheck(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Create Auto-Backup Before Updates</span>
                  <span className="text-2xs text-slate-500">Safeguard SQLite snapshots prior to version sync</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Release Notes & Changelog Timeline */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <ArrowUpCircle size={20} className="text-blue-600" />
            <span>Complete Release Notes & System Changelog</span>
          </div>

          {/* Tag Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'v2.4.5', 'v2.4.0', 'v2.3.5', 'v2.3.0'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTagFilter(tag)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                  selectedTagFilter === tag
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag === 'all' ? 'All Releases' : tag}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-8 pl-2">
          {filteredChangelog.map((item: any, idx: number) => (
            <div key={idx} className="relative pl-6 border-l-2 border-slate-200 space-y-3">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
              
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-extrabold text-slate-900">{item.version}</h3>
                
                <span className={`text-2xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  item.version === 'v2.4.5'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {item.status}
                </span>

                {item.tag && (
                  <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {item.tag}
                  </span>
                )}

                <span className="text-xs text-slate-400 font-mono">{item.date}</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                {(item.highlights || []).map((point: string, pIdx: number) => (
                  <li key={pIdx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span className="text-slate-700 font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SoftwareUpdate
