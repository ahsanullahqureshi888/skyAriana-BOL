# Security Cleanup Instructions

To completely remove the sensitive files from Git history, you must run the following commands:

\\\ash
# Using git filter-repo (recommended)
git filter-repo --invert-paths --path .local-account-ledgers.json --path .local-bol-account-ledgers.json --path .local-bols.json --path .local-invoices.json --path sync_audit_report.json --path sync_status.json --path validation_report.json --path .codex-logs --path tsconfig.tsbuildinfo --path bol-ledger/tsconfig.tsbuildinfo
\\\`n
**IMPORTANT:**
1. After rewriting history, you will need to force push (\git push origin --force --all\).
2. Anyone else working on this repository must clone a fresh copy to avoid re-introducing the files.
3. If you had any active transfer codes or API keys exposed in these files, you MUST invalidate and rotate them immediately.