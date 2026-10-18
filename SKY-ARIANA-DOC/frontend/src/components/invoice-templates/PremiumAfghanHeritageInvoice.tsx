import React from 'react'
import { Bell, Building2, FileText, Landmark, Mail, MapPin, PackageSearch, Phone, PlaneTakeoff } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { InvoiceParty, InvoiceTemplateId } from '../../types'
import { InvoiceBarcode } from '../InvoiceBarcode'
import { getCleanPartyDisplayAddress, normalizeInvoiceParty } from '../../utils/invoiceParty'
import { calculateLineTotal, calculateLineTotals, formatQuantity } from '../../utils/commercialLineItems'
import { BRAND_LOGO_SRC } from '../../config/branding'

type Props = {
  invoice: any
  settings: any
  template: InvoiceTemplateId
  logoUrl: string
  signatureUrl?: string
  stampUrl?: string
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const number = (value: unknown) => (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

const toWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  const scales = ['', 'THOUSAND', 'MILLION', 'BILLION']

  const amount = Number(num) || 0
  if (amount === 0) return 'ZERO'

  let value = Math.floor(amount)
  let scale = 0
  const words: string[] = []

  while (value > 0) {
    const chunk = value % 1000
    if (chunk) {
      const chunkWords: string[] = []
      const hundreds = Math.floor(chunk / 100)
      const remainder = chunk % 100
      if (hundreds) chunkWords.push(`${ones[hundreds]} HUNDRED`)
      if (remainder >= 20) {
        chunkWords.push(tens[Math.floor(remainder / 10)])
        if (remainder % 10) chunkWords.push(ones[remainder % 10])
      } else if (remainder > 0) {
        chunkWords.push(ones[remainder])
      }
      if (scales[scale]) chunkWords.push(scales[scale])
      words.unshift(chunkWords.join(' '))
    }
    value = Math.floor(value / 1000)
    scale += 1
  }

  const cents = Math.round((amount % 1) * 100)
  return `${words.join(' ')}${cents ? ` AND ${cents}/100` : ''}`
}

const flattenValues = (value: any): string[] => {
  if (value === null || value === undefined || value === '') return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(flattenValues)
  if (typeof value === 'object') return Object.values(value).flatMap(flattenValues)
  return []
}

const titleCase = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const uniqueValues = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))]

const companyParty = (settings: any): InvoiceParty => {
  const addresses = settings?.addresses
  const addressValues = uniqueValues(flattenValues(addresses))
  const phones = uniqueValues(flattenValues(settings?.phones))
  const emails = uniqueValues(flattenValues(settings?.emails))
  return {
    companyName: settings?.company_name || '',
    address: addressValues[0] || '',
    addressLine1: addressValues[0] || '',
    country: '',
    phone: phones[0] || '',
    email: emails[0] || '',
    website: settings?.website || '',
    licenseNumber: settings?.licence_number || '',
  }
}

const partyLine = (label: string, value?: unknown) => value ? <p key={label}><span>{label}:</span> {String(value)}</p> : null

const PartyCard: React.FC<{ title: string; party?: Partial<InvoiceParty> | null; accent: 'shipper' | 'consignee' | 'notify'; emptyMessage?: string; sameAsConsignee?: boolean }> = ({ title, party, accent, emptyMessage, sameAsConsignee }) => {
  const normalized = normalizeInvoiceParty(party)
  const cleanAddress = normalized ? getCleanPartyDisplayAddress(normalized) : ''
  const displayCountry = normalized?.country && cleanAddress.toLowerCase().includes(normalized.country.toLowerCase()) ? '' : normalized?.country

  return <section className={`heritage-party-card heritage-party-card--${accent}`}>
    <div className="heritage-party-card__title"><span aria-hidden="true" />{title}</div>
    <div className="heritage-party-card__body">
      {normalized ? <>
        {sameAsConsignee && <div className="heritage-party-linked">Same as Consignee / Importer</div>}
        {normalized.companyName && <h3>{normalized.companyName}</h3>}
        {normalized.contactPerson && <p className="heritage-party-contact">{normalized.contactPerson.startsWith('Attn:') ? normalized.contactPerson : `Attn: ${normalized.contactPerson}`}</p>}
        {cleanAddress && <p className="heritage-party-address" style={{ whiteSpace: 'pre-line' }}>{cleanAddress}</p>}
        {normalized.addressLine2 && !cleanAddress.includes(normalized.addressLine2) && <p>{normalized.addressLine2}</p>}
        {(normalized.city || normalized.state || normalized.postalCode) && !cleanAddress.toLowerCase().includes(String(normalized.city || '').toLowerCase()) && <p>{[normalized.city, normalized.state, normalized.postalCode].filter(Boolean).join(', ')}</p>}
        {displayCountry && <p className="heritage-party-country">{displayCountry}</p>}
        {accent === 'consignee' && partyLine('GST / GSTIN', normalized.gstin || normalized.gstVatTrn)}
        {accent === 'consignee' && partyLine('IEC', normalized.iec || normalized.importLicence)}
        {accent === 'consignee' && partyLine('PAN', normalized.pan)}
        {accent === 'consignee' && partyLine('FSSAI', normalized.fssai)}
        {accent === 'consignee' && partyLine('TIN / TRN', normalized.tin || normalized.trn)}
        {partyLine('Tax / TIN', normalized.taxNumber && normalized.taxNumber !== normalized.pan && normalized.taxNumber !== normalized.gstin && normalized.taxNumber !== normalized.trn ? normalized.taxNumber : null)}
        {partyLine('Licence', normalized.licenseNumber && normalized.licenseNumber !== normalized.iec ? normalized.licenseNumber : null)}
        {partyLine('Account', normalized.accountNumber)}
        {partyLine('Bank', normalized.bankName)}
        {partyLine('IBAN', normalized.iban)}
        {partyLine('SWIFT', normalized.swiftCode)}
        {partyLine('Phone', normalized.phone)}
        {partyLine('Email', normalized.email)}
        {normalized.notes && <p className="heritage-party-note">{normalized.notes}</p>}
      </> : <p className="heritage-party-empty">{emptyMessage || 'No details available'}</p>}
    </div>
  </section>
}

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => <div className="heritage-section-title"><span aria-hidden="true">{icon}</span>{children}</div>

export const PremiumAfghanHeritageInvoice: React.FC<Props> = ({ invoice, settings, template, logoUrl, signatureUrl, stampUrl }) => {
  const shipment = invoice.shipment_details || {}
  const currency = invoice.currency || settings?.default_currency || 'USD'
  const formatMoney = (value: unknown) => `${currency} ${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const firstItem = items[0] || {}
  const itemTotals = calculateLineTotals(items)
  const netWeight = Number(shipment.net_weight || itemTotals.netWeight) || 0
  const grossWeight = Number(shipment.gross_weight || itemTotals.grossWeight || netWeight) || 0
  const totalPackages = Number(shipment.package_count || itemTotals.packages) || 0
  const goodsRate = Number(firstItem.unit_price) || 0
  const freightRate = Number(invoice.freight_rate) || (grossWeight ? (Number(invoice.freight) || 0) / grossWeight : 0)
  const insurance = Number(invoice.insurance) || 0
  const documentationFees = Number(invoice.documentationFees ?? invoice.documentation_fees ?? invoice.other_charges) || 0
  const customsFees = Number(invoice.customsClearanceFees ?? invoice.customs_clearance_fees) || 0
  const goodsValue = roundMoney(itemTotals.subtotal)
  const freightCharges = roundMoney(grossWeight * freightRate)
  const cifUnitRate = roundMoney(goodsRate + freightRate)
  const totalCifValue = roundMoney(goodsValue + freightCharges + insurance)
  const grandTotal = roundMoney(totalCifValue + documentationFees + customsFees)
  const currencyWords = ({ USD: 'US DOLLARS', AFN: 'AFGHANIS', EUR: 'EUROS', GBP: 'POUNDS', IRR: 'RIALS' } as Record<string, string>)[currency] || currency
  const shipper = normalizeInvoiceParty(invoice.shipperExporter ?? invoice.shipper_exporter, true) || companyParty(settings)
  const customer = invoice.customer ? {
    companyName: invoice.customer.company_name || '',
    contactPerson: invoice.customer.contact_person || '',
    address: invoice.customer.address || '',
    addressLine1: invoice.customer.address || '',
    country: invoice.customer.country || '',
    phone: invoice.customer.phone || '',
    email: invoice.customer.email || '',
    taxNumber: invoice.customer.tax_number || '',
  } : null
  const consignee = normalizeInvoiceParty(invoice.consigneeBuyer ?? invoice.consignee_buyer, true) || customer
  const notifyParty = normalizeInvoiceParty(invoice.notifyParty ?? invoice.notify_party)
  const hasBankDetails = Boolean(settings?.bank_details && Object.values(settings.bank_details).some(value => String(value ?? '').trim()))
  const shippingFacts = [
    ['Commodity', shipment.commodity || firstItem.description, <PackageSearch size={13} />],
    ['Vessel / Carrier', shipment.vessel_name || shipment.shipping_line, <PlaneTakeoff size={13} />],
      ['Net Weight', netWeight ? `${number(netWeight)} ${firstItem.weight_unit || firstItem.unit || 'KG'}` : '', <PackageSearch size={13} />],
      ['Gross Weight', grossWeight ? `${number(grossWeight)} ${firstItem.weight_unit || firstItem.unit || 'KG'}` : '', <PackageSearch size={13} />],
    ['Booking / AWB No.', shipment.bill_of_lading_number || shipment.booking_number, <FileText size={13} />],
    ['Voyage / Flight', shipment.voyage_number, <PlaneTakeoff size={13} />],
    ['Port of Loading', shipment.port_of_loading, <MapPin size={13} />],
    ['Port of Discharge', shipment.port_of_discharge, <MapPin size={13} />],
    ['Delivery Term', shipment.incoterms, <Landmark size={13} />],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string, React.ReactNode]>
  const offices = Object.entries(settings?.addresses || {}).map(([name, value]) => ({ name: `${titleCase(name)} Office`, value: uniqueValues(flattenValues(value)).join(', ') })).filter(office => office.value)
  const phones = uniqueValues(flattenValues(settings?.phones))
  const emails = uniqueValues(flattenValues(settings?.emails))
  const watermarkOpacity = Math.max(0, Math.min(1, Number(settings?.invoice_watermark_opacity ?? 0.06) / 0.06))

  return <article className={`invoice-document invoice-template--${template}`} id="invoice-print-root">
    {template === 'premium_afghan_heritage' && (settings?.invoice_watermark_enabled ?? settings?.watermark_enabled ?? true) && <div className="invoice-watermark" style={{ opacity: watermarkOpacity }} aria-hidden="true"><img src="/afghan-heritage-watermark.png" alt="" /></div>}
    <div className="invoice-content">
      <header className="heritage-header print-avoid-break">
        <div className="heritage-brand">
          <div className="heritage-logo-frame">
            <img 
              src={logoUrl || BRAND_LOGO_SRC} 
              alt={`${settings?.company_name || 'Company'} logo`} 
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.onerror = null;
                target.src = BRAND_LOGO_SRC;
              }}
            />
          </div>
          <div className="heritage-brand-copy"><h1>{settings?.company_name || shipper.companyName}</h1>{settings?.subtitle && <p>{settings.subtitle}</p>}</div>
        </div>
        <section className="heritage-meta-card" aria-label="Commercial invoice details">
          <h2>Commercial Invoice</h2>
          <dl>
            <dt>Invoice No.</dt><dd>{invoice.invoice_number}</dd>
            <dt>Date</dt><dd>{invoice.invoice_date}</dd>
            <dt>Due Date</dt><dd>{invoice.due_date}</dd>
            <dt>Currency</dt><dd>{currency}</dd>
          </dl>
        </section>
      </header>
      <div className="heritage-divider" />

      <section className="heritage-party-grid print-avoid-break">
        <PartyCard title="Shipper / Exporter" party={shipper} accent="shipper" />
        <PartyCard title="Consignee / Importer" party={consignee} accent="consignee" />
        <PartyCard title="Notify Party" party={notifyParty} accent="notify" sameAsConsignee={Boolean(notifyParty && invoice.notifyPartySameAsConsignee)} emptyMessage="No Notify Party Details" />
      </section>

      {shippingFacts.length > 0 && <section className="heritage-section heritage-shipping print-avoid-break"><SectionTitle icon={<PlaneTakeoff size={15} />}>Shipment Information</SectionTitle><div className="heritage-fact-grid">{shippingFacts.map(([label, value, icon]) => <div className="heritage-fact" key={label}><span>{icon}{label}</span><strong>{value}</strong></div>)}</div></section>}

      <section className="heritage-value-strip print-avoid-break">
        {/* Legacy rate formulas retained in the source for reference while the summary uses basis-aware totals.
        <div><span>Goods Value</span><strong>{netWeight ? `${number(netWeight)} ${firstItem.unit || 'KG'} × ${formatMoney(goodsRate)}` : formatMoney(goodsValue)}</strong><b>{formatMoney(goodsValue)}</b></div>
        <div><span>Freight Charges</span><strong>{netWeight ? `${number(netWeight)} ${firstItem.unit || 'KG'} × ${formatMoney(freightRate)}` : formatMoney(freightCharges)}</strong><b>{formatMoney(freightCharges)}</b></div>
        <div><span>CIF Unit Rate</span><strong>{formatMoney(goodsRate)} + {formatMoney(freightRate)}</strong><b>{formatMoney(cifUnitRate)} / {firstItem.unit || 'KG'}</b></div>
        */}
        <div><span>Goods Value</span><strong>{items.length} line item{items.length === 1 ? '' : 's'} priced by selected basis</strong><b>{formatMoney(goodsValue)}</b></div>
        <div><span>Freight Charges</span><strong>{grossWeight ? `${number(grossWeight)} ${firstItem.weight_unit || firstItem.unit || 'KG'} gross weight` : 'Shipment gross weight not entered'}</strong><b>{formatMoney(freightCharges)}</b></div>
        <div><span>CIF Unit Rate</span><strong>{formatMoney(cifUnitRate)} / {firstItem.weight_unit || firstItem.unit || 'KG'}</strong><b>{formatMoney(totalCifValue)}</b></div>
      </section>

      <section className="heritage-section heritage-items-section"><SectionTitle icon={<PackageSearch size={15} />}>Invoice Items</SectionTitle><div className="heritage-table-wrap"><table className="heritage-items-table"><thead><tr><th>No.</th><th>Product / Description</th><th>Variety / Grade</th><th>HS Code</th><th>Qty / Unit</th><th>Packages</th><th>Net Wt.</th><th>Gross Wt.</th><th>Unit Price / Basis</th><th>Total Amount</th></tr></thead><tbody>{items.map((item: any, index: number) => {
        const quantity = Number(item.quantity) || 0
        const quantityUnit = item.quantity_unit || item.unit || ''
        const packageCount = Number(item.package_count) || 0
        const packageLabel = [packageCount ? formatQuantity(packageCount) : '', item.package_type || ''].filter(Boolean).join(' ')
        const weightUnit = item.weight_unit || item.unit || 'KG'
        const productName = item.product_name || item.description || '—'
        const varietyGrade = [item.product_variety || item.variety, item.product_grade || item.grade || item.custom_grade].filter(Boolean).join(' / ')
        const description = item.description && item.product_name && item.description !== item.product_name ? item.description : ''
        const displayProductName = item.product_name || item.description || (productName ? '' : productName)
        const legacyQuantityWasWeight = Number(item.net_weight) === 0 && quantity > 0 && ['KG', 'KGS', 'MT', 'G', 'LB', 'TON'].includes(String(item.unit || '').toUpperCase()) && (!item.quantity_unit || String(item.quantity_unit).toUpperCase() === 'PCS')
        const rowNetWeight = Number(item.net_weight) || (legacyQuantityWasWeight ? quantity : 0)
        const rowGrossWeight = Number(item.gross_weight) || (legacyQuantityWasWeight ? rowNetWeight : 0)
        const rowTotal = calculateLineTotal(item) /*
        return <tr key={item.id || index}><td>{index + 1}</td><td>{item.description}</td><td>{item.hs_code || '—'}</td><td>{number(item.quantity)}</td><td>{item.unit}</td><td>{rowWeight ? number(rowWeight) : '—'}</td><td>{rowGrossWeight ? number(rowGrossWeight) : '—'}</td><td>{formatMoney(item.unit_price)}</td><td>{formatMoney(rowTotal)}</td></tr>
        */
        return <tr key={item.id || item.local_id || index}><td>{index + 1}</td><td><strong>{displayProductName}</strong>{description && <small>{description}</small>}</td><td>{varietyGrade || '-'}</td><td>{item.hs_code || '-'}</td><td>{formatQuantity(quantity)} {quantityUnit}</td><td>{packageLabel || '-'}</td><td>{rowNetWeight ? `${formatQuantity(rowNetWeight)} ${weightUnit}` : '-'}</td><td>{rowGrossWeight ? `${formatQuantity(rowGrossWeight)} ${weightUnit}` : '-'}</td><td><strong>{formatMoney(item.unit_price)}</strong><small>{item.price_basis || 'Per KG'}</small></td><td>{formatMoney(rowTotal)}</td></tr>
      })}</tbody></table></div><div className="heritage-items-totals"><span><b>Total Packages</b>{totalPackages ? number(totalPackages) : '-'}</span><span><b>Total Net Weight</b>{netWeight ? `${number(netWeight)} ${firstItem.weight_unit || firstItem.unit || 'KG'}` : '-'}</span><span><b>Total Gross Weight</b>{grossWeight ? `${number(grossWeight)} ${firstItem.weight_unit || firstItem.unit || 'KG'}` : '-'}</span><span><b>Goods Value</b>{formatMoney(goodsValue)}</span></div></section>

      <div className="heritage-lower-grid print-avoid-break">
        <div className="heritage-side-stack">
          {hasBankDetails && <section className="heritage-section heritage-bank"><SectionTitle icon={<Landmark size={15} />}>Beneficiary Bank Details</SectionTitle><div className="heritage-bank-grid">
            {partyLine('Bank Name', settings.bank_details.bank_name)}
            {partyLine('Beneficiary', settings.bank_details.beneficiary_name)}
            {partyLine('Account Number', settings.bank_details.account_number)}
            {partyLine('IBAN', settings.bank_details.iban)}
            {partyLine('SWIFT Code', settings.bank_details.swift_code)}
            {partyLine('Bank Address', settings.bank_details.bank_address)}
          </div></section>}
          {invoice.notes && <section className="heritage-declaration"><h3>Declaration &amp; Terms</h3><p>{invoice.notes}</p></section>}
        </div>
        <section className="heritage-section heritage-summary"><SectionTitle icon={<FileText size={15} />}>Invoice Value Summary</SectionTitle><dl>
          <div><dt>Goods Value</dt><dd>{formatMoney(goodsValue)}</dd></div>
          <div><dt>Freight Charges</dt><dd>{formatMoney(freightCharges)}</dd></div>
          {insurance > 0 && <div><dt>Insurance</dt><dd>{formatMoney(insurance)}</dd></div>}
          <div className="heritage-summary-subtotal"><dt>Total CIF Value</dt><dd>{formatMoney(totalCifValue)}</dd></div>
          {documentationFees > 0 && <div><dt>Documentation Fees</dt><dd>{formatMoney(documentationFees)}</dd></div>}
          {customsFees > 0 && <div><dt>Customs Clearance Fees</dt><dd>{formatMoney(customsFees)}</dd></div>}
          <div className="heritage-summary-total"><dt>Invoice Grand Total</dt><dd>{formatMoney(grandTotal)}</dd></div>
          {shipment.incoterms && <div className="heritage-delivery"><dt>Delivery Term</dt><dd>{shipment.incoterms}</dd></div>}
        </dl></section>
      </div>

      <section className="heritage-words print-avoid-break"><span>Amount in Words</span><strong>{toWords(grandTotal)} {currencyWords} ONLY</strong></section>

      <footer className="heritage-footer print-avoid-break">
        <div className="heritage-reference"><span>Invoice Reference</span>{(settings?.invoice_qr_enabled ?? true) && <QRCodeSVG value={JSON.stringify({ invoice: invoice.invoice_number, date: invoice.invoice_date, total: grandTotal, currency })} size={70} level="M" includeMargin />}</div>
        <div className="heritage-barcode">
          <span>Invoice Barcode</span>
          <InvoiceBarcode value={invoice.invoice_number} showText />
          <div className="heritage-footer-marks">
            {(settings?.invoice_seal_enabled ?? true) && (
              <img 
                src={logoUrl || BRAND_LOGO_SRC} 
                alt="Company seal" 
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.onerror = null;
                  target.src = BRAND_LOGO_SRC;
                }} 
              />
            )}
            {(settings?.invoice_stamp_enabled ?? true) && stampUrl && (
              <img 
                src={stampUrl} 
                alt="Company stamp" 
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }} 
              />
            )}
          </div>
        </div>
        <div className="heritage-signature">
          {(settings?.invoice_signature_enabled ?? true) && signatureUrl && (
            <img 
              src={signatureUrl} 
              alt="Authorized signature" 
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
          )}
          <span>Authorized Signature</span>
        </div>
      </footer>
      {(offices.length || phones.length || emails.length || settings?.website || settings?.licence_number) && <div className="heritage-contact-strip print-avoid-break">
        {offices.slice(0, 2).map(office => <div key={office.name}><MapPin size={12} /><span><strong>{office.name}</strong>{office.value}</span></div>)}
        {phones.slice(0, 1).map(phone => <div key={phone}><Phone size={12} /><span>{phone}</span></div>)}
        {emails.slice(0, 1).map(email => <div key={email}><Mail size={12} /><span>{email}</span></div>)}
        {settings?.website && <div><Building2 size={12} /><span>{settings.website}</span></div>}
        {settings?.licence_number && <div><Bell size={12} /><span>Licence No: {settings.licence_number}</span></div>}
      </div>}
    </div>
  </article>
}
