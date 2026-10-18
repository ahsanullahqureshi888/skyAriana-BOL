import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, Download, Filter, History, RefreshCw, Search, X } from 'lucide-react'
import { dashboardApi } from '../services/api'
import AuditEventCard from '../components/AuditEventCard'
import {
  auditDateGroup,
  filterAuditEvents,
  getActionOptions,
  getActorOptions,
  getModuleOptions,
  normalizeAuditEvent,
  type NormalizedAuditEvent,
} from '../utils/auditEvents'

type ActivityFilters = {
  search: string
  actor: string
  module: string
  action: string
  severity: string
  status: string
  ip: string
  from: string
  to: string
}

const EMPTY_FILTERS: ActivityFilters = { search: '', actor: '', module: '', action: '', severity: '', status: '', ip: '', from: '', to: '' }

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') as { role?: string; role_name?: string; permissions?: string[] }
  } catch {
    return {}
  }
}

const Logs: React.FC = () => {
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const storedUser = readStoredUser()
  const isSuperAdmin = storedUser.role_name === 'Super Admin' || storedUser.role === 'Super Admin'
  const canExport = isSuperAdmin || Boolean(storedUser.permissions?.includes('activity.export'))

  const query = useQuery({
    queryKey: ['activity-history', filters.search],
    queryFn: () => dashboardApi.getLogs({ search: filters.search || undefined }),
  })

  const events = useMemo<NormalizedAuditEvent[]>(() => {
    const response = query.data as unknown
    const rows = Array.isArray(response) ? response : Array.isArray((response as { items?: unknown[] } | null)?.items) ? (response as { items: unknown[] }).items : []
    return rows.map(normalizeAuditEvent).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [query.data])

  const filteredEvents = useMemo(() => filterAuditEvents(events, filters), [events, filters])
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize))
  const visibleEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize)
  const groupedEvents = useMemo(() => visibleEvents.reduce<Record<string, NormalizedAuditEvent[]>>((groups, event) => {
    const group = auditDateGroup(event.createdAt)
    groups[group] = [...(groups[group] || []), event]
    return groups
  }, {}), [visibleEvents])
  const actionOptions = getActionOptions(events)
  const moduleOptions = getModuleOptions(events)
  const actorOptions = getActorOptions(events)
  const hasFilters = Object.values(filters).some(Boolean)

  const updateFilter = (key: keyof ActivityFilters, value: string) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters(EMPTY_FILTERS)
  }

  const exportActivity = () => {
    const header = ['Time', 'Actor', 'Action', 'Description', 'Module', 'Target', 'IP address', 'Status']
    const rows = filteredEvents.map((event) => [event.createdAt, event.actorName, event.actionTitle, event.description, event.moduleLabel, event.targetLabel, event.ipAddress, event.status])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `sky-ariana-activity-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="activity-page animate-fade-in">
      <div className="activity-page__header">
        <div><span className="um-eyebrow">Audit center</span><h1><History size={27} /> Activity history</h1><p>Review the people, systems, and security events that changed your workspace.</p></div>
        <div className="activity-page__actions"><span className="activity-count">{filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}</span>{canExport && <button type="button" className="um-button um-button--secondary" onClick={exportActivity}><Download size={15} /> Export CSV</button>}</div>
      </div>

      <section className="activity-filters" aria-label="Activity filters">
        <div className="activity-filter-search"><Search size={17} /><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search actor, action, target, IP…" aria-label="Search activity" /></div>
        <div className="activity-filter-grid">
          <select value={filters.actor} onChange={(event) => updateFilter('actor', event.target.value)} aria-label="Filter by actor"><option value="">All actors</option>{actorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={filters.module} onChange={(event) => updateFilter('module', event.target.value)} aria-label="Filter by module"><option value="">All modules</option>{moduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} aria-label="Filter by action"><option value="">All actions</option>{actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)} aria-label="Filter by severity"><option value="">All severity</option><option value="success">Success</option><option value="info">Informational</option><option value="warning">Warning</option><option value="danger">Critical</option></select>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} aria-label="Filter by result"><option value="">All results</option><option value="success">Successful only</option><option value="failed">Failed only</option><option value="warning">Warnings only</option></select>
          <input value={filters.ip} onChange={(event) => updateFilter('ip', event.target.value)} placeholder="IP address" aria-label="Filter by IP address" />
          <label><span>From</span><input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label>
          <label><span>To</span><input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label>
        </div>
        <div className="activity-filters__footer"><span><Filter size={14} /> {hasFilters ? 'Filters are active' : 'Showing the latest 100 recorded events'}</span>{hasFilters && <button type="button" className="um-reset" onClick={clearFilters}><X size={13} /> Clear filters</button>}</div>
      </section>

      {query.isLoading ? <div className="activity-skeleton-list" aria-label="Loading activity"><div /><div /><div /></div> : query.isError ? <div className="activity-state activity-state--error"><AlertCircle size={26} /><strong>Activity history is unavailable</strong><span>{query.error instanceof Error ? query.error.message : 'The audit service did not return a response.'}</span><button type="button" className="um-button um-button--secondary" onClick={() => query.refetch()}><RefreshCw size={14} /> Try again</button></div> : visibleEvents.length === 0 ? <div className="activity-state"><History size={28} /><strong>{hasFilters ? 'No matching activity' : 'No activity recorded yet'}</strong><span>{hasFilters ? 'Clear a filter or broaden the date range to see more events.' : 'New workspace and security actions will appear here.'}</span>{hasFilters && <button type="button" className="um-button um-button--secondary" onClick={clearFilters}>Clear filters</button>}</div> : <div className="activity-timeline">
        {Object.entries(groupedEvents).map(([group, groupEvents]) => <section className="activity-day" key={group}><div className="activity-day__heading"><CalendarDays size={15} /><h2>{group}</h2><span>{groupEvents.length} event{groupEvents.length === 1 ? '' : 's'}</span></div><div className="activity-day__events">{groupEvents.map((event) => <AuditEventCard key={event.id} event={event} expanded={expandedId === event.id} onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)} canViewRaw={canExport} />)}</div></section>)}
      </div>}

      {filteredEvents.length > 0 && <div className="activity-pagination"><span>Page {page} of {totalPages} · {filteredEvents.length} total</span><div><button type="button" className="um-button um-button--secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" className="um-button um-button--secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button></div></div>}
    </div>
  )
}

export default Logs
