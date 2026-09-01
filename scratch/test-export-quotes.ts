import {
  dougharounToMersinLegs,
  nimrozToBandarAbbasLegs,
  dogharonToMersinReeferLegs,
  dogharonToMersinReeferCosts,
  generateMultiLegQuote,
  exportCorridorToBillOfLadingRoutes,
  generateQuoteLedgerJournal,
} from "../lib/services/multi-leg-quote-service"

function assertEqual(actual: any, expected: any, description: string) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${description} (Expected: ${expected}, Got: ${actual})`)
    process.exit(1)
  } else {
    console.log(`✅ PASSED: ${description} (Result: ${actual})`)
  }
}

function assertCloseTo(actual: number, expected: number, description: string, delta = 0.05) {
  if (Math.abs(actual - expected) > delta) {
    console.error(`❌ FAILED: ${description} (Expected: ~${expected}, Got: ${actual})`)
    process.exit(1)
  } else {
    console.log(`✅ PASSED: ${description} (Result: ${actual})`)
  }
}

console.log("=== Testing Multi-Leg Export Logistics Engine ===")

// 1. Route 1 Base Legs Sum
const route1LegSum = dougharounToMersinLegs.reduce((sum, leg) => sum + leg.cost, 0)
assertEqual(dougharounToMersinLegs.length, 5, "Route 1 has 5 legs")
assertEqual(route1LegSum, 3100.0, "Route 1 base legs sum to $3,100.00")

// 2. Route 2 Base Legs Sum
const route2LegSum = nimrozToBandarAbbasLegs.reduce((sum, leg) => sum + leg.cost, 0)
assertEqual(nimrozToBandarAbbasLegs.length, 3, "Route 2 has 3 legs")
assertEqual(route2LegSum, 1550.0, "Route 2 base legs sum to $1,550.00")

// 3. User Test Case 1: Nimroz to Bandar Abbas with Ocean to Jebel Ali ($450), Risk ($200), Margin (20%)
const oceanFreightToJebelAli = 450.0
const riskBuffer = 200.0
const targetMargin = 20

const quoteNimroz = generateMultiLegQuote(
  oceanFreightToJebelAli,
  nimrozToBandarAbbasLegs,
  riskBuffer,
  targetMargin,
  { destinationPort: "Jebel Ali, UAE", afnExchangeRate: 70 }
)

assertEqual(quoteNimroz.inlandAndBorderCostUSD, 1550.0, "Inland & Border cost is $1,550.00")
assertEqual(quoteNimroz.oceanFreightCostUSD, 450.0, "Ocean freight cost is $450.00")
assertEqual(quoteNimroz.riskBufferUSD, 200.0, "Risk buffer is $200.00")
assertEqual(quoteNimroz.totalBaseCostUSD, 2200.0, "Total base cost (COGS) is $2,200.00")
assertEqual(quoteNimroz.finalQuotedPriceUSD, 2750.0, "Final quoted price is $2,750.00 (20% margin)")
assertEqual(quoteNimroz.grossProfitUSD, 550.0, "Gross profit is $550.00")
assertEqual(quoteNimroz.targetMarginPercent, 20.0, "Target margin is 20%")
assertEqual(quoteNimroz.effectiveMarkupPercent, 25.0, "Effective markup is 25%")

// 4. User Test Case 2: Dogharon to Mersin Reefer Routing (Refrigerated 40RF)
console.log("\n=== Testing Reefer Export Routing (Dogharon to Mersin Reefer) ===")
const transitTotal = dogharonToMersinReeferCosts.transitLegs.reduce((sum, leg) => sum + leg.cost, 0)
assertEqual(transitTotal, 5300.0, "Reefer transit legs total is $5,300.00")

const grandTotalCost = dogharonToMersinReeferCosts.oceanFreight + transitTotal
assertEqual(grandTotalCost, 12320.0, "Grand total base cost is $12,320.00 ($7,020 Ocean + $5,300 Transit)")

const targetMarginReefer = 15 // 15% Margin
const quoteReefer = generateMultiLegQuote(
  dogharonToMersinReeferCosts.oceanFreight,
  dogharonToMersinReeferLegs,
  0, // no extra risk buffer
  targetMarginReefer,
  {
    destinationPort: "Mersin Port (Turkey)",
    equipmentType: "40RF",
    temperatureSetting: "-18°C Frozen",
    afnExchangeRate: 70,
  }
)

console.log("\n--- Reefer Quotation Dossier ---")
console.log(quoteReefer.formattedDossierText)

assertEqual(quoteReefer.equipmentType, "40RF", "Equipment is 40RF Reefer")
assertEqual(quoteReefer.isReefer, true, "isReefer flag is true")
assertEqual(quoteReefer.escortFeeUSD, 1050.0, "Escort Service fee is $1,050.00")
assertEqual(quoteReefer.pluggingFeeUSD, 700.0, "Plugging charges (7 days) is $700.00")
assertEqual(quoteReefer.commissionFeeUSD, 150.0, "Admin commission is $150.00")
assertEqual(quoteReefer.totalBaseCostUSD, 12320.0, "Grand total base cost is $12,320.00")
assertCloseTo(quoteReefer.finalQuotedPriceUSD, 14494.12, "Final customer quote is $14,494.12 ($12,320 / 0.85)")
assertCloseTo(quoteReefer.grossProfitUSD, 2174.12, "Net profit is $2,174.12 ($14,494.12 - $12,320)")

// 5. BOL Route Conversion Verification for Reefer
const bolReeferRoutes = exportCorridorToBillOfLadingRoutes(dogharonToMersinReeferLegs)
assertEqual(bolReeferRoutes.length, 5, "Converted Reefer BOL routes has 5 stops")
assertEqual(bolReeferRoutes[0].location, "Dogharon/Iran Transit", "Stop 1 location is Dogharon/Iran Transit")
assertEqual(bolReeferRoutes[3].costType, "Plugging Charges (7 Days)", "Stop 4 costType is Plugging Charges (7 Days)")

// 6. Accounting Invariance Verification for Reefer (Net Balance = Total Debit - Total Credit)
const journalReefer = generateQuoteLedgerJournal(quoteReefer, "Ariana Reefer Consignments", "BOL-RF-2026-001")
console.log("\n--- Reefer Ledger Journal Entries ---")
console.log(journalReefer)

journalReefer.forEach((entry, idx) => {
  const calculatedBalance = entry.debitUSD - entry.creditUSD
  assertEqual(entry.balanceUSD, calculatedBalance, `Ledger Entry ${idx + 1} (${entry.description}) verifies Balance = Debit - Credit`)
})

console.log("\n🎉 ALL TESTS INCLUDING REEFER PRICING PASSED SUCCESSFULLY!")
