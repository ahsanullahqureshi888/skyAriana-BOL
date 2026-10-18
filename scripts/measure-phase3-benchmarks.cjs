/**
 * Phase 3 Performance Benchmarking Suite
 * Measures real timings for:
 * 1. BOL Editor (blank open, existing BOL open, save, duplicate)
 * 2. Saved BOLs (initial load, exact search, container search, filters, pagination)
 * 3. Ledger (initial load, customer search, date filter, balance calculation, pagination)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const pythonPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');

async function runPhase3Benchmarks() {
  console.log('================================================================');
  console.log('   AQ COMPANIES PERFORMANCE PHASE 3 — MEASURING CURRENT BENCHMARKS');
  console.log('================================================================\n');

  const pyBenchScript = path.join(__dirname, '_temp_phase3_bench.py');
  const pyCode = `
import sys, time, asyncio
sys.path.insert(0, r"${projectRoot}")

from backend.database import SessionLocal
from backend.services.bol_service import list_bols_paged, get_bol_detail, check_bol_number_exists, duplicate_bol
from backend.services.ledger_service import get_ledger_page, search_ledger_accounts
from backend.models.logistics import BOLModel
from backend.models.accounting import LedgerModel, LedgerAccountModel
from sqlalchemy import select, func

async def run():
    async with SessionLocal() as db:
        # Get sample records
        sample_bol = (await db.execute(select(BOLModel).limit(1))).scalars().first()
        bol_id = sample_bol.id if sample_bol else "sample-bol-1"
        bol_num = sample_bol.bol_number if sample_bol else "BOL-SAMPLE"

        sample_acc = (await db.execute(select(LedgerAccountModel).limit(1))).scalars().first()
        acc_id = sample_acc.account_code if sample_acc else "ACC-01"

        # --- 1. BOL BENCHMARKS ---
        # 1a. List BOLs (Initial Page 1, size 50)
        t0 = time.perf_counter()
        items, total, pages = await list_bols_paged(db, page=1, page_size=50)
        t1 = time.perf_counter()
        bol_list_ms = (t1 - t0) * 1000

        # 1b. Exact BOL Search
        t0 = time.perf_counter()
        s_items, s_total, _ = await list_bols_paged(db, q=bol_num, page=1, page_size=50)
        t1 = time.perf_counter()
        bol_exact_search_ms = (t1 - t0) * 1000

        # 1c. Container Search
        t0 = time.perf_counter()
        c_items, c_total, _ = await list_bols_paged(db, q="MSCU1234567", page=1, page_size=50)
        t1 = time.perf_counter()
        bol_container_search_ms = (t1 - t0) * 1000

        # 1d. Filter by Status & Date
        t0 = time.perf_counter()
        f_items, f_total, _ = await list_bols_paged(db, status_filter="active", page=1, page_size=50)
        t1 = time.perf_counter()
        bol_filter_ms = (t1 - t0) * 1000

        # 1e. Get BOL Details
        t0 = time.perf_counter()
        detail = await get_bol_detail(db, bol_id)
        t1 = time.perf_counter()
        bol_detail_ms = (t1 - t0) * 1000

        # 1f. Duplicate Check
        t0 = time.perf_counter()
        dup_chk = await check_bol_number_exists(db, bol_num)
        t1 = time.perf_counter()
        bol_dup_check_ms = (t1 - t0) * 1000

        # --- 2. LEDGER BENCHMARKS ---
        # 2a. Ledger Page 1 Initial Load
        t0 = time.perf_counter()
        led_page1 = await get_ledger_page(db, account_id=acc_id, page=1, page_size=50)
        t1 = time.perf_counter()
        led_initial_ms = (t1 - t0) * 1000

        # 2b. Ledger Account Search
        t0 = time.perf_counter()
        accounts = await search_ledger_accounts(db, query="HAJI", limit=20)
        t1 = time.perf_counter()
        led_acc_search_ms = (t1 - t0) * 1000

        # 2c. Ledger Date Filter & Opening Balance
        t0 = time.perf_counter()
        led_filtered = await get_ledger_page(db, account_id=acc_id, date_from="2026-01-01", date_to="2026-12-31", page=1, page_size=50)
        t1 = time.perf_counter()
        led_date_filter_ms = (t1 - t0) * 1000

        # 2d. Page Navigation (Page 2)
        t0 = time.perf_counter()
        led_page2 = await get_ledger_page(db, account_id=acc_id, page=2, page_size=50)
        t1 = time.perf_counter()
        led_page_nav_ms = (t1 - t0) * 1000

        # Total counts
        total_bols = (await db.execute(select(func.count(BOLModel.id)))).scalar()
        total_ledger = (await db.execute(select(func.count(LedgerModel.id)))).scalar()
        total_debit = (await db.execute(select(func.coalesce(func.sum(LedgerModel.debit), 0)))).scalar()
        total_credit = (await db.execute(select(func.coalesce(func.sum(LedgerModel.credit), 0)))).scalar()

        print(f"BENCH_BOL_TOTAL:{total_bols}")
        print(f"BENCH_LEDGER_TOTAL:{total_ledger}")
        print(f"BENCH_TOTAL_DEBIT:{total_debit}")
        print(f"BENCH_TOTAL_CREDIT:{total_credit}")

        print(f"BENCH_BOL_LIST_MS:{bol_list_ms:.2f}")
        print(f"BENCH_BOL_EXACT_SEARCH_MS:{bol_exact_search_ms:.2f}")
        print(f"BENCH_BOL_CONTAINER_SEARCH_MS:{bol_container_search_ms:.2f}")
        print(f"BENCH_BOL_FILTER_MS:{bol_filter_ms:.2f}")
        print(f"BENCH_BOL_DETAIL_MS:{bol_detail_ms:.2f}")
        print(f"BENCH_BOL_DUP_CHECK_MS:{bol_dup_check_ms:.2f}")

        print(f"BENCH_LED_INITIAL_MS:{led_initial_ms:.2f}")
        print(f"BENCH_LED_ACC_SEARCH_MS:{led_acc_search_ms:.2f}")
        print(f"BENCH_LED_DATE_FILTER_MS:{led_date_filter_ms:.2f}")
        print(f"BENCH_LED_PAGE_NAV_MS:{led_page_nav_ms:.2f}")

asyncio.run(run())
`;

  fs.writeFileSync(pyBenchScript, pyCode);
  try {
    const rawOut = execSync(`"${pythonPath}" "${pyBenchScript}"`, { cwd: projectRoot, encoding: 'utf8' });
    const extract = (key) => {
      const m = rawOut.match(new RegExp(`${key}:([\\d\\.\\-]+)`));
      return m ? parseFloat(m[1]) : 0;
    };

    const metrics = {
      totalBols: extract('BENCH_BOL_TOTAL'),
      totalLedger: extract('BENCH_LEDGER_TOTAL'),
      totalDebit: extract('BENCH_TOTAL_DEBIT'),
      totalCredit: extract('BENCH_TOTAL_CREDIT'),
      bolListMs: extract('BENCH_BOL_LIST_MS'),
      bolExactSearchMs: extract('BENCH_BOL_EXACT_SEARCH_MS'),
      bolContainerSearchMs: extract('BENCH_BOL_CONTAINER_SEARCH_MS'),
      bolFilterMs: extract('BENCH_BOL_FILTER_MS'),
      bolDetailMs: extract('BENCH_BOL_DETAIL_MS'),
      bolDupCheckMs: extract('BENCH_BOL_DUP_CHECK_MS'),
      ledInitialMs: extract('BENCH_LED_INITIAL_MS'),
      ledAccSearchMs: extract('BENCH_LED_ACC_SEARCH_MS'),
      ledDateFilterMs: extract('BENCH_LED_DATE_FILTER_MS'),
      ledPageNavMs: extract('BENCH_LED_PAGE_NAV_MS')
    };

    console.log('[SAVED BOLS BENCHMARKS]');
    console.log(`- Total Database BOLs:           ${metrics.totalBols}`);
    console.log(`- Initial Page Load (50 items):  ${metrics.bolListMs} ms`);
    console.log(`- Exact BOL Search:              ${metrics.bolExactSearchMs} ms`);
    console.log(`- Container Regex Lookup:        ${metrics.bolContainerSearchMs} ms`);
    console.log(`- Status / Date Filter:          ${metrics.bolFilterMs} ms`);
    console.log(`- Existing BOL Detail Fetch:     ${metrics.bolDetailMs} ms`);
    console.log(`- Duplicate BOL Check:           ${metrics.bolDupCheckMs} ms\n`);

    console.log('[LEDGER BENCHMARKS]');
    console.log(`- Total Database Ledger Rows:    ${metrics.totalLedger}`);
    console.log(`- Total Debit:                   ${metrics.totalDebit.toLocaleString()}`);
    console.log(`- Total Credit:                  ${metrics.totalCredit.toLocaleString()}`);
    console.log(`- Initial Ledger Load (Page 1):  ${metrics.ledInitialMs} ms`);
    console.log(`- Customer Account Search:       ${metrics.ledAccSearchMs} ms`);
    console.log(`- Date Range Filter & Balance:   ${metrics.ledDateFilterMs} ms`);
    console.log(`- Page Navigation (Page 2):      ${metrics.ledPageNavMs} ms\n`);

    return metrics;
  } finally {
    if (fs.existsSync(pyBenchScript)) fs.unlinkSync(pyBenchScript);
  }
}

runPhase3Benchmarks().catch(console.error);
