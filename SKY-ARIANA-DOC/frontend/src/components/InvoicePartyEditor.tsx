import React, { useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, ChevronDown, ExternalLink, FileEdit, LayoutGrid, MapPin, Search, Save, Sparkles, Trash2, UserRoundPlus, UsersRound, X } from 'lucide-react'
import type { BusinessParty, Customer, InvoiceParty } from '../types'
import { SEED_CONSIGNEES } from '../data/consigneesSeed'
import { SEED_SHIPPERS } from '../data/shippersSeed'
import { formatPartyFullText, getCleanPartyDisplayAddress, parsePartyText } from '../utils/invoiceParty'

type PartyKind = 'shipper' | 'consignee' | 'notify'
type Props = {
  kind: PartyKind
  title: string
  optional?: boolean
  value: InvoiceParty
  customers: Customer[]
  businessParties?: BusinessParty[]
  preferredPartyIds?: number[]
  selectedContactId?: number
  selectedPartyId?: number
  enabled?: boolean
  sameAsConsignee?: boolean
  useCompany?: boolean
  status?: 'saved' | 'unsaved' | 'saving' | 'error'
  errors?: Record<string, string>
  onChange: (value: InvoiceParty) => void
  onSelectContact: (id?: number) => void
  onSelectBusinessParty?: (id?: number) => void
  onSaveSection: () => void
  onCreateContact: () => void
  onUpdateContact: () => void
  onClear?: () => void
  onToggleEnabled?: (enabled: boolean) => void
  onToggleSame?: (enabled: boolean) => void
  onToggleCompany?: (enabled: boolean) => void
}

export const InvoicePartyEditor: React.FC<Props> = props => {
  const [editorMode, setEditorMode] = useState<'text' | 'fields'>('text')
  const allParties = React.useMemo(() => {
    const existingIds = new Set((props.businessParties || []).map(p => p.id))
    const mappedCustomers = (props.customers || [])
      .filter(cust => !existingIds.has(cust.id) && !existingIds.has(-cust.id))
      .map((cust): BusinessParty => ({
        id: -cust.id,
        party_type: cust.contact_type || 'consignee',
        canonical_name: cust.company_name,
        display_name: cust.company_name,
        normalized_name: cust.company_name.toLowerCase(),
        address_line1: cust.address,
        country: cust.country,
        phone: cust.phone,
        email: cust.email,
        tax_identification_number: cust.tax_number,
        contact_person: cust.contact_person,
        is_active: true,
        is_archived: false,
        created_at: cust.created_at || '',
        updated_at: cust.updated_at || '',
      }))

    const combined = [...(props.businessParties || []), ...mappedCustomers]
    const combinedNames = new Set(combined.map(p => (p.display_name || p.canonical_name || '').trim().toLowerCase()))

    const extraSeeds = [...SEED_CONSIGNEES, ...SEED_SHIPPERS].filter(
      seed => !combinedNames.has((seed.display_name || seed.canonical_name || '').trim().toLowerCase())
    )

    return [...combined, ...extraSeeds]
  }, [props.businessParties, props.customers])

  const preferredPartyOrder = React.useMemo(
    () => new Map((props.preferredPartyIds || []).map((id, index) => [id, index])),
    [props.preferredPartyIds]
  )

  const visibleBusinessParties = React.useMemo(() => {
    return allParties
      .filter(party => {
        if (!party.display_name && !party.canonical_name) return false

        const partyType = (party.party_type || '').toLowerCase()
        const roles = (party.roles || []).map(r => r.toLowerCase())

        const isShipper = partyType === 'shipper' || partyType === 'exporter' || partyType === 'seller' ||
          roles.includes('shipper') || roles.includes('exporter') || roles.includes('seller')

        const isConsignee = partyType === 'consignee' || partyType === 'importer' || partyType === 'buyer' || partyType === 'customer' ||
          roles.includes('consignee') || roles.includes('importer') || roles.includes('buyer') || roles.includes('customer')

        const isNotify = partyType === 'notify_party' || partyType === 'notify' || roles.includes('notify_party') || roles.includes('notify')

        if (props.kind === 'shipper') {
          if (isShipper) return true
          if (isConsignee || isNotify) return false
          return false
        }

        if (props.kind === 'consignee') {
          if (isShipper && !isConsignee) return false
          return true
        }

        if (props.kind === 'notify') {
          if (isShipper && !isNotify && !isConsignee) return false
          return true
        }

        return true
      })
      .sort((left, right) => {
        const leftOrder = preferredPartyOrder.has(left.id) ? preferredPartyOrder.get(left.id)! : Number.MAX_SAFE_INTEGER
        const rightOrder = preferredPartyOrder.has(right.id) ? preferredPartyOrder.get(right.id)! : Number.MAX_SAFE_INTEGER
        return leftOrder - rightOrder || (left.display_name || '').localeCompare(right.display_name || '')
      })
  }, [allParties, preferredPartyOrder, props.kind])

  const isLinked = props.kind === 'notify' && Boolean(props.sameAsConsignee)
  const selectedBusinessParty = visibleBusinessParties.find(party => party.id === props.selectedPartyId)
  const [partySearch, setPartySearch] = React.useState('')
  const [isPartySearchOpen, setIsPartySearchOpen] = React.useState(false)

  React.useEffect(() => {
    setPartySearch(selectedBusinessParty?.display_name || '')
  }, [props.selectedPartyId, selectedBusinessParty?.display_name])

  const normalizedPartySearch = partySearch.trim().toLowerCase()
  const filteredBusinessParties = visibleBusinessParties.filter(party => {
    if (!normalizedPartySearch) return true
    const searchable = [
      party.display_name,
      party.canonical_name,
      party.normalized_name,
      ...(party.aliases || []),
      party.address_line1,
      party.address_line2,
      party.city,
      party.state_region,
      party.country,
      party.phone,
      ...(party.alternate_phones || []),
      party.email,
      ...(party.alternate_emails || []),
      party.trade_license_number,
      party.tax_identification_number,
      party.trn,
      party.registration_number,
      party.gstin,
      party.iec,
      party.pan,
      party.fssai,
      party.tin,
      party.state_code,
      party.contact_person,
    ].filter(Boolean).join(' ').toLowerCase()
    return searchable.includes(normalizedPartySearch)
  }).slice(0, 50)

  const selectBusinessParty = (id?: number) => {
    const selected = visibleBusinessParties.find(party => party.id === id)
    setPartySearch(selected?.display_name || '')
    setIsPartySearchOpen(false)
    if (selected) {
      if (id && id < 0) {
        const realId = -id
        const customer = props.customers.find(c => c.id === realId)
        if (customer) {
          props.onChange({
            ...props.value,
            companyName: customer.company_name,
            contactPerson: customer.contact_person || '',
            addressLine1: customer.address || '',
            address: customer.address || '',
            country: customer.country || '',
            phone: customer.phone || '',
            email: customer.email || '',
            taxNumber: customer.tax_number || '',
            contactId: customer.id,
            partyId: id,
          })
        }
      } else {
        props.onChange({
          ...props.value,
          companyName: selected.display_name || selected.canonical_name,
          contactPerson: selected.contact_person || '',
          addressLine1: selected.address_line1 || '',
          addressLine2: selected.address_line2 || '',
          address: selected.address_line1 || '',
          city: selected.city || '',
          state: selected.state_region || '',
          postalCode: selected.postal_code || '',
          country: selected.country || '',
          phone: selected.phone || '',
          altPhone: selected.alternate_phones?.[0] || '',
          email: selected.email || '',
          taxNumber: selected.tax_identification_number || selected.trn || selected.pan || '',
          licenseNumber: selected.trade_license_number || selected.iec || '',
          gstin: selected.gstin || '',
          iec: selected.iec || '',
          pan: selected.pan || '',
          fssai: selected.fssai || '',
          trn: selected.trn || '',
          partyId: selected.id,
        })
      }
    } else {
      props.onChange({
        ...props.value,
        partyId: undefined,
        contactId: undefined,
      })
    }
    props.onSelectBusinessParty?.(id)
  }

  const handleSingleBoxChange = (text: string) => {
    const parsed = parsePartyText(text, props.value)
    props.onChange(parsed)
  }

  const handleCleanAndFormat = () => {
    const fullText = formatPartyFullText(props.value)
    const cleaned = parsePartyText(fullText, props.value)
    props.onChange(cleaned)
  }

  const handleFieldChange = (field: keyof InvoiceParty, val: string) => {
    props.onChange({
      ...props.value,
      [field]: val,
      ...(field === 'addressLine1' ? { address: val } : {})
    })
  }

  return (
    <details open data-party-kind={props.kind} className={`invoice-party-editor ${isLinked ? 'is-linked' : ''}`}>
      <summary>
        <span className="invoice-party-editor__icon"><Building2 size={17}/></span>
        <strong>{props.title}</strong>
        {props.optional && <span className="party-editor-optional">Optional</span>}
        <span className={`party-section-status ${props.status || 'unsaved'}`}>
          {props.status === 'saving' ? 'Saving...' : props.status === 'saved' ? 'Saved' : props.status === 'error' ? 'Save failed' : 'Unsaved'}
        </span>
        <ChevronDown className="invoice-party-editor__chevron" size={17}/>
      </summary>

      <div className="invoice-party-editor__body">
        <div className="party-editor-toolbar">
          <div className="party-directory-picker">
            <label htmlFor={`${props.kind}-business-party-search`}>
              <span>Search saved {props.kind === 'shipper' ? 'shipper / exporter' : props.kind === 'consignee' ? 'consignee / importer' : 'notify party'}</span>
            </label>
            <div className="party-directory-search-wrap">
              <Search size={16} aria-hidden="true" />
              <input
                id={`${props.kind}-business-party-search`}
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isPartySearchOpen && !isLinked}
                aria-controls={`${props.kind}-business-party-options`}
                disabled={isLinked}
                value={partySearch}
                placeholder={props.kind === 'consignee' ? 'Search name, address, GST, IEC, PAN, FSSAI, phone or email' : 'Search name, alias, address, license, TRN, phone or email'}
                onFocus={event => { setIsPartySearchOpen(true); event.currentTarget.select() }}
                onChange={event => { setPartySearch(event.target.value); setIsPartySearchOpen(true) }}
                onKeyDown={event => {
                  if (event.key === 'Escape') setIsPartySearchOpen(false)
                  if (event.key === 'Enter' && filteredBusinessParties[0]) { event.preventDefault(); selectBusinessParty(filteredBusinessParties[0].id) }
                }}
              />
              {partySearch && <button type="button" className="party-directory-clear" aria-label="Clear saved party selection" disabled={isLinked} onClick={() => selectBusinessParty(undefined)}><X size={15} /></button>}
            </div>
            {isPartySearchOpen && !isLinked && <div id={`${props.kind}-business-party-options`} className="party-directory-options" role="listbox">
              <button type="button" className="party-directory-custom" onClick={() => selectBusinessParty(undefined)}>Enter custom details manually</button>
              {filteredBusinessParties.length ? filteredBusinessParties.map(party => <button type="button" role="option" aria-selected={party.id === props.selectedPartyId} className={`party-directory-option ${party.id === props.selectedPartyId ? 'is-selected' : ''}`} key={party.id} onClick={() => selectBusinessParty(party.id)}>
                <strong>{party.display_name}</strong>
                <span>{[party.address_line1, party.city, party.state_region, party.country].filter(Boolean).join(', ') || 'Address not provided'}</span>
                {(party.gstin || party.iec || party.pan || party.fssai || party.trn || party.trade_license_number || party.phone || party.email) && <small>{[
                  party.gstin && `GST ${party.gstin}`,
                  party.iec && `IEC ${party.iec}`,
                  party.pan && `PAN ${party.pan}`,
                  party.fssai && `FSSAI ${party.fssai}`,
                  !party.gstin && !party.iec && (party.trn ? `TRN ${party.trn}` : party.trade_license_number ? `Licence ${party.trade_license_number}` : party.phone || party.email),
                ].filter(Boolean).slice(0, 2).join(' · ')}</small>}
              </button>) : <div className="party-directory-empty">No saved records match. Enter custom details manually.</div>}
            </div>}
          </div>

          {props.kind === 'shipper' && <label className="party-editor-check"><input type="checkbox" checked={Boolean(props.useCompany)} onChange={event=>props.onToggleCompany?.(event.target.checked)}/><span>Use Company Information as Shipper</span></label>}
          {props.kind === 'notify' && <label className="party-editor-check"><input type="checkbox" checked={Boolean(props.sameAsConsignee)} onChange={event=>props.onToggleSame?.(event.target.checked)}/><span>Notify Party is same as Consignee</span></label>}
        </div>

        {selectedBusinessParty && <div className="party-selected-card">
          <div className="party-selected-card__main">
            <span className="party-selected-card__icon"><Building2 size={18} /></span>
            <div><strong>{selectedBusinessParty.display_name}</strong><span><MapPin size={12} /> {[selectedBusinessParty.address_line1, selectedBusinessParty.city, selectedBusinessParty.state_region, selectedBusinessParty.postal_code, selectedBusinessParty.country].filter(Boolean).join(', ') || 'Address not provided'}</span></div>
          </div>
          <div className="party-identifier-badges">{[
            ['GST', selectedBusinessParty.gstin], ['IEC', selectedBusinessParty.iec], ['PAN', selectedBusinessParty.pan], ['FSSAI', selectedBusinessParty.fssai], ['TRN', selectedBusinessParty.trn],
          ].filter(([, value]) => value).map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}</div>
          {selectedBusinessParty.review_status === 'needs_review' && <div className="party-review-warning"><AlertTriangle size={14} /> Some source fields need review before compliance use.</div>}
          <div className="party-selected-card__actions"><button type="button" onClick={() => setIsPartySearchOpen(true)}>Change</button><a href={props.kind === 'consignee' ? `/consignees/${selectedBusinessParty.id}` : `/${props.kind === 'shipper' ? 'shippers' : 'notify-parties'}?focus=${selectedBusinessParty.id}`}><ExternalLink size={13} /> View master record</a><button type="button" onClick={() => selectBusinessParty(undefined)}>Clear</button></div>
        </div>}
        {isLinked && <div className="party-linked-banner"><UsersRound size={16}/><span>Linked to Consignee. Changes remain synchronized while enabled.</span></div>}
        
        {/* Editor Mode Header */}
        <div className="flex items-center justify-between mt-3 mb-2">
          <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setEditorMode('text')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${editorMode === 'text' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileEdit size={13} />
              <span>Full Text &amp; Auto-Parse</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('fields')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${editorMode === 'fields' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LayoutGrid size={13} />
              <span>Detailed Fields</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCleanAndFormat}
            className="flex items-center gap-1 text-2xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            title="Auto-detect and format company, address, GST, IEC, phone and email"
          >
            <Sparkles size={12} />
            <span>Auto-Clean &amp; Deduplicate</span>
          </button>
        </div>

        {editorMode === 'text' ? (
          <div className="party-single-editor-box mb-3">
            <label className="wide block w-full">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                {props.title} Full Details (Auto-Parsed &amp; Deduplicated) {props.kind !== 'notify' ? '*' : ''}
              </span>
              <textarea
                disabled={isLinked}
                rows={7}
                className="w-full p-3 text-xs md:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white leading-relaxed text-slate-800 shadow-sm"
                style={{ whiteSpace: 'pre-wrap', resize: 'vertical' }}
                value={formatPartyFullText(props.value)}
                placeholder={`Paste or type complete ${props.kind === 'shipper' ? 'Shipper' : props.kind === 'consignee' ? 'Consignee / Buyer' : 'Notify Party'} details here...\n\nExample:\nHALWAI SONS\nF-39, APMC MARKET-1, PHASE-2, SECTOR-19\nVASHI, NAVI MUMBAI, MAHARASHTRA, INDIA\nGST: 27AAAP... | IEC: 039... | TEL: +91...`}
                onChange={(e) => handleSingleBoxChange(e.target.value)}
              />
              {(props.errors?.companyName || props.errors?.addressLine1) && (
                <small className="party-field-error block text-xs font-semibold text-rose-600 mt-1">
                  {props.errors?.companyName || props.errors?.addressLine1}
                </small>
              )}
            </label>
          </div>
        ) : (
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 mb-3 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Company / Legal Name *</label>
                <input
                  type="text"
                  value={props.value.companyName || ''}
                  onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  placeholder="e.g. RICH VALLEY DRYFRUIT PVT LTD"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Contact Person / Attn</label>
                <input
                  type="text"
                  value={props.value.contactPerson || ''}
                  onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                  placeholder="e.g. Mr. Sanket Khatri"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Clean Street Address (Without duplicated company name)</label>
              <textarea
                rows={2}
                value={getCleanPartyDisplayAddress(props.value)}
                onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                placeholder="Building, street, district..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={props.value.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">State / Province</label>
                <input
                  type="text"
                  value={props.value.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={props.value.postalCode || ''}
                  onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  placeholder="Postal Code"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Country</label>
                <input
                  type="text"
                  value={props.value.country || ''}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  placeholder="Country"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Phone / Mobile</label>
                <input
                  type="text"
                  value={props.value.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={props.value.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="info@company.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">GSTIN / VAT / TRN</label>
                <input
                  type="text"
                  value={props.value.gstin || props.value.trn || props.value.taxNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    props.onChange({
                      ...props.value,
                      gstin: val,
                      trn: val,
                      taxNumber: val,
                    })
                  }}
                  placeholder="GSTIN or TRN"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">IEC / Licence</label>
                <input
                  type="text"
                  value={props.value.iec || props.value.licenseNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    props.onChange({
                      ...props.value,
                      iec: val,
                      licenseNumber: val,
                    })
                  }}
                  placeholder="IEC / Import Code"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>

            {props.kind === 'consignee' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={props.value.pan || ''}
                    onChange={(e) => handleFieldChange('pan', e.target.value)}
                    placeholder="PAN"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">FSSAI Licence</label>
                  <input
                    type="text"
                    value={props.value.fssai || ''}
                    onChange={(e) => handleFieldChange('fssai', e.target.value)}
                    placeholder="FSSAI"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="party-editor-actions">
          <button type="button" className="party-section-save" onClick={props.onSaveSection}>
            <Save size={14}/> Save {props.kind === 'shipper' ? 'Shipper' : props.kind === 'consignee' ? 'Consignee' : 'Notify Party'} Details
          </button>
          <button type="button" disabled={isLinked} onClick={props.onCreateContact}>
            <UserRoundPlus size={14}/> Save to Directory
          </button>
          <button type="button" disabled={isLinked || (!props.selectedPartyId && !props.selectedContactId && !props.value.partyId && !props.value.contactId)} onClick={props.onUpdateContact}>
            <CheckCircle2 size={14}/> Save Changes to Directory
          </button>
          {props.kind === 'notify' && (
            <button type="button" className="party-clear-button" onClick={props.onClear}>
              <Trash2 size={14}/> Clear Notify Party
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
