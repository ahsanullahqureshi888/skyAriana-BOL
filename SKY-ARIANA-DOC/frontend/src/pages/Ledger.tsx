import React, { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Wallet,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  Edit3,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react'
import * as XLSX from 'xlsx'
import './ledger.css'

export interface LedgerEntry {
  id: string
  sn: number
  date: string
  shipper: string
  consignee: string
  commodity: string
  containerBl: string
  statusBadge?: string // 'Surrendered B/L' | 'Hawala' | 'Invoice' | 'Payment'
  qty: number | '-'
  rate: number | '-'
  credit: number
  debit: number
  notes?: string
}

export interface LedgerAccount {
  id: string
  name: string
  localName?: string
  currency: string
  type: 'customer' | 'supplier' | 'hawala' | 'agent'
  openingBalance: number
  entries: LedgerEntry[]
}

const INITIAL_LEDGERS: LedgerAccount[] = [
  {
    id: 'ledg-1',
    name: 'HAJI IBRAHIM - DANISH AGHA',
    localName: 'حاجی ابراهیم او دانش آغا',
    currency: 'USD',
    type: 'customer',
    openingBalance: 0,
    entries: [
      {
        id: 'ent-1',
        sn: 1,
        date: '2026-02-28',
        shipper: 'NAJEB-AMIRI TRADING',
        consignee: 'MIDA ENTERPRISE LTD',
        commodity: '2300 CNT GREEN RAISINS',
        containerBl: 'RXTU4545407 (1X40 HC) / JADSUHN5A33481',
        statusBadge: 'Surrendered B/L',
        qty: 1,
        rate: 2050.00,
        credit: 2050.00,
        debit: 0
      },
      {
        id: 'ent-2',
        sn: 2,
        date: '2026-02-27',
        shipper: 'NAJEB-AMIRI TRADING',
        consignee: 'MIDA ENTERPRISE LTD',
        commodity: '2315 CNT GREEN RAISINS',
        containerBl: 'PCIU8304571 (1X40 HC) / BWSBNONSA2009231',
        statusBadge: 'Surrendered B/L',
        qty: 1,
        rate: 18540.00,
        credit: 18540.00,
        debit: 0
      },
      {
        id: 'ent-3',
        sn: 3,
        date: '2026-04-20',
        shipper: 'حاجی جمعه کری...',
        consignee: 'DUBAI CASH DEPOSIT',
        commodity: 'Dubai Cash Deposit / Hawala',
        containerBl: 'HAWALA / CASH / DUB-0420',
        statusBadge: 'Hawala',
        qty: '-',
        rate: '-',
        credit: 0,
        debit: 20000.00
      }
    ]
  },
  {
    id: 'ledg-2',
    name: 'UTTAM CHAND RAKESH KUMAR PVT LTD',
    localName: 'اتم چند راکیش کمار لمیټډ',
    currency: 'USD',
    type: 'customer',
    openingBalance: 0,
    entries: [
      {
        id: 'ent-201',
        sn: 1,
        date: '2026-03-10',
        shipper: 'PAHLAWAN NOORI LTD',
        consignee: 'UTTAM CHAND RAKESH KUMAR',
        commodity: '1200 CTNS BLACK RAISINS',
        containerBl: 'AWB-2129081 / DEL-KBL',
        statusBadge: 'Invoice',
        qty: 1200,
        rate: 12.50,
        credit: 15000.00,
        debit: 0
      },
      {
        id: 'ent-202',
        sn: 2,
        date: '2026-03-15',
        shipper: 'UTTAM CHAND RAKESH KUMAR',
        consignee: 'AFGHAN UNITED BANK',
        commodity: 'Bank Transfer Payment',
        containerBl: 'BANK-TXN-881902',
        statusBadge: 'Payment',
        qty: '-',
        rate: '-',
        credit: 0,
        debit: 15000.00
      }
    ]
  },
  {
    id: 'ledg-3',
    name: 'R S INTERNATIONAL',
    localName: 'آر ایس انټرنیشنل نوې دهلي',
    currency: 'USD',
    type: 'customer',
    openingBalance: 0,
    entries: [
      {
        id: 'ent-301',
        sn: 1,
        date: '2026-04-01',
        shipper: 'SKY ARIANA LTD',
        consignee: 'R S INTERNATIONAL',
        commodity: '762 CTNS FIGS & PISTACHIOS',
        containerBl: 'SAFTA-2026-013 / REF-21229',
        statusBadge: 'Invoice',
        qty: 762,
        rate: 41.64,
        credit: 31729.68,
        debit: 0
      }
    ]
  },
  {
    id: 'ledg-4',
    name: 'DUBAI CASH DEPOSIT & HAWALA ACCOUNT',
    localName: 'دوبی حوااله او نقدی حساب',
    currency: 'USD',
    type: 'hawala',
    openingBalance: 0,
    entries: [
      {
        id: 'ent-401',
        sn: 1,
        date: '2026-04-20',
        shipper: 'HAJI IBRAHIM',
        consignee: 'DUBAI CASH EXCHANGE',
        commodity: 'Hawala Transfer to Kabul',
        containerBl: 'DUB-HWL-99812',
        statusBadge: 'Hawala',
        qty: '-',
        rate: '-',
        credit: 20000.00,
        debit: 0
      }
    ]
  }
]

export const Ledger: React.FC = () => {
  const [ledgers, setLedgers] = useState<LedgerAccount[]>(() => {
    try {
      const saved = localStorage.getItem('sky_ariana_ledgers')
      return saved ? JSON.parse(saved) : INITIAL_LEDGERS
    } catch {
      return INITIAL_LEDGERS
    }
  })

  const [activeLedgerId, setActiveLedgerId] = useState<string>(() => {
    return ledgers[0]?.id || 'ledg-1'
  })

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modals state
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false)
  const [newLedgerForm, setNewLedgerForm] = useState({
    name: '',
    localName: '',
    currency: 'USD',
    type: 'customer' as LedgerAccount['type'],
    openingBalance: 0
  })

  const [showAddEntryModal, setShowAddEntryModal] = useState(false)
  const [newEntryForm, setNewEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shipper: '',
    consignee: '',
    commodity: '',
    containerBl: '',
    statusBadge: 'Invoice',
    qty: '' as any,
    rate: '' as any,
    credit: '' as any,
    debit: '' as any,
    notes: ''
  })

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('sky_ariana_ledgers', JSON.stringify(ledgers))
  }, [ledgers])

  const activeLedger = useMemo(() => {
    return ledgers.find(l => l.id === activeLedgerId) || ledgers[0]
  }, [ledgers, activeLedgerId])

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!activeLedger) return []
    let list = [...activeLedger.entries]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.shipper.toLowerCase().includes(q) ||
        e.consignee.toLowerCase().includes(q) ||
        e.commodity.toLowerCase().includes(q) ||
        e.containerBl.toLowerCase().includes(q)
      )
    }

    if (filterCategory !== 'all') {
      if (filterCategory === 'invoices') {
        list = list.filter(e => e.statusBadge === 'Invoice' || e.credit > 0)
      } else if (filterCategory === 'hawala') {
        list = list.filter(e => e.statusBadge === 'Hawala')
      } else if (filterCategory === 'surrendered') {
        list = list.filter(e => e.statusBadge === 'Surrendered B/L')
      } else if (filterCategory === 'payments') {
        list = list.filter(e => e.statusBadge === 'Payment' || e.debit > 0)
      }
    }

    if (dateFrom) {
      list = list.filter(e => e.date >= dateFrom)
    }
    if (dateTo) {
      list = list.filter(e => e.date <= dateTo)
    }

    return list
  }, [activeLedger, search, filterCategory, dateFrom, dateTo])

  // Aggregate totals
  const aggregates = useMemo(() => {
    if (!activeLedger) return { totalCredit: 0, totalDebit: 0, balance: 0, totalQty: 0 }
    const totalCredit = activeLedger.entries.reduce((sum, e) => sum + Number(e.credit || 0), 0)
    const totalDebit = activeLedger.entries.reduce((sum, e) => sum + Number(e.debit || 0), 0)
    const balance = totalCredit - totalDebit
    const totalQty = activeLedger.entries.reduce((sum, e) => sum + (typeof e.qty === 'number' ? e.qty : 0), 0)

    return { totalCredit, totalDebit, balance, totalQty }
  }, [activeLedger])

  // Handle create new ledger account
  const handleCreateLedger = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLedgerForm.name.trim()) {
      toast.error('Ledger account name is required')
      return
    }

    const newLedger: LedgerAccount = {
      id: 'ledg-' + Date.now(),
      name: newLedgerForm.name.trim().toUpperCase(),
      localName: newLedgerForm.localName.trim(),
      currency: newLedgerForm.currency,
      type: newLedgerForm.type,
      openingBalance: Number(newLedgerForm.openingBalance || 0),
      entries: []
    }

    setLedgers(prev => [...prev, newLedger])
    setActiveLedgerId(newLedger.id)
    setShowAddLedgerModal(false)
    setNewLedgerForm({
      name: '',
      localName: '',
      currency: 'USD',
      type: 'customer',
      openingBalance: 0
    })
  }

  // Handle add new entry
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeLedger) {
      toast.error('Please select a ledger account first')
      return
    }
    if (!newEntryForm.shipper.trim() || !newEntryForm.consignee.trim()) {
      toast.error('Shipper and Consignee fields are required')
      return
    }

    const creditVal = parseFloat(newEntryForm.credit) || 0
    const debitVal = parseFloat(newEntryForm.debit) || 0
    const qtyVal = newEntryForm.qty ? parseInt(newEntryForm.qty) : '-'
    const rateVal = newEntryForm.rate ? parseFloat(newEntryForm.rate) : '-'

    const newEntry: LedgerEntry = {
      id: 'ent-' + Date.now(),
      sn: activeLedger.entries.length + 1,
      date: newEntryForm.date || new Date().toISOString().split('T')[0],
      shipper: newEntryForm.shipper.trim() || activeLedger.name,
      consignee: newEntryForm.consignee.trim() || 'MIDA ENTERPRISE',
      commodity: newEntryForm.commodity.trim() || 'General Cargo',
      containerBl: newEntryForm.containerBl.trim() || 'REF-ENTRY',
      statusBadge: newEntryForm.statusBadge,
      qty: qtyVal,
      rate: rateVal,
      credit: creditVal,
      debit: debitVal,
      notes: newEntryForm.notes.trim()
    }

    setLedgers(prev =>
      prev.map(l => l.id === activeLedger.id ? { ...l, entries: [...l.entries, newEntry] } : l)
    )

    setShowAddEntryModal(false)
    setNewEntryForm({
      date: new Date().toISOString().split('T')[0],
      shipper: '',
      consignee: '',
      commodity: '',
      containerBl: '',
      statusBadge: 'Invoice',
      qty: '',
      rate: '',
      credit: '',
      debit: '',
      notes: ''
    })
  }

  // Handle delete entry
  const handleDeleteEntry = (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    setLedgers(prev =>
      prev.map(l =>
        l.id === activeLedger.id
          ? { ...l, entries: l.entries.filter(e => e.id !== entryId).map((e, idx) => ({ ...e, sn: idx + 1 })) }
          : l
      )
    )
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle export Excel
  const handleExportExcel = () => {
    if (!activeLedger) return
    const data = filteredEntries.map(e => ({
      'S.N': e.sn,
      'Date': e.date,
      'Shipper': e.shipper,
      'Consignee': e.consignee,
      'Commodity & Invoice': e.commodity,
      'Container & B/L No.': e.containerBl,
      'Status': e.statusBadge || '-',
      'Qty': e.qty,
      'Rate': e.rate,
      'Credit': e.credit,
      'Debit': e.debit
    }))
    
    // Add totals row
    data.push({
      'S.N': '' as any,
      'Date': '',
      'Shipper': '',
      'Consignee': '',
      'Commodity & Invoice': 'TOTALS',
      'Container & B/L No.': '',
      'Status': '',
      'Qty': aggregates.totalQty as any,
      'Rate': '' as any,
      'Credit': aggregates.totalCredit,
      'Debit': aggregates.totalDebit
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Statement")
    XLSX.writeFile(wb, `LEDGER_${activeLedger.name.replace(/\s+/g, '_')}_STATEMENT.xlsx`)
  }

  const formatCurrency = (amount: number) => {
    return `${activeLedger?.currency || 'USD'} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="ledger-page">
      {/* Official Print Header (Visible ONLY on Print) */}
      <div className="ledger-print-header">
        <div className="ledger-print-logo-wrap">
          <img src="/logo-png.png" alt="SKY ARIANA LTD Logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />
          <h2 className="fs-3 fw-bold text-primary m-0">SKY ARIANA LTD</h2>
        </div>
        <div className="ledger-print-info">
          <span className="text-xs font-bold text-slate-500 text-uppercase d-block mb-1">Official Transport & Financial Accounting Statement</span>
          <h1>{activeLedger?.name}</h1>
          {activeLedger?.localName && <h2>{activeLedger.localName}</h2>}
          <p>Generated: {new Date().toLocaleString()} | Prepared by: Ahsanullah Qureshi | +93 700 345 630 | INFO@SKYARIANA.COM</p>
        </div>
      </div>

      {/* Top Header Banner & Multi-Ledger Account Switcher */}
      <header className="ledger-header no-print">
        <div className="ledger-header__brand">
          <span className="ledger-eyebrow">PROFESSIONAL BUSINESS MANAGEMENT</span>
          <div className="d-flex align-items-center gap-2">
            <h1 className="ledger-title">Ledger Accounts</h1>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-0.5 text-xs fw-bold">
              Multi-Ledger Mode
            </span>
          </div>
        </div>

        {/* Account Selector Bar */}
        <div className="ledger-account-bar">
          <div className="d-flex align-items-center gap-2 flex-wrap flex-fill">
            <span className="text-xs text-slate-500 fw-bold text-uppercase me-1">Select Party Ledger:</span>
            <select
              value={activeLedgerId}
              onChange={e => setActiveLedgerId(e.target.value)}
              className="ledger-account-select"
            >
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>
                  🏢 {l.name} {l.localName ? `(${l.localName})` : ''} - {l.entries.length} Entries
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-1.5"
              onClick={() => setShowAddLedgerModal(true)}
            >
              <Plus size={14} /> + New Ledger Account
            </button>
          </div>
        </div>
      </header>

      {/* Active Ledger Summary Banner (Matching Screenshot Style) */}
      <div className="ledger-active-card border-0 shadow-sm rounded-4 p-3.5 mb-4 bg-white">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="ledger-avatar-badge rounded-3 p-2.5 bg-slate-900 text-white shadow-xs">
              <Building2 size={24} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <strong className="fs-5 text-slate-900 fw-bold">{activeLedger?.name}</strong>
                {activeLedger?.localName && (
                  <span className="text-amber-600 font-semibold fs-6" dir="rtl">
                    {activeLedger.localName}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 d-flex align-items-center gap-2">
                <span>Account ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{activeLedger?.id}</code></span>
                <span>• Currency: <strong>{activeLedger?.currency}</strong></span>
                <span>• Total Transactions: <strong>{activeLedger?.entries.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Aggregate KPI Badges (Credit / Debit / Balance) */}
          <div className="d-flex flex-wrap align-items-center gap-2 no-print">
            <div className="kpi-pill kpi-pill--credit">
              <span className="kpi-pill__label">CREDIT</span>
              <strong className="kpi-pill__value">${aggregates.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div className="kpi-pill kpi-pill--debit">
              <span className="kpi-pill__label">DEBIT</span>
              <strong className="kpi-pill__value">${aggregates.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div className="kpi-pill kpi-pill--balance">
              <span className="kpi-pill__label">BALANCE</span>
              <strong className="kpi-pill__value">${aggregates.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>

            <button
              type="button"
              className="btn btn-primary rounded-3 px-3.5 py-2 fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm"
              onClick={() => setShowAddEntryModal(true)}
            >
              <Plus size={16} /> New Entry
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar Controls (Search, Filter Tabs, Print, Export) */}
      <div className="ledger-toolbar-card bg-white border-0 shadow-xs rounded-4 p-3 mb-4 no-print">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Search Field */}
          <div className="position-relative flex-fill" style={{ maxWidth: '380px' }}>
            <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400" size={16} />
            <input
              type="text"
              className="form-control form-control-sm ps-5 pe-3 py-2 rounded-3 border-slate-200 text-sm shadow-none"
              placeholder="Search B/L, Container, Commodity, Shipper..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="btn btn-sm btn-link text-slate-400 position-absolute top-50 end-0 translate-middle-y me-2 p-0"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs (All / Invoices / Hawala / Surrendered B/L / Payments) */}
          <div className="d-flex flex-wrap align-items-center gap-1 bg-slate-100 p-1 rounded-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'invoices', label: 'Invoices' },
              { id: 'hawala', label: 'Hawala' },
              { id: 'surrendered', label: 'Surrendered B/L' },
              { id: 'payments', label: 'Payments' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-xs rounded-2 px-3 py-1.5 font-bold transition-all ${filterCategory === tab.id ? 'bg-white text-primary shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setFilterCategory(tab.id)}
                style={{ fontSize: '0.78rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Range Filters */}
          <div className="d-flex align-items-center gap-2 bg-slate-50 p-1.5 rounded-3 border border-slate-200">
            <div className="d-flex align-items-center gap-1">
              <Calendar size={14} className="text-slate-400 ms-1" />
              <input
                type="date"
                className="form-control form-control-sm border-0 bg-transparent shadow-none text-xs fw-bold p-1"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <span className="text-slate-300">|</span>
            <div className="d-flex align-items-center gap-1">
              <input
                type="date"
                className="form-control form-control-sm border-0 bg-transparent shadow-none text-xs fw-bold p-1"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="btn btn-sm btn-link text-danger p-0 ms-1"
                onClick={() => { setDateFrom(''); setDateTo('') }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons: Print / Export */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1.5 font-bold d-inline-flex align-items-center gap-1.5"
              onClick={handlePrint}
            >
              <Printer size={14} /> Print Statement
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success rounded-3 px-3 py-1.5 font-bold d-inline-flex align-items-center gap-1.5"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Statement Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 ledger-table">
            <thead className="table-light border-bottom text-uppercase text-slate-500 font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
              <tr>
                <th className="ps-4 py-3" style={{ width: '50px' }}>S.N</th>
                <th className="py-3" style={{ width: '110px' }}>DATE</th>
                <th className="py-3" style={{ width: '180px' }}>SHIPPER</th>
                <th className="py-3" style={{ width: '180px' }}>CONSIGNEE</th>
                <th className="py-3">COMMODITY & INVOICE</th>
                <th className="py-3">CONTAINER & B/L NO.</th>
                <th className="py-3 text-center" style={{ width: '70px' }}>QTY</th>
                <th className="py-3 text-end" style={{ width: '110px' }}>RATE ($)</th>
                <th className="py-3 text-end text-success" style={{ width: '120px' }}>CREDIT ($)</th>
                <th className="py-3 text-end text-rose-600" style={{ width: '120px' }}>DEBIT ($)</th>
                <th className="pe-4 py-3 text-end no-print" style={{ width: '70px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm border-0">
              {filteredEntries.map(entry => (
                <tr key={entry.id}>
                  <td className="ps-4 font-mono fw-bold text-slate-500">{entry.sn}</td>
                  <td className="font-mono text-slate-700">{entry.date}</td>
                  <td className="fw-bold text-slate-800 text-truncate" style={{ maxWidth: '180px' }} title={entry.shipper}>
                    {entry.shipper}
                  </td>
                  <td className="fw-bold text-slate-800 text-truncate" style={{ maxWidth: '180px' }} title={entry.consignee}>
                    {entry.consignee}
                  </td>
                  <td>
                    <div className="fw-bold text-slate-900">{entry.commodity}</div>
                    {entry.notes && <div className="text-xs text-slate-400">{entry.notes}</div>}
                  </td>
                  <td>
                    <div className="font-mono text-slate-700 text-xs font-semibold">{entry.containerBl}</div>
                    {entry.statusBadge && (
                      <span className={`badge border mt-1 px-2 py-0.5 rounded-pill text-2xs fw-bold ${
                        entry.statusBadge === 'Surrendered B/L' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        entry.statusBadge === 'Hawala' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        entry.statusBadge === 'Payment' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        🛡️ {entry.statusBadge}
                      </span>
                    )}
                  </td>
                  <td className="text-center font-mono font-bold">
                    {entry.qty !== '-' ? (
                      <span className="badge bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1">{entry.qty}</span>
                    ) : '-'}
                  </td>
                  <td className="text-end font-mono">
                    {typeof entry.rate === 'number' ? `$${entry.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="text-end font-mono fw-bold text-slate-900">
                    {entry.credit > 0 ? `$${entry.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="text-end font-mono fw-bold text-slate-900">
                    {entry.debit > 0 ? `$${entry.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="pe-4 text-end no-print">
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-danger border-0 rounded-circle p-1.5"
                      onClick={() => handleDeleteEntry(entry.id)}
                      title="Delete Entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-5 text-slate-400">
                    <div className="fs-3 mb-2">📒</div>
                    <strong className="text-slate-600 d-block mb-1">No ledger entries found</strong>
                    <span className="text-xs">Click "+ New Entry" to record transactions for this ledger.</span>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="table-light border-top-2 border-slate-300 font-mono fw-bold text-slate-900" style={{ fontSize: '0.85rem' }}>
              <tr>
                <td colSpan={6} className="ps-4 py-3 text-uppercase">
                  TOTALS ({filteredEntries.length} ENTRIES):
                </td>
                <td className="text-center py-3">
                  {aggregates.totalQty > 0 ? aggregates.totalQty : '-'}
                </td>
                <td className="text-end py-3">-</td>
                <td className="text-end py-3 text-slate-900">
                  ${aggregates.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-end py-3 text-slate-900">
                  ${aggregates.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Print Sign-off Footer (Visible ONLY on Print) */}
      <div className="ledger-print-footer">
        <div className="ledger-print-signature-line">
          PREPARED BY
        </div>
        <div className="ledger-print-signature-line">
          ACCOUNTANT SIGNATURE
        </div>
        <div className="ledger-print-signature-line">
          AUTHORIZED MANAGER
        </div>
      </div>

      {/* Modal: Create New Ledger Account */}
      {showAddLedgerModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-slate-900 text-white p-4">
                <h5 className="modal-title font-bold text-base d-flex align-items-center gap-2">
                  <span>🏢</span> Create New Party Ledger Account
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddLedgerModal(false)}></button>
              </div>
              <form onSubmit={handleCreateLedger}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-xs font-bold text-uppercase text-slate-600">Account / Party Name *</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. MIDA ENTERPRISE LTD"
                      required
                      value={newLedgerForm.name}
                      onChange={e => setNewLedgerForm({ ...newLedgerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-xs font-bold text-uppercase text-slate-600">Local Name (Pashto / Dari / Urdu)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. میدا انترپرایز لمیټډ"
                      dir="rtl"
                      value={newLedgerForm.localName}
                      onChange={e => setNewLedgerForm({ ...newLedgerForm, localName: e.target.value })}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Currency</label>
                      <select
                        className="form-select rounded-3"
                        value={newLedgerForm.currency}
                        onChange={e => setNewLedgerForm({ ...newLedgerForm, currency: e.target.value })}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="AFN">AFN (؋)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="AED">AED (د.إ)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Party Type</label>
                      <select
                        className="form-select rounded-3"
                        value={newLedgerForm.type}
                        onChange={e => setNewLedgerForm({ ...newLedgerForm, type: e.target.value as any })}
                      >
                        <option value="customer">Customer / Buyer</option>
                        <option value="supplier">Supplier / Shipper</option>
                        <option value="hawala">Hawala / Cash Dealer</option>
                        <option value="agent">Broker / Clearing Agent</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-slate-50 p-3 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary rounded-pill px-4 text-xs font-bold" onClick={() => setShowAddLedgerModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 text-xs font-bold">+ Create Ledger Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Entry */}
      {showAddEntryModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-slate-900 text-white p-4">
                <h5 className="modal-title font-bold text-base d-flex align-items-center gap-2">
                  <span>📝</span> Add Transaction Entry for {activeLedger?.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddEntryModal(false)}></button>
              </div>
              <form onSubmit={handleCreateEntry}>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Transaction Date *</label>
                      <input
                        type="date"
                        className="form-control rounded-3"
                        required
                        value={newEntryForm.date}
                        onChange={e => setNewEntryForm({ ...newEntryForm, date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Entry Category</label>
                      <select
                        className="form-select rounded-3"
                        value={newEntryForm.statusBadge}
                        onChange={e => setNewEntryForm({ ...newEntryForm, statusBadge: e.target.value })}
                      >
                        <option value="Invoice">Invoice / Sale</option>
                        <option value="Surrendered B/L">Surrendered B/L / Freight</option>
                        <option value="Hawala">Hawala / Cash Deposit</option>
                        <option value="Payment">Payment Received</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Container & B/L No.</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. RXTU4545407 (1X40 HC)"
                        value={newEntryForm.containerBl}
                        onChange={e => setNewEntryForm({ ...newEntryForm, containerBl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Shipper Name</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. NAJEB-AMIRI TRADING"
                        value={newEntryForm.shipper}
                        onChange={e => setNewEntryForm({ ...newEntryForm, shipper: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Consignee Name</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. MIDA ENTERPRISE LTD"
                        value={newEntryForm.consignee}
                        onChange={e => setNewEntryForm({ ...newEntryForm, consignee: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-xs font-bold text-uppercase text-slate-600">Commodity & Description</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. 2300 CNT GREEN RAISINS"
                      value={newEntryForm.commodity}
                      onChange={e => setNewEntryForm({ ...newEntryForm, commodity: e.target.value })}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Qty / Cartons</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        placeholder="1"
                        value={newEntryForm.qty}
                        onChange={e => setNewEntryForm({ ...newEntryForm, qty: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label text-xs font-bold text-uppercase text-slate-600">Rate ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control rounded-3"
                        placeholder="0.00"
                        value={newEntryForm.rate}
                        onChange={e => setNewEntryForm({ ...newEntryForm, rate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label text-xs font-bold text-uppercase text-emerald-700">Credit Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control rounded-3 border-emerald-300"
                        placeholder="0.00"
                        value={newEntryForm.credit}
                        onChange={e => setNewEntryForm({ ...newEntryForm, credit: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label text-xs font-bold text-uppercase text-rose-700">Debit Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control rounded-3 border-rose-300"
                        placeholder="0.00"
                        value={newEntryForm.debit}
                        onChange={e => setNewEntryForm({ ...newEntryForm, debit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-slate-50 p-3 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary rounded-pill px-4 text-xs font-bold" onClick={() => setShowAddEntryModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 text-xs font-bold">+ Save Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ledger
