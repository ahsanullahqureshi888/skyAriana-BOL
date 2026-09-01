import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage, invoicesApi, customersApi, businessPartiesApi, settingsApi } from '../services/api'
import { useApp } from '../App'
import { TemplateCards } from '../components/invoice-templates/TemplateSelector'
import { PremiumAfghanHeritageInvoice } from '../components/invoice-templates/PremiumAfghanHeritageInvoice'
import type { InvoiceTemplateId } from '../types'
import { InvoicePartyEditor } from '../components/InvoicePartyEditor'
import type { InvoiceParty, Customer, BusinessParty } from '../types'
import { SEED_CONSIGNEES } from '../data/consigneesSeed'
import { createEmptyNotifyParty, getCleanPartyDisplayAddress, hasInvoicePartyDetails, normalizeInvoiceParty } from '../utils/invoiceParty'
import { BRAND_LOGO_SRC, DEFAULT_COMPANY_NAME, resolveBrandAssetUrl } from '../config/branding'
import { CommercialLineItemCard } from '../components/CommercialLineItemCard'
import type { DryFruitSearchResult } from '../data/dryFruitCatalog'
import { calculateLineTotal, calculateLineTotals, createEmptyCommercialLineItem, hasCommercialLineItemData, normalizeCommercialLineItem, validateCommercialLineItem, type CommercialLineItem } from '../utils/commercialLineItems'
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Info,
  AlertCircle,
  DollarSign,
  Building2,
  Bell,
  Link2,
  Sparkles,
  Printer,
  Calendar
} from 'lucide-react'

const partyFields = [
  ['companyName', 'Company Name', 'Enter company name', 'text'],
  ['contactPerson', 'Contact Person', 'Enter contact person', 'text'],
  ['address', 'Address', 'Enter address', 'text'],
  ['city', 'City', 'Enter city', 'text'],
  ['state', 'State / Province', 'Enter province or state', 'text'],
  ['postalCode', 'Postal Code', 'Enter postal code', 'text'],
  ['country', 'Country', 'Enter country', 'text'],
  ['phone', 'Phone', 'Enter phone number', 'tel'],
  ['email', 'Email', 'Enter email address', 'email'],
  ['taxNumber', 'Tax / TIN Number', 'Enter tax number', 'text'],
  ['licenseNumber', 'License Number', 'Enter licence number', 'text']
] as const

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

const PartyFields = ({ party, onChange, idPrefix = 'notify' }: { party: any, onChange: (field: string, value: string) => void, idPrefix?: string }) => (
  <div className="party-fields-grid">
    {partyFields.map(([field, label, placeholder, type]) => (
      <div key={field} className={`party-form-field ${field === 'companyName' || field === 'address' ? 'party-field--full' : ''}`}>
        <label htmlFor={`${idPrefix}-${field}`}>{label}{field === 'companyName' ? ' *' : ''}</label>
        <input
          id={`${idPrefix}-${field}`}
          type={type}
          required={field === 'companyName'}
          value={party?.[field] || ''}
          placeholder={placeholder}
          onChange={(event) => onChange(field, event.target.value)}
          className="party-form-input"
        />
      </div>
    ))}
  </div>
)

const toISODateString = (val: any, fallback?: string): string => {
  if (!val) return fallback || new Date().toISOString().split('T')[0]
  const str = String(val).trim()
  if (!str) return fallback || new Date().toISOString().split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10)
  }
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return fallback || new Date().toISOString().split('T')[0]
}

// Default empty form state
const initialFormState = {
  invoice_number: '',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customer_id: '',
  currency: 'USD',
  invoice_template: 'premium_afghan_glass' as InvoiceTemplateId,
  notes: '',
  freight: 0,
  freight_rate: 0,
  insurance: 0,
  other_charges: 0,
  discount: 0,
  tax: 0,
  documentationFees: 0,
  customsClearanceFees: 0,
  shipperExporter: createEmptyNotifyParty(),
  consigneeBuyer: createEmptyNotifyParty(),
  notifyPartyEnabled: false,
  notifyPartySameAsConsignee: false,
  notifyParty: createEmptyNotifyParty(),
  items: [createEmptyCommercialLineItem('USD', 1)],
  shipment_details: {
    booking_number: '',
    bill_of_lading_number: '',
    container_number: '',
    container_type: '',
    seal_number: '',
    commodity: '',
    gross_weight: '',
    net_weight: '',
    package_count: '',
    package_type: '',
    port_of_loading: '',
    port_of_discharge: '',
    vessel_name: '',
    voyage_number: '',
    shipping_line: '',
    incoterms: '',
    etd: '',
    eta: ''
  }
}

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useApp()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const invoiceId = parseInt(id || '0')

  // States
  const [formData, setFormData] = useState<any>(initialFormState)
  const [previewLang, setPreviewLang] = useState<'en' | 'fa' | 'ps'>('en')
  const [logoError, setLogoError] = useState(false)
  const [saveNotifyPartyAsCustomer, setSaveNotifyPartyAsCustomer] = useState(false)
  const [notifyPartyCustomerId, setNotifyPartyCustomerId] = useState('')
  const [partySaveError, setPartySaveError] = useState('')
  const [savingParty, setSavingParty] = useState(false)
  const [useCompanyAsShipper, setUseCompanyAsShipper] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState<'saved'|'unsaved'|'saving'|'error'>('saved')
  const [saveError, setSaveError] = useState('')
  const [previewZoom, setPreviewZoom] = useState(0.42)
  const [sectionStatus, setSectionStatus] = useState<Record<string,'saved'|'unsaved'|'saving'|'error'>>({ shipper:'saved',consignee:'saved',notify:'saved' })
  const [partyErrors, setPartyErrors] = useState<Record<string,Record<string,string>>>({})
  const [itemErrors, setItemErrors] = useState<Record<string, Record<string, string>>>({})
  const dragIndexRef = React.useRef<number | null>(null)
  const saveModeRef = React.useRef<'draft'|'final'>('final')

  // Queries
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list
  })

  const { data: businessParties } = useQuery<BusinessParty[]>({
    queryKey: ['business-parties-form'],
    queryFn: () => businessPartiesApi.list(),
  })

  const selectedShipperPartyId = formData.shipperExporter?.partyId
  const { data: relatedNotifyParties } = useQuery<BusinessParty[]>({
    queryKey: ['business-party-related-notify', selectedShipperPartyId],
    queryFn: () => businessPartiesApi.relatedNotifyParties(selectedShipperPartyId!),
    enabled: Boolean(selectedShipperPartyId),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get
  })

  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: isEdit
  })
  useEffect(() => {
    if (isEdit || !settings) return
    setFormData((previous: any) => ({
      ...previous,
      invoice_template: settings.default_invoice_template || previous.invoice_template,
      shipperExporter: useCompanyAsShipper ? companyParty() : previous.shipperExporter,
    }))
  }, [isEdit, settings, useCompanyAsShipper])

  useEffect(() => {
    if (isEdit || !customers || customers.length === 0) return
    setFormData((previous: any) => {
      if (previous.customer_id) return previous
      const firstCustomer = customers[0]
      const snapshot = partyFromCustomer(firstCustomer)
      return {
        ...previous,
        customer_id: String(firstCustomer.id),
        consigneeBuyer: hasInvoicePartyDetails(previous.consigneeBuyer) ? previous.consigneeBuyer : snapshot,
      }
    })
  }, [isEdit, customers])
  const handleCustomerChange = (custIdStr: string) => {
    const custId = parseInt(custIdStr)
    const customer = customers?.find((candidate: any) => candidate.id === custId)
    const snapshot = partyFromCustomer(customer)
    markDirty()
    setFormData((previous: any) => ({
      ...previous,
      customer_id: custIdStr,
      consigneeBuyer: hasInvoicePartyDetails(previous.consigneeBuyer) ? previous.consigneeBuyer : snapshot,
      notifyParty: previous.notifyPartySameAsConsignee ? { ...(hasInvoicePartyDetails(previous.consigneeBuyer) ? previous.consigneeBuyer : snapshot) } : previous.notifyParty,
      notifyPartyEnabled: previous.notifyPartySameAsConsignee ? hasInvoicePartyDetails(previous.consigneeBuyer) || hasInvoicePartyDetails(snapshot) : previous.notifyPartyEnabled,
    }))
  }

  const handleToggleSameAsConsignee = (checked: boolean) => {
    markDirty()
    setNotifyPartyCustomerId(checked ? formData.customer_id : '')
    setFormData((previous: any) => {
      const copiedParty = checked ? { ...previous.consigneeBuyer } : { ...previous.notifyParty, contactId: undefined }
      return {
        ...previous,
        notifyPartySameAsConsignee: checked,
        notifyParty: copiedParty,
        notifyPartyEnabled: hasInvoicePartyDetails(copiedParty),
      }
    })
  }
  // Load existing invoice if edit mode
  useEffect(() => {
    if (existingInvoice && isEdit) {
      const savedNotifyParty = normalizeInvoiceParty(existingInvoice.notifyParty ?? existingInvoice.notify_party)
      const savedNotifyCustomerId = savedNotifyParty ? (existingInvoice.notifyPartyCustomerId ?? existingInvoice.notify_party_customer_id ?? '') : ''
      const savedNotifySnapshot = savedNotifyParty
        ? { ...createEmptyNotifyParty(), ...savedNotifyParty, contactId: savedNotifyCustomerId ? Number(savedNotifyCustomerId) : savedNotifyParty.contactId }
        : createEmptyNotifyParty()
      setNotifyPartyCustomerId(String(savedNotifyCustomerId))
      const parsedInvoiceDate = toISODateString(existingInvoice.invoice_date)
      const parsedDueDate = toISODateString(existingInvoice.due_date, parsedInvoiceDate)
      setFormData({
        invoice_number: existingInvoice.invoice_number,
        invoice_date: parsedInvoiceDate,
        due_date: parsedDueDate,
        customer_id: existingInvoice.customer_id.toString(),
        currency: existingInvoice.currency,
        invoice_template: existingInvoice.invoice_template || settings?.default_invoice_template || 'premium_afghan_glass',
        notes: existingInvoice.notes || '',
        freight: parseFloat(existingInvoice.freight || 0),
        freight_rate: parseFloat(existingInvoice.freight_rate || 0),
        insurance: parseFloat(existingInvoice.insurance || 0),
        other_charges: parseFloat(existingInvoice.other_charges || 0),
        discount: parseFloat(existingInvoice.discount || 0),
        tax: parseFloat(existingInvoice.tax || 0),
        documentationFees: Number(existingInvoice.documentationFees) || Number(existingInvoice.other_charges) || 0,
        customsClearanceFees: Number(existingInvoice.customsClearanceFees) || 0,
        shipperExporter: {
          ...(normalizeInvoiceParty(existingInvoice.shipperExporter ?? existingInvoice.shipper_exporter, true) || companyParty()),
          partyId: existingInvoice.shipperPartyId ?? existingInvoice.shipper_party_id ?? undefined,
        },
        consigneeBuyer: {
          ...(normalizeInvoiceParty(existingInvoice.consigneeBuyer ?? existingInvoice.consignee_buyer, true) || {
          companyName: existingInvoice.customer?.company_name || '', contactPerson: existingInvoice.customer?.contact_person || '',
          address: existingInvoice.customer?.address || '', addressLine1: existingInvoice.customer?.address || '', addressLine2:'', city:'',state:'',postalCode:'',
          country: existingInvoice.customer?.country || '', phone: existingInvoice.customer?.phone || '', altPhone:'', email: existingInvoice.customer?.email || '',
          taxNumber: existingInvoice.customer?.tax_number || '', gstVatTrn:'', importLicence:'', website:'', contactId:existingInvoice.customer_id
          }),
          partyId: existingInvoice.consigneePartyId ?? existingInvoice.consignee_party_id ?? undefined,
        },
        notifyPartyEnabled: Boolean(savedNotifyParty),
         items: (existingInvoice.items || []).length
           ? (existingInvoice.items || []).map((item: any, index: number) => normalizeCommercialLineItem(item, index, existingInvoice.currency || 'USD'))
           : [createEmptyCommercialLineItem(existingInvoice.currency || 'USD', 1)],
        shipment_details: {
          booking_number: existingInvoice.shipment_details?.booking_number || '',
          bill_of_lading_number: existingInvoice.shipment_details?.bill_of_lading_number || '',
          container_number: existingInvoice.shipment_details?.container_number || '',
          container_type: existingInvoice.shipment_details?.container_type || '',
          seal_number: existingInvoice.shipment_details?.seal_number || '',
          commodity: existingInvoice.shipment_details?.commodity || '',
          gross_weight: existingInvoice.shipment_details?.gross_weight || '',
          net_weight: existingInvoice.shipment_details?.net_weight || '',
          package_count: existingInvoice.shipment_details?.package_count || '',
          package_type: existingInvoice.shipment_details?.package_type || '',
          port_of_loading: existingInvoice.shipment_details?.port_of_loading || '',
          port_of_discharge: existingInvoice.shipment_details?.port_of_discharge || '',
          vessel_name: existingInvoice.shipment_details?.vessel_name || '',
          voyage_number: existingInvoice.shipment_details?.voyage_number || '',
          shipping_line: existingInvoice.shipment_details?.shipping_line || '',
          incoterms: existingInvoice.shipment_details?.incoterms || '',
          etd: existingInvoice.shipment_details?.etd || '',
          eta: existingInvoice.shipment_details?.eta || ''
        },
        notifyPartySameAsConsignee: Boolean(savedNotifyParty && existingInvoice.notifyPartySameAsConsignee),
        notifyParty: {
          ...savedNotifySnapshot,
          partyId: existingInvoice.notifyPartyId ?? existingInvoice.notify_party_id ?? undefined,
        },
      })
      setIsDirty(false)
      setSaveState('saved')
      setSaveError('')
    }
  }, [existingInvoice, isEdit, settings?.default_invoice_template])

  useEffect(() => {
    if (isEdit) return
    setFormData({
      ...initialFormState,
      invoice_template: settings?.default_invoice_template || initialFormState.invoice_template,
      notifyParty: createEmptyNotifyParty(),
      items: [createEmptyCommercialLineItem(settings?.default_currency || initialFormState.currency, 1)],
      shipment_details: { ...initialFormState.shipment_details },
    })
    setNotifyPartyCustomerId('')
    setSaveNotifyPartyAsCustomer(false)
    setPartyErrors({})
    setIsDirty(false)
    setSaveState('saved')
  }, [invoiceId, isEdit])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [isDirty])

  // Mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return invoicesApi.update(invoiceId, data)
      } else {
        return invoicesApi.create(data)
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['invoice', saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['invoice', saved.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
      setIsDirty(false)
      setSaveState('saved')
      setSaveError('')
      if (saveModeRef.current === 'draft') {
        if (!isEdit) navigate(`/invoices/${saved.id}/edit`, { replace:true })
      } else navigate(`/invoices/${isEdit ? invoiceId : saved.id}`)
    },
    onError: (error: unknown) => {
      setSaveState('error')
      setSaveError(getApiErrorMessage(error, 'Could not save this invoice. Your changes are still here.'))
    },
  })

  // Calculations
  const formatUSD = (value: number): string => {
    const amount = Number(value) || 0;
    return `${formData.currency || 'USD'} ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const toWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    if (num === 0) return 'ZERO';

    const parts = [];
    let numInt = Math.floor(num);
    let scaleIndex = 0;

    while (numInt > 0) {
      const chunk = numInt % 1000;
      if (chunk > 0) {
        const chunkParts = [];
        const hundreds = Math.floor(chunk / 100);
        const remainder = chunk % 100;

        if (hundreds > 0) {
          chunkParts.push(ones[hundreds]);
          chunkParts.push('HUNDRED');
        }

        if (remainder > 0) {
          if (remainder < 20) {
            chunkParts.push(ones[remainder]);
          } else {
            const ten = Math.floor(remainder / 10);
            const one = remainder % 10;
            chunkParts.push(tens[ten]);
            if (one > 0) {
              chunkParts.push(ones[one]);
            }
          }
        }

        if (scales[scaleIndex]) {
          chunkParts.push(scales[scaleIndex]);
        }
        parts.unshift(chunkParts.join(' '));
      }
      numInt = Math.floor(numInt / 1000);
      scaleIndex++;
    }

    const cents = Math.round((num % 1) * 100);
    let centsStr = '';
    if (cents > 0) {
      centsStr = ` AND ${cents}/100`;
    }

    return parts.join(' ') + centsStr;
  };

  const roundCurrency = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const itemTotals = calculateLineTotals(formData.items as CommercialLineItem[])
  const netWeight = Number(formData.shipment_details.net_weight || itemTotals.netWeight) || 0;
  const grossWeight = Number(formData.shipment_details.gross_weight || itemTotals.grossWeight || netWeight) || 0;
  const weight = grossWeight;
  const goodsRate = Number(formData.items[0]?.unit_price) || 0;
  const freightRate = Number(formData.freight_rate) || 0;
  const insurance = Number(formData.insurance) || 0;
  const documentationFees = Number(formData.documentationFees) || 0;
  const customsClearanceFees = Number(formData.customsClearanceFees) || 0;

  const goodsValue = roundCurrency(itemTotals.subtotal);

  const freightCharges = roundCurrency(weight * freightRate);
  const cifUnitRate = roundCurrency(goodsRate + freightRate);
  const totalCifValue = roundCurrency(goodsValue + freightCharges + insurance);
  const additionalFees = roundCurrency(documentationFees + customsClearanceFees);
  const invoiceGrandTotal = roundCurrency(totalCifValue + documentationFees + customsClearanceFees);

  const subtotal = goodsValue;
  const freightValue = freightCharges;
  const grandTotal = invoiceGrandTotal;

  // Handlers
  const markDirty = () => { setIsDirty(true); setSaveState('unsaved'); setSaveError('') }
  const handleInputChange = (field: string, val: any) => {
    markDirty()
    setFormData((prev: any) => ({ ...prev, [field]: val }))
  }

  const handleShipmentChange = (field: string, val: any) => {
    markDirty()
    setFormData((prev: any) => ({
      ...prev,
      shipment_details: { ...prev.shipment_details, [field]: val }
    }))
  }

  const validateLineItemAt = (index: number) => {
    const errors = validateCommercialLineItem(formData.items[index])
    const key = formData.items[index]?.local_id || String(index)
    setItemErrors(previous => ({ ...previous, [key]: errors }))
    return errors
  }

  const handleItemChange = (index: number, field: keyof CommercialLineItem, val: string) => {
    markDirty()
    setFormData((prev: any) => ({
      ...prev,
      currency: field === 'currency' ? val : prev.currency,
      items: prev.items.map((item: CommercialLineItem, itemIndex: number) => itemIndex === index
        ? { ...item, [field]: val }
        : field === 'currency' ? { ...item, currency: val } : item),
    }))
  }

  const handleAddItem = () => {
    markDirty()
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items, createEmptyCommercialLineItem(prev.currency || 'USD', prev.items.length + 1)],
    }))
  }

  const handleRemoveItem = (index: number) => {
    const item = formData.items[index]
    if (hasCommercialLineItemData(item) && !window.confirm(`Delete Item ${String(index + 1).padStart(2, '0')}? Entered product and pricing details will be removed.`)) return
    markDirty()
    const nextItems = formData.items.length <= 1
      ? [createEmptyCommercialLineItem(formData.currency || 'USD', 1)]
      : formData.items.filter((_: CommercialLineItem, itemIndex: number) => itemIndex !== index).map((line: CommercialLineItem, itemIndex: number) => ({ ...line, sort_order: itemIndex + 1 }))
    setFormData((prev: any) => ({ ...prev, items: nextItems }))
  }

  const handleDuplicateItem = (index: number) => {
    markDirty()
    const copy = { ...formData.items[index], id: undefined, local_id: undefined, sort_order: index + 2 }
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items.slice(0, index + 1), normalizeCommercialLineItem(copy, index + 1, prev.currency || 'USD'), ...prev.items.slice(index + 1)].map((line: CommercialLineItem, itemIndex: number) => ({ ...line, sort_order: itemIndex + 1 })),
    }))
  }

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= formData.items.length) return
    markDirty()
    const next = [...formData.items]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setFormData((prev: any) => ({ ...prev, items: next.map((line: CommercialLineItem, itemIndex: number) => ({ ...line, sort_order: itemIndex + 1 })) }))
  }

  const handleDropItem = (index: number) => {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    if (from === null || from === index || from < 0 || from >= formData.items.length) return
    markDirty()
    const next = [...formData.items]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    setFormData((prev: any) => ({ ...prev, items: next.map((line: CommercialLineItem, itemIndex: number) => ({ ...line, sort_order: itemIndex + 1 })) }))
  }

  const handleClearProduct = (index: number) => {
    markDirty()
    setFormData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: CommercialLineItem, itemIndex: number) => itemIndex === index ? { ...item, product_catalog_id: '', product_name: '', variety: '', grade: '', custom_grade: '', autofill_snapshot: undefined } : item),
    }))
  }

  const handleProductSelect = (index: number, result: DryFruitSearchResult | null, customValue?: string) => {
    markDirty()
    const item = formData.items[index] as CommercialLineItem
    if (!result) {
      setFormData((prev: any) => ({ ...prev, items: prev.items.map((line: CommercialLineItem, itemIndex: number) => itemIndex === index ? { ...line, product_catalog_id: '', product_name: customValue || line.product_name, description: line.description || customValue || line.product_name, variety: '', grade: '', custom_grade: '', autofill_snapshot: undefined } : line) }))
      return
    }
    const variant = result.variety
    const autofillFields = ['description', 'variety', 'grade', 'hs_code', 'quantity_unit', 'weight_unit', 'package_type'] as const
    const hasManualValues = autofillFields.some(field => {
      const current = String(item[field] || '').trim()
      if (!current) return false
      const previousAutofill = item.autofill_snapshot?.[field]
      return previousAutofill === undefined || previousAutofill !== current
    })
    if (hasManualValues && !window.confirm('This line contains manually entered product details. Replace them with the selected catalog defaults?')) return
    const next = {
      ...item,
      product_catalog_id: result.entry.id,
      product_name: result.entry.productName,
      description: result.entry.productName,
      variety: variant.name,
      grade: variant.grades[0] || '',
      custom_grade: '',
      hs_code: variant.hsCode,
      quantity_unit: item.quantity_unit || variant.defaultUnit,
      weight_unit: item.weight_unit || variant.defaultUnit,
      package_type: item.package_type || variant.suggestedPackageTypes[0] || '',
      autofill_snapshot: {
         description: result.entry.productName,
         variety: variant.name,
         grade: variant.grades[0] || '',
         hs_code: variant.hsCode,
        quantity_unit: item.quantity_unit || variant.defaultUnit,
        weight_unit: item.weight_unit || variant.defaultUnit,
        package_type: item.package_type || variant.suggestedPackageTypes[0] || '',
      },
    }
    setFormData((prev: any) => ({ ...prev, items: prev.items.map((line: CommercialLineItem, itemIndex: number) => itemIndex === index ? next : line) }))
  }

  const validateParty = (party: InvoiceParty, required = true) => {
    const errors: Record<string,string> = {}
    const text = (party.companyName || party.addressLine1 || party.address || '').trim()
    if (required && !text) errors.companyName = 'Party details are required.'
    return errors
  }

  const handleSubmit = async (e: React.SyntheticEvent, asDraft = false) => {
    e.preventDefault()
    setSaveError('')
    
    let activeCustomerId = formData.customer_id
    if (!activeCustomerId) {
      const consigneeName = formData.consigneeBuyer?.companyName?.trim()
      if (consigneeName) {
        const normalized = consigneeName.toLowerCase().replace(/\s+/g, ' ')
        const existingCust = customers?.find((c: any) =>
          c.company_name?.trim().toLowerCase().replace(/\s+/g, ' ') === normalized
        )
        if (existingCust) {
          activeCustomerId = String(existingCust.id)
        } else {
          try {
            const newCust = await customersApi.create({
              company_name: consigneeName,
              contact_person: formData.consigneeBuyer.contactPerson || null,
              address: formData.consigneeBuyer.addressLine1 || formData.consigneeBuyer.address || null,
              country: formData.consigneeBuyer.country || null,
              phone: formData.consigneeBuyer.phone || null,
              email: formData.consigneeBuyer.email || null,
              tax_number: formData.consigneeBuyer.taxNumber || null,
            })
            activeCustomerId = String(newCust.id)
            await queryClient.invalidateQueries({ queryKey: ['customers'] })
          } catch (err) {
            console.error('Failed auto-creating customer from consignee:', err)
          }
        }
      }
      if (!activeCustomerId && customers && customers.length > 0) {
        activeCustomerId = String(customers[0].id)
      }
      if (!activeCustomerId) {
        try {
          const genCust = await customersApi.create({
            company_name: consigneeName || 'General Customer',
            contact_person: formData.consigneeBuyer?.contactPerson || 'General Contact',
          })
          activeCustomerId = String(genCust.id)
          await queryClient.invalidateQueries({ queryKey: ['customers'] })
        } catch (err) {
          console.error('Failed creating fallback customer:', err)
        }
      }

      if (activeCustomerId) {
        setFormData((prev: any) => ({ ...prev, customer_id: activeCustomerId }))
      } else {
        setSaveState('error')
        setSaveError('Select a customer or enter a Consignee Company Name before saving the invoice.')
        return
      }
    }
    if (!asDraft) {
      const errors = { shipper: validateParty(formData.shipperExporter), consignee: validateParty(formData.consigneeBuyer), notify: validateParty(formData.notifyParty, false) }
      setPartyErrors(errors)
      const firstInvalid = (['shipper','consignee','notify'] as const).find(key => Object.keys(errors[key]).length)
      if (firstInvalid) {
        setSaveState('error')
        setSaveError('Complete the highlighted party details before saving the invoice.')
        document.querySelector('[data-party-kind="' + firstInvalid + '"]')?.scrollIntoView({ behavior:'smooth',block:'center' })
        return
      }
      const lineErrors = Object.fromEntries(formData.items.map((item: CommercialLineItem, index: number) => [item.local_id || String(index), validateCommercialLineItem(item)]))
      setItemErrors(lineErrors)
      const firstInvalidItem = formData.items.findIndex((item: CommercialLineItem, index: number) => Object.keys(lineErrors[item.local_id || String(index)] || {}).length)
      if (firstInvalidItem >= 0) {
        setSaveState('error')
        setSaveError('Complete the highlighted commercial line item before saving the invoice.')
        document.querySelector(`[data-line-item-index="${firstInvalidItem}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    setSaveState('saving')
    
    const normalizedNotifyParty = normalizeInvoiceParty(formData.notifyParty)
    let resolvedNotifyCustomerId = normalizedNotifyParty && notifyPartyCustomerId ? parseInt(notifyPartyCustomerId) : null
    if (normalizedNotifyParty && saveNotifyPartyAsCustomer && !formData.notifyPartySameAsConsignee) {
      const companyName = formData.notifyParty?.companyName?.trim()
      if (!companyName) {
        setPartySaveError('Company Name is required to save this Notify Party.')
        setSaveState('error')
        setSaveError('Complete the Notify Party details or turn off Save to Customers.')
        return
      }
      setSavingParty(true); setPartySaveError('')
      try {
        const normalized = companyName.toLowerCase().replace(/\s+/g, ' ')
        const duplicate = customers?.find((customer: any) =>
          customer.company_name?.trim().toLowerCase().replace(/\s+/g, ' ') === normalized ||
          (formData.notifyParty.email && customer.email?.toLowerCase() === formData.notifyParty.email.toLowerCase()) ||
          (formData.notifyParty.phone && customer.phone === formData.notifyParty.phone)
        )
        if (duplicate) {
          if (!confirm(`A similar customer already exists: ${duplicate.company_name}. Use this existing customer?`)) { setSavingParty(false); return }
          resolvedNotifyCustomerId = duplicate.id
        } else {
          const saved = await customersApi.create({ company_name: companyName, contact_person: formData.notifyParty.contactPerson || null, address: formData.notifyParty.address || null, country: formData.notifyParty.country || null, phone: formData.notifyParty.phone || null, email: formData.notifyParty.email || null, tax_number: formData.notifyParty.taxNumber || null })
          resolvedNotifyCustomerId = saved.id
          await queryClient.invalidateQueries({ queryKey: ['customers'] })
          setNotifyPartyCustomerId(String(saved.id)); setSaveNotifyPartyAsCustomer(false)
        }
      } catch (error: any) { setPartySaveError(error.response?.data?.detail || 'Could not save Notify Party to Customers.'); setSavingParty(false); return }
      setSavingParty(false)
    }

    // Prepare data
    const sanitizedInvoiceDate = toISODateString(formData.invoice_date)
    const sanitizedDueDate = toISODateString(formData.due_date, sanitizedInvoiceDate)

    let finalCustomerId = Number.parseInt(String(activeCustomerId || formData.customer_id), 10)
    if (isNaN(finalCustomerId) || finalCustomerId <= 0) {
      if (customers && customers.length > 0) {
        finalCustomerId = Number(customers[0].id)
      } else {
        finalCustomerId = 1
      }
    }

    const payload = {
      invoice_number: String(formData.invoice_number || '').trim() || null,
      invoice_date: sanitizedInvoiceDate,
      due_date: sanitizedDueDate,
      customer_id: finalCustomerId,
      currency: formData.currency,
      status: asDraft ? 'draft' : (formData.status === 'draft' ? 'unpaid' : formData.status || 'unpaid'),
      invoice_template: formData.invoice_template,
      notes: formData.notes || null,
      freight: freightValue,
      freight_rate: freightRate,
      insurance: toFiniteNumber(formData.insurance),
      // Keep legacy servers compatible: before documentationFees existed they persisted this charge as other_charges.
      other_charges: toFiniteNumber(formData.other_charges) || toFiniteNumber(formData.documentationFees),
      discount: toFiniteNumber(formData.discount),
      tax: toFiniteNumber(formData.tax),
      documentationFees: toFiniteNumber(formData.documentationFees),
      customsClearanceFees: toFiniteNumber(formData.customsClearanceFees),
      notifyPartySameAsConsignee: Boolean(normalizedNotifyParty && formData.notifyPartySameAsConsignee),
      shipperExporter: formData.shipperExporter,
      shipperPartyId: formData.shipperExporter?.partyId || null,
      consigneeBuyer: formData.consigneeBuyer,
      consigneePartyId: formData.consigneeBuyer?.partyId || null,
      notifyPartyEnabled: Boolean(normalizedNotifyParty),
      notifyPartyId: normalizedNotifyParty ? (formData.notifyParty?.partyId || null) : null,
      notifyPartyCustomerId: normalizedNotifyParty ? (formData.notifyPartySameAsConsignee ? finalCustomerId : resolvedNotifyCustomerId) : null,
      notifyParty: normalizedNotifyParty,
      items: formData.items.map((item: any, idx: number) => ({
        product_catalog_id: item.product_catalog_id || null,
        product_name: item.product_name || null,
        product_variety: item.variety || null,
        product_grade: item.grade || null,
        custom_grade: item.custom_grade || null,
        description: item.description,
        hs_code: item.hs_code || null,
        quantity: toFiniteNumber(item.quantity),
        unit: item.quantity_unit || item.unit || 'PCS',
        quantity_unit: item.quantity_unit || item.unit || 'PCS',
        package_count: toFiniteNumber(item.package_count),
        package_type: item.package_type || null,
        net_weight: toFiniteNumber(item.net_weight),
        gross_weight: toFiniteNumber(item.gross_weight || item.net_weight),
        weight_unit: item.weight_unit || 'KG',
        unit_price: toFiniteNumber(item.unit_price),
        currency: item.currency || formData.currency,
        price_basis: item.price_basis || 'Per KG',
        country_of_origin: item.country_of_origin || null,
        lot_batch_number: item.lot_batch_number || null,
        remarks: item.remarks || null,
        amount: calculateLineTotal(item),
        sort_order: idx + 1
      })),
      shipment_details: {
        booking_number: formData.shipment_details.booking_number || null,
        bill_of_lading_number: formData.shipment_details.bill_of_lading_number || null,
        container_number: formData.shipment_details.container_number || null,
        container_type: formData.shipment_details.container_type || null,
        seal_number: formData.shipment_details.seal_number || null,
        commodity: formData.shipment_details.commodity || null,
        gross_weight: formData.shipment_details.gross_weight ? toFiniteNumber(formData.shipment_details.gross_weight) : null,
        net_weight: formData.shipment_details.net_weight ? toFiniteNumber(formData.shipment_details.net_weight) : null,
        package_count: formData.shipment_details.package_count ? Number.parseInt(String(formData.shipment_details.package_count), 10) : null,
        package_type: formData.shipment_details.package_type || null,
        port_of_loading: formData.shipment_details.port_of_loading || null,
        port_of_discharge: formData.shipment_details.port_of_discharge || null,
        vessel_name: formData.shipment_details.vessel_name || null,
        voyage_number: formData.shipment_details.voyage_number || null,
        shipping_line: formData.shipment_details.shipping_line || null,
        incoterms: formData.shipment_details.incoterms || null,
        etd: formData.shipment_details.etd || null,
        eta: formData.shipment_details.eta || null
      }
    }

    saveModeRef.current = asDraft ? 'draft' : 'final'
    saveMutation.mutate(payload)
  }

  const retrySave = () => {
    handleSubmit({ preventDefault: () => {} } as React.SyntheticEvent, saveModeRef.current === 'draft')
  }

  const selectedCustomer = customers?.find((c: any) => c.id === parseInt(formData.customer_id))
  const logoUrl = resolveBrandAssetUrl(settings?.logo_path) || BRAND_LOGO_SRC;

  const partyFromCustomer = (customer: any): InvoiceParty => ({
    companyName:customer?.company_name||'',contactPerson:customer?.contact_person||'',address:customer?.address||'',addressLine1:customer?.address||'',addressLine2:customer?.additional_details?.addressLine2||'',
    city:customer?.additional_details?.city||'',state:customer?.additional_details?.state||'',postalCode:customer?.additional_details?.postalCode||'',country:customer?.country||'',phone:customer?.phone||'',
    altPhone:customer?.additional_details?.altPhone||'',email:customer?.email||'',taxNumber:customer?.tax_number||'',licenseNumber:customer?.additional_details?.licenseNumber||'',website:customer?.additional_details?.website||'',
    gstVatTrn:customer?.additional_details?.gstVatTrn||'',importLicence:customer?.additional_details?.importLicence||'',accountNumber:customer?.additional_details?.accountNumber||'',bankName:customer?.additional_details?.bankName||'',
    iban:customer?.additional_details?.iban||'',swiftCode:customer?.additional_details?.swiftCode||'',routingCode:customer?.additional_details?.routingCode||'',bankAddress:customer?.additional_details?.bankAddress||'',notes:customer?.additional_details?.notes||customer?.additional_details?.instructions||'',instructions:customer?.additional_details?.instructions||'',contactId:customer?.id
  })
  const partyFromBusinessParty = (party: BusinessParty): InvoiceParty => {
    const bank = party.bank_details || {}
    const cleanAddr = party.address_line1 || [party.address_line2, party.city, party.state_region, party.postal_code].filter(Boolean).join(', ')
    return {
      companyName: party.display_name || party.canonical_name,
      contactPerson: party.contact_person || '',
      address: cleanAddr,
      addressLine1: party.address_line1 || '',
      addressLine2: party.address_line2 || '',
      city: party.city || '',
      state: party.state_region || '',
      postalCode: party.postal_code || '',
      country: party.country || '',
      phone: party.phone || '',
      altPhone: party.alternate_phones?.[0] || '',
      email: party.email || '',
      taxNumber: party.pan || party.tin || party.trn || party.tax_identification_number || '',
      licenseNumber: party.trade_license_number || party.iec || '',
      website: party.website || '',
      gstVatTrn: party.gstin || party.trn || '',
      importLicence: party.iec || '',
      gstin: party.gstin || '',
      iec: party.iec || '',
      pan: party.pan || '',
      fssai: party.fssai || '',
      tin: party.tin || '',
      trn: party.trn || '',
      stateCode: party.state_code || '',
      identifiers: party.identifiers || {},
      accountNumber: String(bank.accountNumber || ''),
      bankName: String(bank.bankName || ''),
      iban: String(bank.iban || ''),
      swiftCode: String(bank.swiftCode || ''),
      bankAddress: String(bank.bankAddress || ''),
      notes: party.notes || '',
      instructions: party.notes || '',
      partyId: party.id,
    }
  }
  const companyParty = (): InvoiceParty => {
    const office = settings?.addresses?.afghanistan
    const lines = office?.lines || []
    return { companyName:settings?.company_name||'',address:lines.join(', '),addressLine1:lines.join(', '),country:office?.country||'',phone:settings?.phones?.afghanistan?.[0]||'',email:settings?.emails?.afghanistan?.[0]||'',website:settings?.website||'',licenseNumber:settings?.licence_number||'',taxNumber:settings?.licence_number||'' }
  }
  const setPartyValue = (kind:'shipper'|'consignee'|'notify', value:InvoiceParty) => {
    markDirty(); setSectionStatus(previous=>({...previous,[kind]:'unsaved'}))
    setFormData((previous:any) => kind === 'shipper'
      ? {...previous,shipperExporter:value}
      : kind === 'consignee'
        ? {...previous,consigneeBuyer:value,notifyParty:previous.notifyPartySameAsConsignee?{...value}:previous.notifyParty,notifyPartyEnabled:previous.notifyPartySameAsConsignee?hasInvoicePartyDetails(value):previous.notifyPartyEnabled}
        : {...previous,notifyParty:value,notifyPartyEnabled:hasInvoicePartyDetails(value)})
  }
  const selectPartyContact = (kind:'shipper'|'consignee'|'notify', id?:number) => {
    if (!id) {
      const current = kind === 'shipper' ? formData.shipperExporter : kind === 'consignee' ? formData.consigneeBuyer : formData.notifyParty
      setPartyValue(kind, { ...current, partyId: undefined })
      return
    }
    const party = businessParties?.find((item: BusinessParty) => item.id === id) || SEED_CONSIGNEES.find((item: BusinessParty) => item.id === id)
    if (party) {
      setPartyValue(kind, partyFromBusinessParty(party))
      markDirty()
      return
    }
    const realId = id < 0 ? -id : id
    const customer = customers?.find((item:any) => item.id === realId || item.id === id)
    if (customer) {
      setPartyValue(kind, partyFromCustomer(customer))
      if (kind === 'consignee') {
        setFormData((prev: any) => ({ ...prev, customer_id: String(customer.id) }))
      }
      markDirty()
      return
    }
    const current = kind === 'shipper' ? formData.shipperExporter : kind === 'consignee' ? formData.consigneeBuyer : formData.notifyParty
    setPartyValue(kind, { ...current, partyId: undefined })
  }
  const savePartySection = async (kind:'shipper'|'consignee'|'notify') => {
    const value = kind==='shipper'?formData.shipperExporter:kind==='consignee'?formData.consigneeBuyer:formData.notifyParty
    const errors = validateParty(value,kind!=='notify')
    setPartyErrors(previous=>({...previous,[kind]:errors})); if(Object.keys(errors).length)return
    if(!isEdit){ setSectionStatus(previous=>({...previous,[kind]:'saved'})); markDirty(); return }
    setSectionStatus(previous=>({...previous,[kind]:'saving'}))
    try { const normalizedNotify = kind === 'notify' ? normalizeInvoiceParty(value) : null; const payload = kind==='shipper'?{shipperExporter:value,shipperPartyId:value.partyId||null}:kind==='consignee'?{consigneeBuyer:value,consigneePartyId:value.partyId||null,customer_id:Number(formData.customer_id)}:{notifyParty:normalizedNotify,notifyPartyEnabled:Boolean(normalizedNotify),notifyPartyId:value.partyId||null,notifyPartySameAsConsignee:Boolean(normalizedNotify&&formData.notifyPartySameAsConsignee),notifyPartyCustomerId:normalizedNotify?(formData.notifyPartySameAsConsignee?Number(formData.customer_id):(notifyPartyCustomerId?Number(notifyPartyCustomerId):null)):null}; await invoicesApi.update(invoiceId,payload); await queryClient.invalidateQueries({queryKey:['invoice',invoiceId]}); setSectionStatus(previous=>({...previous,[kind]:'saved'})); setIsDirty(false); setSaveState('saved') } catch { setSectionStatus(previous=>({...previous,[kind]:'error'})) }
  }
  const businessPartyPayload = (kind:'shipper'|'consignee'|'notify', value:InvoiceParty) => {
    const cleanAddr = getCleanPartyDisplayAddress(value) || value.addressLine1 || value.address || null
    return {
      party_type: kind === 'notify' ? 'notify_party' : kind,
      roles: kind === 'consignee' ? ['consignee', 'importer'] : [kind === 'notify' ? 'notify_party' : 'shipper'],
      display_name: value.companyName,
      contact_person: value.contactPerson || null,
      address_line1: cleanAddr,
      address_line2: value.addressLine2 || null,
      city: value.city || null,
      state_region: value.state || null,
      postal_code: value.postalCode || null,
      country: value.country || null,
      phone: value.phone || null,
      alternate_phones: value.altPhone ? [value.altPhone] : [],
      email: value.email || null,
      website: value.website || null,
      trade_license_number: value.licenseNumber || value.iec || null,
      tax_identification_number: value.pan || value.tin || value.taxNumber || null,
      gstin: value.gstin || null,
      iec: value.iec || null,
      pan: value.pan || null,
      fssai: value.fssai || null,
      tin: value.tin || null,
      trn: value.trn || value.gstVatTrn || (kind === 'notify' ? value.taxNumber : null) || null,
      state_code: value.stateCode || null,
      identifiers: { ...(value.identifiers || {}), gstin: value.gstin || undefined, iec: value.iec || undefined, pan: value.pan || undefined, fssai: value.fssai || undefined, tin: value.tin || undefined, trn: value.trn || undefined },
      bank_details: kind === 'notify' ? { accountNumber: value.accountNumber || null, bankName: value.bankName || null, iban: value.iban || null, swiftCode: value.swiftCode || null, bankAddress: value.bankAddress || null } : {},
      notes: value.notes || value.instructions || null,
    }
  }
  const createPartyContact = async (kind:'shipper'|'consignee'|'notify') => {
    const value = kind==='shipper'?formData.shipperExporter:kind==='consignee'?formData.consigneeBuyer:formData.notifyParty
    const errors = validateParty(value)
    setPartyErrors(previous=>({...previous,[kind]:errors}))
    if(Object.keys(errors).length)return
    try {
      const payload = businessPartyPayload(kind,value)
      let created: any
      try {
        created = await businessPartiesApi.create(payload)
      } catch (err: any) {
        const dup = await businessPartiesApi.duplicateCheck(payload).catch(() => null)
        if (dup?.existing?.id) {
          created = await businessPartiesApi.update(dup.existing.id, payload)
        } else {
          throw err
        }
      }
      if (kind === 'consignee' && value.companyName) {
        try {
          const custPayload = {
            company_name: value.companyName,
            contact_person: value.contactPerson || null,
            address: value.addressLine1 || value.address || null,
            country: value.country || null,
            phone: value.phone || null,
            email: value.email || null,
            tax_number: value.taxNumber || value.gstin || value.pan || value.trn || null,
          }
          if (value.contactId) {
            await customersApi.update(value.contactId, custPayload).catch(() => null)
          } else {
            const newCust = await customersApi.create(custPayload).catch(() => null)
            if (newCust?.id) {
              setFormData((prev: any) => ({ ...prev, customer_id: String(newCust.id) }))
            }
          }
        } catch { /* customer sync */ }
      }
      await queryClient.invalidateQueries({queryKey:['business-parties-form']})
      await queryClient.invalidateQueries({queryKey:['business-parties']})
      await queryClient.invalidateQueries({queryKey:['customers']})
      setPartyValue(kind, {...value, partyId: created.id})
      setSectionStatus(previous=>({...previous,[kind]:'saved'}))
      alert(`✅ "${value.companyName}" successfully saved to Trade Directory!`)
    } catch (error: any) {
      alert(`Could not save to directory: ${error?.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }
  const updatePartyContact = async (kind:'shipper'|'consignee'|'notify') => {
    const value = kind==='shipper'?formData.shipperExporter:kind==='consignee'?formData.consigneeBuyer:formData.notifyParty
    if (!confirm(`Update directory record for "${value.companyName}"?`)) return
    try {
      const payload = businessPartyPayload(kind,value)
      let updatedId = value.partyId
      if (value.partyId && value.partyId > 0) {
        try {
          await businessPartiesApi.update(value.partyId, payload)
        } catch (err: any) {
          if (err?.response?.status === 404) {
            const created = await businessPartiesApi.create(payload)
            updatedId = created.id
          } else {
            throw err
          }
        }
      } else {
        const created = await businessPartiesApi.create(payload)
        updatedId = created.id
      }
      if (value.contactId || (value.partyId && value.partyId < 0)) {
        const realCustId = value.contactId || -value.partyId!
        await customersApi.update(realCustId, {
          company_name: value.companyName,
          contact_person: value.contactPerson || null,
          address: value.addressLine1 || value.address || null,
          country: value.country || null,
          phone: value.phone || null,
          email: value.email || null,
          tax_number: value.taxNumber || value.gstin || value.pan || value.trn || null,
        }).catch(() => null)
      }
      await queryClient.invalidateQueries({queryKey:['business-parties-form']})
      await queryClient.invalidateQueries({queryKey:['business-parties']})
      await queryClient.invalidateQueries({queryKey:['customers']})
      setPartyValue(kind, {...value, partyId: updatedId})
      setSectionStatus(previous=>({...previous,[kind]:'saved'}))
      alert(`✅ Directory record for "${value.companyName}" updated successfully!`)
    } catch (error: any) {
      alert(`Could not update directory record: ${error?.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }
  const clearNotifyParty = () => {
    markDirty()
    setNotifyPartyCustomerId('')
    setSaveNotifyPartyAsCustomer(false)
    setPartyErrors(previous => ({ ...previous, notify: {} }))
    setSectionStatus(previous => ({ ...previous, notify: 'unsaved' }))
    setFormData((previous:any) => ({ ...previous, notifyParty:createEmptyNotifyParty(), notifyPartyEnabled:false, notifyPartySameAsConsignee:false }))
  }
  
  // Multilingual preview translations
  const tPreview = previewLang === 'fa' ? {
    invoice_title: 'فاکتور تجاری (Commercial Invoice)',
    invoice_no: 'شماره فاکتور',
    date: 'تاریخ فاکتور',
    due_date: 'تاریخ سررسید',
    exporter: 'فروشنده / صادر کننده',
    consignee: 'خریدار / وارد کننده',
    shipment: 'جزئیات محموله',
    no: 'ردیف',
    desc: 'شرح کالا',
    hs: 'کد تعرفه',
    qty: 'تعداد',
    unit: 'واحد',
    price: 'قیمت واحد',
    amt: 'مبلغ کل',
    subtotal: 'جمع فرعی',
    freight: 'هزینه حمل',
    insurance: 'بیمه',
    other: 'سایر هزینه‌ها',
    discount: 'تخفیف',
    tax: 'مالیات',
    grand: 'جمع کل فاکتور',
    notes: 'یادداشت‌ها',
    signature: 'امضای مجاز',
    stamp: 'مهر شرکت'
  } : previewLang === 'ps' ? {
    invoice_title: 'سوداګریز فاکتور (Commercial Invoice)',
    invoice_no: 'د فاکتور شمیره',
    date: 'نیټه',
    due_date: 'تادیه نیټه',
    exporter: 'پلورونکی / صادرونکی',
    consignee: 'پیرودونکی / واردونکی',
    shipment: 'د محمولې جزیات',
    no: 'شمیره',
    desc: 'د توکو تشریح',
    hs: 'تعرفه کوډ',
    qty: 'شمیر',
    unit: 'واحد',
    price: 'د واحد قیمت',
    amt: 'ټول مبلغ',
    subtotal: 'فرعي مجموعه',
    freight: 'د بار کرایه',
    insurance: 'بیمه',
    other: 'نور لګښتونه',
    discount: 'تخفیف',
    tax: 'مالیات',
    grand: 'ټوله مجموعه فاکتور',
    notes: 'یادښتونه',
    signature: 'لاس‌لیک کونکی',
    stamp: 'د شرکت مهر'
  } : {
    invoice_title: 'COMMERCIAL INVOICE',
    invoice_no: 'Invoice No',
    date: 'Date',
    due_date: 'Due Date',
    exporter: 'Seller / Exporter',
    consignee: 'Buyer / Importer / Consignee',
    shipment: 'Shipment Details',
    no: 'No.',
    desc: 'Description',
    hs: 'HS Code',
    qty: 'Qty',
    unit: 'Unit',
    price: 'Unit Price',
    amt: 'Amount',
    subtotal: 'Subtotal',
    freight: 'Freight Charges',
    insurance: 'Transit Insurance',
    other: 'Other Charges',
    discount: 'Discount',
    tax: 'VAT / Tax',
    grand: 'Grand Total',
    notes: 'Special Notes',
    signature: 'Authorized Signature',
    stamp: 'Company Stamp'
  }

  const isRTL = previewLang === 'fa' || previewLang === 'ps'

  return (
    <div className="invoice-editor-page flex flex-col space-y-6">
      {/* Top action header */}
      <div className="invoice-editor-header invoice-edit-sticky-header flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="invoice-edit-actions flex items-center gap-3">
          <span className={`invoice-save-state ${saveState}`} role="status" aria-live="polite">{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save Failed' : 'Unsaved Changes'}</span>
          <Link
            to="/invoices"
            className="p-2 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <h2 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Invoice' : 'Create New Commercial Invoice'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview Language Toggle switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setPreviewLang('en')}
              className={`px-2.5 py-1 rounded-md transition-colors ${previewLang === 'en' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              EN
            </button>
            <button
              onClick={() => setPreviewLang('fa')}
              className={`px-2.5 py-1 rounded-md transition-colors ${previewLang === 'fa' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              FA
            </button>
            <button
              onClick={() => setPreviewLang('ps')}
              className={`px-2.5 py-1 rounded-md transition-colors ${previewLang === 'ps' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              PS
            </button>
          </div>
          
          <button type="button" onClick={(event)=>handleSubmit(event,true)} disabled={saveMutation.isPending || savingParty} className="invoice-save-draft flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"><Save size={16}/>Save Draft</button>
          <button
            type="button"
            onClick={(event)=>handleSubmit(event,false)}
            disabled={saveMutation.isPending || savingParty}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Save size={16} />
            {savingParty ? 'Saving customer...' : saveMutation.isPending ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {saveError && <div className="invoice-save-error" role="alert" aria-live="assertive">
        <AlertCircle size={18} aria-hidden="true" />
        <div className="invoice-save-error__content">
          <strong>Unable to save invoice</strong>
          <p>{saveError}</p>
        </div>
        <button type="button" onClick={retrySave} disabled={saveMutation.isPending || savingParty}>Retry</button>
      </div>}

      {/* Main split display: Form on left, A4 on right */}
      <div className="invoice-editor-layout">
        {/* Left Side: Inputs */}
        <form onSubmit={handleSubmit} className="invoice-editor-form space-y-6">
          {/* General info card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                <span>General Invoice Details</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Step 1: Core Parameters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Invoice Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SA-2026-0001 (auto-generated if empty)"
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Invoice Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
                >
                  <option value="USD">USD ($) - US Dollar (Default)</option>
                  <option value="AFN">AFN (؋) - Afghan Afghani</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="IRR">IRR (ریال) - Iranian Rial</option>
                </select>
              </div>
            </div>

            {/* Billing Customer / Account */}
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <label htmlFor="billing-customer" className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Billing Customer / Account <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-2xs text-slate-500 block">
                      The accounting ledger profile linked for invoicing & settlement
                    </span>
                  </div>
                </div>
                {selectedCustomer && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-2xs font-extrabold border border-blue-200">
                    <span>{selectedCustomer.country || 'Global'}</span>
                    {selectedCustomer.tax_number && <span>· TIN: {selectedCustomer.tax_number}</span>}
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="billing-customer"
                  required
                  value={formData.customer_id}
                  onChange={(event) => handleCustomerChange(event.target.value)}
                  className="w-full bg-white border-2 border-blue-200 hover:border-blue-400 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="">-- Select Billing Customer --</option>
                  {(customers || []).map((customer: Customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name} {customer.country ? `(${customer.country})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Invoice Date</label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('invoice_date', new Date().toISOString().split('T')[0])}
                    className="text-2xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={formData.invoice_date}
                  onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Due Date</label>
                  <div className="flex items-center gap-1.5 text-2xs font-extrabold text-blue-600">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(formData.invoice_date || Date.now());
                        d.setDate(d.getDate() + 15);
                        handleInputChange('due_date', d.toISOString().split('T')[0]);
                      }}
                      className="hover:underline cursor-pointer"
                    >
                      +15d
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(formData.invoice_date || Date.now());
                        d.setDate(d.getDate() + 30);
                        handleInputChange('due_date', d.toISOString().split('T')[0]);
                      }}
                      className="hover:underline cursor-pointer"
                    >
                      +30d
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(formData.invoice_date || Date.now());
                        d.setDate(d.getDate() + 60);
                        handleInputChange('due_date', d.toISOString().split('T')[0]);
                      }}
                      className="hover:underline cursor-pointer"
                    >
                      +60d
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-extrabold text-sm text-slate-800">Invoice Theme & Layout Template</h3>
              <p className="text-2xs text-slate-500">Design selection does not affect calculations</p>
            </div>
            <TemplateCards value={formData.invoice_template as InvoiceTemplateId} onChange={(value) => handleInputChange('invoice_template', value)} compact />
          </div>

          <div className="invoice-party-editor-stack">
            <InvoicePartyEditor kind="shipper" title="Shipper / Seller / Exporter" value={formData.shipperExporter} customers={customers||[]} businessParties={businessParties||[]} selectedContactId={formData.shipperExporter?.contactId} selectedPartyId={formData.shipperExporter?.partyId} useCompany={useCompanyAsShipper} status={sectionStatus.shipper} errors={partyErrors.shipper} onChange={value=>setPartyValue('shipper',value)} onSelectContact={id=>selectPartyContact('shipper',id)} onSelectBusinessParty={id=>selectPartyContact('shipper',id)} onSaveSection={()=>savePartySection('shipper')} onCreateContact={()=>createPartyContact('shipper')} onUpdateContact={()=>updatePartyContact('shipper')} onToggleCompany={enabled=>{setUseCompanyAsShipper(enabled);if(enabled)setPartyValue('shipper',companyParty())}} />
            <InvoicePartyEditor kind="consignee" title="Consignee / Buyer / Importer" value={formData.consigneeBuyer} customers={customers||[]} businessParties={businessParties||[]} selectedContactId={formData.consigneeBuyer?.contactId} selectedPartyId={formData.consigneeBuyer?.partyId} status={sectionStatus.consignee} errors={partyErrors.consignee} onChange={value=>setPartyValue('consignee',value)} onSelectContact={id=>selectPartyContact('consignee',id)} onSelectBusinessParty={id=>selectPartyContact('consignee',id)} onSaveSection={()=>savePartySection('consignee')} onCreateContact={()=>createPartyContact('consignee')} onUpdateContact={()=>updatePartyContact('consignee')} />
            <InvoicePartyEditor kind="notify" title="Notify Party" optional value={formData.notifyParty} customers={customers||[]} businessParties={businessParties||[]} preferredPartyIds={(relatedNotifyParties||[]).map(party=>party.id)} selectedContactId={formData.notifyParty?.contactId} selectedPartyId={formData.notifyParty?.partyId} sameAsConsignee={formData.notifyPartySameAsConsignee} status={sectionStatus.notify} errors={partyErrors.notify} onChange={value=>setPartyValue('notify',value)} onSelectContact={id=>selectPartyContact('notify',id)} onSelectBusinessParty={id=>selectPartyContact('notify',id)} onSaveSection={()=>savePartySection('notify')} onCreateContact={()=>createPartyContact('notify')} onUpdateContact={()=>updatePartyContact('notify')} onClear={clearNotifyParty} onToggleSame={handleToggleSameAsConsignee} />
          </div>

          <div className="legacy-party-editors" hidden>
          <div className="party-form-grid">
            <section className="party-form-card" aria-labelledby="shipper-card-title">
              <header className="party-form-card__header"><div className="party-form-card__title-group"><span className="party-form-card__icon"><Building2 size={20} aria-hidden="true" /></span><h3 id="shipper-card-title" className="party-form-card__title">SHIPPER / EXPORTER</h3></div></header>
              <div className="party-form-card__body"><PartyFields idPrefix="shipper" party={formData.shipperExporter} onChange={(field,value)=>setFormData((prev:any)=>({...prev,shipperExporter:{...prev.shipperExporter,[field]:value}}))} /></div>
              <footer className="party-save-footer"><small>These shipper details are saved with this invoice and used in preview, print, and PDF.</small></footer>
            </section>
            <section className="party-form-card" aria-labelledby="consignee-card-title">
              <header className="party-form-card__header">
                <div className="party-form-card__title-group">
                  <span className="party-form-card__icon"><Building2 size={20} aria-hidden="true" /></span>
                  <h3 id="consignee-card-title" className="party-form-card__title">CONSIGNEE / IMPORTER</h3>
                </div>
              </header>
              <div className="party-form-card__body">
                <div className="party-form-field party-field--full">
                  <label htmlFor="consignee-customer">Customer profile *</label>
                  <select id="consignee-customer" required value={formData.customer_id} onChange={(e) => handleCustomerChange(e.target.value)} className="party-form-input cursor-pointer">
                    <option value="">-- Choose Customer --</option>
                    {customers?.map((cust: any) => <option key={cust.id} value={cust.id}>{cust.company_name} ({cust.country})</option>)}
                  </select>
                </div>
                {selectedCustomer ? (
                  <dl className="consignee-profile">
                    {[['Company Name', selectedCustomer.company_name], ['Contact Person', selectedCustomer.contact_person], ['Address', selectedCustomer.address], ['Country', selectedCustomer.country], ['Phone', selectedCustomer.phone], ['Email', selectedCustomer.email], ['Tax / TIN Number', selectedCustomer.tax_number]].map(([label, value]) => (
                      <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>
                    ))}
                  </dl>
                ) : <p className="party-empty-state">Choose a customer to load the Consignee / Importer details.</p>}
              </div>
              <footer className="party-save-footer"><div className="saved-customer-badge">Saved Customer</div><small>This consignee is linked to the selected Customers record.</small></footer>
            </section>

            <section className={`party-form-card ${formData.notifyPartySameAsConsignee ? 'party-form-card--linked' : ''}`} aria-labelledby="notify-card-title">
              <header className="party-form-card__header">
                <div className="party-form-card__title-group">
                  <span className="party-form-card__icon"><Bell size={20} aria-hidden="true" /></span>
                  <h3 id="notify-card-title" className="party-form-card__title">NOTIFY PARTY</h3>
                </div>
                <label className="same-party-control" title="Notify Party is the same as Consignee / Importer">
                <input
                  type="checkbox"
                  checked={formData.notifyPartySameAsConsignee || false}
                  onChange={(e) => handleToggleSameAsConsignee(e.target.checked)}
                  aria-label="Notify Party is the same as Consignee / Importer"
                />
                  <span className="same-party-control__visual" aria-hidden="true" />
                  <span>Same as Consignee / Importer</span>
              </label>
              </header>
              <div className="party-form-card__body">
                {!formData.notifyPartySameAsConsignee ? (
                  <><div className="party-form-field party-field--full notify-customer-selector"><label htmlFor="notify-customer">Saved customer (optional)</label><select id="notify-customer" value={notifyPartyCustomerId} onChange={(e) => { const id=e.target.value; setNotifyPartyCustomerId(id); const c=customers?.find((x:any)=>String(x.id)===id); if(c) setFormData((p:any)=>({...p,notifyParty:{...p.notifyParty,companyName:c.company_name||'',contactPerson:c.contact_person||'',address:c.address||'',country:c.country||'',phone:c.phone||'',email:c.email||'',taxNumber:c.tax_number||''}})) }} className="party-form-input"><option value="">Enter details manually</option>{customers?.map((c:any)=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div><PartyFields party={formData.notifyParty} onChange={(field, value) => setFormData((prev: any) => ({ ...prev, notifyParty: { ...prev.notifyParty, [field]: value } }))} /></>
                ) : (
                  <div className="linked-party-state" aria-live="polite"><Link2 size={22} aria-hidden="true" /><div><strong>Using Consignee / Importer details</strong><p>Notify Party information automatically follows the selected consignee record.</p></div></div>
                )}
              </div>
              <footer className="party-save-footer">{formData.notifyPartySameAsConsignee ? <small>Notify Party uses the selected Consignee customer.</small> : <><label className="save-party-option"><input type="checkbox" checked={saveNotifyPartyAsCustomer} onChange={(e)=>setSaveNotifyPartyAsCustomer(e.target.checked)} /><span className="save-party-option__content"><strong>Save to Customers</strong><small>Reuse these Notify Party details on future invoices.</small></span></label>{partySaveError && <p className="party-save-error" role="alert">{partySaveError}</p>}</>}</footer>
            </section>
          </div>

          {false && (<>
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WAVELON IMPEX"
                    value={formData.notifyParty?.companyName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev: any) => ({
                        ...prev,
                        notifyParty: { ...prev.notifyParty, companyName: val }
                      }))
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Purchasing Manager"
                      value={formData.notifyParty?.contactPerson || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, contactPerson: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="e.g. A 4008, RKLP MARKET"
                      value={formData.notifyParty?.address || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, address: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Surat"
                      value={formData.notifyParty?.city || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, city: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. Gujarat"
                      value={formData.notifyParty?.state || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, state: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Postal Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 395010"
                      value={formData.notifyParty?.postalCode || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, postalCode: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      value={formData.notifyParty?.country || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, country: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 261 4409"
                      value={formData.notifyParty?.phone || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, phone: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="e.g. notify@wavelon.in"
                      value={formData.notifyParty?.email || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, email: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tax / TIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. GST-36"
                      value={formData.notifyParty?.taxNumber || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, taxNumber: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. LIC-9981"
                      value={formData.notifyParty?.licenseNumber || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          notifyParty: { ...prev.notifyParty, licenseNumber: val }
                        }))
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

            {formData.notifyPartySameAsConsignee && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[10px] text-blue-700 leading-relaxed">
                <strong>Notify Party linked:</strong> Details are automatically synchronized from the Consignee / Importer profile. To edit them independently, uncheck the option above.
              </div>
            )}
          </>)}

          </div>

          {/* Shipment logistics details */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Shipment & Logistics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Vessel / Plane Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kam Air Cargo / Voyage"
                  value={formData.shipment_details.vessel_name}
                  onChange={(e) => handleShipmentChange('vessel_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Voyage No</label>
                <input
                  type="text"
                  value={formData.shipment_details.voyage_number}
                  onChange={(e) => handleShipmentChange('voyage_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Port of Loading</label>
                <input
                  type="text"
                  value={formData.shipment_details.port_of_loading}
                  onChange={(e) => handleShipmentChange('port_of_loading', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Port of Discharge</label>
                <input
                  type="text"
                  value={formData.shipment_details.port_of_discharge}
                  onChange={(e) => handleShipmentChange('port_of_discharge', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Incoterms</label>
                <select
                  value={formData.shipment_details.incoterms}
                  onChange={(e) => handleShipmentChange('incoterms', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs cursor-pointer"
                >
                  <option value="CIP">CIP</option>
                  <option value="FOB">FOB</option>
                  <option value="CIF">CIF</option>
                  <option value="EXW">EXW</option>
                  <option value="CFR">CFR</option>
                  <option value="DDP">DDP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Booking Number</label>
                <input
                  type="text"
                  value={formData.shipment_details.booking_number}
                  onChange={(e) => handleShipmentChange('booking_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">B/L / AWB No</label>
                <input
                  type="text"
                  value={formData.shipment_details.bill_of_lading_number}
                  onChange={(e) => handleShipmentChange('bill_of_lading_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Container Number</label>
                <input
                  type="text"
                  value={formData.shipment_details.container_number}
                  onChange={(e) => handleShipmentChange('container_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Seal Number</label>
                <input
                  type="text"
                  value={formData.shipment_details.seal_number}
                  onChange={(e) => handleShipmentChange('seal_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Commodity</label>
                <input
                  type="text"
                  value={formData.shipment_details.commodity}
                  onChange={(e) => handleShipmentChange('commodity', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Gross Wt</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shipment_details.gross_weight}
                  onChange={(e) => handleShipmentChange('gross_weight', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Net Wt</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shipment_details.net_weight}
                  onChange={(e) => handleShipmentChange('net_weight', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Pkg Count</label>
                <input
                  type="number"
                  value={formData.shipment_details.package_count}
                  onChange={(e) => handleShipmentChange('package_count', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Pkg Type</label>
                <input
                  type="text"
                  placeholder="e.g. BAGS"
                  value={formData.shipment_details.package_type}
                  onChange={(e) => handleShipmentChange('package_type', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Commercial line items */}
          <section className="commercial-line-items-section space-y-4" aria-labelledby="commercial-line-items-title">
            <header className="commercial-line-items-section__header">
              <div>
                <span className="commercial-line-items-section__eyebrow">Customs-ready detail</span>
                <h3 id="commercial-line-items-title">Commercial Line Items</h3>
                <p>Add product, packaging, weight and customs information.</p>
              </div>
              <div className="commercial-line-items-section__summary">
                <div><span>{formData.items.length} {formData.items.length === 1 ? 'line item' : 'line items'}</span><strong>{formatUSD(itemTotals.subtotal)}</strong></div>
                <button type="button" onClick={handleAddItem} className="commercial-add-line-button"><Plus size={16} /> Add Line Item</button>
              </div>
            </header>

            {/* Quick Commodity Presets */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                <Sparkles size={15} className="text-amber-500 shrink-0" />
                <span>Quick Afghan Commodity Autofill:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '🌰 Dry Figs', name: 'DRY FIGS', hs: '0804.20.10', variety: 'Afghan Dry Figs', unit: 'KGS', pkg: 'BAGS' },
                  { label: '🍇 Green Raisins', name: 'GREEN RAISINS (KISHMISH)', hs: '0806.20.10', variety: 'Kandahar Green Raisins', unit: 'KGS', pkg: 'CARTONS' },
                  { label: '🥜 Afghan Almonds', name: 'AFGHAN ALMONDS (BADAM)', hs: '0802.12.00', variety: 'Mamra / Satarbai', unit: 'KGS', pkg: 'BAGS' },
                  { label: '🌺 Saffron', name: 'AFGHAN SAFFRON (SUPER NEGIN)', hs: '0910.20.10', variety: 'Herat Super Negin', unit: 'GRAMS', pkg: 'BOXES' },
                  { label: '🍈 Pine Nuts', name: 'PINE NUTS (CHILGOZA)', hs: '0802.99.10', variety: 'Afghan Roasted In-Shell', unit: 'KGS', pkg: 'BAGS' },
                  { label: '🌰 Pistachio', name: 'AFGHAN PISTACHIO', hs: '0802.51.00', variety: 'Kandahar Round Pistachio', unit: 'KGS', pkg: 'BAGS' },
                  { label: '🍎 Pomegranate', name: 'FRESH POMEGRANATE', hs: '0810.90.10', variety: 'Kandahar Anar', unit: 'KGS', pkg: 'CRATES' },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      markDirty();
                      const lastIdx = formData.items.length - 1;
                      const currentItem = formData.items[lastIdx];
                      if (!currentItem?.description && !currentItem?.product_name) {
                        setFormData((prev: any) => ({
                          ...prev,
                          items: prev.items.map((line: any, i: number) => i === lastIdx ? {
                            ...line,
                            description: preset.name,
                            product_name: preset.name,
                            hs_code: preset.hs,
                            variety: preset.variety,
                            quantity_unit: preset.unit,
                            weight_unit: preset.unit === 'GRAMS' ? 'GRAMS' : 'KG',
                            package_type: preset.pkg,
                          } : line)
                        }));
                      } else {
                        setFormData((prev: any) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              ...createEmptyCommercialLineItem(prev.currency || 'USD', prev.items.length + 1),
                              description: preset.name,
                              product_name: preset.name,
                              hs_code: preset.hs,
                              variety: preset.variety,
                              quantity_unit: preset.unit,
                              weight_unit: preset.unit === 'GRAMS' ? 'GRAMS' : 'KG',
                              package_type: preset.pkg,
                            }
                          ]
                        }));
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="commercial-line-items-list">
              {formData.items.map((item: CommercialLineItem, idx: number) => <div key={item.local_id || item.id || idx} data-line-item-index={idx}>
                <CommercialLineItemCard
                  item={item}
                  index={idx}
                  currency={formData.currency}
                  errors={itemErrors[item.local_id || String(idx)]}
                  isFirst={idx === 0}
                  isLast={idx === formData.items.length - 1}
                  onChange={(field, value) => handleItemChange(idx, field, value)}
                  onProductSelect={(result, customValue) => handleProductSelect(idx, result, customValue)}
                  onClearProduct={() => handleClearProduct(idx)}
                  onDelete={() => handleRemoveItem(idx)}
                  onDuplicate={() => handleDuplicateItem(idx)}
                  onMove={direction => handleMoveItem(idx, direction)}
                  onBlur={() => validateLineItemAt(idx)}
                  onDragStart={() => { dragIndexRef.current = idx }}
                  onDrop={() => handleDropItem(idx)}
                />
              </div>)}
            </div>

            {/* Live Weight & Metric Totals Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-4.5 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Lines</span>
                  <span className="text-sm font-extrabold text-white">{formData.items.length} {formData.items.length === 1 ? 'Item' : 'Items'}</span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Packages</span>
                  <span className="text-sm font-extrabold text-white">{itemTotals.packages.toLocaleString()} Pkgs</span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-blue-300">Total Net Weight</span>
                  <span className="text-sm font-black text-blue-300">
                    {itemTotals.netWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} KG
                    {itemTotals.netWeight >= 1000 && <small className="text-2xs text-blue-400 ml-1">({(itemTotals.netWeight / 1000).toFixed(2)} MT)</small>}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-amber-300">Tare (Packaging)</span>
                  <span className="text-sm font-bold text-amber-300">
                    +{Math.max(0, Math.round((itemTotals.grossWeight - itemTotals.netWeight) * 1000) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} KG
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-emerald-300">Total Gross Weight</span>
                  <span className="text-sm font-black text-emerald-300">
                    {(itemTotals.grossWeight || itemTotals.netWeight).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} KG
                    {itemTotals.grossWeight >= 1000 && <small className="text-2xs text-emerald-400 ml-1">({((itemTotals.grossWeight || itemTotals.netWeight) / 1000).toFixed(2)} MT)</small>}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-amber-400">Total Goods Value</span>
                  <span className="text-sm font-black text-amber-400">{formatUSD(itemTotals.subtotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  markDirty()
                  setFormData((prev: any) => ({
                    ...prev,
                    shipment_details: {
                      ...prev.shipment_details,
                      net_weight: String(itemTotals.netWeight),
                      gross_weight: String(itemTotals.grossWeight || itemTotals.netWeight),
                      package_count: String(itemTotals.packages),
                      commodity: prev.shipment_details.commodity || prev.items[0]?.description || prev.items[0]?.product_name || ''
                    }
                  }))
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
                title="Synchronize line items net weight, gross weight, and package count into the Shipment & Logistics card"
              >
                <Sparkles size={14} />
                <span>Auto-Sync Cargo Weights to Shipment</span>
              </button>
            </div>
          </section>

          {/* Adjustments & Totals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-600" />
                <span>Freight, CIF Adjustments &amp; Fees ({formData.currency})</span>
              </h3>
              <span className="text-2xs text-slate-400 font-medium">Freight basis: {weight} KG Gross Weight</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Freight Rate / KG (Gross)</label>
                  <span className="text-2xs font-mono font-bold text-blue-700">Rate: {formData.currency} {formData.freight_rate || 0}/KG</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.freight_rate}
                  onChange={(e) => handleInputChange('freight_rate', parseFloat(e.target.value || '0'))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
                <div className="pt-1 text-2xs text-slate-500 flex justify-between">
                  <span>Gross Wt: <b>{weight} KG</b></span>
                  <span>Freight: <b>{formData.currency} {freightValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Transit Insurance ({formData.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.insurance}
                  onChange={(e) => handleInputChange('insurance', parseFloat(e.target.value || '0'))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
                <p className="text-2xs text-slate-400">Cargo maritime / air cargo insurance coverage</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Other Surcharges ({formData.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.other_charges}
                  onChange={(e) => handleInputChange('other_charges', parseFloat(e.target.value || '0'))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
                <p className="text-2xs text-slate-400">Handling, fumigation, or terminal charges</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Discount ({formData.currency}) (-)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', parseFloat(e.target.value || '0'))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Tax / VAT ({formData.currency}) (+)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax}
                  onChange={(e) => handleInputChange('tax', parseFloat(e.target.value || '0'))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Additional Charges Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-blue-100 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Customs &amp; Documentation Certification Fees</h4>
                <span className="text-2xs font-bold text-blue-700">{formatUSD(additionalFees)}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Documentation Fees</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.documentationFees || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || '0');
                      handleInputChange('documentationFees', val >= 0 ? val : 0);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customs Clearance Fees</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customsClearanceFees || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || '0');
                      handleInputChange('customsClearanceFees', val >= 0 ? val : 0);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-blue-100 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-2xs text-slate-400 uppercase font-bold">Goods Subtotal</span>
                  <strong className="text-slate-800 text-sm font-extrabold">{formatUSD(goodsValue)}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-2xs text-slate-400 uppercase font-bold">Freight ({weight} KG)</span>
                  <strong className="text-slate-800 text-sm font-extrabold">{formatUSD(freightCharges)}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 bg-blue-50/50">
                  <span className="block text-2xs text-blue-700 uppercase font-bold">Total CIF Value</span>
                  <strong className="text-blue-900 text-sm font-extrabold">{formatUSD(totalCifValue)}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="block text-2xs text-emerald-700 uppercase font-bold">Grand Total</span>
                  <strong className="text-emerald-900 text-sm font-extrabold">{formatUSD(invoiceGrandTotal)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100 text-xs">
                <span className="block text-slate-500 font-bold mb-1">Amount in Words (Verbal):</span>
                <strong className="text-slate-900 font-black block uppercase bg-white border border-blue-200 rounded-xl p-3 font-mono tracking-wide text-xs">
                  {toWords(invoiceGrandTotal)} US DOLLARS ONLY
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Special Notes / Declarations</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="e.g. Air-freight charges only. Commercial value of goods documented separately."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </form>

        {/* The live editor preview and print preview share the same document component. */}
        <aside className="invoice-editor-preview rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 shadow-sm" aria-label="Live invoice preview">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Eye size={15} className="text-blue-600 shrink-0" />
              <span>Live A4 Document</span>
            </div>
            <div className="flex items-center gap-1.5 text-2xs">
              <button
                type="button"
                onClick={() => setPreviewZoom(z => Math.max(0.28, Math.round((z - 0.04) * 100) / 100))}
                className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Zoom out"
              >
                -
              </button>
              <span className="font-mono font-bold text-slate-600 px-0.5">{Math.round(previewZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setPreviewZoom(z => Math.min(0.75, Math.round((z + 0.04) * 100) / 100))}
                className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Zoom in"
              >
                +
              </button>
              {isEdit && (
                <Link
                  to={`/invoices/${invoiceId}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold transition-colors cursor-pointer ml-1"
                >
                  <Printer size={12} />
                  <span>Print</span>
                </Link>
              )}
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl bg-white/50 p-2 border border-slate-100 flex justify-center">
            <div className="origin-top transition-transform" style={{ zoom: previewZoom }}>
              <PremiumAfghanHeritageInvoice
                invoice={{ ...formData, customer: selectedCustomer }}
                settings={settings}
                template={formData.invoice_template as InvoiceTemplateId}
                logoUrl={logoUrl}
                signatureUrl={resolveBrandAssetUrl(settings?.signature_path)}
                stampUrl={resolveBrandAssetUrl(settings?.stamp_path)}
              />
            </div>
          </div>
        </aside>

        {false && <>
        <div className="w-1/2 bg-slate-200 p-4 overflow-y-auto flex justify-center items-start rounded-xl select-none relative">
          <div className="bg-white text-slate-800 shadow-lg w-[210mm] min-h-[297mm] p-[12mm] relative text-xs flex flex-col justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* 3-5% Opacity Watermark */}
            {settings?.watermark_enabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                <span className="text-7xl font-bold tracking-widest uppercase rotate-[-35deg] border-8 border-slate-800 px-6 py-2">
                  SKY ARIANA
                </span>
              </div>
            )}

            <div className="relative z-10 space-y-6">
              {/* Header: Title & Logo */}
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-50 flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    {!logoError ? (
                      <img
                        src={logoUrl}
                        alt="Sky Ariana company logo"
                        className="w-full h-full object-contain p-1"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <span className="font-black text-blue-600 text-lg tracking-tighter">SA</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-[13px] font-black tracking-tight text-slate-900 uppercase leading-tight">
                      {settings?.company_name || DEFAULT_COMPANY_NAME}
                    </h1>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
                      IMPORT • EXPORT • LOGISTICS • TRANSPORT
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <h2 className="text-xs font-black text-slate-700 tracking-wider">COMMERCIAL INVOICE</h2>
                  <div className="text-[8px] text-slate-400 font-mono space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-500">{tPreview.invoice_no}:</span>{' '}
                      {formData.invoice_number || 'SA-2026-XXXX'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">{tPreview.date}:</span>{' '}
                      {formData.invoice_date}
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-Column Company Offices Address Panel */}
              <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-4">
                {/* Afghanistan Office */}
                <div className="space-y-1.5 text-[9px] leading-relaxed">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1 border-b border-slate-100 pb-0.5">
                    <MapPin size={10} className="text-slate-400 shrink-0" />
                    AFGHANISTAN OFFICE
                  </h4>
                  <p className="text-slate-500 whitespace-pre-line">
                    2nd Floor, Office No. 16
                    Etimad Rahimi Market, Shahidano Chowk
                    Kandahar, Afghanistan
                  </p>
                  <div className="pt-0.5 text-slate-400 space-y-0.5 font-mono">
                    <span className="block font-bold">Licence No: 2401-2198</span>
                    <a href="mailto:info@skyariana.com" className="block text-blue-600">info@skyariana.com</a>
                    <a href="tel:+93700939365" className="block text-slate-500">+93 700 939 365</a>
                  </div>
                </div>

                {/* Iran Office */}
                <div className="space-y-1.5 text-[9px] leading-relaxed">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1 border-b border-slate-100 pb-0.5">
                    <MapPin size={10} className="text-slate-400 shrink-0" />
                    IRAN OFFICE
                  </h4>
                  <p className="text-slate-500 whitespace-pre-line">
                    Cubic Building
                    Bandar Abbas, Iran
                    P.O. Box: 7913973295
                  </p>
                  <div className="pt-0.5 text-slate-400 space-y-0.5 font-mono">
                    <a href="mailto:info@balambarbaran.com" className="block text-blue-600">info@balambarbaran.com</a>
                    <a href="tel:+989172325086" className="block text-slate-500">+98 917 232 5086</a>
                  </div>
                </div>
              </div>

              {/* 3-Column Party Grid */}
              <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                {/* Shipper / Exporter */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[8px] border-b border-slate-100 pb-0.5">
                    SHIPPER / EXPORTER
                  </h4>
                  <div className="text-[9px] text-slate-600 leading-normal space-y-0.5 mt-1.5">
                    <p className="font-bold text-slate-800">{formData.shipperExporter.companyName}</p>
                    {formData.shipperExporter.address && <p>{formData.shipperExporter.address}</p>}
                    {formData.shipperExporter.country && <p>{formData.shipperExporter.country}</p>}
                    {formData.shipperExporter.taxNumber && <p className="font-mono text-[8px] text-slate-400">TIN: {formData.shipperExporter.taxNumber}</p>}
                  </div>
                </div>

                {/* Consignee / Importer */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[8px] border-b border-slate-100 pb-0.5">
                    CONSIGNEE / IMPORTER
                  </h4>
                  <div className="text-[9px] text-slate-600 leading-normal space-y-0.5 mt-1.5">
                    {selectedCustomer ? (
                      <>
                        <p className="font-bold text-slate-800">{selectedCustomer.company_name}</p>
                        {selectedCustomer.contact_person && <p>{selectedCustomer.contact_person}</p>}
                        {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                        {selectedCustomer.country && <p className="font-semibold text-slate-700">{selectedCustomer.country}</p>}
                        {selectedCustomer.tax_number && <p className="font-mono text-[8px] text-slate-400">Tax / TIN: {selectedCustomer.tax_number}</p>}
                        {selectedCustomer.phone && <p className="font-mono">Ph: {selectedCustomer.phone}</p>}
                        {selectedCustomer.email && <p>{selectedCustomer.email}</p>}
                      </>
                    ) : (
                      <p className="text-slate-400 italic">No Consignee Selected</p>
                    )}
                  </div>
                </div>

                {/* Notify Party */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[8px] border-b border-slate-100 pb-0.5">
                    NOTIFY PARTY
                  </h4>
                  <div className="text-[9px] text-slate-600 leading-normal space-y-0.5 mt-1.5">
                    {hasInvoicePartyDetails(formData.notifyParty) ? (
                      <>
                        {formData.notifyParty.companyName && <p className="font-bold text-slate-800">{formData.notifyParty.companyName}</p>}
                        {formData.notifyParty.contactPerson && <p>{formData.notifyParty.contactPerson}</p>}
                        {(formData.notifyParty.addressLine1 || formData.notifyParty.address) && <p>{formData.notifyParty.addressLine1 || formData.notifyParty.address}</p>}
                        {formData.notifyParty.addressLine2 && <p>{formData.notifyParty.addressLine2}</p>}
                        {(formData.notifyParty.city || formData.notifyParty.state || formData.notifyParty.postalCode) && (
                          <p>
                            {[formData.notifyParty.city, formData.notifyParty.state, formData.notifyParty.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                        {formData.notifyParty.country && <p className="font-semibold text-slate-700">{formData.notifyParty.country}</p>}
                        {formData.notifyParty.taxNumber && <p className="font-mono text-[8px] text-slate-400">Tax / TIN: {formData.notifyParty.taxNumber}</p>}
                        {formData.notifyParty.licenseNumber && <p className="font-mono text-[8px] text-slate-400">Lic: {formData.notifyParty.licenseNumber}</p>}
                        {formData.notifyParty.accountNumber && <p>Account: {formData.notifyParty.accountNumber}</p>}
                        {formData.notifyParty.bankName && <p>Bank: {formData.notifyParty.bankName}</p>}
                        {formData.notifyParty.iban && <p className="font-mono">IBAN: {formData.notifyParty.iban}</p>}
                        {formData.notifyParty.swiftCode && <p className="font-mono">SWIFT: {formData.notifyParty.swiftCode}</p>}
                        {formData.notifyParty.phone && <p className="font-mono">Ph: {formData.notifyParty.phone}</p>}
                        {formData.notifyParty.email && <p>{formData.notifyParty.email}</p>}
                        {(formData.notifyParty.notes || formData.notifyParty.instructions) && <p>{formData.notifyParty.notes || formData.notifyParty.instructions}</p>}
                      </>
                    ) : (
                      <p className="text-slate-400 italic">No Notify Party Details</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Logistics grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-4 text-[9px] leading-relaxed">
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Vessel Name</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.vessel_name || 'Kam Air Cargo'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Port of Loading</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.port_of_loading || 'Kandahar/Kabul Airport'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Port of Discharge</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.port_of_discharge || 'Indira Gandhi Int Airport'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Incoterms</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.incoterms || 'CIP'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Gross Weight</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.gross_weight ? `${formData.shipment_details.gross_weight} kg` : '400.00 kg'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">B/L / AWB No</span>
                  <span className="font-semibold text-slate-700">{formData.shipment_details.bill_of_lading_number || 'RQ-992'}</span>
                </div>
              </div>

              {/* Table items */}
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-700 font-bold bg-slate-100">
                    <th className="p-2 w-8 text-center">{tPreview.no}</th>
                    <th className="p-2">{tPreview.desc}</th>
                    <th className="p-2 w-20">{tPreview.hs}</th>
                    <th className="p-2 text-right w-16">Net Weight</th>
                    <th className="p-2 w-12">{tPreview.unit}</th>
                    <th className="p-2 text-right w-20">{tPreview.price}</th>
                    <th className="p-2 text-right w-24">{tPreview.amt}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-800">{item.description || 'Commodity Name'}</td>
                      <td className="p-2 text-slate-500 font-mono text-[9px]">{item.hs_code || '0804.20.10'}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-slate-500 uppercase">{item.unit || 'KGS'}</td>
                      <td className="p-2 text-right">{formData.currency} {Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right font-bold">{formData.currency} {Number((item.quantity * item.unit_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Bank coordinates */}
              <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4">
                {/* Bank details */}
                <div className="space-y-1 text-[9px] leading-relaxed">
                  <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[8px] border-b border-slate-100 pb-0.5">
                    Bank Coordinates
                  </h4>
                  {settings?.bank_details ? (
                    <div className="text-slate-500 space-y-0.5">
                      <span className="block font-semibold">{settings.bank_details.bank_name || 'KOTAK MAHINDRA BANK'}</span>
                      <span className="block">Beneficiary: {settings.bank_details.beneficiary_name || 'SKY ARIANA'}</span>
                      <span className="block">Account No: {settings.bank_details.account_number || '9898015500'}</span>
                      <span className="block font-mono">SWIFT: {settings.bank_details.swift_code || 'KKBKINBBCPC'}</span>
                    </div>
                  ) : (
                    <p className="text-slate-400">No bank coordinates set.</p>
                  )}
                  {formData.notes && (
                    <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200 text-slate-600">
                      <span className="font-semibold block uppercase text-[8px] tracking-wider text-slate-500 mb-0.5">{tPreview.notes}</span>
                      <p className="whitespace-pre-line text-[9px] font-sans leading-normal">{formData.notes}</p>
                    </div>
                  )}
                </div>

                {/* Financial totals breakdown */}
                <div className="space-y-1.5 text-right text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Goods Value</span>
                    <span>{formatUSD(goodsValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Freight Charges ({weight} Gross Wt)</span>
                    <span>{formatUSD(freightCharges)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Insurance</span>
                    <span>{formatUSD(insurance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1 mt-1">
                    <span>Total CIF Value</span>
                    <span>{formatUSD(totalCifValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Documentation Fees</span>
                    <span>{formatUSD(documentationFees)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Customs Clearance Fees</span>
                    <span>{formatUSD(customsClearanceFees)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 border-t-2 border-blue-600 pt-1.5 mt-1.5 text-xs">
                    <span>Invoice Grand Total</span>
                    <span className="text-sm text-blue-900 font-black">{formatUSD(invoiceGrandTotal)}</span>
                  </div>
                  <div className="text-[8px] text-slate-400 mt-1 uppercase text-left font-semibold">
                    <span>Delivery Term: </span>
                    <strong className="text-slate-700">{formData.shipment_details.incoterms || 'CIP'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom signatures & Stamp lines */}
            <div className="relative border-t border-slate-200 pt-6 mt-8">
              <div className="flex justify-between items-end">
                {/* Stamp space */}
                <div className="text-center font-bold text-slate-400 text-[8px] uppercase tracking-wider h-16 w-32 border border-dashed border-slate-200 flex items-center justify-center rounded">
                  {settings?.stamp_path ? (
                    <img src={resolveBrandAssetUrl(settings.stamp_path)} className="object-contain max-h-full max-w-full" alt="Company Stamp" />
                  ) : (
                    <span>{tPreview.stamp}</span>
                  )}
                </div>

                {/* Signature space */}
                <div className="text-center w-40">
                  <div className="h-12 flex items-center justify-center">
                    {settings?.signature_path && (
                      <img src={resolveBrandAssetUrl(settings.signature_path)} className="object-contain max-h-full max-w-full" alt="Authorized Signature" />
                    )}
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700 uppercase tracking-widest text-[8px]">
                    {tPreview.signature}
                  </div>
                </div>
              </div>

              {/* Sticky Footer Addresses: Afghanistan & Iran Office compact lines */}
              <div className="border-t border-slate-100 pt-4 mt-6 text-[8px] text-slate-400 text-center space-y-1">
                <div className="flex justify-center gap-6">
                  <span>AFGHANISTAN: 2nd Floor, Office No. 16, Etimad Rahimi Market, Kandahar • info@skyariana.com • +93 700 939 365</span>
                </div>
                <div className="flex justify-center gap-6">
                  <span>IRAN: Cubic Building, Bandar Abbas • P.O. Box: 7913973295 • info@balambarbaran.com • +98 917 232 5086</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        </>}
      </div>
    </div>
  )
}

export default InvoiceForm
