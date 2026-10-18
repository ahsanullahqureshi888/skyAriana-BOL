import type { InvoiceParty } from '../types'

const PARTY_DETAIL_KEYS: Array<keyof InvoiceParty> = [
  'companyName',
  'contactPerson',
  'address',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'phone',
  'altPhone',
  'email',
  'taxNumber',
  'licenseNumber',
  'website',
  'gstVatTrn',
  'importLicence',
  'gstin',
  'iec',
  'pan',
  'fssai',
  'tin',
  'trn',
  'stateCode',
  'accountNumber',
  'bankName',
  'iban',
  'swiftCode',
  'routingCode',
  'bankAddress',
  'notes',
  'instructions',
]

export const createEmptyNotifyParty = (): InvoiceParty => ({
  companyName: '',
  contactPerson: '',
  address: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  altPhone: '',
  email: '',
  taxNumber: '',
  licenseNumber: '',
  website: '',
  gstVatTrn: '',
  importLicence: '',
  gstin: '',
  iec: '',
  pan: '',
  fssai: '',
  tin: '',
  trn: '',
  stateCode: '',
  identifiers: {},
  accountNumber: '',
  bankName: '',
  iban: '',
  swiftCode: '',
  routingCode: '',
  bankAddress: '',
  notes: '',
  instructions: '',
})

export const hasInvoicePartyDetails = (party?: Partial<InvoiceParty> | null): boolean =>
  PARTY_DETAIL_KEYS.some((key) => String(party?.[key] ?? '').trim() !== '')

const removeStaleNotifyFragment = (value: unknown): string => {
  const text = String(value ?? '').trim()
  const marker = /\bnotify\s+party\s*:\s*/i.exec(text)
  return marker ? text.slice(0, marker.index).replace(/[\s,;.-]+$/, '') : text
}

export const normalizeInvoiceParty = (party?: Partial<InvoiceParty> | null, stripStaleNotifyFragment = false): InvoiceParty | null => {
  if (!hasInvoicePartyDetails(party)) return null

  const normalized: InvoiceParty = {
    ...createEmptyNotifyParty(),
    ...party,
  }
  const primaryAddress = String(normalized.addressLine1 || normalized.address || '')
  normalized.address = primaryAddress
  normalized.addressLine1 = primaryAddress
  normalized.notes = String(normalized.notes || normalized.instructions || '')
  if (stripStaleNotifyFragment) {
    const fields: Array<keyof InvoiceParty> = [
      'address', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
      'phone', 'altPhone', 'email', 'taxNumber', 'licenseNumber', 'website',
      'gstin', 'iec', 'pan', 'fssai', 'tin', 'trn', 'stateCode', 'notes', 'instructions'
    ]
    const partyRecord = normalized as unknown as Record<string, unknown>
    fields.forEach((field) => { partyRecord[field] = removeStaleNotifyFragment(partyRecord[field]) })
    normalized.address = String(normalized.addressLine1 || normalized.address || '')
    normalized.addressLine1 = normalized.address
  }
  return normalized
}

const KNOWN_COUNTRIES = [
  'India', 'United Arab Emirates', 'UAE', 'Afghanistan', 'Saudi Arabia', 'Qatar',
  'Oman', 'Kuwait', 'Bahrain', 'Turkey', 'Pakistan', 'Iran', 'Germany', 'United Kingdom',
  'UK', 'United States', 'USA', 'China', 'Russia', 'France', 'Italy', 'Netherlands', 'Canada', 'Australia'
]

const normalizeCompName = (name: string) => (name || '').trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ')

/**
 * Parses raw text into clean, structured InvoiceParty fields.
 * Extracts identifiers (GST, IEC, PAN, FSSAI, TRN, Phone, Email, Country)
 * and keeps ONLY clean physical address in addressLine1 without duplicate titles.
 */
export const parsePartyText = (text: string, currentParty?: Partial<InvoiceParty> | null): InvoiceParty => {
  const base: InvoiceParty = {
    ...createEmptyNotifyParty(),
    ...(currentParty || {}),
  }

  if (!text || !text.trim()) {
    return base
  }

  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (rawLines.length === 0) return base

  let companyName = base.companyName || ''
  let contactPerson = base.contactPerson || ''
  let phone = base.phone || ''
  let altPhone = base.altPhone || ''
  let email = base.email || ''
  let country = base.country || ''
  let gstin = base.gstin || ''
  let iec = base.iec || ''
  let pan = base.pan || ''
  let fssai = base.fssai || ''
  let trn = base.trn || ''
  let tin = base.tin || ''
  let taxNumber = base.taxNumber || ''
  let licenseNumber = base.licenseNumber || ''
  let website = base.website || ''

  const cleanAddressLines: string[] = []

  // Extract from each line
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i]

    // Check for Email
    const emailMatch = line.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/i)
    if (emailMatch) {
      if (!email) email = emailMatch[1]
      line = line.replace(/(?:Email|E-mail|Mail)\s*[:#\-]?\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi, '')
        .replace(emailMatch[0], '').trim()
    }

    // Check for Phone
    const phoneMatch = line.match(/(?:Tel|Phone|Mob|Mobile|Cell|Call)\s*[:#\-]?\s*([+\d\s\-().]{7,})/i) ||
      line.match(/(\+91[\s\-]?\d{10}|\+971[\s\-]?\d{8,9}|\+93[\s\-]?\d{9})/i)
    if (phoneMatch) {
      const extractedPhone = phoneMatch[1] ? phoneMatch[1].trim() : phoneMatch[0].trim()
      if (!phone) {
        phone = extractedPhone
      } else if (!altPhone && extractedPhone !== phone) {
        altPhone = extractedPhone
      }
      line = line.replace(/(?:Tel|Phone|Mob|Mobile|Cell|Call)\s*[:#\-]?\s*[+\d\s\-().]{7,}/gi, '')
        .replace(extractedPhone, '').trim()
    }

    // Check for GST / GSTIN
    const gstinMatch = line.match(/(?:GSTIN|GST|GST\s*No|GST\s*#)\s*[:#\-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz]{1}[0-9A-Z]{1})/i) ||
      line.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz]{1}[0-9A-Z]{1})\b/)
    if (gstinMatch) {
      gstin = gstinMatch[1].toUpperCase()
      line = line.replace(/(?:GSTIN|GST|GST\s*No|GST\s*#)\s*[:#\-]?\s*[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz]{1}[0-9A-Z]{1}/gi, '')
        .replace(gstinMatch[0], '').trim()
    }

    // Check for IEC
    const iecMatch = line.match(/(?:IEC|Import\s*Export\s*Code)\s*[:#\-]?\s*([A-Za-z0-9]{10})/i)
    if (iecMatch) {
      iec = iecMatch[1].toUpperCase()
      line = line.replace(/(?:IEC|Import\s*Export\s*Code)\s*[:#\-]?\s*[A-Za-z0-9]{10}/gi, '')
        .replace(iecMatch[0], '').trim()
    }

    // Check for PAN
    const panMatch = line.match(/(?:PAN|PAN\s*No|PAN\s*#)\s*[:#\-]?\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i) ||
      line.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/)
    if (panMatch) {
      pan = panMatch[1].toUpperCase()
      line = line.replace(/(?:PAN|PAN\s*No|PAN\s*#)\s*[:#\-]?\s*[A-Z]{5}[0-9]{4}[A-Z]{1}/gi, '')
        .replace(panMatch[0], '').trim()
    }

    // Check for FSSAI
    const fssaiMatch = line.match(/(?:FSSAI|FSSAI\s*No|FSSAI\s*#)\s*[:#\-]?\s*([0-9]{14})/i) ||
      line.match(/\b([0-9]{14})\b/)
    if (fssaiMatch) {
      fssai = fssaiMatch[1]
      line = line.replace(/(?:FSSAI|FSSAI\s*No|FSSAI\s*#)\s*[:#\-]?\s*[0-9]{14}/gi, '')
        .replace(fssaiMatch[0], '').trim()
    }

    // Check for TRN / Tax ID
    const trnMatch = line.match(/(?:TRN|Tax\s*ID|TRN\s*No|TRN\s*#)\s*[:#\-]?\s*([0-9]{15}|[0-9]{9,16})/i)
    if (trnMatch) {
      trn = trnMatch[1]
      if (!taxNumber) taxNumber = trn
      line = line.replace(/(?:TRN|Tax\s*ID|TRN\s*No|TRN\s*#)\s*[:#\-]?\s*[0-9]{9,16}/gi, '')
        .replace(trnMatch[0], '').trim()
    }

    // Check for Contact Person
    const attnMatch = line.match(/(?:Attn|Attention|Contact|C\/O|Kind\s*Attn)\s*[:#\-]?\s*([^,/]+)/i)
    if (attnMatch) {
      contactPerson = attnMatch[1].trim()
      line = line.replace(/(?:Attn|Attention|Contact|C\/O|Kind\s*Attn)\s*[:#\-]?\s*[^,/]+/gi, '').trim()
    }

    // Clean up residual slashes or colons
    line = line.replace(/^[\s/,;:-]+|[\s/,;:-]+$/g, '').trim()
    if (!line) continue

    // Determine company name (first substantial line)
    if (!companyName) {
      companyName = line
      continue
    }

    // If this line repeats company name, discard it
    if (normalizeCompName(line) === normalizeCompName(companyName)) {
      continue
    }

    // Check if line is solely a country name
    const foundCountry = KNOWN_COUNTRIES.find(c => c.toLowerCase() === line.toLowerCase())
    if (foundCountry) {
      country = foundCountry
      continue
    }

    cleanAddressLines.push(line)
  }

  // If last address line is country, extract it
  if (!country && cleanAddressLines.length > 0) {
    const lastLine = cleanAddressLines[cleanAddressLines.length - 1]
    const foundCountry = KNOWN_COUNTRIES.find(c => lastLine.toLowerCase().includes(c.toLowerCase()))
    if (foundCountry) {
      country = foundCountry
      cleanAddressLines[cleanAddressLines.length - 1] = lastLine.replace(new RegExp(`\\b${foundCountry}\\b`, 'gi'), '').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim()
      if (!cleanAddressLines[cleanAddressLines.length - 1]) cleanAddressLines.pop()
    }
  }

  const cleanAddress = cleanAddressLines.filter(Boolean).join(', ')

  return {
    ...base,
    companyName: companyName.trim(),
    contactPerson: contactPerson.trim(),
    address: cleanAddress,
    addressLine1: cleanAddress,
    country: country.trim() || base.country || '',
    phone: phone.trim(),
    altPhone: altPhone.trim(),
    email: email.trim(),
    gstin: gstin.trim(),
    iec: iec.trim(),
    pan: pan.trim(),
    fssai: fssai.trim(),
    trn: trn.trim(),
    tin: tin.trim() || pan.trim() || trn.trim(),
    taxNumber: taxNumber.trim() || trn.trim() || pan.trim() || gstin.trim(),
    licenseNumber: licenseNumber.trim() || iec.trim(),
    website: website.trim(),
  }
}

/**
 * Returns a completely clean, deduplicated multiline address string for display
 * in invoice cards (PartyCard) - strictly omitting repeated company name, phone,
 * email, and identifier strings.
 */
export const getCleanPartyDisplayAddress = (party?: Partial<InvoiceParty> | null): string => {
  if (!party) return ''

  const rawAddress = String(party.addressLine1 || party.address || '').trim()
  if (!rawAddress) return ''

  const compNameNorm = normalizeCompName(party.companyName || '')
  const phone = (party.phone || '').trim().toLowerCase().replace(/[^\d+]/g, '')
  const email = (party.email || '').trim().toLowerCase()
  const gstin = (party.gstin || '').trim().toLowerCase()
  const iec = (party.iec || '').trim().toLowerCase()
  const pan = (party.pan || '').trim().toLowerCase()
  const fssai = (party.fssai || '').trim().toLowerCase()
  const trn = (party.trn || '').trim().toLowerCase()
  const taxId = (party.taxNumber || '').trim().toLowerCase()

  // Split by newlines or comma breaks
  const lines = rawAddress.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const resultLines: string[] = []

  for (const line of lines) {
    const lineNorm = normalizeCompName(line)
    if (!lineNorm) continue

    // 1. Skip if line is the company name or starts with company name
    if (compNameNorm && (lineNorm === compNameNorm || lineNorm.startsWith(compNameNorm))) {
      continue
    }

    // 2. Skip if line is just identifiers or contact tags
    const lineLower = line.toLowerCase()
    if (
      (gstin && lineLower.includes(gstin)) ||
      (iec && lineLower.includes(iec)) ||
      (pan && lineLower.includes(pan)) ||
      (fssai && lineLower.includes(fssai)) ||
      (trn && lineLower.includes(trn)) ||
      (taxId && lineLower.includes(taxId)) ||
      (phone && lineLower.replace(/[^\d+]/g, '').includes(phone)) ||
      (email && lineLower.includes(email))
    ) {
      // Strip out the identifier portion; if nothing remains, skip
      let stripped = line
        .replace(/(?:GSTIN|GST|IEC|PAN|FSSAI|TRN|TIN|Tax\s*ID|Licence|Tel|Phone|Email)\s*[:#\-]?\s*[^,/]+/gi, '')
        .replace(/[\s/,;:-]+$/g, '')
        .replace(/^[\s/,;:-]+/g, '')
        .trim()
      if (!stripped || normalizeCompName(stripped) === compNameNorm) continue
      resultLines.push(stripped)
      continue
    }

    // Skip if identical to previous line
    if (resultLines.length > 0 && resultLines[resultLines.length - 1].toLowerCase() === lineLower) {
      continue
    }

    resultLines.push(line)
  }

  return resultLines.join('\n')
}

/**
 * Formats full party data into a clean multiline text block for the full-text editor box.
 */
export const formatPartyFullText = (party: InvoiceParty): string => {
  if (!party) return ''
  const cleanAddr = getCleanPartyDisplayAddress(party)
  const parts = [
    party.companyName,
    party.contactPerson ? `Attn: ${party.contactPerson}` : '',
    cleanAddr,
    party.addressLine2,
    [party.city, party.state, party.postalCode].filter(Boolean).join(', '),
    party.country,
    party.phone ? `Tel: ${party.phone}` : '',
    party.altPhone ? `Alt Tel: ${party.altPhone}` : '',
    party.email ? `Email: ${party.email}` : '',
    party.website ? `Web: ${party.website}` : '',
    party.gstin ? `GSTIN: ${party.gstin}` : '',
    party.iec ? `IEC: ${party.iec}` : '',
    party.pan ? `PAN: ${party.pan}` : '',
    party.fssai ? `FSSAI: ${party.fssai}` : '',
    party.trn ? `TRN: ${party.trn}` : '',
    party.taxNumber && party.taxNumber !== party.trn && party.taxNumber !== party.pan ? `Tax ID: ${party.taxNumber}` : '',
    party.licenseNumber && party.licenseNumber !== party.iec ? `Licence: ${party.licenseNumber}` : '',
    party.notes ? `Notes: ${party.notes}` : ''
  ].map(p => (p || '').trim()).filter(Boolean)

  return parts.join('\n')
}
