const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const crypto = require('crypto');

function cleanAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/[\$,؋,\s]/g, "");
  if (!str || str === "-" || str.includes("#VALUE!") || str.includes("#REF!") || str.includes("#DIV/0!") || str.includes("#N/A")) {
    return 0;
  }
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1);
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function formatExcelDate(raw) {
  if (!raw) return "";
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0];
  }
  return String(raw).trim();
}

function determineAccountType(name, sheetName) {
  const s = (name + " " + sheetName).toLowerCase();
  if (s.includes("transport") || s.includes("irfan-shokran") || s.includes("truck")) return "transportation";
  if (s.includes("shipper")) return "shipper";
  if (s.includes("consignee")) return "consignee";
  if (s.includes("agent")) return "agent";
  if (s.includes("supplier") || s.includes("fruit") || s.includes("beverage")) return "supplier";
  if (s.includes("office") || s.includes("expense")) return "office_expense";
  if (s.includes("company") || s.includes("ltd") || s.includes("limited") || s.includes("شرکت")) return "company";
  return "customer";
}

function generateFingerprint(fields) {
  const norm = [
    fields.account_name.trim().toLowerCase(),
    (fields.source_sheet || "").trim().toLowerCase(),
    String(fields.source_row ?? ""),
    (fields.date || "").trim(),
    Number(fields.debit || 0).toFixed(2),
    Number(fields.credit || 0).toFixed(2),
    (fields.reference || "").trim().toLowerCase(),
    (fields.invoice || "").trim().toLowerCase(),
    (fields.bol || "").trim().toLowerCase(),
  ].join("|");
  return crypto.createHash("sha256").update(norm).digest("hex");
}

async function runImport() {
  const filePath = 'C:\\Users\\Ahsanullah Qureshi\\Desktop\\ALL-COMPANIES.xlsx';
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  console.log('Loading workbook from:', filePath);
  const workbook = XLSX.readFile(filePath, { cellFormula: true, cellDates: true, cellNF: true });

  const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const accounts = [];
  const transactions = [];
  const fingerprints = new Set();

  const SKIP_SHEETS = new Set(["ALL-CONTAINERS-", "LOT-NO-03-MERSIN-PORT", "Sheet31", "NEW-ACCOUNT-+"]);

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "ALL-COMPANIES-REPORT" || SKIP_SHEETS.has(sheetName)) {
      continue;
    }

    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    let headerRow = -1;
    let debitCol = -1;
    let creditCol = -1;
    let balCol = -1;
    let dateCol = -1;
    let invCol = -1;
    let bolCol = -1;
    let containerCol = -1;
    let consigneeCol = -1;
    let shipperCol = -1;
    let descCol = -1;
    let truckCol = -1;
    let qtyCol = -1;

    let detectedCurrency = "USD";
    if (
      sheetName.includes("AFN") ||
      sheetName.includes("DOC") ||
      sheetName.includes("TRANSPORT") ||
      sheetName.includes("YOUNUS") ||
      sheetName.includes("RHAMAT") ||
      sheetName.includes("YARMAL")
    ) {
      detectedCurrency = "AFN";
    }

    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      let foundDr = false;
      let foundCr = false;

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        const val = (cell ? String(cell.v || "") : "").trim().toUpperCase();

        if ((val.includes("DEBIT") || val.includes("پور") || val.includes("ډیبټ")) && !val.includes("TOTAL")) {
          debitCol = c;
          foundDr = true;
        } else if (
          val.includes("CREDIT") ||
          val.includes("CRIDET") ||
          val.includes("رسید") ||
          val.includes("کریډیټ") ||
          val.includes("وصول")
        ) {
          creditCol = c;
          foundCr = true;
        } else if (val.includes("BALANCE") || val.includes("بیلانس") || val.includes("باقی")) {
          balCol = c;
          if (val.includes("AFN") || val.includes("افغانی")) detectedCurrency = "AFN";
          if (val.includes("USD") || val.includes("دالر")) detectedCurrency = "USD";
        } else if (val.includes("DATE") || val.includes("تاریخ") || val.includes("نېټه")) {
          dateCol = c;
        } else if (val.includes("INVOICE") || val.includes("INV")) {
          invCol = c;
        } else if (val.includes("BL") || val.includes("BOL") || val.includes("بارنامه") || val.includes("بی ال")) {
          bolCol = c;
        } else if (val.includes("CONTAINER") || val.includes("کانټینر")) {
          containerCol = c;
        } else if (val.includes("CONSIGNEE") || val.includes("معامله دار")) {
          consigneeCol = c;
        } else if (val.includes("SHIPPER") || val.includes("لیږدونکی")) {
          shipperCol = c;
        } else if (val.includes("DESC") || val.includes("تفصیل")) {
          descCol = c;
        } else if (val.includes("TRUCK") || val.includes("PLATE")) {
          truckCol = c;
        } else if (val.includes("QUANTITY") || val.includes("QUANTITIY") || val.includes("تعداد")) {
          qtyCol = c;
        }
      }

      if (foundDr && foundCr) {
        headerRow = r;
        break;
      }
    }

    if (headerRow === -1 || debitCol === -1 || creditCol === -1) {
      console.warn(`Could not identify debit/credit columns in sheet "${sheetName}". Skipping.`);
      continue;
    }

    let accountName = sheetName;
    for (let r = range.s.r; r < headerRow; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        const v = cell ? String(cell.v || "").trim() : "";
        if (
          v &&
          v.length > 3 &&
          !v.includes("AFGHANISTAN OFFICE") &&
          !v.includes("CHOWK") &&
          !v.includes("LICENCE") &&
          !v.includes("EMAIL:") &&
          !v.includes("Sun Sep")
        ) {
          accountName = v.split("\r\n")[0].split("\n")[0].trim();
          break;
        }
      }
      if (accountName !== sheetName) break;
    }

    if (sheetName === "NAZAR-M.YARMAL") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal)2";
      detectedCurrency = "AFN";
    } else if (sheetName === "NAZAR-M.YARMAL (2)") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal)";
      detectedCurrency = "AFN";
    } else if (sheetName === "NAZAR-M.YARMAL (3)") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal) - Mersin";
      detectedCurrency = "USD";
    } else if (sheetName === "HAJI-MUHMMAD-YOUNUS-LTD") {
      accountName = "حاجی یونس دوبی بیل";
      detectedCurrency = "AFN";
    } else if (sheetName === "HAJI-BASHIR-NAJEB-AMIN-MERSIN-") {
      accountName = "شرکت نجیب امین لمیټد / NAJEB AMIN LTD";
      detectedCurrency = "USD";
    } else if (sheetName === "HAMID-INSAF-LTD-DOC") {
      accountName = "HAMID-INSAF-LTD DOCUMENTS";
      detectedCurrency = "AFN";
    } else if (sheetName === "NIMROZ-NOORMUHMMAD") {
      accountName = "NOOR-MUHMMAD-NIMROZ";
      detectedCurrency = "AFN";
    } else if (sheetName === "RAHMATULLAH-RHAMAT-DOCS-") {
      accountName = "RAHMATULLAH-RAHMAT-DOCS";
      detectedCurrency = "AFN";
    } else if (sheetName === "IRFAN-SHOKRAN--TRANSPORT") {
      accountName = "IRFAN-SHOKRAN--TRANSPORT";
      detectedCurrency = "AFN";
    }

    const accountId = `ACC-${crypto.createHash("md5").update(sheetName).digest("hex").slice(0, 10)}`;
    const sheetTxs = [];
    let sheetDebit = 0;
    let sheetCredit = 0;
    let runningBalance = 0;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const debitCell = ws[XLSX.utils.encode_cell({ r, c: debitCol })];
      const creditCell = ws[XLSX.utils.encode_cell({ r, c: creditCol })];

      const dFormula = debitCell && debitCell.f ? String(debitCell.f).toUpperCase() : "";
      const cFormula = creditCell && creditCell.f ? String(creditCell.f).toUpperCase() : "";
      if (dFormula.includes("SUM(") || cFormula.includes("SUM(")) {
        continue;
      }

      let isFooterOrTotal = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        const v = cell ? String(cell.v || "").trim() : "";
        if (
          v.includes("AFGHANISTAN OFFICE") ||
          v.includes("CHOWK, ETIMAD") ||
          v.includes("EMAIL: info@skyariana.com") ||
          v.includes("LICENCE NUMBER: 2401-2198")
        ) {
          isFooterOrTotal = true;
          break;
        }
        const upper = v.toUpperCase();
        if (
          upper === "TOTAL" ||
          upper === "TOTAL:" ||
          upper === "GRAND TOTAL" ||
          v === "جمله" ||
          v === "مجموعه" ||
          upper.startsWith("TOTAL /") ||
          upper.startsWith("TOTAL:")
        ) {
          isFooterOrTotal = true;
          break;
        }
      }
      if (isFooterOrTotal) continue;

      const dVal = cleanAmount(debitCell ? debitCell.v : 0);
      const cVal = cleanAmount(creditCell ? creditCell.v : 0);

      const getCellText = (col) => {
        if (col === -1) return "";
        const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
        return cell ? String(cell.v || "").trim() : "";
      };

      const dateRaw = dateCol !== -1 ? (ws[XLSX.utils.encode_cell({ r, c: dateCol })]?.v ?? "") : "";
      const formattedDate = formatExcelDate(dateRaw);
      const invoiceNo = getCellText(invCol);
      const bolNo = getCellText(bolCol);
      const containerNo = getCellText(containerCol);
      const consigneeName = getCellText(consigneeCol);
      const shipperName = getCellText(shipperCol);
      const desc = getCellText(descCol) || getCellText(qtyCol) || shipperName || "Ledger Entry";
      const truckNo = getCellText(truckCol);
      const qtyText = getCellText(qtyCol);

      if (dVal === 0 && cVal === 0 && !invoiceNo && !bolNo && !containerNo && !consigneeName && !desc) {
        continue;
      }
      if (dVal === 0 && cVal === 0 && (invoiceNo === "INV-" || !invoiceNo) && !consigneeName && !bolNo) {
        continue;
      }

      sheetDebit += dVal;
      sheetCredit += cVal;
      runningBalance = Math.round((runningBalance + dVal - cVal) * 100) / 100;

      const txType = cVal > 0 && dVal === 0 ? "payment" : "charge";
      const txId = `TX-${accountId}-${r}-${crypto.randomBytes(3).toString("hex")}`;
      const fingerprint = generateFingerprint({
        account_name: accountName,
        source_sheet: sheetName,
        source_row: r,
        date: formattedDate,
        debit: dVal,
        credit: cVal,
        invoice: invoiceNo,
        bol: bolNo,
      });

      if (!fingerprints.has(fingerprint)) {
        fingerprints.add(fingerprint);
        const record = {
          id: txId,
          account_id: accountId,
          transaction_date: formattedDate || "1404-01-01",
          transaction_type: txType,
          description: desc,
          reference_number: bolNo || invoiceNo || `REF-${r}`,
          invoice_number: invoiceNo,
          bol_number: bolNo,
          container_number: containerNo,
          consignee_name: consigneeName,
          shipper_name: shipperName,
          truck_number: truckNo,
          quantity_text: qtyText,
          debit: dVal,
          credit: cVal,
          running_balance: runningBalance,
          currency: detectedCurrency,
          source_file: "ALL-COMPANIES.xlsx",
          source_sheet: sheetName,
          source_row: r,
          import_batch_id: batchId,
          fingerprint,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        sheetTxs.push(record);
        transactions.push(record);
      }
    }

    sheetDebit = Math.round(sheetDebit * 100) / 100;
    sheetCredit = Math.round(sheetCredit * 100) / 100;
    const finalBalance = Math.round((sheetDebit - sheetCredit) * 100) / 100;

    accounts.push({
      id: accountId,
      account_code: `AC-${accounts.length + 1}`.padStart(6, '0'),
      account_name: accountName,
      display_name: accountName,
      normalized_name: accountName.toUpperCase().replace(/[\s\-_]+/g, ' '),
      aliases: [sheetName],
      account_type: determineAccountType(accountName, sheetName),
      currency: detectedCurrency,
      opening_balance: 0,
      total_debit: sheetDebit,
      total_credit: sheetCredit,
      current_balance: finalBalance,
      status: "active",
      source: sheetName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Summary only accounts
  const summaryAccounts = [
    {
      name: "Obaid Kausar Company",
      debit: 112250,
      credit: 112250,
      balance: 0,
      currency: "USD",
    },
    {
      name: "Pak - Afghan - Limited",
      debit: 195711.99,
      credit: 211048.5,
      balance: -15336.51,
      currency: "USD",
    },
    {
      name: "حاجی عظمت الله خان کاکړ",
      debit: 46118,
      credit: 22756,
      balance: 23362,
      currency: "USD",
    },
  ];

  for (const sa of summaryAccounts) {
    const accountId = `ACC-${crypto.createHash("md5").update(sa.name).digest("hex").slice(0, 10)}`;
    const txId = `TX-${accountId}-INIT`;
    const fingerprint = generateFingerprint({
      account_name: sa.name,
      source_sheet: "ALL-COMPANIES-REPORT",
      source_row: 0,
      date: "1404-01-01",
      debit: sa.debit,
      credit: sa.credit,
    });

    accounts.push({
      id: accountId,
      account_code: `AC-${accounts.length + 1}`.padStart(6, '0'),
      account_name: sa.name,
      display_name: sa.name,
      normalized_name: sa.name.toUpperCase().replace(/[\s\-_]+/g, ' '),
      aliases: [sa.name],
      account_type: determineAccountType(sa.name, "company"),
      currency: sa.currency,
      opening_balance: 0,
      total_debit: sa.debit,
      total_credit: sa.credit,
      current_balance: sa.balance,
      status: "active",
      source: "ALL-COMPANIES-REPORT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const tx = {
      id: txId,
      account_id: accountId,
      transaction_date: "1404-01-01",
      transaction_type: "opening_balance",
      description: `Consolidated Opening Balance - ${sa.name}`,
      reference_number: `INIT-${sa.name.slice(0, 6).toUpperCase()}`,
      debit: sa.debit,
      credit: sa.credit,
      running_balance: sa.balance,
      currency: sa.currency,
      source_file: "ALL-COMPANIES.xlsx",
      source_sheet: "ALL-COMPANIES-REPORT",
      source_row: 0,
      import_batch_id: batchId,
      fingerprint,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    transactions.push(tx);
  }

  const batchRecord = {
    id: batchId,
    filename: "ALL-COMPANIES.xlsx",
    import_date: new Date().toISOString(),
    imported_accounts: accounts.length,
    imported_transactions: transactions.length,
    skipped_rows: 0,
    duplicate_rows: 0,
    formula_errors: 0,
    warnings: [],
    status: "completed",
  };

  const db = {
    accounts,
    ledger_transactions: transactions,
    payments: [],
    import_batches: [batchRecord],
    audit_logs: [],
    version: "1.0.0",
    updated_at: new Date().toISOString(),
  };

  // Backups and persistence
  const dataDir = path.join(__dirname, '..', 'data');
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const targetFile = path.join(dataDir, '.local-ledger-system.json');
  const rootTargetFile = path.join(__dirname, '..', '.local-ledger-system.json');

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `backup-before-ledger-import-${ts}.json`), JSON.stringify(db, null, 2));

  fs.writeFileSync(targetFile, JSON.stringify(db, null, 2));
  fs.writeFileSync(rootTargetFile, JSON.stringify(db, null, 2));

  fs.writeFileSync(path.join(backupDir, `backup-after-ledger-import-${ts}.json`), JSON.stringify(db, null, 2));

  // Sync to legacy .local-account-ledgers.json
  const legacyFile = path.join(__dirname, '..', '.local-account-ledgers.json');
  let legacyDb = { accounts: [], ledgerEntries: {}, ledgerProfiles: {}, receipts: {}, deletedLedgerEntries: [] };
  if (fs.existsSync(legacyFile)) {
    try {
      legacyDb = JSON.parse(fs.readFileSync(legacyFile, 'utf-8'));
    } catch (_) {}
  }

  const legacyNames = new Set(legacyDb.accounts || []);
  const legacyEntries = { ...(legacyDb.ledgerEntries || {}) };

  for (const acc of accounts) {
    const name = acc.account_name;
    legacyNames.add(name);
    const txs = transactions.filter(t => t.account_id === acc.id);
    legacyEntries[name] = txs.map((t, idx) => ({
      id: t.id,
      sNo: idx + 1,
      date: t.transaction_date,
      shipperDescription: t.description || t.shipper_name || "",
      invoiceNo: t.invoice_number || "",
      dateOfShip: t.transaction_date,
      billOfLanding: t.bol_number || "",
      surrenderedBL: false,
      containerNo: t.container_number || "",
      containerType: t.container_type || "",
      consignee: t.consignee_name || "",
      quantity: t.quantity_text || "",
      debit: t.debit,
      credit: t.credit,
      balance: t.running_balance,
      currency: t.currency,
      remarks: t.remarks || "",
      sourceFile: t.source_file,
      sourceSheet: t.source_sheet,
      sourceRow: t.source_row,
    }));
  }

  fs.writeFileSync(legacyFile, JSON.stringify({
    ...legacyDb,
    accounts: Array.from(legacyNames),
    ledgerEntries: legacyEntries,
    updated_at: new Date().toISOString()
  }, null, 2));

  console.log('IMPORT SUCCESSFUL!');
  console.log('Total Accounts:', accounts.length);
  console.log('Total Transactions:', transactions.length);

  let grandDebit = 0;
  let grandCredit = 0;
  for (const t of transactions) {
    grandDebit += t.debit;
    grandCredit += t.credit;
  }
  console.log('Grand Total Debit:', grandDebit.toFixed(2));
  console.log('Grand Total Credit:', grandCredit.toFixed(2));
  console.log('Grand Net Balance:', (grandDebit - grandCredit).toFixed(2));
}

runImport().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
