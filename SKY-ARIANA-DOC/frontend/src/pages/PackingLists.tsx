import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Box,
  Check,
  FileInput,
  FileText,
  PackagePlus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { PackingListModule } from '../components/packing-list/PackingListModule'
import { DEFAULT_COMPANY_NAME } from '../config/branding'
import { invoicesApi, settingsApi } from '../services/api'
import type { Invoice, InvoiceItem } from '../types'
import type { PackingLineItem, PackingListDocument } from '../types/packingList'
import './packing-lists.css'

const DRAFT_STORAGE_KEY = 'sky-ariana-packing-list-draft-v1'

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatDocumentDate = (value?: string) => {
  if (!value) return ''
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

const todayForDocument = () => formatDocumentDate(new Date().toISOString().slice(0, 10))

const createLineItem = (itemNo: number): PackingLineItem => ({
  item_no: itemNo,
  product_name: '',
  origin_country: 'Afghanistan',
  quantity_cartons: 0,
  unit_label: 'CTNS',
  net_weight_kg: 0,
  gross_weight_kg: 0,
  dimensions: { length_cm: 0, width_cm: 0, height_cm: 0 },
  volume_per_carton_cbm: 0,
})

const companyOfficeAddress = (settings?: any) => {
  const office = settings?.addresses?.afghanistan || settings?.addresses?.kabul
  return Array.isArray(office?.lines) ? office.lines.filter(Boolean).join(', ') : ''
}

const companyPhone = (settings?: any) => {
  const phones = settings?.phones?.afghanistan || settings?.phones?.kabul
  return Array.isArray(phones) ? String(phones[0] || '') : ''
}

const createInitialDocument = (settings?: any): PackingListDocument => ({
  exporter: {
    company_name: settings?.company_name || DEFAULT_COMPANY_NAME,
    address: companyOfficeAddress(settings) || 'Kandahar, Afghanistan',
    telephone: companyPhone(settings) || '+93 700 939 365',
    license_number: settings?.licence_number || '',
    beneficiary_name: settings?.bank_details?.beneficiary_name || settings?.company_name || 'SKY ARIANA',
    account_number: settings?.bank_details?.account_number || '',
    bank_name: settings?.bank_details?.bank_name || '',
    bank_address: settings?.bank_details?.branch || '',
    swift_code: settings?.bank_details?.swift_code || '',
  },
  importer: {
    company_name: '',
    address: '',
    phone_number: '',
    gst_number: '',
    fssai_number: '',
    iec_code: '',
  },
  shipping: {
    packing_list_number: `PL-${new Date().getFullYear()}-001`,
    date: todayForDocument(),
    invoice_number: '',
    airway_bill: { form_type: 'Air Waybill / Bill of Lading', number: '', date: '' },
    terms_of_payment: { letter_of_credit_no: '', collection_basis_no: '' },
    routing: { through: '', via: '' },
  },
  items: [createLineItem(1)],
  remarks: 'Goods packed for export in sound condition.',
  signatory_company: settings?.company_name || DEFAULT_COMPANY_NAME,
})

const readDraft = (): PackingListDocument => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : createInitialDocument()
  } catch {
    return createInitialDocument()
  }
}

const partyAddress = (party: any) => [
  party?.addressLine1 || party?.address,
  party?.addressLine2,
  [party?.city, party?.state, party?.postalCode].filter(Boolean).join(', '),
  party?.country,
].filter(Boolean).filter((line, index, lines) => lines.indexOf(line) === index).join(', ')

const mapInvoiceItem = (item: InvoiceItem, index: number, invoice: Invoice): PackingLineItem => {
  const shipment = invoice.shipment_details
  const fallbackPackages = invoice.items.length === 1 ? shipment?.package_count : 0
  const quantityCartons = toNumber(item.package_count) || toNumber(fallbackPackages) || toNumber(item.quantity)
  return {
    item_no: index + 1,
    product_name: item.description || item.product_name || '',
    origin_country: item.country_of_origin || 'Afghanistan',
    quantity_cartons: quantityCartons,
    unit_label: item.package_type || shipment?.package_type || item.quantity_unit || item.unit || 'PKGS',
    net_weight_kg: toNumber(item.net_weight) || (invoice.items.length === 1 ? toNumber(shipment?.net_weight) : 0),
    gross_weight_kg: toNumber(item.gross_weight) || (invoice.items.length === 1 ? toNumber(shipment?.gross_weight) : 0),
    dimensions: { length_cm: 0, width_cm: 0, height_cm: 0 },
    volume_per_carton_cbm: 0,
  }
}

const documentFromInvoice = (invoice: Invoice, current: PackingListDocument, settings?: any): PackingListDocument => {
  const shipper = invoice.shipperExporter
  const consignee = invoice.consigneeBuyer
  const customer = invoice.customer
  const shipment = invoice.shipment_details
  const exporterDefaults = createInitialDocument(settings).exporter
  const route = [shipment?.port_of_loading, shipment?.port_of_discharge].filter(Boolean).join(' → ')
  const mode = [shipment?.vessel_name, shipment?.voyage_number].filter(Boolean).join(' / ') || shipment?.shipping_line || route

  return {
    ...current,
    exporter: shipper ? {
      company_name: shipper.companyName || exporterDefaults.company_name,
      address: partyAddress(shipper) || exporterDefaults.address,
      telephone: shipper.phone || exporterDefaults.telephone,
      license_number: shipper.licenseNumber || exporterDefaults.license_number,
      beneficiary_name: shipper.companyName || exporterDefaults.beneficiary_name,
      account_number: shipper.accountNumber || exporterDefaults.account_number,
      bank_name: shipper.bankName || exporterDefaults.bank_name,
      bank_address: shipper.bankAddress || exporterDefaults.bank_address,
      swift_code: shipper.swiftCode || exporterDefaults.swift_code,
    } : exporterDefaults,
    importer: {
      company_name: consignee?.companyName || customer?.company_name || '',
      address: partyAddress(consignee) || [customer?.address, customer?.country].filter(Boolean).join(', '),
      phone_number: consignee?.phone || customer?.phone || '',
      gst_number: consignee?.gstin || consignee?.gstVatTrn || consignee?.taxNumber || customer?.tax_number || '',
      fssai_number: consignee?.fssai || '',
      iec_code: consignee?.iec || consignee?.importLicence || '',
    },
    shipping: {
      ...current.shipping,
      packing_list_number: `PL-${invoice.invoice_number.replace(/^INV-?/i, '')}`,
      date: formatDocumentDate(invoice.invoice_date),
      invoice_number: invoice.invoice_number,
      airway_bill: {
        ...current.shipping.airway_bill,
        number: shipment?.bill_of_lading_number || shipment?.booking_number || '',
        date: formatDocumentDate(shipment?.etd),
      },
      routing: { through: route, via: mode },
    },
    items: invoice.items.length ? invoice.items.map((item, index) => mapInvoiceItem(item, index, invoice)) : [createLineItem(1)],
    remarks: invoice.notes || current.remarks,
    signatory_company: shipper?.companyName || exporterDefaults.company_name,
  }
}

const PackingLists: React.FC = () => {
  const [document, setDocument] = useState<PackingListDocument>(readDraft)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [draftSaved, setDraftSaved] = useState(() => Boolean(localStorage.getItem(DRAFT_STORAGE_KEY)))
  const [notice, setNotice] = useState('')
  const [hasStoredDraft] = useState(() => Boolean(localStorage.getItem(DRAFT_STORAGE_KEY)))

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', 'packing-list-source'],
    queryFn: () => invoicesApi.list(),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    retry: false,
  })

  useEffect(() => {
    if (!settings || hasStoredDraft) return
    setDocument((current) => ({
      ...current,
      exporter: createInitialDocument(settings).exporter,
      signatory_company: settings.company_name || current.signatory_company,
    }))
  }, [hasStoredDraft, settings])

  const updateDocument = (updater: (current: PackingListDocument) => PackingListDocument) => {
    setDocument(updater)
    setDraftSaved(false)
    setNotice('')
  }

  const importMutation = useMutation({
    mutationFn: (invoiceId: number) => invoicesApi.get(invoiceId),
    onSuccess: (invoice: Invoice) => {
      updateDocument((current) => documentFromInvoice(invoice, current, settings))
      setNotice(`Imported ${invoice.invoice_number}. Review package dimensions before printing.`)
    },
    onError: () => setNotice('Could not import that invoice. Please try again.'),
  })

  const totals = useMemo(() => document.items.reduce((result, item) => ({
    packages: result.packages + toNumber(item.quantity_cartons),
    net: result.net + toNumber(item.net_weight_kg),
    gross: result.gross + toNumber(item.gross_weight_kg),
    volume: result.volume + (item.total_volume_cbm ?? toNumber(item.quantity_cartons) * toNumber(item.volume_per_carton_cbm)),
  }), { packages: 0, net: 0, gross: 0, volume: 0 }), [document.items])

  const updateExporter = (field: keyof PackingListDocument['exporter'], value: string) => {
    updateDocument((current) => ({ ...current, exporter: { ...current.exporter, [field]: value } }))
  }

  const updateImporter = (field: keyof PackingListDocument['importer'], value: string) => {
    updateDocument((current) => ({ ...current, importer: { ...current.importer, [field]: value } }))
  }

  const updateShipping = (field: 'packing_list_number' | 'date' | 'invoice_number', value: string) => {
    updateDocument((current) => ({ ...current, shipping: { ...current.shipping, [field]: value } }))
  }

  const updateAirwayBill = (field: 'number' | 'date', value: string) => {
    updateDocument((current) => ({
      ...current,
      shipping: { ...current.shipping, airway_bill: { ...current.shipping.airway_bill, number: current.shipping.airway_bill?.number || '', [field]: value } },
    }))
  }

  const updateRouting = (field: 'through' | 'via', value: string) => {
    updateDocument((current) => ({
      ...current,
      shipping: { ...current.shipping, routing: { ...current.shipping.routing, [field]: value } },
    }))
  }

  const updatePaymentReference = (field: 'letter_of_credit_no' | 'collection_basis_no', value: string) => {
    updateDocument((current) => ({
      ...current,
      shipping: {
        ...current.shipping,
        terms_of_payment: { ...current.shipping.terms_of_payment, [field]: value },
      },
    }))
  }

  const updateItem = (index: number, field: keyof PackingLineItem, value: string | number) => {
    updateDocument((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }

  const updateDimensions = (index: number, field: keyof PackingLineItem['dimensions'], value: number) => {
    updateDocument((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? { ...item, dimensions: { ...item.dimensions, [field]: value } }
        : item),
    }))
  }

  const addItem = () => updateDocument((current) => ({
    ...current,
    items: [...current.items, createLineItem(current.items.length + 1)],
  }))

  const removeItem = (index: number) => updateDocument((current) => ({
    ...current,
    items: current.items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, item_no: itemIndex + 1 })),
  }))

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(document))
      setDraftSaved(true)
      setNotice('Packing list draft saved on this device.')
    } catch {
      setNotice('Draft could not be saved in this browser.')
    }
  }

  const resetDraft = () => {
    if (!window.confirm('Start a new blank packing list? Unsaved changes will be cleared.')) return
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setDocument(createInitialDocument(settings))
    setSelectedInvoiceId('')
    setDraftSaved(false)
    setNotice('A new packing list is ready.')
  }

  return (
    <div className="packing-list-page">
      <header className="packing-list-header page-heading no-print">
        <div>
          <span className="page-eyebrow">EXPORT DOCUMENTS</span>
          <h1>Packing Lists</h1>
          <p>Create an accurate package manifest from an invoice, then print or save it as PDF.</p>
        </div>
        <div className="packing-list-header__actions">
          <span className={`packing-save-state ${draftSaved ? 'is-saved' : ''}`}><span />{draftSaved ? 'Draft saved locally' : 'Unsaved changes'}</span>
          <button type="button" className="button button--secondary" onClick={resetDraft}><RotateCcw size={16} /> New</button>
          <button type="button" className="button button--secondary" onClick={saveDraft}><Save size={16} /> Save draft</button>
          <button type="button" className="button button--primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        </div>
      </header>

      <section className="packing-import-card glass-panel no-print" aria-label="Create packing list from invoice">
        <div className="packing-import-card__icon"><FileInput size={21} /></div>
        <div className="packing-import-card__copy">
          <span>Create from invoice</span>
          <strong>Bring shipment and consignee details across automatically</strong>
        </div>
        <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} aria-label="Select source invoice">
          <option value="">{invoicesLoading ? 'Loading invoices…' : 'Select a commercial invoice'}</option>
          {invoices.map((invoice: any) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} — {invoice.customer_name}</option>)}
        </select>
        <button
          type="button"
          className="button button--primary"
          disabled={!selectedInvoiceId || importMutation.isPending}
          onClick={() => importMutation.mutate(Number(selectedInvoiceId))}
        >
          {importMutation.isPending ? 'Importing…' : 'Import invoice'}
        </button>
      </section>

      {notice && <div className="packing-list-notice no-print" role="status"><Check size={15} /> {notice}</div>}

      <div className="packing-workspace">
        <form className="packing-builder glass-panel no-print" onSubmit={(event) => event.preventDefault()}>
          <section className="packing-builder__section">
            <div className="packing-builder__heading">
              <span><FileText size={17} /></span>
              <div><h2>Document details</h2><p>Reference numbers and shipment routing.</p></div>
            </div>
            <div className="packing-field-grid packing-field-grid--three">
              <label><span>Packing list no.</span><input value={document.shipping.packing_list_number} onChange={(event) => updateShipping('packing_list_number', event.target.value)} /></label>
              <label><span>Date</span><input placeholder="DD/MM/YYYY" value={document.shipping.date} onChange={(event) => updateShipping('date', event.target.value)} /></label>
              <label><span>Commercial invoice</span><input value={document.shipping.invoice_number || ''} onChange={(event) => updateShipping('invoice_number', event.target.value)} /></label>
              <label><span>AWB / B/L no.</span><input value={document.shipping.airway_bill?.number || ''} onChange={(event) => updateAirwayBill('number', event.target.value)} /></label>
              <label><span>AWB / B/L date</span><input placeholder="DD/MM/YYYY" value={document.shipping.airway_bill?.date || ''} onChange={(event) => updateAirwayBill('date', event.target.value)} /></label>
              <label><span>Through</span><input placeholder="Kabul → Delhi" value={document.shipping.routing.through || ''} onChange={(event) => updateRouting('through', event.target.value)} /></label>
              <label className="packing-field--wide"><span>Mode / route description</span><input placeholder="By air from Kabul International Airport" value={document.shipping.routing.via} onChange={(event) => updateRouting('via', event.target.value)} /></label>
            </div>
          </section>

          <section className="packing-builder__section">
            <div className="packing-builder__heading">
              <span><Box size={17} /></span>
              <div><h2>Exporter &amp; consignee</h2><p>Legal names and contact information shown on the document.</p></div>
            </div>
            <div className="packing-party-editor-grid">
              <fieldset>
                <legend>Exporter / shipper</legend>
                <label><span>Company name</span><input value={document.exporter.company_name} onChange={(event) => updateExporter('company_name', event.target.value)} /></label>
                <label><span>Address</span><textarea rows={2} value={document.exporter.address} onChange={(event) => updateExporter('address', event.target.value)} /></label>
                <div className="packing-field-grid"><label><span>Telephone</span><input value={document.exporter.telephone} onChange={(event) => updateExporter('telephone', event.target.value)} /></label><label><span>License no.</span><input value={document.exporter.license_number || ''} onChange={(event) => updateExporter('license_number', event.target.value)} /></label></div>
                <div className="packing-field-grid"><label><span>Bank</span><input value={document.exporter.bank_name} onChange={(event) => updateExporter('bank_name', event.target.value)} /></label><label><span>Account no.</span><input value={document.exporter.account_number} onChange={(event) => updateExporter('account_number', event.target.value)} /></label></div>
                <label><span>SWIFT code</span><input value={document.exporter.swift_code} onChange={(event) => updateExporter('swift_code', event.target.value)} /></label>
              </fieldset>
              <fieldset>
                <legend>Consignee / importer</legend>
                <label><span>Company name</span><input value={document.importer.company_name} onChange={(event) => updateImporter('company_name', event.target.value)} /></label>
                <label><span>Address</span><textarea rows={2} value={document.importer.address} onChange={(event) => updateImporter('address', event.target.value)} /></label>
                <label><span>Telephone</span><input value={document.importer.phone_number} onChange={(event) => updateImporter('phone_number', event.target.value)} /></label>
                <div className="packing-field-grid"><label><span>GST / Tax no.</span><input value={document.importer.gst_number || ''} onChange={(event) => updateImporter('gst_number', event.target.value)} /></label><label><span>IEC code</span><input value={document.importer.iec_code || ''} onChange={(event) => updateImporter('iec_code', event.target.value)} /></label></div>
                <label><span>FSSAI no.</span><input value={document.importer.fssai_number || ''} onChange={(event) => updateImporter('fssai_number', event.target.value)} /></label>
              </fieldset>
            </div>
          </section>

          <section className="packing-builder__section">
            <div className="packing-builder__heading packing-builder__heading--action">
              <span><PackagePlus size={17} /></span>
              <div><h2>Package manifest</h2><p>Quantities, weights, dimensions, and volume.</p></div>
              <button type="button" onClick={addItem}><Plus size={15} /> Add line</button>
            </div>

            <div className="packing-totals-strip" aria-label="Packing totals">
              <span><small>Packages</small><strong>{totals.packages.toLocaleString()}</strong></span>
              <span><small>Net weight</small><strong>{totals.net.toLocaleString()} kg</strong></span>
              <span><small>Gross weight</small><strong>{totals.gross.toLocaleString()} kg</strong></span>
              <span><small>Total volume</small><strong>{totals.volume.toLocaleString(undefined, { maximumFractionDigits: 3 })} m³</strong></span>
            </div>

            <div className="packing-line-list">
              {document.items.map((item, index) => (
                <article className="packing-line-card" key={`${item.item_no}-${index}`}>
                  <header><div><span>{String(index + 1).padStart(2, '0')}</span><strong>Package line {index + 1}</strong></div>{document.items.length > 1 && <button type="button" aria-label={`Remove package line ${index + 1}`} onClick={() => removeItem(index)}><Trash2 size={15} /></button>}</header>
                  <div className="packing-field-grid packing-field-grid--three">
                    <label className="packing-field--wide"><span>Description of goods</span><input value={item.product_name} onChange={(event) => updateItem(index, 'product_name', event.target.value)} /></label>
                    <label><span>Country of origin</span><input value={item.origin_country} onChange={(event) => updateItem(index, 'origin_country', event.target.value)} /></label>
                    <label><span>Packages</span><input type="number" min="0" step="1" value={item.quantity_cartons} onChange={(event) => updateItem(index, 'quantity_cartons', toNumber(event.target.value))} /></label>
                    <label><span>Package unit</span><input placeholder="CTNS" value={item.unit_label} onChange={(event) => updateItem(index, 'unit_label', event.target.value.toUpperCase())} /></label>
                    <label><span>Net weight (kg)</span><input type="number" min="0" step="0.001" value={item.net_weight_kg} onChange={(event) => updateItem(index, 'net_weight_kg', toNumber(event.target.value))} /></label>
                    <label><span>Gross weight (kg)</span><input type="number" min="0" step="0.001" value={item.gross_weight_kg} onChange={(event) => updateItem(index, 'gross_weight_kg', toNumber(event.target.value))} /></label>
                  </div>
                  <div className="packing-dimensions-row">
                    <span>Carton dimensions</span>
                    <label><span>Length</span><input aria-label={`Line ${index + 1} length in centimeters`} type="number" min="0" step="0.1" value={item.dimensions.length_cm} onChange={(event) => updateDimensions(index, 'length_cm', toNumber(event.target.value))} /></label>
                    <b>×</b>
                    <label><span>Width</span><input aria-label={`Line ${index + 1} width in centimeters`} type="number" min="0" step="0.1" value={item.dimensions.width_cm} onChange={(event) => updateDimensions(index, 'width_cm', toNumber(event.target.value))} /></label>
                    <b>×</b>
                    <label><span>Height</span><input aria-label={`Line ${index + 1} height in centimeters`} type="number" min="0" step="0.1" value={item.dimensions.height_cm} onChange={(event) => updateDimensions(index, 'height_cm', toNumber(event.target.value))} /></label>
                    <label className="packing-volume-field"><span>Volume / carton (m³)</span><input type="number" min="0" step="0.001" value={item.volume_per_carton_cbm} onChange={(event) => updateItem(index, 'volume_per_carton_cbm', toNumber(event.target.value))} /></label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="packing-builder__section packing-builder__section--last">
            <div className="packing-builder__heading"><span><FileText size={17} /></span><div><h2>References &amp; authorization</h2><p>Optional trade references and the signing company.</p></div></div>
            <div className="packing-field-grid">
              <label><span>Letter of credit no.</span><input value={document.shipping.terms_of_payment.letter_of_credit_no || ''} onChange={(event) => updatePaymentReference('letter_of_credit_no', event.target.value)} /></label>
              <label><span>Collection basis no.</span><input value={document.shipping.terms_of_payment.collection_basis_no || ''} onChange={(event) => updatePaymentReference('collection_basis_no', event.target.value)} /></label>
              <label className="packing-field--wide"><span>Remarks</span><textarea rows={2} value={document.remarks || ''} onChange={(event) => updateDocument((current) => ({ ...current, remarks: event.target.value }))} /></label>
              <label className="packing-field--wide"><span>Authorized company</span><input value={document.signatory_company || ''} onChange={(event) => updateDocument((current) => ({ ...current, signatory_company: event.target.value }))} /></label>
            </div>
          </section>
        </form>

        <section className="packing-preview-panel" aria-label="Live packing list preview">
          <div className="packing-preview-toolbar no-print">
            <div><span>LIVE PREVIEW</span><strong>A4 · Portrait</strong></div>
            <button type="button" onClick={() => window.print()}><Printer size={15} /> Print</button>
          </div>
          <div className="packing-preview-frame">
            <PackingListModule data={document} />
          </div>
        </section>
      </div>
    </div>
  )
}

export default PackingLists
