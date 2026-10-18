import { MasterEntity, MasterEntityType, MasterEntityBankDetail } from '@/lib/types/master-data'

export function exportMasterEntitiesToCsv(entities: MasterEntity[]): string {
  const headers = [
    'ID',
    'Name',
    'Alias',
    'Roles',
    'Tax ID',
    'Email',
    'Phone',
    'Contact Person',
    'Country',
    'City',
    'Address',
    'Bank Details',
    'Notes',
    'Status',
    'Created At',
    'Updated At'
  ]

  const escapeCsv = (val: string | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = entities.map(e => {
    const bankSummary = (e.bankDetails || [])
      .map(b => `${b.bankName}:${b.accountNo}${b.swift ? `:${b.swift}` : ''}`)
      .join(' | ')

    return [
      escapeCsv(e.id),
      escapeCsv(e.name),
      escapeCsv(e.alias),
      escapeCsv(e.type.join(', ')),
      escapeCsv(e.taxId),
      escapeCsv(e.email),
      escapeCsv(e.phone),
      escapeCsv(e.contactPerson),
      escapeCsv(e.country),
      escapeCsv(e.city),
      escapeCsv(e.address),
      escapeCsv(bankSummary),
      escapeCsv(e.notes),
      escapeCsv(e.isArchived ? 'Archived' : 'Active'),
      escapeCsv(e.createdAt),
      escapeCsv(e.updatedAt)
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}

export function parseMasterEntitiesFromCsv(csvText: string): Omit<MasterEntity, 'id' | 'createdAt' | 'updatedAt'>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length <= 1) return []

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const entities: Omit<MasterEntity, 'id' | 'createdAt' | 'updatedAt'>[] = []

  // Start from line 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i])
    if (cols.length < 2) continue

    const name = cols[1] || cols[0]
    if (!name) continue

    const rawRoles = (cols[3] || 'SHIPPER').toUpperCase()
    const validRoles: MasterEntityType[] = ['SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'AGENT', 'SHIPPING_LINE', 'DRIVER', 'SUPPLIER', 'CUSTOMER']
    
    const assignedRoles: MasterEntityType[] = []
    for (const role of validRoles) {
      if (rawRoles.includes(role)) {
        assignedRoles.push(role)
      }
    }
    if (assignedRoles.length === 0) {
      assignedRoles.push('SHIPPER')
    }

    // Parse bank details if present
    const rawBanks = cols[11] || ''
    const bankDetails: MasterEntityBankDetail[] = []
    if (rawBanks) {
      const bankTokens = rawBanks.split('|')
      for (const token of bankTokens) {
        const parts = token.split(':').map(p => p.trim())
        if (parts.length >= 2) {
          bankDetails.push({
            bankName: parts[0],
            accountNo: parts[1],
            swift: parts[2] || undefined,
            currency: 'USD'
          })
        }
      }
    }

    entities.push({
      name,
      alias: cols[2] || undefined,
      type: assignedRoles,
      taxId: cols[4] || undefined,
      email: cols[5] || undefined,
      phone: cols[6] || undefined,
      contactPerson: cols[7] || undefined,
      country: cols[8] || undefined,
      city: cols[9] || undefined,
      address: cols[10] || undefined,
      bankDetails: bankDetails.length > 0 ? bankDetails : undefined,
      notes: cols[12] || undefined,
      isArchived: cols[13]?.toLowerCase() === 'archived'
    })
  }

  return entities
}

export function downloadMasterEntitiesCsv(entities: MasterEntity[], filename: string = 'sky-ariana-master-data.csv') {
  const csv = exportMasterEntitiesToCsv(entities)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
