export interface SystemVersionInfo {
  version: string
  buildNumber: string
  releaseDate: string
  edition: string
  companyName: string
  applicationName: string
  developer: string
  platform: string
  updateChannel: "stable" | "beta"
  changelog: {
    version: string
    date: string
    title: string
    changes: string[]
  }[]
  systemRequirements: {
    recommendedBrowser: string
    pdfEngine: string
    localStoreKey: string
  }
}

export const CURRENT_SYSTEM_VERSION: SystemVersionInfo = {
  version: "v3.2.0",
  buildNumber: "2026.08.08-PRO",
  releaseDate: "2026-08-08",
  edition: "SKY ARIANA LIMITED Enterprise Edition",
  companyName: "SKY ARIANA LIMITED",
  applicationName: "Sky Ariana BOL",
  developer: "AHSANULLAH QURESHI",
  platform: "Windows Desktop / Electron",
  updateChannel: "stable",
  changelog: [
    {
      version: "v3.2.0",
      date: "2026-08-08",
      title: "User Management & Glassmorphism Security Update",
      changes: [
        "Added User Management with 4 System Roles: Superadmin, Admin, Accountant, Viewer.",
        "Added Change Password portal inside Settings with security verification.",
        "Created central System Version & Update config file (system-version.ts).",
        "Upgraded Edit Form cards with high contrast labels and dual-language badges.",
        "Integrated glassmorphic login screen with remember-me session persistence.",
      ],
    },
    {
      version: "v3.1.0",
      date: "2026-08-06",
      title: "Logistics Timeline & Dual Currency Ledger Upgrade",
      changes: [
        "Enhanced Route / Transportation timeline cards in A4 preview.",
        "Added automatic city name duplicate country code cleanup.",
        "Integrated multi-account ledger PDF export.",
      ],
    },
  ],
  systemRequirements: {
    recommendedBrowser: "Google Chrome, Microsoft Edge, Mozilla Firefox (Latest)",
    pdfEngine: "Turbopack Next.js HTML5 Canvas & Blob Stream",
    localStoreKey: "sky-bol-saved-documents",
  },
}
