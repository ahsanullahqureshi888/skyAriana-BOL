const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🏛️ SKY ARIANA BOL - FINANCE & ACCOUNTING CONTROL CENTER');
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

// 1. Fixed-decimal precision arithmetic tests
const roundMoney = (num) => Math.round((Number(num) || 0) * 100) / 100;
const addMoney = (a, b) => roundMoney(roundMoney(a) + roundMoney(b));
const subMoney = (a, b) => roundMoney(roundMoney(a) - roundMoney(b));
const multMoney = (a, b) => roundMoney(roundMoney(a) * roundMoney(b));
const divMoney = (a, b) => {
  const divisor = roundMoney(b);
  if (divisor === 0) return 0;
  return roundMoney(roundMoney(a) / divisor);
};

test('Fixed-point precision prevents IEEE-754 floating point distortion (0.1 + 0.2 === 0.3)', () => {
  const floatSum = 0.1 + 0.2;
  assert.notStrictEqual(floatSum, 0.3, 'Standard JS float 0.1 + 0.2 should have rounding error');
  const safeSum = addMoney(0.1, 0.2);
  assert.strictEqual(safeSum, 0.3, 'addMoney(0.1, 0.2) must strictly equal 0.3');
  
  const multRes = multMoney(19.99, 3);
  assert.strictEqual(multRes, 59.97);
  
  const subRes = subMoney(100.00, 33.33);
  assert.strictEqual(subRes, 66.67);
  
  const divRes = divMoney(100.00, 3);
  assert.strictEqual(divRes, 33.33);
});

// 2. Accounting Invariance Identity
test('Accounting Invariance Identity holds: Net Balance = Total Debit - Total Credit', () => {
  const openingBalance = 0;
  const invoice1Debit = 4500.50;
  const invoice2Debit = 1200.00;
  const debitNoteDebit = 350.00;
  const totalDebit = addMoney(addMoney(invoice1Debit, invoice2Debit), debitNoteDebit); // 6050.50

  const payment1Credit = 3000.00;
  const creditNoteCredit = 250.50;
  const totalCredit = addMoney(payment1Credit, creditNoteCredit); // 3250.50

  const expectedNet = subMoney(totalDebit, totalCredit); // 2800.00
  assert.strictEqual(expectedNet, 2800.00);

  // Invariance check
  const calculatedBalance = addMoney(openingBalance, subMoney(totalDebit, totalCredit));
  assert.strictEqual(calculatedBalance, 2800.00);
});

// 3. Amount in Words Logic Test
function numberToWords(amount, currency = 'USD') {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  function convertGroup(num) {
    let res = '';
    const h = Math.floor(num / 100);
    const rest = num % 100;
    if (h > 0) {
      res += units[h] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      if (rest < 20) {
        res += units[rest];
      } else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        res += tens[t];
        if (u > 0) res += ' ' + units[u];
      }
    }
    return res;
  }

  const rounded = roundMoney(amount);
  if (rounded === 0) return 'Zero';

  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  let words = '';
  let temp = intPart;
  let scaleIndex = 0;

  if (temp === 0) {
    words = 'Zero';
  } else {
    const parts = [];
    while (temp > 0) {
      const group = temp % 1000;
      if (group > 0) {
        const groupWords = convertGroup(group);
        const scale = scales[scaleIndex];
        parts.unshift(scale ? `${groupWords} ${scale}` : groupWords);
      }
      temp = Math.floor(temp / 1000);
      scaleIndex++;
    }
    words = parts.join(' ');
  }

  const currencyNames = {
    USD: { main: 'US Dollars', sub: 'Cents' },
    AED: { main: 'UAE Dirhams', sub: 'Fils' },
    AFN: { main: 'Afghanis', sub: 'Puls' },
    EUR: { main: 'Euros', sub: 'Cents' },
  };

  const cInfo = currencyNames[currency] || { main: currency, sub: 'Units' };
  let finalResult = `${words} ${cInfo.main}`;
  if (decPart > 0) {
    finalResult += ` and ${convertGroup(decPart)} ${cInfo.sub}`;
  } else {
    finalResult += ' Only';
  }
  return finalResult;
}

test('Number to words correctly phrasings USD and AED amounts', () => {
  const usdWords = numberToWords(1250.50, 'USD');
  assert.strictEqual(usdWords, 'One Thousand Two Hundred Fifty US Dollars and Fifty Cents');

  const aedWords = numberToWords(5000.00, 'AED');
  assert.strictEqual(aedWords, 'Five Thousand UAE Dirhams Only');

  const zeroWords = numberToWords(0, 'USD');
  assert.strictEqual(zeroWords, 'Zero');
});

// 4. Multi-Currency Segregation
test('Multi-currency balances are strictly isolated and never implicitly converted', () => {
  const transactions = [
    { currency: 'USD', debit: 1000, credit: 400 },
    { currency: 'USD', debit: 500, credit: 0 },
    { currency: 'AED', debit: 3670, credit: 1000 },
    { currency: 'AFN', debit: 50000, credit: 20000 },
  ];

  const balancesByCurrency = {};
  for (const tx of transactions) {
    if (!balancesByCurrency[tx.currency]) {
      balancesByCurrency[tx.currency] = { debit: 0, credit: 0, balance: 0 };
    }
    balancesByCurrency[tx.currency].debit = addMoney(balancesByCurrency[tx.currency].debit, tx.debit);
    balancesByCurrency[tx.currency].credit = addMoney(balancesByCurrency[tx.currency].credit, tx.credit);
    balancesByCurrency[tx.currency].balance = subMoney(
      balancesByCurrency[tx.currency].debit,
      balancesByCurrency[tx.currency].credit
    );
  }

  assert.strictEqual(balancesByCurrency['USD'].balance, 1100.00);
  assert.strictEqual(balancesByCurrency['AED'].balance, 2670.00);
  assert.strictEqual(balancesByCurrency['AFN'].balance, 30000.00);

  // Asserting that USD balance does not contain AED or AFN
  assert.strictEqual(balancesByCurrency['USD'].debit, 1500.00);
  assert.strictEqual(balancesByCurrency['USD'].credit, 400.00);
});

// 5. Payment Multi-Invoice Allocation & Overpayment Logic
function allocatePayment(invoices, paymentAmount) {
  let remainingPayment = roundMoney(paymentAmount);
  const allocations = [];

  for (const inv of invoices) {
    if (remainingPayment <= 0) break;
    const unpaid = subMoney(inv.total_amount, inv.paid_amount);
    if (unpaid <= 0) continue;

    const allocated = Math.min(remainingPayment, unpaid);
    allocations.push({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      allocated_amount: allocated,
    });
    inv.paid_amount = addMoney(inv.paid_amount, allocated);
    inv.balance_due = subMoney(inv.total_amount, inv.paid_amount);
    inv.status = inv.balance_due === 0 ? 'paid' : 'partial';

    remainingPayment = subMoney(remainingPayment, allocated);
  }

  return {
    allocations,
    unallocated_credit: remainingPayment > 0 ? remainingPayment : 0,
  };
}

test('Multi-invoice payment allocation satisfies exact distribution and records unallocated credit', () => {
  const testInvoices = [
    { id: 'inv-1', invoice_number: 'SA-INV-2026-0001', total_amount: 1000, paid_amount: 0, balance_due: 1000, status: 'unpaid' },
    { id: 'inv-2', invoice_number: 'SA-INV-2026-0002', total_amount: 1500, paid_amount: 500, balance_due: 1000, status: 'partial' },
  ];

  // Pay 2500 -> covers inv-1 (1000), covers inv-2 (1000), leaving 500 unallocated credit
  const result = allocatePayment(testInvoices, 2500);

  assert.strictEqual(result.allocations.length, 2);
  assert.strictEqual(result.allocations[0].allocated_amount, 1000);
  assert.strictEqual(result.allocations[1].allocated_amount, 1000);
  assert.strictEqual(testInvoices[0].status, 'paid');
  assert.strictEqual(testInvoices[0].balance_due, 0);
  assert.strictEqual(testInvoices[1].status, 'paid');
  assert.strictEqual(testInvoices[1].balance_due, 0);
  assert.strictEqual(result.unallocated_credit, 500);
});

// 6. Debit Notes & Credit Notes Integrity
test('Debit and Credit Notes accurately increment and decrement receivable balance', () => {
  let customerBalance = 1000.00;

  // Debit Note (additional charge to customer)
  const debitNoteAmount = 250.00;
  customerBalance = addMoney(customerBalance, debitNoteAmount);
  assert.strictEqual(customerBalance, 1250.00, 'Debit note must increase receivable balance');

  // Credit Note (discount or refund to customer)
  const creditNoteAmount = 150.00;
  customerBalance = subMoney(customerBalance, creditNoteAmount);
  assert.strictEqual(customerBalance, 1100.00, 'Credit note must decrease receivable balance');
});

// 7. Separation of Freight Service Revenue from Cargo Commodity Goods Value
test('Cargo commodity goods_value is strictly excluded from freight revenue and gross profit', () => {
  const bolRecord = {
    bol_number: 'SA-KBL-2026-0891',
    cargo_commodity: 'Automotive Spare Parts',
    goods_value: 250000.00, // Commodity value - NEVER freight revenue
    freight_charges: 4200.00,
    documentation_fee: 150.00,
    handling_fee: 200.00,
  };

  const directShipmentCosts = [
    { type: 'driver_rent', amount: 2800.00 },
    { type: 'border_customs', amount: 350.00 },
    { type: 'port_handling', amount: 150.00 },
  ];

  const totalFreightRevenue = addMoney(
    addMoney(bolRecord.freight_charges, bolRecord.documentation_fee),
    bolRecord.handling_fee
  ); // 4550.00

  // Verify commodity value is NOT included in revenue
  assert.strictEqual(totalFreightRevenue, 4550.00);
  assert(totalFreightRevenue < bolRecord.goods_value, 'Freight revenue must NOT incorporate commodity goods value');

  const totalDirectCosts = directShipmentCosts.reduce((acc, c) => addMoney(acc, c.amount), 0); // 3300.00
  assert.strictEqual(totalDirectCosts, 3300.00);

  const grossProfit = subMoney(totalFreightRevenue, totalDirectCosts); // 1250.00
  assert.strictEqual(grossProfit, 1250.00);

  const grossMarginPercent = roundMoney((grossProfit / totalFreightRevenue) * 100);
  assert.strictEqual(grossMarginPercent, 27.47);
});

// 8. Aging Buckets Calculation
function computeAgingBucket(dueDateStr, asOfDate = new Date()) {
  const dueDate = new Date(dueDateStr);
  const diffTime = asOfDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '1_30';
  if (diffDays <= 60) return '31_60';
  if (diffDays <= 90) return '61_90';
  return '90_plus';
}

test('Aging buckets categorize overdue receivables accurately', () => {
  const now = new Date('2026-03-20T12:00:00Z');
  assert.strictEqual(computeAgingBucket('2026-03-25T00:00:00Z', now), 'current');
  assert.strictEqual(computeAgingBucket('2026-03-10T00:00:00Z', now), '1_30');
  assert.strictEqual(computeAgingBucket('2026-02-05T00:00:00Z', now), '31_60');
  assert.strictEqual(computeAgingBucket('2025-12-30T00:00:00Z', now), '61_90');
  assert.strictEqual(computeAgingBucket('2025-11-01T00:00:00Z', now), '90_plus');
});

// 9. Document Sequence Formatting Standard
test('Monotonic sequence generators conform to standard enterprise patterns', () => {
  const makeId = (prefix, year, seq) => `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  assert.strictEqual(makeId('SA-INV', 2026, 1), 'SA-INV-2026-0001');
  assert.strictEqual(makeId('SA-PAY', 2026, 42), 'SA-PAY-2026-0042');
  assert.strictEqual(makeId('SA-RCP', 2026, 999), 'SA-RCP-2026-0999');
  assert.strictEqual(makeId('SA-DN', 2026, 5), 'SA-DN-2026-0005');
  assert.strictEqual(makeId('SA-CN', 2026, 12), 'SA-CN-2026-0012');
});

// 10. WhatsApp Payment Receipt Text Generation
function generateReceiptWhatsApp(receipt) {
  return `*SKY ARIANA LIMITED — OFFICIAL PAYMENT RECEIPT*
Receipt No: ${receipt.receipt_number}
Date: ${receipt.receipt_date}
Received From: ${receipt.customer_name}
Amount Paid: ${receipt.currency} ${receipt.amount_paid.toFixed(2)}
Amount in Words: ${receipt.amount_in_words}
Payment Method: ${receipt.payment_method.toUpperCase()}
Reference / Tx ID: ${receipt.reference_number || 'N/A'}
Allocated Invoices: ${receipt.allocated_invoices.join(', ')}

Thank you for your business!`;
}

test('WhatsApp receipt generation renders required accounting demarcations', () => {
  const receipt = {
    receipt_number: 'SA-RCP-2026-0014',
    receipt_date: '2026-03-20',
    customer_name: 'Ariana Global Trading',
    currency: 'USD',
    amount_paid: 3500.00,
    amount_in_words: 'Three Thousand Five Hundred US Dollars Only',
    payment_method: 'bank_transfer',
    reference_number: 'TXN-984214',
    allocated_invoices: ['SA-INV-2026-0004', 'SA-INV-2026-0005'],
  };

  const msg = generateReceiptWhatsApp(receipt);
  assert(msg.includes('SA-RCP-2026-0014'));
  assert(msg.includes('USD 3500.00'));
  assert(msg.includes('Three Thousand Five Hundred US Dollars Only'));
  assert(msg.includes('BANK_TRANSFER'));
  assert(msg.includes('SA-INV-2026-0004, SA-INV-2026-0005'));
});

// 11. Canonical Ledger DB File Protection
test('Canonical ledger file .local-ledger-system.json remains undamaged and has valid accounting structure', () => {
  const targetPath = path.join(__dirname, '..', 'data', '.local-ledger-system.json');
  assert(fs.existsSync(targetPath), 'Canonical ledger file must exist in data/');
  const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  assert(Array.isArray(data.accounts), 'Accounts array must exist');
  assert(Array.isArray(data.ledger_transactions), 'Transactions array must exist');
  assert(data.accounts.length >= 40, 'Must preserve at least 40 canonical accounts');
  assert(data.ledger_transactions.length >= 1300, 'Must preserve at least 1300 canonical transactions');
});

console.log(`\n====================================================`);
console.log(`📊 RESULTS: ${passedTests}/${totalTests} Tests Passed!`);
console.log(`====================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
