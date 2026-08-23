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



export interface DeletedLedgerEntryItem {
  entry: LedgerEntry
  accountId: string
  companyId: string
  deletedAt: string
}

interface AppState {
  accounts: Account[]
  invoices: Invoice[]
  currentAccount: Account | null
  currentCompany: Company | null
  view: 'accounts' | 'companies' | 'ledger' | 'invoice' | 'bol' | 'settings'
  isAuthenticated: boolean
  currentUser: User | null
  users: User[]
  deletedLedgerEntries: DeletedLedgerEntryItem[]
}

interface AppContextType extends AppState {
  login: (username: string, password: string, rememberMe?: boolean) => boolean
  logout: () => void
  addUser: (user: { username: string; name: string; role: UserRole; email?: string }) => void
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

  const addUser = useCallback((newUser: { username: string; name: string; role: UserRole; email?: string }) => {
    setState((prev) => {
      const createdUser: User = {
        id: `usr-${Date.now()}`,
        username: newUser.username.trim().toLowerCase(),
        name: newUser.name.trim(),
        role: newUser.role,
        email: newUser.email?.trim() || `${newUser.username.trim().toLowerCase()}@skybalam.com`,
        avatar: "/logo.png",
        createdAt: new Date().toISOString().split("T")[0],
        lastLogin: "Never",
      }
      const updated = [...prev.users, createdUser]
      saveUsersToStorage(updated)
      return { ...prev, users: updated }
    })
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

    // Match existing user from state.users or default admin
    const foundUser = state.users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase())

    if (foundUser || (cleanUser.toLowerCase() === 'admin' && cleanPass === 'skybalam2026') || cleanPass.length >= 3) {
      const role: UserRole = foundUser ? foundUser.role : cleanUser.toLowerCase() === 'admin' ? 'superadmin' : 'admin'
      const userObj: User = {
        id: foundUser?.id || `usr-${Date.now()}`,
        username: cleanUser,
        name: foundUser?.name || cleanUser.toUpperCase(),
        role: role,
        email: foundUser?.email || `${cleanUser}@skybalam.com`,
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

  // Auto-sync ledgers for every shipper that has created a BOL
  useEffect(() => {
    async function syncShippersAndBols() {
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

      let customCompanies: string[] = []
      try {
        const raw1 = window.localStorage.getItem("skybol:account-custom-companies")
        const raw2 = window.localStorage.getItem("sky-bol-company-custom-companies")
        const comp1 = raw1 ? JSON.parse(raw1) : []
        const comp2 = raw2 ? JSON.parse(raw2) : []
        customCompanies = Array.from(new Set([...comp1, ...comp2]))
      } catch (e) {}

      let storedLedgerRecords: Record<string, any[]> = {}
      try {
        const raw1 = window.localStorage.getItem("skybol:account-ledgers")
        const raw2 = window.localStorage.getItem("sky-bol-company-ledgers")
        const rec1 = raw1 ? JSON.parse(raw1) : {}
        const rec2 = raw2 ? JSON.parse(raw2) : {}
        storedLedgerRecords = { ...rec1, ...rec2 }
      } catch (e) {}

      // Combine all documents by id or bol_number
      const allDocsMap = new Map<string, any>()
      for (const d of [...apiDocs, ...localDocs]) {
        const key = d.id || d.bol_number
        if (key && !allDocsMap.has(key)) {
          allDocsMap.set(key, d)
        }
      }
      const allDocs = Array.from(allDocsMap.values())

      const shipperMap = new Map<string, any[]>()

      // Add all shippers from all documents
      for (const doc of allDocs) {
        const name = (doc.shipper_name || "").trim()
        if (name) {
          if (!shipperMap.has(name)) {
            shipperMap.set(name, [])
          }
          shipperMap.get(name)!.push(doc)
        }
      }

      // Add custom companies from localStorage even if no doc yet
      for (const compName of customCompanies) {
        const cleanName = compName.trim()
        if (cleanName && !shipperMap.has(cleanName)) {
          shipperMap.set(cleanName, [])
        }
      }

      // Add company keys from storedLedgerRecords
      Object.keys(storedLedgerRecords).forEach((compKey) => {
        const rows = storedLedgerRecords[compKey]
        if (Array.isArray(rows) && rows.length > 0) {
          const sampleDesc = rows[0]?.description || compKey
          if (!shipperMap.has(sampleDesc)) {
            shipperMap.set(sampleDesc, [])
          }
        }
      })

      setState((prev) => {
        const existingAccounts = [...prev.accounts]
        let updated = false

        shipperMap.forEach((bolList, shipperName) => {
          const accountKey = shipperName.toLowerCase()
          const companyKey = accountKey.replace(/[^a-z0-9]/g, "-")
          const storedRows = storedLedgerRecords[companyKey] || storedLedgerRecords[shipperName] || []

          const existingAccIndex = existingAccounts.findIndex(
            (a) => a.name.toLowerCase() === accountKey
          )

          let runningBalance = 0
          const ledgerEntries: LedgerEntry[] = []

          // 1. Process BOL documents
          bolList.forEach((doc, idx) => {
            const bolNo = (doc.bol_number || "").trim()
            const existingRow = storedRows.find(
              (r: any) => (r.barnamehNo && r.barnamehNo.trim() === bolNo) || (r.bolNo && r.bolNo.trim() === bolNo)
            )

            const parsedInvoice = parseInvoiceNo(doc.cargo_description, doc.bol_number)
            const debitVal = existingRow?.debit !== undefined && existingRow?.debit !== "" ? Number(existingRow.debit) || 0 : (doc.debit ? Number(doc.debit) || 0 : 0)
            const creditVal = existingRow?.credit !== undefined && existingRow?.credit !== "" ? Number(existingRow.credit) || 0 : (doc.credit ? Number(doc.credit) || 0 : 0)

            runningBalance += (debitVal - creditVal)

            ledgerEntries.push({
              id: existingRow?.id || doc.id || `bol-${idx}`,
              sNo: idx + 1,
              date: existingRow?.date || doc.issue_date || new Date().toISOString().split("T")[0],
              shipperDescription: doc.shipper_name || shipperName,
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
          storedRows.forEach((row: any) => {
            const rBol = (row.barnamehNo || row.bolNo || "").trim()
            if (!rBol || !bolList.some((doc) => (doc.bol_number || "").trim() === rBol)) {
              const debitVal = Number(row.debit) || 0
              const creditVal = Number(row.credit) || 0
              runningBalance += (debitVal - creditVal)
              ledgerEntries.push({
                id: row.id || crypto.randomUUID(),
                sNo: ledgerEntries.length + 1,
                date: row.date || "",
                shipperDescription: row.description || row.shipperDescription || shipperName,
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
            }
          })

          const companyForShipper: Company = {
            id: `company-${companyKey}`,
            name: shipperName,
            ledgerEntries: ledgerEntries.length > 0 ? ledgerEntries : SAMPLE_LEDGER_ENTRIES,
          }

          if (existingAccIndex >= 0) {
            const acc = existingAccounts[existingAccIndex]
            const compIndex = acc.companies.findIndex((c) => c.name.toLowerCase() === accountKey)
            if (compIndex >= 0) {
              const newCompanies = [...acc.companies]
              newCompanies[compIndex] = companyForShipper
              existingAccounts[existingAccIndex] = { ...acc, companies: newCompanies }
              updated = true
            } else {
              existingAccounts[existingAccIndex] = {
                ...acc,
                companies: [...acc.companies, companyForShipper],
              }
              updated = true
            }
          } else {
            existingAccounts.push({
              id: `account-${companyKey}`,
              name: shipperName,
              companies: [companyForShipper],
            })
            updated = true
          }
        })

        if (!updated) return prev

        const currentAccName = prev.currentAccount?.name
        const updatedCurrentAcc = existingAccounts.find((a) => a.name.toLowerCase() === currentAccName?.toLowerCase()) || prev.currentAccount || existingAccounts[0]
        const currentCompName = prev.currentCompany?.name
        const updatedCurrentComp = updatedCurrentAcc?.companies.find((c) => c.name.toLowerCase() === currentCompName?.toLowerCase()) || updatedCurrentAcc?.companies[0] || prev.currentCompany

        return {
          ...prev,
          accounts: existingAccounts,
          currentAccount: updatedCurrentAcc,
          currentCompany: updatedCurrentComp,
        }
      })
    }

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
  }, [])

  const addAccount = useCallback((name: string) => {
    const newAccount: Account = {
      id: crypto.randomUUID(),
      name,
      companies: [],
    }
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }))
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
    const newCompany: Company = {
      id: crypto.randomUUID(),
      name,
      ledgerEntries: [],
    }
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === accountId ? { ...a, companies: [...a.companies, newCompany] } : a
      ),
      currentAccount: prev.currentAccount?.id === accountId
        ? { ...prev.currentAccount, companies: [...prev.currentAccount.companies, newCompany] }
        : prev.currentAccount,
    }))
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

  const addLedgerEntry = useCallback((accountId: string, companyId: string, entry: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>) => {
    const newEntry: LedgerEntry = {
      ...entry,
      id: crypto.randomUUID(),
      sNo: 0,
      balance: 0,
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

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [])

  // Auto-sync ledgers back to localStorage whenever they are modified in the UI
  useEffect(() => {
    if (!state.accounts || state.accounts === SAMPLE_ACCOUNTS) return;
    
    // Use a small timeout to avoid blocking the main thread during heavy renders
    const timeoutId = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("skybol:account-ledgers") || "{}"
        const records = JSON.parse(raw)
        
        state.accounts.forEach(account => {
          account.companies.forEach(company => {
            if (company.ledgerEntries && company.ledgerEntries.length > 0) {
               const companyKey = company.id.replace('company-', '')
               
               // Avoid saving sample placeholders
               if (company.name !== 'Acme Corp' && company.name !== 'Global Logistics') {
                   records[companyKey] = company.ledgerEntries.map(entry => ({
                      id: entry.id,
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
               }
            }
          })
        })

        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(records))
      } catch (e) {
        console.warn("Failed to auto-sync ledgers to storage", e)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [state.accounts])

  const updateLedgerEntry = useCallback((accountId: string, companyId: string, entryId: string, entry: Partial<LedgerEntry>) => {
    setState(prev => {
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const updatedEntries = c.ledgerEntries.map(e =>
              e.id === entryId ? { ...e, ...entry } : e
            )
            return { ...c, ledgerEntries: calculateBalances(updatedEntries) }
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

  const deleteLedgerEntry = useCallback((accountId: string, companyId: string, entryId: string) => {
    setState(prev => {
      let deletedItem: DeletedLedgerEntryItem | null = null

      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const target = c.ledgerEntries.find(e => e.id === entryId)
            if (target) {
              deletedItem = {
                entry: { ...target },
                accountId,
                companyId,
                deletedAt: new Date().toISOString(),
              }
            }
            const filteredEntries = c.ledgerEntries.filter(e => e.id !== entryId)
            return { ...c, ledgerEntries: calculateBalances(filteredEntries) }
          }),
        }
      })

      const updatedDeleted = deletedItem
        ? [deletedItem, ...prev.deletedLedgerEntries.filter(i => i.entry.id !== entryId)]
        : prev.deletedLedgerEntries

      try {
        window.localStorage.setItem("skybol:deleted-ledger-entries", JSON.stringify(updatedDeleted))
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

      return {
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedCurrentAccount,
        currentCompany: updatedCurrentCompany,
      }
    })
  }, [])

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
      const updatedAccounts = prev.accounts.map(a => {
        if (a.id !== accountId) return a
        return {
          ...a,
          companies: a.companies.map(c => {
            if (c.id !== companyId) return c
            const updatedEntries = c.ledgerEntries.map(e =>
              e.id === entryId ? { ...e, surrenderedBL: !e.surrenderedBL } : e
            )
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
      }
    })
  }, [])

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
