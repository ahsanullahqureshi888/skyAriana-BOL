import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, customersApi, backupApi } from '../services/api'
import { useApp } from '../App'
import {
  AlertTriangle,
  Clock3,
  Copy,
  DollarSign,
  Download,
  Edit3,
  Eye,
  FileText,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  SearchX,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'

const formatDate = (value: unknown) => {
  const raw = String(value || '').slice(0, 10)
  const parts = raw.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
}

const formatMoney = (value: unknown, currency = 'USD') => {
  const amount = Number(value || 0)
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
  return `${currency || 'USD'} ${formatted}`
}

const displayStatus = (value: unknown) => {
  const status = String(value || 'draft')
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const statusClass = (value: unknown) => {
  const status = String(value || 'draft')
  return ['paid', 'unpaid', 'partial', 'overdue', 'draft', 'cancelled'].includes(status) ? status : 'draft'
}

const isInvoiceOverdue = (invoice: any) => {
  const dueDate = String(invoice?.due_date || '').slice(0, 10)
  const status = String(invoice?.status || '').toLowerCase()
  const hasOutstandingBalance = Number(invoice?.remaining_balance || 0) > 0
  const today = new Date().toISOString().slice(0, 10)

  return Boolean(
    dueDate
    && dueDate < today
    && hasOutstandingBalance
    && !['paid', 'cancelled'].includes(status),
  )
}

const formatAggregateMoney = (rows: any[], field: string) => {
  const totals = rows.reduce<Map<string, number>>((aggregate, row) => {
    const currency = String(row?.currency || 'USD')
    const amount = Number(row?.[field] || 0)
    aggregate.set(currency, (aggregate.get(currency) || 0) + (Number.isFinite(amount) ? amount : 0))
    return aggregate
  }, new Map<string, number>())

  if (totals.size === 0) return formatMoney(0)
  if (totals.size > 2) return `${totals.size} currencies`

  return Array.from(totals.entries())
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' + ')
}

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') as { role?: string; role_name?: string; permissions?: string[] }
  } catch {
    return {}
  }
}

const InvoiceList: React.FC = () => {
  const { t } = useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [openActionId, setOpenActionId] = useState<number | null>(null)
  const [deleteInvoice, setDeleteInvoice] = useState<any>(null)

  const [payingInvoice, setPayingInvoice] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const storedUser = readStoredUser()
  const isSuperAdmin = storedUser.role_name === 'Super Admin' || storedUser.role === 'Super Admin'
  const can = (permission: string) => isSuperAdmin || !Array.isArray(storedUser.permissions) || storedUser.permissions.includes(permission)
  const filtersActive = Boolean(search || statusFilter || customerFilter)
  const activeFilterCount = [search, statusFilter, customerFilter].filter(Boolean).length

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionId(null)
        setDeleteInvoice(null)
        setPayingInvoice(null)
      }
    }
    window.addEventListener('keydown', closeMenus)
    return () => window.removeEventListener('keydown', closeMenus)
  }, [])

  useEffect(() => {
    const closeActionMenu = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('.invoice-action-menu-wrap')) return
      setOpenActionId(null)
    }
    window.addEventListener('pointerdown', closeActionMenu)
    return () => window.removeEventListener('pointerdown', closeActionMenu)
  }, [])

  const {
    data: invoices,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['invoices', debouncedSearch, statusFilter, customerFilter],
    queryFn: () => invoicesApi.list({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      customer_id: customerFilter ? parseInt(customerFilter) : undefined,
    }),
    placeholderData: previousData => previousData,
  })

  const { data: allInvoices, isLoading: summaryLoading } = useQuery({
    queryKey: ['invoices', 'workspace-summary'],
    queryFn: () => invoicesApi.list({}),
    staleTime: 30_000,
  })

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  })

  const visibleInvoices = useMemo(() => {
    let list = Array.isArray(invoices) ? invoices : []
    if (dateFrom) list = list.filter((inv: any) => inv.date >= dateFrom)
    if (dateTo) list = list.filter((inv: any) => inv.date <= dateTo)
    return list
  }, [invoices, dateFrom, dateTo])
  const summaryInvoices = Array.isArray(allInvoices) ? allInvoices : visibleInvoices
  const invoiceSummary = useMemo(() => ({
    count: summaryInvoices.length,
    totalValue: formatAggregateMoney(summaryInvoices, 'grand_total'),
    outstanding: formatAggregateMoney(summaryInvoices, 'remaining_balance'),
    overdue: summaryInvoices.filter(isInvoiceOverdue).length,
  }), [summaryInvoices])

  const deleteMutation = useMutation({
    mutationFn: invoicesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
      setDeleteInvoice(null)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: invoicesApi.duplicate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
      setOpenActionId(null)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => invoicesApi.recordPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
      setPayingInvoice(null)
      setPaymentAmount('')
      setPaymentRef('')
      setPaymentNotes('')
    },
  })

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCustomerFilter('')
  }

  const handleOpenPayment = (invoice: any) => {
    setOpenActionId(null)
    setPayingInvoice(invoice)
    setPaymentAmount(String(invoice.remaining_balance ?? '0'))
  }

  const handleRecordPaymentSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!payingInvoice) return
    paymentMutation.mutate({
      id: payingInvoice.id,
      data: {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: paymentRef || undefined,
        notes: paymentNotes || undefined,
      },
    })
  }

  const handleDownloadPdf = (id: number) => {
    const token = localStorage.getItem('token') || ''
    window.open(invoicesApi.getPdfUrl(id, token), '_blank', 'noopener,noreferrer')
    setOpenActionId(null)
  }

  const emptyState = (
    <div className="invoice-empty-state">
      <div className="invoice-empty-state__icon"><SearchX size={22} /></div>
      <strong>{filtersActive ? 'No matches found' : 'No invoices yet'}</strong>
      <span>
        {filtersActive
          ? 'Try a different search or reset the active filters.'
          : 'Create your first commercial invoice to start tracking receivables.'}
      </span>
      {filtersActive
        ? <button type="button" onClick={clearFilters}><RefreshCcw size={13} /> Reset filters</button>
        : can('invoices.create') && <Link to="/invoices/create"><Plus size={13} /> Create first invoice</Link>}
    </div>
  )

  const renderActions = (invoice: any) => {
    const isOpen = openActionId === invoice.id
    return (
      <div className="invoice-row-actions">
        <div className="invoice-row-actions__primary">
          {can('invoices.view') && <Link to={`/invoices/${invoice.id}`} className="icon-button" title="View invoice" aria-label={`View ${invoice.invoice_number}`}><Eye size={16} /></Link>}
          {can('invoices.edit') && <Link to={`/invoices/${invoice.id}/edit`} className="icon-button" title="Edit invoice" aria-label={`Edit ${invoice.invoice_number}`}><Edit3 size={16} /></Link>}
        </div>
        <div className="invoice-action-menu-wrap">
          <button
            type="button"
            className={`icon-button invoice-action-menu-trigger ${isOpen ? 'is-open' : ''}`}
            title="More invoice actions"
            aria-label={`More actions for ${invoice.invoice_number}`}
            aria-expanded={isOpen}
            onClick={() => setOpenActionId(isOpen ? null : invoice.id)}
          >
            <MoreHorizontal size={17} />
          </button>
          {isOpen && (
            <div className="invoice-action-menu" role="menu">
              {can('invoices.duplicate') && <button type="button" role="menuitem" onClick={() => duplicateMutation.mutate(invoice.id)}><Copy size={14} /> Duplicate</button>}
              {invoice.status !== 'paid' && can('payments.create') && <button type="button" role="menuitem" onClick={() => handleOpenPayment(invoice)}><DollarSign size={14} /> Record payment</button>}
              {can('invoices.print') && <button type="button" role="menuitem" onClick={() => { setOpenActionId(null); navigate(`/invoice/${invoice.id}/print`) }}><Printer size={14} /> Print</button>}
              {can('invoices.download') && <button type="button" role="menuitem" onClick={() => handleDownloadPdf(invoice.id)}><Download size={14} /> Download PDF</button>}
              {can('invoices.delete') && <button type="button" role="menuitem" className="is-danger" onClick={() => { setOpenActionId(null); setDeleteInvoice(invoice) }}><Trash2 size={14} /> Delete invoice</button>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="invoice-list-page">
      <div className="invoice-list-header page-heading">
        <div className="invoice-list-header__copy">
          <span className="page-eyebrow">WORKSPACE</span>
          <h1>{t.invoices}</h1>
          <p>Create, search, and manage your commercial invoices.</p>
        </div>
        <div className="invoice-list-header__actions no-print">
          {can('invoices.export') && <a href={backupApi.exportExcelUrl()} className="button button--secondary" download><FileSpreadsheet size={16} /> Export Excel</a>}
          {can('invoices.create') && <Link to="/invoices/create" className="button button--primary"><Plus size={16} /> {t.create_invoice}</Link>}
        </div>
      </div>

      <section className="invoice-summary-grid" aria-label="Invoice financial overview">
        <article className="invoice-summary-card invoice-summary-card--blue">
          <div className="invoice-summary-card__icon"><FileText size={19} /></div>
          <div>
            <span>Total invoices</span>
            {summaryLoading ? <i className="invoice-summary-skeleton" aria-label="Loading total invoices" /> : <strong>{invoiceSummary.count}</strong>}
            <small>All saved records</small>
          </div>
        </article>
        <article className="invoice-summary-card invoice-summary-card--indigo">
          <div className="invoice-summary-card__icon"><WalletCards size={19} /></div>
          <div>
            <span>Invoice value</span>
            {summaryLoading ? <i className="invoice-summary-skeleton" aria-label="Loading invoice value" /> : <strong>{invoiceSummary.totalValue}</strong>}
            <small>Gross commercial value</small>
          </div>
        </article>
        <article className="invoice-summary-card invoice-summary-card--amber">
          <div className="invoice-summary-card__icon"><DollarSign size={19} /></div>
          <div>
            <span>Outstanding</span>
            {summaryLoading ? <i className="invoice-summary-skeleton" aria-label="Loading outstanding value" /> : <strong>{invoiceSummary.outstanding}</strong>}
            <small>Open receivables</small>
          </div>
        </article>
        <article className="invoice-summary-card invoice-summary-card--rose">
          <div className="invoice-summary-card__icon"><AlertTriangle size={19} /></div>
          <div>
            <span>Needs attention</span>
            {summaryLoading ? <i className="invoice-summary-skeleton" aria-label="Loading overdue invoices" /> : <strong>{invoiceSummary.overdue}</strong>}
            <small>Past due with balance</small>
          </div>
        </article>
      </section>

      <section className="invoice-filter-card glass-panel no-print" aria-label="Invoice filters">
        <div className="invoice-filter-grid">
          <div className="invoice-search-field">
            <Search className="invoice-search-field__icon" size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search invoices"
              placeholder={t.search}
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => { if (event.key === 'Escape') setSearch('') }}
            />
            {search && <button type="button" className="invoice-search-field__clear" onClick={() => setSearch('')} aria-label="Clear invoice search"><X size={15} /></button>}
          </div>

          <div className="invoice-filter-field">
            <span>{t.consignee}</span>
            <select
              className="invoice-filter-select"
              aria-label="Filter by customer"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="">All customers</option>
              {customers?.map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.company_name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100/50 rounded-lg p-1 border border-slate-200">
            <input
              type="date"
              className="bg-transparent border-0 text-xs font-semibold text-slate-700 px-2 py-1 outline-none"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="Start Date"
            />
            <span className="text-slate-300">|</span>
            <input
              type="date"
              className="bg-transparent border-0 text-xs font-semibold text-slate-700 px-2 py-1 outline-none"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="End Date"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="text-slate-400 hover:text-rose-500 p-1"
                onClick={() => { setDateFrom(''); setDateTo('') }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label className="invoice-filter-field invoice-filter-field--status">
            <span>{t.status}</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by invoice status">
              <option value="">{t.all}</option>
              <option value="draft">Draft</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <button type="button" className="invoice-clear-filters" onClick={clearFilters} disabled={!filtersActive}>
            <RefreshCcw size={14} /> Reset <span>{activeFilterCount}</span>
          </button>
        </div>
      </section>

      <section className="invoice-table-card glass-panel" aria-label="Invoices">
        <div className="invoice-results-bar" aria-live="polite">
          <div><strong>{visibleInvoices.length}</strong> invoice{visibleInvoices.length === 1 ? '' : 's'} found</div>
          <span className={isFetching && !isLoading ? 'is-updating' : ''}>
            {isFetching && !isLoading
              ? <><RefreshCcw size={11} /> Updating</>
              : filtersActive
                ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`
                : 'All invoices'}
          </span>
        </div>
        {isLoading ? (
          <div className="invoice-list-state"><div className="invoice-state-spinner" /><strong>Loading invoices…</strong><span>Fetching the latest commercial records.</span></div>
        ) : isError ? (
          <div className="invoice-list-state invoice-list-state--error">
            <div className="invoice-list-state__icon"><AlertTriangle size={21} /></div>
            <strong>Invoices could not be loaded</strong>
            <span>Check the connection and try again.</span>
            <button type="button" onClick={() => refetch()}><RefreshCcw size={13} /> Try again</button>
          </div>
        ) : (
          <>
            <div className="custom-table-container invoice-table-container">
              <table className="custom-table invoice-table--polished">
                <thead><tr><th>Invoice number</th><th>Customer</th><th>Invoice date</th><th>Due date</th><th>Grand total</th><th>Outstanding</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {visibleInvoices.map((invoice: any) => (
                    <tr key={invoice.id} className={isInvoiceOverdue(invoice) ? 'is-overdue' : undefined}>
                      <td><Link to={`/invoices/${invoice.id}`} className="invoice-number-link">{invoice.invoice_number}</Link></td>
                      <td><span className="invoice-customer-name">{invoice.customer_name || '—'}</span></td>
                      <td><time dateTime={invoice.invoice_date}>{formatDate(invoice.invoice_date)}</time></td>
                      <td>
                        <div className={`invoice-due-date ${isInvoiceOverdue(invoice) ? 'is-overdue' : ''}`}>
                          <time dateTime={invoice.due_date}>{formatDate(invoice.due_date)}</time>
                          {isInvoiceOverdue(invoice) && <span><Clock3 size={10} /> Overdue</span>}
                        </div>
                      </td>
                      <td><strong className="invoice-money">{formatMoney(invoice.grand_total, invoice.currency)}</strong></td>
                      <td><strong className="invoice-money invoice-money--outstanding">{formatMoney(invoice.remaining_balance, invoice.currency)}</strong></td>
                      <td><span className={`status-badge status-badge--${statusClass(invoice.status)}`}>{displayStatus(invoice.status)}</span></td>
                      <td>{renderActions(invoice)}</td>
                    </tr>
                  ))}
                  {visibleInvoices.length === 0 && <tr><td colSpan={8}>{emptyState}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="invoice-mobile-list">
              {visibleInvoices.map((invoice: any) => (
                <article key={invoice.id} className={`invoice-mobile-card ${isInvoiceOverdue(invoice) ? 'is-overdue' : ''}`}>
                  <div className="invoice-mobile-card__top"><div><span className="invoice-mobile-card__eyebrow">Invoice</span><Link to={`/invoices/${invoice.id}`} className="invoice-number-link">{invoice.invoice_number}</Link></div><span className={`status-badge status-badge--${statusClass(invoice.status)}`}>{displayStatus(invoice.status)}</span></div>
                  <strong className="invoice-mobile-card__customer">{invoice.customer_name || '—'}</strong>
                  <div className="invoice-mobile-card__facts"><span><small>Invoice date</small><b>{formatDate(invoice.invoice_date)}</b></span><span className={isInvoiceOverdue(invoice) ? 'is-overdue' : ''}><small>Due date</small><b>{formatDate(invoice.due_date)}</b>{isInvoiceOverdue(invoice) && <em>Overdue</em>}</span><span><small>Outstanding</small><b className="invoice-money--outstanding">{formatMoney(invoice.remaining_balance, invoice.currency)}</b></span></div>
                  <div className="invoice-mobile-card__footer"><span className="invoice-mobile-card__total"><small>Grand total</small><strong>{formatMoney(invoice.grand_total, invoice.currency)}</strong></span>{renderActions(invoice)}</div>
                </article>
              ))}
              {visibleInvoices.length === 0 && emptyState}
            </div>
          </>
        )}
      </section>

      {deleteInvoice && (
        <div className="invoice-modal-backdrop" role="presentation">
          <div className="invoice-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title">
            <div className="invoice-confirm-modal__icon"><Trash2 size={20} /></div>
            <h2 id="delete-invoice-title">Delete invoice?</h2>
            <p>This will permanently remove <strong>{deleteInvoice.invoice_number}</strong> and its saved details.</p>
            <div className="invoice-confirm-modal__actions"><button type="button" className="button button--secondary" onClick={() => setDeleteInvoice(null)}>Cancel</button><button type="button" className="button button--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteInvoice.id)}>{deleteMutation.isPending ? 'Deleting…' : 'Delete invoice'}</button></div>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div className="invoice-modal-backdrop" role="presentation">
          <div className="glass-panel invoice-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title" dir="ltr">
            <div className="invoice-payment-modal__header"><h3 id="payment-title"><DollarSign size={20} /> Record payment</h3><button type="button" onClick={() => setPayingInvoice(null)} className="icon-button" aria-label="Close payment dialog"><X size={18} /></button></div>
            <form onSubmit={handleRecordPaymentSubmit} className="invoice-payment-modal__form">
              <div className="invoice-payment-modal__invoice"><span>Invoice number</span><strong>{payingInvoice.invoice_number}</strong></div>
              <div className="grid grid-cols-2 gap-4"><label><span>Payment amount ({payingInvoice.currency})</span><input type="number" step="0.01" required value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} className="control w-full" /></label><label><span>Payment date</span><input type="date" required value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className="control w-full" /></label></div>
              <label><span>Payment method</span><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="control w-full"><option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Other</option></select></label>
              <label><span>Reference number / transaction ID</span><input type="text" value={paymentRef} onChange={event => setPaymentRef(event.target.value)} placeholder="e.g. TXN-90812" className="control w-full" /></label>
              <label><span>Notes</span><textarea value={paymentNotes} onChange={event => setPaymentNotes(event.target.value)} rows={2} className="control w-full" /></label>
              <div className="invoice-payment-modal__actions"><button type="button" onClick={() => setPayingInvoice(null)} className="button button--secondary">Cancel</button><button type="submit" disabled={paymentMutation.isPending} className="button button--primary">{paymentMutation.isPending ? 'Saving…' : 'Record payment'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceList
