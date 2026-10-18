# Software review — 13 September 2026

A broad source, data, API, browser, and build review of the current Sky Ariana BOL workspace. This is not a certification that every workflow or deployment is defect-free. Existing uncommitted work was preserved; no production deployment or live-data reconciliation was performed.

## Improvements implemented

| Area | Defect and resulting behavior |
| --- | --- |
| Login | Removed username-in-URL session creation, arbitrary-password acceptance, and unknown-user fallback. Login now matches a configured username/full email and exact password; disabled/passwordless accounts are rejected. |
| Login readiness | Inputs and login actions wait for client initialization so an early native form submission cannot put credentials in the URL. Session-only login removes a previous remembered identity. |
| JSON persistence | Reads return independent copies; caches contain serialized snapshots rather than caller-owned objects. Queued writes capture the value at request time, and a failed mutation cannot leak unsaved values into later reads. Atomic writes and serialized mutations remain in use. |
| Ledger validation | Checks every recorded running balance in chronological order, including legacy day-first dates and Persian/Arabic digits. Invalid numeric values are flagged instead of being silently treated as zero. Source arrays are not rearranged by an audit. |
| File paths | Rejects dot segments, null bytes, and alternate-stream syntax in upload paths, with route-level rejection of unsafe segments. |
| Document dates | BOL editor and saved-document date labels retain the stored calendar day across timezones. Verified September 13 stays September 13 in America/Los_Angeles. |
| Mobile | Route-card actions and quick-action buttons wrap rather than widening the page. The tested 390px viewport now has a 390px document width, down from 474px. |
| Sticker export | Honors quantity and sheet/single layout. Twelve labels generate two sheets; three individual labels generate three pages. The default single master sticker remains one page. Invalid quantities are rejected. |
| Lint | Replaced an empty rule set with seven correctness rules covering unreachable code, duplicate branches/arguments/cases, debugger statements, unsafe finally blocks, and invalid typeof comparisons. This is a focused rule set, not a complete recommended lint preset. |

## Verification

- 19 automated Node tests pass, including storage mutation isolation/concurrent increments, ledger validation, local credentials, upload paths, and sticker pagination.
- The original shipping-document smoke fixture passes: 12 labels / 2 pages, 3 single labels / 3 pages, and a one-page packing list.
- Strict TypeScript checks for the web app and Electron pass.
- Lint passes with the enabled rules.
- Production build: PASS — compiled successfully, TypeScript completed, and all 25 static pages generated.
- The project QA pipeline and strict snapshot validator pass: 61 unique BOL records, 3 invoices, and no reported data issues.
- The improved audit independently checks 50 account-ledger rows and 43 BOL-ledger rows with zero discrepancies.
- Local API checks return HTTP 200 with valid JSON for `/api/bol`, `/api/account-ledgers`, `/api/bol-account-ledgers`, `/api/invoices`, `/api/accounts`, and `/api/draft?type=bol`.
- Draft save/read/delete round trip passes using copied QA data.

## Browser QA

Environment: isolated development server at http://127.0.0.1:3210, copied snapshots under `.qa/review-20260913-runtime`, cloud storage disabled. Microsoft Edge via bundled Playwright was used because the Browser plugin was not available and the bundled Chromium executable was absent. Desktop viewport: 1440 × 960. Mobile viewport: 390 × 844. Timezone: America/Los_Angeles.

| Check | Result |
| --- | --- |
| Page identity and meaningful content | PASS — SKY ARIANA LIMITED and BOL editor rendered |
| URL login bypass | PASS — unknown username in URL stays at login |
| Incorrect / correct passwords | PASS — incorrect password rejected; configured credentials open workspace |
| Calendar-day label | PASS — September 13 displayed correctly |
| Main navigation | PASS — Saved BOLs, Account Ledger, A4 Preview, BOL Settings, and BOL Editor select and render content |
| Framework/runtime errors | PASS — no page errors or console errors in final run |
| Mobile page overflow | PASS — document width equals viewport width, 390px |
| Screenshots | PASS — desktop and mobile screenshots inspected |

Interaction loop: login page → rejected incorrect password → successful configured login → BOL editor/date verification → each of the five main tabs → mobile viewport verification. Tab checks wait for lazy-loaded modules to finish rendering. Cloud sync requests were intercepted with a no-data response to keep the test local; cloud sync itself was not verified.

## Remaining work and limits

1. **Server-enforced authorization remains required.** The local UI still stores users/session profiles in browser storage and includes default credentials. Several local API routes are not protected by authenticated server sessions. The fixed UI checks do not make the application secure for untrusted multi-user or public access.
2. **Cloud-only routes remain unverified.** `/api/bols` and `/api/templates` return HTTP 500 without cloud configuration. The working local BOL route is `/api/bol`. Cloud authentication, synchronization, storage permissions, and recovery require testing against an authorized configured environment.
3. **Not exercised:** installation/upgrades of the packaged Electron app, physical printers, all PDF layouts and mixed-script visual output, all import formats, multi-device conflicts, multi-process database concurrency, or exchange-rate calculations. Mixed calendars within one ledger have not been validated; current date ordering normalizes formats without converting between calendars.
4. Default lint coverage is now meaningful but remains limited. The legacy codebase still contains explicit `any` and warrants gradual typing improvements.
5. The repository already had extensive modifications/deletions and untracked files before this review. No commit, reset, cleanup of user work, or deployment was made.

## Reproduction and evidence

- `npm test` (Node tests plus both TypeScript projects).
- `npm run lint`.
- `npm run build:local`.
- `node .qa/review-pdf.cjs` runs the existing shipping-document smoke fixture through the local TypeScript loader.
- `.qa/review-server.cjs`, `.qa/review-api.cjs`, and `.qa/review-ui-final.cjs` reproduce the isolated checks on this machine.
- Data/API/UI result files: `.qa/review-20260913-data.json`, `.qa/review-20260913-api.json`, `.qa/review-20260913-ui.json`.

Initial sandboxed Node test/build commands encountered `spawn EPERM`. Tests also passed with `--test-isolation=none`; production builds ran with approved worker-process access. The system `python` launcher was unavailable, so the bundled Python executable ran the project QA scripts. The temporary QA server was stopped after browser testing.

The Browser plugin can be installed for future in-app browser QA; this review used the existing Edge installation without installing dependencies.

![Verified desktop BOL editor](<C:/Users/Ahsanullah Qureshi/.codex/visualizations/2026/09/13/01a09b38-646f-7e22-acc0-2b9cc4929431/review-workspace-desktop.png>)
![Verified mobile BOL editor](<C:/Users/Ahsanullah Qureshi/.codex/visualizations/2026/09/13/01a09b38-646f-7e22-acc0-2b9cc4929431/review-workspace-mobile.png>)

