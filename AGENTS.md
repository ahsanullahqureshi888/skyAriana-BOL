---
trigger: always_on
---

# Sky Ariana BOL — Core Project Rules & Standards

## 1. TypeScript & Code Standards
- **Strict Mode Enforcement**: Maintain strict type safety across all React 19 components, Next.js App Router handlers, and utility modules. No implicit `any`.
- **UI Component Consistency**: Use Tailwind CSS and Radix UI / Shadcn primitives. Ensure responsive layouts for desktop, tablet, and mobile invoice viewing.

## 2. Accounting Invariance Identity
- **Mathematical Invariance**: All ledger entries, calculations, exports, and summary widgets must strictly satisfy:
  $$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$
- **Chronological Sequencing**: Running balances must be calculated chronologically in ascending order by transaction date.

## 3. Multi-Modal Bill of Lading (BOL) Consistency
- **Metadata Completeness**: BOL records must retain origin, transit border stations (e.g., Islam Qala, Torghundi, Hairatan, Spin Boldak), driver name, father name, driver rent, cargo carton count, gross weight, and net weight.
- **Relational Integrity**: Cross-reference BOL numbers seamlessly between shipment tables, client ledger accounts, and invoices.

## 4. Invoice & Fee Demarcation
- **Fee Segregation**: Demarcate Freight, Demurrage/Detention, and Documentation Fees with accurate currency distinctions (USD vs. AFN).
- **Exchange Rates**: Any multi-currency conversions must explicitly declare the applied exchange rate and preserve base currency records.

## 5. Bilingual & RTL Support
- **Labels & Formatting**: Maintain English and Pashto / Dari label mapping across all financial statements, invoices, and print sheets.
- **Directionality**: Apply `dir="rtl"` and appropriate typography when rendering Pashto/Dari text columns.

## 6. Data Integrity & Persistence
- **Atomic Operations**: Always write local JSON snapshots (`.local-*.json`) atomically to prevent file corruption during concurrent operations or background syncs.
