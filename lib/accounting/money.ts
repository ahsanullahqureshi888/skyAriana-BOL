/**
 * High-precision financial arithmetic utilities.
 * Avoids IEEE 754 floating point inaccuracies (e.g. 0.1 + 0.2 !== 0.3)
 * by computing in integer cents/fractions.
 */

export function roundMoney(amount: number | string | null | undefined, decimals = 2): number {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0)
  if (isNaN(num)) return 0
  const factor = Math.pow(10, decimals)
  return Math.round((num + Number.EPSILON) * factor) / factor
}

export function toCents(amount: number | string | null | undefined): number {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0)
  if (isNaN(num)) return 0
  return Math.round((num + Number.EPSILON) * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function multiplyMoney(quantity: number | string, rate: number | string): number {
  const q = typeof quantity === "string" ? parseFloat(quantity) : Number(quantity || 0)
  const r = typeof rate === "string" ? parseFloat(rate) : Number(rate || 0)
  if (isNaN(q) || isNaN(r)) return 0
  return roundMoney(q * r)
}

export function sumMoney(amounts: (number | string | null | undefined)[]): number {
  const totalCents = amounts.reduce<number>((acc, curr) => {
    return acc + toCents(curr)
  }, 0)
  return fromCents(totalCents)
}

export function subtractMoney(a: number | string, b: number | string): number {
  return fromCents(toCents(a) - toCents(b))
}

export function calculateFinancialTotals(
  charges: { quantity: number; rate: number; tax?: number; discount?: number }[]
): {
  subtotal: number
  totalDiscount: number
  netBeforeTax: number
  totalTax: number
  grandTotal: number
} {
  let subtotalCents = 0
  let discountCents = 0
  let taxCents = 0

  for (const c of charges) {
    const lineAmt = toCents(multiplyMoney(c.quantity, c.rate))
    subtotalCents += lineAmt
    discountCents += toCents(c.discount || 0)
    taxCents += toCents(c.tax || 0)
  }

  const netBeforeTaxCents = subtotalCents - discountCents
  const grandTotalCents = netBeforeTaxCents + taxCents

  return {
    subtotal: fromCents(subtotalCents),
    totalDiscount: fromCents(discountCents),
    netBeforeTax: fromCents(netBeforeTaxCents),
    totalTax: fromCents(taxCents),
    grandTotal: fromCents(grandTotalCents),
  }
}
