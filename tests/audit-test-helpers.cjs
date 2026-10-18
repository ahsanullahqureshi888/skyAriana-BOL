/**
 * Test Helper for Audit Trail Tests
 * Replicates the logic from lib/audit/diff-engine.ts in CJS for node:test runner
 */

const FRIENDLY_FIELD_LABELS = {
  shipperName: 'Shipper Name',
  consigneeName: 'Consignee Name',
  notifyParty: 'Notify Party',
  grossWeight: 'Gross Weight',
  netWeight: 'Net Weight',
  cargoDescription: 'Cargo Description',
  originCity: 'Origin City',
  destinationCity: 'Destination City',
  truckPlate: 'Truck Plate',
  driverName: 'Driver Name',
  containerNo: 'Container Number',
  sealNo: 'Seal Number',
  amount: 'Amount',
  bankAccountNo: 'Bank Account Number',
  password: 'Password',
  apiKey: 'API Key',
};

const SENSITIVE_FIELD_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credit[_-]?card/i,
  /cvv/i,
];

const FINANCIAL_ENTITIES = ['INVOICE', 'PAYMENT', 'LEDGER_ENTRY', 'SUPPLIER_COST'];

function formatFriendlyValue(val) {
  if (val === null || val === undefined || val === '') return 'Not Set';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function isSensitiveField(fieldName) {
  return SENSITIVE_FIELD_PATTERNS.some(p => p.test(fieldName));
}

function computeStructuredDiff(beforeObj, afterObj) {
  const diffs = [];
  const allKeys = new Set([...Object.keys(beforeObj || {}), ...Object.keys(afterObj || {})]);

  for (const key of allKeys) {
    const rawOld = beforeObj ? beforeObj[key] : undefined;
    const rawNew = afterObj ? afterObj[key] : undefined;

    const oldStr = JSON.stringify(rawOld);
    const newStr = JSON.stringify(rawNew);

    if (oldStr === newStr) continue;

    const fieldLabel = FRIENDLY_FIELD_LABELS[key] || key;

    let formattedOld = formatFriendlyValue(rawOld);
    let formattedNew = formatFriendlyValue(rawNew);

    // Redaction
    if (isSensitiveField(key)) {
      formattedOld = '[REDACTED]';
      formattedNew = '[REDACTED]';
    } else if (/bank.*account|account.*no/i.test(key)) {
      // Masking
      if (formattedOld !== 'Not Set') {
        formattedOld = '****' + formattedOld.slice(-4);
      }
      if (formattedNew !== 'Not Set') {
        formattedNew = '****' + formattedNew.slice(-4);
      }
    }

    diffs.push({
      fieldName: key,
      fieldLabel,
      oldValue: formattedOld,
      newValue: formattedNew,
    });
  }

  return diffs;
}

module.exports = {
  FRIENDLY_FIELD_LABELS,
  SENSITIVE_FIELD_PATTERNS,
  FINANCIAL_ENTITIES,
  formatFriendlyValue,
  computeStructuredDiff,
};
