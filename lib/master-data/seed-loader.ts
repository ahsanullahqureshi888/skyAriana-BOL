import { MasterEntity, MasterEntityType } from '@/lib/types/master-data'
import shipperSeedData from '@/lib/data/shippers-from-pdf.json'
import consigneeSeedData from '@/lib/data/consignees-from-pdf.json'
import notifyPartySeedData from '@/lib/data/notify-parties-from-pdf.json'

const MAJOR_SHIPPING_LINES: Array<Omit<MasterEntity, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'MAERSK LINE (A.P. MOLLER - MAERSK)',
    alias: 'MAERSK',
    type: ['SHIPPING_LINE'],
    country: 'Denmark',
    city: 'Copenhagen',
    address: 'Esplanaden 50, 1098 Copenhagen K, Denmark',
    email: 'info@maersk.com',
    taxId: 'DK58434511',
    notes: 'Global container logistics carrier'
  },
  {
    name: 'MSC MEDITERRANEAN SHIPPING COMPANY',
    alias: 'MSC',
    type: ['SHIPPING_LINE'],
    country: 'Switzerland',
    city: 'Geneva',
    address: 'Chemin Rieu 12-14, 1208 Geneva, Switzerland',
    email: 'info@msc.com',
    notes: 'Major global ocean carrier'
  },
  {
    name: 'CMA CGM GROUP',
    alias: 'CMA CGM',
    type: ['SHIPPING_LINE'],
    country: 'France',
    city: 'Marseille',
    address: '4 Quai d\'Arenc, 13002 Marseille, France',
    email: 'contact@cma-cgm.com',
    notes: 'Ocean and multimodal container shipping'
  },
  {
    name: 'HAPAG-LLOYD AG',
    alias: 'HAPAG LLOYD',
    type: ['SHIPPING_LINE'],
    country: 'Germany',
    city: 'Hamburg',
    address: 'Ballindamm 25, 20095 Hamburg, Germany',
    notes: 'Liner shipping operator'
  },
  {
    name: 'COSCO SHIPPING LINES',
    alias: 'COSCO',
    type: ['SHIPPING_LINE'],
    country: 'China',
    city: 'Shanghai',
    address: '378 Dongdaming Road, Hongkou District, Shanghai, China',
    notes: 'Global container shipping services'
  },
  {
    name: 'OCEAN NETWORK EXPRESS (ONE)',
    alias: 'ONE',
    type: ['SHIPPING_LINE'],
    country: 'Singapore',
    city: 'Singapore',
    address: '7 Straits View, Marina One East Tower, Singapore 018936',
    notes: 'Joint container liner consortium'
  }
]

const KEY_DRIVERS_AND_AGENTS: Array<Omit<MasterEntity, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'SKY ARIANA LOGISTICS LTD',
    alias: 'SKY ARIANA HQ',
    type: ['AGENT', 'SUPPLIER'],
    country: 'Afghanistan',
    city: 'Kabul',
    address: 'Shar-e-Naw, Kabul, Afghanistan',
    taxId: 'AF-SKY-88219',
    phone: '+93 78 888 8888',
    email: 'operations@skyariana.com',
    contactPerson: 'Operations Department',
    notes: 'Sky Ariana Central Operations & Agency'
  },
  {
    name: 'BANDAR ABBAS PORT CLEARANCE AGENCY',
    alias: 'BANDAR AGENT',
    type: ['AGENT'],
    country: 'Iran',
    city: 'Bandar Abbas',
    address: 'Shahid Rajaee Special Economic Zone, Bandar Abbas',
    phone: '+98 76 3351 0000',
    notes: 'Customs and cross-border transit handling'
  },
  {
    name: 'ISLAM QALA TRANSIT FLEET',
    alias: 'ISLAM QALA TRUCKING',
    type: ['DRIVER'],
    country: 'Afghanistan',
    city: 'Herat',
    address: 'Islam Qala Border Terminal, Herat Province',
    phone: '+93 79 900 1122',
    notes: 'Regional border transit drivers and fleet management'
  }
]

function extractTaxOrLicense(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/(?:Licence\s*No|License\s*No|T\.?L\.?\s*No|TRN|Tax\s*ID|VAT)\s*[:#-]?\s*([A-Za-z0-9\/-]+)/i)
  return match && match[1] ? match[1].trim() : undefined
}

export function getDefaultMasterEntities(): MasterEntity[] {
  const result: MasterEntity[] = []
  const seenNames = new Set<string>()

  const add = (candidate: Omit<MasterEntity, 'id' | 'createdAt' | 'updatedAt'>, idPrefix: string) => {
    const key = candidate.name.toUpperCase().trim()
    if (!key || seenNames.has(key)) return
    seenNames.add(key)

    result.push({
      ...candidate,
      id: `${idPrefix}-${result.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  // 1. Shippers
  for (const s of (shipperSeedData as any[])) {
    if (!s.name) continue
    const taxId = extractTaxOrLicense(s.address)
    add({
      name: s.name.trim(),
      type: ['SHIPPER'],
      address: s.address,
      phone: s.contact,
      taxId: taxId,
      country: s.address?.toLowerCase().includes('afghanistan') ? 'Afghanistan' : undefined,
    }, 'ent-sh')
  }

  // 2. Consignees (top 25 to keep initial database quick and pristine)
  const consignees = (consigneeSeedData as any[]).slice(0, 30)
  for (const c of consignees) {
    if (!c.name) continue
    const taxId = extractTaxOrLicense(c.address)
    add({
      name: c.name.trim(),
      type: ['CONSIGNEE'],
      address: c.address,
      phone: c.contact,
      taxId: taxId,
      email: c.email || undefined,
    }, 'ent-cn')
  }

  // 3. Notify Parties
  for (const n of (notifyPartySeedData as any[])) {
    if (!n.name) continue
    add({
      name: n.name.trim(),
      type: ['NOTIFY_PARTY'],
      address: n.address,
      phone: n.contact,
      email: n.email || undefined,
    }, 'ent-np')
  }

  // 4. Shipping lines
  for (const sl of MAJOR_SHIPPING_LINES) {
    add(sl, 'ent-sl')
  }

  // 5. Regional drivers and agents
  for (const da of KEY_DRIVERS_AND_AGENTS) {
    add(da, 'ent-ops')
  }

  return result
}
