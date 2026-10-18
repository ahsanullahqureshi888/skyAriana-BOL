import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, BellRing, Check, Download, Edit3, Eye, FileText, MapPin, Phone, Plus, RefreshCw, Search, Ship, Upload, Users, X } from 'lucide-react'
import { businessPartiesApi } from '../services/api'
import { useApp } from '../App'
import type { BusinessParty } from '../types'
import './business-parties.css'

type PartyType = 'shipper' | 'notify_party'

const EMPTY_FORM = {
  display_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_region: '',
  country: '',
  phone: '',
  email: '',
  trade_license_number: '',
  tax_identification_number: '',
  trn: '',
  registration_number: '',
  notes: '',
}

const displayAddress = (party: BusinessParty) => [party.address_line1, party.address_line2, party.city, party.state_region, party.country].filter(Boolean).join(', ')

const BusinessParties: React.FC<{ partyType: PartyType }> = ({ partyType }) => {
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<BusinessParty | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showUsage, setShowUsage] = useState<BusinessParty | null>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const can = (permission: string) => user?.role_name === 'Super Admin' || user?.role === 'Super Admin' || user?.permissions?.includes(permission)
  const canEdit = can('parties.edit')
  const canCreate = can('parties.create')
  const canArchive = can('parties.archive')
  const canRestore = can('parties.restore')
  const canImport = can('parties.import')
  const canExport = can('parties.export')

  const { data: parties = [], isLoading, isFetching } = useQuery<BusinessParty[]>({
    queryKey: ['business-parties', partyType, showArchived],
    queryFn: () => businessPartiesApi.list({ party_type: partyType, include_archived: showArchived }),
  })
  const { data: summary } = useQuery({
    queryKey: ['business-parties-summary', partyType],
    queryFn: () => businessPartiesApi.list({ party_type: partyType, include_archived: true }),
    select: (records: BusinessParty[]) => ({
      total: records.length,
      active: records.filter(record => !record.is_archived).length,
      archived: records.filter(record => record.is_archived).length,
      used: records.filter(record => (record.usage_count || 0) > 0).length,
    }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['business-parties'] })
    queryClient.invalidateQueries({ queryKey: ['business-parties-summary'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, party_type: partyType }
      if (editing) return businessPartiesApi.update(editing.id, payload)
      const duplicate = await businessPartiesApi.duplicateCheck(payload)
      if (duplicate.likelyDuplicate && duplicate.existing && !window.confirm(`A similar ${partyType === 'shipper' ? 'shipper' : 'notify party'} already exists: ${duplicate.existing.display_name}. Create another record anyway?`)) {
        throw new Error('Duplicate creation cancelled')
      }
      return businessPartiesApi.create(payload)
    },
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      setEditing(null)
      setNotice(editing ? 'Record updated.' : 'Record added to the directory.')
    },
    onError: (error: any) => setFormError(error?.response?.data?.detail || error.message || 'Could not save this record.'),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, restore }: { id: number; restore: boolean }) => restore ? businessPartiesApi.restore(id) : businessPartiesApi.archive(id),
    onSuccess: (_, variables) => {
      invalidate()
      setNotice(variables.restore ? 'Record restored.' : 'Record archived. Existing invoices retain their snapshots.')
    },
    onError: (error: any) => setNotice(error?.response?.data?.detail || 'Could not update record status.'),
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return parties
    return parties.filter(party => [party.display_name, party.canonical_name, party.address_line1, party.city, party.country, party.phone, party.email, party.trade_license_number, party.tax_identification_number, party.trn, ...(party.aliases || [])].filter(Boolean).join(' ').toLowerCase().includes(term))
  }, [parties, search])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setShowForm(true)
  }
  const openEdit = (party: BusinessParty) => {
    setEditing(party)
    setForm({
      display_name: party.display_name || '', address_line1: party.address_line1 || '', address_line2: party.address_line2 || '',
      city: party.city || '', state_region: party.state_region || '', country: party.country || '', phone: party.phone || '', email: party.email || '',
      trade_license_number: party.trade_license_number || '', tax_identification_number: party.tax_identification_number || '', trn: party.trn || '',
      registration_number: party.registration_number || '', notes: party.notes || '',
    })
    setFormError('')
    setShowForm(true)
  }
  const openUsage = async (party: BusinessParty) => {
    setShowUsage(party)
    setUsageData(null)
    try { setUsageData(await businessPartiesApi.getUsage(party.id)) } catch { setUsageData({ invoices: [], usageCount: 0 }) }
  }
  const importRegistry = async () => {
    setNotice('Importing reviewed PDF registry...')
    try {
      const report = await businessPartiesApi.import()
      invalidate()
      setNotice(`${report.shippersInserted} shippers and ${report.notifyPartiesInserted} notify parties added; ${report.duplicatesMerged} duplicate matches merged.`)
    } catch (error: any) { setNotice(error?.response?.data?.detail || 'Import failed and was rolled back.') }
  }
  const exportRegistry = async () => {
    try {
      const data = await businessPartiesApi.export(partyType)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${partyType === 'shipper' ? 'shippers-exporters' : 'notify-parties'}-registry.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error: any) { setNotice(error?.response?.data?.detail || 'Export failed.') }
  }

  const isShipper = partyType === 'shipper'
  const title = isShipper ? 'Shippers & Exporters' : 'Notify Parties'
  const subtitle = isShipper ? 'Manage saved shipper and exporter information used on invoices.' : 'Manage saved parties that receive shipment and invoice notifications.'
  const Icon = isShipper ? Ship : BellRing

  return <div className="business-parties-page animate-fade-in">
    <div className="business-parties-hero">
      <div>
        <span className="eyebrow">Business directory</span>
        <h2><Icon size={25} /> {title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="business-parties-actions">
        {canExport && <button className="secondary-action" onClick={exportRegistry}><Download size={16} /> Export</button>}
        {canImport && <button className="secondary-action" onClick={importRegistry}><Upload size={16} /> Import reviewed PDF</button>}
        {canCreate && <button className="primary-action" onClick={openAdd}><Plus size={17} /> Add {isShipper ? 'Shipper' : 'Notify Party'}</button>}
      </div>
    </div>

    <div className="business-party-stats">
      <div><span>Total records</span><strong>{summary?.total ?? '—'}</strong></div>
      <div><span>Active</span><strong>{summary?.active ?? '—'}</strong></div>
      <div><span>Archived</span><strong>{summary?.archived ?? '—'}</strong></div>
      <div><span>Used in invoices</span><strong>{summary?.used ?? '—'}</strong></div>
    </div>

    <div className="business-party-toolbar">
      <div className="business-party-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, alias, address, license, TRN, phone..." /></div>
      <label className="archive-filter"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} /> Include archived</label>
      {isFetching && <RefreshCw className="spin" size={16} />}
    </div>

    {notice && <div className="business-party-notice" role="status"><Check size={16} /> {notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}

    <section className="business-party-table-card">
      <div className="business-party-table-header"><div><span className="eyebrow">Saved registry</span><h3>{filtered.length} {isShipper ? 'shippers' : 'notify parties'}</h3></div><span className="source-badge"><FileText size={14} /> ALL-SHIPPERS--.pdf · 16 pages</span></div>
      {isLoading ? <div className="business-party-empty"><RefreshCw className="spin" size={28} /><p>Loading directory...</p></div> : filtered.length === 0 ? <div className="business-party-empty"><Users size={32} /><h3>No matching records</h3><p>Try another search or add a new directory record.</p></div> : <div className="business-party-table-wrap"><table className="business-party-table"><thead><tr><th>{isShipper ? 'Shipper / exporter' : 'Notify party'}</th><th>{isShipper ? 'Trade license / TIN' : 'TRN / registration'}</th><th>Address</th><th>Contact</th><th>Usage</th><th>Status</th><th className="actions-col">Actions</th></tr></thead><tbody>{filtered.map(party => <tr key={party.id} className={party.is_archived ? 'is-archived' : ''}>
        <td><div className="party-name">{party.display_name}</div>{party.aliases?.length ? <div className="party-meta">Alias: {party.aliases[0]}</div> : null}</td>
        <td><div className="party-mono">{isShipper ? (party.trade_license_number || '—') : (party.trn || party.registration_number || '—')}</div>{isShipper && party.tax_identification_number && <div className="party-meta">TIN {party.tax_identification_number}</div>}</td>
        <td><div className="party-address"><MapPin size={13} /> {displayAddress(party) || 'Not provided'}</div>{party.alternate_addresses?.length ? <div className="party-meta">+{party.alternate_addresses.length} alternate address{party.alternate_addresses.length > 1 ? 'es' : ''}</div> : null}</td>
        <td><div className="party-contact">{party.phone && <span><Phone size={12} />{party.phone}</span>}{party.email && <span>{party.email}</span>}{!party.phone && !party.email && <span>Not provided</span>}</div></td>
        <td><button className="usage-button" onClick={() => openUsage(party)}><strong>{party.usage_count || 0}</strong> invoice{party.usage_count === 1 ? '' : 's'}</button></td>
        <td><span className={`party-status ${party.is_archived ? 'archived' : 'active'}`}>{party.is_archived ? 'Archived' : 'Active'}</span></td>
        <td className="party-row-actions"><button title="View usage" onClick={() => openUsage(party)}><Eye size={15} /></button>{canEdit && <button title="Edit" onClick={() => openEdit(party)}><Edit3 size={15} /></button>}{canArchive && !party.is_archived && <button title="Archive" onClick={() => archiveMutation.mutate({ id: party.id, restore: false })}><Archive size={15} /></button>}{canRestore && party.is_archived && <button title="Restore" onClick={() => archiveMutation.mutate({ id: party.id, restore: true })}><ArchiveRestore size={15} /></button>}</td>
      </tr>)}</tbody></table></div>}
    </section>

    {showForm && <div className="business-party-modal-backdrop" onMouseDown={() => setShowForm(false)}><div className="business-party-modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
      <header><div><span className="eyebrow">{editing ? 'Edit saved record' : 'New directory record'}</span><h3>{editing ? 'Edit' : 'Add'} {isShipper ? 'shipper / exporter' : 'notify party'}</h3></div><button onClick={() => setShowForm(false)} aria-label="Close"><X size={18} /></button></header>
      <form onSubmit={event => { event.preventDefault(); setFormError(''); if (!form.display_name.trim()) { setFormError('Company name is required.'); return } saveMutation.mutate() }}>
        <div className="business-party-form-grid">
          <label className="full"><span>Company name *</span><input required value={form.display_name} onChange={event => setForm({ ...form, display_name: event.target.value })} /></label>
          <label className="full"><span>Address line 1</span><input value={form.address_line1} onChange={event => setForm({ ...form, address_line1: event.target.value })} /></label>
          <label><span>City</span><input value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></label><label><span>Province / emirate</span><input value={form.state_region} onChange={event => setForm({ ...form, state_region: event.target.value })} /></label><label><span>Country</span><input value={form.country} onChange={event => setForm({ ...form, country: event.target.value })} /></label>
          <label><span>Telephone</span><input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label><span>Email</span><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          {isShipper ? <><label><span>Trade-license number</span><input value={form.trade_license_number} onChange={event => setForm({ ...form, trade_license_number: event.target.value })} /></label><label><span>TIN</span><input value={form.tax_identification_number} onChange={event => setForm({ ...form, tax_identification_number: event.target.value })} /></label></> : <><label><span>TRN</span><input value={form.trn} onChange={event => setForm({ ...form, trn: event.target.value })} /></label><label><span>Registration / UC number</span><input value={form.registration_number} onChange={event => setForm({ ...form, registration_number: event.target.value })} /></label></>}
          <label className="full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Optional source or operational notes" /></label>
        </div>
        {formError && <div className="business-party-form-error">{formError}</div>}
        <footer><button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-action" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : <><Check size={16} /> Save record</>}</button></footer>
      </form>
    </div></div>}

    {showUsage && <div className="business-party-modal-backdrop" onMouseDown={() => setShowUsage(null)}><div className="business-party-modal usage-modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}><header><div><span className="eyebrow">Invoice usage</span><h3>{showUsage.display_name}</h3></div><button onClick={() => setShowUsage(null)} aria-label="Close"><X size={18} /></button></header><div className="usage-body"><p>This master record is referenced by <strong>{usageData?.usageCount ?? showUsage.usage_count ?? 0}</strong> invoice(s). Historical invoices keep their saved party snapshot when this record changes.</p>{usageData?.invoices?.length ? <ul>{usageData.invoices.map((invoice: any) => <li key={`${invoice.id}-${invoice.role}`}><FileText size={14} /><span>{invoice.invoiceNumber}</span><small>{invoice.role === 'shipper' ? 'Shipper / exporter' : 'Notify party'}</small></li>)}</ul> : <div className="usage-empty">No invoices have used this record yet.</div>}</div></div></div>}
  </div>
}

export default BusinessParties
