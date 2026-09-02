---
name: qa-and-deployment
description: >-
  Execute end-to-end QA validation, strict TypeScript checking, accounting invariance audits,
  and Vercel/Next.js production build and deployment workflows for Sky Ariana BOL.
---

# QA & Production Deployment Workflow

## Overview
This skill provides automated runbooks and verification commands to ensure that Sky Ariana BOL code changes pass all strict TypeScript checks, maintain ledger accounting identities, pass Next.js build steps, and deploy cleanly to production.

---

## Prerequisites
- Node.js 18+ and npm / pnpm
- Python 3.8+ (for local snapshot and ledger invariance audit)
- Project root dependencies installed (`npm install`)

---

## 1. Pre-Deployment QA Checklist

Always run the full verification pipeline before merging code or pushing to production:

```bash
python .agents/skills/qa-and-deployment/scripts/verify_project.py
```

This performs:
1. **Snapshot Integrity Check**: Verifies that `.local-bols.json`, `.local-account-ledgers.json`, and `.local-invoices.json` are valid JSON.
2. **Accounting Invariance Verification**: Enforces $\text{Balance} = \text{Debit} - \text{Credit}$ sequentially across all accounts.
3. **TypeScript Strict Typecheck**: Executes `npx tsc --noEmit` to catch any subtle React 19 / Next.js 16 type discrepancies.

---

## 2. Production Build Verification

Verify that Next.js static asset generation and bundle compilation succeed:

```bash
npm run build
```

Ensure:
- No ESLint errors block the build.
- Dynamic route segments (`app/api/...`) compile without unresolved imports.
- Server Actions / Route Handlers have complete response types.

---

## 3. Deployment Procedure (Vercel)

For production deployment:
1. Run pre-deployment verification:
   ```bash
   python .agents/skills/qa-and-deployment/scripts/verify_project.py
   ```
2. Check git status to ensure working directory is clean:
   ```bash
   git status
   ```
3. Trigger Vercel preview or production deploy:
   - Preview deployment: `npx vercel`
   - Production deployment: `npx vercel --prod`
