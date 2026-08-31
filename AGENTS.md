---
trigger: always_on
---

# Project Rules & Guidelines

- **TypeScript Standard**: Use TypeScript strict mode and ensure complete type definitions across components and API routes.
- **Ledger Invariance**: All ledger entries, calculations, and exports must strictly maintain the accounting balance identity:
  $$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$
- **Data Integrity**: Ensure synchronization consistency across Bills of Lading, Account Ledgers, and Invoices.
- **Bilingual Context**: Maintain English and Pashto / Dari label mapping for all financial statements and reports.
