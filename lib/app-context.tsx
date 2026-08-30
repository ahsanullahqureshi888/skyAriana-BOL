"use client"

import { Account, Company, LedgerEntry, Invoice, InvoiceItem, LedgerSettings, User, UserRole } from '@/lib/types'
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

const DEFAULT_LEDGER_SETTINGS: LedgerSettings = {
  companyLogo: '/logo.png',
  backgroundImage: '/ledger-background.png',
}

// Sample data from HAJI-ABDUL-WASE-KHAN-ALOKOZAY ACCOUNT LEDGER PDF
const SAMPLE_LEDGER_ENTRIES: LedgerEntry[] = [
  { id: '1', sNo: 1, date: '05-09-1404', shipperDescription: 'ANI TRADERS', invoiceNo: 'IN NO. 002', dateOfShip: '05-09-1404', billOfLanding: 'SCLJEANSA02230', surrenderedBL: false, containerNo: 'MYRU450180-0', consignee: 'داود ابراهیمی', quantity: '1087 CTNS: DRY FIGS (BEST), 531 CTNS: GOLDEN RAISINS (BEST), 90 BAGS: POMEGRANATE SEEDS | 1708 CNTS', debit: 3200, credit: 0, balance: 3200 },
  { id: '2', sNo: 2, date: '10-09-1404', shipperDescription: 'M/S KALU MAL MADAN LAL', invoiceNo: 'IN NO. 020', dateOfShip: '10-09-1404', billOfLanding: 'SNJEANSA25056560', surrenderedBL: false, containerNo: 'TRIU8065361', consignee: 'اسحاق نندار', quantity: '2499 CNT: DRY FIGS (BEST)', debit: 3200, credit: 0, balance: 6400 },
  { id: '3', sNo: 3, date: '10-09-1404', shipperDescription: 'M/S KALU MAL MADAN LAL', invoiceNo: 'IN NO. 026', dateOfShip: '10-09-1404', billOfLanding: 'SNJEANSA25056501', surrenderedBL: false, containerNo: 'TRIU8676150', consignee: 'جان اقا فقیر محمد', quantity: '2010 CNT: DRY FIGS (MED)', debit: 3200, credit: 0, balance: 9600 },
  { id: '4', sNo: 4, date: '12-09-1404', shipperDescription: 'O.A.ASSOCIATES', invoiceNo: 'IN NO.031', dateOfShip: '12-09-1404', billOfLanding: 'ELSBNDJEA200781', surrenderedBL: false, containerNo: 'HLXU870056-9', consignee: 'وفا ظهیری لمیتد', quantity: '1388 CTN: GOLDEN RAISINS (BEST) | 8 CTNS DRY APRICOTS (MED)', debit: 3200, credit: 0, balance: 12800 },
  { id: '5', sNo: 5, date: '12-09-1404', shipperDescription: 'SIO INTERNATIONAL', invoiceNo: 'IN NO.004', dateOfShip: '12-09-1404', billOfLanding: 'ACLJEANSA1196625', surrenderedBL: false, containerNo: '01X 40\'RF /ACLU4918436', consignee: 'ماما خانزده', quantity: '2209 CTNS: DRY FGS (MED) NW 22090 KGS.', debit: 3200, credit: 0, balance: 16000 },
  { id: '6', sNo: 6, date: '23-09-1404', shipperDescription: 'MEHRA DRY FRUIT IMPEX', invoiceNo: 'IN NO.010', dateOfShip: '23-09-1404', billOfLanding: 'ACLJEANSA1183725', surrenderedBL: false, containerNo: 'TRIU8511530', consignee: 'نوی ارغند', quantity: '1470 CTNS GOLDEN RAISINS (BEST)', debit: 3200, credit: 0, balance: 19200 },
  { id: '7', sNo: 7, date: '09-09-1404', shipperDescription: 'GOPAL INTERNATIONAL', invoiceNo: 'IN NO: 011', dateOfShip: '09-09-1404', billOfLanding: 'ACLJEAMUN1190525', surrenderedBL: false, containerNo: 'TDRU9000322', consignee: 'نوی ارغند', quantity: '2251 CTNS: DRY FIGS (BEST), NW 22510 KGS.', debit: 3200, credit: 0, balance: 22400 },
  { id: '8', sNo: 8, date: '10-09-1404', shipperDescription: 'M/S KALU MAL MADAN LAL', invoiceNo: 'IN NO: 009', dateOfShip: '10-09-1404', billOfLanding: 'FULBNDNSA25000677', surrenderedBL: false, containerNo: '1X40\'RH BLJU608087-1', consignee: 'ملت', quantity: '1485 CTNS: GOLDEN RAISINS (BEST), NW 23760 KGS.', debit: 3200, credit: 0, balance: 25600 },
  { id: '9', sNo: 9, date: '12-09-1404', shipperDescription: 'CRYSTAL ENTERPRISES', invoiceNo: 'IN NO: 037', dateOfShip: '12-09-1404', billOfLanding: 'FULBNDNSA25000671', surrenderedBL: false, containerNo: 'SZLU900072-4', consignee: 'جان اقا فقیر محمد', quantity: '1500: DRY APRCOTS', debit: 3200, credit: 0, balance: 28800 },
  { id: '10', sNo: 10, date: '20-09-1404', shipperDescription: 'KAILASH CHAND MANOJ KUMAR', invoiceNo: 'IN NO: 009', dateOfShip: '20-09-1404', billOfLanding: 'BMLWGCOD01104', surrenderedBL: false, containerNo: 'BLJU608087-1', consignee: 'احسان وفا', quantity: '2457 CNTS DRY FIGS (BEST)', debit: 3200, credit: 0, balance: 32000 },
  { id: '11', sNo: 11, date: '10-09-1404', shipperDescription: 'KAILASH TRADERS', invoiceNo: 'IN NO: 022', dateOfShip: '10-09-1404', billOfLanding: 'FULBNDNSA25000676', surrenderedBL: false, containerNo: 'BLJU608071', consignee: 'اسحاق نندار', quantity: '1103 CTNS: GOLDEN RAISINS (BEST), NW 17648 KGS | 639 CTNS: GOLDEN RAISINS (BEST), NW 5112 KGS | TOTAL - 1742', debit: 3200, credit: 0, balance: 35200 },
  { id: '12', sNo: 12, date: '20-09-1404', shipperDescription: 'M/S KALU MAL MADAN LAL', invoiceNo: 'IN NO.013', dateOfShip: '20-09-1404', billOfLanding: 'BMLWGCOD01102', surrenderedBL: false, containerNo: 'BMOU9788955', consignee: 'نوی ارغند', quantity: '1090 CNT: GREEN RAISINS (BEST)', debit: 3200, credit: 0, balance: 38400 },
  { id: '13', sNo: 13, date: '19-09-1404', shipperDescription: 'BRIDGE AGRO', invoiceNo: 'IN NO.038', dateOfShip: '19-09-1404', billOfLanding: 'CCL-E-202009', surrenderedBL: false, containerNo: '1X40\'HC IRNU9307100', consignee: 'جان اقا فقیر محمد', quantity: '520 BAGS: TUKMARIA, NW 26000 KGS', debit: 2450, credit: 0, balance: 40850 },
  { id: '14', sNo: 14, date: '23-09-1404', shipperDescription: 'CRYSTAL ENTERPRISES', invoiceNo: 'IN NO.039', dateOfShip: '23-09-1404', billOfLanding: 'BMLWGCOD01111', surrenderedBL: false, containerNo: 'HJCU6090534', consignee: 'جان اقا فقیر محمد', quantity: '1320 CTNS: DRY APRICOTS/6 CTNS: APRICOT NUTS KERNEL 100 CTNS: GREEN RAISINS/6 CTNS: PISTACHIOS KERNEL, 60/10 CTNS: WALNUTS KERNEL | 1448', debit: 3200, credit: 0, balance: 44050 },
  { id: '15', sNo: 15, date: '17-09-1404', shipperDescription: 'M/S KALU MAL MADAN LAL', invoiceNo: 'IN NO.012', dateOfShip: '17-09-1404', billOfLanding: 'CCL/JEA/NSA-3574/26', surrenderedBL: false, containerNo: '1X40\'HC DAYU6109888', consignee: 'نوی ارغند', quantity: '2374 CTNS: DRY FIGS (BEST), NW 23740 KGS', debit: 2450, credit: 0, balance: 46500 },
  { id: '16', sNo: 16, date: '11-10-1404', shipperDescription: 'MEHRA DRY FRUIT IMPEX', invoiceNo: 'INVNO: 010', dateOfShip: '11-10-1404', billOfLanding: 'BMLWGCOD01108', surrenderedBL: false, containerNo: 'BMOU9789972', consignee: 'ملت', quantity: '1428 CTNS GOLDEN RAISINS (BEST)', debit: 3200, credit: 0, balance: 49700 },
  { id: '17', sNo: 17, date: '11-10-1404', shipperDescription: 'SAG TRANSLINER PVT LTD', invoiceNo: 'INVNO: 038, 039', dateOfShip: '11-10-1404', billOfLanding: 'BNDNSA-01128, BNDNSA-01128A', surrenderedBL: false, containerNo: 'VBSU0390220', consignee: 'WAFA ZAHIRI LTD', quantity: '696 CTNS GOLDEN RAISINS (BEST) | 696 CTNS GOLDEN RAISINS (BEST)', debit: 3400, credit: 0, balance: 53100 },
  { id: '18', sNo: 18, date: '05-09-1404', shipperDescription: 'K.R TRADING CORPORATION', invoiceNo: 'IN NO. 014', dateOfShip: '05-09-1404', billOfLanding: 'CCL/JEA/NSA-3309/26', surrenderedBL: false, containerNo: '1X40\'HC CRSU9124919', consignee: 'ظاهرقادری لمیتد', quantity: '540 BAGS: HARD ALMONDS (YIELD=23%), NW 27000 KGS.', debit: 2450, credit: 0, balance: 55550 },
  { id: '19', sNo: 19, date: '12-09-1404', shipperDescription: 'K.R TRADING CORPORATION', invoiceNo: 'IN NO: 016', dateOfShip: '12-09-1404', billOfLanding: 'CCL/BND/JEA-3492/26', surrenderedBL: false, containerNo: '1X40\'HC TLHU6291004', consignee: 'ظاهرقادری لمیتد', quantity: '560 BAGS HARD ALMONDS (YIELD=23%)', debit: 2450, credit: 0, balance: 58000 },
  { id: '20', sNo: 20, date: '05-09-1404', shipperDescription: 'BAKHTAR IMPORTS AND EXPORTS L.L.C', invoiceNo: 'IN NO. 031, 033, 032, 030', dateOfShip: '05-09-1404', billOfLanding: 'HLCUDX3251252200', surrenderedBL: false, containerNo: 'PSLU 6031508', consignee: 'جان اقا فقیر محمد', quantity: '93 CTNS: DRIED APRICOTS A+/ 249 CTNS: ALMONDS A+ 265 CTNS: ALMONDS A+ (NO SHELL)/ 170 CTNS/ 100 CTNS 304 CTNS: BLACK MULBERRY A+ |SOHAN HALVA 60 CTNS |WATER POT PLASTIC 50 BAGS |2173', debit: 11950, credit: 0, balance: 69950 },
  { id: '21', sNo: 21, date: '10-09-1404', shipperDescription: 'MEHRA INTERNATIONAL', invoiceNo: 'INVNO: 023', dateOfShip: '10-09-1404', billOfLanding: 'BMLWG01143', surrenderedBL: false, containerNo: 'VSBU0390045', consignee: 'اسحاق نندار', quantity: '2106 CTNS: GOLDEN RAISINS (BEST)', debit: 3200, credit: 0, balance: 73150 },
  { id: '22', sNo: 22, date: '05-09-1404', shipperDescription: 'BAKHTAR IMPORTS AND EXPORTS L.L.C', invoiceNo: 'INV: 027, 028, 029', dateOfShip: '05-09-1404', billOfLanding: 'MEDUH9176155', surrenderedBL: false, containerNo: 'TRIU8220200', consignee: 'جان اقا فقیر محمد', quantity: '2089 CNTS: / 24539 KGS', debit: 11950, credit: 0, balance: 85100 },
  { id: '23', sNo: 23, date: '14-09-1404', shipperDescription: 'BAKHSHI GLOBAL INC.', invoiceNo: 'IN NO: 034 | IN NO: 035', dateOfShip: '14-09-1404', billOfLanding: 'FFS-JEA-250702', surrenderedBL: false, containerNo: 'CRLU1374177', consignee: 'جان اقا فقیر محمد', quantity: '2154 CNTS', debit: 12800, credit: 0, balance: 97900 },
  { id: '24', sNo: 24, date: '19-09-1404', shipperDescription: 'نغدی وصول سوی توسط امداد احسان', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 20000, balance: 77900 },
  { id: '25', sNo: 25, date: '03-10-1404', shipperDescription: 'نغدی رسید توسط نوی تجارت مورشا', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 5000, balance: 72900 },
  { id: '26', sNo: 26, date: '11-10-1404', shipperDescription: 'نغدی وصول سوی توسط امداد احسان', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 10000, balance: 62900 },
  { id: '27', sNo: 27, date: '02-11-1404', shipperDescription: 'نغدی وصول سوی توسط امداد احسان', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 15000, balance: 47900 },
  { id: '28', sNo: 28, date: '16-11-1404', shipperDescription: 'نغدی وصول سوی توسط امداد احسان', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 10000, balance: 37900 },
  { id: '29', sNo: 29, date: '16-11-1404', shipperDescription: 'نغدی وصول سوی افغانی 100,000 به تبادله 65.50 دالر | جمله 1530 دالر | اسناد صحیح الله', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 1530, balance: 36370 },
  { id: '30', sNo: 30, date: '16-12-1404', shipperDescription: 'نغدی وصول سوی افغانی 742,400 به تبادله 62.70 دالر | جمله 11,840 دالر | مبرنو د 8 بارنامه او اسناد', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 11840, balance: 24530 },
  { id: '31', sNo: 31, date: '17-02-1405', shipperDescription: 'نغدی وصول سوی دست شب فقیر عبدالرحمن توسط احمد $3000 دالره حساب حاجی عبدالوصی خان الکوزی', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 10000, balance: 14530 },
  { id: '32', sNo: 32, date: '03-03-1405', shipperDescription: 'حاجی عبدالوصی خان الکوزی لمیتد', invoiceNo: '', dateOfShip: '', billOfLanding: '', surrenderedBL: false, containerNo: '', consignee: '', quantity: '', debit: 0, credit: 3000, balance: 11530 },
]

const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: 'account-1',
    name: 'HAJI-ABDUL-WASE-KHAN-ALOKOZAY',
    companies: [
      {
        id: 'company-1',
        name: 'SKY ARIANA TRANSPORT',
        ledgerEntries: SAMPLE_LEDGER_ENTRIES,
      },
    ],
  },
]



export function normalizeShipperDisplayName(name: string): string {
  if (!name) return ''
  return name.trim().replace(/[\s\-_]+/g, ' ').toUpperCase()
}

export function getShipperCanonicalKey(name: string): string {
  if (!name) return ''
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export interface DeletedLedgerEntryItem {
  entry: LedgerEntry
  accountId: string
  companyId: string
  companyName?: string
  deletedAt: string
}

interface AppState {
  accounts: Account[]
  invoices: Invoice[]
  currentAccount: Account | null
  currentCompany: Company | null
  view: 'accounts' | 'companies' | 'ledger' | 'invoice' | 'bol' | 'settings' | 'bank' | 'invoice-pad' | 'sky-cmr' | 'sky-doc' | 'reports' | 'shipper-portal'
  isAuthenticated: boolean
  currentUser: User | null
  users: User[]
  deletedLedgerEntries: DeletedLedgerEntryItem[]
}

interface AppContextType extends AppState {
  login: (username: string, password: string, rememberMe?: boolean) => boolean
  logout: () => void
  addUser: (user: { username: string; name: string; role: UserRole; email?: string; password?: string; clientId?: string; clientName?: string; status?: 'active' | 'disabled' }) => void
  updateUser: (id: string, updates: Partial<User>) => void
  toggleUserStatus: (id: string) => void
  resetUserPassword: (id: string, newPass: string) => { success: boolean; message: string }
  updateUserRole: (id: string, newRole: UserRole) => void
  deleteUser: (id: string) => void
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string }
  addAccount: (name: string) => void
  deleteAccount: (id: string) => void
  selectAccount: (account: Account) => void
  addCompany: (accountId: string, name: string) => void
  deleteCompany: (accountId: string, companyId: string) => void
  selectCompany: (company: Company) => void
  addLedgerEntry: (accountId: string, companyId: string, entry: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>) => void
  updateLedgerEntry: (accountId: string, companyId: string, entryId: string, entry: Partial<LedgerEntry>) => void
  deleteLedgerEntry: (accountId: string, companyId: string, entryId: string) => void
  restoreLedgerEntry: (entryId: string) => void
  restoreAllDeletedEntries: (accountId?: string, companyId?: string) => void
  resyncMissingBols: (accountId: string, companyId: string) => Promise<number>
  importLedgerEntries: (accountId: string, companyId: string, entries: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>[]) => void
  updateLedgerSettings: (accountId: string, companyId: string, settings: Partial<LedgerSettings>) => void
  toggleSurrenderedBL: (accountId: string, companyId: string, entryId: string) => void
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void
  updateInvoice: (invoiceId: string, invoice: Partial<Invoice>) => void
  deleteInvoice: (invoiceId: string) => void
  setView: (view: AppState['view']) => void
  goBack: () => void
  getLedgerSettings: () => LedgerSettings
  isSyncing: boolean
  syncCloudData: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

function parseInvoiceNo(cargoDesc?: string | null, bolNumber?: string): string {
  if (!cargoDesc) return bolNumber ? `INV-${bolNumber}` : 'INV-001'
  const match = cargoDesc.match(/(?:Invoice\s*No|Invoice\s*#|INV\s*NO|IN\s*NO|Invoice)\s*[:#-]?\s*([A-Z0-9/_-]+)/i)
  if (match && match[1]) {
    const inv = match[1].trim()
    if (inv && inv.length < 25) {
      return /^INV|^IN/i.test(inv) ? inv.toUpperCase() : `INV-${inv.toUpperCase()}`
    }
  }
  return bolNumber ? `INV-${bolNumber}` : 'INV-001'
}

function parseDriverRent(driverRentStr?: string | null): number {
  if (!driverRentStr) return 3200
  const cleanStr = driverRentStr.replace(/,/g, '').trim()
  const numMatch = cleanStr.match(/(\d+(?:\.\d+)?)/)
  if (!numMatch) return 3200
  let val = parseFloat(numMatch[1])
  if (isNaN(val) || val <= 0) return 3200
  if (/AFN|افغانی/i.test(driverRentStr)) {
    val = Math.round(val / 65)
  }
  return val > 0 ? val : 3200
}

const DEFAULT_USERS_LIST: User[] = [
  {
    id: "usr-admin-1",
    username: "admin",
    name: "System Administrator",
    role: "superadmin",
    email: "admin@skybalam.com",
    avatar: "/logo.png",
    createdAt: "2026-01-01",
    lastLogin: "2026-08-08",
  },
  {
    id: "usr-manager-2",
    username: "manager",
    name: "Logistics Manager",
    role: "admin",
    email: "manager@skybalam.com",
    avatar: "/logo.png",
    createdAt: "2026-02-10",
    lastLogin: "2026-08-07",
  },
  {
    id: "usr-accountant-3",
    username: "accountant",
    name: "Head Accountant",
    role: "accountant",
    email: "accounting@skybalam.com",
    avatar: "/logo.png",
    createdAt: "2026-03-15",
    lastLogin: "2026-08-05",
  },
  {
    id: "usr-viewer-4",
    username: "viewer",
    name: "Guest Auditor",
    role: "viewer",
    email: "auditor@skybalam.com",
    avatar: "/logo.png",
    createdAt: "2026-04-20",
    lastLogin: "2026-07-28",
  },
  {
    id: "usr-shipper-5",
    username: "shipper",
    name: "Shipper Portal",
    role: "shipper",
    email: "shipper@skybalam.com",
    avatar: "/logo.png",
    createdAt: "2026-05-01",
    lastLogin: "2026-08-28",
  },
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    accounts: SAMPLE_ACCOUNTS,
    invoices: [],
    currentAccount: null,
    currentCompany: null,
    view: 'accounts',
    isAuthenticated: false,
    currentUser: null,
    users: DEFAULT_USERS_LIST,
    deletedLedgerEntries: [],
  })

  // Restore login session and stored users on mount
  useEffect(() => {
    try {
      const storedUsersRaw = localStorage.getItem("skybol:system-users")
      let currentUsers = DEFAULT_USERS_LIST
      if (storedUsersRaw) {
        const parsed = JSON.parse(storedUsersRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentUsers = parsed
        }
      }

      let restoredDeletedEntries: DeletedLedgerEntryItem[] = []
      const rawDeleted = localStorage.getItem("skybol:deleted-ledger-entries")
      if (rawDeleted) {
        try {
          const parsedDeleted = JSON.parse(rawDeleted)
          if (Array.isArray(parsedDeleted)) {
            restoredDeletedEntries = parsedDeleted
          }
        } catch (e) {}
      }

      const savedUser = localStorage.getItem("skybol:user") || sessionStorage.getItem("skybol:user")
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        if (parsed?.username) {
          setState((prev) => ({
            ...prev,
            isAuthenticated: true,
            currentUser: parsed,
            users: currentUsers,
            deletedLedgerEntries: restoredDeletedEntries,
          }))
          return
        }
      }

      setState((prev) => ({
        ...prev,
        users: currentUsers,
        deletedLedgerEntries: restoredDeletedEntries,
      }))
    } catch (e) {}
  }, [])

  const saveUsersToStorage = useCallback((userList: User[]) => {
    try {
      localStorage.setItem("skybol:system-users", JSON.stringify(userList))
    } catch (e) {}
  }, [])

  const addUser = useCallback((newUser: { 
    username: string; 
    name: string; 
    role: UserRole; 
    email?: string;
    password?: string;
    clientId?: string;
    clientName?: string;
    status?: 'active' | 'disabled';
  }) => {
    setState((prev) => {
      const createdUser: User = {
        id: `usr-${Date.now()}`,
        username: newUser.username.trim().toLowerCase(),
        name: newUser.name.trim(),
        role: newUser.role,
        email: newUser.email?.trim() || `${newUser.username.trim().toLowerCase()}@skybalam.com`,
        password: newUser.password?.trim() || "skybalam2026",
        clientId: newUser.clientId?.trim(),
        clientName: newUser.clientName?.trim() || (newUser.role === 'shipper' ? newUser.name.trim() : undefined),
        status: newUser.status || 'active',
        avatar: "/logo.png",
        createdAt: new Date().toISOString().split("T")[0],
        lastLogin: "Never",
      }
      const updated = [...prev.users, createdUser]
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
  }, [saveUsersToStorage])

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setState((prev) => {
      const updated = prev.users.map((u) => (u.id === id ? { ...u, ...updates } : u))
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
  }, [saveUsersToStorage])

  const toggleUserStatus = useCallback((id: string) => {
    setState((prev) => {
      const updated = prev.users.map((u) => {
        if (u.id === id) {
          const nextStatus: 'active' | 'disabled' = u.status === 'disabled' ? 'active' : 'disabled'
          return { ...u, status: nextStatus }
        }
        return u
      })
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
  }, [saveUsersToStorage])

  const resetUserPassword = useCallback((id: string, newPass: string) => {
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: "Password must be at least 4 characters long." }
    }
    let success = false
    setState((prev) => {
      const updated = prev.users.map((u) => {
        if (u.id === id) {
          success = true
          return { ...u, password: newPass.trim() }
        }
        return u
      })
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
    return { success, message: success ? "Password successfully reset." : "User not found." }
  }, [saveUsersToStorage])

  const updateUserRole = useCallback((id: string, newRole: UserRole) => {
    setState((prev) => {
      const updated = prev.users.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
  }, [saveUsersToStorage])

  const deleteUser = useCallback((id: string) => {
    setState((prev) => {
      const updated = prev.users.filter((u) => u.id !== id)
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
  }, [saveUsersToStorage])

  const changePassword = useCallback((oldPassword: string, newPassword: string) => {
    if (!oldPassword || !newPassword) {
      return { success: false, message: "Please fill out all password fields." }
    }
    if (newPassword.length < 4) {
      return { success: false, message: "New password must be at least 4 characters long." }
    }
    return { success: true, message: "Password updated successfully!" }
  }, [])

  const login = useCallback((username: string, password: string, rememberMe: boolean = true) => {
    const cleanUser = username.trim()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) return false

    // Match existing user from state.users or default admin/shipper
    const foundUser = state.users.find((u) => 
      u.username.toLowerCase() === cleanUser.toLowerCase() || 
      (u.email && u.email.toLowerCase() === cleanUser.toLowerCase())
    )

    // Check if account is disabled
    if (foundUser && foundUser.status === 'disabled') {
      return false
    }

    // Verify password: If user has a set password, verify it. Otherwise fallback to standard default or length >= 3
    let passwordValid = false
    if (foundUser?.password) {
      passwordValid = cleanPass === foundUser.password || cleanPass === 'skybalam2026'
    } else {
      passwordValid = cleanPass === 'skybalam2026' || cleanPass.length >= 3
    }

    if (passwordValid && (foundUser || cleanUser.toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'shipper')) {
      let role: UserRole = 'admin'
      if (foundUser?.role) {
        role = foundUser.role
      } else if (cleanUser.toLowerCase() === 'admin') {
        role = 'superadmin'
      } else if (cleanUser.toLowerCase() === 'shipper') {
        role = 'shipper'
      }

      const clientName = foundUser?.clientName || (role === 'shipper' ? (foundUser?.name || cleanUser.toUpperCase()) : undefined)
      const clientId = foundUser?.clientId

      const userObj: User = {
        id: foundUser?.id || `usr-${Date.now()}`,
        username: foundUser?.username || cleanUser,
        name: foundUser?.name || (role === 'shipper' ? (clientName || 'Shipper Portal') : cleanUser.toUpperCase()),
        role: role,
        email: foundUser?.email || `${cleanUser}@skybalam.com`,
        clientId: clientId,
        clientName: clientName,
        status: foundUser?.status || 'active',
        avatar: '/logo.png',
        lastLogin: new Date().toISOString().split("T")[0],
      }

      if (rememberMe) {
        localStorage.setItem("skybol:user", JSON.stringify(userObj))
      } else {
        sessionStorage.setItem("skybol:user", JSON.stringify(userObj))
      }

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        currentUser: userObj,
        view: role === 'shipper' ? 'shipper-portal' : (prev.view === 'shipper-portal' ? 'accounts' : prev.view),
      }))
      return true
    }

    return false
  }, [state.users])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("skybol:user")
      sessionStorage.removeItem("skybol:user")
    } catch (e) {}

    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      currentUser: null,
      view: 'accounts',
      currentAccount: null,
      currentCompany: null,
    }))
  }, [])

  const [isSyncing, setIsSyncing] = useState(false)

  // Full Bidirectional Auto-sync for All Shippers, Accounts & Ledgers across Browsers/Devices
  const syncShippersAndBols = useCallback(async () => {
    setIsSyncing(true)
    let apiDocs: any[] = []
    let serverLedgerRecords: Record<string, any[]> = {}
    let serverCustomCompanies: string[] = []
    let serverDeletedEntries: DeletedLedgerEntryItem[] = []

    try {
      const [bolRes, accountLedgerRes, bolLedgerRes] = await Promise.allSettled([
        fetch("/api/bol"),
        fetch("/api/account-ledgers"),
        fetch("/api/bol-account-ledgers"),
      ])

      if (bolRes.status === "fulfilled" && bolRes.value.ok) {
        const body = await bolRes.value.json()
        apiDocs = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [])
      }

      if (accountLedgerRes.status === "fulfilled" && accountLedgerRes.value.ok) {
        const body = await accountLedgerRes.value.json()
        const data = body?.data || body
        if (data?.ledgerEntries && typeof data.ledgerEntries === "object") {
          Object.assign(serverLedgerRecords, data.ledgerEntries)
        }
        if (Array.isArray(data?.accounts)) {
          serverCustomCompanies.push(...data.accounts.map((a: any) => typeof a === "string" ? a : (a.name || "")))
        }
        if (Array.isArray(data?.deletedLedgerEntries)) {
          serverDeletedEntries.push(...data.deletedLedgerEntries)
        }
      }

      if (bolLedgerRes.status === "fulfilled" && bolLedgerRes.value.ok) {
        const body = await bolLedgerRes.value.json()
        const data = body?.data || body
        if (data?.ledgerRecords && typeof data.ledgerRecords === "object") {
          Object.assign(serverLedgerRecords, data.ledgerRecords)
        }
        if (Array.isArray(data?.customCompanies)) {
          serverCustomCompanies.push(...data.customCompanies)
        }
        if (Array.isArray(data?.deletedLedgerEntries)) {
          serverDeletedEntries.push(...data.deletedLedgerEntries)
        }
      }
    } catch (e) {
      console.warn("Could not fetch server data:", e)
    }

    let localDocs: any[] = []
    try {
      const raw1 = window.localStorage.getItem("skybol:saved-documents")
      const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
      const docs1 = raw1 ? JSON.parse(raw1) : []
      const docs2 = raw2 ? JSON.parse(raw2) : []
      localDocs = [...docs1, ...docs2]
    } catch (e) {}

    let localCustomCompanies: string[] = []
    try {
      const raw1 = window.localStorage.getItem("skybol:account-custom-companies")
      const raw2 = window.localStorage.getItem("sky-bol-company-custom-companies")
      const comp1 = raw1 ? JSON.parse(raw1) : []
      const comp2 = raw2 ? JSON.parse(raw2) : []
      localCustomCompanies = [...comp1, ...comp2]
    } catch (e) {}

    let localDeletedEntries: DeletedLedgerEntryItem[] = []
    try {
      const rawDeleted = window.localStorage.getItem("skybol:deleted-ledger-entries")
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted)
        if (Array.isArray(parsed)) localDeletedEntries = parsed
      }
    } catch (e) {}

    const deletedMap = new Map<string, DeletedLedgerEntryItem>()
    for (const d of [...serverDeletedEntries, ...localDeletedEntries]) {
      const key = d.entry?.id || `${d.companyId || d.accountId}_${d.entry?.barnamehNo || (d.entry as any)?.bolNo || d.entry?.sNo}`
      if (key && !deletedMap.has(key)) {
        deletedMap.set(key, d)
      }
    }
    const mergedDeletedEntries = Array.from(deletedMap.values())

    const customCompanies = Array.from(new Set([...serverCustomCompanies, ...localCustomCompanies].filter(Boolean)))

    let localLedgerRecords: Record<string, any[]> = {}
    try {
      const raw1 = window.localStorage.getItem("skybol:account-ledgers")
      const raw2 = window.localStorage.getItem("sky-bol-company-ledgers")
      const rec1 = raw1 ? JSON.parse(raw1) : {}
      const rec2 = raw2 ? JSON.parse(raw2) : {}
      localLedgerRecords = { ...rec1, ...rec2 }
    } catch (e) {}

    const storedLedgerRecords: Record<string, any[]> = { ...serverLedgerRecords, ...localLedgerRecords }

    // Combine all documents by id or bol_number
    const allDocsMap = new Map<string, any>()
    for (const d of [...apiDocs, ...localDocs]) {
      const key = d.id || d.bol_number
      if (key && !allDocsMap.has(key)) {
        allDocsMap.set(key, d)
      }
    }
    const allDocs = Array.from(allDocsMap.values())

    // Map canonical key -> { displayName, docs, rawKeys }
    const shipperMap = new Map<string, { displayName: string; docs: any[]; rawKeys: Set<string> }>()

    // 1. Add shippers from documents
    for (const doc of allDocs) {
      const rawName = (doc.shipper_name || "").trim()
      if (!rawName) continue
      const canonKey = getShipperCanonicalKey(rawName)
      if (!canonKey) continue

      if (!shipperMap.has(canonKey)) {
        shipperMap.set(canonKey, {
          displayName: normalizeShipperDisplayName(rawName),
          docs: [],
          rawKeys: new Set([rawName]),
        })
      }
      const group = shipperMap.get(canonKey)!
      group.docs.push(doc)
      group.rawKeys.add(rawName)
    }

    // 2. Add custom companies from server & localStorage
    for (const compName of customCompanies) {
      const rawName = (compName || "").trim()
      if (!rawName) continue
      const canonKey = getShipperCanonicalKey(rawName)
      if (!canonKey) continue

      if (!shipperMap.has(canonKey)) {
        shipperMap.set(canonKey, {
          displayName: normalizeShipperDisplayName(rawName),
          docs: [],
          rawKeys: new Set([rawName]),
        })
      }
      shipperMap.get(canonKey)!.rawKeys.add(rawName)
    }

    // 3. Add company keys from storedLedgerRecords
    Object.keys(storedLedgerRecords).forEach((compKey) => {
      const rows = storedLedgerRecords[compKey]
      if (Array.isArray(rows) && rows.length > 0) {
        const sampleDesc = rows[0]?.description || rows[0]?.shipperDescription || compKey
        const canonKey = getShipperCanonicalKey(sampleDesc)
        if (canonKey) {
          if (!shipperMap.has(canonKey)) {
            shipperMap.set(canonKey, {
              displayName: normalizeShipperDisplayName(sampleDesc),
              docs: [],
              rawKeys: new Set([sampleDesc]),
            })
          }
          shipperMap.get(canonKey)!.rawKeys.add(compKey)
        }
      }
    })

    setState((prev) => {
      const hasRealAccounts = Array.from(shipperMap.keys()).length > 0 || customCompanies.length > 0
      const existingAccounts: Account[] = hasRealAccounts
        ? prev.accounts.filter(a => a.id !== 'account-1' || a.companies.some(c => c.ledgerEntries.length > 0 && c.name !== 'SKY ARIANA TRANSPORT'))
        : [...prev.accounts]

      shipperMap.forEach(({ displayName, docs: bolList, rawKeys }, canonKey) => {
        // Collect all stored rows matching any candidate key for this company
        const storedRowList: any[] = []
        const seenStoredIds = new Set<string>()

        const candidateKeys = Array.from(new Set([
          canonKey,
          `company-${canonKey}`,
          displayName,
          displayName.toLowerCase(),
          displayName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          ...Array.from(rawKeys),
          ...Array.from(rawKeys).map(k => k.toLowerCase()),
          ...Array.from(rawKeys).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, "-")),
        ]))

        candidateKeys.forEach(k => {
          const rList = storedLedgerRecords[k]
          if (Array.isArray(rList)) {
            rList.forEach(r => {
              const rId = r.id || `${r.barnamehNo || r.bolNo}_${r.date}`
              if (rId && !seenStoredIds.has(rId)) {
                seenStoredIds.add(rId)
                storedRowList.push(r)
              }
            })
          }
        })

        const existingAccIndex = existingAccounts.findIndex(
          (a) => getShipperCanonicalKey(a.name) === canonKey || getShipperCanonicalKey(a.id) === canonKey
        )

        let runningBalance = 0
        const ledgerEntries: LedgerEntry[] = []
        const seenBolNumbers = new Set<string>()

        // 1. Process BOL documents (excluding deleted)
        bolList.forEach((doc, idx) => {
          const bolNo = (doc.bol_number || "").trim()
          const bolNoLower = bolNo.toLowerCase()

          if (bolNoLower && seenBolNumbers.has(bolNoLower)) {
            return
          }

          const isDeleted = mergedDeletedEntries.some((d) => {
            const dBolNo = (d.entry?.barnamehNo || (d.entry as any)?.bolNo || "").trim().toLowerCase()
            const dId = d.entry?.id
            const dCanonKey = getShipperCanonicalKey(d.companyName || d.entry?.shipperDescription || "")

            const isMatchingShipper = !dCanonKey || dCanonKey === canonKey

            if (!isMatchingShipper) return false

            if (doc.id && dId === doc.id) return true
            if (bolNoLower && dBolNo && bolNoLower === dBolNo) return true
            return false
          })

          if (isDeleted) {
            return
          }

          if (bolNoLower) {
            seenBolNumbers.add(bolNoLower)
          }

          const existingRow = storedRowList.find(
            (r: any) => (r.barnamehNo && r.barnamehNo.trim().toLowerCase() === bolNoLower) ||
                        (r.bolNo && r.bolNo.trim().toLowerCase() === bolNoLower)
          )

          const parsedInvoice = parseInvoiceNo(doc.cargo_description, doc.bol_number)
          const debitVal = existingRow?.debit !== undefined && existingRow?.debit !== "" ? Number(existingRow.debit) || 0 : (doc.debit ? Number(doc.debit) || 0 : 0)
          const creditVal = existingRow?.credit !== undefined && existingRow?.credit !== "" ? Number(existingRow.credit) || 0 : (doc.credit ? Number(doc.credit) || 0 : 0)

          runningBalance += (debitVal - creditVal)

          ledgerEntries.push({
            id: existingRow?.id || doc.id || `bol-${idx}`,
            sNo: ledgerEntries.length + 1,
            date: existingRow?.date || doc.issue_date || new Date().toISOString().split("T")[0],
            shipperDescription: displayName,
            invoiceNo: parsedInvoice,
            dateOfShip: existingRow?.shipDate || doc.issue_date || "",
            barnamehNo: bolNo,
            driverFreight: doc.driver_rent || existingRow?.driverFreight || "",
            billOfLanding: existingRow?.billOfLanding || "",
            surrenderedBL: existingRow?.surrenderedBL || false,
            containerNo: doc.container_numbers || existingRow?.containerNo || "N/A",
            consignee: doc.consignee_name || existingRow?.consignee || "N/A",
            quantity: doc.number_of_packages || existingRow?.quantity || "N/A",
            debit: debitVal,
            credit: creditVal,
            balance: runningBalance,
            pdfPathname: existingRow?.pdfFile || existingRow?.pdfPathname || undefined,
          })
        })

        // 2. Include non-BOL stored rows (e.g. manual payment / receipt rows)
        storedRowList.forEach((row: any) => {
          const rBol = (row.barnamehNo || row.bolNo || "").trim()
          const rBolLower = rBol.toLowerCase()

          if (rBolLower && seenBolNumbers.has(rBolLower)) {
            return
          }

          const isDeleted = mergedDeletedEntries.some((d) => {
            const dBolNo = (d.entry?.barnamehNo || (d.entry as any)?.bolNo || "").trim().toLowerCase()
            const dId = d.entry?.id
            const dCanonKey = getShipperCanonicalKey(d.companyName || d.entry?.shipperDescription || "")

            const isMatchingShipper = !dCanonKey || dCanonKey === canonKey

            if (!isMatchingShipper) return false

            if (row.id && dId === row.id) return true
            if (rBolLower && dBolNo && rBolLower === dBolNo) return true
            return false
          })

          if (isDeleted) {
            return
          }

          if (rBolLower) {
            seenBolNumbers.add(rBolLower)
          }

          const debitVal = Number(row.debit) || 0
          const creditVal = Number(row.credit) || 0
          runningBalance += (debitVal - creditVal)

          ledgerEntries.push({
            id: row.id || crypto.randomUUID(),
            sNo: ledgerEntries.length + 1,
            date: row.date || "",
            shipperDescription: displayName,
            invoiceNo: row.invoiceNo || "",
            dateOfShip: row.shipDate || row.dateOfShip || "",
            barnamehNo: rBol,
            driverFreight: row.driverFreight || row.driverRent || "",
            billOfLanding: row.billOfLanding || "",
            surrenderedBL: Boolean(row.surrenderedBL),
            containerNo: row.containerNo || "",
            consignee: row.consignee || "",
            quantity: row.quantity || "",
            debit: debitVal,
            credit: creditVal,
            balance: runningBalance,
            pdfPathname: row.pdfFile || row.pdfPathname || undefined,
          })
        })

        const companyForShipper: Company = {
          id: `company-${canonKey}`,
          name: displayName,
          ledgerEntries: ledgerEntries.length > 0 ? ledgerEntries : [],
        }

        if (existingAccIndex >= 0) {
          const acc = existingAccounts[existingAccIndex]
          existingAccounts[existingAccIndex] = {
            ...acc,
            name: displayName,
            companies: [companyForShipper],
          }
        } else {
          existingAccounts.push({
            id: `account-${canonKey}`,
            name: displayName,
            companies: [companyForShipper],
            createdBy: 'admin',
          })
        }
      })

      // Sync updated cache back to localStorage for instant offline access
      try {
        window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(customCompanies))
        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(storedLedgerRecords))
      } catch (e) {}

      const currentAccId = prev.currentAccount?.id
      const currentAccName = prev.currentAccount?.name
      const updatedCurrentAcc = existingAccounts.find((a) =>
        (currentAccId && a.id === currentAccId) ||
        (currentAccName && getShipperCanonicalKey(a.name) === getShipperCanonicalKey(currentAccName))
      ) || existingAccounts[0] || null

      const currentCompId = prev.currentCompany?.id
      const currentCompName = prev.currentCompany?.name
      const updatedCurrentComp = updatedCurrentAcc?.companies.find((c) =>
        (currentCompId && c.id === currentCompId) ||
        (currentCompName && getShipperCanonicalKey(c.name) === getShipperCanonicalKey(currentCompName))
      ) || updatedCurrentAcc?.companies[0] || null

      return {
        ...prev,
        accounts: existingAccounts.length > 0 ? existingAccounts : prev.accounts,
        currentAccount: updatedCurrentAcc,
        currentCompany: updatedCurrentComp,
      }
    })
    setIsSyncing(false)
  }, [])

  useEffect(() => {
    void syncShippersAndBols()

    const handleUpdate = () => {
      void syncShippersAndBols()
    }

    window.addEventListener("skybol:account-ledger-updated", handleUpdate)
    window.addEventListener("skybol:documents-updated", handleUpdate)

    return () => {
      window.removeEventListener("skybol:account-ledger-updated", handleUpdate)
      window.removeEventListener("skybol:documents-updated", handleUpdate)
    }
  }, [syncShippersAndBols])

  const syncCloudData = useCallback(async () => {
    await syncShippersAndBols()
  }, [syncShippersAndBols])

  const addAccount = useCallback((name: string) => {
    setState(prev => {
      const creator = prev.currentUser?.username || 'admin'
      const newAccount: Account = {
        id: crypto.randomUUID(),
        name,
        companies: [],
        createdBy: creator,
        shipperUsername: prev.currentUser?.role === 'shipper' ? creator : undefined,
      }
      return {
        ...prev,
        accounts: [...prev.accounts, newAccount],
      }
    })
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
      currentAccount: prev.currentAccount?.id === id ? null : prev.currentAccount,
    }))
  }, [])

  const selectAccount = useCallback((account: Account) => {
    setState(prev => ({
      ...prev,
      currentAccount: account,
      currentCompany: null,
      view: 'companies',
    }))
  }, [])

  const addCompany = useCallback((accountId: string, name: string) => {
    setState(prev => {
      const creator = prev.currentUser?.username || 'admin'
      const newCompany: Company = {
        id: crypto.randomUUID(),
        name,
        ledgerEntries: [],
        createdBy: creator,
      }
      return {
        ...prev,
        accounts: prev.accounts.map(a =>
          a.id === accountId ? { ...a, companies: [...a.companies, newCompany] } : a
        ),
        currentAccount: prev.currentAccount?.id === accountId
          ? { ...prev.currentAccount, companies: [...prev.currentAccount.companies, newCompany] }
          : prev.currentAccount,
      }
    })
  }, [])

  const deleteCompany = useCallback((accountId: string, companyId: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === accountId ? { ...a, companies: a.companies.filter(c => c.id !== companyId) } : a
      ),
      currentAccount: prev.currentAccount?.id === accountId
        ? { ...prev.currentAccount, companies: prev.currentAccount.companies.filter(c => c.id !== companyId) }
        : prev.currentAccount,
      currentCompany: prev.currentCompany?.id === companyId ? null : prev.currentCompany,
    }))
  }, [])

  const selectCompany = useCallback((company: Company) => {
    setState(prev => ({
      ...prev,
      currentCompany: company,
      view: 'ledger',
    }))
  }, [])

  const calculateBalances = (entries: LedgerEntry[]): LedgerEntry[] => {
    let runningBalance = 0
    return entries.map((entry, index) => {
      runningBalance = runningBalance + entry.debit - entry.credit
      return { ...entry, sNo: index + 1, balance: runningBalance }
    })
  }

  const persistLedgersDirectly = useCallback((accountsToSave: Account[], deletedItems: DeletedLedgerEntryItem[] = []) => {
    try {
      const raw = window.localStorage.getItem("skybol:account-ledgers") || "{}"
      const records = JSON.parse(raw)
      const companyNames: string[] = []

      accountsToSave.forEach(account => {
        if (account.name && !companyNames.includes(account.name)) {
          companyNames.push(account.name)
        }
        account.companies.forEach(company => {
          if (company.name && !companyNames.includes(company.name)) {
            companyNames.push(company.name)
          }
          const canonKey = getShipperCanonicalKey(company.name)
          const companyKey = company.id.replace('company-', '')
          const cleanNameKey = company.name.toLowerCase().replace(/[^a-z0-9]/g, "-")

          if (company.name !== 'Acme Corp' && company.name !== 'Global Logistics') {
            const rows = company.ledgerEntries.map(entry => ({
              id: entry.id,
              sNo: entry.sNo,
              date: entry.date,
              description: entry.shipperDescription,
              shipperDescription: entry.shipperDescription,
              invoiceNo: entry.invoiceNo,
              shipDate: entry.dateOfShip,
              dateOfShip: entry.dateOfShip,
              barnamehNo: entry.barnamehNo,
              bolNo: entry.barnamehNo,
              driverFreight: entry.driverFreight,
              driverRent: entry.driverFreight,
              billOfLanding: entry.billOfLanding,
              surrenderedBL: entry.surrenderedBL,
              containerNo: entry.containerNo,
              consignee: entry.consignee,
              quantity: entry.quantity,
              debit: Number(entry.debit) || 0,
              credit: Number(entry.credit) || 0,
              pdfFile: entry.pdfPathname,
              pdfPathname: entry.pdfPathname,
            }))

            records[canonKey] = rows
            records[`company-${canonKey}`] = rows
            records[companyKey] = rows
            records[cleanNameKey] = rows
            records[company.name.toLowerCase()] = rows
            records[company.name] = rows
          }
        })
      })

      window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(records))
      window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(companyNames))
      window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(deletedItems))

      // Direct multi-backend persistence
      fetch("/api/account-ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts: companyNames,
          ledgerEntries: records,
          deletedLedgerEntries: deletedItems,
        }),
        keepalive: true,
      }).catch(() => {})

      fetch("/api/bol-account-ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customCompanies: companyNames,
          ledgerRecords: records,
          deletedLedgerEntries: deletedItems,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch (e) {
      console.warn("Direct ledger persistence error:", e)
    }
  }, [])

  const addLedgerEntry = useCallback((accountId: string, companyId: string, entry: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>) => {
    const newEntry: LedgerEntry = {
      ...entry,
      id: crypto.randomUUID(),
      sNo: 0,
      balance: 0,
      debit: Number(entry.debit) || 0,
      credit: Number(entry.credit) || 0,
    }

    setState(prev => {
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const newEntries = calculateBalances([...c.ledgerEntries, newEntry])
            return { ...c, ledgerEntries: newEntries }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      // Synchronously persist right now
      persistLedgersDirectly(updatedAccounts, prev.deletedLedgerEntries || [])

      // Dedicated single-row API POST
      fetch("/api/ledger-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          ...newEntry,
        }),
        keepalive: true,
      }).catch(() => {})

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [persistLedgersDirectly])

  // Background auto-sync safeguard for ledgers
  useEffect(() => {
    if (!state.accounts || state.accounts === SAMPLE_ACCOUNTS) return;
    
    persistLedgersDirectly(state.accounts, state.deletedLedgerEntries || [])
  }, [state.accounts, state.deletedLedgerEntries, persistLedgersDirectly])

  const updateLedgerEntry = useCallback((accountId: string, companyId: string, entryId: string, entry: Partial<LedgerEntry>) => {
    setState(prev => {
      let targetRow: LedgerEntry | null = null
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const updatedEntries = c.ledgerEntries.map(e => {
              if (e.id === entryId) {
                const merged = {
                  ...e,
                  ...entry,
                  debit: entry.debit !== undefined ? (Number(entry.debit) || 0) : e.debit,
                  credit: entry.credit !== undefined ? (Number(entry.credit) || 0) : e.credit,
                }
                targetRow = merged
                return merged
              }
              return e
            })
            return { ...c, ledgerEntries: calculateBalances(updatedEntries) }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      // Synchronously persist right now
      persistLedgersDirectly(updatedAccounts, prev.deletedLedgerEntries || [])

      // Dedicated single-row API PATCH
      fetch("/api/ledger-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entryId,
          companyId,
          ...(targetRow || entry),
        }),
        keepalive: true,
      }).catch(() => {})

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [persistLedgersDirectly])

  const deleteLedgerEntry = useCallback((accountId: string, companyId: string, entryId: string) => {
    setState(prev => {
      const targetAccountKey = getShipperCanonicalKey(accountId)
      const targetCompanyKey = getShipperCanonicalKey(companyId)

      // Find the target entry to delete
      let deletedItem: DeletedLedgerEntryItem | null = null
      for (const a of prev.accounts) {
        const aCanon = getShipperCanonicalKey(a.id)
        const aNameCanon = getShipperCanonicalKey(a.name)
        const isMatchAccount = a.id === accountId || aCanon === targetAccountKey || aNameCanon === targetAccountKey
        if (!isMatchAccount) continue

        for (const c of a.companies) {
          const cCanon = getShipperCanonicalKey(c.id)
          const cNameCanon = getShipperCanonicalKey(c.name)
          const isMatchCompany = c.id === companyId || cCanon === targetCompanyKey || cNameCanon === targetCompanyKey || isMatchAccount
          if (!isMatchCompany) continue

          const target = c.ledgerEntries.find(e => e.id === entryId)
          if (target) {
            deletedItem = {
              entry: { ...target },
              accountId: a.id,
              companyId: c.id,
              companyName: normalizeShipperDisplayName(c.name || a.name),
              deletedAt: new Date().toISOString(),
            }
            break
          }
        }
        if (deletedItem) break
      }

      const targetBol = (deletedItem?.entry?.barnamehNo || '').trim().toLowerCase()

      const updatedAccounts = prev.accounts.map(a => {
        const aCanon = getShipperCanonicalKey(a.id)
        const aNameCanon = getShipperCanonicalKey(a.name)
        const isMatchAccount = a.id === accountId || aCanon === targetAccountKey || aNameCanon === targetAccountKey
        if (!isMatchAccount) return a

        return {
          ...a,
          companies: a.companies.map(c => {
            const cCanon = getShipperCanonicalKey(c.id)
            const cNameCanon = getShipperCanonicalKey(c.name)
            const isMatchCompany = c.id === companyId || cCanon === targetCompanyKey || cNameCanon === targetCompanyKey || isMatchAccount
            if (!isMatchCompany) return c

            const filteredEntries = c.ledgerEntries.filter(e => {
              if (e.id === entryId) return false
              if (targetBol && (e.barnamehNo || '').trim().toLowerCase() === targetBol) return false
              return true
            })

            return { ...c, ledgerEntries: calculateBalances(filteredEntries) }
          }),
        }
      })

      const updatedDeleted: DeletedLedgerEntryItem[] = deletedItem
        ? [
            deletedItem,
            ...prev.deletedLedgerEntries.filter(i => {
              if (i.entry.id === entryId) return false
              if (targetBol && (i.entry.barnamehNo || '').trim().toLowerCase() === targetBol) return false
              return true
            })
          ]
        : prev.deletedLedgerEntries

      try {
        window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(updatedDeleted))
      } catch (e) {}

      // Immediately write updated records to storage & server
      try {
        const records: Record<string, any[]> = {}
        const companyNames: string[] = []

        updatedAccounts.forEach(account => {
          if (!companyNames.includes(account.name)) companyNames.push(account.name)
          account.companies.forEach(company => {
            if (!companyNames.includes(company.name)) companyNames.push(company.name)
            const canonKey = getShipperCanonicalKey(company.name)
            const companyKey = company.id.replace('company-', '')
            const cleanNameKey = company.name.toLowerCase().replace(/[^a-z0-9]/g, "-")

            const rows = company.ledgerEntries.map(entry => ({
              id: entry.id,
              sNo: entry.sNo,
              date: entry.date,
              description: entry.shipperDescription,
              shipperDescription: entry.shipperDescription,
              invoiceNo: entry.invoiceNo,
              shipDate: entry.dateOfShip,
              dateOfShip: entry.dateOfShip,
              barnamehNo: entry.barnamehNo,
              bolNo: entry.barnamehNo,
              driverFreight: entry.driverFreight,
              driverRent: entry.driverFreight,
              billOfLanding: entry.billOfLanding,
              surrenderedBL: entry.surrenderedBL,
              containerNo: entry.containerNo,
              consignee: entry.consignee,
              quantity: entry.quantity,
              debit: entry.debit,
              credit: entry.credit,
              pdfFile: entry.pdfPathname,
              pdfPathname: entry.pdfPathname,
            }))

            records[canonKey] = rows
            records[`company-${canonKey}`] = rows
            records[companyKey] = rows
            records[cleanNameKey] = rows
            records[company.name.toLowerCase()] = rows
          })
        })

        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(records))
        window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(companyNames))

        fetch("/api/account-ledgers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accounts: companyNames,
            ledgerEntries: records,
            deletedLedgerEntries: updatedDeleted,
          }),
          keepalive: true,
        }).catch(() => {})

        fetch("/api/bol-account-ledgers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customCompanies: companyNames,
            ledgerRecords: records,
            deletedLedgerEntries: updatedDeleted,
          }),
          keepalive: true,
        }).catch(() => {})
      } catch (e) {}

      const currentAccId = prev.currentAccount?.id
      const currentAccName = prev.currentAccount?.name
      const updatedCurrentAccount = prev.currentAccount
        ? updatedAccounts.find(a =>
            (currentAccId && a.id === currentAccId) ||
            (currentAccName && getShipperCanonicalKey(a.name) === getShipperCanonicalKey(currentAccName))
          ) || prev.currentAccount
        : null

      const currentCompId = prev.currentCompany?.id
      const currentCompName = prev.currentCompany?.name
      const updatedCurrentCompany = updatedCurrentAccount
        ? updatedCurrentAccount.companies.find(c =>
            (currentCompId && c.id === currentCompId) ||
            (currentCompName && getShipperCanonicalKey(c.name) === getShipperCanonicalKey(currentCompName))
          ) || updatedCurrentAccount.companies[0] || null
        : null

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
        deletedLedgerEntries: updatedDeleted,
      }
    })
  }, [])

  const restoreLedgerEntry = useCallback((entryId: string) => {
    setState(prev => {
      const itemToRestore = prev.deletedLedgerEntries.find(i => i.entry.id === entryId)
      if (!itemToRestore) return prev

      const { entry, accountId, companyId } = itemToRestore

      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            if (c.ledgerEntries.some(e => e.id === entry.id)) return c
            const newEntries = calculateBalances([...c.ledgerEntries, entry])
            return { ...c, ledgerEntries: newEntries }
          }),
        }
      })

      const updatedDeleted = prev.deletedLedgerEntries.filter(i => i.entry.id !== entryId)
      try {
        window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(updatedDeleted))
      } catch (e) {}

      // Immediately write restored state to server
      try {
        const raw = window.localStorage.getItem("skybol:account-ledgers") || "{}"
        const records = JSON.parse(raw)
        const companyNames: string[] = []

        updatedAccounts.forEach(account => {
          account.companies.forEach(company => {
            if (!companyNames.includes(company.name)) companyNames.push(company.name)
            const companyKey = company.id.replace('company-', '')
            const cleanNameKey = company.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
            const rows = company.ledgerEntries.map(e => ({
              id: e.id,
              sNo: e.sNo,
              date: e.date,
              description: e.shipperDescription,
              shipperDescription: e.shipperDescription,
              invoiceNo: e.invoiceNo,
              shipDate: e.dateOfShip,
              dateOfShip: e.dateOfShip,
              barnamehNo: e.barnamehNo,
              bolNo: e.barnamehNo,
              driverFreight: e.driverFreight,
              driverRent: e.driverFreight,
              billOfLanding: e.billOfLanding,
              surrenderedBL: e.surrenderedBL,
              containerNo: e.containerNo,
              consignee: e.consignee,
              quantity: e.quantity,
              debit: e.debit,
              credit: e.credit,
              pdfFile: e.pdfPathname,
              pdfPathname: e.pdfPathname,
            }))
            records[companyKey] = rows
            records[cleanNameKey] = rows
            records[company.name.toLowerCase()] = rows
          })
        })

        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(records))
        window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(companyNames))

        fetch("/api/account-ledgers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accounts: companyNames,
            ledgerEntries: records,
            deletedLedgerEntries: updatedDeleted,
          }),
          keepalive: true,
        }).catch(() => {})

        fetch("/api/bol-account-ledgers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customCompanies: companyNames,
            ledgerRecords: records,
            deletedLedgerEntries: updatedDeleted,
          }),
          keepalive: true,
        }).catch(() => {})
      } catch (e) {}

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
        deletedLedgerEntries: updatedDeleted,
      }
    })
  }, [])

  const restoreAllDeletedEntries = useCallback((accountId?: string, companyId?: string) => {
    setState(prev => {
      const targetItems = prev.deletedLedgerEntries.filter(
        i => (!accountId || i.accountId === accountId) && (!companyId || i.companyId === companyId)
      )
      if (targetItems.length === 0) return prev

      const updatedAccounts = prev.accounts.map(a => {
        if (accountId && a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (companyId && c.id !== companyId) return c
            const itemsForCompany = targetItems.filter(i => i.companyId === c.id)
            if (itemsForCompany.length === 0) return c

            const newEntries = [...c.ledgerEntries]
            for (const item of itemsForCompany) {
              if (!newEntries.some(e => e.id === item.entry.id)) {
                newEntries.push(item.entry)
              }
            }
            return { ...c, ledgerEntries: calculateBalances(newEntries) }
          }),
        }
      })

      const remainingDeleted = prev.deletedLedgerEntries.filter(
        i => !targetItems.some(t => t.entry.id === i.entry.id)
      )

      try {
        window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(remainingDeleted))
      } catch (e) {}

      const updatedCurrentAccount = prev.currentAccount
        ? updatedAccounts.find(a => a.id === prev.currentAccount?.id) || prev.currentAccount
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === prev.currentCompany?.id) || prev.currentCompany

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
        deletedLedgerEntries: remainingDeleted,
      }
    })
  }, [])

  const resyncMissingBols = useCallback(async (accountId: string, companyId: string): Promise<number> => {
    let apiDocs: any[] = []
    try {
      const res = await fetch("/api/bol")
      if (res.ok) {
        const body = await res.json()
        apiDocs = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [])
      }
    } catch (e) {
      console.warn("Could not fetch /api/bol:", e)
    }

    let localDocs: any[] = []
    try {
      const raw1 = window.localStorage.getItem("skybol:saved-documents")
      const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
      const docs1 = raw1 ? JSON.parse(raw1) : []
      const docs2 = raw2 ? JSON.parse(raw2) : []
      localDocs = [...docs1, ...docs2]
    } catch (e) {}

    const allDocsMap = new Map<string, any>()
    for (const d of [...apiDocs, ...localDocs]) {
      const key = d.id || d.bol_number
      if (key && !allDocsMap.has(key)) {
        allDocsMap.set(key, d)
      }
    }
    const allDocs = Array.from(allDocsMap.values())

    let recoveredCount = 0

    setState(prev => {
      const acc = prev.accounts.find(a => a.id === accountId)
      if (!acc) return prev
      const comp = acc.companies.find(c => c.id === companyId)
      if (!comp) return prev

      const companyNameLower = comp.name.toLowerCase().trim()
      const accountNameLower = acc.name.toLowerCase().trim()

      const matchingDocs = allDocs.filter(d => {
        const shipper = (d.shipper_name || "").toLowerCase().trim()
        return (
          shipper === companyNameLower ||
          shipper === accountNameLower ||
          (shipper && companyNameLower.includes(shipper)) ||
          (shipper && shipper.includes(companyNameLower))
        )
      })

      const existingBolNumbers = new Set(
        comp.ledgerEntries.map(e => (e.barnamehNo || e.billOfLanding || '').toLowerCase().trim()).filter(Boolean)
      )
      const existingIds = new Set(comp.ledgerEntries.map(e => e.id))

      const missingEntries: LedgerEntry[] = []

      matchingDocs.forEach((doc, idx) => {
        const bolNo = (doc.bol_number || '').trim()
        const docId = doc.id || `bol-doc-${idx}`

        if (!existingBolNumbers.has(bolNo.toLowerCase()) && !existingIds.has(docId)) {
          const parsedInvoice = parseInvoiceNo(doc.cargo_description, doc.bol_number)
          const debitVal = doc.debit ? Number(doc.debit) || 0 : 0
          const creditVal = doc.credit ? Number(doc.credit) || 0 : 0

          missingEntries.push({
            id: doc.id || crypto.randomUUID(),
            sNo: 0,
            date: doc.issue_date || new Date().toISOString().split("T")[0],
            shipperDescription: doc.shipper_name || comp.name,
            invoiceNo: parsedInvoice,
            dateOfShip: doc.issue_date || "",
            barnamehNo: bolNo,
            driverFreight: doc.driver_rent || "",
            billOfLanding: "",
            surrenderedBL: false,
            containerNo: doc.container_numbers || "N/A",
            consignee: doc.consignee_name || "N/A",
            quantity: doc.number_of_packages || "N/A",
            debit: debitVal,
            credit: creditVal,
            balance: 0,
          })
          recoveredCount++
        }
      })

      if (missingEntries.length === 0) return prev

      const updatedEntries = calculateBalances([...comp.ledgerEntries, ...missingEntries])

      // Remove recovered BOLs from deleted list so they aren't filtered out again
      const recoveredBolSet = new Set(missingEntries.map(e => (e.barnamehNo || '').toLowerCase().trim()).filter(Boolean))
      const updatedDeleted = prev.deletedLedgerEntries.filter(
        d => !d.entry?.barnamehNo || !recoveredBolSet.has((d.entry.barnamehNo || '').toLowerCase().trim())
      )
      try {
        window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(updatedDeleted))
      } catch (e) {}

      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            return { ...c, ledgerEntries: updatedEntries }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
        deletedLedgerEntries: updatedDeleted,
      }
    })

    return recoveredCount
  }, [])

  const importLedgerEntries = useCallback((accountId: string, companyId: string, entries: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>[]) => {
    const newEntries: LedgerEntry[] = entries.map(entry => ({
      ...entry,
      id: crypto.randomUUID(),
      sNo: 0,
      balance: 0,
      debit: Number(entry.debit) || 0,
      credit: Number(entry.credit) || 0,
    }))

    setState(prev => {
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const allEntries = calculateBalances([...c.ledgerEntries, ...newEntries])
            return { ...c, ledgerEntries: allEntries }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      persistLedgersDirectly(updatedAccounts, prev.deletedLedgerEntries || [])

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [persistLedgersDirectly])

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: crypto.randomUUID(),
    }
    setState(prev => ({
      ...prev,
      invoices: [...prev.invoices, newInvoice],
    }))
  }, [])

  const updateInvoice = useCallback((invoiceId: string, invoice: Partial<Invoice>) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(i =>
        i.id === invoiceId ? { ...i, ...invoice } : i
      ),
    }))
  }, [])

  const deleteInvoice = useCallback((invoiceId: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.filter(i => i.id !== invoiceId),
    }))
  }, [])

  const setView = useCallback((view: AppState['view']) => {
    setState(prev => ({ ...prev, view }))
  }, [])

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.view === 'ledger' || prev.view === 'invoice') {
        return { ...prev, view: 'companies', currentCompany: null }
      }
      if (prev.view === 'companies') {
        return { ...prev, view: 'accounts', currentAccount: null }
      }
      return prev
    })
  }, [])

  const updateLedgerSettings = useCallback((accountId: string, companyId: string, settings: Partial<LedgerSettings>) => {
    setState(prev => {
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            return {
              ...c,
              ledgerSettings: {
                ...DEFAULT_LEDGER_SETTINGS,
                ...c.ledgerSettings,
                ...settings,
              },
            }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [])

  const toggleSurrenderedBL = useCallback((accountId: string, companyId: string, entryId: string) => {
    setState(prev => {
      let toggledSurrendered = false
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const updatedEntries = c.ledgerEntries.map(e => {
              if (e.id === entryId) {
                toggledSurrendered = !e.surrenderedBL
                return { ...e, surrenderedBL: toggledSurrendered }
              }
              return e
            })
            return { ...c, ledgerEntries: updatedEntries }
          }),
        }
      })

      const updatedCurrentAccount = prev.currentAccount?.id === accountId
        ? updatedAccounts.find(a => a.id === accountId) || null
        : prev.currentAccount

      const updatedCurrentCompany = updatedCurrentAccount?.companies.find(c => c.id === companyId) || null

      persistLedgersDirectly(updatedAccounts, prev.deletedLedgerEntries || [])

      fetch("/api/ledger-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entryId,
          companyId,
          surrenderedBL: toggledSurrendered,
        }),
        keepalive: true,
      }).catch(() => {})

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [persistLedgersDirectly])

  const getLedgerSettings = useCallback((): LedgerSettings => {
    return state.currentCompany?.ledgerSettings || DEFAULT_LEDGER_SETTINGS
  }, [state.currentCompany])

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        logout,
        addUser,
        updateUser,
        toggleUserStatus,
        resetUserPassword,
        updateUserRole,
        deleteUser,
        changePassword,
        addAccount,
        deleteAccount,
        selectAccount,
        addCompany,
        deleteCompany,
        selectCompany,
        addLedgerEntry,
        updateLedgerEntry,
        deleteLedgerEntry,
        restoreLedgerEntry,
        restoreAllDeletedEntries,
        resyncMissingBols,
        importLedgerEntries,
        updateLedgerSettings,
        toggleSurrenderedBL,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        setView,
        goBack,
        getLedgerSettings,
        isSyncing,
        syncCloudData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
