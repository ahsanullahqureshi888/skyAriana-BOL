# Sky Ariana BOL — Design System Architecture & Directory

This directory contains the authoritative UI/UX design intelligence and system specifications for **Sky Ariana BOL**, generated with the `ui-ux-pro-max` design intelligence engine.

---

## Architecture: Master + Overrides Pattern

```
design-system/sky-ariana-bol/
├── MASTER.md                     # Global Source of Truth (Colors, Typography, Spacing, Global Components)
├── README.md                     # System Architecture & Directory
└── pages/                        # View & Page Overrides
    ├── ledger.md                 # Account Ledgers & Debit/Credit Reconciliation
    ├── bill-of-lading.md         # Multi-Modal Bill of Lading & Cargo Manifests
    ├── invoice.md                # Multi-Currency Invoicing & Demurrage Fees
    ├── shipments.md              # Shipment Tracking & Border Transit Checkpoints
    ├── analytics.md              # Financial & Logistics Analytics Dashboard
    ├── reports.md                # Audit Reporting, Statements & Print Sheets
    ├── accounts.md               # Client & Partner Account Directory
    └── settings.md               # System Settings, Device Sync & Backups
```

### Retrieval Hierarchy
1. When designing or refactoring a view, check `pages/<page-name>.md` first.
2. If rules or components are defined in that override file, they take precedence for that view.
3. For all global tokens, base palettes, font imports, and universal accessibility constraints, follow [MASTER.md](./MASTER.md).

---

## Core System Specifications

### 1. Visual Theme & Palette
- **Style:** Dark Mode (OLED / Enterprise Financial)
- **Primary Surface:** `#0F172A` (`--color-primary`)
- **App Background:** `#020617` (`--color-background`)
- **Card Container:** `#0E1223` (`--color-card`)
- **Positive Accent / CTA:** `#22C55E` (`--color-accent`)
- **Destructive / Overdue:** `#EF4444` (`--color-destructive`)
- **Subtle Borders:** `#334155` (`--color-border`)

### 2. Typography & Numbers
- **Monospace / Numerics:** `Fira Code` — used for financial balances, BOL sequence numbers, exchange rates, and container tracking codes.
- **Body & Labels:** `Fira Sans` — clean, dense, readable typography.
- **RTL Support:** Native right-to-left layout direction (`dir="rtl"`) with Pashto and Dari typography pairings.

### 3. Spacing & Density
- **Density Tier:** `8/10` (Dense / Dashboard Scale)
- Compact padding (`2px` - `8px`) for maximum information density in ledger spreadsheets and transit manifests without visual clutter.

### 4. Invariance & Engineering Rules
- **Accounting Invariance:** $\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$ across all summary cards and table rows.
- **Icon Set:** Lucide React SVG icons exclusively (`lucide-react`). No emojis.
- **Motion:** Standard smooth transitions (`150ms` - `300ms`), respecting `prefers-reduced-motion`. No bouncy physics on financial data tables.
