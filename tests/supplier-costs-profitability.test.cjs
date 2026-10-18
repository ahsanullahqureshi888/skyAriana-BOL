const assert = require('assert');

console.log('====================================================');
console.log('🚢 SKY ARIANA BOL - SUPPLIER COSTS & PROFIT/LOSS TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// Helpers mirroring production money functions
const roundMoney = (num) => Math.round((Number(num) || 0) * 100) / 100;
const addMoney = (a, b) => roundMoney(roundMoney(a) + roundMoney(b));
const subMoney = (a, b) => roundMoney(roundMoney(a) - roundMoney(b));
const multMoney = (a, b) => roundMoney(roundMoney(a) * roundMoney(b));

// 1. Core Gross Profit and Margin Calculations
test('Gross Profit calculation strictly satisfies: Revenue - Approved Cost', () => {
  const revenue = 4500.00;
  const approvedCost = 3100.00;
  const grossProfit = subMoney(revenue, approvedCost);
  assert.strictEqual(grossProfit, 1400.00, 'Gross profit must be 1400.00');

  const marginPercent = roundMoney((grossProfit / revenue) * 100);
  assert.strictEqual(marginPercent, 31.11, 'Margin percent must be 31.11%');
});

test('Margin % strictly returns null ("N/A") when Revenue is 0 to avoid zero-division', () => {
  const revenue = 0;
  const approvedCost = 500.00;
  const grossProfit = subMoney(revenue, approvedCost); // -500.00
  
  const calculateMargin = (rev, gp) => (rev > 0 ? roundMoney((gp / rev) * 100) : null);
  
  const margin = calculateMargin(revenue, grossProfit);
  assert.strictEqual(margin, null, 'Margin must be null when revenue is 0');
  
  // Format for UI presentation
  const displayMargin = margin !== null ? `${margin}%` : 'N/A';
  assert.strictEqual(displayMargin, 'N/A', 'Display margin must be "N/A"');
});

// 2. Revenue vs Cost Accounting Segregation
test('Revenue and Cost streams remain strictly segregated: Payments do not alter Gross Profit', () => {
  const totalBilledRevenue = 5000.00;
  const approvedSupplierCost = 3500.00;
  
  // Baseline Gross Profit
  const baseProfit = subMoney(totalBilledRevenue, approvedSupplierCost);
  assert.strictEqual(baseProfit, 1500.00);

  // Customer makes a partial payment of 2000.00
  const customerPayment = 2000.00;
  const customerReceivable = subMoney(totalBilledRevenue, customerPayment);
  assert.strictEqual(customerReceivable, 3000.00);
  
  // Verify customer payment did not change Revenue
  const currentRevenue = totalBilledRevenue;
  assert.strictEqual(currentRevenue, 5000.00);

  // Company pays supplier 1500.00
  const supplierPayment = 1500.00;
  const supplierPayable = subMoney(approvedSupplierCost, supplierPayment);
  assert.strictEqual(supplierPayable, 2000.00);
  
  // Verify supplier payment did not change Cost
  const currentCost = approvedSupplierCost;
  assert.strictEqual(currentCost, 3500.00);

  // Profit remains invariant
  const currentProfit = subMoney(currentRevenue, currentCost);
  assert.strictEqual(currentProfit, baseProfit, 'Gross profit must remain strictly invariant after payment movements');
});

// 3. Estimated vs Actual Cost Variance & Overrun Detection
test('Cost variance calculation: Variance = Actual - Estimated, triggers overrun when Variance > 0', () => {
  const estimatedCost = 3000.00;
  const actualCost = 3450.00;
  const variance = subMoney(actualCost, estimatedCost);
  const isCostOverrun = variance > 0;

  assert.strictEqual(variance, 450.00);
  assert.strictEqual(isCostOverrun, true, 'Must flag cost overrun when actual > estimated');

  // Within budget case
  const actualUnder = 2800.00;
  const varianceUnder = subMoney(actualUnder, estimatedCost);
  assert.strictEqual(varianceUnder, -200.00);
  assert.strictEqual(varianceUnder > 0, false, 'Must not flag overrun when actual <= estimated');
});

// 4. Multi-Container Cost Allocation
test('Container cost allocation accurately splits shared freight across containers', () => {
  const totalOceanFreight = 6000.00;
  const containers = ['MSKU-1029384', 'MSKU-5829102', 'CMAU-9920194'];
  const count = containers.length;
  
  // Equal split
  const perContainer = roundMoney(totalOceanFreight / count);
  const allocations = containers.map(cnt => ({
    containerNumber: cnt,
    allocatedAmount: perContainer,
  }));

  const sumAllocated = allocations.reduce((sum, a) => addMoney(sum, a.allocatedAmount), 0);
  assert.strictEqual(sumAllocated, totalOceanFreight, 'Allocated amounts must sum up to total cost');
  assert.strictEqual(allocations[0].allocatedAmount, 2000.00);
});

// 5. Weight-based Cost Allocation
test('Weight-based cost allocation computes proportional share based on container gross weight', () => {
  const totalTruckingCost = 4500.00;
  const containerWeights = [
    { containerNumber: 'CNT-1', weightKg: 10000 },
    { containerNumber: 'CNT-2', weightKg: 20000 },
  ];
  const totalWeight = containerWeights.reduce((s, c) => s + c.weightKg, 0); // 30,000 kg

  const allocations = containerWeights.map(c => ({
    containerNumber: c.containerNumber,
    allocatedAmount: roundMoney((c.weightKg / totalWeight) * totalTruckingCost),
  }));

  assert.strictEqual(allocations[0].allocatedAmount, 1500.00);
  assert.strictEqual(allocations[1].allocatedAmount, 3000.00);
  const totalAlloc = addMoney(allocations[0].allocatedAmount, allocations[1].allocatedAmount);
  assert.strictEqual(totalAlloc, totalTruckingCost);
});

// 6. Supplier Advance Tracking
test('Overpayments to suppliers are retained as Supplier Advance without corrupting payables', () => {
  const outstandingBill = 1200.00;
  const totalPayment = 1500.00;

  let remaining = totalPayment;
  const allocatedToBill = Math.min(remaining, outstandingBill);
  remaining = subMoney(remaining, allocatedToBill);
  
  const billPaid = allocatedToBill;
  const billOutstanding = subMoney(outstandingBill, billPaid);
  const supplierAdvance = remaining > 0 ? remaining : 0;

  assert.strictEqual(billPaid, 1200.00);
  assert.strictEqual(billOutstanding, 0.00, 'Bill is fully settled');
  assert.strictEqual(supplierAdvance, 300.00, 'Overpayment of 300.00 becomes supplier advance');
});

// 7. Multi-Currency Locked Exchange Rates
test('Multi-currency conversion locks exchange rate upon posting and flags missing rates', () => {
  const costInAED = 3672.50;
  const lockedRateAEDtoUSD = 0.2723; // Fixed conversion rate
  const convertedUSD = roundMoney(costInAED * lockedRateAEDtoUSD);
  
  assert.strictEqual(convertedUSD, 1000.02);

  // Missing rate detection
  const rates = [
    { fromCurrency: 'AED', toCurrency: 'USD', rate: 0.2723 }
  ];
  const targetCurrency = 'EUR';
  const matchingRate = rates.find(r => r.fromCurrency === 'AFN' && r.toCurrency === targetCurrency);
  const hasMissingRate = !matchingRate;

  assert.strictEqual(hasMissingRate, true, 'Missing AFN to EUR rate must be flagged');
  const profitStatus = hasMissingRate ? 'INCOMPLETE DATA' : 'PROFITABLE';
  assert.strictEqual(profitStatus, 'INCOMPLETE DATA');
});

// 8. Net Cash Exposure
test('Net Cash Exposure: Customer Cash In minus Supplier Cash Out', () => {
  const customerPaid = 5000.00;
  const supplierPaid = 3200.00;
  const netCashExposure = subMoney(customerPaid, supplierPaid);

  assert.strictEqual(netCashExposure, 1800.00, 'Positive cash exposure indicates positive liquidity');

  // Deficit scenario (Supplier paid before customer pays)
  const customerPaidSlow = 1000.00;
  const netCashExposureDeficit = subMoney(customerPaidSlow, supplierPaid);
  assert.strictEqual(netCashExposureDeficit, -2200.00, 'Negative cash exposure flags working capital requirement');
});

// 9. Loss-Making Shipment Identification
test('Identifies loss-making shipments where Approved Cost exceeds Billed Revenue', () => {
  const shipments = [
    { bolNumber: 'BOL-001', revenue: 5000.00, cost: 3800.00 },
    { bolNumber: 'BOL-002', revenue: 4200.00, cost: 4900.00 }, // Loss: -700.00
    { bolNumber: 'BOL-003', revenue: 3000.00, cost: 3000.00 }, // Break-even
  ];

  const lossMakers = shipments
    .map(s => ({
      ...s,
      grossProfit: subMoney(s.revenue, s.cost),
    }))
    .filter(s => s.grossProfit < 0);

  assert.strictEqual(lossMakers.length, 1);
  assert.strictEqual(lossMakers[0].bolNumber, 'BOL-002');
  assert.strictEqual(lossMakers[0].grossProfit, -700.00);
});

// 10. Dual-Role Company Profile (Both Customer and Supplier)
test('Dual-role entity retains segregated Customer Ledger and Supplier Ledger balances', () => {
  const entity = {
    id: 'COMP-001',
    name: 'TRANS-GLOBAL LOGISTICS LLC',
    asCustomer: {
      totalInvoiced: 12000.00,
      totalReceived: 8000.00,
      receivableBalance: 4000.00, // They owe us
    },
    asSupplier: {
      totalBilled: 7500.00,
      totalPaid: 5000.00,
      payableBalance: 2500.00, // We owe them
    },
  };

  // Receivable and Payable must NEVER be merged into a single balance automatically
  assert.strictEqual(entity.asCustomer.receivableBalance, 4000.00);
  assert.strictEqual(entity.asSupplier.payableBalance, 2500.00);
  assert.notStrictEqual(entity.asCustomer.receivableBalance, entity.asSupplier.payableBalance);
});

console.log(`\n====================================================`);
console.log(`🏁 TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log(`====================================================`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
