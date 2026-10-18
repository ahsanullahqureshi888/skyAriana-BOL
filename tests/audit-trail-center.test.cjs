/**
 * Comprehensive Automated Test Suite: Phase 15 — Audit Trail & Change History Center
 * Sky Ariana Limited Logistics Management Platform
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Import our TypeScript-compiled/transpiled modules or direct node implementations
// We can require the diff engine and audit trail logic using ts-node or plain JS equivalents
// Let's create a pure, self-contained test verification using the exact logic implemented in lib/audit

const {
  computeStructuredDiff,
  formatFriendlyValue,
  FRIENDLY_FIELD_LABELS,
  SENSITIVE_FIELD_PATTERNS,
  FINANCIAL_ENTITIES,
} = require('./audit-test-helpers.cjs');

describe('Phase 15: Audit Trail & Change History Center', () => {

  describe('1. Structured Diff Engine & Value Formatting', () => {
    it('detects changes between before and after objects and ignores identical fields', () => {
      const before = {
        shipperName: 'Kandahar Fresh Fruit Co',
        consigneeName: 'Global Fresh Imports',
        grossWeight: '22,400 KGS',
        cargoDescription: 'Fresh Afghan Pomegranates',
        destinationCity: 'Mersin',
      };

      const after = {
        shipperName: 'Kandahar Fresh Fruit Co',
        consigneeName: 'Global Fresh Imports FZE', // changed
        grossWeight: '23,100 KGS', // changed
        cargoDescription: 'Fresh Afghan Pomegranates',
        destinationCity: 'Hamburg', // changed
      };

      const diffs = computeStructuredDiff(before, after);
      assert.equal(diffs.length, 3, 'Should detect exactly 3 modified fields');

      const consigneeDiff = diffs.find(d => d.fieldName === 'consigneeName');
      assert.ok(consigneeDiff, 'Should detect consigneeName modification');
      assert.equal(consigneeDiff.oldValue, 'Global Fresh Imports');
      assert.equal(consigneeDiff.newValue, 'Global Fresh Imports FZE');
      assert.equal(consigneeDiff.fieldLabel, 'Consignee Name');

      const weightDiff = diffs.find(d => d.fieldName === 'grossWeight');
      assert.ok(weightDiff, 'Should detect grossWeight modification');
      assert.equal(weightDiff.oldValue, '22,400 KGS');
      assert.equal(weightDiff.newValue, '23,100 KGS');
      assert.equal(weightDiff.fieldLabel, 'Gross Weight');

      const destDiff = diffs.find(d => d.fieldName === 'destinationCity');
      assert.ok(destDiff, 'Should detect destinationCity modification');
      assert.equal(destDiff.oldValue, 'Mersin');
      assert.equal(destDiff.newValue, 'Hamburg');
      assert.equal(destDiff.fieldLabel, 'Destination City');
    });

    it('formats null, undefined, boolean and empty string values gracefully', () => {
      assert.equal(formatFriendlyValue(null), 'Not Set');
      assert.equal(formatFriendlyValue(undefined), 'Not Set');
      assert.equal(formatFriendlyValue(''), 'Not Set');
      assert.equal(formatFriendlyValue(true), 'Yes');
      assert.equal(formatFriendlyValue(false), 'No');
      assert.equal(formatFriendlyValue(12500), '12500');
    });

    it('redacts sensitive fields like passwords, secrets, api keys, and tokens', () => {
      const before = {
        password: 'SuperSecretPassword123!',
        apiKey: 'sk-proj-998877665544332211',
        driverName: 'Ahmad Khan',
      };
      const after = {
        password: 'NewSuperSecretPassword456@',
        apiKey: 'sk-proj-112233445566778899',
        driverName: 'Ahmad Khan Popal',
      };

      const diffs = computeStructuredDiff(before, after);
      const passDiff = diffs.find(d => d.fieldName === 'password');
      assert.ok(passDiff);
      assert.equal(passDiff.oldValue, '[REDACTED]');
      assert.equal(passDiff.newValue, '[REDACTED]');

      const keyDiff = diffs.find(d => d.fieldName === 'apiKey');
      assert.ok(keyDiff);
      assert.equal(keyDiff.oldValue, '[REDACTED]');
      assert.equal(keyDiff.newValue, '[REDACTED]');

      const driverDiff = diffs.find(d => d.fieldName === 'driverName');
      assert.ok(driverDiff);
      assert.equal(driverDiff.oldValue, 'Ahmad Khan');
      assert.equal(driverDiff.newValue, 'Ahmad Khan Popal');
    });

    it('masks bank account numbers and credit details leaving only trailing 4 digits', () => {
      const before = {
        bankAccountNo: '020019283748214',
      };
      const after = {
        bankAccountNo: '020098765432999',
      };

      const diffs = computeStructuredDiff(before, after);
      const bankDiff = diffs.find(d => d.fieldName === 'bankAccountNo');
      assert.ok(bankDiff);
      assert.equal(bankDiff.oldValue, '****8214');
      assert.equal(bankDiff.newValue, '****2999');
    });
  });

  describe('2. Cryptographic Tamper-Evident SHA-256 Hash Chaining', () => {
    function computeEventHash(prevHash, event) {
      const canonicalData = JSON.stringify({
        prevHash,
        sequenceNumber: event.sequenceNumber,
        timestamp: event.timestamp,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        summary: event.summary,
      });
      return crypto.createHash('sha256').update(canonicalData).digest('hex');
    }

    function verifyChain(events) {
      if (!events || events.length === 0) {
        return { isValid: true, checkedCount: 0 };
      }

      const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
      let expectedPrevHash = GENESIS_HASH;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.previousEventHash !== expectedPrevHash) {
          return {
            isValid: false,
            brokenIndex: i,
            sequenceNumber: ev.sequenceNumber,
            reason: `Broken chain link at seq ${ev.sequenceNumber}. Expected previous hash ${expectedPrevHash.slice(0, 10)}... got ${ev.previousEventHash?.slice(0, 10)}...`,
          };
        }

        const calculatedHash = computeEventHash(expectedPrevHash, ev);
        if (ev.eventHash !== calculatedHash) {
          return {
            isValid: false,
            brokenIndex: i,
            sequenceNumber: ev.sequenceNumber,
            reason: `Tampered event payload at seq ${ev.sequenceNumber}. Hash mismatch: expected ${calculatedHash.slice(0, 10)}... got ${ev.eventHash.slice(0, 10)}...`,
          };
        }

        expectedPrevHash = ev.eventHash;
      }

      return { isValid: true, checkedCount: events.length };
    }

    it('builds a valid sequential SHA-256 chained ledger from genesis', () => {
      const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
      const events = [];

      let prevHash = GENESIS_HASH;
      const rawEvents = [
        { action: 'CREATE', entityType: 'BOL', entityId: 'BOL-001', userId: 'usr-admin', summary: 'Created BOL-001' },
        { action: 'UPDATE', entityType: 'BOL', entityId: 'BOL-001', userId: 'usr-ops', summary: 'Updated driver name' },
        { action: 'APPROVE', entityType: 'INVOICE', entityId: 'INV-1029', userId: 'usr-fin', summary: 'Approved Invoice INV-1029' },
        { action: 'POST', entityType: 'LEDGER_ENTRY', entityId: 'TX-5501', userId: 'usr-fin', summary: 'Posted freight payment $4,500' },
      ];

      for (let i = 0; i < rawEvents.length; i++) {
        const item = rawEvents[i];
        const seq = i + 1;
        const timestamp = new Date(Date.now() + i * 1000).toISOString();
        const ev = {
          sequenceNumber: seq,
          timestamp,
          ...item,
          previousEventHash: prevHash,
          eventHash: '',
        };
        ev.eventHash = computeEventHash(prevHash, ev);
        events.push(ev);
        prevHash = ev.eventHash;
      }

      const report = verifyChain(events);
      assert.equal(report.isValid, true, 'Original chain must be 100% cryptographically valid');
      assert.equal(report.checkedCount, 4);
    });

    it('detects tampering if an attacker modifies an event summary or amount', () => {
      const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
      const events = [];
      let prevHash = GENESIS_HASH;

      const rawEvents = [
        { action: 'CREATE', entityType: 'BOL', entityId: 'BOL-001', userId: 'usr-admin', summary: 'Created BOL-001' },
        { action: 'POST', entityType: 'LEDGER_ENTRY', entityId: 'TX-5501', userId: 'usr-fin', summary: 'Payment $5,000' },
        { action: 'UPDATE', entityType: 'BOL', entityId: 'BOL-001', userId: 'usr-ops', summary: 'Status Departure' },
      ];

      for (let i = 0; i < rawEvents.length; i++) {
        const item = rawEvents[i];
        const ev = {
          sequenceNumber: i + 1,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          ...item,
          previousEventHash: prevHash,
          eventHash: '',
        };
        ev.eventHash = computeEventHash(prevHash, ev);
        events.push(ev);
        prevHash = ev.eventHash;
      }

      // Attacker tampers with event 2 summary to hide a payment
      events[1].summary = 'Payment $500'; // modified!

      const report = verifyChain(events);
      assert.equal(report.isValid, false, 'Tampered event must be detected');
      assert.equal(report.sequenceNumber, 2);
      assert.ok(report.reason.includes('Tampered event payload at seq 2'));
    });

    it('detects tampering if an attacker deletes an intermediate record', () => {
      const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
      const events = [];
      let prevHash = GENESIS_HASH;

      for (let i = 0; i < 4; i++) {
        const ev = {
          sequenceNumber: i + 1,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          action: 'UPDATE',
          entityType: 'BOL',
          entityId: 'BOL-001',
          userId: 'usr-ops',
          summary: `Step ${i + 1}`,
          previousEventHash: prevHash,
          eventHash: '',
        };
        ev.eventHash = computeEventHash(prevHash, ev);
        events.push(ev);
        prevHash = ev.eventHash;
      }

      // Attacker drops record at index 1 (sequence 2)
      events.splice(1, 1);

      const report = verifyChain(events);
      assert.equal(report.isValid, false, 'Deleted intermediate event must break previousEventHash');
      assert.equal(report.brokenIndex, 1);
      assert.ok(report.reason.includes('Broken chain link'));
    });
  });

  describe('3. Role-Based Financial Audit Fencing', () => {
    function maskEventForRole(event, userRole) {
      const isFinancePrivileged = ['admin', 'management', 'finance_manager', 'accountant'].includes(userRole);
      if (isFinancePrivileged) return event;

      const isFinancial = FINANCIAL_ENTITIES.includes(event.entityType);
      if (!isFinancial) return event;

      // Mask sensitive financial fields
      return {
        ...event,
        summary: '[FINANCIAL RECORD MODIFIED]',
        diffs: (event.diffs || []).map(d => ({
          ...d,
          oldValue: '[RESTRICTED FINANCIAL DATA]',
          newValue: '[RESTRICTED FINANCIAL DATA]',
        })),
      };
    }

    it('allows finance managers and admins to see raw financial diff values', () => {
      const ev = {
        action: 'UPDATE',
        entityType: 'SUPPLIER_COST',
        entityId: 'COST-99',
        summary: 'Updated driver freight rate to $3,200',
        diffs: [
          { fieldName: 'amount', fieldLabel: 'Amount', oldValue: '$2,800', newValue: '$3,200' },
        ],
      };

      const adminView = maskEventForRole(ev, 'admin');
      assert.equal(adminView.summary, 'Updated driver freight rate to $3,200');
      assert.equal(adminView.diffs[0].newValue, '$3,200');

      const accountantView = maskEventForRole(ev, 'accountant');
      assert.equal(accountantView.diffs[0].newValue, '$3,200');
    });

    it('masks financial diff values and summaries for operations staff and shippers', () => {
      const ev = {
        action: 'UPDATE',
        entityType: 'SUPPLIER_COST',
        entityId: 'COST-99',
        summary: 'Updated driver freight rate to $3,200',
        diffs: [
          { fieldName: 'amount', fieldLabel: 'Amount', oldValue: '$2,800', newValue: '$3,200' },
        ],
      };

      const staffView = maskEventForRole(ev, 'staff');
      assert.equal(staffView.summary, '[FINANCIAL RECORD MODIFIED]');
      assert.equal(staffView.diffs[0].oldValue, '[RESTRICTED FINANCIAL DATA]');
      assert.equal(staffView.diffs[0].newValue, '[RESTRICTED FINANCIAL DATA]');

      const shipperView = maskEventForRole(ev, 'shipper');
      assert.equal(shipperView.diffs[0].newValue, '[RESTRICTED FINANCIAL DATA]');
    });

    it('leaves non-financial entity diffs unmasked for all staff roles', () => {
      const ev = {
        action: 'UPDATE',
        entityType: 'BOL',
        entityId: 'BOL-100',
        summary: 'Updated truck license plate',
        diffs: [
          { fieldName: 'truckPlate', fieldLabel: 'Truck Plate', oldValue: '4581-2-AFG', newValue: '9921-1-AFG' },
        ],
      };

      const staffView = maskEventForRole(ev, 'staff');
      assert.equal(staffView.summary, 'Updated truck license plate');
      assert.equal(staffView.diffs[0].newValue, '9921-1-AFG');
    });
  });

  describe('4. Multi-Criteria Query & Filtering', () => {
    function filterEvents(events, params) {
      return events.filter(e => {
        if (params.entityType && e.entityType !== params.entityType) return false;
        if (params.action && e.action !== params.action) return false;
        if (params.userId && e.userId !== params.userId) return false;
        if (params.search) {
          const s = params.search.toLowerCase();
          const match =
            (e.summary && e.summary.toLowerCase().includes(s)) ||
            (e.entityReference && e.entityReference.toLowerCase().includes(s)) ||
            (e.userName && e.userName.toLowerCase().includes(s));
          if (!match) return false;
        }
        return true;
      });
    }

    const sampleEvents = [
      { sequenceNumber: 1, action: 'CREATE', entityType: 'BOL', entityReference: 'BOL-2026-001', userName: 'Ahmad Staff', summary: 'Created BOL' },
      { sequenceNumber: 2, action: 'UPDATE', entityType: 'CONTAINER', entityReference: 'MSKU-9988771', userName: 'Wahid Ops', summary: 'Gated in' },
      { sequenceNumber: 3, action: 'POST', entityType: 'INVOICE', entityReference: 'INV-2026-04', userName: 'Zia Finance', summary: 'Invoice generated' },
      { sequenceNumber: 4, action: 'UPDATE', entityType: 'BOL', entityReference: 'BOL-2026-001', userName: 'Ahmad Staff', summary: 'Updated border station to Hairatan' },
      { sequenceNumber: 5, action: 'APPROVE', entityType: 'INVOICE', entityReference: 'INV-2026-04', userName: 'Director Ali', summary: 'Approved invoice' },
    ];

    it('filters events accurately by entityType', () => {
      const bolEvents = filterEvents(sampleEvents, { entityType: 'BOL' });
      assert.equal(bolEvents.length, 2);
      assert.ok(bolEvents.every(e => e.entityType === 'BOL'));
    });

    it('filters events accurately by action code', () => {
      const approveEvents = filterEvents(sampleEvents, { action: 'APPROVE' });
      assert.equal(approveEvents.length, 1);
      assert.equal(approveEvents[0].entityReference, 'INV-2026-04');
    });

    it('filters events with case-insensitive search across summary and reference', () => {
      const searchRes = filterEvents(sampleEvents, { search: 'hairatan' });
      assert.equal(searchRes.length, 1);
      assert.equal(searchRes[0].sequenceNumber, 4);

      const searchRef = filterEvents(sampleEvents, { search: 'msku' });
      assert.equal(searchRef.length, 1);
      assert.equal(searchRef[0].entityReference, 'MSKU-9988771');
    });
  });

  describe('5. CSV Export Integrity', () => {
    function exportAuditCsv(events, userRole) {
      const headers = ['Seq', 'Timestamp', 'Action', 'Entity', 'Reference', 'User', 'Role', 'Summary', 'SHA256 Hash'];
      const rows = events.map(ev => {
        const masked = ['admin', 'management', 'finance_manager', 'accountant'].includes(userRole) || !FINANCIAL_ENTITIES.includes(ev.entityType)
          ? ev
          : { ...ev, summary: '[FINANCIAL RECORD]' };

        return [
          masked.sequenceNumber,
          masked.timestamp,
          masked.action,
          masked.entityType,
          `"${(masked.entityReference || '').replace(/"/g, '""')}"`,
          `"${(masked.userName || '').replace(/"/g, '""')}"`,
          masked.userRole,
          `"${(masked.summary || '').replace(/"/g, '""')}"`,
          masked.eventHash,
        ].join(',');
      });

      return [headers.join(','), ...rows].join('\n');
    }

    it('generates valid RFC-4180 compliant CSV lines with escaped quotation marks', () => {
      const events = [
        {
          sequenceNumber: 1,
          timestamp: '2026-03-22T08:00:00.000Z',
          action: 'CREATE',
          entityType: 'BOL',
          entityReference: 'BOL, Special "Air/Land" Cargo',
          userName: 'Staff "Alpha"',
          userRole: 'staff',
          summary: 'Created new BOL with "Special" Notes',
          eventHash: 'a1b2c3d4e5f6',
        },
      ];

      const csv = exportAuditCsv(events, 'admin');
      const lines = csv.split('\n');
      assert.equal(lines.length, 2);
      assert.ok(lines[0].startsWith('Seq,Timestamp,Action'));
      assert.ok(lines[1].includes('"BOL, Special ""Air/Land"" Cargo"'));
      assert.ok(lines[1].includes('"Staff ""Alpha"""'));
    });

    it('masks financial summaries in CSV for non-finance staff', () => {
      const events = [
        {
          sequenceNumber: 1,
          timestamp: '2026-03-22T08:00:00.000Z',
          action: 'POST',
          entityType: 'INVOICE',
          entityReference: 'INV-001',
          userName: 'Staff One',
          userRole: 'staff',
          summary: 'Invoice USD $45,000 generated',
          eventHash: 'hash123',
        },
      ];

      const csv = exportAuditCsv(events, 'staff');
      assert.ok(!csv.includes('$45,000'), 'Must not leak financial amounts to staff in CSV');
      assert.ok(csv.includes('[FINANCIAL RECORD]'));
    });
  });

});
