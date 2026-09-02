---
trigger: always_on
---

# Coding Standards & Accounting Invariance

- **TypeScript Strict Mode**: Maintain strict type safety across all React components, utility libraries, and Next.js API routes.
- **Accounting Invariance**: All ledger calculations and balance summaries must satisfy:
  $$\text{Balance} = \text{Debit} - \text{Credit}$$
- **Multi-Modal BOL Consistency**: Bills of Lading must retain origin, transit border stations, driver rent, and cargo carton/weight metadata.
- **Invoice & Fee Integrity**: Invoices must clearly demarcate Freight, Demurrage/Detention, and Documentation Fees with accurate currency distinctions (USD vs. AFN).
- **Safe JSON Storage**: Any read/write operations to `.local-*.json` files must validate data schema before serializing.
