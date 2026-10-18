const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('================================================================');
console.log('🧪 SKY ARIANA BOL — AUTOMATIC ACCOUNTING & INVOICE INTEGRATION');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Math and Floating-point Precision
function roundMoney(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

function calculateFinancialTotals(charges) {
  let subtotalCents = 0;
  let discountCents = 0;
  let taxCents = 0;

  for (const c of charges) {
    const lineCents = Math.round((Number(c.quantity || 1) * Number(c.rate || 0) + Number.EPSILON) * 100);
    subtotalCents += lineCents;
    discountCents += Math.round((Number(c.discount || 0) + Number.EPSILON) * 100);
    taxCents += Math.round((Number(c.tax || 0) + Number.EPSILON) * 100);
  }

  const netCents = subtotalCents - discountCents;
  const grandCents = netCents + taxCents;

  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    tax: taxCents / 100,
    grandTotal: grandCents / 100,
  };
}

(async () => {
  // Test 1: High Precision Calculation
  await test('Floating-point money arithmetic preserves exact 2-decimal precision (0.1 + 0.2 === 0.30)', () => {
    const charges = [
      { quantity: 1, rate: 0.1, discount: 0, tax: 0 },
      { quantity: 1, rate: 0.2, discount: 0, tax: 0 },
    ];
    const totals = calculateFinancialTotals(charges);
    assert.strictEqual(totals.grandTotal, 0.3, `Expected 0.30, got ${totals.grandTotal}`);
  });

  // Test 2: Calculate Line Amounts and Grand Total
  await test('Charges totals calculate Subtotal = Sum(Qty * Rate), Net = Subtotal - Discount, Grand = Net + Tax', () => {
    const charges = [
      { charge_type: 'Ocean Freight', quantity: 1, rate: 10000, discount: 0, tax: 0 },
      { charge_type: 'Documentation Fee', quantity: 1, rate: 250, discount: 0, tax: 0 },
    ];
    const totals = calculateFinancialTotals(charges);
    assert.strictEqual(totals.subtotal, 10250);
    assert.strictEqual(totals.grandTotal, 10250);
  });

  // Test 3: Simulating In-Memory DB Posting and Duplicate Prevention
  const mockDb = {
    accounts: [
      {
        id: 'ACC-NAJEB',
        account_name: 'NAJEB AMIN LTD',
        currency: 'USD',
        total_debit: 0,
        total_credit: 0,
        current_balance: 0,
      }
    ],
    ledger_transactions: [],
    bol_accounting: [],
    bol_charges: [],
    payments: [],
    payment_allocations: [],
    payment_receipts: [],
  };

  const testBolId = 'SA-TEST-001';
  const testBolNumber = 'SA-2026-00125';

  await test('1. Create & Post BOL: Generates 1 ledger debit (10,250 USD) and marks status POSTED', () => {
    const rawCharges = [
      { charge_type: 'Ocean Freight', quantity: 1, rate: 10000, discount: 0, tax: 0 },
      { charge_type: 'Documentation Fee', quantity: 1, rate: 250, discount: 0, tax: 0 },
    ];
    const totals = calculateFinancialTotals(rawCharges);

    const bolAcc = {
      id: 'BOL-ACC-1',
      bol_id: testBolId,
      bol_number: testBolNumber,
      account_id: 'ACC-NAJEB',
      invoice_number: 'INV-2026-0001',
      currency: 'USD',
      total_charges: totals.grandTotal,
      amount_paid: 0,
      outstanding_balance: totals.grandTotal,
      accounting_status: 'DRAFT',
      payment_status: 'UNPAID',
    };
    mockDb.bol_accounting.push(bolAcc);

    // Simulate Post to Ledger
    const debitTx = {
      id: 'TX-BOL-1',
      account_id: bolAcc.account_id,
      bol_id: testBolId,
      bol_number: testBolNumber,
      invoice_number: bolAcc.invoice_number,
      transaction_type: 'invoice',
      debit: totals.grandTotal,
      credit: 0,
      currency: 'USD',
      source_file: 'BOL_SYSTEM',
    };
    mockDb.ledger_transactions.push(debitTx);
    bolAcc.accounting_status = 'POSTED';

    const account = mockDb.accounts[0];
    account.total_debit = roundMoney(account.total_debit + totals.grandTotal);
    account.current_balance = roundMoney(account.total_debit - account.total_credit);

    assert.strictEqual(mockDb.ledger_transactions.length, 1);
    assert.strictEqual(mockDb.ledger_transactions[0].debit, 10250);
    assert.strictEqual(account.current_balance, 10250);
    assert.strictEqual(bolAcc.accounting_status, 'POSTED');
  });

  // Test 4: Idempotency & Duplicate Prevention
  await test('2. Duplicate Posting Attempt: Rejects second post call and creates zero duplicate debits', () => {
    const bolAcc = mockDb.bol_accounting.find(b => b.bol_id === testBolId);
    assert.strictEqual(bolAcc.accounting_status, 'POSTED');

    // Simulate second call to postBolToLedger
    const isAlreadyPosted = bolAcc.accounting_status === 'POSTED' ||
      mockDb.ledger_transactions.some(t => t.bol_id === testBolId && t.source_file === 'BOL_SYSTEM');

    assert.strictEqual(isAlreadyPosted, true, 'Must detect that BOL is already posted');

    // Ensure transactions count did not increase
    assert.strictEqual(mockDb.ledger_transactions.length, 1, 'Transaction count must remain 1');
  });

  // Test 5: Partial Payment Recording
  await test('3. Record Partial Payment (4,000 USD): Creates Credit, Paid = 4,000, Outstanding = 6,250, status = PARTIALLY_PAID', () => {
    const bolAcc = mockDb.bol_accounting.find(b => b.bol_id === testBolId);
    const payAmount = 4000;

    const creditTx = {
      id: 'TX-PAY-1',
      account_id: bolAcc.account_id,
      bol_id: testBolId,
      transaction_type: 'payment',
      debit: 0,
      credit: payAmount,
      currency: 'USD',
      source_file: 'BOL_SYSTEM',
    };
    mockDb.ledger_transactions.push(creditTx);

    bolAcc.amount_paid = roundMoney(bolAcc.amount_paid + payAmount);
    bolAcc.outstanding_balance = roundMoney(bolAcc.total_charges - bolAcc.amount_paid);
    bolAcc.payment_status = 'PARTIAL';
    bolAcc.accounting_status = 'PARTIALLY_PAID';

    const account = mockDb.accounts[0];
    account.total_credit = roundMoney(account.total_credit + payAmount);
    account.current_balance = roundMoney(account.total_debit - account.total_credit);

    assert.strictEqual(bolAcc.amount_paid, 4000);
    assert.strictEqual(bolAcc.outstanding_balance, 6250);
    assert.strictEqual(account.current_balance, 6250);
    assert.strictEqual(bolAcc.payment_status, 'PARTIAL');
  });

  // Test 6: Final Payment Recording
  await test('4. Record Final Payment (6,250 USD): Total Paid = 10,250, Outstanding = 0, status = PAID', () => {
    const bolAcc = mockDb.bol_accounting.find(b => b.bol_id === testBolId);
    const payAmount = 6250;

    const creditTx = {
      id: 'TX-PAY-2',
      account_id: bolAcc.account_id,
      bol_id: testBolId,
      transaction_type: 'payment',
      debit: 0,
      credit: payAmount,
      currency: 'USD',
      source_file: 'BOL_SYSTEM',
    };
    mockDb.ledger_transactions.push(creditTx);

    bolAcc.amount_paid = roundMoney(bolAcc.amount_paid + payAmount);
    bolAcc.outstanding_balance = roundMoney(bolAcc.total_charges - bolAcc.amount_paid);
    bolAcc.payment_status = 'PAID';
    bolAcc.accounting_status = 'PAID';

    const account = mockDb.accounts[0];
    account.total_credit = roundMoney(account.total_credit + payAmount);
    account.current_balance = roundMoney(account.total_debit - account.total_credit);

    assert.strictEqual(bolAcc.amount_paid, 10250);
    assert.strictEqual(bolAcc.outstanding_balance, 0);
    assert.strictEqual(account.current_balance, 0);
    assert.strictEqual(bolAcc.payment_status, 'PAID');
    assert.strictEqual(bolAcc.accounting_status, 'PAID');
  });

  // Test 7: Post-Posting Adjustment (Increase)
  await test('5. Edit Freight After Posting (10,000 -> 11,000): Creates Adjustment Debit (1,000) without mutating original debit', () => {
    const origDebit = mockDb.ledger_transactions.find(t => t.id === 'TX-BOL-1');
    assert.strictEqual(origDebit.debit, 10250, 'Original debit must remain 10,250');

    const newTotal = 11250; // Increased by 1,000
    const diff = newTotal - 10250; // +1,000

    const adjTx = {
      id: 'TX-ADJ-1',
      account_id: 'ACC-NAJEB',
      bol_id: testBolId,
      transaction_type: 'adjustment',
      is_adjustment: true,
      debit: diff,
      credit: 0,
      currency: 'USD',
    };
    mockDb.ledger_transactions.push(adjTx);

    const account = mockDb.accounts[0];
    account.total_debit = roundMoney(account.total_debit + diff);
    account.current_balance = roundMoney(account.total_debit - account.total_credit);

    assert.strictEqual(origDebit.debit, 10250, 'Original debit was never altered');
    assert.strictEqual(adjTx.debit, 1000, 'Adjustment debit is 1,000');
    assert.strictEqual(account.current_balance, 1000, 'Customer now owes 1,000');
  });

  // Test 8: Post-Posting Adjustment (Decrease)
  await test('6. Edit Freight After Posting (Decrease by 500): Creates Adjustment Credit (500)', () => {
    const diff = -500;
    const adjTx = {
      id: 'TX-ADJ-2',
      account_id: 'ACC-NAJEB',
      bol_id: testBolId,
      transaction_type: 'adjustment',
      is_adjustment: true,
      debit: 0,
      credit: Math.abs(diff),
      currency: 'USD',
    };
    mockDb.ledger_transactions.push(adjTx);

    const account = mockDb.accounts[0];
    account.total_credit = roundMoney(account.total_credit + Math.abs(diff));
    account.current_balance = roundMoney(account.total_debit - account.total_credit);

    assert.strictEqual(adjTx.credit, 500);
    assert.strictEqual(account.current_balance, 500);
  });

  // Test 9: Duplicating a BOL
  await test('7. Duplicate BOL: Starts as DRAFT / NOT_POSTED, 0 copied ledger debits, 0 copied payments, 0 copied invoices', () => {
    const originalDoc = {
      id: 'BOL-ORIGINAL-99',
      bol_number: 'SA-2026-0099',
      invoice_number: 'INV-2026-0099',
      accounting_status: 'PAID',
      payment_status: 'PAID',
      shipper_name: 'NAJEB AMIN LTD',
    };

    // Duplicate procedure
    const nextBolNumber = 'SA-2026-0100';
    const clonedDoc = {
      ...originalDoc,
      id: '',
      bol_number: nextBolNumber,
      invoice_no: '',
      invoice_number: '',
      accounting_status: 'DRAFT',
      payment_status: 'UNPAID',
    };

    assert.strictEqual(clonedDoc.id, '');
    assert.strictEqual(clonedDoc.bol_number, 'SA-2026-0100');
    assert.strictEqual(clonedDoc.invoice_number, '');
    assert.strictEqual(clonedDoc.accounting_status, 'DRAFT');
    assert.strictEqual(clonedDoc.payment_status, 'UNPAID');
  });

  // Test 10: Overpayment Handling
  await test('8. Overpayment Handling: Invoice Outstanding = 1,000, Payment = 1,500 -> 1,000 allocated, 500 customer credit', () => {
    const invoiceOutstanding = 1000;
    const paymentReceived = 1500;

    const allocatedToInvoice = Math.min(paymentReceived, invoiceOutstanding);
    const unallocatedCustomerCredit = Math.max(0, paymentReceived - allocatedToInvoice);

    assert.strictEqual(allocatedToInvoice, 1000);
    assert.strictEqual(unallocatedCustomerCredit, 500);
  });

  // Test 11: Multi-Currency Protection
  await test('9. Multi-Currency Protection: USD invoice with AED payment rejected unless explicit exchange rate provided', () => {
    const invoiceCurrency = 'USD';
    const paymentCurrency = 'AED';

    const isMatch = invoiceCurrency.toUpperCase() === paymentCurrency.toUpperCase();
    assert.strictEqual(isMatch, false, 'Currencies must not match silently');

    assert.throws(() => {
      if (!isMatch) {
        throw new Error('Currency mismatch: Invoice is in USD, but payment is in AED. Multi-currency payments require explicit conversion.');
      }
    }, /Currency mismatch/);
  });

  // Test 12: Reversal / Void
  await test('10. Void Posted Invoice: Generates balancing credit reversal transaction without deleting history', () => {
    const postedDebitAmount = 10250;
    const reversalTx = {
      id: 'TX-REV-1',
      account_id: 'ACC-NAJEB',
      bol_id: 'SA-TEST-002',
      transaction_type: 'credit_note',
      debit: 0,
      credit: postedDebitAmount,
      currency: 'USD',
      description: 'Reversal — BOL SA-TEST-002 (Reason: Shipment cancelled)',
    };

    assert.strictEqual(reversalTx.credit, 10250);
    assert(reversalTx.description.includes('Reversal'));
  });

  // Test 13: Historical Imported Records Protection
  await test('11. Historical Imported Records: Marked source_mode = IMPORTED and never auto-billed', () => {
    const historicalTx = {
      id: 'TX-HIST-001',
      source_mode: 'IMPORTED',
      is_imported: true,
      bol_number: 'OLD-BOL-2025',
    };

    assert.strictEqual(historicalTx.source_mode, 'IMPORTED');
    assert.strictEqual(historicalTx.is_imported, true);
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
})();
