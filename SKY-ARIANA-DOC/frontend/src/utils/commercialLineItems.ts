import { z } from 'zod'
import { PRICE_BASES, QUANTITY_UNITS, WEIGHT_UNITS } from '../data/dryFruitCatalog'

export type CommercialLineItem = {
  local_id: string
  id?: number
  product_catalog_id?: string
  product_name: string
  variety: string
  grade: string
  custom_grade: string
  description: string
  hs_code: string
  quantity: string
  unit?: string
  quantity_unit: string
  package_count: string
  package_type: string
  net_weight: string
  gross_weight: string
  weight_unit: string
  unit_price: string
  currency: string
  price_basis: string
  country_of_origin: string
  lot_batch_number: string
  remarks: string
  amount?: string
  sort_order: number
  autofill_snapshot?: Record<string, string>
}

const clean = (value: unknown) => value === null || value === undefined ? '' : String(value)
const numeric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const createLineItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const createEmptyCommercialLineItem = (currency = 'USD', sortOrder = 1): CommercialLineItem => ({
  local_id: createLineItemId(),
  product_catalog_id: '',
  product_name: '',
  variety: '',
  grade: '',
  custom_grade: '',
  description: '',
  hs_code: '',
  quantity: '1',
  quantity_unit: 'PCS',
  package_count: '0',
  package_type: '',
  net_weight: '0',
  gross_weight: '0',
  weight_unit: 'KG',
  unit_price: '0',
  currency,
  price_basis: 'Per KG',
  country_of_origin: '',
  lot_batch_number: '',
  remarks: '',
  amount: '0.00',
  sort_order: sortOrder,
})

const normalizeWeightUnit = (value: unknown) => {
  const normalized = clean(value).toUpperCase().replace(/S$/, '')
  return WEIGHT_UNITS.includes(normalized as typeof WEIGHT_UNITS[number]) ? normalized : 'KG'
}

const isWeightUnit = (value: unknown) => ['KG', 'MT', 'G', 'LB', 'TON'].includes(clean(value).toUpperCase().replace(/S$/, ''))

const effectiveNetWeight = (item: Partial<CommercialLineItem>) => {
  const rawNetWeight = item.net_weight
  const legacyUnit = clean(item.unit).toUpperCase().replace(/S$/, '')
  const quantityUnit = clean(item.quantity_unit).toUpperCase().replace(/S$/, '')
  const legacyQuantityWasWeight = numeric(rawNetWeight) === 0 && numeric(item.quantity) > 0 && isWeightUnit(legacyUnit) && (!quantityUnit || quantityUnit === 'PC')
  return rawNetWeight === null || rawNetWeight === undefined || rawNetWeight === '' || legacyQuantityWasWeight ? clean(item.quantity) : clean(rawNetWeight)
}

const effectiveGrossWeight = (item: Partial<CommercialLineItem>) => {
  const rawGrossWeight = item.gross_weight
  return rawGrossWeight === null || rawGrossWeight === undefined || rawGrossWeight === '' || (numeric(rawGrossWeight) === 0 && numeric(effectiveNetWeight(item)) > 0) ? effectiveNetWeight(item) : clean(rawGrossWeight)
}

export const normalizeCommercialLineItem = (value: any, index: number, currency = 'USD'): CommercialLineItem => {
  const legacyQuantity = value?.quantity ?? value?.net_weight ?? 1
  const quantityUnit = value?.quantity_unit || value?.unit || 'PCS'
  const legacyUnit = clean(value?.unit).toUpperCase().replace(/S$/, '')
  const legacyQuantityWasWeight = numeric(value?.net_weight) === 0 && numeric(value?.quantity) > 0 && isWeightUnit(legacyUnit) && (!value?.quantity_unit || clean(value?.quantity_unit).toUpperCase() === 'PCS')
  const netWeight = value?.net_weight === null || value?.net_weight === undefined || value?.net_weight === '' || legacyQuantityWasWeight ? legacyQuantity : value.net_weight
  const grossWeight = value?.gross_weight === null || value?.gross_weight === undefined || value?.gross_weight === '' || (numeric(value?.gross_weight) === 0 && numeric(netWeight) > 0 && legacyQuantityWasWeight) ? netWeight : value.gross_weight
  const normalized = createEmptyCommercialLineItem(currency, index + 1)
  return {
    ...normalized,
    local_id: clean(value?.local_id || value?.client_id || value?.id || normalized.local_id),
    id: value?.id,
    product_catalog_id: clean(value?.product_catalog_id || value?.product_id),
    product_name: clean(value?.product_name || value?.productName),
    variety: clean(value?.variety || value?.product_variety),
    grade: clean(value?.grade || value?.product_grade),
    custom_grade: clean(value?.custom_grade),
    description: clean(value?.description || value?.product_name),
    hs_code: clean(value?.hs_code),
    quantity: clean(legacyQuantity),
    quantity_unit: clean(quantityUnit),
    package_count: clean(value?.package_count ?? 0),
    package_type: clean(value?.package_type),
    net_weight: clean(netWeight),
    gross_weight: clean(grossWeight),
    weight_unit: normalizeWeightUnit(value?.weight_unit || value?.unit),
    unit_price: clean(value?.unit_price ?? 0),
    currency: clean(value?.currency || currency),
    price_basis: clean(value?.price_basis || 'Per KG'),
    country_of_origin: clean(value?.country_of_origin),
    lot_batch_number: clean(value?.lot_batch_number || value?.lot_batch),
    remarks: clean(value?.remarks),
    amount: clean(value?.amount ?? '0.00'),
    sort_order: Number(value?.sort_order || index + 1),
    autofill_snapshot: value?.autofill_snapshot || undefined,
  }
}

const decimalParts = (value: unknown) => {
  const text = clean(value).trim().replace(/,/g, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return { integer: 0n, scale: 0 }
  const negative = text.startsWith('-')
  const unsigned = negative ? text.slice(1) : text
  const [whole, fraction = ''] = unsigned.split('.')
  const integer = BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n)
  return { integer, scale: fraction.length }
}

const decimalString = (integer: bigint, scale: number) => {
  const negative = integer < 0n
  const absolute = (negative ? -integer : integer).toString().padStart(scale + 1, '0')
  if (!scale) return `${negative ? '-' : ''}${absolute}`
  const splitAt = absolute.length - scale
  return `${negative ? '-' : ''}${absolute.slice(0, splitAt)}.${absolute.slice(splitAt)}`.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

const multiplyDecimalStrings = (left: unknown, right: unknown) => {
  const a = decimalParts(left)
  const b = decimalParts(right)
  return decimalString(a.integer * b.integer, a.scale + b.scale)
}

const addDecimalStrings = (values: unknown[]) => {
  let integer = 0n
  let scale = 0
  for (const value of values) {
    const part = decimalParts(value)
    if (part.scale > scale) {
      integer *= 10n ** BigInt(part.scale - scale)
      scale = part.scale
    }
    integer += part.integer * 10n ** BigInt(scale - part.scale)
  }
  return decimalString(integer, scale)
}

const sumDecimalNumbers = (values: unknown[]) => numeric(addDecimalStrings(values))

const roundMoneyString = (value: unknown) => {
  const { integer, scale } = decimalParts(value)
  if (scale <= 2) return `${decimalString(integer, scale)}${scale === 0 ? '.00' : scale === 1 ? '0' : ''}`
  const divisor = 10n ** BigInt(scale - 2)
  const quotient = integer / divisor
  const remainder = integer < 0n ? -(integer % divisor) : integer % divisor
  const rounded = remainder * 2n >= divisor ? quotient + (integer >= 0n ? 1n : -1n) : quotient
  return decimalString(rounded, 2)
}

const weightToKg = (value: unknown, unit: string) => {
  const factors: Record<string, string> = { KG: '1', MT: '1000', G: '0.001', LB: '0.45359237', TON: '1000' }
  return multiplyDecimalStrings(value, factors[normalizeWeightUnit(unit)] || '1')
}

const billableQuantity = (item: Partial<CommercialLineItem>) => {
  const basis = clean(item.price_basis || 'Per KG')
  if (basis === 'Per Piece') return clean(item.quantity)
  if (basis === 'Per Carton' || basis === 'Per Bag' || basis === 'Per Package') return clean(item.package_count)
  const kg = weightToKg(effectiveNetWeight(item), clean(item.weight_unit || 'KG'))
  if (basis === 'Per MT') return multiplyDecimalStrings(kg, '0.001')
  if (basis === 'Per LB') return multiplyDecimalStrings(kg, '2.2046226218')
  return kg
}

export const calculateLineTotalDecimal = (item: Partial<CommercialLineItem>) => roundMoneyString(multiplyDecimalStrings(billableQuantity(item), item.unit_price || '0'))

export const calculateLineTotal = (item: Partial<CommercialLineItem>) => numeric(calculateLineTotalDecimal(item))

export const formatAmount = (value: unknown, currency = 'USD') => `${currency} ${numeric(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatQuantity = (value: unknown) => numeric(value).toLocaleString('en-US', { maximumFractionDigits: 3 })

export const buildCalculationLabel = (item: Partial<CommercialLineItem>) => {
  const basis = clean(item.price_basis || 'Per KG')
  const unit = basis === 'Per Piece' ? item.quantity_unit || 'PCS' : basis === 'Per Carton' ? 'CTN' : basis === 'Per Bag' ? 'BAG' : basis === 'Per Package' ? 'PKG' : basis.replace('Per ', '')
  const quantity = `${formatQuantity(billableQuantity(item))} ${unit}` /*
  return `${quantity} × ${formatAmount(item.unit_price || 0, item.currency || 'USD')} (${basis}) = ${formatAmount(calculateLineTotal(item), item.currency || 'USD')}`
  */
  return `${quantity} x ${formatAmount(item.unit_price || 0, item.currency || 'USD')} (${basis}) = ${formatAmount(calculateLineTotal(item), item.currency || 'USD')}`
}

export const calculateLineTotals = (items: Partial<CommercialLineItem>[]) => ({
  subtotal: sumDecimalNumbers(items.map(item => calculateLineTotalDecimal(item))),
  netWeight: sumDecimalNumbers(items.map(item => effectiveNetWeight(item))),
  grossWeight: sumDecimalNumbers(items.map(item => effectiveGrossWeight(item))),
  packages: sumDecimalNumbers(items.map(item => item.package_count)),
})

const numericText = (label: string, required = false) => z.string().trim().refine(value => !required && value === '' || /^\d+(?:\.\d+)?$/.test(value), `${label} must be a non-negative number.`)

export const commercialLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required.'),
  hs_code: z.string().trim().refine(value => value === '' || /^\d+(?:\.\d+)*$/.test(value), 'HS code may contain numbers and dots only.'),
  quantity: numericText('Quantity', true).refine(value => numeric(value) > 0, 'Quantity must be greater than zero.'),
  package_count: numericText('Number of packages'),
  net_weight: numericText('Net weight'),
  gross_weight: numericText('Gross weight'),
  unit_price: numericText('Unit price'),
  grade: z.string().optional(),
  custom_grade: z.string().optional(),
}).superRefine((item, context) => {
  if (numeric(item.gross_weight) < numeric(item.net_weight)) context.addIssue({ code: 'custom', path: ['gross_weight'], message: 'Gross weight must be greater than or equal to net weight.' })
})

export type CommercialLineItemErrors = Record<string, string>

export const validateCommercialLineItem = (item: Partial<CommercialLineItem>): CommercialLineItemErrors => {
  const result = commercialLineItemSchema.safeParse({
    description: clean(item.description),
    hs_code: clean(item.hs_code),
    quantity: clean(item.quantity),
    package_count: clean(item.package_count),
    net_weight: clean(item.net_weight),
    gross_weight: clean(item.gross_weight),
    unit_price: clean(item.unit_price),
    grade: clean(item.grade),
    custom_grade: clean(item.custom_grade),
  })
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0] || 'description'), issue.message]))
}

export const hasCommercialLineItemData = (item: Partial<CommercialLineItem>) => [
  item.product_name, item.description, item.variety, item.grade, item.hs_code, item.package_type,
  item.country_of_origin, item.lot_batch_number, item.remarks,
].some(value => Boolean(clean(value).trim())) || numeric(item.quantity) !== 1 || numeric(item.net_weight) !== 0 || numeric(item.gross_weight) !== 0 || numeric(item.unit_price) !== 0 || numeric(item.package_count) !== 0

export const supportedQuantityUnits = [...QUANTITY_UNITS]
export const supportedWeightUnits = [...WEIGHT_UNITS]
export const supportedPriceBases = [...PRICE_BASES]
