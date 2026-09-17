"use client"

import { useState, useEffect, useEffectEvent, useRef, useCallback, memo, useMemo, useDeferredValue, startTransition, type ReactNode } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import { DraftSaveQueue } from "@/lib/services/draft-save-queue"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { BackgroundGallery } from "./background-gallery"
import { DOCUMENT_BACKGROUNDS } from "@/lib/document-backgrounds"
import { A4Preview } from "./a4-preview"
import PrintSafeBOL from "./print-safe-bol"
import { ShippingDocumentCenter } from "./shipping-document-center"
import { BillOfLadingFormData, initialFormData, RouteStop, AFGHANISTAN_DOCUMENT_OPTIONS, DOCUMENT_CATEGORIES, AfghanistanDocumentDetail, type DocumentCategory, NOTE_THEMES, type NoteTheme } from "@/lib/types/bill-of-lading"
import consigneeSeedData from "@/lib/data/consignees-from-pdf.json"
import shipperSeedData from "@/lib/data/shippers-from-pdf.json"
import notifyPartySeedData from "@/lib/data/notify-parties-from-pdf.json"
import { Printer, Save, FileText, Eye, Plus, Loader2, Calendar, Truck, MapPin, Trash2, ArrowRight, Package, Edit3, ImageIcon, Upload, RotateCcw, ScrollText, Check, Download, Building2, Phone, Mail, Ship, Plane, Train, AlertCircle, User, Bell, Globe, Shield, Leaf, Heart, Scale, Bookmark, BookmarkPlus, X, IdCard, Car, Landmark, ShieldCheck, Receipt, List, ChevronDown, ChevronUp, Info, CheckCircle2, Circle, Sparkles, Copy, Box, ArrowLeftRight, Zap, Calculator, Sliders, SlidersHorizontal, Layers, Keyboard, Cloud, DownloadCloud, UploadCloud, RefreshCw, FileSpreadsheet, Coins, Hash, MoreHorizontal, Palette, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { formatPersianDate, getDualDates } from "@/lib/utils/persian-date"
import {
  generateBOLPDFBlob,
  uploadPDFToServer,
  savePDFToDevice,
  openPDFPrintWindow,
  printPDFBlobInWindow,
  buildBolSmartFileName,
  preloadBOLPDFGeneration,
} from "@/lib/utils/pdf-upload"
import {
  buildShippingDocumentFileName,
  deriveShippingDocumentData,
  generateShippingDocumentsPDF,
  type ShippingDocumentKind,
  type StickerLayout,
} from "@/lib/utils/shipping-documents"
import { PackingListPdfPage, StickerPdfPage } from "./shipping-documents"
const SavedDocuments = dynamic(() => import("./saved-documents").then(m => m.SavedDocuments), { loading: () => <p role="status" className="p-6 text-sm text-slate-600">Loading saved BOLs…</p> })
const LedgerView = dynamic(() => import("@/components/ledger-view").then(m => m.LedgerView), { loading: () => <p role="status" className="p-6 text-sm text-slate-600">Loading account ledger…</p> })
import { getFinancialsMap, saveFinancialsForEntry } from "@/lib/services/ledger-sync-utils"
import { PrintOptionsDialog, type PrintOptions } from "@/components/print-options-dialog"
import { CloudSyncModal } from "./cloud-sync-modal"
import {
  dougharounToMersinLegs,
  nimrozToBandarAbbasLegs,
  dogharonToMersinReeferLegs,
  exportCorridorToBillOfLadingRoutes,
} from "@/lib/services/multi-leg-quote-service"

interface BOLEditorProps {
  onSave?: (data: BillOfLadingFormData) => void
  onRefreshDocuments?: () => void
  loadDocumentId?: string | null
  onDocumentLoaded?: () => void
  savedDocumentsPanel?: ReactNode
  accountLedgerPanel?: ReactNode
}

interface SavedParty {
  id: string
  name: string
  address: string
  contact: string
  email: string
  savedAt: string
}

function PrintPreviewPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const existing = document.getElementById("bol-print-preview-root") as HTMLDivElement | null
    const root = existing || document.createElement("div")

    root.id = "bol-print-preview-root"
    root.dataset.printRoot = "true"
    if (!existing) {
      document.body.appendChild(root)
    }
    setContainer(root)

    return () => {
      if (!existing && root.parentElement === document.body) {
        document.body.removeChild(root)
      }
    }
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

const SAVED_SHIPPERS_STORAGE_KEY = "sky-bol-saved-shippers"
const SAVED_CONSIGNEES_STORAGE_KEY = "sky-bol-saved-consignees"
const SAVED_NOTIFY_PARTIES_STORAGE_KEY = "sky-bol-saved-notify-parties"
const SAVED_NOTES_1_STORAGE_KEY = "sky-bol-saved-notes-1"
const SAVED_NOTES_2_STORAGE_KEY = "sky-bol-saved-notes-2"
const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"
const ACCOUNT_LEDGER_STORAGE_KEY = "sky-bol-company-ledgers"
const PDF_COMPANY_SETTINGS_STORAGE_KEY = "sky-bol-company-pdf-settings"
const SAVED_ROUTE_PRESETS_STORAGE_KEY = "sky-bol-custom-route-presets"
const SHIPPER_SEED_LIST = shipperSeedData as SavedParty[]
const CONSIGNEE_SEED_LIST = consigneeSeedData as SavedParty[]
const NOTIFY_PARTY_SEED_LIST = notifyPartySeedData as SavedParty[]

export interface SavedRoutePreset {
  id: string
  title: string
  titlePersian?: string
  icon?: string
  routes: RouteStop[]
  savedAt: string
}

interface SavedNoteOption {
  id: string
  label: string
  content: string
  theme?: "red" | "blue" | "green" | "purple" | "orange" | "gray"
  savedAt?: string
}

const NOTE_1_SEED_LIST: SavedNoteOption[] = [
  {
    id: "n1-yaramel",
    label: "دکندهار بارگیری مسؤول",
    content: "نظرمحمد (یارمل) - (+93) 0 700 203 307",
    theme: "red",
  },
  {
    id: "n1-loading-contact",
    label: "Loading Contact / مسئول بارگیری",
    content: "نظرمحمد (یارمل) - (+93) 0 700 203 307",
    theme: "blue",
  },
  {
    id: "n1-exporter-contact",
    label: "Exporter Contact / تماس صادرکننده",
    content: "+93 700 939 365 / +93 711 435 529",
    theme: "green",
  },
  {
    id: "n1-border-rep",
    label: "Border Representative / نماینده مرزی",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "purple",
  },
]

const NOTE_2_SEED_LIST: SavedNoteOption[] = [
  {
    id: "n2-border-rep",
    label: "Border Representative / نماینده مرزی",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "purple",
  },
  {
    id: "n2-representatives",
    label: "نماینده نمبرونه",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "red",
  },
  {
    id: "n2-clearance",
    label: "Customs Clearance / امور گمرکی",
    content: "نماینده دوغارون و اسلام قلعه\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "blue",
  },
]

function mergeSavedNoteOptions(seedOptions: SavedNoteOption[], storedOptions: SavedNoteOption[]) {
  const byId = new Map<string, SavedNoteOption>()
  seedOptions.forEach((seed) => byId.set(seed.id, seed))
  // Stored copies must win so edits to the built-in presets survive a reload.
  storedOptions.forEach((item) => byId.set(item.id, item))
  return Array.from(byId.values())
}

interface AccountLedgerEntry {
  id: string
  date: string
  description: string
  invoiceNo: string
  shipDate: string
  barnamehNo?: string
  bolNo: string
  truckNo?: string
  containerNo: string
  consignee: string
  quantity: string
  driverRent?: string
  driverFreight?: string
  debit: string
  credit: string
  pdfFile?: string
}

type AccountLedgerRecords = Record<string, AccountLedgerEntry[]>

const accountCompanyKey = (companyName: string) => companyName.trim().toLowerCase()
const getInvoiceNoFromDescription = (description?: string | null) => {
  const text = description || ""
  const match = text.match(/invoice\s*(?:no|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i)
  return match?.[1]?.trim() || ""
}

function mergeSavedParties(seedParties: SavedParty[], storedParties: SavedParty[]) {
  const byName = new Map<string, SavedParty>()

  for (const party of seedParties) {
    byName.set(party.name.trim().toLowerCase(), party)
  }

  for (const party of storedParties) {
    byName.set(party.name.trim().toLowerCase(), party)
  }

  const usedIds = new Map<string, number>()

  return Array.from(byName.values())
    .filter((party) => party.name.trim())
    .map((party) => {
      const baseId = party.id?.trim() || `saved-party-${party.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      const count = usedIds.get(baseId) || 0
      usedIds.set(baseId, count + 1)

      if (count === 0) {
        return { ...party, id: baseId }
      }

      return {
        ...party,
        id: `${baseId}-${count + 1}`,
      }
    })
}

function syncBolToAccountLedger(data: BillOfLadingFormData & { bol_number?: string }) {
  const shipperName = data.shipper_name?.trim()
  const bolNo = data.bol_number?.trim()

  if (!shipperName || !bolNo) return

  const companyKey = accountCompanyKey(shipperName)
  const storedCompanies = JSON.parse(
    window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY) ||
    window.localStorage.getItem("skybol:account-custom-companies") ||
    "[]"
  ) as string[]
  const hasCompany = storedCompanies.some((companyName) => accountCompanyKey(companyName) === companyKey)

  const updatedCompanies = hasCompany ? storedCompanies : [...storedCompanies, shipperName]
  if (!hasCompany) {
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify(updatedCompanies))
    window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(updatedCompanies))
    window.dispatchEvent(new CustomEvent("skybol:account-company-updated", { detail: { companyName: shipperName } }))
  }

  const rawRecords = window.localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY) || window.localStorage.getItem("skybol:account-ledgers") || "{}"
  const records = JSON.parse(rawRecords) as AccountLedgerRecords
  const existingRow = Object.values(records)
    .flat()
    .find((row) => (row.barnamehNo && row.barnamehNo.trim().toLowerCase() === bolNo.toLowerCase()) || (row.bolNo && row.bolNo.trim().toLowerCase() === bolNo.toLowerCase()))
  
  const financialsMap = getFinancialsMap()
  const fin = bolNo ? financialsMap[bolNo.trim().toLowerCase()] : undefined

  const driverRentVal = fin?.driverFreight || data.driver_rent?.trim() || existingRow?.driverFreight || existingRow?.driverRent || ""
  
  let debitVal = 0
  if (fin?.debit !== undefined && fin.debit > 0) {
    debitVal = fin.debit
  } else if (existingRow?.debit !== undefined && existingRow?.debit !== "" && Number(existingRow.debit) > 0) {
    debitVal = Number(existingRow.debit)
  } else if ((data as any)?.debit && Number((data as any).debit) > 0) {
    debitVal = Number((data as any).debit)
  }

  let creditVal = 0
  if (fin?.credit !== undefined && fin.credit > 0) {
    creditVal = fin.credit
  } else if (existingRow?.credit !== undefined && existingRow?.credit !== "" && Number(existingRow.credit) > 0) {
    creditVal = Number(existingRow.credit)
  } else if ((data as any)?.credit && Number((data as any).credit) > 0) {
    creditVal = Number((data as any).credit)
  }

  const nextRow: AccountLedgerEntry = {
    id: existingRow?.id || crypto.randomUUID(),
    date: fin?.date || existingRow?.date || data.issue_date || new Date().toISOString().split("T")[0],
    description: shipperName,
    invoiceNo: fin?.invoiceNo || existingRow?.invoiceNo || getInvoiceNoFromDescription(data.cargo_description),
    shipDate: existingRow?.shipDate || data.issue_date || "",
    barnamehNo: bolNo,
    bolNo: bolNo,
    truckNo: data.truck_number || existingRow?.truckNo || "",
    containerNo: data.container_numbers || existingRow?.containerNo || "",
    consignee: data.consignee_name || existingRow?.consignee || "",
    quantity: data.number_of_packages || existingRow?.quantity || "",
    driverRent: driverRentVal,
    driverFreight: driverRentVal,
    debit: debitVal as any,
    credit: creditVal as any,
    pdfFile: fin?.pdfPathname || existingRow?.pdfFile || "",
  }

  if (debitVal > 0 || creditVal > 0 || driverRentVal) {
    saveFinancialsForEntry(bolNo, nextRow.id, nextRow)
  }

  const nextRecords = Object.fromEntries(
    Object.entries(records).map(([key, rows]) => [
      key, 
      rows.filter((row) => (row.barnamehNo || row.bolNo || "").trim().toLowerCase() !== bolNo.toLowerCase())
    ])
  ) as AccountLedgerRecords

  const companyRows = nextRecords[companyKey] || []
  nextRecords[companyKey] = [nextRow, ...companyRows]
  nextRecords[shipperName.toLowerCase()] = [nextRow, ...companyRows]

  window.localStorage.setItem(ACCOUNT_LEDGER_STORAGE_KEY, JSON.stringify(nextRecords))
  window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(nextRecords))

  // Sync to backend account ledgers API
  fetch("/api/account-ledgers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accounts: updatedCompanies,
      ledgerEntries: nextRecords,
    }),
    keepalive: true,
  }).catch((err) => console.warn("Background ledger sync to API:", err))

  fetch("/api/bol-account-ledgers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customCompanies: updatedCompanies,
      ledgerRecords: nextRecords,
    }),
    keepalive: true,
  }).catch(() => {})

  fetch("/api/ledger-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barnamehNo: bolNo,
      companyId: companyKey,
      ...nextRow,
    }),
    keepalive: true,
  }).catch(() => {})

  window.dispatchEvent(
    new CustomEvent("skybol:account-ledger-updated", {
      detail: { companyName: shipperName, bolNo },
    })
  )
}

export function BOLEditor({ onSave, onRefreshDocuments, loadDocumentId, onDocumentLoaded, savedDocumentsPanel, accountLedgerPanel }: BOLEditorProps) {
  const [formData, setFormData] = useState<BillOfLadingFormData>(initialFormData)
  const deferredFormData = useDeferredValue(formData)
  const [bolNumber, setBolNumber] = useState<string>("BOL-2026-NSA470")
  const [isEditingBolNumber, setIsEditingBolNumber] = useState(false)
  const [issueDate, setIssueDate] = useState<string>("")
  const [persianDate, setPersianDate] = useState<string>("")
  const [persianDateNumeric, setPersianDateNumeric] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRootRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    const updateHeight = () => editorRootRef.current?.style.setProperty('--bol-toolbar-height', toolbar.offsetHeight + 'px')
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [])
  const [activeTab, setActiveTab] = useState<string>("form")
  useEffect(() => {
    if (activeTab === "preview" || activeTab === "pdf-settings") {
      void preloadBOLPDFGeneration()
    }
  }, [activeTab])
  const handleTabChange = useCallback((newTab: string) => {
    startTransition(() => {
      setActiveTab(newTab)
    })
  }, [])
  const [logoUrl, setLogoUrl] = useState<string>("/images/logo.png")
  const logoInputRef = useRef<HTMLInputElement>(null)
  const isCompanySettingsLoadedRef = useRef(false)
  const [companyName, setCompanyName] = useState("SKY ARIANA LIMITED")
  const [companyNamePersian, setCompanyNamePersian] = useState("شرکت حمل و نقل بین المللی سکای آریانا لمیتد")
  const [companySubtitle, setCompanySubtitle] = useState("Import & Export - International Transportation")
  const [companyPhone, setCompanyPhone] = useState("+93 700 939 365, +93 711 435 529")
  const [companyEmail, setCompanyEmail] = useState("info@skyariana.com, transport@skyariana.com")
  const [companyAddress, setCompanyAddress] = useState("2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan")
  const [companyLicence, setCompanyLicence] = useState("2401-2198")
  const [bgImageUrl, setBgImageUrl] = useState<string>("/images/mountain-watermark-premium.png")
  const [bgOpacity, setBgOpacity] = useState<number>(0.22)
  const [previewScale, setPreviewScale] = useState<number>(1.0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle" | "local" | "error">("idle")
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>("")
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false)
  const [checkingDraft, setCheckingDraft] = useState(true)
  const draftQueue = useRef<DraftSaveQueue<string> | null>(null)
  const draftRevision = useRef(0)
  const queuedRevision = useRef(0)
  useEffect(() => {
    const queue = new DraftSaveQueue<string>(async (body) => {
      const response = await fetch("/api/draft?type=bol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      if (!response.ok) throw new Error("Draft backup failed")
      const result: { success?: boolean } = await response.json()
      if (result.success !== true) throw new Error("Draft backup was not confirmed")
    }, (status) => {
      if (queuedRevision.current === draftRevision.current) setAutoSaveStatus(status)
    })
    draftQueue.current = queue
    const retry = () => queue.retry()
    window.addEventListener("online", retry)
    return () => {
      queue.dispose()
      window.removeEventListener("online", retry)
      draftQueue.current = null
    }
  }, [])

  // Enterprise Multi-Tier Real-Time Auto-Saving Engine (Debounced 800ms)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (checkingDraft || hasRecoverableDraft) return

    draftRevision.current += 1
    setAutoSaveStatus("saving")
    let pendingLocalSave = true
    const persistLocalDraft = () => {
        const currentDocData = {
          ...formData,
          bol_number: bolNumber,
          issue_date: issueDate,
          persian_date: persianDate,
          persian_date_numeric: persianDateNumeric,
          updated_at: new Date().toISOString(),
        }

        // Tier 1: Synchronous In-Memory & LocalStorage Active Draft Sync
        window.localStorage.setItem("skybol:active-form-draft", JSON.stringify(currentDocData))
        window.localStorage.setItem(
          "sky-bol-live-draft",
          JSON.stringify({
            formData: currentDocData,
            bolNumber,
            issueDate,
            persianDate,
            persianDateNumeric,
            savedAt: currentDocData.updated_at,
          })
        )
        pendingLocalSave = false
        return currentDocData
    }
    const flushLocalDraft = () => {
      if (!pendingLocalSave) return
      try { persistLocalDraft(); setAutoSaveStatus("local") }
      catch { setAutoSaveStatus("error") }
    }
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushLocalDraft()
    }
    window.addEventListener("pagehide", flushLocalDraft)
    document.addEventListener("visibilitychange", handleVisibility)
    const timer = setTimeout(() => {
      try {
        const currentDocData = persistLocalDraft()

        // Tier 2: Dedicated Server-Side Draft Backup (Crash-resistant, isolated from official BOLs)
        const isMeaningfulDraft =
          Boolean(formData.shipper_name?.trim() && formData.shipper_name.trim().toLowerCase() !== "no shipper") ||
          Boolean(formData.number_of_packages?.trim() && formData.number_of_packages.trim() !== "0") ||
          Boolean(formData.gross_weight?.trim()) ||
          Boolean(formData.net_weight?.trim()) ||
          Boolean(formData.consignee_name?.trim() && formData.consignee_name.trim().toLowerCase() !== "no consignee") ||
          Boolean(formData.driver_name?.trim()) ||
          Boolean(formData.driver_rent?.trim()) ||
          Boolean(formData.truck_number?.trim()) ||
          Boolean(formData.cargo_description?.trim() && formData.cargo_description.trim().length > 3)

        if (bolNumber && bolNumber.trim().length >= 2 && isMeaningfulDraft) {
          queuedRevision.current = draftRevision.current
          draftQueue.current?.enqueue(JSON.stringify({ type: "bol", draft: currentDocData }))
        } else {
          setAutoSaveStatus("local")
        }

        // Tier 3: Auto-save Shipper, Consignee & Notify Parties into Autocomplete Databases
        try {
          if (formData.shipper_name?.trim()) {
            const sName = formData.shipper_name.trim()
            const matchS = savedShippers.find((s) => s.name.trim().toLowerCase() === sName.toLowerCase())
            const curS: SavedParty = {
              id: matchS ? matchS.id : crypto.randomUUID(),
              name: sName,
              address: formData.shipper_address || "",
              contact: formData.shipper_contact || "",
              email: formData.shipper_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextS = [curS, ...savedShippers.filter((s) => s.id !== curS.id)].slice(0, 100)
            window.localStorage.setItem(SAVED_SHIPPERS_STORAGE_KEY, JSON.stringify(nextS))
          }

          if (formData.consignee_name?.trim()) {
            const cName = formData.consignee_name.trim()
            const matchC = savedConsignees.find((c) => c.name.trim().toLowerCase() === cName.toLowerCase())
            const curC: SavedParty = {
              id: matchC ? matchC.id : crypto.randomUUID(),
              name: cName,
              address: formData.consignee_address || "",
              contact: formData.consignee_contact || "",
              email: formData.consignee_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextC = [curC, ...savedConsignees.filter((c) => c.id !== curC.id)].slice(0, 100)
            window.localStorage.setItem(SAVED_CONSIGNEES_STORAGE_KEY, JSON.stringify(nextC))
          }
        } catch (e) {}

        // Tier 4: Background Ledger Live Update
        syncBolToAccountLedger(currentDocData)

        const nowFormatted = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        setLastAutoSaveTime(nowFormatted)
        setLastAutoSavedTime(nowFormatted)
      } catch (e) {
        setAutoSaveStatus("error")
      }
    }, 800)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("pagehide", flushLocalDraft)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [formData, bolNumber, issueDate, persianDate, persianDateNumeric, checkingDraft, hasRecoverableDraft])
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null)
  const [showLocationDropdown, setShowLocationDropdown] = useState<number | null>(null)
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("ALL")
  const [selectedIndiaCategoryFilter, setSelectedIndiaCategoryFilter] = useState("ALL")
  const [disableModeFilter, setDisableModeFilter] = useState(false)
  const [showStampSignature, setShowStampSignature] = useState(true)
  const [routeLocationSearch, setRouteLocationSearch] = useState("")
  const [savedShippers, setSavedShippers] = useState<SavedParty[]>([])
  const [selectedShipperId, setSelectedShipperId] = useState<string>("")
  const [showShipperDropdown, setShowShipperDropdown] = useState(false)
  const [shipperSearchQuery, setShipperSearchQuery] = useState("")
  const [savedConsignees, setSavedConsignees] = useState<SavedParty[]>([])
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string>("")
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false)
  const [consigneeSearchQuery, setConsigneeSearchQuery] = useState("")
  const [savedNotifyParties, setSavedNotifyParties] = useState<SavedParty[]>([])
  const [selectedNotifyPartyId, setSelectedNotifyPartyId] = useState<string>("")
  const [showNotifyPartyDropdown, setShowNotifyPartyDropdown] = useState(false)
  const [notifyPartySearchQuery, setNotifyPartySearchQuery] = useState("")
  const [savedNotes1, setSavedNotes1] = useState<SavedNoteOption[]>([])
  const [selectedNote1Id, setSelectedNote1Id] = useState<string>("")
  const [savedNotes2, setSavedNotes2] = useState<SavedNoteOption[]>([])
  const [selectedNote2Id, setSelectedNote2Id] = useState<string>("")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isDocumentCenterOpen, setIsDocumentCenterOpen] = useState(false)
  const [savedRoutePresets, setSavedRoutePresets] = useState<SavedRoutePreset[]>([])
  const [isSaveRouteModalOpen, setIsSaveRouteModalOpen] = useState(false)
  const [newPresetTitle, setNewPresetTitle] = useState("")
  const [newPresetIcon, setNewPresetIcon] = useState("🚛")
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null)
  const [recoverableDraftTime, setRecoverableDraftTime] = useState<string | null>(null)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false)
  const [activePrintOptions, setActivePrintOptions] = useState<PrintOptions>({
    copies: 1,
    quality: "standard",
    includeColorStrip: true,
    fitToPage: true,
  })

  // Check for existing unsaved draft on initial load (Browser + Server sync)
  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem("sky-bol-live-draft") || window.localStorage.getItem("skybol:active-form-draft")
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft)
        const dData = parsed.formData || parsed
        if (dData?.bol_number && (parsed.savedAt || dData.updated_at)) {
          const timeStr = parsed.savedAt || dData.updated_at
          setHasRecoverableDraft(true)
          setRecoverableDraftTime(new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
        }
        setCheckingDraft(false)
      } else {
        // Fallback: Check dedicated server draft store
        fetch("/api/draft?type=bol", { signal: AbortSignal.timeout(10000) })
          .then((res) => res.json())
          .then((data) => {
            if (data?.draft?.bol_number && data?.updated_at) {
              setHasRecoverableDraft(true)
              setRecoverableDraftTime(new Date(data.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
              window.localStorage.setItem("sky-bol-live-draft", JSON.stringify({
                formData: data.draft,
                bolNumber: data.draft.bol_number,
                savedAt: data.updated_at,
              }))
            }
          })
          .catch(() => {})
          .finally(() => setCheckingDraft(false))
      }
    } catch (e) {
      console.error("Error reading draft:", e)
      setCheckingDraft(false)
    }

    // Check for active export corridor transfer from Logistics Calculator
    try {
      const rawExportDraft = window.localStorage.getItem("skybol:active-export-routes-draft")
      if (rawExportDraft) {
        const parsed = JSON.parse(rawExportDraft)
        if (Array.isArray(parsed.routes) && parsed.routes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            routes: parsed.routes,
            shipping_cost: parsed.shipping_cost || prev.shipping_cost,
            shipping_cost_currency: "USD",
            remarks: parsed.remarks || prev.remarks,
          }))
          window.localStorage.removeItem("skybol:active-export-routes-draft")
          toast.success("Loaded Export Corridor into Active BOL! 🚛", {
            description: `${parsed.routes.length} export & transit route stops populated`,
          })
        }
      }
    } catch (e) {
      console.warn("Error reading export draft:", e)
    }
  }, [])

  const handleRestoreDraft = () => {
    try {
      const rawDraft = window.localStorage.getItem("sky-bol-live-draft") || window.localStorage.getItem("skybol:active-form-draft")
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft)
        const dData = parsed.formData || parsed
        if (dData) setFormData(dData)
        if (parsed.bolNumber || dData.bol_number) setBolNumber(parsed.bolNumber || dData.bol_number)
        if (parsed.issueDate || dData.issue_date) setIssueDate(parsed.issueDate || dData.issue_date)
        if (parsed.persianDate || dData.persian_date) setPersianDate(parsed.persianDate || dData.persian_date)
        if (parsed.persianDateNumeric || dData.persian_date_numeric) setPersianDateNumeric(parsed.persianDateNumeric || dData.persian_date_numeric)
        setHasRecoverableDraft(false)
        toast.success("Draft Restored Successfully! 🚀", {
          description: `پیش‌نویس ذخیره‌شده با موفقیت بازیابی شد`,
        })
      }
    } catch (e) {
      toast.error("Failed to restore draft")
    }
  }

  const handleDiscardDraft = () => {
    window.localStorage.removeItem("sky-bol-live-draft")
    window.localStorage.removeItem("skybol:active-form-draft")
    fetch("/api/draft?type=bol", { method: "DELETE" }).catch(() => {})
    setHasRecoverableDraft(false)
    toast.info("Unsaved draft discarded")
  }

  const handleExportFullBackup = () => {
    try {
      const backupPayload = {
        app: "Sky Ariana BOL Logistics Suite",
        version: "3.2",
        exportedAt: new Date().toISOString(),
        companySettings: window.localStorage.getItem(PDF_COMPANY_SETTINGS_STORAGE_KEY),
        routePresets: window.localStorage.getItem(SAVED_ROUTE_PRESETS_STORAGE_KEY),
        savedShippers: window.localStorage.getItem(SAVED_SHIPPERS_STORAGE_KEY),
        savedConsignees: window.localStorage.getItem(SAVED_CONSIGNEES_STORAGE_KEY),
        savedNotifyParties: window.localStorage.getItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY),
        savedNotes1: window.localStorage.getItem(SAVED_NOTES_1_STORAGE_KEY),
        savedNotes2: window.localStorage.getItem(SAVED_NOTES_2_STORAGE_KEY),
        currentForm: formData,
      }

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const dateStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `sky-ariana-bol-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Full Backup Downloaded! 💾", {
        description: "تمامی اطلاعات، پیش‌فرض‌ها و تنظیمات با موفقیت در فایل JSON ذخیره شدند",
      })
    } catch (e) {
      toast.error("Failed to generate backup")
    }
  }

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)
        if (parsed.companySettings) window.localStorage.setItem(PDF_COMPANY_SETTINGS_STORAGE_KEY, parsed.companySettings)
        if (parsed.routePresets) {
          window.localStorage.setItem(SAVED_ROUTE_PRESETS_STORAGE_KEY, parsed.routePresets)
          setSavedRoutePresets(JSON.parse(parsed.routePresets))
        }
        if (parsed.savedShippers) window.localStorage.setItem(SAVED_SHIPPERS_STORAGE_KEY, parsed.savedShippers)
        if (parsed.savedConsignees) window.localStorage.setItem(SAVED_CONSIGNEES_STORAGE_KEY, parsed.savedConsignees)
        if (parsed.savedNotifyParties) window.localStorage.setItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY, parsed.savedNotifyParties)
        if (parsed.savedNotes1) window.localStorage.setItem(SAVED_NOTES_1_STORAGE_KEY, parsed.savedNotes1)
        if (parsed.savedNotes2) window.localStorage.setItem(SAVED_NOTES_2_STORAGE_KEY, parsed.savedNotes2)
        if (parsed.currentForm) setFormData(parsed.currentForm)

        toast.success("Backup Restored Successfully! 🎉", {
          description: "تمامی اطلاعات با موفقیت بازیابی و اعمال شدند",
        })
        setIsBackupModalOpen(false)
      } catch (err) {
        toast.error("Invalid Backup File", { description: "فایل انتخاب‌شده نامعتبر است" })
      }
    }
    reader.readAsText(file)
  }

  // Load saved route presets from localStorage on mount
  useEffect(() => {
    try {
      const storedPresets = window.localStorage.getItem(SAVED_ROUTE_PRESETS_STORAGE_KEY)
      if (storedPresets) {
        setSavedRoutePresets(JSON.parse(storedPresets))
      }
    } catch (e) {
      console.error("Error loading saved route presets:", e)
    }
  }, [])

  // Load saved PDF / Company settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PDF_COMPANY_SETTINGS_STORAGE_KEY) || window.localStorage.getItem("skybol:company-settings")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.companyName) setCompanyName(parsed.companyName)
        if (parsed.companyNamePersian) setCompanyNamePersian(parsed.companyNamePersian)
        if (parsed.companySubtitle) setCompanySubtitle(parsed.companySubtitle)
        if (parsed.companyPhone) setCompanyPhone(parsed.companyPhone)
        if (parsed.companyEmail) setCompanyEmail(parsed.companyEmail)
        if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress)
        if (parsed.companyLicence) setCompanyLicence(parsed.companyLicence)
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl)
        if (typeof parsed.bgImageUrl === "string") {
          const isLegacyGlobalFlight = parsed.bgImageUrl === "/images/document-backgrounds/global-flight.svg"
          setBgImageUrl(
            isLegacyGlobalFlight
              ? "/images/document-backgrounds/global-flight-premium.png"
              : parsed.bgImageUrl,
          )
          if (typeof parsed.bgOpacity === "number" && Number.isFinite(parsed.bgOpacity)) {
            const minimumOpacity = isLegacyGlobalFlight ? 0.22 : 0
            setBgOpacity(Math.max(minimumOpacity, Math.min(0.35, parsed.bgOpacity)))
          }
        }
        if (parsed.iranOffice) {
          setFormData((prev) => ({
            ...prev,
            iran_office_building: parsed.iranOffice.iran_office_building ?? prev.iran_office_building,
            iran_office_location: parsed.iranOffice.iran_office_location ?? prev.iran_office_location,
            iran_office_pobox: parsed.iranOffice.iran_office_pobox ?? prev.iran_office_pobox,
            iran_office_telefax: parsed.iranOffice.iran_office_telefax ?? prev.iran_office_telefax,
            iran_office_cellphone: parsed.iranOffice.iran_office_cellphone ?? prev.iran_office_cellphone,
            iran_office_email: parsed.iranOffice.iran_office_email ?? prev.iran_office_email,
          }))
        }
      }
    } catch (e) {
      console.error("Error reading stored PDF / company settings:", e)
    } finally {
      isCompanySettingsLoadedRef.current = true
    }
  }, [])

  const persistCompanySettings = (overrides?: {
    companyName?: string
    companyNamePersian?: string
    companySubtitle?: string
    companyPhone?: string
    companyEmail?: string
    companyAddress?: string
    companyLicence?: string
    logoUrl?: string
    bgImageUrl?: string
    bgOpacity?: number
    iranOffice?: {
      iran_office_building?: string
      iran_office_location?: string
      iran_office_pobox?: string
      iran_office_telefax?: string
      iran_office_cellphone?: string
      iran_office_email?: string
    }
  }) => {
    try {
      const dataToSave = {
        companyName: overrides?.companyName ?? companyName,
        companyNamePersian: overrides?.companyNamePersian ?? companyNamePersian,
        companySubtitle: overrides?.companySubtitle ?? companySubtitle,
        companyPhone: overrides?.companyPhone ?? companyPhone,
        companyEmail: overrides?.companyEmail ?? companyEmail,
        companyAddress: overrides?.companyAddress ?? companyAddress,
        companyLicence: overrides?.companyLicence ?? companyLicence,
        logoUrl: overrides?.logoUrl ?? logoUrl,
        bgImageUrl: overrides?.bgImageUrl ?? bgImageUrl,
        bgOpacity: overrides?.bgOpacity ?? bgOpacity,
        iranOffice: {
          iran_office_building: overrides?.iranOffice?.iran_office_building ?? formData.iran_office_building,
          iran_office_location: overrides?.iranOffice?.iran_office_location ?? formData.iran_office_location,
          iran_office_pobox: overrides?.iranOffice?.iran_office_pobox ?? formData.iran_office_pobox,
          iran_office_telefax: overrides?.iranOffice?.iran_office_telefax ?? formData.iran_office_telefax,
          iran_office_cellphone: overrides?.iranOffice?.iran_office_cellphone ?? formData.iran_office_cellphone,
          iran_office_email: overrides?.iranOffice?.iran_office_email ?? formData.iran_office_email,
        },
      }
      window.localStorage.setItem(PDF_COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(dataToSave))
      window.localStorage.setItem("skybol:company-settings", JSON.stringify(dataToSave))
    } catch (e) {
      console.error("Error persisting company / PDF settings:", e)
    }
  }

  // Auto-persist company settings when they change after initial load
  useEffect(() => {
    if (!isCompanySettingsLoadedRef.current) return
    persistCompanySettings()
  }, [
    companyName,
    companyNamePersian,
    companySubtitle,
    companyPhone,
    companyEmail,
    companyAddress,
    companyLicence,
    logoUrl,
    bgImageUrl,
    bgOpacity,
    formData.iran_office_building,
    formData.iran_office_location,
    formData.iran_office_pobox,
    formData.iran_office_telefax,
    formData.iran_office_cellphone,
    formData.iran_office_email,
  ])

  // Fetch next BOL number on mount and set dates
  useEffect(() => {
    fetchNextBolNumber()
    const today = new Date().toISOString().split("T")[0]
    setIssueDate(today)
    const dualDates = getDualDates(today)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
    }
  }, [])

  useEffect(() => {
    try {
      const storedShippers = JSON.parse(window.localStorage.getItem(SAVED_SHIPPERS_STORAGE_KEY) || "[]")
      const storedConsignees = JSON.parse(window.localStorage.getItem(SAVED_CONSIGNEES_STORAGE_KEY) || "[]")
      const storedNotifyParties = JSON.parse(window.localStorage.getItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY) || "[]")
      const storedNotes1 = JSON.parse(window.localStorage.getItem(SAVED_NOTES_1_STORAGE_KEY) || "[]")
      const storedNotes2 = JSON.parse(window.localStorage.getItem(SAVED_NOTES_2_STORAGE_KEY) || "[]")

      const mergedShippers = mergeSavedParties(SHIPPER_SEED_LIST, storedShippers)
      const mergedConsignees = mergeSavedParties(CONSIGNEE_SEED_LIST, storedConsignees)
      const mergedNotifyParties = mergeSavedParties(NOTIFY_PARTY_SEED_LIST, storedNotifyParties)
      const mergedNotes1 = mergeSavedNoteOptions(NOTE_1_SEED_LIST, storedNotes1)
      const mergedNotes2 = mergeSavedNoteOptions(NOTE_2_SEED_LIST, storedNotes2)

      setSavedShippers(mergedShippers)
      setSavedConsignees(mergedConsignees)
      setSavedNotifyParties(mergedNotifyParties)
      setSavedNotes1(mergedNotes1)
      setSavedNotes2(mergedNotes2)

      window.localStorage.setItem(SAVED_SHIPPERS_STORAGE_KEY, JSON.stringify(mergedShippers))
      window.localStorage.setItem(SAVED_CONSIGNEES_STORAGE_KEY, JSON.stringify(mergedConsignees))
      window.localStorage.setItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY, JSON.stringify(mergedNotifyParties))
      window.localStorage.setItem(SAVED_NOTES_1_STORAGE_KEY, JSON.stringify(mergedNotes1))
      window.localStorage.setItem(SAVED_NOTES_2_STORAGE_KEY, JSON.stringify(mergedNotes2))
    } catch (error) {
      console.error("[v0] Error loading saved parties:", error)
    }
  }, [])

  // Load document when loadDocumentId changes
  useEffect(() => {
    if (loadDocumentId) {
      loadDocument(loadDocumentId)
    }
  }, [loadDocumentId])

  const loadDocument = async (id: string) => {
    setIsLoading(true)
    try {
      let doc: any = null
      try {
        const response = await fetch(`/api/bol/${id}`)
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            doc = result.data
          }
        }
      } catch (err) {
        console.warn("Server document fetch failed, trying local storage fallback:", err)
      }

      if (!doc) {
        try {
          const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
          if (storedLocal) {
            const clientLocalDocs: any[] = JSON.parse(storedLocal)
            doc = clientLocalDocs.find((d) => d.id === id || d.bol_number === id)
          }
        } catch (e) {
          console.error("Error reading browser local document fallback:", e)
        }
      }

      if (doc) {
        setBolNumber(doc.bol_number || "")
        setIssueDate(doc.issue_date || new Date().toISOString().split("T")[0])
        setEditDocumentId(doc.id || id)
        setIsEditMode(true)
        const dualDates = getDualDates(doc.issue_date || new Date().toISOString().split("T")[0])
        if (dualDates) {
          setPersianDate(dualDates.persian)
          setPersianDateNumeric(formatPersianDate(doc.issue_date) ?? dualDates.persianNumeric)
        }
        const nextFormData = {
          truck_number: doc.truck_number || "",
          driver_name: doc.driver_name || "",
          driver_father_name: doc.driver_father_name || "",
          driver_contact: doc.driver_contact || "",
          driver_rent: doc.driver_rent || "",
          routes: doc.routes || initialFormData.routes,
          container_type: doc.container_type || "",
          container_size: doc.container_size || "",
          container_numbers: doc.container_numbers || "",
          seal_numbers: doc.seal_numbers || "",
          shipper_name: doc.shipper_name || "",
          shipper_address: doc.shipper_address || "",
          shipper_contact: doc.shipper_contact || "",
          shipper_email: doc.shipper_email || "",
          consignee_name: doc.consignee_name || "",
          consignee_address: doc.consignee_address || "",
          consignee_contact: doc.consignee_contact || "",
          consignee_email: doc.consignee_email || "",
          notify_party: doc.notify_party || "",
          notify_party_address: doc.notify_party_address || "",
          vessel_name: doc.vessel_name || "",
          voyage_number: doc.voyage_number || "",
          port_of_loading: doc.port_of_loading || "",
          port_of_discharge: doc.port_of_discharge || "",
          place_of_delivery: doc.place_of_delivery || "",
          cargo_description: doc.cargo_description || initialFormData.cargo_description,
          net_weight: doc.net_weight || "",
          gross_weight: doc.gross_weight || "",
          measurement: doc.measurement || "",
          number_of_packages: doc.number_of_packages || "",
          kgs_per_carton: doc.kgs_per_carton || "",
          gross_weight_per_carton: doc.gross_weight_per_carton || "",
          rate_per_kgs: doc.rate_per_kgs || "",
          goods_value: doc.goods_value || "",
          freight_payable_at: doc.freight_payable_at || "",
          freight_terms: doc.freight_terms || "",
          remarks: doc.remarks || "",
          notes_1: doc.notes_1 || initialFormData.notes_1,
          notes_1_label: doc.notes_1_label || initialFormData.notes_1_label,
          notes_1_theme: doc.notes_1_theme || initialFormData.notes_1_theme,
          notes_2: doc.notes_2 || initialFormData.notes_2,
          notes_2_label: doc.notes_2_label || initialFormData.notes_2_label,
          notes_2_theme: doc.notes_2_theme || initialFormData.notes_2_theme,
          afghanistan_documents: doc.afghanistan_documents || [],
          afghanistan_document_details: doc.afghanistan_document_details || {},
        }
        setFormData(nextFormData)
        if (typeof document !== "undefined") {
          const smartTitle = buildBolSmartFileName({ ...nextFormData, bol_number: doc.bol_number || "" }, doc.bol_number || id, "")
          if (smartTitle) {
            document.title = smartTitle
          }
        }
        onDocumentLoaded?.()
      } else {
        toast.error("Unable to load document data")
      }
    } catch (error) {
      console.error("[v0] Error loading document:", error)
      toast.error("Failed to load document")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNextBolNumber = async () => {
    setIsLoading(true)
    try {
      let maxLocalSuffix = 0
      try {
        const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
        const localDocs: any[] = storedLocal ? JSON.parse(storedLocal) : []
        for (const doc of localDocs) {
          const numStr = doc.bol_number || doc.id || ""
          const match = numStr.match(/NSA(\d+)/i) || numStr.match(/(\d+)\s*$/)
          if (match && match[1]) {
            const val = parseInt(match[1], 10)
            if (!isNaN(val) && val > maxLocalSuffix) maxLocalSuffix = val
          }
        }
      } catch (e) {
        console.error("Error reading browser docs for sequence:", e)
      }

      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      
      let serverSuffix = 0
      if (result.bolNumber) {
        const serverMatch = result.bolNumber.match(/NSA(\d+)/i) || result.bolNumber.match(/(\d+)\s*$/)
        if (serverMatch && serverMatch[1]) {
          serverSuffix = parseInt(serverMatch[1], 10) || 0
        }
      }

      const currentYear = new Date().getFullYear()
      const nextSeq = Math.max(470, maxLocalSuffix + 1, serverSuffix)
      const formattedNextBol = `BOL-${currentYear}-NSA${String(nextSeq).padStart(3, "0")}`
      setBolNumber(formattedNextBol)
    } catch (error) {
      console.error("Error fetching BOL number:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }

      if (
        name === "number_of_packages" ||
        name === "kgs_per_carton" ||
        name === "gross_weight_per_carton" ||
        name === "rate_per_kgs"
      ) {
        const calc = calculateMultiCargo(
          name === "number_of_packages" ? value : next.number_of_packages,
          name === "kgs_per_carton" ? value : next.kgs_per_carton,
          name === "gross_weight_per_carton" ? value : next.gross_weight_per_carton,
          name === "rate_per_kgs" ? value : next.rate_per_kgs
        )

        if (calc.formattedNetWeight) next.net_weight = calc.formattedNetWeight
        if (calc.formattedGrossWeight) next.gross_weight = calc.formattedGrossWeight
        if (calc.formattedGoodsValue) next.goods_value = calc.formattedGoodsValue
      }

      return next
    })
  }

  const parseNumericValue = (value: string): number | null => {
    const cleaned = value.replace(/,/g, "").match(/-?\d*\.?\d+/)?.[0]
    if (!cleaned) return null

    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }

  const parsePackagesList = (str: string): number[] => {
    if (!str) return []
    const cleaned = str.replace(/(\d),(\d)/g, '$1$2')
    const parts = cleaned.split(/\s*[\+;/]\s*|\s+-\s+|\s*,\s*/)
    const numbers: number[] = []

    for (const part of parts) {
      const nonKgMatches = part.match(/\b(\d+(\.\d+)?)\s*(?!kg|kgs|kilo|ton|cbm)\b/gi)
      if (nonKgMatches && nonKgMatches.length > 0) {
        for (const m of nonKgMatches) {
          const num = parseFloat(m.replace(/[^\d.]/g, ''))
          if (!isNaN(num) && num > 0) {
            numbers.push(num)
          }
        }
      } else {
        const matches = part.match(/\b\d+(\.\d+)?\b/g)
        if (matches && matches.length > 0) {
          const num = parseFloat(matches[0])
          if (!isNaN(num) && num > 0) {
            numbers.push(num)
          }
        }
      }
    }

    if (numbers.length === 0) {
      const allMatches = cleaned.match(/\b\d+(\.\d+)?\b/g)
      if (allMatches) {
        for (const m of allMatches) {
          const num = parseFloat(m)
          if (!isNaN(num) && num > 0) {
            numbers.push(num)
          }
        }
      }
    }

    return numbers
  }

  const parseWeightsOrRatesList = (str: string): number[] => {
    if (!str) return []
    const cleaned = str.replace(/(\d),(\d)/g, '$1$2')
    const matches = cleaned.match(/\b\d+(\.\d+)?\b/g)
    if (!matches) return []
    return matches.map((m) => parseFloat(m)).filter((n) => !isNaN(n) && n > 0)
  }

  const calculateMultiCargo = (
    packagesStr: string,
    netPerCartonStr: string,
    grossPerCartonStr: string,
    rateStr: string
  ) => {
    const pkgList = parsePackagesList(packagesStr || "")
    const netKgList = parseWeightsOrRatesList(netPerCartonStr || "")
    const grossKgList = parseWeightsOrRatesList(grossPerCartonStr || "")
    const rateList = parseWeightsOrRatesList(rateStr || "")

    const itemCount = Math.max(pkgList.length, netKgList.length, grossKgList.length, rateList.length, 1)
    const isMultiItem = itemCount > 1 || pkgList.length > 1

    const items: Array<{
      packages: number
      netPerCarton: number
      grossPerCarton: number
      rate: number
      netWeight: number
      grossWeight: number
      goodsValue: number
    }> = []

    let totalPackages = 0
    let totalNetWeight = 0
    let totalGrossWeight = 0
    let totalGoodsValue = 0

    for (let i = 0; i < itemCount; i++) {
      const pkg = pkgList[i] !== undefined ? pkgList[i] : (pkgList[0] || 0)
      const netPerCt = netKgList[i] !== undefined ? netKgList[i] : (netKgList[0] || 0)
      const grossPerCt = grossKgList[i] !== undefined ? grossKgList[i] : (grossKgList[0] || 0)
      const rate = rateList[i] !== undefined ? rateList[i] : (rateList[0] || 0)

      const netWeight = pkg > 0 && netPerCt > 0 ? pkg * netPerCt : 0
      const grossWeight = pkg > 0 && grossPerCt > 0 ? pkg * grossPerCt : 0
      const goodsValue = netWeight > 0 && rate > 0 ? netWeight * rate : 0

      items.push({
        packages: pkg,
        netPerCarton: netPerCt,
        grossPerCarton: grossPerCt,
        rate,
        netWeight,
        grossWeight,
        goodsValue,
      })

      totalPackages += pkg
      totalNetWeight += netWeight
      totalGrossWeight += grossWeight
      totalGoodsValue += goodsValue
    }

    let formattedNetWeight = ""
    let formattedGrossWeight = ""
    let formattedGoodsValue = ""

    if (isMultiItem && items.length > 1) {
      formattedNetWeight = items.map((it) => `${formatWeightValue(it.netWeight)} KG`).join(" - ")
      formattedGrossWeight = items.map((it) => `${formatWeightValue(it.grossWeight)} KG`).join(" - ")
      formattedGoodsValue = items.map((it) => `${it.goodsValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`).join(" - ")
    } else if (items.length === 1 && items[0].netWeight > 0) {
      formattedNetWeight = `${formatWeightValue(items[0].netWeight)} KG`
      formattedGrossWeight = items[0].grossWeight > 0 ? `${formatWeightValue(items[0].grossWeight)} KG` : ""
      formattedGoodsValue = items[0].goodsValue > 0 ? formatUsdValue(items[0].goodsValue) : ""
    }

    return {
      isMultiItem,
      items,
      totalPackages,
      totalNetWeight,
      totalGrossWeight,
      totalGoodsValue,
      formattedNetWeight,
      formattedGrossWeight,
      formattedGoodsValue,
    }
  }

  const formatWeightValue = (value: number): string => {
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 })
  }

  const formatUsdValue = (value: number): string => {
    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`
  }

  const persistSavedParties = (
    storageKey: string,
    parties: SavedParty[],
    setParties: React.Dispatch<React.SetStateAction<SavedParty[]>>
  ) => {
    setParties(parties)
    window.localStorage.setItem(storageKey, JSON.stringify(parties))
  }

  const applySavedNote1 = (id: string) => {
    const found = savedNotes1.find((n) => n.id === id)
    if (!found) return
    setSelectedNote1Id(id)
    setFormData((prev) => ({
      ...prev,
      notes_1_label: found.label,
      notes_1: found.content,
      notes_1_theme: found.theme || prev.notes_1_theme || "red",
    }))
    toast.success("Applied saved option to Note 1")
  }

  const persistSavedNotes = (
    storageKey: string,
    notes: SavedNoteOption[],
    setNotes: React.Dispatch<React.SetStateAction<SavedNoteOption[]>>,
  ) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(notes))
      setNotes(notes)
      return true
    } catch (error) {
      console.error("Failed to save note presets:", error)
      toast.error("Could not save the note preset", {
        description: "Browser storage is unavailable or full.",
      })
      return false
    }
  }

  const saveCurrentNote1 = (saveAsNew = false) => {
    const label = (formData.notes_1_label || "").trim() || "Note 1"
    const content = (formData.notes_1 || "").trim()
    if (!content) {
      toast.error("Enter Note 1 content first")
      return
    }

    const normalizedLabel = label.toLocaleLowerCase()
    const existingMatch = saveAsNew
      ? undefined
      : savedNotes1.find((n) => n.id === selectedNote1Id)
        || savedNotes1.find((n) => n.label.trim().toLocaleLowerCase() === normalizedLabel)
    const currentNote: SavedNoteOption = {
      id: existingMatch ? existingMatch.id : `n1-${Date.now()}`,
      label,
      content,
      theme: formData.notes_1_theme || "red",
      savedAt: new Date().toISOString(),
    }
    const nextList = [currentNote, ...savedNotes1.filter((n) => n.id !== currentNote.id)]
    if (!persistSavedNotes(SAVED_NOTES_1_STORAGE_KEY, nextList, setSavedNotes1)) return
    setSelectedNote1Id(currentNote.id)
    toast.success(existingMatch ? "Note 1 preset updated" : "Note 1 preset saved", {
      description: `“${label}” is ready to reuse`,
    })
  }

  const saveCurrentNote1AsNew = () => saveCurrentNote1(true)

  const deleteSavedNote1 = () => {
    if (!selectedNote1Id) return
    const nextList = savedNotes1.filter((n) => n.id !== selectedNote1Id)
    if (!persistSavedNotes(SAVED_NOTES_1_STORAGE_KEY, nextList, setSavedNotes1)) return
    setSelectedNote1Id("")
    toast.success("Saved Note 1 option deleted")
  }

  const applySavedNote2 = (id: string) => {
    const found = savedNotes2.find((n) => n.id === id)
    if (!found) return
    setSelectedNote2Id(id)
    setFormData((prev) => ({
      ...prev,
      notes_2_label: found.label,
      notes_2: found.content,
      notes_2_theme: found.theme || prev.notes_2_theme || "green",
    }))
    toast.success("Applied saved option to Note 2")
  }

  const saveCurrentNote2 = (saveAsNew = false) => {
    const label = (formData.notes_2_label || "").trim() || "Note 2"
    const content = (formData.notes_2 || "").trim()
    if (!content) {
      toast.error("Enter Note 2 content first")
      return
    }

    const normalizedLabel = label.toLocaleLowerCase()
    const existingMatch = saveAsNew
      ? undefined
      : savedNotes2.find((n) => n.id === selectedNote2Id)
        || savedNotes2.find((n) => n.label.trim().toLocaleLowerCase() === normalizedLabel)
    const currentNote: SavedNoteOption = {
      id: existingMatch ? existingMatch.id : `n2-${Date.now()}`,
      label,
      content,
      theme: formData.notes_2_theme || "green",
      savedAt: new Date().toISOString(),
    }
    const nextList = [currentNote, ...savedNotes2.filter((n) => n.id !== currentNote.id)]
    if (!persistSavedNotes(SAVED_NOTES_2_STORAGE_KEY, nextList, setSavedNotes2)) return
    setSelectedNote2Id(currentNote.id)
    toast.success(existingMatch ? "Note 2 preset updated" : "Note 2 preset saved", {
      description: `“${label}” is ready to reuse`,
    })
  }

  const saveCurrentNote2AsNew = () => saveCurrentNote2(true)

  const deleteSavedNote2 = () => {
    if (!selectedNote2Id) return
    const nextList = savedNotes2.filter((n) => n.id !== selectedNote2Id)
    if (!persistSavedNotes(SAVED_NOTES_2_STORAGE_KEY, nextList, setSavedNotes2)) return
    setSelectedNote2Id("")
    toast.success("Saved Note 2 option deleted")
  }

  const selectedSavedNote1 = savedNotes1.find((note) => note.id === selectedNote1Id)
  const selectedSavedNote2 = savedNotes2.find((note) => note.id === selectedNote2Id)
  const isNote1PresetDirty = Boolean(selectedSavedNote1 && (
    selectedSavedNote1.label !== (formData.notes_1_label || "").trim()
    || selectedSavedNote1.content !== (formData.notes_1 || "").trim()
    || (selectedSavedNote1.theme || "red") !== (formData.notes_1_theme || "red")
  ))
  const isNote2PresetDirty = Boolean(selectedSavedNote2 && (
    selectedSavedNote2.label !== (formData.notes_2_label || "").trim()
    || selectedSavedNote2.content !== (formData.notes_2 || "").trim()
    || (selectedSavedNote2.theme || "green") !== (formData.notes_2_theme || "green")
  ))

  const isShipperExisting = Boolean(
    savedShippers.find(
      (s) =>
        s.name.trim().toLowerCase() === formData.shipper_name.trim().toLowerCase() ||
        (selectedShipperId && s.id === selectedShipperId)
    )
  )

  const isConsigneeExisting = Boolean(
    savedConsignees.find(
      (c) =>
        c.name.trim().toLowerCase() === formData.consignee_name.trim().toLowerCase() ||
        (selectedConsigneeId && c.id === selectedConsigneeId)
    )
  )

  const isNotifyPartyExisting = Boolean(
    savedNotifyParties.find(
      (n) =>
        n.name.trim().toLowerCase() === formData.notify_party.trim().toLowerCase() ||
        (selectedNotifyPartyId && n.id === selectedNotifyPartyId)
    )
  )

  const matchingShippers = savedShippers.filter((s) => {
    const q = (shipperSearchQuery || formData.shipper_name || "").toLowerCase().trim()
    if (!q) return true
    return [s.name, s.address, s.contact, s.email].filter(Boolean).some((field) => field.toLowerCase().includes(q))
  })

  const matchingConsignees = savedConsignees.filter((c) => {
    const q = (consigneeSearchQuery || formData.consignee_name || "").toLowerCase().trim()
    if (!q) return true
    return [c.name, c.address, c.contact, c.email].filter(Boolean).some((field) => field.toLowerCase().includes(q))
  })

  const matchingNotifyParties = savedNotifyParties.filter((n) => {
    const q = (notifyPartySearchQuery || formData.notify_party || "").toLowerCase().trim()
    if (!q) return true
    return [n.name, n.address, n.contact, n.email].filter(Boolean).some((field) => field.toLowerCase().includes(q))
  })

  const clearShipperFields = () => {
    setFormData((prev) => ({
      ...prev,
      shipper_name: "",
      shipper_address: "",
      shipper_contact: "",
      shipper_email: "",
    }))
    setSelectedShipperId("")
    setShipperSearchQuery("")
    toast.info("Shipper fields cleared", { description: "اطلاعات فرستنده پاک شد" })
  }

  const clearConsigneeFields = () => {
    setFormData((prev) => ({
      ...prev,
      consignee_name: "",
      consignee_address: "",
      consignee_contact: "",
      consignee_email: "",
    }))
    setSelectedConsigneeId("")
    setConsigneeSearchQuery("")
    toast.info("Consignee fields cleared", { description: "اطلاعات گیرنده پاک شد" })
  }

  const clearNotifyPartyFields = () => {
    setFormData((prev) => ({
      ...prev,
      notify_party: "",
      notify_party_address: "",
    }))
    setSelectedNotifyPartyId("")
    setNotifyPartySearchQuery("")
    toast.info("Notify party cleared", { description: "اطلاعات طرف اطلاع پاک شد" })
  }

  const handleSetNotifySameAsConsignee = () => {
    setFormData((prev) => ({
      ...prev,
      notify_party: "SAME AS CONSIGNEE",
      notify_party_address: "",
    }))
    toast.success("Notify Party: SAME AS CONSIGNEE", { description: "طرف اطلاع به صورت برابر گیرنده تنظیم شد" })
  }

  const handleSetConsigneeToOrder = () => {
    setFormData((prev) => ({
      ...prev,
      consignee_name: "TO ORDER OF SHIPPER",
      consignee_address: "NEGOTIABLE BILL OF LADING",
    }))
    toast.success("Consignee: TO ORDER OF SHIPPER", { description: "گیرنده به حواله‌کرد فرستنده تنظیم شد" })
  }

  const handleSwapConsigneeNotify = () => {
    setFormData((prev) => ({
      ...prev,
      consignee_name: prev.notify_party,
      consignee_address: prev.notify_party_address,
      notify_party: prev.consignee_name,
      notify_party_address: [prev.consignee_address, prev.consignee_contact, prev.consignee_email].filter(Boolean).join(", "),
    }))
    toast.success("Swapped Consignee & Notify Party", { description: "اطلاعات گیرنده و طرف اطلاع جابجا شدند" })
  }

  const handleCopyShipperToConsignee = () => {
    if (!formData.shipper_name.trim()) {
      toast.error("Shipper is empty", { description: "ابتدا نام فرستنده را وارد کنید" })
      return
    }
    setFormData((prev) => ({
      ...prev,
      consignee_name: prev.shipper_name,
      consignee_address: prev.shipper_address,
      consignee_contact: prev.shipper_contact,
      consignee_email: prev.shipper_email,
    }))
    toast.success("Copied Shipper to Consignee", { description: "فرستنده به گیرنده کاپی شد" })
  }

  const handleCopyConsigneeToShipper = () => {
    if (!formData.consignee_name.trim()) {
      toast.error("Consignee is empty", { description: "ابتدا نام گیرنده را وارد کنید" })
      return
    }
    setFormData((prev) => ({
      ...prev,
      shipper_name: prev.consignee_name,
      shipper_address: prev.consignee_address,
      shipper_contact: prev.consignee_contact,
      shipper_email: prev.consignee_email,
    }))
    toast.success("Copied Consignee to Shipper", { description: "گیرنده به فرستنده کاپی شد" })
  }

  const saveCurrentShipper = () => {
    const shipperName = formData.shipper_name.trim()
    if (!shipperName) {
      toast.error("Add shipper name first", {
        description: "Enter a shipper name before saving it.",
      })
      return
    }

    const existingMatch = savedShippers.find(
      (s) => s.name.trim().toLowerCase() === shipperName.toLowerCase() || (selectedShipperId && s.id === selectedShipperId)
    )

    const currentShipper: SavedParty = {
      id: existingMatch ? existingMatch.id : crypto.randomUUID(),
      name: shipperName,
      address: (formData.shipper_address || "").trim(),
      contact: (formData.shipper_contact || "").trim(),
      email: (formData.shipper_email || "").trim(),
      savedAt: new Date().toISOString(),
    }

    const nextShippers = [
      currentShipper,
      ...savedShippers.filter((s) => s.id !== currentShipper.id && s.name.trim().toLowerCase() !== shipperName.toLowerCase()),
    ].slice(0, 150)

    persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, nextShippers, setSavedShippers)
    setSelectedShipperId(currentShipper.id)
    toast.success(existingMatch ? "Shipper updated in directory!" : "New shipper saved successfully!", {
      description: `${currentShipper.name} is stored in saved shippers directory.`,
    })
  }

  const applySavedShipper = (shipperId: string) => {
    const shipper = savedShippers.find((item) => item.id === shipperId)
    if (!shipper) return

    setSelectedShipperId(shipperId)
    setFormData((prev) => ({
      ...prev,
      shipper_name: shipper.name || prev.shipper_name,
      shipper_address: shipper.address || "",
      shipper_contact: shipper.contact || "",
      shipper_email: shipper.email || "",
    }))
    toast.success(`Loaded Shipper: ${shipper.name}`, {
      description: shipper.address ? shipper.address.slice(0, 40) + "..." : "Shipper loaded",
    })
  }

  const deleteSavedShipper = () => {
    if (!selectedShipperId) return

    const shipper = savedShippers.find((item) => item.id === selectedShipperId)
    persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, savedShippers.filter((item) => item.id !== selectedShipperId), setSavedShippers)
    setSelectedShipperId("")
    toast.success("Saved shipper removed", {
      description: shipper?.name || "The shipper was removed from saved shippers.",
    })
  }

  const saveCurrentConsignee = () => {
    const consigneeName = formData.consignee_name.trim()
    if (!consigneeName) {
      toast.error("Add consignee name first", {
        description: "Enter a consignee name before saving it.",
      })
      return
    }

    const existingMatch = savedConsignees.find(
      (c) => c.name.trim().toLowerCase() === consigneeName.toLowerCase() || (selectedConsigneeId && c.id === selectedConsigneeId)
    )

    const currentConsignee: SavedParty = {
      id: existingMatch ? existingMatch.id : crypto.randomUUID(),
      name: consigneeName,
      address: (formData.consignee_address || "").trim(),
      contact: (formData.consignee_contact || "").trim(),
      email: (formData.consignee_email || "").trim(),
      savedAt: new Date().toISOString(),
    }

    const nextConsignees = [
      currentConsignee,
      ...savedConsignees.filter((c) => c.id !== currentConsignee.id && c.name.trim().toLowerCase() !== consigneeName.toLowerCase()),
    ].slice(0, 150)

    persistSavedParties(SAVED_CONSIGNEES_STORAGE_KEY, nextConsignees, setSavedConsignees)
    setSelectedConsigneeId(currentConsignee.id)
    toast.success(existingMatch ? "Consignee updated in directory!" : "New consignee saved successfully!", {
      description: `${currentConsignee.name} is stored in saved consignees directory.`,
    })
  }

  const applySavedConsignee = (consigneeId: string) => {
    const consignee = savedConsignees.find((item) => item.id === consigneeId)
    if (!consignee) return

    setSelectedConsigneeId(consigneeId)
    setFormData((prev) => ({
      ...prev,
      consignee_name: consignee.name || prev.consignee_name,
      consignee_address: consignee.address || "",
      consignee_contact: consignee.contact || "",
      consignee_email: consignee.email || "",
    }))
    toast.success(`Loaded Consignee: ${consignee.name}`, {
      description: consignee.address ? consignee.address.slice(0, 40) + "..." : "Consignee loaded",
    })
  }

  const deleteSavedConsignee = () => {
    if (!selectedConsigneeId) return

    const consignee = savedConsignees.find((item) => item.id === selectedConsigneeId)
    persistSavedParties(
      SAVED_CONSIGNEES_STORAGE_KEY,
      savedConsignees.filter((item) => item.id !== selectedConsigneeId),
      setSavedConsignees
    )
    setSelectedConsigneeId("")
    toast.success("Saved consignee removed", {
      description: consignee?.name || "The consignee was removed from saved consignees.",
    })
  }

  const saveCurrentNotifyParty = () => {
    const notifyPartyName = formData.notify_party.trim()
    if (!notifyPartyName) {
      toast.error("Add notify party name first", {
        description: "ابتدا نام طرف اطلاع را وارد کنید",
      })
      return
    }

    const existingMatch = savedNotifyParties.find(
      (n) => n.name.trim().toLowerCase() === notifyPartyName.toLowerCase() || (selectedNotifyPartyId && n.id === selectedNotifyPartyId)
    )

    const currentNotifyParty: SavedParty = {
      id: existingMatch ? existingMatch.id : crypto.randomUUID(),
      name: notifyPartyName,
      address: (formData.notify_party_address || "").trim(),
      contact: "",
      email: "",
      savedAt: new Date().toISOString(),
    }

    const nextNotifyParties = [
      currentNotifyParty,
      ...savedNotifyParties.filter(
        (n) => n.id !== currentNotifyParty.id && n.name.trim().toLowerCase() !== notifyPartyName.toLowerCase()
      ),
    ].slice(0, 100)

    persistSavedParties(SAVED_NOTIFY_PARTIES_STORAGE_KEY, nextNotifyParties, setSavedNotifyParties)
    setSelectedNotifyPartyId(currentNotifyParty.id)
    toast.success(existingMatch ? "Notify party updated in directory!" : "New notify party saved successfully!", {
      description: `${currentNotifyParty.name} در لیست ذخیره شد.`,
    })
  }

  const applySavedNotifyParty = (notifyPartyId: string) => {
    const notifyParty = savedNotifyParties.find((item) => item.id === notifyPartyId)
    if (!notifyParty) return

    setSelectedNotifyPartyId(notifyPartyId)
    setFormData((prev) => ({
      ...prev,
      notify_party: notifyParty.name || prev.notify_party,
      notify_party_address: notifyParty.address || "",
    }))
    toast.success(`Loaded Notify Party: ${notifyParty.name}`, {
      description: notifyParty.address ? notifyParty.address.slice(0, 40) + "..." : "طرف اطلاع بارگذاری شد",
    })
  }

  const deleteSavedNotifyParty = () => {
    if (!selectedNotifyPartyId) return

    const notifyParty = savedNotifyParties.find((item) => item.id === selectedNotifyPartyId)
    persistSavedParties(
      SAVED_NOTIFY_PARTIES_STORAGE_KEY,
      savedNotifyParties.filter((item) => item.id !== selectedNotifyPartyId),
      setSavedNotifyParties
    )
    setSelectedNotifyPartyId("")
    toast.success("Saved notify party removed", {
      description: notifyParty?.name || "The notify party was removed from saved notify parties.",
    })
  }

  const CARGO_PRESETS = [
    {
      name: "Dried Figs (انجیر خشک)",
      description: "AFGHAN DRIED FIGS (ANJEER) - PREMIUM GRADE AAA PACKED IN 10KG CARTONS",
      packages: "1,200 CTNS",
      kgsPerCarton: "10.0",
      grossPerCarton: "10.5",
      rate: "4.50",
      cbm: "24.0 CBM",
    },
    {
      name: "Green Raisins (کشمش سبز)",
      description: "AFGHAN GREEN RAISINS (KISHMISH) - NATURAL SHADE DRIED PACKED IN 10KG CARTONS",
      packages: "2,000 CTNS",
      kgsPerCarton: "10.0",
      grossPerCarton: "10.4",
      rate: "3.80",
      cbm: "28.0 CBM",
    },
    {
      name: "Mamra Almonds (بادام مامایی)",
      description: "AFGHAN MAMRA ALMONDS (GIRDI BADAM) - VACUUM PACKED IN 20KG SACKS / CARTONS",
      packages: "800 BAGS",
      kgsPerCarton: "20.0",
      grossPerCarton: "20.3",
      rate: "12.00",
      cbm: "20.0 CBM",
    },
    {
      name: "Pomegranate Juice (آب انار)",
      description: "100% PURE NATURAL POMEGRANATE JUICE IN 1L TETRAPAKS / 12 BOTTLES PER CARTON",
      packages: "1,500 CTNS",
      kgsPerCarton: "12.0",
      grossPerCarton: "12.8",
      rate: "2.20",
      cbm: "22.5 CBM",
    },
    {
      name: "Textiles / Fabrics (پارچه)",
      description: "SYNTHETIC & COTTON WOVEN FABRIC ROLLS IN HEAVY POLYETHYLENE WRAPPING",
      packages: "450 ROLLS",
      kgsPerCarton: "45.0",
      grossPerCarton: "46.0",
      rate: "5.50",
      cbm: "35.0 CBM",
    },
    {
      name: "General Transit Goods (کالای عمومی)",
      description: "COMMERCIAL GENERAL CARGO AS PER ATTACHED INVOICE & PACKING LIST",
      packages: "1,000 CTNS",
      kgsPerCarton: "15.0",
      grossPerCarton: "15.5",
      rate: "1.80",
      cbm: "25.0 CBM",
    },
  ]

  const handleSwapShipperConsignee = () => {
    setFormData((prev) => ({
      ...prev,
      shipper_name: prev.consignee_name,
      shipper_address: prev.consignee_address,
      shipper_contact: prev.consignee_contact,
      shipper_email: prev.consignee_email,
      consignee_name: prev.shipper_name,
      consignee_address: prev.shipper_address,
      consignee_contact: prev.shipper_contact,
      consignee_email: prev.shipper_email,
    }))
    toast.success("Swapped Shipper ⇄ Consignee details!")
  }

  const handleCopyShipperToNotify = () => {
    setFormData((prev) => ({
      ...prev,
      notify_party: prev.shipper_name,
      notify_party_address: [prev.shipper_address, prev.shipper_contact, prev.shipper_email].filter(Boolean).join(", "),
    }))
    toast.success("Copied Shipper to Notify Party!")
  }

  const handleCopyConsigneeToNotify = () => {
    setFormData((prev) => ({
      ...prev,
      notify_party: prev.consignee_name,
      notify_party_address: [prev.consignee_address, prev.consignee_contact, prev.consignee_email].filter(Boolean).join(", "),
    }))
    toast.success("Copied Consignee to Notify Party!")
  }

  const handleAutoCalculateWeights = () => {
    const calc = calculateMultiCargo(
      formData.number_of_packages || "",
      formData.kgs_per_carton || "",
      formData.gross_weight_per_carton || "",
      formData.rate_per_kgs || ""
    )

    if (calc.totalPackages <= 0) {
      toast.error("Enter the number of packages first", {
        description: "Add one or more carton/package quantities before calculating totals.",
      })
      return
    }

    const hasCartonWeight = calc.items.some((item) => item.netPerCarton > 0 || item.grossPerCarton > 0)
    if (!hasCartonWeight) {
      toast.error("Enter a carton weight first", {
        description: "Add net or gross weight per carton to calculate shipment totals.",
      })
      return
    }

    setFormData((prev) => ({
      ...prev,
      net_weight: calc.formattedNetWeight || prev.net_weight,
      gross_weight: calc.formattedGrossWeight || prev.gross_weight,
      goods_value: calc.formattedGoodsValue || prev.goods_value,
    }))

    if (calc.isMultiItem) {
      toast.success(`Calculated ${calc.items.length} Cargo Items!`, {
        description: `Net: ${calc.formattedNetWeight} | Gross: ${calc.formattedGrossWeight} | Val: ${calc.formattedGoodsValue}`,
      })
    } else {
      toast.success("Weights & Goods Value Recalculated!", {
        description: `Net: ${calc.formattedNetWeight || "N/A"} | Gross: ${calc.formattedGrossWeight || "N/A"} | Value: ${calc.formattedGoodsValue || "N/A"}`,
      })
    }
  }

  const handleApplyCargoPreset = (preset: (typeof CARGO_PRESETS)[number]) => {
    const packageCount = parseNumericValue(preset.packages)
    const kgs = parseNumericValue(preset.kgsPerCarton)
    const gross = parseNumericValue(preset.grossPerCarton)
    const rate = parseNumericValue(preset.rate)

    const netCalc = packageCount && kgs ? `${formatWeightValue(packageCount * kgs)} KG` : ""
    const grossCalc = packageCount && gross ? `${formatWeightValue(packageCount * gross)} KG` : ""
    const valCalc = rate && packageCount && kgs ? formatUsdValue(rate * packageCount * kgs) : ""

    setFormData((prev) => ({
      ...prev,
      cargo_description: preset.description,
      number_of_packages: preset.packages,
      kgs_per_carton: preset.kgsPerCarton,
      gross_weight_per_carton: preset.grossPerCarton,
      rate_per_kgs: preset.rate,
      net_weight: netCalc || prev.net_weight,
      gross_weight: grossCalc || prev.gross_weight,
      goods_value: valCalc || prev.goods_value,
      measurement: preset.cbm || prev.measurement,
    }))

    toast.success(`Applied Preset: ${preset.name}`, {
      description: "Updated description, packages, weights and rate values.",
    })
  }

  const handleCargoFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value }

      if (
        fieldName === "number_of_packages" ||
        fieldName === "kgs_per_carton" ||
        fieldName === "gross_weight_per_carton" ||
        fieldName === "rate_per_kgs"
      ) {
        const calc = calculateMultiCargo(
          updated.number_of_packages || "",
          updated.kgs_per_carton || "",
          updated.gross_weight_per_carton || "",
          updated.rate_per_kgs || ""
        )

        if (calc.formattedNetWeight) updated.net_weight = calc.formattedNetWeight
        if (calc.formattedGrossWeight) updated.gross_weight = calc.formattedGrossWeight
        if (calc.formattedGoodsValue) updated.goods_value = calc.formattedGoodsValue
      }

      return updated
    })
  }

  const insertCargoTagSnippet = (tagText: string) => {
    setFormData((prev) => {
      const current = (prev.cargo_description || "").trim()
      const newDesc = current ? `${current}\n${tagText}` : tagText
      return { ...prev, cargo_description: newDesc }
    })
    toast.success("Added cargo tag", { description: tagText.slice(0, 35) })
  }

  const clearCargoDescription = () => {
    setFormData((prev) => ({ ...prev, cargo_description: "" }))
    toast.info("Cargo description cleared", { description: "شرح کالا پاک شد" })
  }

  const clearAllCargoFields = () => {
    setFormData((prev) => ({
      ...prev,
      container_numbers: "",
      seal_numbers: "",
      number_of_packages: "",
      kgs_per_carton: "",
      gross_weight_per_carton: "",
      rate_per_kgs: "",
      goods_value: "",
      net_weight: "",
      gross_weight: "",
      measurement: "",
      cargo_description: "",
    }))
    toast.info("All cargo fields cleared", { description: "تمامی مشخصات کالا پاک شد" })
  }

  const NOTE_THEME_BUTTON_CLASSES: Record<string, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    gray: 'bg-slate-500',
  }

  // Get theme styles for notes
  const getNoteThemeStyles = (theme: NoteTheme = 'red') => {
    const themes = {
      red: {
        container: 'bg-linear-to-br from-red-50/90 via-white to-red-50/40 border-red-200/80 shadow-red-100/50',
        label: 'text-red-800',
        input: 'border-red-200 bg-white/80 focus:border-red-500 focus:ring-2 focus:ring-red-400/20 text-red-950 font-bold',
        textarea: 'border-red-200/80 focus:border-red-500 focus:ring-2 focus:ring-red-400/20 bg-white/90 text-slate-900',
      },
      blue: {
        container: 'bg-linear-to-br from-blue-50/90 via-white to-blue-50/40 border-blue-200/80 shadow-blue-100/50',
        label: 'text-blue-800',
        input: 'border-blue-200 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 text-blue-950 font-bold',
        textarea: 'border-blue-200/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 bg-white/90 text-slate-900',
      },
      green: {
        container: 'bg-linear-to-br from-emerald-50/90 via-white to-emerald-50/40 border-emerald-200/80 shadow-emerald-100/50',
        label: 'text-emerald-800',
        input: 'border-emerald-200 bg-white/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 text-emerald-950 font-bold',
        textarea: 'border-emerald-200/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 bg-white/90 text-slate-900',
      },
      orange: {
        container: 'bg-linear-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-200/80 shadow-amber-100/50',
        label: 'text-amber-800',
        input: 'border-amber-200 bg-white/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 text-amber-950 font-bold',
        textarea: 'border-amber-200/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 bg-white/90 text-slate-900',
      },
      purple: {
        container: 'bg-linear-to-br from-purple-50/90 via-white to-purple-50/40 border-purple-200/80 shadow-purple-100/50',
        label: 'text-purple-800',
        input: 'border-purple-200 bg-white/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 text-purple-950 font-bold',
        textarea: 'border-purple-200/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 bg-white/90 text-slate-900',
      },
      gray: {
        container: 'bg-linear-to-br from-slate-50/90 via-white to-slate-50/40 border-slate-200/80 shadow-slate-100/50',
        label: 'text-slate-800',
        input: 'border-slate-200 bg-white/80 focus:border-slate-500 focus:ring-2 focus:ring-slate-400/20 text-slate-950 font-bold',
        textarea: 'border-slate-200/80 focus:border-slate-500 focus:ring-2 focus:ring-slate-400/20 bg-white/90 text-slate-900',
      },
    }
    return themes[theme] || themes.red
  }

  const handleDateChange = (gregorianDate: string) => {
    setIssueDate(gregorianDate)
    const dualDates = getDualDates(gregorianDate)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(gregorianDate) ?? dualDates.persianNumeric)
    }
  }

  const handleSetToday = () => {
    const today = new Date().toISOString().split("T")[0]
    handleDateChange(today)
    toast.success("Date set to Today / تاریخ امروز تنظیم شد")
  }

  const handleSetYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split("T")[0]
    handleDateChange(yesterday)
    toast.info("Date set to Yesterday / تاریخ دیروز تنظیم شد")
  }

  const handleCopyBolNumber = async () => {
    if (!bolNumber) return
    try {
      await navigator.clipboard.writeText(bolNumber)
      toast.success("BOL # copied to clipboard!", { description: bolNumber })
    } catch {
      toast.info(bolNumber)
    }
  }

  const handleIncrementBolNumber = () => {
    if (!bolNumber) {
      setBolNumber("BOL-2026-NSA501")
      return
    }
    const match = bolNumber.match(/^(.*?)(\d+)$/)
    if (match) {
      const prefix = match[1]
      const num = parseInt(match[2], 10) + 1
      const paddedNum = String(num).padStart(match[2].length, "0")
      const nextBol = `${prefix}${paddedNum}`
      setBolNumber(nextBol)
      toast.success("Next BOL # Generated", { description: nextBol })
    } else {
      const nextBol = `${bolNumber}-1`
      setBolNumber(nextBol)
      toast.success("Next BOL # Generated", { description: nextBol })
    }
  }

  const handleClearNote1 = () => {
    setFormData((prev) => ({ ...prev, notes_1: "" }))
    toast.info("Note 1 cleared")
  }

  const handleClearNote2 = () => {
    setFormData((prev) => ({ ...prev, notes_2: "" }))
    toast.info("Note 2 cleared")
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      if (!rawDataUrl) return

      // Create an image to optimize dimensions for high-DPI A4 print while keeping storage compact
      const img = new Image()
      img.onload = () => {
        const maxDim = 800
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, width, height)
          const optimizedDataUrl = canvas.toDataURL("image/png", 0.95)
          setLogoUrl(optimizedDataUrl)
          persistCompanySettings({ logoUrl: optimizedDataUrl })
          toast.success("Company logo uploaded and saved to settings!")
        } else {
          setLogoUrl(rawDataUrl)
          persistCompanySettings({ logoUrl: rawDataUrl })
          toast.success("Company logo uploaded and saved to settings!")
        }
      }
      img.onerror = () => {
        setLogoUrl(rawDataUrl)
        persistCompanySettings({ logoUrl: rawDataUrl })
        toast.success("Company logo uploaded and saved to settings!")
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  const resetLogo = () => {
    const defaultLogo = "/images/logo.png"
    setLogoUrl(defaultLogo)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
    persistCompanySettings({ logoUrl: defaultLogo })
    toast.success("Company logo reset to default.")
  }

  const toggleAfghanistanDocument = (docId: string) => {
    setFormData((prev) => {
      const docs = prev.afghanistan_documents || []
      if (docs.includes(docId)) {
        const newDetails = { ...prev.afghanistan_document_details }
        delete newDetails[docId]
        return { ...prev, afghanistan_documents: docs.filter((d) => d !== docId), afghanistan_document_details: newDetails }
      }
      return { 
        ...prev, 
        afghanistan_documents: [...docs, docId],
        afghanistan_document_details: {
          ...prev.afghanistan_document_details,
          [docId]: { documentNumber: "", dateIssued: "", issuingAuthority: "" }
        }
      }
    })
  }

  const handleDocumentDetailChange = (docId: string, field: keyof AfghanistanDocumentDetail, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      afghanistan_document_details: {
        ...prev.afghanistan_document_details,
        [docId]: {
          ...(prev.afghanistan_document_details?.[docId] || { documentNumber: "", dateIssued: "", issuingAuthority: "" }),
          [field]: value
        }
      }
    }))
  }

  const handleRouteChange = (index: number, field: keyof RouteStop, value: any) => {
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      newRoutes[index] = { ...newRoutes[index], [field]: value }
      return { ...prev, routes: newRoutes }
    })
  }

  const applyDogharonToMersinReeferExportPreset = () => {
    const newRoutes = exportCorridorToBillOfLadingRoutes(dogharonToMersinReeferLegs)
    setFormData((prev) => ({
      ...prev,
      routes: newRoutes,
      port_of_loading: "Dogharon / Islam Qala, AF",
      port_of_discharge: "Mersin Port, Turkey",
      place_of_delivery: "Mersin Reefer Terminal, TR",
      container_type: "40RF",
      equipment_type: "40RF",
      temperature_setting: "-18°C Frozen",
      plugging_days: 7,
      escort_service_required: true,
      shipping_cost: "14494.12",
      shipping_cost_currency: "USD",
      driver_rent: "800.00",
      driver_rent_currency: "USD",
      remarks: "❄️ 40RF REEFER EXPORT: Escort Service (مامور بدرقه), Turkey Transit Trucking, 7 Days Plugging Charges, 8% TRF Included.",
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Route 3: Dogharon ➔ Mersin Reefer (40RF)", {
      description: "کانتینر ۴۰ فوت یخچالی با مامور بدرقه، کرایه ترانزیت، ۷ روز هزینه برق و مالیات TRF ($14,494.12)",
    })
  }

  const applyDougharounToMersinExportPreset = () => {
    const newRoutes = exportCorridorToBillOfLadingRoutes(dougharounToMersinLegs)
    setFormData((prev) => ({
      ...prev,
      routes: newRoutes,
      port_of_loading: "Dougharoun / Islam Qala, AF",
      port_of_discharge: "Mersin Port, Turkey",
      place_of_delivery: "Mersin Seaport Terminal, TR",
      shipping_cost: "3100.00",
      shipping_cost_currency: "USD",
      driver_rent: "1200.00",
      driver_rent_currency: "USD",
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Route 1: Dougharoun ➔ Mersin Export Corridor", {
      description: "۵ ایستگاه ترانزیت، اسناد T1، کرایه‌های ترانزیت و THC صادراتی اعمال شد ($3,100)",
    })
  }

  const applyNimrozToBandarAbbasExportPreset = () => {
    const newRoutes = exportCorridorToBillOfLadingRoutes(nimrozToBandarAbbasLegs)
    setFormData((prev) => ({
      ...prev,
      routes: newRoutes,
      port_of_loading: "Nimroz / Milak, AF",
      port_of_discharge: "Bandar Abbas Port, IR",
      place_of_delivery: "Bandar Abbas Terminal, IR",
      shipping_cost: "1550.00",
      shipping_cost_currency: "USD",
      driver_rent: "850.00",
      driver_rent_currency: "USD",
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Route 2: Nimroz ➔ Bandar Abbas Export Corridor", {
      description: "۳ ایستگاه ترانزیت، گمرک صادرات، کرایه لاری جنوب و THC بندرعباس اعمال شد ($1,550)",
    })
  }

  const applyHeratIslamQalaDougharounPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        {
          id: crypto.randomUUID(),
          location: "Herat, AF",
          locationPersian: "هرات، افغانستان",
          stopOrder: 1,
          transportMode: "truck",
        },
        {
          id: crypto.randomUUID(),
          location: "Islam Qala, AF",
          locationPersian: "اسلام قلعه، افغانستان",
          stopOrder: 2,
          transportMode: "truck",
          customsSealRequired: true,
          customsSealNote: "📍 په ګمرک کې سیل غواړي / Customs Seal Required",
        },
        {
          id: crypto.randomUUID(),
          location: "Dougharoun, IR",
          locationPersian: "دوغارون، ایران",
          stopOrder: 3,
          transportMode: "truck",
        },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Truck Route Preset", {
      description: "هرات → اسلام قلعه → دوغارون مسیر اضافه شد",
    })
  }

  const applyKandaharNimrozBandarAbbasDubaiIndiaPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Kandahar, AF", locationPersian: "کندهار، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Nimroz, AF", locationPersian: "نیمروز / میلک", stopOrder: 2, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Bandar Abbas, IR", locationPersian: "بندرعباس، ایران", stopOrder: 3, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Nhava Sheva, IN", locationPersian: "نهاوا شوا، هند", stopOrder: 5, transportMode: "vessel" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Afghanistan-India Sea Route", {
      description: "کندهار → نیمروز → بندرعباس → دبی → نهاوا شوا هند مسیر اضافه شد",
    })
  }

  const applyKandaharChamanKarachiDubaiPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Kandahar, AF", locationPersian: "کندهار، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Chaman, PK", locationPersian: "چمن / کویته پاکستان", stopOrder: 2, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Karachi Port, PK", locationPersian: "بندر کراچی، پاکستان", stopOrder: 3, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, transportMode: "vessel" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Pakistan Transit Route", {
      description: "کندهار → چمن → کراچی → دبی مسیر اضافه شد",
    })
  }

  const applyMazarHairatanTashkentPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Mazar-i-Sharif, AF", locationPersian: "مزار شریف، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Hairatan Border, AF", locationPersian: "حیرتان، افغانستان", stopOrder: 2, transportMode: "train", customsSealRequired: true, customsSealNote: "📍 سیل ګمرک حیرتان" },
        { id: crypto.randomUUID(), location: "Termez, UZ", locationPersian: "ترمذ، ازبکستان", stopOrder: 3, transportMode: "train" },
        { id: crypto.randomUUID(), location: "Tashkent, UZ", locationPersian: "تاشکند، ازبکستان", stopOrder: 4, transportMode: "train" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Uzbekistan Rail Route", {
      description: "مزار شریف → حیرتان → تاشکند مسیر اضافه شد",
    })
  }

  const applyNimrozChabaharIndiaPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Zaranj / Nimroz, AF", locationPersian: "زرنج / نیمروز، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Milak Border, IR", locationPersian: "مرز میلک، ایران", stopOrder: 2, transportMode: "truck", customsSealRequired: true, customsSealNote: "📍 گمرک میلک" },
        { id: crypto.randomUUID(), location: "Chabahar Port, IR", locationPersian: "بندر چابهار، ایران", stopOrder: 3, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Mundra Port, IN", locationPersian: "بندر موندرا، هند", stopOrder: 4, transportMode: "vessel" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Chabahar Port Route", {
      description: "نیمروز → میلک → چابهار → موندرا هند مسیر اضافه شد",
    })
  }

  const applyKabulDubaiAirPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Kabul Airport (KBL), AF", locationPersian: "میدان هوایی کابل، افغانستان", stopOrder: 1, transportMode: "airplane" },
        { id: crypto.randomUUID(), location: "Dubai Airport (DXB), AE", locationPersian: "میدان هوایی دبی، امارات", stopOrder: 2, transportMode: "airplane" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Air Cargo Route", {
      description: "کابل → دبی مسیر هوایی اضافه شد",
    })
  }

  const openSaveRouteModal = () => {
    if (!formData.routes || formData.routes.length === 0) {
      toast.error("No Route Stops", { description: "لطفاً ابتدا حداقل یک توقفگاه در مسیر اضافه کنید" })
      return
    }
    const firstStop = formData.routes[0]?.location || formData.routes[0]?.locationPersian || "Origin"
    const lastStop = formData.routes[formData.routes.length - 1]?.location || formData.routes[formData.routes.length - 1]?.locationPersian || "Destination"
    const suggestedTitle = formData.routes.length === 1 ? firstStop : `${firstStop} ➡️ ${lastStop}`
    setNewPresetTitle(suggestedTitle)
    setIsSaveRouteModalOpen(true)
  }

  const handleSaveRoutePreset = () => {
    if (!newPresetTitle.trim()) {
      toast.error("Preset Name Required", { description: "لطفاً نامی برای پیش‌فرض مسیر وارد کنید" })
      return
    }

    const newPreset: SavedRoutePreset = {
      id: crypto.randomUUID(),
      title: newPresetTitle.trim(),
      icon: newPresetIcon || "🗺️",
      routes: JSON.parse(JSON.stringify(formData.routes)),
      savedAt: new Date().toISOString(),
    }

    const updated = [newPreset, ...savedRoutePresets]
    setSavedRoutePresets(updated)
    try {
      window.localStorage.setItem(SAVED_ROUTE_PRESETS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Error saving route preset to localStorage:", e)
    }

    setIsSaveRouteModalOpen(false)
    toast.success("Route Saved to Quick Presets! ⭐", {
      description: `مسیر «${newPreset.title}» با موفقیت در پیش‌فرض‌های سریع ذخیره شد`,
    })
  }

  const handleDeleteRoutePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = savedRoutePresets.filter((p) => p.id !== presetId)
    setSavedRoutePresets(updated)
    try {
      window.localStorage.setItem(SAVED_ROUTE_PRESETS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Error deleting route preset from localStorage:", e)
    }
    toast.success("Route Preset Deleted", {
      description: "پیش‌فرض مسیر با موفقیت حذف شد",
    })
  }

  const applyCustomRoutePreset = (preset: SavedRoutePreset) => {
    const clonedRoutes: RouteStop[] = preset.routes.map((r, i) => ({
      ...r,
      id: crypto.randomUUID(),
      stopOrder: i + 1,
    }))
    setFormData((prev) => ({
      ...prev,
      routes: clonedRoutes,
    }))
    setActiveRouteIndex(0)
    toast.success(`Applied Route: ${preset.title}`, {
      description: `مسیر «${preset.title}» (${clonedRoutes.length} توقفگاه) با موفقیت اعمال شد`,
    })
  }

  const moveRouteStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= formData.routes.length) return
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      const temp = newRoutes[index]
      newRoutes[index] = newRoutes[targetIndex]
      newRoutes[targetIndex] = temp
      return {
        ...prev,
        routes: newRoutes.map((r, i) => ({ ...r, stopOrder: i + 1 })),
      }
    })
    setActiveRouteIndex(targetIndex)
  }

  const duplicateRouteStop = (index: number) => {
    setFormData((prev) => {
      const currentStop = prev.routes[index]
      const newStop: RouteStop = {
        ...currentStop,
        id: crypto.randomUUID(),
        stopOrder: index + 2,
      }
      const newRoutes = [...prev.routes]
      newRoutes.splice(index + 1, 0, newStop)
      return {
        ...prev,
        routes: newRoutes.map((r, i) => ({ ...r, stopOrder: i + 1 })),
      }
    })
    setActiveRouteIndex(index + 1)
    toast.success("Stop Duplicated", { description: "توقفگاه کپی شد" })
  }

  const reverseRoutes = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [...prev.routes].reverse().map((r, i) => ({ ...r, stopOrder: i + 1 })),
    }))
    setActiveRouteIndex(0)
    toast.success("Route Pathway Reversed", { description: "مسیر ترانزیت برعکس شد" })
  }

  const syncRoutesWithBOLPorts = () => {
    if (formData.routes.length < 2) return
    const firstStop = formData.routes[0]
    const lastStop = formData.routes[formData.routes.length - 1]
    
    setFormData((prev) => ({
      ...prev,
      port_of_loading: firstStop.location || prev.port_of_loading,
      port_of_discharge: lastStop.location || prev.port_of_discharge,
      place_of_delivery: lastStop.location || prev.place_of_delivery,
    }))
    toast.success("Synchronized with B/L Ports", {
      description: `بارگیری: ${firstStop.location || "N/A"} | تخلیه: ${lastStop.location || "N/A"}`,
    })
  }

  const addRouteStop = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: crypto.randomUUID(),
          location: "",
          locationPersian: "",
          stopOrder: prev.routes.length + 1,
        },
      ],
    }))
    setActiveRouteIndex(formData.routes.length)
  }

  const removeRouteStop = (index: number) => {
    if (!formData.routes[index]) return
    const remainingStops = formData.routes.length - 1
    setFormData((prev) => ({
      ...prev,
      routes: prev.routes
        .filter((_, i) => i !== index)
        .map((route, routeIndex) => ({ ...route, stopOrder: routeIndex + 1 })),
    }))
    if (remainingStops === 0) {
      setActiveRouteIndex(null)
      setShowLocationDropdown(null)
    } else if (activeRouteIndex === index) {
      setActiveRouteIndex(Math.max(0, index - 1))
    }
  }

  const getTransportIcon = (mode?: string) => {
    const base = "inline-flex items-center justify-center rounded-md p-1.5"
    switch (mode) {
      case "truck":
        return (
          <span className={`${base} bg-blue-50 text-blue-600`}>
            <Truck className="h-6 w-6" />
          </span>
        )
      case "vessel":
        return (
          <span className={`${base} bg-cyan-50 text-cyan-600`}>
            <Ship className="h-6 w-6" />
          </span>
        )
      case "airplane":
        return (
          <span className={`${base} bg-sky-50 text-sky-600`}>
            <Plane className="h-6 w-6" />
          </span>
        )
      case "train":
        return (
          <span className={`${base} bg-orange-50 text-orange-600`}>
            <Train className="h-6 w-6" />
          </span>
        )
      case "road":
        return (
          <span className={`${base} bg-amber-50 text-amber-600`}>
            <Car className="h-6 w-6" />
          </span>
        )
      default:
        return (
          <span className={`${base} bg-gray-50 text-gray-500`}>
            <MapPin className="h-6 w-6" />
          </span>
        )
    }
  }

  const getTransportLabel = (mode?: string) => {
    switch (mode) {
      case "truck":
        return "Truck / تراک"
      case "vessel":
        return "Vessel / کشتی"
      case "airplane":
        return "Airplane / هواپیما"
      case "train":
        return "Train / قطار"
      case "road":
        return "Road / جاده"
      default:
        return "Select Mode / حالت انتخاب کنید"
    }
  }

  const getRouteStopLabel = (index: number, total: number) => {
    if (index === 0) return "Origin"
    if (index === total - 1) return "Destination"
    return `Stop ${index}`
  }

  const getRouteStopLabelPersian = (index: number, total: number) => {
    if (index === 0) return "مبدا"
    if (index === total - 1) return "مقصد"
    return "توقف"
  }

  const getTransportDetails = (mode?: string) => {
    const details: Record<string, { duration: string; capacity: string; cost: string; notes: string; durationPersian: string; capacityPersian: string; costPersian: string; notesPersian: string }> = {
      truck: {
        duration: "1-3 Days",
        capacity: "20-25 Tons",
        cost: "Low-Medium",
        notes: "Direct, flexible timing",
        durationPersian: "1-3 روز",
        capacityPersian: "20-25 تن",
        costPersian: "پایین-متوسط",
        notesPersian: "مستقیم، زمان بندی انعطاف پذیر"
      },
      vessel: {
        duration: "7-14 Days",
        capacity: "1000+ Tons",
        cost: "Low (Bulk)",
        notes: "Cost-effective for large shipments",
        durationPersian: "7-14 روز",
        capacityPersian: "1000+ تن",
        costPersian: "پایین (بزرگ)",
        notesPersian: "صرفه‌جویی برای حمل‌ونقل بزرگ"
      },
      airplane: {
        duration: "1-2 Days",
        capacity: "50-100 Tons",
        cost: "High",
        notes: "Fastest, premium rates",
        durationPersian: "1-2 روز",
        capacityPersian: "50-100 تن",
        costPersian: "بالا",
        notesPersian: "سریع‌ترین، نرخ بالا"
      },
      train: {
        duration: "3-7 Days",
        capacity: "500+ Tons",
        cost: "Medium",
        notes: "Reliable on established routes",
        durationPersian: "3-7 روز",
        capacityPersian: "500+ تن",
        costPersian: "متوسط",
        notesPersian: "قابل اعتماد در مسیرهای منظم"
      },
      road: {
        duration: "2-5 Days",
        capacity: "15-20 Tons",
        cost: "Medium",
        notes: "Direct delivery by road",
        durationPersian: "2-5 روز",
        capacityPersian: "15-20 تن",
        costPersian: "متوسط",
        notesPersian: "تحویل مستقیم از طریق جاده"
      },
    }
    return details[mode || ""] || { 
      duration: "-", 
      capacity: "-", 
      cost: "-", 
      notes: "-",
      durationPersian: "-",
      capacityPersian: "-",
      costPersian: "-",
      notesPersian: "-"
    }
  }

  // Predefined locations for quick selection & Country flag mapping
  const countryFlags: Record<string, string> = {
    "Afghanistan": "🇦🇫",
    "Iran": "🇮🇷",
    "Pakistan": "🇵🇰",
    "UAE": "🇦🇪",
    "Saudi Arabia": "🇸🇦",
    "Qatar": "🇶🇦",
    "Bahrain": "🇧🇭",
    "Oman": "🇴🇲",
    "Kuwait": "🇰🇼",
    "Iraq": "🇮🇶",
    "Jordan": "🇯🇴",
    "Lebanon": "🇱🇧",
    "Turkey": "🇹🇷",
    "Turkmenistan": "🇹🇲",
    "Uzbekistan": "🇺🇿",
    "Tajikistan": "🇹🇯",
    "Kyrgyzstan": "🇰🇬",
    "Kazakhstan": "🇰🇿",
    "India": "🇮🇳",
    "Sri Lanka": "🇱🇰",
    "Bangladesh": "🇧🇩",
    "China": "🇨🇳",
    "Ivory Coast": "🇨🇮",
    "Nigeria": "🇳🇬",
    "Ghana": "🇬🇭",
    "Benin": "🇧🇯",
    "Togo": "🇹🇬",
    "Senegal": "🇸🇳",
    "Kenya": "🇰🇪",
    "Tanzania": "🇹🇿",
    "South Africa": "🇿🇦",
    "Egypt": "🇪🇬",
    "Morocco": "🇲🇦",
    "Sudan": "🇸🇩",
    "Djibouti": "🇩🇯",
    "Singapore": "🇸🇬",
    "Malaysia": "🇲🇾",
    "Vietnam": "🇻🇳",
    "Thailand": "🇹🇭",
    "Indonesia": "🇮🇩",
    "Philippines": "🇵🇭",
    "South Korea": "🇰🇷",
    "Japan": "🇯🇵",
    "Netherlands": "🇳🇱",
    "Belgium": "🇧🇪",
    "Germany": "🇩🇪",
    "Spain": "🇪🇸",
    "Italy": "🇮🇹",
    "Greece": "🇬🇷",
    "United Kingdom": "🇬🇧",
    "France": "🇫🇷",
    "Poland": "🇵🇱",
    "USA": "🇺🇸",
    "Canada": "🇨🇦",
    "Brazil": "🇧🇷",
    "Panama": "🇵🇦",
  }

  const predefinedLocations: Array<{
    name: string
    persian: string
    country: string
    code: string
    locationType?: string
    state?: string
    district?: string
    portType?: string
    borderCountry?: string
    iataCode?: string
    unLocode?: string
    customsCode?: string
    isPort?: boolean
    portName?: string
    isBorder?: boolean
    cargoEnabled?: boolean
    containerEnabled?: boolean
    railConnected?: boolean
    roadConnected?: boolean
    airCargo?: boolean
    seaCargo?: boolean
    inlandWaterway?: boolean
    aliases?: string[] | string
  }> = [
    // 🇨🇮 Ivory Coast & West Africa (Explicit User Preset)
    { name: "Abidjan, Ivory Coast", persian: "ابیدجان، ساحل عاج", country: "Ivory Coast", code: "ABJ", isPort: true, portName: "Abidjan Port" },
    { name: "Abidjan Port, CI", persian: "بندر ابیدجان، ساحل عاج", country: "Ivory Coast", code: "ABJ-PORT", isPort: true, portName: "Abidjan Port" },
    { name: "Ivory Coast, West Africa", persian: "ساحل عاج، غرب آفریقا", country: "Ivory Coast", code: "CIV", isPort: false },
    { name: "San Pedro Port, CI", persian: "بندر سن پدرو، ساحل عاج", country: "Ivory Coast", code: "SPY", isPort: true, portName: "San Pedro Port" },
    { name: "Lagos Port (Apapa), NG", persian: "بندر لاگوس (آپاپا)، نیجریه", country: "Nigeria", code: "LOS", isPort: true, portName: "Lagos Port / Apapa" },
    { name: "Tin Can Island Port, NG", persian: "بندر تین کن، نیجریه", country: "Nigeria", code: "TIN", isPort: true, portName: "Tin Can Island" },
    { name: "Tema Port, GH", persian: "بندر تما، غنا", country: "Ghana", code: "TEM", isPort: true, portName: "Tema Port" },
    { name: "Takoradi Port, GH", persian: "بندر تاکورادی، غنا", country: "Ghana", code: "TKD", isPort: true, portName: "Takoradi Port" },
    { name: "Cotonou Port, BJ", persian: "بندر کوتونو، بنین", country: "Benin", code: "COO", isPort: true, portName: "Cotonou Port" },
    { name: "Lome Port, TG", persian: "بندر لومه، توگو", country: "Togo", code: "LOM", isPort: true, portName: "Lome Port" },
    { name: "Dakar Port, SN", persian: "بندر داکار، سنگال", country: "Senegal", code: "DKR", isPort: true, portName: "Dakar Port" },
    { name: "Mombasa Port, KE", persian: "بندر مومباسا، کنیا", country: "Kenya", code: "MBA", isPort: true, portName: "Mombasa Port" },
    { name: "Dar es Salaam Port, TZ", persian: "بندر دارالسلام، تانزانیا", country: "Tanzania", code: "DAR", isPort: true, portName: "Dar es Salaam Port" },
    { name: "Durban Port, ZA", persian: "بندر دوربان، آفریقای جنوبی", country: "South Africa", code: "DUR", isPort: true, portName: "Durban Port" },
    { name: "Cape Town Port, ZA", persian: "بندر کیپ‌تاون، آفریقای جنوبی", country: "South Africa", code: "CPT", isPort: true, portName: "Cape Town Port" },
    { name: "Port Said, EG", persian: "پورت سعید، مصر", country: "Egypt", code: "PSD", isPort: true, portName: "Port Said" },
    { name: "Alexandria Port, EG", persian: "بندر اسکندریه، مصر", country: "Egypt", code: "ALY", isPort: true, portName: "Alexandria Port" },
    { name: "Damietta Port, EG", persian: "بندر دمیاط، مصر", country: "Egypt", code: "DAM", isPort: true, portName: "Damietta Port" },
    { name: "Casablanca Port, MA", persian: "بندر کازابلانکا، مراکش", country: "Morocco", code: "CAS", isPort: true, portName: "Casablanca Port" },
    { name: "Tanger Med Port, MA", persian: "بندر طنجه مد، مراکش", country: "Morocco", code: "TNG", isPort: true, portName: "Tanger Med Port" },
    { name: "Djibouti Port, DJ", persian: "بندر جیبوتی", country: "Djibouti", code: "JIB", isPort: true, portName: "Djibouti Port" },
    { name: "Port Sudan, SD", persian: "پورت سودان", country: "Sudan", code: "PZU", isPort: true, portName: "Port Sudan" },

    // 🇦🇫 Afghanistan — Major Cities & Commercial Transport Hubs
    { name: "Kabul, AF", persian: "کابل، افغانستان", country: "Afghanistan", code: "KBL" },
    { name: "Kandahar, AF", persian: "کندهار، افغانستان", country: "Afghanistan", code: "KDH" },
    { name: "Herat, AF", persian: "هرات، افغانستان", country: "Afghanistan", code: "HRA" },
    { name: "Mazar-e Sharif, AF", persian: "مزارشریف، افغانستان", country: "Afghanistan", code: "MAZ" },
    { name: "Jalalabad, AF", persian: "جلال‌آباد، افغانستان", country: "Afghanistan", code: "JBD" },
    { name: "Kunduz, AF", persian: "کندوز، افغانستان", country: "Afghanistan", code: "KDZ" },
    { name: "Ghazni, AF", persian: "غزنی، افغانستان", country: "Afghanistan", code: "GHZ" },
    { name: "Baghlan, AF", persian: "بغلان، افغانستان", country: "Afghanistan", code: "BGH" },
    { name: "Nimroz, AF", persian: "نیمروز، افغانستان", country: "Afghanistan", code: "NMZ" },
    { name: "Logar, AF", persian: "لوگر، افغانستان", country: "Afghanistan", code: "LOG" },
    { name: "Paktia, AF", persian: "پکتیا، افغانستان", country: "Afghanistan", code: "PKT" },
    { name: "Nangarhar, AF", persian: "ننگرهار، افغانستان", country: "Afghanistan", code: "NGR" },
    { name: "Bamyan, AF", persian: "بامیان، افغانستان", country: "Afghanistan", code: "BAM" },
    { name: "Faizabad, AF", persian: "فیض‌آباد، افغانستان", country: "Afghanistan", code: "FAZ" },

    // 🇦🇫 Afghanistan — International Airports (Air Cargo)
    { name: "Kabul — Hamid Karzai Intl Airport (KBL / OAKB), AF", persian: "میدان هوایی بین‌المللی کابل (حامد کرزی)، افغانستان", country: "Afghanistan", code: "KBL", locationType: "AIRPORT_INTERNATIONAL", iataCode: "KBL", airCargo: true, cargoEnabled: true, aliases: "Kabul Airport, KBL, OAKB, میدان هوایی کابل" },
    { name: "Kandahar — Ahmad Shah Baba Intl Airport (KDH / OAKN), AF", persian: "میدان هوایی بین‌المللی کندهار (احمد شاه بابا)، افغانستان", country: "Afghanistan", code: "KDH", locationType: "AIRPORT_INTERNATIONAL", iataCode: "KDH", airCargo: true, cargoEnabled: true, aliases: "Kandahar Airport, KDH, OAKN, میدان هوایی کندهار" },
    { name: "Mazar-i-Sharif — Maulana Jalaluddin Balkhi Intl Airport (MZR / OAMS), AF", persian: "میدان هوایی بین‌المللی مزارشریف (مولانا جلال‌الدین بلخی)، افغانستان", country: "Afghanistan", code: "MZR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "MZR", airCargo: true, aliases: "Mazar Airport, MZR, OAMS, میدان هوایی مزارشریف" },
    { name: "Herat — Khwaja Abdullah Ansari Intl Airport (HEA / OAHR), AF", persian: "میدان هوایی بین‌المللی هرات (خواجه عبدالله انصاری)، افغانستان", country: "Afghanistan", code: "HEA", locationType: "AIRPORT_INTERNATIONAL", iataCode: "HEA", airCargo: true, aliases: "Herat Airport, HEA, OAHR, میدان هوایی هرات" },

    // 🇦🇫 Afghanistan — Official Border & Customs Crossings (Cross-Border Transit)
    { name: "Hairatan, AF", persian: "حیرتان، افغانستان", country: "Afghanistan", code: "HRT", isBorder: true, borderCountry: "Uzbekistan" },
    { name: "Sher Khan Bandar, AF", persian: "شیرخان بندر، افغانستان", country: "Afghanistan", code: "SKB", isBorder: true, borderCountry: "Tajikistan" },
    { name: "Aqina, AF", persian: "آقینه، افغانستان", country: "Afghanistan", code: "AQI", isBorder: true, borderCountry: "Turkmenistan" },
    { name: "Torghundi, AF", persian: "تورغندی، افغانستان", country: "Afghanistan", code: "TRG", isBorder: true, borderCountry: "Turkmenistan" },
    { name: "Islam Qala, AF", persian: "اسلام قلعه، افغانستان", country: "Afghanistan", code: "ISQ", isBorder: true, borderCountry: "Iran" },
    { name: "Abu Nasr Farahi, AF", persian: "ابونصر فراهی، افغانستان", country: "Afghanistan", code: "ANF", isBorder: true, borderCountry: "Iran" },
    { name: "Zaranj, AF", persian: "زرنج، افغانستان", country: "Afghanistan", code: "ZRJ", isBorder: true, borderCountry: "Iran" },
    { name: "Milak, AF", persian: "میلک، افغانستان", country: "Afghanistan", code: "MLK", isBorder: true, borderCountry: "Iran" },
    { name: "Mahiroud, AF", persian: "ماهیرود، افغانستان", country: "Afghanistan", code: "MAH", isBorder: true, borderCountry: "Iran" },
    { name: "Torkham, AF", persian: "تورخم، افغانستان", country: "Afghanistan", code: "THM", isBorder: true, borderCountry: "Pakistan" },
    { name: "Spin Boldak, AF", persian: "سپین بولدک، افغانستان", country: "Afghanistan", code: "SPB", isBorder: true, borderCountry: "Pakistan" },
    { name: "Ghulam Khan, AF", persian: "غلام خان، افغانستان", country: "Afghanistan", code: "GLK", isBorder: true, borderCountry: "Pakistan" },
    { name: "Dand Patan, AF", persian: "ډنډ پټان، افغانستان", country: "Afghanistan", code: "DPT", isBorder: true, borderCountry: "Pakistan" },
    { name: "Angur Ada, AF", persian: "انګور اډه، افغانستان", country: "Afghanistan", code: "AAD", isBorder: true, borderCountry: "Pakistan" },
    { name: "Kharlachi, AF", persian: "خرلاچي، افغانستان", country: "Afghanistan", code: "KHL", isBorder: true, borderCountry: "Pakistan" },
    { name: "Bahramcha, AF", persian: "بهرامچه، افغانستان", country: "Afghanistan", code: "BRC", isBorder: true, borderCountry: "Pakistan" },
    { name: "Taptan, AF", persian: "تپتن، افغانستان", country: "Afghanistan", code: "TAP", isBorder: true, borderCountry: "Pakistan" },
    { name: "Ishkashim, AF", persian: "اشکاشم، افغانستان", country: "Afghanistan", code: "ISH", isBorder: true, borderCountry: "Tajikistan" },
    { name: "Ai-Khanoum, AF", persian: "آیخانم، افغانستان", country: "Afghanistan", code: "AIK", isBorder: true, borderCountry: "Tajikistan" },
    
    // Iran - Ports & Major Cities
    { name: "Bandar Abbas, IR", persian: "بندرعباس، ایران", country: "Iran", code: "BND", isPort: true, portName: "Bandar Abbas (Shahid Rajaee)" },
    { name: "Chabahar, IR", persian: "چابهار، ایران", country: "Iran", code: "CHA", isPort: true, portName: "Chabahar Port (Shahid Beheshti)" },
    { name: "Bandar Imam Khomeini, IR", persian: "بندر امام خمینی، ایران", country: "Iran", code: "BIK", isPort: true, portName: "Bandar Imam Khomeini (BIK)" },
    { name: "Bushehr, IR", persian: "بوشهر، ایران", country: "Iran", code: "BSH", isPort: true, portName: "Bushehr Port" },
    { name: "Khorramshahr, IR", persian: "خرمشهر، ایران", country: "Iran", code: "KHR", isPort: true, portName: "Khorramshahr Port" },
    { name: "Bandar Lenguh, IR", persian: "بندر لنگه، ایران", country: "Iran", code: "BLG", isPort: true, portName: "Bandar Lengeh" },
    { name: "Bandar Anzali, IR", persian: "بندر انزلی، ایران", country: "Iran", code: "ANZ", isPort: true, portName: "Bandar Anzali" },
    { name: "Dougharoun, IR", persian: "دوغارون، ایران", country: "Iran", code: "DGH" },
    { name: "Tehran, IR", persian: "تهران، ایران", country: "Iran", code: "TEH" },
    { name: "Mashhad, IR", persian: "مشهد، ایران", country: "Iran", code: "MSH" },
    { name: "Zahedan, IR", persian: "زاهدان، ایران", country: "Iran", code: "ZAH" },
    { name: "Kerman, IR", persian: "کرمان، ایران", country: "Iran", code: "KRM" },
    { name: "Isfahan, IR", persian: "اصفهان، ایران", country: "Iran", code: "ISF" },
    { name: "Tabriz, IR", persian: "تبریز، ایران", country: "Iran", code: "TBZ" },
    { name: "Rasht, IR", persian: "رشت، ایران", country: "Iran", code: "RSH" },
    { name: "Qom, IR", persian: "قم، ایران", country: "Iran", code: "QOM" },
    { name: "Ahvaz, IR", persian: "اهواز، ایران", country: "Iran", code: "AHZ" },
    { name: "Shiraz, IR", persian: "شیراز، ایران", country: "Iran", code: "SHZ" },
    { name: "Abadan, IR", persian: "آبادان، ایران", country: "Iran", code: "ABD" },
    { name: "Birjand, IR", persian: "بیرجند، ایران", country: "Iran", code: "BRJ" },

    // 🇮🇷 Iran — International Airports (Air Cargo)
    { name: "Tehran — Imam Khomeini Intl Airport (IKA / OIIE), IR", persian: "فرودگاه بین‌المللی امام خمینی تهران (هاب بار هوایی)، ایران", country: "Iran", code: "IKA", locationType: "AIRPORT_INTERNATIONAL", iataCode: "IKA", airCargo: true, cargoEnabled: true, aliases: "Tehran Airport, IKA, OIIE, فرودگاه امام خمینی" },
    { name: "Tehran — Mehrabad Intl Airport (THR / OIII), IR", persian: "فرودگاه بین‌المللی مهرآباد تهران، ایران", country: "Iran", code: "THR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "THR", airCargo: true, aliases: "Mehrabad Airport, THR, OIII, فرودگاه مهرآباد" },
    { name: "Mashhad — Shahid Hasheminejad Intl Airport (MHD / OIMM), IR", persian: "فرودگاه بین‌المللی مشهد (شهید هاشمی‌نژاد)، ایران", country: "Iran", code: "MHD", locationType: "AIRPORT_INTERNATIONAL", iataCode: "MHD", airCargo: true, aliases: "Mashhad Airport, MHD, فرودگاه مشهد" },
    { name: "Shiraz — Shahid Dastghaib Intl Airport (SYZ / OISS), IR", persian: "فرودگاه بین‌المللی شیراز، ایران", country: "Iran", code: "SYZ", locationType: "AIRPORT_INTERNATIONAL", iataCode: "SYZ", airCargo: true, aliases: "Shiraz Airport, SYZ, فرودگاه شیراز" },
    { name: "Isfahan — Shahid Beheshti Intl Airport (IFN / OIFM), IR", persian: "فرودگاه بین‌المللی اصفهان، ایران", country: "Iran", code: "IFN", locationType: "AIRPORT_INTERNATIONAL", iataCode: "IFN", airCargo: true, aliases: "Isfahan Airport, IFN" },
    { name: "Bandar Abbas International Airport (BND / OIKB), IR", persian: "فرودگاه بین‌المللی بندرعباس، ایران", country: "Iran", code: "BND-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "BND", airCargo: true, aliases: "Bandar Abbas Airport, BND" },
    
    // Pakistan - Major Cities & Ports
    { name: "Karachi, PK", persian: "کراچی، پاکستان", country: "Pakistan", code: "KRC", isPort: true, portName: "Karachi Port (KPT)" },
    { name: "Port Qasim, PK", persian: "بندر قاسم، پاکستان", country: "Pakistan", code: "PQS", isPort: true, portName: "Port Muhammad Bin Qasim" },
    { name: "Gwadar, PK", persian: "گوادر، پاکستان", country: "Pakistan", code: "GWD", isPort: true, portName: "Gwadar Deep Sea Port" },
    { name: "Peshawar, PK", persian: "پشاور، پاکستان", country: "Pakistan", code: "PSH" },
    { name: "Islamabad, PK", persian: "اسلام‌آباد، پاکستان", country: "Pakistan", code: "ISB" },
    { name: "Lahore, PK", persian: "لاهور، پاکستان", country: "Pakistan", code: "LHR" },
    { name: "Quetta, PK", persian: "کویتہ، پاکستان", country: "Pakistan", code: "QTA" },
    { name: "Torkham, PK", persian: "تورخم، پاکستان", country: "Pakistan", code: "TRK" },
    { name: "Chaman, PK", persian: "چمن، پاکستان", country: "Pakistan", code: "CHM" },
    { name: "Multan, PK", persian: "ملتان، پاکستان", country: "Pakistan", code: "MLT" },
    { name: "Faisalabad, PK", persian: "فیصل‌آباد، پاکستان", country: "Pakistan", code: "FSB" },

    // 🇵🇰 Pakistan — International Airports (Air Cargo)
    { name: "Karachi — Jinnah Intl Airport (KHI / OPKC), PK", persian: "میدان هوایی بین‌المللی جناح کراچی، پاکستان", country: "Pakistan", code: "KHI", locationType: "AIRPORT_INTERNATIONAL", iataCode: "KHI", airCargo: true, cargoEnabled: true, aliases: "Karachi Airport, KHI, OPKC" },
    { name: "Islamabad International Airport (ISB / OPIS), PK", persian: "میدان هوایی بین‌المللی اسلام‌آباد، پاکستان", country: "Pakistan", code: "ISB-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "ISB", airCargo: true, cargoEnabled: true, aliases: "Islamabad Airport, ISB" },
    { name: "Lahore — Allama Iqbal Intl Airport (LHE / OPLA), PK", persian: "میدان هوایی بین‌المللی علامه اقبال لاهور، پاکستان", country: "Pakistan", code: "LHE", locationType: "AIRPORT_INTERNATIONAL", iataCode: "LHE", airCargo: true, cargoEnabled: true, aliases: "Lahore Airport, LHE" },
    { name: "Peshawar — Bacha Khan Intl Airport (PEW / OPPS), PK", persian: "میدان هوایی بین‌المللی باچا خان پشاور، پاکستان", country: "Pakistan", code: "PEW", locationType: "AIRPORT_INTERNATIONAL", iataCode: "PEW", airCargo: true, aliases: "Peshawar Airport, PEW" },
    { name: "Quetta International Airport (UET / OPQT), PK", persian: "میدان هوایی بین‌المللی کویته، پاکستان", country: "Pakistan", code: "UET", locationType: "AIRPORT_INTERNATIONAL", iataCode: "UET", airCargo: true, aliases: "Quetta Airport, UET" },
    { name: "Sialkot International Airport (SKT / OPST), PK", persian: "میدان هوایی بین‌المللی سیالکوت (هاب صادرات)، پاکستان", country: "Pakistan", code: "SKT", locationType: "AIRPORT_INTERNATIONAL", iataCode: "SKT", airCargo: true, cargoEnabled: true, aliases: "Sialkot Airport, SKT" },
    
    // 🇦🇪 Dubai All Ports & UAE Seaports (Complete Marine Terminals)
    { name: "Jebel Ali Port (Mina Jebel Ali), Dubai, AE", persian: "بندر جبل علی، دبی", country: "UAE", code: "JEA", isPort: true, portName: "Jebel Ali Port (Mina Jebel Ali)" },
    { name: "Port Rashid (Mina Rashid), Dubai, AE", persian: "بندر راشد، دبی", country: "UAE", code: "DXB-PRD", isPort: true, portName: "Port Rashid (Mina Rashid)" },
    { name: "Al Hamriya Port (Mina Al Hamriya), Dubai, AE", persian: "بندر حمرية، دبی", country: "UAE", code: "HAM-DXB", isPort: true, portName: "Al Hamriya Port (Dubai)" },
    { name: "Dubai Creek (Deira Wharfage / Mina Al Khor), AE", persian: "اسکله خور دبی / دیره", country: "UAE", code: "DXB-CRK", isPort: true, portName: "Dubai Creek (Deira Wharfage)" },
    { name: "Dubai Maritime City (DMC), AE", persian: "شهرک دریایی دبی", country: "UAE", code: "DMC", isPort: true, portName: "Dubai Maritime City (DMC)" },
    { name: "Dubai Drydocks World, AE", persian: "حوضچه خشک دبی", country: "UAE", code: "DDW", isPort: true, portName: "Dubai Drydocks World" },
    { name: "Jebel Ali Free Zone (JAFZA), Dubai, AE", persian: "منطقه آزاد جبل علی، دبی", country: "UAE", code: "JAFZA", isPort: true, portName: "Jebel Ali Free Zone (JAFZA)" },
    { name: "Dubai Logistics City (DLC / DWC), AE", persian: "شهرک لجستیک دبی (DWC)", country: "UAE", code: "DWC", isPort: true, portName: "Dubai Logistics City (DWC)" },
    { name: "Dubai, AE", persian: "دبی، امارات متحده عربی", country: "UAE", code: "DXB", isPort: false },
    { name: "Port of Fujairah, AE", persian: "بندر فجیرة، امارات", country: "UAE", code: "FJR", isPort: true, portName: "Port of Fujairah" },
    { name: "Khalifa Port (Mina Khalifa), Abu Dhabi, AE", persian: "بندر خلیفه، ابوظبی", country: "UAE", code: "KHL", isPort: true, portName: "Khalifa Port (Abu Dhabi)" },
    { name: "Mina Zayed (Port Zayed), Abu Dhabi, AE", persian: "بندر زاید، ابوظبی", country: "UAE", code: "MZY", isPort: true, portName: "Mina Zayed (Port Zayed)" },
    { name: "Musaffah Port, Abu Dhabi, AE", persian: "بندر مصفح، ابوظبی", country: "UAE", code: "MSF", isPort: true, portName: "Musaffah Port (Abu Dhabi)" },
    { name: "Khorfakkan Port, Sharjah, AE", persian: "بندر خورفکان، شارجه", country: "UAE", code: "KLF", isPort: true, portName: "Khorfakkan Port (Sharjah)" },
    { name: "Port Khalid, Sharjah, AE", persian: "بندر خالد، شارجه", country: "UAE", code: "PKH", isPort: true, portName: "Port Khalid (Sharjah)" },
    { name: "Hamriyah Free Zone Port, Sharjah, AE", persian: "بندر حمرية شارجه", country: "UAE", code: "HFZ", isPort: true, portName: "Hamriyah Port (Sharjah)" },
    { name: "Ajman Port, AE", persian: "بندر عجمان، امارات", country: "UAE", code: "AJM", isPort: true, portName: "Port of Ajman" },
    { name: "Saqr Port (Ras Al Khaimah), AE", persian: "بندر صقر، رأس الخیمه", country: "UAE", code: "SQR", isPort: true, portName: "Saqr Port (Ras Al Khaimah)" },
    { name: "Ras Al Khaimah Port (RAK Port), AE", persian: "بندر رأس الخیمه، امارات", country: "UAE", code: "RAK", isPort: true, portName: "Port of Ras Al Khaimah" },
    { name: "Umm Al Quwain Port, AE", persian: "بندر ام‌القیوین، امارات", country: "UAE", code: "UAQ", isPort: true, portName: "Port of Umm Al Quwain" },
    { name: "Abu Dhabi, AE", persian: "ابوظبی، امارات", country: "UAE", code: "AUH" },
    { name: "Sharjah, AE", persian: "شارجہ، امارات", country: "UAE", code: "SHJ" },

    // 🇦🇪 UAE — International Airports (Air Cargo)
    { name: "Dubai International Airport (DXB / OMDB), AE", persian: "میدان هوایی بین‌المللی دبی (هاب بار هوایی امارات)", country: "UAE", code: "DXB-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "DXB", unLocode: "AEDXB", airCargo: true, cargoEnabled: true, aliases: "Dubai Airport, DXB, OMDB, میدان هوایی دبی, Dubai Cargo" },
    { name: "Dubai — Al Maktoum Intl Airport (DWC / OMDW / Dubai World Central), AE", persian: "میدان هوایی آل مکتوم دبی (دبی ورلد سنترال / DWC)", country: "UAE", code: "DWC-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "DWC", unLocode: "AEDWC", airCargo: true, cargoEnabled: true, aliases: "DWC Airport, Dubai World Central, Al Maktoum, OMDW, میدان هوایی آل مکتوم" },
    { name: "Sharjah International Airport (SHJ / OMSJ), AE", persian: "میدان هوایی بین‌المللی شارجه (هاب بار هوایی منطقه‌ای)", country: "UAE", code: "SHJ-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "SHJ", unLocode: "AESHJ", airCargo: true, cargoEnabled: true, aliases: "Sharjah Airport, SHJ, OMSJ, میدان هوایی شارجه" },
    { name: "Abu Dhabi — Zayed Intl Airport (AUH / OMAA), AE", persian: "میدان هوایی بین‌المللی زاید ابوظبی", country: "UAE", code: "AUH-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "AUH", unLocode: "AEAUH", airCargo: true, cargoEnabled: true, aliases: "Abu Dhabi Airport, AUH, OMAA, میدان هوایی ابوظبی" },
    { name: "Ras Al Khaimah International Airport (RKT / OMRK), AE", persian: "میدان هوایی بین‌المللی رأس الخیمه، امارات", country: "UAE", code: "RKT", locationType: "AIRPORT_INTERNATIONAL", iataCode: "RKT", unLocode: "AERKT", airCargo: true, aliases: "RAK Airport, RKT" },
    { name: "Fujairah International Airport (FJR / OMFJ), AE", persian: "میدان هوایی بین‌المللی فجیره، امارات", country: "UAE", code: "FJR-AIR", locationType: "AIRPORT_INTERNATIONAL", iataCode: "FJR", unLocode: "AEFJR", airCargo: true, aliases: "Fujairah Airport, FJR" },

    { name: "Hamad Port (Doha), QA", persian: "بندر حمد، قطر", country: "Qatar", code: "DOH", isPort: true, portName: "Hamad Port" },
    { name: "Dammam (King Abdulaziz Port), SA", persian: "بندر دمام، عربستان", country: "Saudi Arabia", code: "DMM", isPort: true, portName: "King Abdulaziz Port (Dammam)" },
    { name: "Jeddah Islamic Port, SA", persian: "بندر اسلامی جده، عربستان", country: "Saudi Arabia", code: "JED", isPort: true, portName: "Jeddah Islamic Port" },
    { name: "King Abdullah Port, SA", persian: "بندر ملک عبدالله، عربستان", country: "Saudi Arabia", code: "KAP", isPort: true, portName: "King Abdullah Port" },
    { name: "Bahrain Port (Khalifa Bin Salman), BH", persian: "بندر خلیفه بن سلمان، بحرین", country: "Bahrain", code: "BAH", isPort: true, portName: "Khalifa Bin Salman Port" },
    { name: "Sohar Port, OM", persian: "بندر صحار، عمان", country: "Oman", code: "SOH", isPort: true, portName: "Sohar Port" },
    { name: "Salalah Port, OM", persian: "بندر صلاله، عمان", country: "Oman", code: "SLL", isPort: true, portName: "Port of Salalah" },
    { name: "Muscat (Sultan Qaboos), OM", persian: "بندر مسقط، عمان", country: "Oman", code: "MCT", isPort: true, portName: "Port Sultan Qaboos" },
    { name: "Shuwaikh Port (Kuwait), KW", persian: "بندر شیوخ، کویت", country: "Kuwait", code: "KWT", isPort: true, portName: "Shuwaikh Port" },
    { name: "Umm Qasr Port (Basra), IQ", persian: "بندر ام قصر (بصره)، عراق", country: "Iraq", code: "UQR", isPort: true, portName: "Umm Qasr Port" },
    { name: "Aqaba Port, JO", persian: "بندر عقبه، اردن", country: "Jordan", code: "AQB", isPort: true, portName: "Port of Aqaba" },
    { name: "Beirut Port, LB", persian: "بندر بیروت، لبنان", country: "Lebanon", code: "BEY", isPort: true, portName: "Port of Beirut" },
    
    // 🇮🇳 INDIA — LAND BORDERS, INTEGRATED CHECK POSTS (ICP) & CUSTOMS CROSSINGS
    { name: "Attari / Wagah (ICP Attari), Punjab, IN", persian: "اٹاری بارڈر / واہگہ (پایانه مرزی پاکستان)، هند", country: "India", code: "ATT", locationType: "INTEGRATED_CHECK_POST", state: "Punjab", district: "Amritsar", borderCountry: "Pakistan", isBorder: true, roadConnected: true, railConnected: true, customsCode: "INATT1", unLocode: "INATQ" },
    { name: "Dera Baba Nanak (Kartarpur Corridor), Punjab, IN", persian: "دیره بابا نانک (مرز پاکستان)، هند", country: "India", code: "DBN", locationType: "CUSTOMS_BORDER", state: "Punjab", district: "Gurdaspur", borderCountry: "Pakistan", isBorder: true },
    { name: "Raxaul (ICP Raxaul / Birgunj Gateway), Bihar, IN", persian: "راکسول (پایانه مرزی نپال)، هند", country: "India", code: "RXL", locationType: "INTEGRATED_CHECK_POST", state: "Bihar", district: "East Champaran", borderCountry: "Nepal", isBorder: true, railConnected: true, roadConnected: true, unLocode: "INRXL", customsCode: "INRXL1" },
    { name: "Jogbani (ICP Jogbani / Biratnagar Gateway), Bihar, IN", persian: "جوگبانی (مرز نپال)، هند", country: "India", code: "JGB", locationType: "INTEGRATED_CHECK_POST", state: "Bihar", district: "Araria", borderCountry: "Nepal", isBorder: true, railConnected: true, roadConnected: true, unLocode: "INJGB", customsCode: "INJGB1" },
    { name: "Rupaidiha (ICP Rupaidiha / Nepalgunj), UP, IN", persian: "روپیدیها (مرز نپال)، هند", country: "India", code: "RPD", locationType: "INTEGRATED_CHECK_POST", state: "Uttar Pradesh", district: "Bahraich", borderCountry: "Nepal", isBorder: true, roadConnected: true, unLocode: "INRPD" },
    { name: "Panitanki (Raniganj / Kakarbhitta Gateway), WB, IN", persian: "پانی تانکی (مرز نپال)، هند", country: "India", code: "PTK", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "Darjeeling", borderCountry: "Nepal", isBorder: true, roadConnected: true },
    { name: "Jaigaon (Phuntsholing Gateway), WB, IN", persian: "جایگاون (مرز بوتان)، هند", country: "India", code: "JGN", locationType: "LAND_BORDER", state: "West Bengal", district: "Alipurduar", borderCountry: "Bhutan", isBorder: true, roadConnected: true, unLocode: "INJGN" },
    { name: "Petrapole (ICP Petrapole / Benapole Gateway), WB, IN", persian: "پتراپول (پایانه مرزی بنگلادش)، هند", country: "India", code: "PTP", locationType: "INTEGRATED_CHECK_POST", state: "West Bengal", district: "North 24 Parganas", borderCountry: "Bangladesh", isBorder: true, railConnected: true, roadConnected: true, unLocode: "INPTP", customsCode: "INPTP1" },
    { name: "Hili (Hili Land Customs Station), WB, IN", persian: "هیلی (گمرک مرزی بنگلادش)، هند", country: "India", code: "HLI", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "Dakshin Dinajpur", borderCountry: "Bangladesh", isBorder: true, unLocode: "INHLI" },
    { name: "Changrabandha (Burimari Gateway), WB, IN", persian: "چانگرابندها (مرز بنگلادش)، هند", country: "India", code: "CGB", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "Cooch Behar", borderCountry: "Bangladesh", isBorder: true, unLocode: "INCGB" },
    { name: "Ghojadanga (Bhomra Gateway), WB, IN", persian: "غوجادانگا (مرز بنگلادش)، هند", country: "India", code: "GHD", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "North 24 Parganas", borderCountry: "Bangladesh", isBorder: true, unLocode: "INGHD" },
    { name: "Mahadipur (Sonamasjid Gateway), WB, IN", persian: "مهدی‌پور (مرز بنگلادش)، هند", country: "India", code: "MDP", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "Malda", borderCountry: "Bangladesh", isBorder: true, unLocode: "INMDP" },
    { name: "Fulbari (Banglabandha Gateway), WB, IN", persian: "فولباری (مرز بنگلادش)، هند", country: "India", code: "FLB", locationType: "CUSTOMS_BORDER", state: "West Bengal", district: "Jalpaiguri", borderCountry: "Bangladesh", isBorder: true, unLocode: "INFLB" },
    { name: "Dawki (ICP Dawki / Tamabil Gateway), Meghalaya, IN", persian: "داوکی (پایانه مرزی بنگلادش)، هند", country: "India", code: "DWK", locationType: "INTEGRATED_CHECK_POST", state: "Meghalaya", district: "West Jaintia Hills", borderCountry: "Bangladesh", isBorder: true, unLocode: "INDWK" },
    { name: "Sutarkandi (ICP Sutarkandi / Sheola Gateway), Assam, IN", persian: "سوتارکندی (مرز بنگلادش)، هند", country: "India", code: "STK", locationType: "INTEGRATED_CHECK_POST", state: "Assam", district: "Karimganj", borderCountry: "Bangladesh", isBorder: true, unLocode: "INSTK" },
    { name: "Agartala (ICP Agartala / Akhaura Gateway), Tripura, IN", persian: "آگارتالا (پایانه مرزی بنگلادش)، هند", country: "India", code: "AGT", locationType: "INTEGRATED_CHECK_POST", state: "Tripura", district: "West Tripura", borderCountry: "Bangladesh", isBorder: true, unLocode: "INAGT" },
    { name: "Srimantapur (Bibirbazar Gateway), Tripura, IN", persian: "سریماتاپور (مرز بنگلادش)، هند", country: "India", code: "SMP", locationType: "CUSTOMS_BORDER", state: "Tripura", district: "Sepahijala", borderCountry: "Bangladesh", isBorder: true, unLocode: "INSMP" },
    { name: "Sabroom (ICP Sabroom / Chittagong Corridor), Tripura, IN", persian: "سابروم (مرز بنگلادش)، هند", country: "India", code: "SBR", locationType: "INTEGRATED_CHECK_POST", state: "Tripura", district: "South Tripura", borderCountry: "Bangladesh", isBorder: true, unLocode: "INSBR" },
    { name: "Moreh (ICP Moreh / Tamu Gateway), Manipur, IN", persian: "موره (مرز میانمار)، هند", country: "India", code: "MRH", locationType: "INTEGRATED_CHECK_POST", state: "Manipur", district: "Tengnoupal", borderCountry: "Myanmar", isBorder: true, unLocode: "INMRH" },
    { name: "Zokhawthar (Rih Dil Gateway), Mizoram, IN", persian: "زوخاوتر (مرز میانمار)، هند", country: "India", code: "ZKT", locationType: "CUSTOMS_BORDER", state: "Mizoram", district: "Champhai", borderCountry: "Myanmar", isBorder: true, unLocode: "INZKT" },

    // 🇮🇳 INDIA — MAJOR SEAPORTS & PREMIER CONTAINER TERMINALS
    { name: "Jawaharlal Nehru Port (JNPT / Nhava Sheva), MH, IN", persian: "بندر نهاوا شوا (JNPT ممبئی)، هند", country: "India", code: "INNSA", isPort: true, portName: "Jawaharlal Nehru Port (JNPT / Nhava Sheva)", locationType: "SEA_PORT_MAJOR", state: "Maharashtra", district: "Raigad / Navi Mumbai", unLocode: "INNSA", customsCode: "INNSA1", containerEnabled: true, railConnected: true, seaCargo: true },
    { name: "Mumbai Port Trust (MbPT), Maharashtra, IN", persian: "بندر ممبئی، هند", country: "India", code: "INBOM", isPort: true, portName: "Mumbai Port Trust", locationType: "SEA_PORT_MAJOR", state: "Maharashtra", district: "Mumbai", unLocode: "INBOM", seaCargo: true },
    { name: "Mundra Port (Adani Ports & SEZ), Gujarat, IN", persian: "بندر موندرا (بزرگترین بندر تجاری گجرات)، هند", country: "India", code: "INMUN", isPort: true, portName: "Mundra Port & SEZ (APSEZ)", locationType: "SEA_PORT_MAJOR", state: "Gujarat", district: "Kutch", unLocode: "INMUN", customsCode: "INMUN1", containerEnabled: true, railConnected: true, seaCargo: true },
    { name: "Deendayal Port (Kandla), Gujarat, IN", persian: "بندر کاندلا (دیندایال)، هند", country: "India", code: "INIXY", isPort: true, portName: "Deendayal Port (Kandla)", locationType: "SEA_PORT_MAJOR", state: "Gujarat", district: "Kutch", unLocode: "INIXY", customsCode: "INIXY1", seaCargo: true },
    { name: "Pipavav Port (APM Terminals), Gujarat, IN", persian: "بندر پیپاوائو (گجرات)، هند", country: "India", code: "INPAV", isPort: true, portName: "Port Pipavav (APM Terminals)", locationType: "SEA_PORT_MAJOR", state: "Gujarat", district: "Amreli", unLocode: "INPAV", containerEnabled: true, railConnected: true, seaCargo: true },
    { name: "Hazira Port (Adani / Essar), Gujarat, IN", persian: "بندر هزیرا (سورت)، هند", country: "India", code: "INHZA", isPort: true, portName: "Hazira Port (Adani Hazira)", locationType: "SEA_PORT_MAJOR", state: "Gujarat", district: "Surat", unLocode: "INHZA", containerEnabled: true, seaCargo: true },
    { name: "Chennai Port Trust, Tamil Nadu, IN", persian: "بندر چنای (مدراس)، هند", country: "India", code: "INMAA", isPort: true, portName: "Chennai Port Trust", locationType: "SEA_PORT_MAJOR", state: "Tamil Nadu", district: "Chennai", unLocode: "INMAA", customsCode: "INMAA1", containerEnabled: true, railConnected: true, seaCargo: true },
    { name: "Kamarajar Port (Ennore), Tamil Nadu, IN", persian: "بندر کاماراجار (انور)، هند", country: "India", code: "INENR", isPort: true, portName: "Kamarajar Port (Ennore)", locationType: "SEA_PORT_MAJOR", state: "Tamil Nadu", district: "Chennai", unLocode: "INENR", containerEnabled: true, seaCargo: true },
    { name: "Kattupalli Port (Adani Kattupalli), Tamil Nadu, IN", persian: "بندر کاتوپالی (چنای)، هند", country: "India", code: "INKAT", isPort: true, portName: "Adani Kattupalli Port", locationType: "SEA_PORT_MAJOR", state: "Tamil Nadu", district: "Tiruvallur", unLocode: "INKAT", containerEnabled: true, seaCargo: true },
    { name: "V.O. Chidambaranar Port (Tuticorin), Tamil Nadu, IN", persian: "بندر توتیکورین (VOC Port)، هند", country: "India", code: "INTUT", isPort: true, portName: "V.O. Chidambaranar Port (Tuticorin)", locationType: "SEA_PORT_MAJOR", state: "Tamil Nadu", district: "Thoothukudi", unLocode: "INTUT", containerEnabled: true, seaCargo: true },
    { name: "Cochin Port Trust (Vallarpadam ICTT), Kerala, IN", persian: "بندر کوچین (پایانه بین‌المللی کانتینری والرپادام)، هند", country: "India", code: "INCOK", isPort: true, portName: "Cochin Port (Vallarpadam ICTT)", locationType: "SEA_PORT_MAJOR", state: "Kerala", district: "Ernakulam", unLocode: "INCOK", containerEnabled: true, seaCargo: true },
    { name: "Vizhinjam International Seaport, Kerala, IN", persian: "بندر بین‌المللی ویژینجام (ترانس‌شیپ‌منت کانتینری)، هند", country: "India", code: "INVIZ", isPort: true, portName: "Vizhinjam International Transshipment Deepwater Port", locationType: "SEA_PORT_MAJOR", state: "Kerala", district: "Thiruvananthapuram", unLocode: "INVIZ", containerEnabled: true, seaCargo: true },
    { name: "New Mangalore Port, Karnataka, IN", persian: "بندر نیو منگلور، هند", country: "India", code: "INNML", isPort: true, portName: "New Mangalore Port Trust", locationType: "SEA_PORT_MAJOR", state: "Karnataka", district: "Dakshina Kannada", unLocode: "INNML", seaCargo: true },
    { name: "Mormugao Port Trust, Goa, IN", persian: "بندر مورموگائو (گوا)، هند", country: "India", code: "INMRM", isPort: true, portName: "Mormugao Port Trust", locationType: "SEA_PORT_MAJOR", state: "Goa", district: "South Goa", unLocode: "INMRM", seaCargo: true },
    { name: "Visakhapatnam Port Trust (Vizag Port), AP, IN", persian: "بندر ویساکاپاتنام (ویزگ)، هند", country: "India", code: "INVTZ", isPort: true, portName: "Visakhapatnam Port Trust", locationType: "SEA_PORT_MAJOR", state: "Andhra Pradesh", district: "Visakhapatnam", unLocode: "INVTZ", containerEnabled: true, railConnected: true, seaCargo: true },
    { name: "Gangavaram Port (Adani Gangavaram), AP, IN", persian: "بندر گانگااورام (ویزگ)، هند", country: "India", code: "INGGV", isPort: true, portName: "Gangavaram Port", locationType: "SEA_PORT_MAJOR", state: "Andhra Pradesh", district: "Visakhapatnam", unLocode: "INGGV", seaCargo: true },
    { name: "Krishnapatnam Port (Adani KPCL), AP, IN", persian: "بندر کریشناپاتنام (نلور)، هند", country: "India", code: "INKRI", isPort: true, portName: "Krishnapatnam Port (KPCL)", locationType: "SEA_PORT_MAJOR", state: "Andhra Pradesh", district: "Nellore", unLocode: "INKRI", containerEnabled: true, seaCargo: true },
    { name: "Paradip Port Trust, Odisha, IN", persian: "بندر پارادیپ (اودیشا)، هند", country: "India", code: "INPRT", isPort: true, portName: "Paradip Port Trust", locationType: "SEA_PORT_MAJOR", state: "Odisha", district: "Jagatsinghpur", unLocode: "INPRT", seaCargo: true },
    { name: "Dhamra Port (Adani Dhamra), Odisha, IN", persian: "بندر دهامرا (اودیشا)، هند", country: "India", code: "INDHM", isPort: true, portName: "Dhamra Port (DPCL)", locationType: "SEA_PORT_MAJOR", state: "Odisha", district: "Bhadrak", unLocode: "INDHM", seaCargo: true },
    { name: "Syama Prasad Mookerjee Port (Kolkata Dock), WB, IN", persian: "بندر کلکته (سیااما پراساد)، هند", country: "India", code: "INCCU", isPort: true, portName: "Syama Prasad Mookerjee Port Kolkata", locationType: "SEA_PORT_MAJOR", state: "West Bengal", district: "Kolkata", unLocode: "INCCU", containerEnabled: true, seaCargo: true },
    { name: "Haldia Dock Complex (HDC), West Bengal, IN", persian: "بندر هالدیا (داک کمپلکس کلکته)، هند", country: "India", code: "INHAL", isPort: true, portName: "Haldia Dock Complex", locationType: "SEA_PORT_MAJOR", state: "West Bengal", district: "Purba Medinipur", unLocode: "INHAL", containerEnabled: true, seaCargo: true },

    // 🇮🇳 INDIA — COMMERCIAL NON-MAJOR CARGO SEAPORTS
    { name: "Bedi Port, Gujarat, IN", persian: "بندر بدی (جام‌نگر)، هند", country: "India", code: "INBED", isPort: true, portName: "Bedi Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INBED" },
    { name: "Sikka Port (Reliance Terminal), Gujarat, IN", persian: "بندر سیکا (پایانه نفتی ریلاینس)، هند", country: "India", code: "INSIK", isPort: true, portName: "Sikka Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INSIK" },
    { name: "Dahej Port (Petronet LNG), Gujarat, IN", persian: "بندر داهج (گجرات)، هند", country: "India", code: "INDHJ", isPort: true, portName: "Dahej Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INDHJ" },
    { name: "Porbandar Port, Gujarat, IN", persian: "بندر پوربندر، هند", country: "India", code: "INPBD-PORT", isPort: true, portName: "Porbandar Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INPBD" },
    { name: "Okha Port, Gujarat, IN", persian: "بندر اوخا (دوارکا)، هند", country: "India", code: "INOKH", isPort: true, portName: "Okha Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INOKH" },
    { name: "Navlakhi Port, Gujarat, IN", persian: "بندر ناولاخی (موربی)، هند", country: "India", code: "INNAV", isPort: true, portName: "Navlakhi Port", locationType: "SEA_PORT_NON_MAJOR", state: "Gujarat", unLocode: "INNAV" },
    { name: "Jaigad Port (JSW Jaigad), Maharashtra, IN", persian: "بندر جایگاد (راتناگیری)، هند", country: "India", code: "INJAI-PORT", isPort: true, portName: "JSW Jaigad Port", locationType: "SEA_PORT_NON_MAJOR", state: "Maharashtra", unLocode: "INJAI" },
    { name: "Dighi Port (Adani Dighi), Maharashtra, IN", persian: "بندر دیگی (رایگاد)، هند", country: "India", code: "INDGI", isPort: true, portName: "Dighi Port", locationType: "SEA_PORT_NON_MAJOR", state: "Maharashtra", unLocode: "INDGI" },
    { name: "Dharamtar Port, Maharashtra, IN", persian: "بندر دهارام‌تار (رایگاد)، هند", country: "India", code: "INDMT", isPort: true, portName: "Dharamtar Port", locationType: "SEA_PORT_NON_MAJOR", state: "Maharashtra", unLocode: "INDMT" },
    { name: "Redi Port, Maharashtra, IN", persian: "بندر ردی (سیندودورگ)، هند", country: "India", code: "INRED", isPort: true, portName: "Redi Port", locationType: "SEA_PORT_NON_MAJOR", state: "Maharashtra", unLocode: "INRED" },
    { name: "Karwar Port, Karnataka, IN", persian: "بندر کاروار، هند", country: "India", code: "INKRW", isPort: true, portName: "Karwar Port", locationType: "SEA_PORT_NON_MAJOR", state: "Karnataka", unLocode: "INKRW" },
    { name: "Old Mangalore Port, Karnataka, IN", persian: "بندر قدیم منگلور، هند", country: "India", code: "INMNP", isPort: true, portName: "Old Mangalore Port", locationType: "SEA_PORT_NON_MAJOR", state: "Karnataka", unLocode: "INMNP" },
    { name: "Beypore Port, Kerala, IN", persian: "بندر بیپور (کوزیکود)، هند", country: "India", code: "INBEY", isPort: true, portName: "Beypore Port", locationType: "SEA_PORT_NON_MAJOR", state: "Kerala", unLocode: "INBEY" },
    { name: "Azhikkal Port (Kannur), Kerala, IN", persian: "بندر آژیکال (کانور)، هند", country: "India", code: "INAZH", isPort: true, portName: "Azhikkal Port", locationType: "SEA_PORT_NON_MAJOR", state: "Kerala", unLocode: "INAZH" },
    { name: "Cuddalore Port, Tamil Nadu, IN", persian: "بندر کادالور، هند", country: "India", code: "INCDL", isPort: true, portName: "Cuddalore Port", locationType: "SEA_PORT_NON_MAJOR", state: "Tamil Nadu", unLocode: "INCDL" },
    { name: "Nagapattinam Port, Tamil Nadu, IN", persian: "بندر ناگاپاتینام، هند", country: "India", code: "INNAG-PORT", isPort: true, portName: "Nagapattinam Port", locationType: "SEA_PORT_NON_MAJOR", state: "Tamil Nadu", unLocode: "INNAG" },
    { name: "Karaikal Port (Adani Karaikal), Puducherry, IN", persian: "بندر کارایکال، هند", country: "India", code: "INKRK", isPort: true, portName: "Karaikal Port", locationType: "SEA_PORT_NON_MAJOR", state: "Puducherry", unLocode: "INKRK" },
    { name: "Kakinada Deep Water Port, AP, IN", persian: "بندر کاکینادا، هند", country: "India", code: "INKAK", isPort: true, portName: "Kakinada Deep Water Port", locationType: "SEA_PORT_NON_MAJOR", state: "Andhra Pradesh", unLocode: "INKAK" },
    { name: "Machilipatnam Port, AP, IN", persian: "بندر ماچیلی‌پاتنام، هند", country: "India", code: "INMTM", isPort: true, portName: "Machilipatnam Port", locationType: "SEA_PORT_NON_MAJOR", state: "Andhra Pradesh", unLocode: "INMTM" },
    { name: "Gopalpur Port, Odisha, IN", persian: "بندر گوپال‌پور (گانجام)، هند", country: "India", code: "INGPR", isPort: true, portName: "Gopalpur Port", locationType: "SEA_PORT_NON_MAJOR", state: "Odisha", unLocode: "INGPR" },

    // 🇮🇳 INDIA — INTERNATIONAL & CUSTOMS AIRPORTS (AIR CARGO)
    { name: "New Delhi — Indira Gandhi Intl Airport (DEL / IGI / INDEL), IN", persian: "میدان هوایی بین‌المللی دهلی نو (IGI / دهلی)، هند", country: "India", code: "DEL", locationType: "AIRPORT_INTERNATIONAL", state: "Delhi", district: "New Delhi", iataCode: "DEL", unLocode: "INDEL", customsCode: "INDEL4", airCargo: true, cargoEnabled: true, aliases: "New Delhi, New Delhi Airport, Delhi Airport, IGI, IGI Airport, Indira Gandhi, Cargo Terminal Delhi, INDEL" },
    { name: "Delhi — Indira Gandhi Intl Airport (DEL / INDEL), IN", persian: "میدان هوایی بین‌المللی دهلی (IGI)، هند", country: "India", code: "DEL", locationType: "AIRPORT_INTERNATIONAL", state: "Delhi", district: "New Delhi", iataCode: "DEL", unLocode: "INDEL", customsCode: "INDEL4", airCargo: true, cargoEnabled: true, aliases: "New Delhi, New Delhi Airport, Delhi Airport, IGI, IGI Airport, Indira Gandhi, INDEL" },
    { name: "Mumbai — Chhatrapati Shivaji Maharaj Intl Airport (BOM / INBOM), IN", persian: "میدان هوایی بین‌المللی ممبئی (CSMIA)، هند", country: "India", code: "BOM", locationType: "AIRPORT_INTERNATIONAL", state: "Maharashtra", iataCode: "BOM", unLocode: "INBOM", customsCode: "INBOM4", airCargo: true, cargoEnabled: true, aliases: "Bombay Airport, Mumbai Cargo, CSMIA" },
    { name: "Bengaluru — Kempegowda Intl Airport (BLR / INBLR), IN", persian: "میدان هوایی بین‌المللی بنگلور (KIA)، هند", country: "India", code: "BLR", locationType: "AIRPORT_INTERNATIONAL", state: "Karnataka", iataCode: "BLR", unLocode: "INBLR", customsCode: "INBLR4", airCargo: true, cargoEnabled: true },
    { name: "Hyderabad — Rajiv Gandhi Intl Airport (HYD / INHYD), IN", persian: "میدان هوایی بین‌المللی حیدرآباد (RGIA)، هند", country: "India", code: "HYD", locationType: "AIRPORT_INTERNATIONAL", state: "Telangana", iataCode: "HYD", unLocode: "INHYD", customsCode: "INHYD4", airCargo: true, cargoEnabled: true },
    { name: "Chennai International Airport (MAA / INMAA), IN", persian: "میدان هوایی بین‌المللی چنای، هند", country: "India", code: "MAA", locationType: "AIRPORT_INTERNATIONAL", state: "Tamil Nadu", iataCode: "MAA", unLocode: "INMAA", customsCode: "INMAA4", airCargo: true, cargoEnabled: true },
    { name: "Kolkata — Netaji Subhas Chandra Bose Intl Airport (CCU / INCCU), IN", persian: "میدان هوایی بین‌المللی کلکته (NSCBIA)، هند", country: "India", code: "CCU", locationType: "AIRPORT_INTERNATIONAL", state: "West Bengal", iataCode: "CCU", unLocode: "INCCU", customsCode: "INCCU4", airCargo: true, cargoEnabled: true },
    { name: "Ahmedabad — Sardar Vallabhbhai Patel Intl Airport (AMD / INAMD), IN", persian: "میدان هوایی بین‌المللی احمدآباد، هند", country: "India", code: "AMD", locationType: "AIRPORT_INTERNATIONAL", state: "Gujarat", iataCode: "AMD", unLocode: "INAMD", customsCode: "INAMD4", airCargo: true, cargoEnabled: true },
    { name: "Kochi — Cochin International Airport (COK / INCOK), IN", persian: "میدان هوایی بین‌المللی کوچین، هند", country: "India", code: "COK", locationType: "AIRPORT_INTERNATIONAL", state: "Kerala", iataCode: "COK", unLocode: "INCOK", customsCode: "INCOK4", airCargo: true, cargoEnabled: true },
    { name: "Goa — Manohar Intl Airport (Mopa / GOX), IN", persian: "میدان هوایی بین‌المللی موپا، گوا، هند", country: "India", code: "GOX", locationType: "AIRPORT_INTERNATIONAL", state: "Goa", iataCode: "GOX", unLocode: "INGOX", airCargo: true },
    { name: "Goa — Dabolim Airport (GOI / INGOI), IN", persian: "میدان هوایی دابولیم، گوا، هند", country: "India", code: "GOI", locationType: "AIRPORT_INTERNATIONAL", state: "Goa", iataCode: "GOI", unLocode: "INGOI", airCargo: true },
    { name: "Pune International Airport (PNQ / INPNQ), IN", persian: "میدان هوایی بین‌المللی پونا، هند", country: "India", code: "PNQ", locationType: "AIRPORT_CUSTOMS", state: "Maharashtra", iataCode: "PNQ", unLocode: "INPNQ", airCargo: true },
    { name: "Jaipur International Airport (JAI / INJAI), IN", persian: "میدان هوایی بین‌المللی جیپور، هند", country: "India", code: "JAI", locationType: "AIRPORT_INTERNATIONAL", state: "Rajasthan", iataCode: "JAI", unLocode: "INJAI", airCargo: true },
    { name: "Lucknow — Chaudhary Charan Singh Intl Airport (LKO / INLKO), IN", persian: "میدان هوایی بین‌المللی لکهنو، هند", country: "India", code: "LKO", locationType: "AIRPORT_INTERNATIONAL", state: "Uttar Pradesh", iataCode: "LKO", unLocode: "INLKO", airCargo: true },
    { name: "Amritsar — Sri Guru Ram Dass Jee Intl Airport (ATQ / INATQ), IN", persian: "میدان هوایی بین‌المللی امریتسر، هند", country: "India", code: "ATQ", locationType: "AIRPORT_INTERNATIONAL", state: "Punjab", iataCode: "ATQ", unLocode: "INATQ", customsCode: "INATQ4", airCargo: true },
    { name: "Varanasi — Lal Bahadur Shastri Intl Airport (VNS / INVNS), IN", persian: "میدان هوایی بین‌المللی واراناسی، هند", country: "India", code: "VNS", locationType: "AIRPORT_INTERNATIONAL", state: "Uttar Pradesh", iataCode: "VNS", unLocode: "INVNS", airCargo: true },
    { name: "Guwahati — Lokpriya Gopinath Bordoloi Intl Airport (GAU / INGAU), IN", persian: "میدان هوایی بین‌المللی گواتی، هند", country: "India", code: "GAU", locationType: "AIRPORT_INTERNATIONAL", state: "Assam", iataCode: "GAU", unLocode: "INGAU", airCargo: true },
    { name: "Kozhikode — Calicut International Airport (CCJ / INCCJ), IN", persian: "میدان هوایی بین‌المللی کالیکوت (کوزیکود)، هند", country: "India", code: "CCJ", locationType: "AIRPORT_INTERNATIONAL", state: "Kerala", iataCode: "CCJ", unLocode: "INCCJ", airCargo: true },
    { name: "Thiruvananthapuram International Airport (TRV / INTRV), IN", persian: "میدان هوایی بین‌المللی تریواندروم، هند", country: "India", code: "TRV", locationType: "AIRPORT_INTERNATIONAL", state: "Kerala", iataCode: "TRV", unLocode: "INTRV", airCargo: true },
    { name: "Tiruchirappalli International Airport (TRZ / INTRZ), IN", persian: "میدان هوایی بین‌المللی تیروچیراپالی، هند", country: "India", code: "TRZ", locationType: "AIRPORT_INTERNATIONAL", state: "Tamil Nadu", iataCode: "TRZ", unLocode: "INTRZ", airCargo: true },
    { name: "Mangaluru International Airport (IXE / INIXE), IN", persian: "میدان هوایی بین‌المللی منگلور، هند", country: "India", code: "IXE", locationType: "AIRPORT_INTERNATIONAL", state: "Karnataka", iataCode: "IXE", unLocode: "INIXE", airCargo: true },
    { name: "Kannur International Airport (CNN / INCNN), IN", persian: "میدان هوایی بین‌المللی کانور، هند", country: "India", code: "CNN", locationType: "AIRPORT_INTERNATIONAL", state: "Kerala", iataCode: "CNN", unLocode: "INCNN", airCargo: true },
    { name: "Bhubaneswar — Biju Patnaik Intl Airport (BBI / INBBI), IN", persian: "میدان هوایی بین‌المللی بوبانسوار، هند", country: "India", code: "BBI", locationType: "AIRPORT_INTERNATIONAL", state: "Odisha", iataCode: "BBI", unLocode: "INBBI", airCargo: true },
    { name: "Patna — Jay Prakash Narayan Airport (PAT / INPAT), IN", persian: "میدان هوایی پتنه، هند", country: "India", code: "PAT", locationType: "AIRPORT_CUSTOMS", state: "Bihar", iataCode: "PAT", unLocode: "INPAT" },
    { name: "Raipur — Swami Vivekananda Airport (RPR / INRPR), IN", persian: "میدان هوایی رایپور، هند", country: "India", code: "RPR", locationType: "AIRPORT_DOMESTIC", state: "Chhattisgarh", iataCode: "RPR", unLocode: "INRPR" },
    { name: "Srinagar International Airport (SXR / INSXR), IN", persian: "میدان هوایی بین‌المللی سرینگر (کشمیر)، هند", country: "India", code: "SXR", locationType: "AIRPORT_INTERNATIONAL", state: "Jammu and Kashmir", iataCode: "SXR", unLocode: "INSXR", airCargo: true },
    { name: "Nagpur — Dr. Babasaheb Ambedkar Intl Airport (NAG / INNAG), IN", persian: "میدان هوایی بین‌المللی ناگپور (MIHAN)، هند", country: "India", code: "NAG", locationType: "AIRPORT_INTERNATIONAL", state: "Maharashtra", iataCode: "NAG", unLocode: "INNAG", airCargo: true },
    { name: "Chandigarh International Airport (IXC / INIXC), IN", persian: "میدان هوایی بین‌المللی چندیگر، هند", country: "India", code: "IXC", locationType: "AIRPORT_CUSTOMS", state: "Punjab / Chandigarh", iataCode: "IXC", unLocode: "INIXC", airCargo: true },
    { name: "Port Blair — Veer Savarkar Intl Airport (IXZ / INIXZ), IN", persian: "میدان هوایی پورت بلیر (جزایر آندامان)، هند", country: "India", code: "IXZ", locationType: "AIRPORT_INTERNATIONAL", state: "Andaman and Nicobar", iataCode: "IXZ", unLocode: "INIXZ" },
    { name: "Bagdogra Airport (IXB / INIXB), West Bengal, IN", persian: "میدان هوایی باگدوگرا (سیلیگوری)، هند", country: "India", code: "IXB", locationType: "AIRPORT_CUSTOMS", state: "West Bengal", iataCode: "IXB", unLocode: "INIXB" },
    { name: "Gaya International Airport (GAY / INGAY), IN", persian: "میدان هوایی بین‌المللی گایا، هند", country: "India", code: "GAY", locationType: "AIRPORT_INTERNATIONAL", state: "Bihar", iataCode: "GAY", unLocode: "INGAY" },
    { name: "Madurai Airport (IXM / INIXM), IN", persian: "میدان هوایی مادورای، هند", country: "India", code: "IXM", locationType: "AIRPORT_CUSTOMS", state: "Tamil Nadu", iataCode: "IXM", unLocode: "INIXM", airCargo: true },
    { name: "Coimbatore International Airport (CJB / INCJB), IN", persian: "میدان هوایی بین‌المللی کویمباتور، هند", country: "India", code: "CJB", locationType: "AIRPORT_INTERNATIONAL", state: "Tamil Nadu", iataCode: "CJB", unLocode: "INCJB", airCargo: true },
    { name: "Surat International Airport (STV / INSTV), IN", persian: "میدان هوایی بین‌المللی سورت، هند", country: "India", code: "STV", locationType: "AIRPORT_INTERNATIONAL", state: "Gujarat", iataCode: "STV", unLocode: "INSTV", airCargo: true },
    { name: "Tirupati International Airport (TIR / INTIR), IN", persian: "میدان هوایی بین‌المللی تیروپاتی، هند", country: "India", code: "TIR", locationType: "AIRPORT_INTERNATIONAL", state: "Andhra Pradesh", iataCode: "TIR", unLocode: "INTIR" },
    { name: "Vijayawada International Airport (VGA / INVGA), IN", persian: "میدان هوایی بین‌المللی ویجیاوادا، هند", country: "India", code: "VGA", locationType: "AIRPORT_INTERNATIONAL", state: "Andhra Pradesh", iataCode: "VGA", unLocode: "INVGA", airCargo: true },
    { name: "Visakhapatnam International Airport (VTZ / INVTZ), IN", persian: "میدان هوایی بین‌المللی ویساکاپاتنام، هند", country: "India", code: "VTZ-AIR", locationType: "AIRPORT_INTERNATIONAL", state: "Andhra Pradesh", iataCode: "VTZ", unLocode: "INVTZ", airCargo: true },
    { name: "Indore — Devi Ahilya Bai Holkar Intl Airport (IDR / INIDR), IN", persian: "میدان هوایی بین‌المللی ایندور، هند", country: "India", code: "IDR", locationType: "AIRPORT_INTERNATIONAL", state: "Madhya Pradesh", iataCode: "IDR", unLocode: "INIDR", airCargo: true },

    // 🇮🇳 INDIA — OPERATIONAL DOMESTIC CARGO & CIVIL AIRPORTS
    { name: "Agartala Airport (MBB / IXA), Tripura, IN", persian: "میدان هوایی آگارتالا، هند", country: "India", code: "IXA", locationType: "AIRPORT_DOMESTIC", state: "Tripura", iataCode: "IXA" },
    { name: "Agatti Airport (AGX), Lakshadweep, IN", persian: "میدان هوایی آگاتی (لاکشادویپ)، هند", country: "India", code: "AGX", locationType: "AIRPORT_DOMESTIC", state: "Lakshadweep", iataCode: "AGX" },
    { name: "Aurangabad Airport (IXU), Maharashtra, IN", persian: "میدان هوایی اورنگ‌آباد (سامباجی‌نگر)، هند", country: "India", code: "IXU", locationType: "AIRPORT_DOMESTIC", state: "Maharashtra", iataCode: "IXU" },
    { name: "Bhopal — Raja Bhoj Airport (BHO), MP, IN", persian: "میدان هوایی راجا بوج (بوپال)، هند", country: "India", code: "BHO", locationType: "AIRPORT_DOMESTIC", state: "Madhya Pradesh", iataCode: "BHO" },
    { name: "Dehradun — Jolly Grant Airport (DED), Uttarakhand, IN", persian: "میدان هوایی دهرادون، هند", country: "India", code: "DED", locationType: "AIRPORT_DOMESTIC", state: "Uttarakhand", iataCode: "DED" },
    { name: "Dibrugarh Airport (DIB), Assam, IN", persian: "میدان هوایی دیبروگار، هند", country: "India", code: "DIB", locationType: "AIRPORT_DOMESTIC", state: "Assam", iataCode: "DIB" },
    { name: "Dimapur Airport (DMU), Nagaland, IN", persian: "میدان هوایی دیماپور، هند", country: "India", code: "DMU", locationType: "AIRPORT_DOMESTIC", state: "Nagaland", iataCode: "DMU" },
    { name: "Hubballi Airport (HBX), Karnataka, IN", persian: "میدان هوایی هوبلی، هند", country: "India", code: "HBX", locationType: "AIRPORT_DOMESTIC", state: "Karnataka", iataCode: "HBX" },
    { name: "Imphal — Bir Tikendrajit Airport (IMF), Manipur, IN", persian: "میدان هوایی ایمفال، هند", country: "India", code: "IMF", locationType: "AIRPORT_DOMESTIC", state: "Manipur", iataCode: "IMF" },
    { name: "Jabalpur Airport (JLR), MP, IN", persian: "میدان هوایی جبل‌پور، هند", country: "India", code: "JLR", locationType: "AIRPORT_DOMESTIC", state: "Madhya Pradesh", iataCode: "JLR" },
    { name: "Jaisalmer Airport (JSA), Rajasthan, IN", persian: "میدان هوایی جیسلمیر، هند", country: "India", code: "JSA", locationType: "AIRPORT_DOMESTIC", state: "Rajasthan", iataCode: "JSA" },
    { name: "Jammu Airport (IXJ), J&K, IN", persian: "میدان هوایی جمو، هند", country: "India", code: "IXJ", locationType: "AIRPORT_DOMESTIC", state: "Jammu and Kashmir", iataCode: "IXJ" },
    { name: "Jodhpur Airport (JDH), Rajasthan, IN", persian: "میدان هوایی جودپور، هند", country: "India", code: "JDH", locationType: "AIRPORT_DOMESTIC", state: "Rajasthan", iataCode: "JDH" },
    { name: "Kanpur Airport (KNU / Chakeri), UP, IN", persian: "میدان هوایی کانپور، هند", country: "India", code: "KNU", locationType: "AIRPORT_DOMESTIC", state: "Uttar Pradesh", iataCode: "KNU" },
    { name: "Khajuraho Airport (HJR), MP, IN", persian: "میدان هوایی خاجوراهو، هند", country: "India", code: "HJR", locationType: "AIRPORT_DOMESTIC", state: "Madhya Pradesh", iataCode: "HJR" },
    { name: "Kullu Manali Airport (KUU / Bhuntar), HP, IN", persian: "میدان هوایی کولو مانالی، هند", country: "India", code: "KUU", locationType: "AIRPORT_DOMESTIC", state: "Himachal Pradesh", iataCode: "KUU" },
    { name: "Leh — Kushok Bakula Rimpochee Airport (IXL), Ladakh, IN", persian: "میدان هوایی لیه (لداخ)، هند", country: "India", code: "IXL", locationType: "AIRPORT_DOMESTIC", state: "Ladakh", iataCode: "IXL" },
    { name: "Lilabari Airport (IXI), Assam, IN", persian: "میدان هوایی لیلاباری، هند", country: "India", code: "IXI", locationType: "AIRPORT_DOMESTIC", state: "Assam", iataCode: "IXI" },
    { name: "Ludhiana — Sahnewal Airport (LUH), Punjab, IN", persian: "میدان هوایی لودیانا، هند", country: "India", code: "LUH", locationType: "AIRPORT_DOMESTIC", state: "Punjab", iataCode: "LUH" },
    { name: "Mysuru — Mandakalli Airport (MYQ), Karnataka, IN", persian: "میدان هوایی میسور، هند", country: "India", code: "MYQ", locationType: "AIRPORT_DOMESTIC", state: "Karnataka", iataCode: "MYQ" },
    { name: "Pantnagar Airport (PGH), Uttarakhand, IN", persian: "میدان هوایی پنت‌نگر، هند", country: "India", code: "PGH", locationType: "AIRPORT_DOMESTIC", state: "Uttarakhand", iataCode: "PGH" },
    { name: "Pondicherry Airport (PNY), Puducherry, IN", persian: "میدان هوایی پوندیچری، هند", country: "India", code: "PNY", locationType: "AIRPORT_DOMESTIC", state: "Puducherry", iataCode: "PNY" },
    { name: "Porbandar Airport (PBD), Gujarat, IN", persian: "میدان هوایی پوربندر، هند", country: "India", code: "PBD", locationType: "AIRPORT_DOMESTIC", state: "Gujarat", iataCode: "PBD" },
    { name: "Rajahmundry Airport (RJA), AP, IN", persian: "میدان هوایی راجاهموندری، هند", country: "India", code: "RJA", locationType: "AIRPORT_DOMESTIC", state: "Andhra Pradesh", iataCode: "RJA" },
    { name: "Rajkot International Airport (Hirasar / HSR), Gujarat, IN", persian: "میدان هوایی بین‌المللی راجکوت (هیراسار)، هند", country: "India", code: "HSR", locationType: "AIRPORT_DOMESTIC", state: "Gujarat", iataCode: "HSR" },
    { name: "Ranchi — Birsa Munda Airport (IXR), Jharkhand, IN", persian: "میدان هوایی رانچی، هند", country: "India", code: "IXR", locationType: "AIRPORT_DOMESTIC", state: "Jharkhand", iataCode: "IXR" },
    { name: "Shillong — Umroi Airport (SHL), Meghalaya, IN", persian: "میدان هوایی شیلانگ، هند", country: "India", code: "SHL", locationType: "AIRPORT_DOMESTIC", state: "Meghalaya", iataCode: "SHL" },
    { name: "Shimla Airport (SLV / Jubbarhatti), HP, IN", persian: "میدان هوایی شیملا، هند", country: "India", code: "SLV", locationType: "AIRPORT_DOMESTIC", state: "Himachal Pradesh", iataCode: "SLV" },
    { name: "Shirdi Airport (SAG), Maharashtra, IN", persian: "میدان هوایی شیردی، هند", country: "India", code: "SAG", locationType: "AIRPORT_DOMESTIC", state: "Maharashtra", iataCode: "SAG" },
    { name: "Tezpur Airport (TEZ), Assam, IN", persian: "میدان هوایی تزپور، هند", country: "India", code: "TEZ", locationType: "AIRPORT_DOMESTIC", state: "Assam", iataCode: "TEZ" },
    { name: "Tezu Airport (TEI), Arunachal Pradesh, IN", persian: "میدان هوایی تزو، هند", country: "India", code: "TEI", locationType: "AIRPORT_DOMESTIC", state: "Arunachal Pradesh", iataCode: "TEI" },
    { name: "Udaipur — Maharana Pratap Airport (UDR), Rajasthan, IN", persian: "میدان هوایی اودیپور، هند", country: "India", code: "UDR", locationType: "AIRPORT_DOMESTIC", state: "Rajasthan", iataCode: "UDR" },
    { name: "Vadodara Airport (BDQ), Gujarat, IN", persian: "میدان هوایی وادودارا، هند", country: "India", code: "BDQ", locationType: "AIRPORT_DOMESTIC", state: "Gujarat", iataCode: "BDQ" },

    // 🇮🇳 INDIA — INLAND CONTAINER DEPOTS (ICD) & RAIL CONTAINER TERMINALS (CONCOR)
    { name: "ICD Tughlakabad (TKD / CONCOR Delhi), IN", persian: "پایانه کانتینری خشکی توغلق‌آباد دهلی (بزرگترین ICD هند)", country: "India", code: "INTKD", locationType: "ICD", state: "Delhi", customsCode: "INTKD6", unLocode: "INTKD", containerEnabled: true, railConnected: true, cargoEnabled: true },
    { name: "ICD Dadri (DER / CONCOR Greater Noida), UP, IN", persian: "پایانه کانتینری دادری (نویدا / DFC)، هند", country: "India", code: "INDER", locationType: "ICD", state: "Uttar Pradesh", customsCode: "INDER6", containerEnabled: true, railConnected: true, cargoEnabled: true },
    { name: "ICD Patparganj (PPG / East Delhi), IN", persian: "پایانه کانتینری پتپرگنج دهلی، هند", country: "India", code: "INPPG", locationType: "ICD", state: "Delhi", customsCode: "INPPG6", containerEnabled: true },
    { name: "ICD Garhi Harsaru (GHR / Gateway Distriparks Gurugram), Haryana, IN", persian: "پایانه کانتینری گارهی هارسارو (گورگان)، هند", country: "India", code: "INGHR", locationType: "ICD", state: "Haryana", customsCode: "INGHR6", containerEnabled: true, railConnected: true },
    { name: "ICD Rewari (CONCOR Haryana), IN", persian: "پایانه کانتینری ریواری، هند", country: "India", code: "INREW", locationType: "ICD", state: "Haryana", containerEnabled: true, railConnected: true },
    { name: "ICD Kanakpura (KNK / CONCOR Jaipur), Rajasthan, IN", persian: "پایانه کانتینری کاناکپورا (جیپور)، هند", country: "India", code: "INKNK", locationType: "ICD", state: "Rajasthan", customsCode: "INKNK6", containerEnabled: true, railConnected: true },
    { name: "ICD Sabarmati / Khodiyar (SBI / CONCOR Ahmedabad), Gujarat, IN", persian: "پایانه کانتینری سابرماتی (احمدآباد)، هند", country: "India", code: "INSBI", locationType: "ICD", state: "Gujarat", customsCode: "INSBI6", containerEnabled: true, railConnected: true },
    { name: "ICD Ludhiana (LDH / Dhandari Kalan CONCOR), Punjab, IN", persian: "پایانه کانتینری لودیانا (دانداری کالان پنجاب)، هند", country: "India", code: "INLDH", locationType: "ICD", state: "Punjab", customsCode: "INLDH6", containerEnabled: true, railConnected: true },
    { name: "ICD Amritsar / Khasa (ASR / CONCOR Punjab), IN", persian: "پایانه کانتینری امریتسر (خاسا)، هند", country: "India", code: "INASR", locationType: "ICD", state: "Punjab", customsCode: "INASR6", containerEnabled: true, railConnected: true },
    { name: "ICD Jaipur / Sanganer, Rajasthan, IN", persian: "پایانه کانتینری سانگانر (جیپور)، هند", country: "India", code: "INJAI6", locationType: "ICD", state: "Rajasthan", customsCode: "INJAI6", containerEnabled: true },
    { name: "ICD Moradabad (MBD / CONCOR UP), IN", persian: "پایانه کانتینری مرادآباد، هند", country: "India", code: "INMBD", locationType: "ICD", state: "Uttar Pradesh", customsCode: "INMBD6", containerEnabled: true, railConnected: true },
    { name: "ICD Kanpur / JRY (Juhi / Chakeri), UP, IN", persian: "پایانه کانتینری کانپور (JRY)، هند", country: "India", code: "INCPC", locationType: "ICD", state: "Uttar Pradesh", customsCode: "INCPC6", containerEnabled: true, railConnected: true },
    { name: "ICD Agra / Jhandi, UP, IN", persian: "پایانه کانتینری آگرا، هند", country: "India", code: "INAGR", locationType: "ICD", state: "Uttar Pradesh", customsCode: "INAGR6", containerEnabled: true },
    { name: "ICD Nagpur / Butibori & MIHAN, MH, IN", persian: "پایانه کانتینری ناگپور (بوتیبوری)، هند", country: "India", code: "INNAG6", locationType: "ICD", state: "Maharashtra", customsCode: "INNAG6", containerEnabled: true, railConnected: true },
    { name: "ICD Pithampur / Dhannad (Indore), MP, IN", persian: "پایانه کانتینری پیتامپور (ایندور)، هند", country: "India", code: "INPTI", locationType: "ICD", state: "Madhya Pradesh", customsCode: "INPTI6", containerEnabled: true, railConnected: true },
    { name: "ICD Raipur / Mandir Hasaud, Chhattisgarh, IN", persian: "پایانه کانتینری رایپور، هند", country: "India", code: "INRPR6", locationType: "ICD", state: "Chhattisgarh", customsCode: "INRPR6", containerEnabled: true, railConnected: true },
    { name: "ICD Sanathnagar / Hyderabad (SNF / CONCOR), Telangana, IN", persian: "پایانه کانتینری سنات‌نگر حیدرآباد، هند", country: "India", code: "INSNF", locationType: "ICD", state: "Telangana", customsCode: "INSNF6", containerEnabled: true, railConnected: true },
    { name: "ICD Whitefield / Bengaluru (WFD / CONCOR), Karnataka, IN", persian: "پایانه کانتینری وایت‌فیلد بنگلور، هند", country: "India", code: "INWFD", locationType: "ICD", state: "Karnataka", customsCode: "INWFD6", containerEnabled: true, railConnected: true },
    { name: "ICD Tondiarpet / Chennai (TNP / CONCOR), Tamil Nadu, IN", persian: "پایانه کانتینری تون‌دیارپت چنای، هند", country: "India", code: "INTNP", locationType: "ICD", state: "Tamil Nadu", customsCode: "INTNP6", containerEnabled: true, railConnected: true },
    { name: "ICD Irugur / Coimbatore (IGU / CONCOR), Tamil Nadu, IN", persian: "پایانه کانتینری ایروگور (کویمباتور)، هند", country: "India", code: "INIGU", locationType: "ICD", state: "Tamil Nadu", customsCode: "INIGU6", containerEnabled: true, railConnected: true },
    { name: "ICD Cossipore / Kolkata (CONCOR), West Bengal, IN", persian: "پایانه کانتینری کوسیپور کلکته، هند", country: "India", code: "INCOSI", locationType: "ICD", state: "West Bengal", containerEnabled: true, railConnected: true },

    // 🇮🇳 INDIA — CONTAINER FREIGHT STATIONS (CFS GATEWAYS)
    { name: "CFS Dronagiri Node (Nhava Sheva / JNPT), Maharashtra, IN", persian: "ایستگاه بارانداز کانتینری درونازیری (نهاوا شوا)، هند", country: "India", code: "CFS-DRN", locationType: "CFS", state: "Maharashtra", district: "Navi Mumbai", containerEnabled: true, roadConnected: true },
    { name: "CFS Seabird Marine Services (Nhava Sheva), Maharashtra, IN", persian: "پایانه بار کانتینری سی‌برد (نهاوا شوا ممبئی)، هند", country: "India", code: "CFS-SBD", locationType: "CFS", state: "Maharashtra", district: "Navi Mumbai", containerEnabled: true },
    { name: "CFS Allcargo Logistics Park (JNPT), Maharashtra, IN", persian: "پارک لجستیک آل‌کارگو (نهاوا شوا)، هند", country: "India", code: "CFS-ACG", locationType: "CFS", state: "Maharashtra", district: "Navi Mumbai", containerEnabled: true },
    { name: "CFS Gateway Distriparks (Nhava Sheva), Maharashtra, IN", persian: "ایستگاه کانتینری گیت‌وی (نهاوا شوا)، هند", country: "India", code: "CFS-GDL", locationType: "CFS", state: "Maharashtra", district: "Navi Mumbai", containerEnabled: true },
    { name: "CFS Adani Logistics (Mundra SEZ), Gujarat, IN", persian: "ایستگاه بار کانتینری آدانی (موندرا)، هند", country: "India", code: "CFS-ADL", locationType: "CFS", state: "Gujarat", district: "Kutch", containerEnabled: true },
    { name: "CFS CWC Mundra, Gujarat, IN", persian: "انبار مرکزی بار کانتینری موندرا، هند", country: "India", code: "CFS-CWC", locationType: "CFS", state: "Gujarat", district: "Kutch", containerEnabled: true },
    { name: "CFS Kandla (CWC / Gandhidham), Gujarat, IN", persian: "ایستگاه کانتینری گاندی‌دام / کاندلا، هند", country: "India", code: "CFS-KDL", locationType: "CFS", state: "Gujarat", district: "Kutch", containerEnabled: true },
    { name: "CFS Manali / Thiruvottiyur (Chennai Port), Tamil Nadu, IN", persian: "ایستگاه کانتینری منالی چنای، هند", country: "India", code: "CFS-MNL", locationType: "CFS", state: "Tamil Nadu", district: "Chennai", containerEnabled: true },
    { name: "CFS Sattva Logistics (Chennai / Kattupalli), Tamil Nadu, IN", persian: "ایستگاه کانتینری ساتوا (چنای)، هند", country: "India", code: "CFS-STV", locationType: "CFS", state: "Tamil Nadu", district: "Tiruvallur", containerEnabled: true },
    { name: "CFS Tuticorin (St. John / Pearl City), Tamil Nadu, IN", persian: "ایستگاه کانتینری توتیکورین، هند", country: "India", code: "CFS-TUT", locationType: "CFS", state: "Tamil Nadu", district: "Thoothukudi", containerEnabled: true },
    { name: "CFS Vallarpadam / Willingdon Island (Cochin), Kerala, IN", persian: "ایستگاه کانتینری کوچین، هند", country: "India", code: "CFS-COK", locationType: "CFS", state: "Kerala", district: "Ernakulam", containerEnabled: true },
    { name: "CFS Haldia / Kolkata Dock (Balmer Lawrie / CWC), WB, IN", persian: "ایستگاه بار کانتینری هالدیا کلکته، هند", country: "India", code: "CFS-HLD", locationType: "CFS", state: "West Bengal", district: "Purba Medinipur", containerEnabled: true },
    { name: "CFS Visakhapatnam (VPA / CONCOR CFS), AP, IN", persian: "ایستگاه کانتینری ویزگ، هند", country: "India", code: "CFS-VTZ", locationType: "CFS", state: "Andhra Pradesh", district: "Visakhapatnam", containerEnabled: true },

    // 🇮🇳 INDIA — INLAND WATERWAYS & MULTIMODAL TERMINALS (IWAI)
    { name: "Varanasi Multimodal Terminal (MMT Varanasi / NW-1), UP, IN", persian: "پایانه چندوجهی آبراه ملی ۱ واراناسی (گنگ)، هند", country: "India", code: "INVAR-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Uttar Pradesh", district: "Varanasi", inlandWaterway: true, railConnected: true, roadConnected: true, cargoEnabled: true },
    { name: "Sahibganj Multimodal Terminal (MMT Sahibganj / NW-1), Jharkhand, IN", persian: "پایانه آبراه چندوجهی صاحب‌گنج (گنگ)، هند", country: "India", code: "INSBG-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Jharkhand", district: "Sahibganj", inlandWaterway: true, railConnected: true, roadConnected: true, cargoEnabled: true },
    { name: "Haldia Multimodal Terminal (MMT Haldia / NW-1), WB, IN", persian: "پایانه چندوجهی آبراه هالدیا (هوگلی)، هند", country: "India", code: "INHAL-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "West Bengal", district: "Purba Medinipur", inlandWaterway: true, railConnected: true, roadConnected: true, cargoEnabled: true },
    { name: "Kalughat Intermodal Terminal (Saran / NW-1), Bihar, IN", persian: "پایانه آبراه کلوگهات (ساران / بهار)، هند", country: "India", code: "INKAL-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Bihar", district: "Saran", inlandWaterway: true, containerEnabled: true, roadConnected: true },
    { name: "Gaighat Cargo Terminal (Patna / NW-1), Bihar, IN", persian: "پایانه باربری گای‌گهات پتنه (آبراه گنگ)، هند", country: "India", code: "INPAT-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Bihar", district: "Patna", inlandWaterway: true, cargoEnabled: true },
    { name: "Farakka Navigational Lock & Terminal (NW-1), WB, IN", persian: "پایانه و سد آبراه فاراکا، هند", country: "India", code: "INFRK-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "West Bengal", district: "Murshidabad", inlandWaterway: true },
    { name: "Pandu Multimodal Terminal (Guwahati / NW-2), Assam, IN", persian: "پایانه چندوجهی پاندو گواتی (آبراه براهماپوترا)، هند", country: "India", code: "INGAU-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Assam", district: "Kamrup", inlandWaterway: true, railConnected: true, roadConnected: true },
    { name: "Dhubri River Terminal (NW-2), Assam, IN", persian: "پایانه رودخانه‌ای دوبری (مرز بنگلادش)، هند", country: "India", code: "INDHB-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Assam", district: "Dhubri", borderCountry: "Bangladesh", inlandWaterway: true, isBorder: true },
    { name: "Jogighopa Multimodal Logistics Park (MMLP / NW-2), Assam, IN", persian: "پارک لجستیک چندوجهی جوگیگوپا، هند", country: "India", code: "INJGH-MMT", locationType: "MULTIMODAL_TERMINAL", state: "Assam", district: "Bongaigaon", inlandWaterway: true, railConnected: true, roadConnected: true },
    { name: "Prayagraj Terminal (Allahabad / NW-1), UP, IN", persian: "پایانه آبراه پرایاگ‌راج (الله‌آباد)، هند", country: "India", code: "INPRG-MMT", locationType: "INLAND_WATERWAY_TERMINAL", state: "Uttar Pradesh", district: "Prayagraj", inlandWaterway: true },

    // Indian Subcontinent Neighbours
    { name: "Colombo Port, LK", persian: "بندر کلمبو، سری‌لانکا", country: "Sri Lanka", code: "CMB", isPort: true, portName: "Port of Colombo" },
    { name: "Chittagong Port, BD", persian: "بندر چتاگانگ، بنگلادش", country: "Bangladesh", code: "CGP", isPort: true, portName: "Chittagong Port" },

    // China & East Asia
    { name: "Shanghai Port (Yangshan), CN", persian: "بندر شانگهای، چین", country: "China", code: "SHA", isPort: true, portName: "Shanghai Port" },
    { name: "Ningbo-Zhoushan Port, CN", persian: "بندر نینگبو، چین", country: "China", code: "NBO", isPort: true, portName: "Ningbo-Zhoushan Port" },
    { name: "Shenzhen (Yantian/Shekou), CN", persian: "بندر شنژن (یانتیان)، چین", country: "China", code: "SZX", isPort: true, portName: "Shenzhen Port" },
    { name: "Guangzhou Port (Nansha), CN", persian: "بندر گوانجو (نانشا)، چین", country: "China", code: "GZU", isPort: true, portName: "Guangzhou Port" },
    { name: "Qingdao Port, CN", persian: "بندر چینگدائو، چین", country: "China", code: "TAO", isPort: true, portName: "Qingdao Port" },
    { name: "Tianjin Port, CN", persian: "بندر تیانجین، چین", country: "China", code: "TSN", isPort: true, portName: "Tianjin Port" },
    { name: "Xiamen Port, CN", persian: "بندر شیامن، چین", country: "China", code: "XMN", isPort: true, portName: "Xiamen Port" },
    { name: "Hong Kong Port, HK", persian: "بندر هنگ کنگ", country: "China", code: "HKG", isPort: true, portName: "Port of Hong Kong" },
    { name: "Busan Port, KR", persian: "بندر بوسان، کوریای جنوبی", country: "South Korea", code: "PUS", isPort: true, portName: "Busan Port" },
    { name: "Incheon Port, KR", persian: "بندر اینچئون، کوریای جنوبی", country: "South Korea", code: "ICN", isPort: true, portName: "Incheon Port" },
    { name: "Tokyo / Yokohama Port, JP", persian: "بندر توکیو / یوکوهاما، جاپان", country: "Japan", code: "TYO", isPort: true, portName: "Tokyo / Yokohama Port" },
    { name: "Kobe Port, JP", persian: "بندر کوبه، جاپان", country: "Japan", code: "UKB", isPort: true, portName: "Kobe Port" },

    // Southeast Asia
    { name: "Singapore Port (PSA), SG", persian: "بندر سنگاپور", country: "Singapore", code: "SIN", isPort: true, portName: "Port of Singapore" },
    { name: "Port Klang, MY", persian: "بندر کلانگ، مالزی", country: "Malaysia", code: "PKG", isPort: true, portName: "Port Klang" },
    { name: "Tanjung Pelepas Port, MY", persian: "بندر تانجونگ پلپاس، مالزی", country: "Malaysia", code: "TPP", isPort: true, portName: "Port of Tanjung Pelepas" },
    { name: "Laem Chabang Port, TH", persian: "بندر لئم چابانگ، تایلند", country: "Thailand", code: "LCH", isPort: true, portName: "Laem Chabang Port" },
    { name: "Bangkok Port, TH", persian: "بندر بانکوک، تایلند", country: "Thailand", code: "BKK", isPort: true, portName: "Bangkok Port" },
    { name: "Tanjung Priok (Jakarta), ID", persian: "بندر جاکارتا، اندونزیا", country: "Indonesia", code: "JKT", isPort: true, portName: "Tanjung Priok Port" },
    { name: "Manila Port, PH", persian: "بندر مانیل، فیلیپین", country: "Philippines", code: "MNL", isPort: true, portName: "Port of Manila" },
    { name: "Hai Phong Port, VN", persian: "بندر های فونگ، ویتنام", country: "Vietnam", code: "HPH", isPort: true, portName: "Hai Phong Port" },
    { name: "Cai Mep Port (Vung Tau), VN", persian: "بندر کای مپ، ویتنام", country: "Vietnam", code: "VUT", isPort: true, portName: "Cai Mep Port" },

    // Turkey - Ports & Cities
    { name: "Mersin Port, TR", persian: "بندر مرسین، ترکیه", country: "Turkey", code: "MRS", isPort: true, portName: "Mersin International Port" },
    { name: "Ambarli Port (Istanbul), TR", persian: "بندر امبارلی، استانبول", country: "Turkey", code: "AMB", isPort: true, portName: "Ambarli Port" },
    { name: "Izmir Port, TR", persian: "بندر ازمیر، ترکیه", country: "Turkey", code: "IZM", isPort: true, portName: "Izmir Port" },
    { name: "Iskenderun Port, TR", persian: "بندر اسکندرون، ترکیه", country: "Turkey", code: "ISK", isPort: true, portName: "Iskenderun Port" },
    { name: "Samsun Port, TR", persian: "بندر سامسون، ترکیه", country: "Turkey", code: "SAS", isPort: true, portName: "Samsun Port" },
    { name: "Trabzon Port, TR", persian: "بندر ترابزون، ترکیه", country: "Turkey", code: "TRB", isPort: true, portName: "Trabzon Port" },
    { name: "Istanbul, TR", persian: "استانبول، ترکیه", country: "Turkey", code: "IST" },
    { name: "Ankara, TR", persian: "آنکارا، ترکیه", country: "Turkey", code: "ANK" },
    { name: "Gaziantep, TR", persian: "غازی‌عینتاب، ترکیه", country: "Turkey", code: "GZT" },

    // 🇺🇿 UZBEKISTAN — AIRPORTS, RIVER PORTS, ICD & BORDER LOGISTICS
    { name: "Tashkent — Islam Karimov Intl Airport (TAS / UTTT), UZ", persian: "میدان هوایی بین‌المللی تاشکند (اسلام کریموف)، ازبکستان", country: "Uzbekistan", code: "TAS", locationType: "AIRPORT_INTERNATIONAL", state: "Tashkent", iataCode: "TAS", unLocode: "UZTAS", airCargo: true, cargoEnabled: true },
    { name: "Navoi International Airport (NVI / UTSA Cargo Hub), UZ", persian: "میدان هوایی بین‌المللی ناوی (بزرگترین هاب کارگو هوایی آسیای مرکزی)، ازبکستان", country: "Uzbekistan", code: "NVI", locationType: "AIRPORT_INTERNATIONAL", state: "Navoiy", iataCode: "NVI", unLocode: "UZNVI", airCargo: true, cargoEnabled: true },
    { name: "Termez International River Port (TICC / Amu Darya), UZ", persian: "بندر بین‌المللی رودخانه‌ای ترمذ (مرکز لجستیک آمودریا / مرز حیرتان)، ازبکستان", country: "Uzbekistan", code: "TMZ-PORT", isPort: true, portName: "Termez International River Port (TICC)", locationType: "INLAND_WATERWAY_TERMINAL", state: "Surxondaryo", district: "Termez", borderCountry: "Afghanistan", isBorder: true, inlandWaterway: true, railConnected: true, roadConnected: true, containerEnabled: true, cargoEnabled: true },
    { name: "Termez International Airport (TMZ / UTST), UZ", persian: "میدان هوایی بین‌المللی ترمذ (مرز افغانستان)، ازبکستان", country: "Uzbekistan", code: "TMZ", locationType: "AIRPORT_INTERNATIONAL", state: "Surxondaryo", iataCode: "TMZ", unLocode: "UZTMZ", borderCountry: "Afghanistan", isBorder: true, airCargo: true },
    { name: "Samarkand International Airport (SKD / UTSS), UZ", persian: "میدان هوایی بین‌المللی سمرقند (Air Marakanda)، ازبکستان", country: "Uzbekistan", code: "SKD", locationType: "AIRPORT_INTERNATIONAL", state: "Samarkand", iataCode: "SKD", unLocode: "UZSKD", airCargo: true },
    { name: "Bukhara International Airport (BHK / UTSB), UZ", persian: "میدان هوایی بین‌المللی بخارا، ازبکستان", country: "Uzbekistan", code: "BHK", locationType: "AIRPORT_INTERNATIONAL", state: "Bukhara", iataCode: "BHK", unLocode: "UZBHK", airCargo: true },
    { name: "Andijan International Airport (AZN / UTKA), UZ", persian: "میدان هوایی بین‌المللی اندیجان، ازبکستان", country: "Uzbekistan", code: "AZN", locationType: "AIRPORT_INTERNATIONAL", state: "Andijan", iataCode: "AZN", unLocode: "UZAZN", airCargo: true },
    { name: "Fergana International Airport (FEG / UTKF), UZ", persian: "میدان هوایی بین‌المللی فرغانه، ازبکستان", country: "Uzbekistan", code: "FEG", locationType: "AIRPORT_INTERNATIONAL", state: "Fergana", iataCode: "FEG", unLocode: "UZFEG", airCargo: true },
    { name: "Namangan International Airport (NMA / UTKN), UZ", persian: "میدان هوایی بین‌المللی نمنگان، ازبکستان", country: "Uzbekistan", code: "NMA", locationType: "AIRPORT_INTERNATIONAL", state: "Namangan", iataCode: "NMA", unLocode: "UZNMA", airCargo: true },
    { name: "Urgench International Airport (UGC / UTNU), UZ", persian: "میدان هوایی بین‌المللی اورگنچ (خوارزم)، ازبکستان", country: "Uzbekistan", code: "UGC", locationType: "AIRPORT_INTERNATIONAL", state: "Khorezm", iataCode: "UGC", unLocode: "UZUGC", airCargo: true },
    { name: "Nukus Airport (NCU / UTNN), UZ", persian: "میدان هوایی نوکوس (قره‌قالپاقستان)، ازبکستان", country: "Uzbekistan", code: "NCU", locationType: "AIRPORT_DOMESTIC", state: "Karakalpakstan", iataCode: "NCU", unLocode: "UZNCU" },
    { name: "Chukursay Container Terminal (Tashkent ICD / Rail Hub), UZ", persian: "پایانه کانتینری ریل چوقورسای تاشکند (بزرگترین هاب ریلی کانتینری ازبکستان)", country: "Uzbekistan", code: "CHUKUR", locationType: "ICD", state: "Tashkent", railConnected: true, containerEnabled: true, cargoEnabled: true },
    { name: "Sergeli Logistics Center (Tashkent Customs Hub), UZ", persian: "مرکز لجستیک و گمرک سرگیلی تاشکند، ازبکستان", country: "Uzbekistan", code: "SERGELI", locationType: "LOGISTICS_HUB", state: "Tashkent", railConnected: true, containerEnabled: true },
    { name: "Angren Logistics Center (Tashkent Region Dry Port), UZ", persian: "پایانه کانتینری و مرکز لجستیک آنگرن، ازبکستان", country: "Uzbekistan", code: "ANGREN", locationType: "ICD", state: "Tashkent Region", railConnected: true, containerEnabled: true },
    { name: "Hairatan / Termez Friendship Bridge (Border Post), UZ", persian: "پل دوستی ترمذ / حیرتان (گذرگاه ریلی و جاده‌ای افغانستان و ازبکستان)", country: "Uzbekistan", code: "FRND-BRG", locationType: "INTEGRATED_CHECK_POST", state: "Surxondaryo", borderCountry: "Afghanistan", isBorder: true, railConnected: true, roadConnected: true },
    { name: "Alat / Farap Customs Border Crossing, UZ", persian: "گذرگاه مرزی آلات / فاراب (مرز ترکمنستان)، ازبکستان", country: "Uzbekistan", code: "ALAT", locationType: "CUSTOMS_BORDER", state: "Bukhara", borderCountry: "Turkmenistan", isBorder: true, roadConnected: true },
    { name: "Gisht Kuprik / Chernyaevka Customs Border, UZ", persian: "گذرگاه مرزی گیشت کوپریک (مرز قزاقستان)، ازبکستان", country: "Uzbekistan", code: "GISHT", locationType: "CUSTOMS_BORDER", state: "Tashkent Region", borderCountry: "Kazakhstan", isBorder: true, roadConnected: true },
    { name: "Dustlik / Andijan Customs Border, UZ", persian: "گذرگاه مرزی دوستلیک (مرز قرقیزستان)، ازبکستان", country: "Uzbekistan", code: "DSTLK", locationType: "CUSTOMS_BORDER", state: "Andijan", borderCountry: "Kyrgyzstan", isBorder: true, roadConnected: true },
    { name: "Oybek / Bekabad Customs Border, UZ", persian: "گذرگاه مرزی اویبیک (مرز تاجیکستان)، ازبکستان", country: "Uzbekistan", code: "OYBEK", locationType: "CUSTOMS_BORDER", state: "Tashkent Region", borderCountry: "Tajikistan", isBorder: true, roadConnected: true },
    { name: "Tashkent City (Central Logistics Hub), UZ", persian: "شهر تاشکند (مرکز ترانزیت و لجستیک)، ازبکستان", country: "Uzbekistan", code: "TSH", locationType: "LOGISTICS_HUB", state: "Tashkent", roadConnected: true, railConnected: true },
    { name: "Samarkand, UZ", persian: "سمرقند، ازبکستان", country: "Uzbekistan", code: "SMR", locationType: "LOGISTICS_HUB", state: "Samarkand" },
    { name: "Bukhara, UZ", persian: "بخارا، ازبکستان", country: "Uzbekistan", code: "BKH", locationType: "LOGISTICS_HUB", state: "Bukhara" },

    // Central Asia Neighbours
    { name: "Ashgabat, TM", persian: "عشق‌آباد، تركمنستان", country: "Turkmenistan", code: "ASH" },
    { name: "Turkmenbashi Port, TM", persian: "بندر ترکمن‌باشی، تركمنستان", country: "Turkmenistan", code: "TBH", isPort: true, portName: "Turkmenbashi Port" },
    { name: "Dushanbe, TJ", persian: "دوشنبه، تاجیکستان", country: "Tajikistan", code: "DSH" },
    { name: "Bishkek, KG", persian: "بیشکک، قرقیزستان", country: "Kyrgyzstan", code: "BSK" },
    { name: "Almaty, KZ", persian: "آلماتی، قزاقستان", country: "Kazakhstan", code: "ALA" },
    { name: "Aktau Port, KZ", persian: "بندر آکتائو (خزر)، قزاقستان", country: "Kazakhstan", code: "SCO", isPort: true, portName: "Aktau Port" },
    
    // Europe & Americas Major Ports
    { name: "Rotterdam Port, NL", persian: "بندر روتردام، هلند", country: "Netherlands", code: "RTM", isPort: true, portName: "Port of Rotterdam" },
    { name: "Antwerp-Bruges Port, BE", persian: "بندر آنتورپ، بلجیم", country: "Belgium", code: "ANR", isPort: true, portName: "Port of Antwerp-Bruges" },
    { name: "Hamburg Port, DE", persian: "بندر هامبورگ، آلمان", country: "Germany", code: "HAM", isPort: true, portName: "Port of Hamburg" },
    { name: "Bremerhaven Port, DE", persian: "بندر برمرهافن، آلمان", country: "Germany", code: "BRV", isPort: true, portName: "Port of Bremerhaven" },
    { name: "Valencia Port, ES", persian: "بندر والنسیا، اسپانیا", country: "Spain", code: "VLC", isPort: true, portName: "Port of Valencia" },
    { name: "Algeciras Port, ES", persian: "بندر الجسیراس، اسپانیا", country: "Spain", code: "ALG", isPort: true, portName: "Port of Algeciras" },
    { name: "Barcelona Port, ES", persian: "بندر بارسلونا، اسپانیا", country: "Spain", code: "BCN", isPort: true, portName: "Port of Barcelona" },
    { name: "Piraeus Port, GR", persian: "بندر پیرئوس (آتن)، یونان", country: "Greece", code: "PIR", isPort: true, portName: "Port of Piraeus" },
    { name: "Felixstowe Port, UK", persian: "بندر فلیکس‌استو، بریتانیا", country: "United Kingdom", code: "FXT", isPort: true, portName: "Port of Felixstowe" },
    { name: "Southampton Port, UK", persian: "بندر ساوت‌همپتون، بریتانیا", country: "United Kingdom", code: "SOU", isPort: true, portName: "Port of Southampton" },
    { name: "London Gateway, UK", persian: "بندر لندن گیت‌وی، بریتانیا", country: "United Kingdom", code: "LGP", isPort: true, portName: "London Gateway Port" },
    { name: "Le Havre Port, FR", persian: "بندر لو هاور، فرانسه", country: "France", code: "LEH", isPort: true, portName: "Port of Le Havre" },
    { name: "Marseille-Fos Port, FR", persian: "بندر مارسی، فرانسه", country: "France", code: "MRS", isPort: true, portName: "Port of Marseille-Fos" },
    { name: "Genoa Port, IT", persian: "بندر جنوا، ایتالیا", country: "Italy", code: "GOA", isPort: true, portName: "Port of Genoa" },
    { name: "Gdansk Port, PL", persian: "بندر گدانسک، پولند", country: "Poland", code: "GDN", isPort: true, portName: "Port of Gdansk" },
    { name: "Los Angeles Port, US", persian: "بندر لس آنجلس، امریکا", country: "USA", code: "LAX", isPort: true, portName: "Port of Los Angeles" },
    { name: "Long Beach Port, US", persian: "بندر لانگ بیچ، امریکا", country: "USA", code: "LGB", isPort: true, portName: "Port of Long Beach" },
    { name: "New York & New Jersey, US", persian: "بندر نیویورک، امریکا", country: "USA", code: "NYC", isPort: true, portName: "Port of New York & New Jersey" },
    { name: "Houston Port, US", persian: "بندر هیوستون، امریکا", country: "USA", code: "HOU", isPort: true, portName: "Port of Houston" },
    { name: "Savannah Port, US", persian: "بندر ساوانا، امریکا", country: "USA", code: "SAV", isPort: true, portName: "Port of Savannah" },
    { name: "Miami Port, US", persian: "بندر میامی، امریکا", country: "USA", code: "MIA", isPort: true, portName: "Port of Miami" },
    { name: "Vancouver Port, CA", persian: "بندر ونکوور، کانادا", country: "Canada", code: "VAN", isPort: true, portName: "Port of Vancouver" },
    { name: "Montreal Port, CA", persian: "بندر مونترال، کانادا", country: "Canada", code: "MTR", isPort: true, portName: "Port of Montreal" },
    { name: "Santos Port, BR", persian: "بندر سانتوس (سائوپائولو)، برزیل", country: "Brazil", code: "SSZ", isPort: true, portName: "Port of Santos" },
    { name: "Colon Port (Panama Canal), PA", persian: "بندر کولون (کانال پاناما)", country: "Panama", code: "ONX", isPort: true, portName: "Port of Colon" },
  ]

  const selectPredefinedLocation = (index: number, location: { name: string; persian: string }) => {
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      newRoutes[index] = { 
        ...newRoutes[index], 
        location: location.name, 
        locationPersian: location.persian 
      }
      return { ...prev, routes: newRoutes }
    })
  }

  const activeInputLocation = showLocationDropdown !== null && activeRouteIndex !== null ? (formData.routes[activeRouteIndex]?.location || "") : ""
  const activeStopTransportMode = showLocationDropdown !== null && activeRouteIndex !== null ? (formData.routes[activeRouteIndex]?.transportMode || "truck") : null
  const quickLocationQuery = (routeLocationSearch || activeInputLocation).trim().toLowerCase()
  const queryTokens = quickLocationQuery
    .split(/[\s,./\-_()]+/)
    .filter((t) => t.length > 0)

  const isAirportLocation = (loc: (typeof predefinedLocations)[0]) => {
    const nameLow = (loc.name || "").toLowerCase()
    const fa = loc.persian || ""
    const lType = loc.locationType || ""
    return (
      Boolean(loc.airCargo) ||
      Boolean(loc.iataCode) ||
      lType.startsWith("AIRPORT") ||
      lType === "AIR_CARGO" ||
      nameLow.includes("airport") ||
      nameLow.includes("air cargo") ||
      nameLow.includes("intl air") ||
      nameLow.includes("igi") ||
      fa.includes("میدان هوایی") ||
      fa.includes("فرودگاه") ||
      fa.includes("هوایی")
    )
  }

  const isSeaPortLocation = (loc: (typeof predefinedLocations)[0]) => {
    const nameLow = (loc.name || "").toLowerCase()
    const fa = loc.persian || ""
    const lType = loc.locationType || ""
    const pType = loc.portType || ""
    return (
      Boolean(loc.isPort) ||
      Boolean(loc.portName) ||
      lType.startsWith("SEA_PORT") ||
      lType === "TERMINAL" ||
      pType === "SEA" ||
      pType === "SEA_CARGO" ||
      nameLow.includes("port") ||
      nameLow.includes("harbour") ||
      nameLow.includes("dock") ||
      nameLow.includes("wharf") ||
      nameLow.includes("seaport") ||
      fa.includes("بندر") ||
      fa.includes("ترمینال بحری") ||
      fa.includes("اسکله") ||
      fa.includes("لنگرگاه")
    )
  }

  const isRailLocation = (loc: (typeof predefinedLocations)[0]) => {
    const nameLow = (loc.name || "").toLowerCase()
    const fa = loc.persian || ""
    const lType = loc.locationType || ""
    return (
      Boolean(loc.railConnected) ||
      lType.startsWith("ICD") ||
      lType.startsWith("RAIL") ||
      nameLow.includes("icd") ||
      nameLow.includes("rail") ||
      nameLow.includes("station") ||
      fa.includes("راه آهن") ||
      fa.includes("ریل") ||
      fa.includes("پایانه کانتینری")
    )
  }

  const quickLocationMatches = predefinedLocations.filter((loc) => {
    // 0. Strict Transport Mode Filter (AIR = Airports only, SEA = Ports only, RAIL = Rail/ICD only)
    if (!disableModeFilter && activeStopTransportMode) {
      if (activeStopTransportMode === "airplane" && !isAirportLocation(loc)) {
        return false
      }
      if (activeStopTransportMode === "vessel" && !isSeaPortLocation(loc)) {
        return false
      }
      if (activeStopTransportMode === "train" && !isRailLocation(loc)) {
        return false
      }
    }

    // Match against full searchable metadata
    const searchableText = [
      loc.name,
      loc.persian,
      loc.country,
      loc.code,
      loc.portName || "",
      loc.borderCountry || "",
      loc.state || "",
      loc.district || "",
      loc.locationType || "",
      loc.iataCode || "",
      loc.unLocode || "",
      loc.customsCode || "",
      loc.portType || "",
      typeof loc.aliases === "string" ? loc.aliases : (loc.aliases || []).join(" "),
    ]
      .join(" ")
      .toLowerCase()

    let matchesQuery = !quickLocationQuery || searchableText.includes(quickLocationQuery)

    // Multi-word and token-based matching (e.g. "new del", "delhi air", "tashkent cargo")
    if (!matchesQuery && queryTokens.length > 0) {
      const allTokensMatch = queryTokens.every((token) => {
        if (token === "new" && (queryTokens.includes("del") || queryTokens.includes("delhi") || queryTokens.includes("york"))) {
          return searchableText.includes("delhi") || searchableText.includes("new") || searchableText.includes("york")
        }
        return searchableText.includes(token)
      })
      if (allTokensMatch) matchesQuery = true
    }

    // Special prefix matching (e.g. "new del", "new delhi", "delhi air", "igi")
    if (!matchesQuery && quickLocationQuery.length >= 3) {
      if (
        (quickLocationQuery.startsWith("new del") || quickLocationQuery === "new delhi" || quickLocationQuery.includes("igi")) &&
        (loc.code === "DEL" || searchableText.includes("delhi") || searchableText.includes("indira gandhi"))
      ) {
        matchesQuery = true
      }
    }

    if (!matchesQuery) return false

    // If an explicit search term is typed, show all global matches immediately
    if (quickLocationQuery) return true

    // Otherwise apply country / region filters
    if (selectedCountryFilter === "PORTS") {
      if (!loc.isPort) return false
    } else if (selectedCountryFilter === "AFRICA") {
      const africaCountries = ["Ivory Coast", "Nigeria", "Ghana", "Benin", "Togo", "Senegal", "Kenya", "Tanzania", "South Africa", "Egypt", "Morocco", "Djibouti", "Sudan"]
      if (!africaCountries.includes(loc.country)) return false
    } else if (selectedCountryFilter === "GULF") {
      const gulfCountries = ["Saudi Arabia", "Qatar", "Bahrain", "Oman", "Kuwait", "Iraq", "Jordan", "Lebanon"]
      if (!gulfCountries.includes(loc.country)) return false
    } else if (selectedCountryFilter === "EUROPE_AMERICAS") {
      const euroAmericas = ["Netherlands", "Belgium", "Germany", "Spain", "Italy", "Greece", "United Kingdom", "France", "Poland", "USA", "Canada", "Brazil", "Panama"]
      if (!euroAmericas.includes(loc.country)) return false
    } else if (selectedCountryFilter === "CENTRAL_ASIA") {
      const centralAsia = ["Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan", "Kazakhstan"]
      if (!centralAsia.includes(loc.country)) return false
    } else if (selectedCountryFilter !== "ALL" && loc.country !== selectedCountryFilter) {
      return false
    }

    // Secondary category filter for India
    if (selectedCountryFilter === "India" && selectedIndiaCategoryFilter !== "ALL") {
      if (selectedIndiaCategoryFilter === "AIRPORTS") {
        if (!loc.locationType?.startsWith("AIRPORT") && !loc.airCargo && !loc.iataCode) return false
      } else if (selectedIndiaCategoryFilter === "SEAPORTS") {
        if (!loc.locationType?.startsWith("SEA_PORT") && !loc.isPort) return false
      } else if (selectedIndiaCategoryFilter === "LAND_PORTS") {
        if (loc.locationType !== "LAND_BORDER" && loc.locationType !== "INTEGRATED_CHECK_POST" && loc.locationType !== "CUSTOMS_BORDER" && !loc.isBorder) return false
      } else if (selectedIndiaCategoryFilter === "ICD") {
        if (loc.locationType !== "ICD" && loc.locationType !== "RAIL_CONTAINER_TERMINAL") return false
      } else if (selectedIndiaCategoryFilter === "CFS") {
        if (loc.locationType !== "CFS") return false
      } else if (selectedIndiaCategoryFilter === "TERMINALS") {
        if (!loc.locationType?.includes("TERMINAL") && !loc.inlandWaterway) return false
      } else if (selectedIndiaCategoryFilter === "LOGISTICS") {
        if (loc.locationType !== "LOGISTICS_HUB" && !loc.cargoEnabled && !loc.containerEnabled) return false
      }
    }

    return true
  })

  const handleQuickLocationSelect = (loc: { name: string; persian: string }) => {
    const targetIndex =
      activeRouteIndex !== null
        ? activeRouteIndex
        : formData.routes.findIndex((route) => !route.location)

    if (targetIndex >= 0) {
      selectPredefinedLocation(targetIndex, loc)
      setActiveRouteIndex(targetIndex)
      return
    }

    setFormData((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: crypto.randomUUID(),
          location: loc.name,
          locationPersian: loc.persian,
          stopOrder: prev.routes.length + 1,
        },
      ],
    }))
    setActiveRouteIndex(formData.routes.length)
  }

  const handleQuickSetDischarge = (portName: string) => {
    setFormData((prev) => ({ ...prev, port_of_discharge: portName }))
    toast.success(`Port of Discharge: ${portName}`)
  }

  const handleQuickSetLoading = (portName: string) => {
    setFormData((prev) => ({ ...prev, port_of_loading: portName }))
    toast.success(`Port of Loading: ${portName}`)
  }

  const handleQuickSetDelivery = (place: string) => {
    setFormData((prev) => ({ ...prev, place_of_delivery: place }))
    toast.success(`Place of Delivery: ${place}`)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const validEditId = editDocumentId || formData.id || bolNumber
      const method = (isEditMode && validEditId) ? "PUT" : "POST"
      const url = (isEditMode && validEditId) ? `/api/bol/${encodeURIComponent(validEditId)}` : "/api/bol"
      
      // Include the BOL number in the request
      const dataToSend = {
        ...formData,
        bol_number: bolNumber,
        issue_date: issueDate,
      }

      if (!isEditMode) {
        delete dataToSend.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      })
      
      if (!response.ok) {
        let errorMessage = "Failed to save document"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        toast.error("Failed to save document", {
          description: errorMessage,
        })
        return
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const savedId = result.data.id || result.data.bol_number || bolNumber
        const savedBolNumber = result.data.bol_number || bolNumber

        // Update form data and switch to edit mode so user keeps current document
        const updatedFormData = {
          ...formData,
          id: savedId,
          bol_number: savedBolNumber,
          issue_date: result.data.issue_date || issueDate,
        }
        setFormData(updatedFormData)
        setIsEditMode(true)
        setEditDocumentId(savedId)
        setBolNumber(savedBolNumber)

        // Save directly to browser local storage for 100% instant UI sync
        try {
          const filterOut = (d: any) => {
            const dId = d.id || d.bol_number
            const dNum = d.bol_number
            return (
              dId !== updatedFormData.id &&
              dNum !== updatedFormData.id &&
              dId !== updatedFormData.bol_number &&
              dNum !== updatedFormData.bol_number &&
              dId !== validEditId &&
              dNum !== validEditId
            )
          }

          const keys = ["sky-bol-browser-documents", "skybol:saved-documents", "skybol:backup-documents"]
          for (const k of keys) {
            const raw = window.localStorage.getItem(k)
            const currentList: any[] = raw ? JSON.parse(raw) : []
            const updatedList = [updatedFormData, ...currentList.filter(filterOut)]
            window.localStorage.setItem(k, JSON.stringify(updatedList))
          }
        } catch (e) {
          console.error("Browser local storage error:", e)
        }

        // Auto-save shipper and consignee details into quick saved options
        try {
          if (updatedFormData.shipper_name?.trim()) {
            const sName = updatedFormData.shipper_name.trim()
            const matchS = savedShippers.find((s) => s.name.trim().toLowerCase() === sName.toLowerCase())
            const curS: SavedParty = {
              id: matchS ? matchS.id : crypto.randomUUID(),
              name: sName,
              address: updatedFormData.shipper_address || "",
              contact: updatedFormData.shipper_contact || "",
              email: updatedFormData.shipper_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextS = [curS, ...savedShippers.filter((s) => s.id !== curS.id)].slice(0, 100)
            persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, nextS, setSavedShippers)
          }

          if (updatedFormData.consignee_name?.trim()) {
            const cName = updatedFormData.consignee_name.trim()
            const matchC = savedConsignees.find((c) => c.name.trim().toLowerCase() === cName.toLowerCase())
            const curC: SavedParty = {
              id: matchC ? matchC.id : crypto.randomUUID(),
              name: cName,
              address: updatedFormData.consignee_address || "",
              contact: updatedFormData.consignee_contact || "",
              email: updatedFormData.consignee_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextC = [curC, ...savedConsignees.filter((c) => c.id !== curC.id)].slice(0, 100)
            persistSavedParties(SAVED_CONSIGNEES_STORAGE_KEY, nextC, setSavedConsignees)
          }

          if (updatedFormData.notify_party?.trim()) {
            const nName = updatedFormData.notify_party.trim()
            const matchN = savedNotifyParties.find((n) => n.name.trim().toLowerCase() === nName.toLowerCase())
            const curN: SavedParty = {
              id: matchN ? matchN.id : crypto.randomUUID(),
              name: nName,
              address: updatedFormData.notify_party_address || "",
              contact: "",
              email: "",
              savedAt: new Date().toISOString(),
            }
            const nextN = [curN, ...savedNotifyParties.filter((n) => n.id !== curN.id)].slice(0, 100)
            persistSavedParties(SAVED_NOTIFY_PARTIES_STORAGE_KEY, nextN, setSavedNotifyParties)
          }
        } catch (err) {
          console.error("Auto-save party error:", err)
        }

        syncBolToAccountLedger(updatedFormData)
        
        window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: updatedFormData }))

        // Purge active draft cache on server and local storage to prevent false alerts
        try {
          window.localStorage.removeItem("sky-bol-live-draft")
          window.localStorage.removeItem("skybol:active-form-draft")
          fetch("/api/draft?type=bol", { method: "DELETE" }).catch(() => {})
          setHasRecoverableDraft(false)
          setAutoSaveStatus("saved")
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          setLastAutoSaveTime(nowStr)
          setLastAutoSavedTime(nowStr)
        } catch (_) {}

        onSave?.(updatedFormData)
        onRefreshDocuments?.()
        
        // Show success toast with BOL number & 1-click action to View Saved BOLs
        const action = isEditMode ? "updated" : "saved"
        toast.success(`Document ${action} successfully!`, {
          description: `BOL ${savedBolNumber} ${action} in your documents library`,
          action: {
            label: "View Saved BOLs",
            onClick: () => setActiveTab("saved-documents"),
          },
        })
      } else if (result.error) {
        toast.error("Failed to save document", {
          description: result.error,
        })
      }
    } catch (error) {
      console.error("[v0] Error saving BOL:", error)
      toast.error("Error saving document", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNewDocument = () => {
    try {
      window.localStorage.removeItem("sky-bol-live-draft")
      window.localStorage.removeItem("skybol:active-form-draft")
      fetch("/api/draft?type=bol", { method: "DELETE" }).catch(() => {})
      setHasRecoverableDraft(false)
    } catch (_) {}
    setIsEditMode(false)
    setEditDocumentId(null)
    setFormData(initialFormData)
    setActiveRouteIndex(null)
    setShowLocationDropdown(null)
    setBolNumber("BOL-2026-NSA470")
    fetchNextBolNumber()
    const today = new Date().toISOString().split("T")[0]
    setIssueDate(today)
    const dualDates = getDualDates(today)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
    }
  }

  const handleDuplicateCurrent = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Duplicating BOL...", {
      description: "Generating next sequence number...",
    })
    try {
      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      const newBolNumber = result.bolNumber || "BOL-2026-NSA471"

      setIsEditMode(false)
      setEditDocumentId(null)
      setBolNumber(newBolNumber)
      setFormData((prev) => ({ ...prev, id: "", bol_number: newBolNumber }))

      toast.success(`Cloned as ${newBolNumber}!`, {
        id: toastId,
        description: "Form pre-filled with party data. Click Save when ready.",
      })
    } catch (e) {
      toast.error("Failed to duplicate document", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      if (!formData.id) {
        await handleSave()
      }

      setIsSaving(true)
      const toastId = toast.loading("Generating PDF...", {
        description: "Please wait, this may take a moment...",
      })

      const fileName = buildBolSmartFileName({ ...formData, bol_number: bolNumber }, bolNumber, ".pdf")
      const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
      const pdfBlob = await generateBOLPDFBlob({
        fileName,
        previewElement,
        modern: {
          bolNumber: bolNumber || "BOL",
          issueDate,
          persianDateNumeric,
          formData: { ...formData, bol_number: bolNumber },
          logoUrl,
          companyName,
          companyNamePersian,
          companySubtitle,
          companyPhone,
          companyEmail,
          companyAddress,
          companyLicence,
          onProgress: (progress: number, message: string) => {
            toast.loading(`${message} (${Math.round(progress)}%)`, {
              id: toastId,
              description: "Generating premium print-ready PDF",
            })
          },
        },
        onFallback: (reason: string) => {
          toast.warning("Using compatibility PDF mode", {
            description: reason,
          })
        },
      })

      toast.loading("Uploading PDF to storage...", {
        id: toastId,
        description: "Saving to cloud storage...",
      })

      // Upload to server
      const uploadResult = await uploadPDFToServer(
        pdfBlob,
        formData.id || "",
        fileName.replace(/\.pdf$/i, "")
      )

      if (uploadResult.success && uploadResult.url) {
        toast.success("PDF saved successfully!", {
          id: toastId,
          description: "Your BOL PDF has been stored and is ready for download",
        })
        onRefreshDocuments?.()
      } else {
        toast.error("Failed to save PDF", {
          id: toastId,
          description: uploadResult.error || "Unknown error occurred",
        })
      }
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast.error("Error generating PDF", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDirectPrint = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      const smartTitle = buildBolSmartFileName({ ...formData, bol_number: bolNumber }, bolNumber, "")
      if (smartTitle) {
        document.title = smartTitle
      }

      // Explicitly set BOL active print mode and clear any ledger/invoice styles
      document.body.classList.remove("ledger-landscape-active")
      document.body.removeAttribute("data-print-mode")
      document.documentElement.removeAttribute("data-print-mode")
      document.body.setAttribute("data-print-active", "bol")
      document.documentElement.setAttribute("data-print-active", "bol")

      const previewEl = document.getElementById("bol-print-preview")
      if (previewEl) {
        previewEl.setAttribute("data-print-quality", "standard")
        previewEl.setAttribute("data-color-strip", "true")
        previewEl.setAttribute("data-fit-to-page", "true")
      }

      const cleanup = () => {
        document.body.removeAttribute("data-print-active")
        document.documentElement.removeAttribute("data-print-active")
        window.removeEventListener("afterprint", cleanup)
      }
      window.addEventListener("afterprint", cleanup)

      setTimeout(() => {
        window.print()
        setTimeout(cleanup, 2500)
      }, 50)
    }
  }

  const handlePrint = async (options: PrintOptions) => {
    try {
      setIsSaving(true)
      setActivePrintOptions(options)

      const smartTitle = buildBolSmartFileName({ ...formData, bol_number: bolNumber }, bolNumber, "")
      const fileName = buildBolSmartFileName({ ...formData, bol_number: bolNumber }, bolNumber, ".pdf")
      if (smartTitle && typeof document !== "undefined") {
        document.title = smartTitle
      }

      // Explicitly set BOL active print mode and clear any ledger/invoice styles
      document.body.classList.remove("ledger-landscape-active")
      document.body.removeAttribute("data-print-mode")
      document.documentElement.removeAttribute("data-print-mode")
      document.body.setAttribute("data-print-active", "bol")
      document.documentElement.setAttribute("data-print-active", "bol")

      const cleanup = () => {
        document.body.removeAttribute("data-print-active")
        document.documentElement.removeAttribute("data-print-active")
        window.removeEventListener("afterprint", cleanup)
      }
      window.addEventListener("afterprint", cleanup)

      if (options.quality !== "high-quality") {
        if (typeof window !== "undefined" && typeof window.print === "function") {
          const previewEl = document.getElementById("bol-print-preview")
          if (previewEl) {
            previewEl.setAttribute("data-print-quality", options.quality)
            previewEl.setAttribute("data-color-strip", options.includeColorStrip ? "true" : "false")
            previewEl.setAttribute("data-fit-to-page", options.fitToPage ? "true" : "false")
          }
          setTimeout(() => {
            window.print()
            setIsSaving(false)
            setTimeout(cleanup, 2500)
          }, 50)
          return
        }
      }

      const toastId = toast.loading("Opening print preview...", {
        description: `Preparing BOL layout (${options.quality} quality)...`,
      })

      const printWindow = openPDFPrintWindow(fileName)

      const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
      const pdfBlob = await generateBOLPDFBlob({
        fileName,
        previewElement,
        modern: {
          bolNumber: bolNumber || "BOL",
          issueDate,
          persianDateNumeric,
          formData: { ...formData, bol_number: bolNumber },
          logoUrl,
          companyName,
          companyNamePersian,
          companySubtitle,
          companyPhone,
          companyEmail,
          companyAddress,
          companyLicence,
        },
      })
      await printPDFBlobInWindow(pdfBlob, fileName, printWindow)
      toast.dismiss(toastId)
      cleanup()
    } catch (error) {
      console.error("Error preparing print:", error)
      if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    await handleShippingDocumentsDownload("all")
  }

  const shippingDocumentData = useMemo(
    () =>
      deriveShippingDocumentData(
        {
          ...formData,
          bol_number: bolNumber,
          issue_date: issueDate,
          company_name: companyName,
          company_subtitle: companySubtitle,
          company_phone: companyPhone,
          company_email: companyEmail,
          company_address: companyAddress,
          company_licence: companyLicence,
        } as any,
        bolNumber,
        issueDate,
      ),
    [
      formData,
      bolNumber,
      issueDate,
      companyName,
      companySubtitle,
      companyPhone,
      companyEmail,
      companyAddress,
      companyLicence,
    ],
  )

  const createShippingDocuments = async (
    kind: ShippingDocumentKind = "all",
    stickerQuantity = 1,
    stickerLayout: StickerLayout = "single",
  ) => {
    const bolElement =
      (document.querySelector('[data-bol-a4="true"]') as HTMLElement | null) ||
      (document.querySelector('[data-pdf-export="true"]') as HTMLElement | null)
    return generateShippingDocumentsPDF({
      kind,
      data: shippingDocumentData,
      bolElement,
      logoUrl,
      companyName,
      companySubtitle,
      companyPhone,
      companyEmail,
      companyAddress,
      companyLicence,
      stickerQuantity,
      stickerLayout,
    })
  }

  const handleShippingDocumentsDownload = async (
    kind: ShippingDocumentKind,
    stickerQuantity = 1,
    stickerLayout: StickerLayout = "single",
  ) => {
    setIsSaving(true)
    const fileName = buildShippingDocumentFileName(kind, shippingDocumentData)
    const toastId = toast.loading("Building shipping documents...", {
      description: kind === "all" ? "Combining BOL, packing list and sticker labels" : `Preparing ${fileName}`,
    })
    try {
      const pdfBlob = await createShippingDocuments(kind, stickerQuantity, stickerLayout)
      const saved = await savePDFToDevice(pdfBlob, fileName)
      if (!saved.success) throw new Error(saved.error || "The PDF could not be saved to this device.")
      toast.success("Shipping PDF saved", {
        id: toastId,
        description: saved.path || fileName,
      })
    } catch (error) {
      console.error("Shipping document generation failed:", error)
      toast.error("Could not generate shipping documents", {
        id: toastId,
        description: error instanceof Error ? error.message : "An unexpected PDF error occurred.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleShippingDocumentsPrint = async (
    kind: ShippingDocumentKind,
    stickerQuantity = 1,
    stickerLayout: StickerLayout = "single",
  ) => {
    const fileName = buildShippingDocumentFileName(kind, shippingDocumentData)
    const printWindow = openPDFPrintWindow(fileName)
    setIsSaving(true)
    const toastId = toast.loading("Preparing print-ready PDF...", { description: fileName })
    try {
      const pdfBlob = await createShippingDocuments(kind, stickerQuantity, stickerLayout)
      const opened = await printPDFBlobInWindow(pdfBlob, fileName, printWindow)
      if (!opened) throw new Error("The print preview window could not be opened.")
      toast.success("Print preview ready", { id: toastId, description: fileName })
    } catch (error) {
      printWindow?.close()
      toast.error("Could not prepare print preview", {
        id: toastId,
        description: error instanceof Error ? error.message : "An unexpected PDF error occurred.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleShellAction = useEffectEvent((event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; tab?: string }>).detail

      startTransition(() => {
        if (detail?.tab) {
          setActiveTab(detail.tab)
        }

        switch (detail?.action) {
          case "form":
            setActiveTab("form")
            break
          case "new":
            handleNewDocument()
            setActiveTab("form")
            break
          case "print":
            setIsPrintDialogOpen(true)
            break
          case "download":
            void handleDownloadPDF()
            break
          case "save-pdf":
            void handleExportPDF()
            break
          case "preview":
            setActiveTab("preview")
            break
          case "saved-documents":
            setActiveTab("saved-documents")
            break
          case "account":
            setActiveTab("account")
            break
          case "pdf-settings":
            setActiveTab("pdf-settings")
            break
        }
      })
  })
  useEffect(() => {
    window.addEventListener("skybol:editor-action", handleShellAction)

    return () => {
      window.removeEventListener("skybol:editor-action", handleShellAction)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      const smartTitle = buildBolSmartFileName(formData, bolNumber, "")
      if (smartTitle) {
        document.title = smartTitle
      }
    }
  }, [formData, bolNumber])

  const handleBeforePrint = useEffectEvent(() => {
      if (typeof document !== "undefined") {
        const smartTitle = buildBolSmartFileName(formData, bolNumber, "")
        if (smartTitle) {
          document.title = smartTitle
        }
      }
  })
  useEffect(() => {
    window.addEventListener("beforeprint", handleBeforePrint)
    return () => window.removeEventListener("beforeprint", handleBeforePrint)
  }, [])

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault()
        if (bolNumber && !isSaving) {
          handleSave()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault()
        handleDirectPrint()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        handleNewDocument()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        handleDuplicateCurrent()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault()
        setIsShortcutsModalOpen(true)
      }
  })
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div ref={editorRootRef} className="bol-workspace min-h-screen bg-transparent print:min-h-0 print:bg-white print:overflow-visible">
      {/* Action Bar - Mobile & Desktop sticky beneath header */}
      <div ref={toolbarRef} className="bol-action-bar sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-2.5 py-1.5 shadow-sm shadow-blue-900/5 backdrop-blur-xl md:px-4 md:py-1.5 print:hidden">
        <div className="max-w-[1780px] mx-auto flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <div className="rounded-xl border border-blue-200 bg-white/80 p-1 sm:p-1.5 shadow-2xs">
                <FileText className="h-3.5 w-3.5 text-blue-700 shrink-0" />
              </div>
              <span className="font-extrabold text-slate-950 text-xs sm:text-sm whitespace-nowrap">Bill of Lading</span>
              <div className="rounded-lg border border-blue-200 bg-blue-50/90 px-2 py-0.5">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-700" />
                ) : (
                  <span className="font-mono font-black text-blue-700 text-xs sm:text-xs tracking-tight">{bolNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-600 whitespace-nowrap">
                <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                <span>{issueDate}</span>
              </div>
              {persianDateNumeric && (
                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200/60 bg-white/70 px-1.5 py-0.5 text-[11px]">
                  <span className="text-slate-600 font-bold font-[vazirmatn]" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                    {persianDateNumeric}
                  </span>
                </div>
              )}
              <div role="status" aria-live="polite" aria-atomic="true">
              {autoSaveStatus === "saving" ? (
                <div className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[10.5px] text-amber-900 font-bold shadow-2xs animate-pulse">
                  <RefreshCw className="h-2.5 w-2.5 text-amber-600 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10.5px] font-bold shadow-2xs ${autoSaveStatus === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  {autoSaveStatus === "saved" ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <AlertCircle className="h-2.5 w-2.5 shrink-0" />}
                  <span>{hasRecoverableDraft ? "Restore or discard the previous draft" : checkingDraft ? "Checking draft…" : autoSaveStatus === "saved" ? `Draft backed up · ${lastAutoSaveTime || lastAutoSavedTime || ""}` : autoSaveStatus === "local" ? "Draft saved on this device" : autoSaveStatus === "error" ? "Autosave failed — use Save or download a backup" : "Autosave ready"}</span>
                  {autoSaveStatus === "local" && <button type="button" className="underline underline-offset-2" onClick={() => draftQueue.current?.retry()}>Retry backup</button>}
                </div>
              )}
              </div>
            </div>

            {/* Mobile Primary Save Button */}
            <div className="flex items-center gap-1 md:hidden shrink-0">
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={isSaving}
                className="h-7.5 rounded-lg bg-linear-to-r from-blue-600 to-cyan-500 px-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                {isEditMode ? "Update" : "Save"}
              </Button>
            </div>
          </div>
          
          {/* Actions - Responsive high-density toolbar with zero clipping */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange("saved-documents")}
              className="h-7.5 rounded-xl border-emerald-200 bg-emerald-50/80 px-2 sm:px-2.5 text-xs font-bold text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 shadow-2xs shrink-0 cursor-pointer"
              title="Saved BOL Archive"
            >
              <FileText className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              <span>Saved BOLs</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNewDocument}
              className="h-7.5 rounded-xl border-slate-200 bg-white/90 px-2 sm:px-2.5 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 shadow-2xs shrink-0 cursor-pointer"
              title="New Document (Ctrl + Shift + N)"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-blue-600" />
              <span>New</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDirectPrint}
              disabled={isSaving}
              className="h-7.5 rounded-xl border-slate-200 bg-white/90 px-2 sm:px-2.5 text-xs font-bold text-blue-700 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50 shadow-2xs shrink-0 cursor-pointer"
              title="Instant Print (Ctrl + P)"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              <span>Print</span>
            </Button>

            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-7.5 rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 px-3 text-xs font-black text-white shadow-md shadow-blue-400/25 hover:shadow-blue-400/40 shrink-0 cursor-pointer"
              title="Save Document (Ctrl + S)"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              <span>{isEditMode ? "Update" : "Save"}</span>
            </Button>

            <div className="inline-flex items-center rounded-xl shadow-2xs">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleShippingDocumentsDownload("all")}
                onMouseEnter={() => void preloadBOLPDFGeneration()}
                onFocus={() => void preloadBOLPDFGeneration()}
                disabled={isSaving}
                className="h-7.5 rounded-r-none border-slate-200 bg-white/90 px-2 sm:px-2.5 text-xs font-bold text-blue-700 hover:border-blue-200 hover:bg-blue-50 shrink-0 cursor-pointer gap-1"
                title="Download Complete PDF (BOL + Packing List + Sticker)"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-blue-700" />}
                <span>Complete PDF</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    className="h-7.5 w-6 p-0 rounded-l-none border-l-0 border-slate-200 bg-white/90 text-blue-700 hover:bg-blue-50 cursor-pointer shrink-0"
                    title="More PDF options"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5 shadow-xl">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500">Download PDF</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("all")} className="gap-2 text-xs font-black text-[#583184] cursor-pointer">
                    <Package className="h-3.5 w-3.5" />Download Complete PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("bol")} className="gap-2 text-xs font-bold cursor-pointer">
                    <FileText className="h-3.5 w-3.5" />BOL Only (Page 1)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("packing-list")} className="gap-2 text-xs font-bold cursor-pointer">
                    <FileSpreadsheet className="h-3.5 w-3.5" />Packing List Only (Page 2)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("stickers")} className="gap-2 text-xs font-bold cursor-pointer">
                    <Layers className="h-3.5 w-3.5" />Sticker Label Only (Page 3)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsDocumentCenterOpen(true)} className="gap-2 text-xs font-bold cursor-pointer">
                    <Eye className="h-3.5 w-3.5 text-[#583184]" />Preview Documents (3-in-1)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="h-7.5 rounded-xl border-blue-200 bg-blue-50/90 px-2 sm:px-2.5 text-xs font-black text-blue-800 hover:border-blue-300 hover:bg-blue-100 shadow-2xs shrink-0 cursor-pointer"
              title="Cloud Sync: Upload/Download all BOLs across all devices"
            >
              <Cloud className="h-3.5 w-3.5 mr-1 text-blue-600" />
              <span>Cloud Sync</span>
            </Button>

            {/* Quick Secondary Tools: Duplicate, Backup, Shortcuts */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7.5 w-7.5 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs shrink-0 cursor-pointer"
                  title="More actions & tools"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl">
                <DropdownMenuItem onClick={() => handleTabChange("preview")} className="gap-2 text-xs font-bold cursor-pointer">
                  <Eye className="h-3.5 w-3.5" />A4 Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTabChange("pdf-settings")} className="gap-2 text-xs font-bold cursor-pointer">
                  <Sliders className="h-3.5 w-3.5" />BOL Print Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicateCurrent} className="gap-2 text-xs font-bold cursor-pointer">
                  <Copy className="h-3.5 w-3.5 text-purple-600" />
                  <span>Duplicate BOL</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+Shift+D</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCloudSyncModalOpen(true)} className="gap-2 text-xs font-bold cursor-pointer">
                  <DownloadCloud className="h-3.5 w-3.5 text-blue-600" />
                  <span>Backup & Restore</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsShortcutsModalOpen(true)} className="gap-2 text-xs font-bold cursor-pointer">
                  <Keyboard className="h-3.5 w-3.5 text-slate-600" />
                  <span>Keyboard Shortcuts</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+/</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {hasRecoverableDraft && (
        <div className="w-full max-w-[1780px] mx-auto px-2 sm:px-4 lg:px-6 pt-2 print:hidden">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/90 bg-gradient-to-r from-amber-500/15 via-amber-50/90 to-amber-500/10 px-4 py-2 text-xs text-amber-950 shadow-md shadow-amber-500/10 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs sm:text-sm">Unsaved Draft Detected</span>
                  <span className="text-[11px] font-[vazirmatn] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/60 hidden sm:inline-block">
                    پیش‌نویس ذخیره نشده
                  </span>
                  <span className="text-[11px] font-mono text-amber-900 font-bold">({recoverableDraftTime})</span>
                </div>
                <p className="text-[11px] text-slate-600 hidden md:block">
                  Restore previously typed Bill of Lading data, cargo details and consignee information?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleRestoreDraft}
                className="h-7.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Restore Draft</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscardDraft}
                className="h-7.5 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <span>Discard</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1780px] mx-auto px-2 sm:px-4 lg:px-6 py-1.5 md:py-2 print:max-w-none print:p-0 print:m-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="print:hidden w-full">
          <TabsList className="bol-navigation mb-2.5 grid w-full grid-cols-5 rounded-2xl border border-slate-200/90 bg-slate-100/85 p-1 shadow-sm shadow-blue-500/5 backdrop-blur-xl h-9 sm:h-10">
            <TabsTrigger value="form" className="gap-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex-1 justify-center px-2 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-950 data-[state=active]:shadow-sm transition-all">
              <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="hidden sm:inline">BOL Editor</span>
              <span className="sm:hidden">Form</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex-1 justify-center px-2 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-950 data-[state=active]:shadow-sm transition-all">
              <Eye className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <span className="hidden sm:inline">A4 Preview</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="saved-documents" onPointerEnter={() => { void import("./saved-documents").catch(() => {}) }} onFocus={() => { void import("./saved-documents").catch(() => {}) }} className="gap-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex-1 justify-center px-2 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-950 data-[state=active]:shadow-sm transition-all">
              <Layers className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="hidden sm:inline">Saved BOLs</span>
              <span className="sm:hidden">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex-1 justify-center px-2 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-950 data-[state=active]:shadow-sm transition-all">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="hidden sm:inline">Account Ledger</span>
              <span className="sm:hidden">Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="pdf-settings" className="gap-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex-1 justify-center px-2 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-950 data-[state=active]:shadow-sm transition-all">
              <Sliders className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span className="hidden sm:inline">BOL Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="edit-form-panel space-y-2.5">
            {/* Top Smart Quick-Actions & Navigation Ribbon */}
            <div className="bol-utility-bar relative z-10 rounded-xl border border-white/90 bg-white/95 px-2.5 py-1.5 shadow-sm shadow-blue-500/10 backdrop-blur-xl transition-all space-y-1.5">
              {/* Row 1: Smart Utility Buttons + Inline Cargo Presets */}
              <div className="flex items-center justify-between gap-2">
                {/* Utilities */}
                <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5 sm:flex-nowrap sm:shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAutoCalculateWeights}
                    className="h-7 rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer active:scale-95 transition-all px-2 sm:px-2.5"
                    title="Auto-calculate Net Weight, Gross Weight & USD Goods Value"
                  >
                    <Calculator className="h-3 w-3 mr-1" />
                    <span>Auto-Calculate</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwapShipperConsignee}
                    className="h-7 rounded-lg border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 font-extrabold text-[11px] shadow-2xs cursor-pointer active:scale-95 transition-all px-2 sm:px-2.5"
                    title="Swap Shipper and Consignee details"
                  >
                    <ArrowLeftRight className="h-3 w-3 mr-1 text-blue-700" />
                    <span>Swap ⇄</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShipperToNotify}
                    className="h-7 rounded-lg border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-extrabold text-[11px] shadow-2xs cursor-pointer active:scale-95 transition-all px-2 sm:px-2.5"
                    title="Copy Shipper details to Notify Party"
                  >
                    <Copy className="h-3 w-3 mr-1 text-amber-700" />
                    <span className="hidden sm:inline">Shipper ➔ Notify</span>
                    <span className="sm:hidden">Ship➔Notif</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyConsigneeToNotify}
                    className="h-7 rounded-lg border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 font-extrabold text-[11px] shadow-2xs cursor-pointer active:scale-95 transition-all px-2 sm:px-2.5"
                    title="Copy Consignee details to Notify Party"
                  >
                    <Copy className="h-3 w-3 mr-1 text-emerald-700" />
                    <span className="hidden sm:inline">Consignee ➔ Notify</span>
                    <span className="sm:hidden">Cons➔Notif</span>
                  </Button>
                </div>

                {/* Inline Cargo Presets Strip */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth min-w-0 pl-1">
                  <span className="text-[10.5px] font-black text-slate-500 flex items-center gap-1 shrink-0">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="hidden xl:inline">Presets:</span>
                  </span>
                  {CARGO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyCargoPreset(preset)}
                      className="rounded-lg border border-purple-200/80 bg-purple-50/70 hover:bg-purple-100 text-purple-900 px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      title={`Fill cargo specification with ${preset.name}`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Section Jump Navigation Strip */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth border-t border-slate-100 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-0.5 shrink-0 flex items-center gap-0.5">
                  <Layers className="h-2.5 w-2.5 text-blue-500" />
                  Jump:
                </span>
                {[
                  { id: "section-doc", label: "01 Doc", icon: Calendar },
                  { id: "section-shipper", label: "02 Shipper", icon: User },
                  { id: "section-consignee", label: "03 Consignee", icon: User },
                  { id: "section-notify", label: "04 Notify", icon: Bell },
                  { id: "section-cargo", label: "05 Cargo", icon: Package },
                  { id: "section-routes", label: "07 Routes", icon: MapPin },
                  { id: "section-container", label: "08 Container", icon: Box },
                  { id: "section-shipping", label: "09 Shipping", icon: Ship },
                  { id: "section-freight", label: "10 Freight", icon: Receipt },
                  { id: "section-afghan", label: "11 Docs", icon: ScrollText },
                ].map((sec) => {
                  const IconComponent = sec.icon
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(sec.id)
                        if (el) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })
                      }}
                      className="flex items-center gap-1 rounded-lg border border-slate-200/70 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 whitespace-nowrap transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                    >
                      <IconComponent className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                      <span>{sec.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 01 Document Information Card */}
            <Card id="section-doc" className="relative bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-[0_20px_50px_-15px_rgba(30,58,138,0.12)] overflow-hidden transition-all">
              {/* Top Accent Strip */}
              <div className="h-1 w-full bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500" />
              
              <CardHeader className="py-2 px-3 sm:py-2.5 sm:px-4 border-b border-slate-100/80 bg-linear-to-r from-blue-50/80 via-indigo-50/40 to-white/70">
                <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white text-[11px] font-black shadow-2xs">
                      01
                    </span>
                    <div className="p-1.5 rounded-xl bg-linear-to-br from-blue-500/10 to-indigo-500/15 text-blue-700 border border-blue-200/70 shadow-2xs">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-950 text-xs sm:text-sm tracking-tight select-none">Document Information</span>
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                          BOL Header
                        </span>
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] text-slate-500 font-medium block">
                        BOL Reference, Serial & Issue Dates • <span className="font-[vazirmatn] text-blue-700">شماره و تاریخ‌های بارنامه</span>
                      </span>
                    </div>
                  </div>

                  {/* Header Actions & Badges */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetToday}
                      className="inline-flex items-center gap-1 h-6.5 px-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                      title="Set issue date to today / تنظیم به تاریخ امروز"
                    >
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>Today / امروز</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleIncrementBolNumber}
                      className="inline-flex items-center gap-1 h-6.5 px-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                      title="Generate next BOL sequence number / ایجاد شماره بارنامه بعدی"
                    >
                      <Plus className="h-3 w-3 text-indigo-600" />
                      <span>Next BOL #</span>
                    </button>

                    <span className="hidden sm:inline-flex text-[11px] font-extrabold text-blue-900 font-[vazirmatn] bg-white/90 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                      اطلاعات سند و تاریخ‌ها
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-3 sm:p-4">
                {/* 3-Column Grid for BOL Number & Issue Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5">
                  {/* 1. BOL Number */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-linear-to-br from-blue-50/80 via-white to-blue-50/30 border border-blue-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span className="p-0.5 rounded-md bg-blue-600 text-white">
                            <Hash className="w-3 h-3" />
                          </span>
                          <span>BOL Number</span>
                        </label>
                        <span className="font-[vazirmatn] text-blue-800 font-bold text-[11px]">شماره بارنامه</span>
                      </div>

                      {isEditingBolNumber ? (
                        <div className="flex gap-1.5 mt-1">
                          <Input
                            value={bolNumber}
                            onChange={(e) => setBolNumber(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setIsEditingBolNumber(false)
                            }}
                            className="font-mono font-black text-xs sm:text-sm text-slate-950 bg-white border-blue-300 shadow-inner rounded-xl h-8.5 sm:h-9 focus:ring-2 focus:ring-blue-500/20 uppercase"
                            placeholder="BOL-2026-NSA501"
                            autoFocus
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setIsEditingBolNumber(false)}
                            className="rounded-xl h-8.5 sm:h-9 px-3 font-bold text-xs bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-500/20 shrink-0 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 px-2.5 py-1 sm:py-1.5 bg-white rounded-xl font-mono font-black text-xs sm:text-sm text-blue-900 border border-blue-200 shadow-2xs flex items-center justify-between overflow-hidden">
                            <span className="truncate tracking-wide">{isLoading ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : bolNumber || "BOL-000"}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase">Live</span>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsEditingBolNumber(true)}
                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl bg-white hover:bg-blue-50 border-blue-200 text-blue-700 shadow-2xs shrink-0 cursor-pointer"
                            title="Edit BOL Number manually"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyBolNumber}
                            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl bg-white hover:bg-blue-50 border-blue-200 text-slate-700 shadow-2xs shrink-0 cursor-pointer"
                            title="Copy BOL Number to clipboard"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 pt-1.5 border-t border-blue-100 flex items-center justify-between text-[10.5px] text-slate-500">
                      <span>Unique Document ID</span>
                      <button
                        type="button"
                        onClick={handleIncrementBolNumber}
                        className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Auto +1
                      </button>
                    </div>
                  </div>

                  {/* 2. Issue Date (Gregorian) */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-linear-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span className="p-0.5 rounded-md bg-indigo-600 text-white">
                            <Calendar className="w-3 h-3" />
                          </span>
                          <span>Issue Date (Gregorian)</span>
                        </label>
                        <span className="font-[vazirmatn] text-indigo-800 font-bold text-[11px]">تاریخ میلادی</span>
                      </div>

                      <div className="relative flex items-center mt-1">
                        <div className="absolute left-2.5 text-indigo-600 pointer-events-none">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <Input
                          type="date"
                          value={issueDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="pl-8 font-mono font-black text-xs sm:text-sm text-slate-950 bg-white border-indigo-200 shadow-2xs rounded-xl h-8.5 sm:h-9 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-indigo-100 flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500 truncate">
                        {issueDate ? new Date(issueDate).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "Select date"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSetToday}
                          className="text-indigo-600 font-bold hover:underline cursor-pointer"
                        >
                          Today
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleSetYesterday}
                          className="text-slate-500 font-bold hover:underline cursor-pointer"
                        >
                          -1d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Issue Date (Persian Solar) */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-linear-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span className="p-0.5 rounded-md bg-emerald-600 text-white">
                            <Globe className="w-3 h-3" />
                          </span>
                          <span>Issue Date (Persian)</span>
                        </label>
                        <span className="font-[vazirmatn] text-emerald-800 font-bold text-[11px]">تاریخ هجری شمسی</span>
                      </div>

                      <div className="px-2.5 py-1 bg-white rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col items-start justify-center h-8.5 sm:h-9">
                        <p className="font-[vazirmatn] text-[11px] font-black text-slate-900 leading-tight truncate w-full" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          {persianDate || "محاسبه خودکار..."}
                        </p>
                        <p className="font-[vazirmatn] text-[10px] font-extrabold text-emerald-700 leading-tight font-mono" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          {persianDateNumeric || "--/--/----"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[10.5px]">
                      <span className="text-emerald-700 font-bold flex items-center gap-1 font-[vazirmatn]">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        محاسبه خودکار خورشیدی
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono">Solar Hijri</span>
                    </div>
                  </div>
                </div>
                
                {/* Truck & Driver Details Subsection */}
                <div className="rounded-2xl border border-sky-200/90 bg-linear-to-br from-sky-50/70 via-blue-50/30 to-white p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
                        <Truck className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                          <span>Truck & Driver Details</span>
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                            Transport Vehicle
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium font-[vazirmatn]">
                          اطلاعات موتر، راننده، شماره تماس و کرایه توافقی
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {["AF-1234-KBL", "AF-5678-KDR", "IR-4421-THR", "IR-8890-BND"].map((plate) => (
                        <button
                          key={plate}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, truck_number: plate }))
                            toast.success(`Set Truck No: ${plate}`)
                          }}
                          className="hidden sm:inline-flex rounded-lg border border-sky-200 bg-white/90 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 hover:bg-sky-600 hover:text-white transition cursor-pointer"
                        >
                          {plate}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {/* 1. Truck No */}
                    <div>
                      <label className="mb-1 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Truck No.</span>
                        </span>
                        <span className="font-[vazirmatn] text-[10.5px] font-bold text-blue-800">شماره موتر/کامیون</span>
                      </label>
                      <Input
                        name="truck_number"
                        value={formData.truck_number}
                        onChange={handleInputChange}
                        placeholder="e.g. AF-1234-KBL"
                        className="rounded-xl h-8.5 sm:h-9 font-mono text-xs sm:text-sm font-black uppercase text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* 2. Driver Name */}
                    <div>
                      <label className="mb-1 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>Driver Name</span>
                        </span>
                        <span className="font-[vazirmatn] text-[10.5px] font-bold text-blue-800">نام راننده</span>
                      </label>
                      <Input
                        name="driver_name"
                        value={formData.driver_name}
                        onChange={handleInputChange}
                        placeholder="Enter driver name..."
                        className="rounded-xl h-8.5 sm:h-9 text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* 3. Father Name */}
                    <div>
                      <label className="mb-1 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Father Name</span>
                        </span>
                        <span className="font-[vazirmatn] text-[10.5px] font-bold text-blue-800">نام پدر</span>
                      </label>
                      <Input
                        name="driver_father_name"
                        value={formData.driver_father_name}
                        onChange={handleInputChange}
                        placeholder="Father's name..."
                        className="rounded-xl h-8.5 sm:h-9 text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* 4. Driver Contact */}
                    <div>
                      <label className="mb-1 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Driver Contact</span>
                        </span>
                        <span className="font-[vazirmatn] text-[10.5px] font-bold text-blue-800">شماره تماس راننده</span>
                      </label>
                      <Input
                        name="driver_contact"
                        value={formData.driver_contact}
                        onChange={handleInputChange}
                        placeholder="+93 700 123 456"
                        type="tel"
                        className="rounded-xl h-8.5 sm:h-9 font-mono text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* 5. Driver Rent */}
                    <div>
                      <label className="mb-1 text-xs font-black text-red-700 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5 text-red-600" />
                          <span>Driver Rent</span>
                        </span>
                        <span className="font-[vazirmatn] text-[10.5px] font-extrabold text-red-700">کرایه راننده</span>
                      </label>
                      <Input
                        name="driver_rent"
                        value={formData.driver_rent}
                        onChange={handleInputChange}
                        placeholder="e.g., $500"
                        className="rounded-xl h-8.5 sm:h-9 text-xs sm:text-sm font-black text-red-700 bg-red-50/80 border-red-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Boxes Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-slate-100 text-slate-700">
                        <Bookmark className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Document Notes & Contacts • <span className="font-[vazirmatn] font-bold text-blue-800">یادداشت‌ها و نمایندگان</span>
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                      Custom print notes with theme colors & saved presets
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Note 1 */}
                    <div className={`p-3 sm:p-3.5 rounded-xl backdrop-blur-xl border shadow-2xs transition-all ${getNoteThemeStyles(formData.notes_1_theme).container}`}>
                      {/* Note 1 Header */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <BookmarkPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <Input
                            type="text"
                            value={formData.notes_1_label || ""}
                            onChange={(e) => setFormData({ ...formData, notes_1_label: e.target.value })}
                            dir="auto"
                            placeholder="Note 1 Title..."
                            className={`h-7.5 px-2 text-xs font-black backdrop-blur-sm rounded-lg transition ${getNoteThemeStyles(formData.notes_1_theme).input}`}
                          />
                        </div>

                        {/* Theme Color Dots */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/80 p-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                          {NOTE_THEMES.map((theme) => (
                            <button
                              key={theme.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, notes_1_theme: theme.value })}
                              className={`w-4 h-4 rounded-full border transition-all hover:scale-115 cursor-pointer ${
                                NOTE_THEME_BUTTON_CLASSES[theme.value] ?? ''
                              } ${
                                formData.notes_1_theme === theme.value 
                                  ? 'border-slate-900 ring-2 ring-blue-400 ring-offset-1 scale-110' 
                                  : 'border-white/80 opacity-80 hover:opacity-100'
                              }`}
                              title={theme.label}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Saved Options Selector for Note 1 */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <Select
                            value={selectedNote1Id || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                setSelectedNote1Id("")
                                return
                              }
                              applySavedNote1(value)
                            }}
                          >
                            <SelectTrigger className="h-7.5 text-xs border-slate-200/80 bg-white/90 backdrop-blur-sm rounded-lg font-medium">
                              <SelectValue placeholder="Saved options / گزینه‌های ذخیره شده" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="none" className="text-xs font-bold text-slate-500">
                                📋 Select saved note option... ({savedNotes1.length} available)
                              </SelectItem>
                              {savedNotes1.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-xs py-2">
                                  <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                    <span className="font-bold text-slate-900 truncate">{opt.label}</span>
                                    <span className="text-[10px] text-slate-500 font-mono truncate">
                                      {opt.content.replace(/\s+/g, ' ')}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => saveCurrentNote1()}
                          disabled={!formData.notes_1?.trim() || Boolean(selectedSavedNote1 && !isNote1PresetDirty)}
                          className="h-7.5 px-2.5 text-xs font-bold border-blue-200 bg-white/90 hover:bg-blue-50 text-blue-700 rounded-lg shrink-0 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                          title={selectedSavedNote1 ? "Update the selected preset with these changes" : "Save current Note 1 as a reusable preset"}
                        >
                          <Save className="h-3 w-3 mr-1 text-blue-600" />
                          {selectedSavedNote1 ? "Update" : "Save preset"}
                        </Button>
                        {selectedNote1Id && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={saveCurrentNote1AsNew}
                              disabled={!formData.notes_1?.trim()}
                              className="h-7.5 px-2 text-xs border-emerald-200 bg-white/90 hover:bg-emerald-50 text-emerald-700 rounded-lg shrink-0 cursor-pointer"
                              title="Keep the selected preset and save a new copy"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Save as new
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deleteSavedNote1}
                              className="h-7.5 px-1.5 text-xs border-red-200 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg shrink-0 cursor-pointer"
                              title="Delete the selected Note 1 preset"
                              aria-label="Delete selected Note 1 preset"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {formData.notes_1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearNote1}
                            className="h-7.5 px-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
                            title="Clear Note 1 content"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="mb-2 min-h-4 px-1 text-[10px] font-semibold">
                        {selectedSavedNote1 ? (
                          <span className={isNote1PresetDirty ? "text-amber-700" : "text-emerald-700"}>
                            {isNote1PresetDirty ? "Unsaved preset changes" : `Saved preset: ${selectedSavedNote1.label}`}
                          </span>
                        ) : (
                          <span className="text-slate-500">Title, note text, and color are saved together.</span>
                        )}
                      </div>

                      {/* Note 1 Textarea */}
                      <div className="relative">
                        <Textarea
                          value={formData.notes_1 || ""}
                          onChange={(e) => setFormData({ ...formData, notes_1: e.target.value })}
                          dir="auto"
                          placeholder="Add custom contact / loading notes here (e.g. (+93) 0 700 203 307)..."
                          className={`backdrop-blur-sm rounded-lg text-xs sm:text-sm font-medium leading-relaxed resize-y ${getNoteThemeStyles(formData.notes_1_theme).textarea}`}
                          rows={3}
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                          <span className="font-[vazirmatn]">یادداشت شماره یک بارنامه</span>
                          <span>{(formData.notes_1 || "").length} characters</span>
                        </div>
                      </div>
                    </div>

                    {/* Note 2 */}
                    <div className={`p-3 sm:p-3.5 rounded-xl backdrop-blur-xl border shadow-2xs transition-all ${getNoteThemeStyles(formData.notes_2_theme).container}`}>
                      {/* Note 2 Header */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <BookmarkPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <Input
                            type="text"
                            value={formData.notes_2_label || ""}
                            onChange={(e) => setFormData({ ...formData, notes_2_label: e.target.value })}
                            dir="auto"
                            placeholder="Note 2 Title..."
                            className={`h-7.5 px-2 text-xs font-black backdrop-blur-sm rounded-lg transition ${getNoteThemeStyles(formData.notes_2_theme).input}`}
                          />
                        </div>

                        {/* Theme Color Dots */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/80 p-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                          {NOTE_THEMES.map((theme) => (
                            <button
                              key={theme.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, notes_2_theme: theme.value })}
                              className={`w-4 h-4 rounded-full border transition-all hover:scale-115 cursor-pointer ${
                                NOTE_THEME_BUTTON_CLASSES[theme.value] ?? ''
                              } ${
                                formData.notes_2_theme === theme.value 
                                  ? 'border-slate-900 ring-2 ring-blue-400 ring-offset-1 scale-110' 
                                  : 'border-white/80 opacity-80 hover:opacity-100'
                              }`}
                              title={theme.label}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Saved Options Selector for Note 2 */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <Select
                            value={selectedNote2Id || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                setSelectedNote2Id("")
                                return
                              }
                              applySavedNote2(value)
                            }}
                          >
                            <SelectTrigger className="h-7.5 text-xs border-slate-200/80 bg-white/90 backdrop-blur-sm rounded-lg font-medium">
                              <SelectValue placeholder="Saved options / گزینه‌های ذخیره شده" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="none" className="text-xs font-bold text-slate-500">
                                📋 Select saved note option... ({savedNotes2.length} available)
                              </SelectItem>
                              {savedNotes2.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-xs py-2">
                                  <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                    <span className="font-bold text-slate-900 truncate">{opt.label}</span>
                                    <span className="text-[10px] text-slate-500 font-mono truncate">
                                      {opt.content.replace(/\s+/g, ' ')}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => saveCurrentNote2()}
                          disabled={!formData.notes_2?.trim() || Boolean(selectedSavedNote2 && !isNote2PresetDirty)}
                          className="h-7.5 px-2.5 text-xs font-bold border-blue-200 bg-white/90 hover:bg-blue-50 text-blue-700 rounded-lg shrink-0 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                          title={selectedSavedNote2 ? "Update the selected preset with these changes" : "Save current Note 2 as a reusable preset"}
                        >
                          <Save className="h-3 w-3 mr-1 text-blue-600" />
                          {selectedSavedNote2 ? "Update" : "Save preset"}
                        </Button>
                        {selectedNote2Id && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={saveCurrentNote2AsNew}
                              disabled={!formData.notes_2?.trim()}
                              className="h-7.5 px-2 text-xs border-emerald-200 bg-white/90 hover:bg-emerald-50 text-emerald-700 rounded-lg shrink-0 cursor-pointer"
                              title="Keep the selected preset and save a new copy"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Save as new
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deleteSavedNote2}
                              className="h-7.5 px-1.5 text-xs border-red-200 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg shrink-0 cursor-pointer"
                              title="Delete the selected Note 2 preset"
                              aria-label="Delete selected Note 2 preset"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {formData.notes_2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearNote2}
                            className="h-7.5 px-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
                            title="Clear Note 2 content"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="mb-2 min-h-4 px-1 text-[10px] font-semibold">
                        {selectedSavedNote2 ? (
                          <span className={isNote2PresetDirty ? "text-amber-700" : "text-emerald-700"}>
                            {isNote2PresetDirty ? "Unsaved preset changes" : `Saved preset: ${selectedSavedNote2.label}`}
                          </span>
                        ) : (
                          <span className="text-slate-500">Title, note text, and color are saved together.</span>
                        )}
                      </div>

                      {/* Note 2 Textarea */}
                      <div className="relative">
                        <Textarea
                          value={formData.notes_2 || ""}
                          onChange={(e) => setFormData({ ...formData, notes_2: e.target.value })}
                          dir="auto"
                          placeholder="Add border representative contact info, customs notes, etc..."
                          className={`backdrop-blur-sm rounded-lg text-xs sm:text-sm font-medium leading-relaxed resize-y ${getNoteThemeStyles(formData.notes_2_theme).textarea}`}
                          rows={3}
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                          <span className="font-[vazirmatn]">یادداشت شماره دو بارنامه</span>
                          <span>{(formData.notes_2 || "").length} characters</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 02 Shipper, 03 Consignee & 04 Notify Party — 3-Column Side-by-Side Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {/* 02 Shipper Card */}
              <Card id="section-shipper" className="bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden transition-all flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 bg-linear-to-r from-blue-50/80 via-indigo-50/40 to-white">
                    <CardTitle className="text-sm sm:text-base flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-xs">
                          02
                        </span>
                        <div className="p-1.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-950 text-sm sm:text-base tracking-tight select-none">Shipper / Exporter</span>
                          <span className="text-[10px] text-blue-700 font-bold block font-[vazirmatn]">فرستنده / صادرکننده</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSwapShipperConsignee}
                          className="h-7 px-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-[10px] font-bold cursor-pointer"
                          title="Swap Shipper with Consignee"
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-0.5 text-blue-600" />
                          Swap
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyShipperToNotify}
                          className="h-7 px-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[10px] font-bold cursor-pointer"
                          title="Copy Shipper to Notify Party"
                        >
                          <Copy className="h-3 w-3 mr-0.5 text-amber-600" />
                          ➔ Notify
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearShipperFields}
                          className="h-7 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer"
                          title="Clear all Shipper fields"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3.5 p-4 sm:p-5">
                    {/* Saved Shippers Directory Bar */}
                    <div className="rounded-2xl border border-blue-200/80 bg-linear-to-br from-blue-50/80 to-indigo-50/40 p-3 shadow-2xs">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>Directory</span>
                              <span className="rounded-full bg-blue-200/80 px-1.5 py-0.2 text-[9.5px] font-black text-blue-900">
                                {savedShippers.length}
                              </span>
                            </span>
                            <span className="font-[vazirmatn] text-blue-900 font-bold text-[10px]">فرستنده‌های ذخیره شده</span>
                          </label>
                          <Select
                            value={selectedShipperId || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                setSelectedShipperId("")
                                return
                              }
                              applySavedShipper(value)
                            }}
                          >
                            <SelectTrigger className="h-9.5 text-xs font-bold text-slate-900 border-white bg-white/90 backdrop-blur-md rounded-xl shadow-2xs">
                              <SelectValue placeholder="Select from directory..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="none">Select from saved directory...</SelectItem>
                              {savedShippers.map((shipper, index) => (
                                <SelectItem key={`${shipper.id}-${index}`} value={shipper.id} className="text-xs py-2">
                                  <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                    <span className="font-extrabold text-slate-900 truncate">{shipper.name}</span>
                                    {(shipper.address || shipper.contact || shipper.email) && (
                                      <span className="text-[10px] text-slate-500 font-mono truncate">
                                        {[shipper.address, shipper.contact, shipper.email].filter(Boolean).join(" • ")}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={saveCurrentShipper}
                            className={`h-8 font-black text-xs rounded-xl shadow-2xs cursor-pointer transition-all ${
                              isShipperExisting
                                ? "border-blue-300 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                : "border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                            }`}
                            title={isShipperExisting ? "Update existing shipper in directory" : "Save as new shipper"}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {isShipperExisting ? "Update" : "Save New"}
                          </Button>
                          {selectedShipperId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={deleteSavedShipper}
                              className="h-8 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs cursor-pointer"
                              title="Delete selected saved shipper"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Shipper Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            shipper_name: "AFGHAN ARYA DRY FRUITS & SAFFRON EXPORT CO.",
                            shipper_address: "Charahi Haji Yaqoob, Shahr-e-Naw, Kabul, Afghanistan",
                            shipper_contact: "+93 700 284 920",
                            shipper_email: "export@afghanarya.af",
                          }))
                          toast.success("Loaded Afghan Exporter preset")
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                      >
                        🇦🇫 Kabul
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            shipper_name: "SKY ARIANA GLOBAL LOGISTICS FZE",
                            shipper_address: "Jebel Ali Free Zone (JAFZA), Dubai, United Arab Emirates",
                            shipper_contact: "+971 4 881 2345",
                            shipper_email: "ops@skyarianalogistics.com",
                          }))
                          toast.success("Loaded Dubai Shipper preset")
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                      >
                        🇦🇪 Dubai
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            shipper_name: "YAFEZ INTERNATIONAL TRADING CO.",
                            shipper_address: "Boulevard Imam Khomeini, Bandar Abbas, Iran",
                            shipper_contact: "+98 76 3222 6028",
                            shipper_email: "yafez.trade@gmail.com",
                          }))
                          toast.success("Loaded Iran Exporter preset")
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                      >
                        🇮🇷 Iran
                      </button>
                    </div>

                    {/* Shipper Name with Live Floating Autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>Shipper Name</span>
                          {isShipperExisting && (
                            <span className="rounded-md bg-blue-100 text-blue-800 px-1 py-0.2 text-[8.5px] font-black">Directory</span>
                          )}
                        </span>
                        <span className="font-[vazirmatn] text-blue-900 font-bold text-[10.5px]">نام فرستنده</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-blue-600 pointer-events-none">
                          <User className="w-4 h-4" />
                        </div>
                        <Input
                          name="shipper_name"
                          value={formData.shipper_name}
                          onFocus={() => setShowShipperDropdown(true)}
                          onChange={(e) => {
                            handleInputChange(e)
                            setShowShipperDropdown(true)
                            setShipperSearchQuery(e.target.value)
                          }}
                          placeholder="Type or search shipper..."
                          className="pl-9 rounded-xl h-10 text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                        />
                      </div>

                      {/* Floating Autocomplete Suggestions */}
                      {showShipperDropdown && matchingShippers.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-blue-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl no-scrollbar">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1 px-1">
                            <span className="text-[10.5px] font-black text-blue-950">
                              Matches ({matchingShippers.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowShipperDropdown(false)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <div className="space-y-1">
                            {matchingShippers.slice(0, 8).map((shipper) => (
                              <button
                                key={shipper.id}
                                type="button"
                                onClick={() => {
                                  applySavedShipper(shipper.id)
                                  setShowShipperDropdown(false)
                                }}
                                className="w-full flex flex-col items-start p-1.5 rounded-xl text-left bg-slate-50/70 hover:bg-blue-50 border border-slate-100 hover:border-blue-300 transition-all cursor-pointer group"
                              >
                                <span className="text-xs font-black text-slate-900 group-hover:text-blue-950 truncate w-full">
                                  {shipper.name}
                                </span>
                                {shipper.address && (
                                  <p className="text-[9.5px] text-slate-500 font-medium truncate w-full mt-0.5">
                                    {shipper.address}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shipper Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-800">
                          Shipper Address
                        </label>
                        <span className="font-[vazirmatn] text-blue-900 font-bold text-[10.5px]">آدرس فرستنده</span>
                      </div>
                      <Textarea
                        name="shipper_address"
                        value={formData.shipper_address}
                        onChange={handleInputChange}
                        placeholder="Enter shipper complete address..."
                        rows={3}
                        className="rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs min-h-[72px] transition-all"
                      />
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {["Kabul, AF", "Dubai, UAE", "Bandar Abbas, IR", "Mumbai, IN"].map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                shipper_address: prev.shipper_address ? `${prev.shipper_address.trim()}, ${city}` : city,
                              }))
                            }}
                            className="text-[9px] font-semibold bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-600 rounded px-1.5 py-0.5 transition cursor-pointer"
                          >
                            + {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black text-slate-800 mb-1 flex items-center justify-between">
                          <span>Phone</span>
                          <span className="font-[vazirmatn] text-blue-900 font-bold text-[10px]">تلفن</span>
                        </label>
                        <Input
                          name="shipper_contact"
                          value={formData.shipper_contact || ""}
                          onChange={handleInputChange}
                          placeholder="+93 700 123 456"
                          type="tel"
                          className="rounded-xl h-9 text-xs font-bold text-slate-950 bg-white border-slate-200 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-800 mb-1 flex items-center justify-between">
                          <span>Email</span>
                          <span className="font-[vazirmatn] text-blue-900 font-bold text-[10px]">ایمیل</span>
                        </label>
                        <Input
                          name="shipper_email"
                          value={formData.shipper_email || ""}
                          onChange={handleInputChange}
                          placeholder="info@company.com"
                          type="email"
                          className="rounded-xl h-9 text-xs font-bold text-slate-950 bg-white border-slate-200 shadow-inner"
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* 03 Consignee Card */}
              <Card id="section-consignee" className="bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden transition-all flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 bg-linear-to-r from-emerald-50/80 via-teal-50/40 to-white">
                    <CardTitle className="text-sm sm:text-base flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black shadow-xs">
                          03
                        </span>
                        <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-950 text-sm sm:text-base tracking-tight select-none">Consignee / Importer</span>
                          <span className="text-[10px] text-emerald-700 font-bold block font-[vazirmatn]">گیرنده / واردکننده</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSwapShipperConsignee}
                          className="h-7 px-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold cursor-pointer"
                          title="Swap Consignee with Shipper"
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-0.5 text-emerald-600" />
                          Swap
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyConsigneeToNotify}
                          className="h-7 px-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[10px] font-bold cursor-pointer"
                          title="Copy Consignee to Notify Party"
                        >
                          <Copy className="h-3 w-3 mr-0.5 text-amber-600" />
                          ➔ Notify
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSetConsigneeToOrder}
                          className="h-7 px-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800 text-[10px] font-black cursor-pointer"
                          title="Set Consignee to 'TO ORDER OF SHIPPER' (Negotiable BOL)"
                        >
                          📜 Order
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearConsigneeFields}
                          className="h-7 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer"
                          title="Clear all Consignee fields"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3.5 p-4 sm:p-5">
                    {/* Saved Consignees Directory Bar */}
                    <div className="rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50/80 to-teal-50/40 p-3 shadow-2xs">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>Directory</span>
                              <span className="rounded-full bg-emerald-200/80 px-1.5 py-0.2 text-[9.5px] font-black text-emerald-900">
                                {savedConsignees.length}
                              </span>
                            </span>
                            <span className="font-[vazirmatn] text-emerald-900 font-bold text-[10px]">گیرنده‌های ذخیره شده</span>
                          </label>
                          <Select
                            value={selectedConsigneeId || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                setSelectedConsigneeId("")
                                return
                              }
                              applySavedConsignee(value)
                            }}
                          >
                            <SelectTrigger className="h-9.5 text-xs font-bold text-slate-900 border-white bg-white/90 backdrop-blur-md rounded-xl shadow-2xs">
                              <SelectValue placeholder="Select from directory..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="none">Select from saved directory...</SelectItem>
                              {savedConsignees.map((consignee, index) => (
                                <SelectItem key={`${consignee.id}-${index}`} value={consignee.id} className="text-xs py-2">
                                  <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                    <span className="font-extrabold text-slate-900 truncate">{consignee.name}</span>
                                    {(consignee.address || consignee.contact || consignee.email) && (
                                      <span className="text-[10px] text-slate-500 font-mono truncate">
                                        {[consignee.address, consignee.contact, consignee.email].filter(Boolean).join(" • ")}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={saveCurrentConsignee}
                            className={`h-8 font-black text-xs rounded-xl shadow-2xs cursor-pointer transition-all ${
                              isConsigneeExisting
                                ? "border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                : "border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                            }`}
                            title={isConsigneeExisting ? "Update existing consignee in directory" : "Save as new consignee"}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {isConsigneeExisting ? "Update" : "Save New"}
                          </Button>
                          {selectedConsigneeId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={deleteSavedConsignee}
                              className="h-8 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs cursor-pointer"
                              title="Delete selected saved consignee"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Consignee Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSetConsigneeToOrder}
                        className="rounded-lg border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9.5px] font-black text-purple-900 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                      >
                        📜 TO ORDER OF SHIPPER
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            consignee_name: "YAAQOUB HAMDAN GENERAL TRADING LLC",
                            consignee_address: "Al Ras, Deira, P.O.Box 88201, Dubai, United Arab Emirates",
                            consignee_contact: "+971 4 226 8890",
                            consignee_email: "info@yaaqoubtrading.ae",
                          }))
                          toast.success("Loaded Yaaqoub Hamdan (Dubai) Consignee preset")
                        }}
                        className="rounded-lg border border-emerald-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                      >
                        🇦🇪 Dubai
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            consignee_name: "SOCIETE COMMERCIALE IVOIRIENNE SARL",
                            consignee_address: "Zone Industrielle de Yopougon, 21 BP 455, Abidjan 21, Côte d'Ivoire",
                            consignee_contact: "+225 27 23 45 67 89",
                            consignee_email: "contact@sci-abidjan.ci",
                          }))
                          toast.success("Loaded Abidjan Consignee preset")
                        }}
                        className="rounded-lg border border-emerald-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                      >
                        🇨🇮 Ivory Coast
                      </button>
                    </div>

                    {/* Consignee Name with Live Floating Autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>Consignee Name</span>
                          {isConsigneeExisting && (
                            <span className="rounded-md bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[8.5px] font-black">Directory</span>
                          )}
                        </span>
                        <span className="font-[vazirmatn] text-emerald-900 font-bold text-[10.5px]">نام گیرنده</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 pointer-events-none">
                          <User className="w-4 h-4" />
                        </div>
                        <Input
                          name="consignee_name"
                          value={formData.consignee_name}
                          onFocus={() => setShowConsigneeDropdown(true)}
                          onChange={(e) => {
                            handleInputChange(e)
                            setShowConsigneeDropdown(true)
                            setConsigneeSearchQuery(e.target.value)
                          }}
                          placeholder="Type or search consignee..."
                          className="pl-9 rounded-xl h-10 text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                          dir="auto"
                        />
                      </div>

                      {/* Floating Autocomplete Suggestions */}
                      {showConsigneeDropdown && matchingConsignees.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-emerald-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl no-scrollbar">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1 px-1">
                            <span className="text-[10.5px] font-black text-emerald-950">
                              Matches ({matchingConsignees.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowConsigneeDropdown(false)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <div className="space-y-1">
                            {matchingConsignees.slice(0, 8).map((consignee) => (
                              <button
                                key={consignee.id}
                                type="button"
                                onClick={() => {
                                  applySavedConsignee(consignee.id)
                                  setShowConsigneeDropdown(false)
                                }}
                                className="w-full flex flex-col items-start p-1.5 rounded-xl text-left bg-slate-50/70 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-300 transition-all cursor-pointer group"
                              >
                                <span className="text-xs font-black text-slate-900 group-hover:text-emerald-950 truncate w-full">
                                  {consignee.name}
                                </span>
                                {consignee.address && (
                                  <p className="text-[9.5px] text-slate-500 font-medium truncate w-full mt-0.5">
                                    {consignee.address}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Consignee Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-800">
                          Consignee Address
                        </label>
                        <span className="font-[vazirmatn] text-emerald-900 font-bold text-[10.5px]">آدرس گیرنده</span>
                      </div>
                      <Textarea
                        name="consignee_address"
                        value={formData.consignee_address}
                        onChange={handleInputChange}
                        placeholder="Enter consignee complete destination address..."
                        rows={3}
                        className="rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs min-h-[72px] transition-all"
                      />
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {["Abidjan, Ivory Coast", "Dubai, UAE", "Nhava Sheva, India", "Rotterdam, Netherlands"].map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                consignee_address: prev.consignee_address ? `${prev.consignee_address.trim()}, ${city}` : city,
                              }))
                            }}
                            className="text-[9px] font-semibold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 rounded px-1.5 py-0.5 transition cursor-pointer"
                          >
                            + {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black text-slate-800 mb-1 flex items-center justify-between">
                          <span>Phone</span>
                          <span className="font-[vazirmatn] text-emerald-900 font-bold text-[10px]">تلفن</span>
                        </label>
                        <Input
                          name="consignee_contact"
                          value={formData.consignee_contact || ""}
                          onChange={handleInputChange}
                          placeholder="+971 4 123 4567"
                          type="tel"
                          className="rounded-xl h-9 text-xs font-bold text-slate-950 bg-white border-slate-200 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-800 mb-1 flex items-center justify-between">
                          <span>Email</span>
                          <span className="font-[vazirmatn] text-emerald-900 font-bold text-[10px]">ایمیل</span>
                        </label>
                        <Input
                          name="consignee_email"
                          value={formData.consignee_email || ""}
                          onChange={handleInputChange}
                          placeholder="import@buyer.com"
                          type="email"
                          className="rounded-xl h-9 text-xs font-bold text-slate-950 bg-white border-slate-200 shadow-inner"
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* 04 Notify Party Card */}
              <Card id="section-notify" className="bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden transition-all flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 bg-linear-to-r from-amber-50/80 via-orange-50/40 to-white">
                    <CardTitle className="text-sm sm:text-base flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-600 text-white text-[11px] font-black shadow-xs">
                          04
                        </span>
                        <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-950 text-sm sm:text-base tracking-tight select-none">Notify Party</span>
                          <span className="text-[10px] text-amber-700 font-bold block font-[vazirmatn]">طرف اطلاع / نماینده دوم</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSetNotifySameAsConsignee}
                          className="h-7 px-1.5 rounded-lg border border-amber-300 bg-amber-100/70 hover:bg-amber-200 text-amber-950 text-[10px] font-black cursor-pointer"
                          title="Set Notify Party to 'SAME AS CONSIGNEE'"
                        >
                          📋 Same
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyConsigneeToNotify}
                          className="h-7 px-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold cursor-pointer"
                          title="Copy full Consignee details into Notify Party"
                        >
                          <Copy className="h-3 w-3 mr-0.5 text-emerald-600" />
                          Consignee
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearNotifyPartyFields}
                          className="h-7 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer"
                          title="Clear all Notify Party fields"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3.5 p-4 sm:p-5">
                    {/* Saved Notify Parties Directory Bar */}
                    <div className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/80 to-orange-50/40 p-3 shadow-2xs">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>Directory</span>
                              <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9.5px] font-black text-amber-900">
                                {savedNotifyParties.length}
                              </span>
                            </span>
                            <span className="font-[vazirmatn] text-amber-900 font-bold text-[10px]">طرف‌های اطلاع ذخیره شده</span>
                          </label>
                          <Select
                            value={selectedNotifyPartyId || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                setSelectedNotifyPartyId("")
                                return
                              }
                              applySavedNotifyParty(value)
                            }}
                          >
                            <SelectTrigger className="h-9.5 text-xs font-bold text-slate-900 border-white bg-white/90 backdrop-blur-md rounded-xl shadow-2xs">
                              <SelectValue placeholder="Select from directory..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="none">Select from saved notify directory...</SelectItem>
                              {savedNotifyParties.map((notifyParty, index) => (
                                <SelectItem key={`${notifyParty.id}-${index}`} value={notifyParty.id} className="text-xs py-2">
                                  <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                    <span className="font-extrabold text-slate-900 truncate">{notifyParty.name}</span>
                                    {notifyParty.address && (
                                      <span className="text-[10px] text-slate-500 font-mono truncate">
                                        {notifyParty.address}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={saveCurrentNotifyParty}
                            className="h-8 font-black text-xs rounded-xl shadow-2xs border-amber-300 bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 cursor-pointer transition-all"
                            title="Save current notify party to directory"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          {selectedNotifyPartyId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={deleteSavedNotifyParty}
                              className="h-8 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs cursor-pointer"
                              title="Delete selected saved notify party"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Notify Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            notify_party: "YAAQOUB HAMDAN GENERAL TRADING LLC",
                            notify_party_address: "Al Ras, Deira, P.O.Box 88201, Dubai, United Arab Emirates",
                          }))
                          toast.success("Loaded Yaaqoub Hamdan (Dubai) Notify preset")
                        }}
                        className="rounded-lg border border-amber-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-amber-600 hover:text-white transition cursor-pointer"
                      >
                        🇦🇪 Dubai
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            notify_party: "ABIDJAN PORT TRANSIT & CLEARANCE SARL",
                            notify_party_address: "Port Autonome d'Abidjan, Boulevard de Vridi, BP 982, Abidjan, Côte d'Ivoire",
                          }))
                          toast.success("Loaded Abidjan Clearance Agent Notify preset")
                        }}
                        className="rounded-lg border border-amber-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 hover:bg-amber-600 hover:text-white transition cursor-pointer"
                      >
                        🇨🇮 Abidjan
                      </button>
                      <button
                        type="button"
                        onClick={handleSetNotifySameAsConsignee}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-black text-amber-900 hover:bg-amber-600 hover:text-white transition cursor-pointer"
                      >
                        📋 SAME AS CONSIGNEE
                      </button>
                    </div>

                    {/* Notify Party Name with Live Floating Autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-black text-slate-800 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>Notify Party Name</span>
                          {isNotifyPartyExisting && (
                            <span className="rounded-md bg-amber-100 text-amber-800 px-1 py-0.2 text-[8.5px] font-black">Directory</span>
                          )}
                        </span>
                        <span className="font-[vazirmatn] text-amber-900 font-bold text-[10.5px]">نام طرف اطلاع</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-amber-600 pointer-events-none">
                          <Bell className="w-4 h-4" />
                        </div>
                        <Input
                          name="notify_party"
                          value={formData.notify_party}
                          onFocus={() => setShowNotifyPartyDropdown(true)}
                          onChange={(e) => {
                            handleInputChange(e)
                            setShowNotifyPartyDropdown(true)
                            setNotifyPartySearchQuery(e.target.value)
                          }}
                          placeholder="Type or search notify party..."
                          className="pl-9 rounded-xl h-10 text-xs sm:text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
                          dir="auto"
                        />
                      </div>

                      {/* Floating Autocomplete Suggestions */}
                      {showNotifyPartyDropdown && matchingNotifyParties.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-amber-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl no-scrollbar">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1 px-1">
                            <span className="text-[10.5px] font-black text-amber-950">
                              Matches ({matchingNotifyParties.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowNotifyPartyDropdown(false)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <div className="space-y-1">
                            {matchingNotifyParties.slice(0, 8).map((notify) => (
                              <button
                                key={notify.id}
                                type="button"
                                onClick={() => {
                                  applySavedNotifyParty(notify.id)
                                  setShowNotifyPartyDropdown(false)
                                }}
                                className="w-full flex flex-col items-start p-1.5 rounded-xl text-left bg-slate-50/70 hover:bg-amber-50 border border-slate-100 hover:border-amber-300 transition-all cursor-pointer group"
                              >
                                <span className="text-xs font-black text-slate-900 group-hover:text-amber-950 truncate w-full">
                                  {notify.name}
                                </span>
                                {notify.address && (
                                  <p className="text-[9.5px] text-slate-500 font-medium truncate w-full mt-0.5">
                                    {notify.address}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notify Party Address / Contact */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-800">
                          Address & Arrival Contact
                        </label>
                        <span className="font-[vazirmatn] text-amber-900 font-bold text-[10.5px]">آدرس و تلفن طرف اطلاع</span>
                      </div>
                      <Textarea
                        name="notify_party_address"
                        value={formData.notify_party_address}
                        onChange={handleInputChange}
                        placeholder="Enter notify party complete address, phone..."
                        rows={3}
                        className="rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs min-h-[72px] transition-all"
                      />
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {["Deira, Dubai, UAE", "Abidjan, Ivory Coast", "Bandar Abbas, Iran", "Kabul, AF"].map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                notify_party_address: prev.notify_party_address ? `${prev.notify_party_address.trim()}, ${city}` : city,
                              }))
                            }}
                            className="text-[9px] font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 rounded px-1.5 py-0.5 transition cursor-pointer"
                          >
                            + {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>

            {/* 05 Cargo Details Card */}
            <Card id="section-cargo" className="overflow-hidden rounded-[28px] border border-purple-100 bg-white/90 shadow-[0_20px_55px_-24px_rgba(88,28,135,0.28)] backdrop-blur-2xl">
              <CardHeader className="border-b border-purple-100 bg-linear-to-r from-purple-50/90 via-white to-indigo-50/60 px-4 py-4 sm:px-5">
                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-600 text-white text-[11px] font-black shadow-xs">
                      05
                    </span>
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Cargo Details & Specifications</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-purple-700">Packages, weights, rates and printable cargo description</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAutoCalculateWeights}
                      className="h-9 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 px-3.5 text-xs font-black text-white shadow-md shadow-purple-500/20 transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-95 cursor-pointer"
                      title="Calculate Net Weight, Gross Weight and Goods Value"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1" />
                      Calculate totals
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllCargoFields}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-bold text-slate-600 shadow-2xs hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      title="Clear all Cargo fields"
                    >
                      ✕ Clear All
                    </Button>
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-900 font-[vazirmatn]" dir="rtl">
                      مشخصات کالا و محموله
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-5 pt-4 sm:px-5">
                {/* Live Weights & Calculation Metrics KPI Cards */}
                {(() => {
                  const liveCargoCalc = calculateMultiCargo(
                    formData.number_of_packages || "",
                    formData.kgs_per_carton || "",
                    formData.gross_weight_per_carton || "",
                    formData.rate_per_kgs || ""
                  )
                  const isMulti = liveCargoCalc.isMultiItem && liveCargoCalc.items.length > 1
                  const hasPackageInput = liveCargoCalc.totalPackages > 0
                  const hasWeightInput = liveCargoCalc.items.some((item) => item.netPerCarton > 0 || item.grossPerCarton > 0)
                  const calculationReady = hasPackageInput && hasWeightInput

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Live shipment totals</p>
                          <p className="text-[10px] font-medium text-slate-500">Updates automatically while you enter package and rate details.</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          calculationReady
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${calculationReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {calculationReady ? "Auto calculation active" : "Enter packages + carton weight"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
                        {/* Total Packages */}
                        <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-linear-to-br from-purple-50/90 to-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                              <Package className="h-3.5 w-3.5 text-purple-600" />
                              Total Packages
                            </span>
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-200/70 px-1.5 py-0.2 rounded-md">
                              بسته‌ها
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-black text-purple-950 truncate tracking-tight">
                            {isMulti && liveCargoCalc.totalPackages > 0
                              ? `${liveCargoCalc.totalPackages.toLocaleString("en-US")} CTNS`
                              : formData.number_of_packages || "0"}
                          </p>
                          <span className="text-[10px] text-purple-700 font-medium block mt-0.5 truncate">
                            {isMulti
                              ? liveCargoCalc.items.map((it, idx) => `Item ${idx + 1}: ${it.packages}`).join(" | ")
                              : "Cartons / Units"}
                          </span>
                        </div>

                        {/* Total Net Weight */}
                        <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-linear-to-br from-blue-50/90 to-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                              <Scale className="h-3.5 w-3.5 text-blue-600" />
                              Total Net Weight
                            </span>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-200/70 px-1.5 py-0.2 rounded-md">
                              وزن خالص
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-black text-blue-950 truncate tracking-tight">
                            {isMulti && liveCargoCalc.totalNetWeight > 0
                              ? `${formatWeightValue(liveCargoCalc.totalNetWeight)} KG`
                              : formData.net_weight || "0 KG"}
                          </p>
                          <span className="text-[10px] text-blue-700 font-medium block mt-0.5 truncate">
                            {isMulti
                              ? liveCargoCalc.items.map((it) => `${formatWeightValue(it.netWeight)} KG`).join(" + ")
                              : "Net Cargo Weight"}
                          </span>
                        </div>

                        {/* Total Gross Weight */}
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-linear-to-br from-indigo-50/90 to-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                              <Scale className="h-3.5 w-3.5 text-indigo-600" />
                              Total Gross Weight
                            </span>
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-200/70 px-1.5 py-0.2 rounded-md">
                              وزن ناخالص
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-black text-indigo-950 truncate tracking-tight">
                            {isMulti && liveCargoCalc.totalGrossWeight > 0
                              ? `${formatWeightValue(liveCargoCalc.totalGrossWeight)} KG`
                              : formData.gross_weight || "0 KG"}
                          </p>
                          <span className="text-[10px] text-indigo-700 font-medium block mt-0.5 truncate">
                            {isMulti
                              ? liveCargoCalc.items.map((it) => `${formatWeightValue(it.grossWeight)} KG`).join(" + ")
                              : "Gross with Packaging"}
                          </span>
                        </div>

                        {/* Estimated Goods Value */}
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50/90 to-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                              <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                              Est. Goods Value
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-200/70 px-1.5 py-0.2 rounded-md">
                              ارزش کالا
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-black text-emerald-950 truncate tracking-tight">
                            {isMulti && liveCargoCalc.totalGoodsValue > 0
                              ? formatUsdValue(liveCargoCalc.totalGoodsValue)
                              : formData.goods_value || "$0.00"}
                          </p>
                          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5 truncate">
                            {isMulti
                              ? liveCargoCalc.items.map((it) => `$${it.goodsValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`).join(" + ")
                              : "Total Declared Value"}
                          </span>
                        </div>
                      </div>

                      {/* Multi-Item Cargo Breakdown Interactive Live Strip */}
                      {isMulti && (
                        <div className="rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50/90 via-indigo-50/60 to-purple-50/90 p-3.5 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-purple-600 text-white text-[10px] font-black">
                                2+
                              </span>
                              <span className="text-xs font-black text-purple-950">
                                Multi-Item Shipment Breakdown ({liveCargoCalc.items.length} Cargo Items)
                              </span>
                            </div>
                            <span className="text-[10.5px] font-black text-purple-700 bg-purple-200/70 px-2 py-0.5 rounded-lg border border-purple-300">
                              تفکیک اقلام چندگانه محموله
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {liveCargoCalc.items.map((it, idx) => (
                              <div key={idx} className="rounded-xl bg-white/90 p-3 border border-purple-200/80 shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5 text-purple-600" />
                                    Item #{idx + 1}
                                  </span>
                                  <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {it.packages.toLocaleString("en-US")} CTNS
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                                    <span className="text-blue-600 block text-[9.5px] font-bold">Net Weight</span>
                                    <span className="font-black text-blue-950 text-xs">{formatWeightValue(it.netWeight)} KG</span>
                                    <span className="text-[9px] text-blue-500 block font-medium">({it.netPerCarton} kg/ctn)</span>
                                  </div>
                                  <div className="bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100">
                                    <span className="text-indigo-600 block text-[9.5px] font-bold">Gross Weight</span>
                                    <span className="font-black text-indigo-950 text-xs">{formatWeightValue(it.grossWeight)} KG</span>
                                    <span className="text-[9px] text-indigo-500 block font-medium">({it.grossPerCarton} kg/ctn)</span>
                                  </div>
                                </div>
                                <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                                  <span className="text-[10px] font-bold text-emerald-800">Rate: ${it.rate}/kg</span>
                                  <span className="text-xs font-black text-emerald-950">
                                    ${it.goodsValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Field Grid - Row 1: Container, Seal & Package Quantities */}
                <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/35 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-950">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">1</span>
                      Shipment & packaging inputs
                    </span>
                    <span className="font-[vazirmatn] text-xs font-bold text-purple-800" dir="rtl">مشخصات کانتینر و بسته‌بندی</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {/* Container No */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>Container No.</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">شماره کانتینر</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-purple-500 pointer-events-none">
                          <Box className="w-4 h-4" />
                        </div>
                        <Input
                          name="container_numbers"
                          value={formData.container_numbers}
                          onChange={(e) => handleCargoFieldChange("container_numbers", e.target.value)}
                          placeholder="e.g. MSCU1234567"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold uppercase text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Seal No */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>Seal No.</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">شماره پلمپ</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-purple-500 pointer-events-none">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <Input
                          name="seal_numbers"
                          value={formData.seal_numbers}
                          onChange={(e) => handleCargoFieldChange("seal_numbers", e.target.value)}
                          placeholder="e.g. SL-987654"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold uppercase text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* No. of Packages */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>No. of Packages</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">تعداد بسته</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-purple-500 pointer-events-none">
                          <Package className="w-4 h-4" />
                        </div>
                        <Input
                          name="number_of_packages"
                          value={formData.number_of_packages}
                          onChange={(e) => handleCargoFieldChange("number_of_packages", e.target.value)}
                          placeholder="e.g. 1,000 CTNS"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* KGS / Carton */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>Net Wt. / Carton</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">کیلو فی کارتن (خالص)</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-purple-500 pointer-events-none">
                          <Scale className="w-4 h-4" />
                        </div>
                        <Input
                          name="kgs_per_carton"
                          value={formData.kgs_per_carton}
                          onChange={(e) => handleCargoFieldChange("kgs_per_carton", e.target.value)}
                          placeholder="e.g., 12.5"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Gross Wt. / Carton */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>Gross Wt. / Carton</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">وزن ناخالص کارتن</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-purple-500 pointer-events-none">
                          <Scale className="w-4 h-4" />
                        </div>
                        <Input
                          name="gross_weight_per_carton"
                          value={formData.gross_weight_per_carton}
                          onChange={(e) => handleCargoFieldChange("gross_weight_per_carton", e.target.value)}
                          placeholder="e.g., 13.0"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Grid - Row 2: Rates, Weights & Valuation */}
                <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">2</span>
                      <div>
                        <span className="block text-xs font-black uppercase tracking-wider text-emerald-950">Rates & calculated totals</span>
                        <span className="block text-[10px] font-medium text-emerald-700">Calculated values remain editable for document overrides.</span>
                      </div>
                    </div>
                    <span className="font-[vazirmatn] text-xs font-bold text-emerald-800" dir="rtl">ارزش‌گذاری، نرخ و اوزان کل</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {/* Rate per KGS */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-emerald-900 flex items-center justify-between gap-1">
                        <span>Rate per KG</span>
                        <span className="font-[vazirmatn] text-[11px] font-extrabold text-emerald-700">نرخ فی کیلو</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 pointer-events-none">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <Input
                          name="rate_per_kgs"
                          value={formData.rate_per_kgs}
                          onChange={(e) => handleCargoFieldChange("rate_per_kgs", e.target.value)}
                          placeholder="e.g., $1.20"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-emerald-950 bg-emerald-50/40 border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Goods Value */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-emerald-900 flex items-center justify-between gap-1">
                        <span>Goods Value (USD)</span>
                        <span className="font-[vazirmatn] text-[11px] font-extrabold text-emerald-700">ارزش کالا</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 pointer-events-none">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <Input
                          name="goods_value"
                          value={formData.goods_value}
                          onChange={(e) => handleCargoFieldChange("goods_value", e.target.value)}
                          placeholder="e.g., $10,000"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-emerald-950 bg-emerald-50/40 border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Net Weight */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-blue-950 flex items-center justify-between gap-1">
                        <span>Total Net Weight</span>
                        <span className="font-[vazirmatn] text-[11px] font-extrabold text-blue-700">وزن خالص کل</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-blue-600 pointer-events-none">
                          <Scale className="w-4 h-4" />
                        </div>
                        <Input
                          name="net_weight"
                          value={formData.net_weight}
                          onChange={(e) => handleCargoFieldChange("net_weight", e.target.value)}
                          placeholder="e.g., 4,800 KG"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-blue-950 bg-blue-50/40 border-blue-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Gross Weight */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-indigo-950 flex items-center justify-between gap-1">
                        <span>Total Gross Weight</span>
                        <span className="font-[vazirmatn] text-[11px] font-extrabold text-indigo-700">وزن ناخالص کل</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-indigo-600 pointer-events-none">
                          <Scale className="w-4 h-4" />
                        </div>
                        <Input
                          name="gross_weight"
                          value={formData.gross_weight}
                          onChange={(e) => handleCargoFieldChange("gross_weight", e.target.value)}
                          placeholder="e.g., 5,000 KG"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-indigo-950 bg-indigo-50/40 border-indigo-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Measurement */}
                    <div>
                      <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                        <span>Volume (CBM)</span>
                        <span className="font-[vazirmatn] text-[11px] font-bold text-amber-800">حجم کانتینر</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-amber-600 pointer-events-none">
                          <FileText className="w-4 h-4" />
                        </div>
                        <Input
                          name="measurement"
                          value={formData.measurement}
                          onChange={(e) => handleCargoFieldChange("measurement", e.target.value)}
                          placeholder="e.g., 25 CBM"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white border-slate-200 shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo Description Field & Quick Insertion Bar */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-700">3</span>
                      <label className="text-xs font-black text-slate-900">
                        Cargo description & document details
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-bold text-slate-400">
                        {formData.cargo_description ? `${formData.cargo_description.length} chars` : "Empty"}
                      </span>
                      <button
                        type="button"
                        onClick={clearCargoDescription}
                        className="text-[10.5px] font-extrabold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                        title="Clear description text"
                      >
                        ✕ Clear
                      </button>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        شرح کامل کالا و محموله
                      </span>
                    </div>
                  </div>

                  {/* Quick Tag Snippets Bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Quick Tags:
                    </span>
                    {[
                      { label: "+ Lot No", text: "Lot No: " },
                      { label: "+ HS Code", text: "HS CODE: " },
                      { label: "+ Transit Date", text: `Transit Date: ${new Date().toLocaleDateString("en-CA")}` },
                      { label: "+ Afghan TC No", text: "Afghan TC No: " },
                      { label: "+ Invoice & Packing List", text: "Invoice & Packing List Attached" },
                      { label: "+ Temp Controlled", text: "Storage Temp: +4°C to +8°C (Reefer)" },
                      { label: "+ Customs Seal Verified", text: "Customs Seal Intact & Verified" },
                      { label: "+ Fragile", text: "FRAGILE - HANDLE WITH CARE" },
                      {
                        label: "+ Standard BOL Template",
                        text: "📦 CONTAINER & CARGO DETAILS | 📄 DOCUMENT & SHIPPING DETAILS\n🥦 Cargo: \n📅 Transit Date: \n📄 HS CODE: \n📄 Afghan TC No: \n📄 Invoice NO: ",
                      },
                    ].map((snippet) => (
                      <button
                        key={snippet.label}
                        type="button"
                        onClick={() => insertCargoTagSnippet(snippet.text)}
                        className="rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-slate-700 hover:text-purple-900 px-2 py-1 text-[10.5px] font-extrabold whitespace-nowrap transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        {snippet.label}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    name="cargo_description"
                    value={formData.cargo_description}
                    onChange={(e) => handleCargoFieldChange("cargo_description", e.target.value)}
                    dir="auto"
                    placeholder="Enter detailed cargo description, HS codes, packaging marks, and shipment instructions..."
                    rows={4}
                    className="min-h-32 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-relaxed text-slate-950 shadow-inner transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Routes are optional and remain collapsed until the user adds one. */}
            {formData.routes.length === 0 ? (
              <button
                id="section-routes"
                type="button"
                onClick={addRouteStop}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-blue-200 bg-white/55 px-5 py-3 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-blue-950">Add transit route (optional)</span>
                    <span className="block text-xs font-semibold text-slate-500 font-[vazirmatn]" dir="rtl">افزودن مسیر ترانزیت در صورت نیاز</span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition group-hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Add Route
                </span>
              </button>
            ) : (
            <Card id="section-routes" className="bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100/80 bg-linear-to-r from-blue-50/50 via-indigo-50/30 to-slate-50/50">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/25 text-white">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-950 text-lg tracking-tight">Route Stops &amp; Transit Pathway</span>
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-[vazirmatn]">
                            مسیر حمل و نقل و توقفگاه‌ها
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Define multi-stop transit route, border customs points, vehicle plates, and transport modes
                        </p>
                      </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={openSaveRouteModal}
                        className="h-9 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs font-black shadow-md shadow-emerald-600/20 cursor-pointer transition-all gap-1.5"
                        title="Save current route path into Quick Presets list for one-click reuse"
                      >
                        <BookmarkPlus className="h-4 w-4 text-white" />
                        Save to Presets / ذخیره مسیر
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={syncRoutesWithBOLPorts}
                        className="h-9 rounded-xl border-blue-200 bg-blue-50/90 px-3 text-xs font-extrabold text-blue-900 shadow-xs hover:bg-blue-100 cursor-pointer transition-all"
                        title="Synchronize Stop 1 with Port of Loading and Last Stop with Port of Discharge"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5 text-blue-700" />
                        Sync with B/L / همگام‌سازی
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={reverseRoutes}
                        className="h-9 rounded-xl border-purple-200 bg-purple-50/90 px-3 text-xs font-extrabold text-purple-900 shadow-xs hover:bg-purple-100 cursor-pointer transition-all"
                        title="Reverse the entire route sequence (e.g. Export return trip)"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-purple-700" />
                        Reverse / معکوس مسیر
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={addRouteStop}
                        className="h-9 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-white px-3.5 text-xs font-extrabold shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 cursor-pointer transition-all"
                      >
                        <Plus className="h-4 w-4 mr-1 text-white" />
                        Add Stop / افزودن توقفگاه
                      </Button>
                    </div>
                  </div>

                  {/* Route Presets Strip */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Quick Presets:
                    </span>

                    {/* Custom User Saved Presets */}
                    {savedRoutePresets.map((preset) => (
                      <div key={preset.id} className="relative group inline-flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyCustomRoutePreset(preset)}
                          className="h-7.5 rounded-lg border border-amber-300 bg-linear-to-r from-amber-50 to-orange-50/80 pr-6 pl-2.5 text-[11px] font-black text-amber-950 shadow-2xs hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 cursor-pointer transition-all gap-1.5"
                          title={`Click to apply ${preset.title} (${preset.routes.length} stops)`}
                        >
                          <span>{preset.icon || "⭐"}</span>
                          <span className="max-w-[150px] truncate">{preset.title}</span>
                          <span className="rounded-full bg-amber-200/90 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                            {preset.routes.length}
                          </span>
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoutePreset(preset.id, e)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-200 text-red-600 transition-all cursor-pointer"
                          title="Delete this saved preset"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyDogharonToMersinReeferExportPreset}
                      className="h-7.5 rounded-lg border border-cyan-300 bg-cyan-50/90 px-2.5 text-[11px] font-black text-cyan-950 shadow-2xs hover:bg-cyan-100 cursor-pointer transition-all"
                      title="Route 3: Dogharon → Bazargan → Mersin Reefer (40RF with Escort & Plugging - $14,494.12 USD)"
                    >
                      <Ship className="h-3.5 w-3.5 mr-1 text-cyan-700" />
                      ❄️ Route 3: Dogharon ➡️ Mersin Reefer ($14,494)
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyDougharounToMersinExportPreset}
                      className="h-7.5 rounded-lg border border-purple-300 bg-purple-50/90 px-2.5 text-[11px] font-black text-purple-950 shadow-2xs hover:bg-purple-100 cursor-pointer transition-all"
                      title="Route 1: Dougharoun → Bazargan → Mersin (Afghan Export via Turkey - $3,100 USD)"
                    >
                      <Truck className="h-3.5 w-3.5 mr-1 text-purple-700" />
                      🇹🇷 Route 1: Dougharoun ➡️ Mersin ($3,100)
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyNimrozToBandarAbbasExportPreset}
                      className="h-7.5 rounded-lg border border-amber-300 bg-amber-50/90 px-2.5 text-[11px] font-black text-amber-950 shadow-2xs hover:bg-amber-100 cursor-pointer transition-all"
                      title="Route 2: Nimroz → Milak → Bandar Abbas (Afghan Export via South Iran - $1,550 USD)"
                    >
                      <Ship className="h-3.5 w-3.5 mr-1 text-amber-700" />
                      🇮🇷 Route 2: Nimroz ➡️ Bandar Abbas ($1,550)
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyKandaharNimrozBandarAbbasDubaiIndiaPreset}
                      className="h-7.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 text-[11px] font-extrabold text-emerald-900 shadow-2xs hover:bg-emerald-100 cursor-pointer transition-all"
                      title="Kandahar → Nimroz → Bandar Abbas → Dubai → Nhava Sheva (India)"
                    >
                      <Ship className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                      🇦🇫 ➡️ 🇮🇷 ➡️ 🇦🇪 ➡️ 🇮🇳 Kandahar to India
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyHeratIslamQalaDougharounPreset}
                      className="h-7.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 text-[11px] font-extrabold text-blue-900 shadow-2xs hover:bg-blue-100 cursor-pointer transition-all"
                      title="Herat → Islam Qala → Dougharoun (Afghanistan to Iran)"
                    >
                      <Truck className="h-3.5 w-3.5 mr-1 text-blue-700" />
                      🚛 Herat ➡️ Dougharoun
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyNimrozChabaharIndiaPreset}
                      className="h-7.5 rounded-lg border border-cyan-200 bg-cyan-50/80 px-2.5 text-[11px] font-extrabold text-cyan-900 shadow-2xs hover:bg-cyan-100 cursor-pointer transition-all"
                      title="Nimroz → Milak Border → Chabahar Port → Mundra (India)"
                    >
                      <Ship className="h-3.5 w-3.5 mr-1 text-cyan-700" />
                      🇮🇷 Nimroz ➡️ Chabahar ➡️ India
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyKandaharChamanKarachiDubaiPreset}
                      className="h-7.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 text-[11px] font-extrabold text-indigo-900 shadow-2xs hover:bg-indigo-100 cursor-pointer transition-all"
                      title="Kandahar → Chaman → Karachi → Dubai"
                    >
                      <Truck className="h-3.5 w-3.5 mr-1 text-indigo-700" />
                      🇵🇰 Kandahar ➡️ Karachi ➡️ Dubai
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyMazarHairatanTashkentPreset}
                      className="h-7.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 text-[11px] font-extrabold text-amber-900 shadow-2xs hover:bg-amber-100 cursor-pointer transition-all"
                      title="Mazar-i-Sharif → Hairatan Border → Termez → Tashkent (Rail)"
                    >
                      <Train className="h-3.5 w-3.5 mr-1 text-amber-700" />
                      🇺🇿 Mazar ➡️ Hairatan ➡️ Tashkent
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyKabulDubaiAirPreset}
                      className="h-7.5 rounded-lg border border-sky-200 bg-sky-50/80 px-2.5 text-[11px] font-extrabold text-sky-900 shadow-2xs hover:bg-sky-100 cursor-pointer transition-all"
                      title="Kabul Airport → Dubai Airport (Air Cargo)"
                    >
                      <Plane className="h-3.5 w-3.5 mr-1 text-sky-700" />
                      ✈️ Kabul ➡️ Dubai (Air)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-5 pb-6">
                {/* Visual Route Pathway Stepper Timeline */}
                <div className="rounded-2xl border border-blue-200/80 bg-linear-to-r from-blue-50/90 via-indigo-50/50 to-cyan-50/90 p-4 shadow-inner overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                        Transit Stepper Pathway / نقشه مسیر
                      </span>
                      <span className="rounded-full bg-blue-200/70 px-2 py-0.5 text-[10px] font-black text-blue-900">
                        {formData.routes.length} Stops Total
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 font-[vazirmatn]" dir="rtl">
                      برای انتخاب یا ویرایش روی هر توقفگاه کلیک کنید
                    </span>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {formData.routes.map((route, index) => {
                      const isOrigin = index === 0
                      const isDest = index === formData.routes.length - 1
                      const stopName = route.location || `Stop #${index + 1}`
                      const isSelected = activeRouteIndex === index
                      
                      return (
                        <div key={route.id} className="flex items-center gap-2.5 shrink-0">
                          <div
                            onClick={() => setActiveRouteIndex(index)}
                            className={`group relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? "border-2 border-blue-600 bg-white shadow-xl shadow-blue-500/15 ring-4 ring-blue-500/15 scale-102"
                                : "border-slate-200/90 bg-white/95 hover:border-blue-300 hover:bg-white hover:shadow-md"
                            }`}
                          >
                            {/* Reorder & Action Mini Toolbar (Hover) */}
                            <div className="absolute -top-3.5 right-2 hidden group-hover:flex items-center gap-0.5 bg-white p-0.5 rounded-lg shadow-md border border-slate-200 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveRouteStop(index, 'up')
                                }}
                                disabled={index === 0}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer disabled:opacity-30"
                                title="Move Earlier (▲)"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveRouteStop(index, 'down')
                                }}
                                disabled={index === formData.routes.length - 1}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer disabled:opacity-30"
                                title="Move Later (▼)"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  duplicateRouteStop(index)
                                }}
                                className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Duplicate Stop"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {formData.routes.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeRouteStop(index)
                                  }}
                                  className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                  title="Delete Stop"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Stop Index Badge */}
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-white text-sm shadow-md ${
                                isOrigin
                                  ? "bg-linear-to-br from-emerald-500 to-teal-700 shadow-emerald-500/25"
                                  : isDest
                                  ? "bg-linear-to-br from-indigo-600 to-purple-700 shadow-indigo-500/25"
                                  : "bg-linear-to-br from-blue-600 to-cyan-600 shadow-blue-500/25"
                              }`}
                            >
                              {index + 1}
                            </div>

                            <div className="min-w-[140px] max-w-[260px]">
                              <div className="flex items-center gap-1.5">
                                {getTransportIcon(route.transportMode)}
                                <span className={`text-[10px] font-black uppercase tracking-wider ${
                                  isOrigin ? "text-emerald-700" : isDest ? "text-indigo-700" : "text-blue-700"
                                }`}>
                                  {isOrigin ? "Origin (مبدأ)" : isDest ? "Destination (مقصد)" : `Stop #${index + 1}`}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs font-black text-blue-950 leading-snug break-words line-clamp-2">{stopName}</p>
                              {route.locationPersian && (
                                <p className="text-[10px] font-bold text-slate-500 font-[vazirmatn] leading-tight break-words line-clamp-2 mt-0.5" dir="rtl">{route.locationPersian}</p>
                              )}

                              {/* Truck / Seal details badge */}
                              {route.plateNumber && (
                                <span className="mt-1 inline-block rounded bg-blue-100 px-1 py-0.2 text-[9px] font-extrabold text-blue-900 border border-blue-200">
                                  Plate: {route.plateNumber}
                                </span>
                              )}
                              {route.customsSealRequired && (
                                <span className="mt-1 ml-1 inline-block rounded bg-amber-100 px-1 py-0.2 text-[9px] font-extrabold text-amber-900 border border-amber-200" dir="rtl">
                                  📍 سیل ګمرک
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Connecting arrow */}
                          {index < formData.routes.length - 1 && (
                            <div className="flex items-center gap-1 px-0.5 text-blue-500 shrink-0">
                              <span className="h-0.5 w-4 bg-linear-to-r from-blue-400 to-indigo-400 rounded-full" />
                              <ArrowRight className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Stop Cards List */}
                <div className="space-y-4">
                  {formData.routes.map((route, index) => {
                    const isOrigin = index === 0
                    const isDest = index === formData.routes.length - 1
                    const isSelected = activeRouteIndex === index

                    return (
                      <div
                        key={route.id}
                        className={`rounded-2xl border transition-all ${
                          isSelected
                            ? "border-2 border-blue-500 bg-white shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/10"
                            : "border-slate-200/90 bg-white/95 hover:border-slate-300"
                        } p-4.5`}
                      >
                        {/* Stop Card Header */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white shadow-md ${
                              isOrigin
                                ? "bg-linear-to-br from-emerald-500 to-teal-700"
                                : isDest
                                ? "bg-linear-to-br from-indigo-600 to-purple-700"
                                : "bg-linear-to-br from-blue-600 to-cyan-600"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-blue-950">
                                  {isOrigin ? "Origin Point (نقطه مبدأ)" : isDest ? "Final Destination (مقصد نهایی)" : `Stop #${index + 1} - Transit Stop (توقفگاه)`}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                  isOrigin ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : isDest ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                                }`}>
                                  {isOrigin ? "Port of Loading" : isDest ? "Port of Discharge" : `Transit Stop`}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-500 font-[vazirmatn] mt-0.5" dir="rtl">
                                {route.locationPersian || (isOrigin ? "محل بارگیری" : isDest ? "محل تخلیه نهایی" : "ایستگاه و مرز ترانزیتی")}
                              </p>
                            </div>
                          </div>

                          {/* Action Toolbar on Card */}
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {/* Move Up */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                              onClick={() => moveRouteStop(index, 'up')}
                              className="h-8 rounded-lg border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30"
                              title="Move Stop Earlier (▲)"
                            >
                              <ChevronUp className="h-3.5 w-3.5 mr-0.5" />
                              Move Up
                            </Button>

                            {/* Move Down */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === formData.routes.length - 1}
                              onClick={() => moveRouteStop(index, 'down')}
                              className="h-8 rounded-lg border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30"
                              title="Move Stop Later (▼)"
                            >
                              <ChevronDown className="h-3.5 w-3.5 mr-0.5" />
                              Move Down
                            </Button>

                            {/* Duplicate */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateRouteStop(index)}
                              className="h-8 rounded-lg border-emerald-200 bg-emerald-50/50 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                              title="Duplicate this stop"
                            >
                              <Copy className="h-3.5 w-3.5 mr-0.5" />
                              Duplicate
                            </Button>

                            {/* Delete */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg border border-red-200 bg-red-50/50 px-2.5 text-xs font-bold text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-30"
                              onClick={() => removeRouteStop(index)}
                              title="Remove this route stop"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {/* Location and Transport Inputs */}
                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
                          {/* English Location */}
                          <div className="relative">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                              <span>Location (English) / {isOrigin ? "Origin" : isDest ? "Destination" : `Stop #${index + 1}`}</span>
                              {route.location && (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Selected</span>
                              )}
                            </label>
                            <Input
                              value={route.location}
                              onFocus={() => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                              }}
                              onChange={(e) => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                                handleRouteChange(index, "location", e.target.value)
                              }}
                              placeholder={`e.g. ${isOrigin ? "Kandahar, AF" : isDest ? "Nhava Sheva, IN" : "Bandar Abbas, IR"}`}
                              className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 focus:border-amber-400 focus:ring-amber-200"
                            />

                            {/* Inline Recommendation Popover */}
                            {showLocationDropdown === index && (
                              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-2xl border border-amber-300/90 bg-white p-3 shadow-2xl shadow-slate-900/25 backdrop-blur-xl">
                                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 mb-2 gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-amber-900">Suggested Locations</span>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                                      {quickLocationMatches.length}
                                    </span>
                                    {route.transportMode === "airplane" && !disableModeFilter && (
                                      <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[9px] font-black border border-sky-200">
                                        ✈️ Airports Only
                                      </span>
                                    )}
                                    {route.transportMode === "vessel" && !disableModeFilter && (
                                      <span className="rounded-full bg-cyan-100 text-cyan-800 px-2 py-0.5 text-[9px] font-black border border-cyan-200">
                                        🚢 Ports Only
                                      </span>
                                    )}
                                    {route.transportMode === "train" && !disableModeFilter && (
                                      <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[9px] font-black border border-purple-200">
                                        🚆 Rail Only
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                                    <Input
                                      value={routeLocationSearch}
                                      onChange={(e) => setRouteLocationSearch(e.target.value)}
                                      placeholder="Filter..."
                                      className="h-7 text-xs rounded-lg bg-slate-50 border-slate-200"
                                      autoFocus={false}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowLocationDropdown(null)}
                                      className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition cursor-pointer"
                                    >
                                      ✕ Close
                                    </button>
                                  </div>
                                </div>

                                {/* Mode-Specific Filtering Alert & Toggle */}
                                {route.transportMode === "airplane" && (
                                  <div className="flex flex-wrap items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-2.5 py-1.5 mb-2 gap-1.5 shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-sky-950 font-black text-[11px]">
                                      <Plane className="h-3.5 w-3.5 text-sky-600" />
                                      <span>AIR MODE: Showing Airports Only (میدان‌های هوایی)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setDisableModeFilter(!disableModeFilter)}
                                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-sky-300 bg-white text-sky-800 hover:bg-sky-100 transition cursor-pointer shadow-2xs"
                                    >
                                      {disableModeFilter ? "✈️ Filter Airports Only" : "🌐 Show All Locations"}
                                    </button>
                                  </div>
                                )}

                                {route.transportMode === "vessel" && (
                                  <div className="flex flex-wrap items-center justify-between bg-cyan-50 border border-cyan-200 rounded-xl px-2.5 py-1.5 mb-2 gap-1.5 shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-cyan-950 font-black text-[11px]">
                                      <Ship className="h-3.5 w-3.5 text-cyan-600" />
                                      <span>SEA MODE: Showing Ports Only (بنادر دریایی)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setDisableModeFilter(!disableModeFilter)}
                                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-cyan-300 bg-white text-cyan-800 hover:bg-cyan-100 transition cursor-pointer shadow-2xs"
                                    >
                                      {disableModeFilter ? "⚓ Filter Ports Only" : "🌐 Show All Locations"}
                                    </button>
                                  </div>
                                )}

                                {route.transportMode === "train" && (
                                  <div className="flex flex-wrap items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-1.5 mb-2 gap-1.5 shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-purple-950 font-black text-[11px]">
                                      <Train className="h-3.5 w-3.5 text-purple-600" />
                                      <span>RAIL MODE: Showing Rail & ICD Hubs (ایستگاه‌های ریل)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setDisableModeFilter(!disableModeFilter)}
                                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-purple-300 bg-white text-purple-800 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                                    >
                                      {disableModeFilter ? "🚆 Filter Rail Only" : "🌐 Show All Locations"}
                                    </button>
                                  </div>
                                )}

                                {/* Quick Country Filter Chips */}
                                <div className="flex flex-wrap gap-1 mb-2.5 pb-1.5 border-b border-slate-100">
                                  {[
                                    { label: "🌍 All", value: "ALL" },
                                    { label: "⚓ Ports", value: "PORTS" },
                                    { label: "🇦🇪 UAE / Dubai", value: "UAE" },
                                    { label: "🇨🇮 Ivory Coast / Africa", value: "AFRICA" },
                                    { label: "🇦🇫 Afghanistan", value: "Afghanistan" },
                                    { label: "🇺🇿 Uzbekistan", value: "Uzbekistan" },
                                    { label: "🇮🇷 Iran", value: "Iran" },
                                    { label: "🇮🇳 India", value: "India" },
                                    { label: "🇵🇰 Pakistan", value: "Pakistan" },
                                    { label: "🇸🇦 Gulf", value: "GULF" },
                                    { label: "🇹🇷 Turkey", value: "Turkey" },
                                    { label: "🇨🇳 China", value: "China" },
                                    { label: "🇪🇺 Europe / US", value: "EUROPE_AMERICAS" },
                                    { label: "🌐 Central Asia", value: "CENTRAL_ASIA" },
                                  ].map((tab) => (
                                    <button
                                      key={tab.value}
                                      type="button"
                                      onClick={() => setSelectedCountryFilter(tab.value)}
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                                        selectedCountryFilter === tab.value
                                          ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-400"
                                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900"
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Secondary category filter for India inside popover */}
                                {selectedCountryFilter === "India" && (
                                  <div className="flex flex-wrap items-center gap-1 mb-2.5 pb-1.5 border-b border-amber-200/80 bg-amber-50/60 p-1.5 rounded-xl">
                                    <span className="text-[9px] font-black text-amber-950 self-center mr-1">🇮🇳 Filter:</span>
                                    {[
                                      { label: "ALL", value: "ALL" },
                                      { label: "✈️ AIRPORTS", value: "AIRPORTS" },
                                      { label: "⚓ SEAPORTS", value: "SEAPORTS" },
                                      { label: "🚚 LAND PORTS", value: "LAND_PORTS" },
                                      { label: "📦 ICD", value: "ICD" },
                                      { label: "🏢 CFS", value: "CFS" },
                                      { label: "🚢 TERMINALS", value: "TERMINALS" },
                                      { label: "🌐 LOGISTICS", value: "LOGISTICS" },
                                    ].map((cat) => (
                                      <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setSelectedIndiaCategoryFilter(cat.value)}
                                        className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                                          selectedIndiaCategoryFilter === cat.value
                                            ? "bg-amber-600 text-white shadow-xs"
                                            : "bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-200"
                                        }`}
                                      >
                                        {cat.label}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                  {quickLocationMatches.map((loc) => (
                                    <div
                                      key={loc.name}
                                      className="flex flex-col justify-between rounded-xl p-2.5 text-left transition bg-slate-50/80 hover:bg-amber-50/70 border border-slate-200/90 hover:border-amber-400 group shadow-2xs"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleQuickLocationSelect(loc)
                                          setShowLocationDropdown(null)
                                        }}
                                        className="flex items-start justify-between w-full cursor-pointer text-left gap-1.5"
                                      >
                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                          <span className="text-lg shrink-0 mt-0.5">{countryFlags[loc.country] || "🌍"}</span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-slate-900 group-hover:text-amber-950 leading-snug break-words">{loc.name}</p>
                                            <div className="flex flex-wrap items-center gap-1 mt-1">
                                              {loc.borderCountry && (
                                                <span className="text-[8px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 shrink-0">
                                                  ⇄ {loc.borderCountry}
                                                </span>
                                              )}
                                              {loc.locationType && (
                                                <span className="text-[8px] font-black text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded shrink-0">
                                                  {loc.locationType.replace(/_/g, " ")}
                                                </span>
                                              )}
                                              {loc.state && (
                                                <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                                  {loc.state}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 font-[vazirmatn] leading-snug break-words mt-1" dir="rtl">{loc.persian}</p>
                                          </div>
                                        </div>
                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900 shrink-0 self-start">{loc.code}</span>
                                      </button>

                                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleQuickLocationSelect(loc)
                                            setShowLocationDropdown(null)
                                          }}
                                          className="text-[9px] font-bold bg-amber-500 text-white rounded px-1.5 py-0.5 hover:bg-amber-600 transition cursor-pointer"
                                        >
                                          + Stop #{index + 1}
                                        </button>
                                        {loc.isPort && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleQuickSetDischarge(loc.portName || loc.name)}
                                              className="text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded px-1.5 py-0.5 transition cursor-pointer"
                                            >
                                              🚢 POD
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleQuickSetLoading(loc.portName || loc.name)}
                                              className="text-[9px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded px-1.5 py-0.5 transition cursor-pointer"
                                            >
                                              ⚓ POL
                                            </button>
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleQuickSetDelivery(loc.country === "Ivory Coast" ? "Ivory Coast, West Africa" : loc.name)}
                                          className="text-[9px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded px-1.5 py-0.5 transition cursor-pointer"
                                        >
                                          📍 Delivery
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {quickLocationMatches.length === 0 && (
                                    <div className="col-span-2 p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">
                                      No locations found. Type to search or add custom location...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Persian Location */}
                          <div className="relative">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 block">
                              Location (Persian / Pashto) / موقعیت فارسی یا پښتو
                            </label>
                            <Input
                              value={route.locationPersian}
                              onFocus={() => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                              }}
                              onChange={(e) => {
                                setActiveRouteIndex(index)
                                handleRouteChange(index, "locationPersian", e.target.value)
                              }}
                              placeholder="نام محل، بندر یا گمرک"
                              dir="rtl"
                              className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 font-[vazirmatn] focus:border-amber-400 focus:ring-amber-200"
                            />
                          </div>

                          {/* Transport Mode Selector */}
                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 block">
                              Transport Mode / حالت حمل و نقل
                            </label>
                            
                            <div className="grid grid-cols-4 gap-1.5">
                              {/* Option: Truck/Road */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleRouteChange(index, "transportMode", "truck")
                                  setDisableModeFilter(false)
                                }}
                                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-xl border transition-all cursor-pointer ${
                                  route.transportMode === "truck" || route.transportMode === "road" || !route.transportMode
                                    ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500/20 font-black"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50 font-bold"
                                }`}
                              >
                                <Truck className={`h-5 w-5 ${route.transportMode === "truck" || route.transportMode === "road" || !route.transportMode ? "text-blue-600" : "text-slate-400"}`} />
                                <span className="text-[10px] uppercase">Truck</span>
                              </button>

                              {/* Option: Vessel/Sea */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleRouteChange(index, "transportMode", "vessel")
                                  setDisableModeFilter(false)
                                }}
                                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-xl border transition-all cursor-pointer ${
                                  route.transportMode === "vessel"
                                    ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm ring-2 ring-cyan-500/20 font-black"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-slate-50 font-bold"
                                }`}
                              >
                                <Ship className={`h-5 w-5 ${route.transportMode === "vessel" ? "text-cyan-600" : "text-slate-400"}`} />
                                <span className="text-[10px] uppercase">Sea</span>
                              </button>

                              {/* Option: Plane/Air */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleRouteChange(index, "transportMode", "airplane")
                                  setDisableModeFilter(false)
                                }}
                                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-xl border transition-all cursor-pointer ${
                                  route.transportMode === "airplane"
                                    ? "border-sky-500 bg-sky-50 text-sky-900 shadow-sm ring-2 ring-sky-500/20 font-black"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-slate-50 font-bold"
                                }`}
                              >
                                <Plane className={`h-5 w-5 ${route.transportMode === "airplane" ? "text-sky-600" : "text-slate-400"}`} />
                                <span className="text-[10px] uppercase">Air</span>
                              </button>

                              {/* Option: Train/Rail */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleRouteChange(index, "transportMode", "train")
                                  setDisableModeFilter(false)
                                }}
                                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-xl border transition-all cursor-pointer ${
                                  route.transportMode === "train"
                                    ? "border-purple-500 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-500/20 font-black"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-slate-50 font-bold"
                                }`}
                              >
                                <Train className={`h-5 w-5 ${route.transportMode === "train" ? "text-purple-600" : "text-slate-400"}`} />
                                <span className="text-[10px] uppercase">Rail</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Specifications Panel based on Transport Mode */}
                        {(route.transportMode === "truck" || route.transportMode === "road" || !route.transportMode) && (
                          <div className="mt-3.5 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/70 via-indigo-50/30 to-amber-50/30 p-3.5 shadow-2xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                                  <Truck className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                                  Truck Specifications &amp; Customs Seal / مشخصات موتر و ګمرک
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-blue-800 font-[vazirmatn]" dir="rtl">
                                جزئیات پلیټ، شاسی و ټیلر مان
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              {/* Plate Number */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Plate No. / پلیټ نمبر / ليټ نمبر
                                </label>
                                <Input
                                  value={route.plateNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "plateNumber", e.target.value)}
                                  placeholder="مثلا: KBL-7842"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>

                              {/* Chassis Number */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Chassis No. / شاسی نمبر
                                </label>
                                <Input
                                  value={route.chassisNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "chassisNumber", e.target.value)}
                                  placeholder="CH-908712"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>

                              {/* Driver / Trailer Man */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1 font-[vazirmatn]">
                                  Trailer Man / ټیلر مان / ډریور
                                </label>
                                <Input
                                  value={route.trailerMan || ""}
                                  onChange={(e) => handleRouteChange(index, "trailerMan", e.target.value)}
                                  placeholder="نام دریور / ټیلر مان"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-[vazirmatn] focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>
                            </div>

                            {/* Customs Seal Requirement */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-200/50">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={Boolean(route.customsSealRequired)}
                                  onChange={(e) => handleRouteChange(index, "customsSealRequired", e.target.checked)}
                                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-400 cursor-pointer"
                                />
                                <span className="text-xs font-black text-slate-900 font-[vazirmatn]" dir="rtl">
                                  📍 په ګمرک کې سیل غواړي (Customs Seal Required)
                                </span>
                              </label>
                              {route.customsSealRequired && (
                                <Input
                                  value={route.customsSealNote || ""}
                                  onChange={(e) => handleRouteChange(index, "customsSealNote", e.target.value)}
                                  placeholder="Customs seal details / جزئیات سیل ګمرک"
                                  className="h-8.5 w-full sm:w-72 rounded-lg border-amber-400 bg-white text-xs font-bold text-slate-900 font-[vazirmatn] focus:border-amber-500"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sea / Vessel Mode Panel */}
                        {route.transportMode === "vessel" && (
                          <div className="mt-3.5 rounded-2xl border border-cyan-100 bg-linear-to-br from-cyan-50/70 via-blue-50/30 to-slate-50/30 p-3.5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 border-b border-cyan-200/60 pb-2">
                              <div className="p-1.5 rounded-lg bg-cyan-600 text-white shadow-xs">
                                <Ship className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-wider text-cyan-950">
                                Sea Port &amp; Vessel Details / مشخصات کشتی و بندر بحری
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Vessel Name / نام کشتی
                                </label>
                                <Input
                                  value={route.notes || ""}
                                  onChange={(e) => handleRouteChange(index, "notes", e.target.value)}
                                  placeholder="e.g. WAN HAI 512"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Port Terminal / ترمینل بندر
                                </label>
                                <Input
                                  value={route.customsSealNote || ""}
                                  onChange={(e) => handleRouteChange(index, "customsSealNote", e.target.value)}
                                  placeholder="Terminal 1 / Berthing Quay"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Container No. / کانتینر
                                </label>
                                <Input
                                  value={route.plateNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "plateNumber", e.target.value)}
                                  placeholder="MSCU-1234567"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Air Cargo Panel */}
                        {route.transportMode === "airplane" && (
                          <div className="mt-3.5 rounded-2xl border border-sky-100 bg-linear-to-br from-sky-50/70 via-blue-50/30 to-slate-50/30 p-3.5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 border-b border-sky-200/60 pb-2">
                              <div className="p-1.5 rounded-lg bg-sky-600 text-white shadow-xs">
                                <Plane className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-wider text-sky-950">
                                Air Freight &amp; Flight Information / پرواز و بارنامه هوایی
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Flight No. / شماره پرواز
                                </label>
                                <Input
                                  value={route.notes || ""}
                                  onChange={(e) => handleRouteChange(index, "notes", e.target.value)}
                                  placeholder="e.g. FG-311 / EK-205"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Air Waybill (AWB) / شماره AWB
                                </label>
                                <Input
                                  value={route.plateNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "plateNumber", e.target.value)}
                                  placeholder="AWB-9087612"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rail Freight Panel */}
                        {route.transportMode === "train" && (
                          <div className="mt-3.5 rounded-2xl border border-amber-100 bg-linear-to-br from-amber-50/70 via-orange-50/30 to-slate-50/30 p-3.5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
                              <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
                                <Train className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                                Railway Freight Information / معلومات خط آهن و واگن
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Wagon / Train No. / شماره واگن
                                </label>
                                <Input
                                  value={route.plateNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "plateNumber", e.target.value)}
                                  placeholder="WGN-54210"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Railway Station / ایستگاه ریل
                                </label>
                                <Input
                                  value={route.notes || ""}
                                  onChange={(e) => handleRouteChange(index, "notes", e.target.value)}
                                  placeholder="Hairatan Railway Terminal"
                                  className="h-9.5 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Quick Select Locations Bar with Live Search */}
                <div className="pt-4 border-t border-slate-200/80">
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Quick Location Selector / انتخاب سریع محل:
                        </p>
                        {activeRouteIndex !== null && (
                          <p className="text-xs font-bold text-amber-700">
                            Targeting: <span className="font-black text-blue-950">{getRouteStopLabel(activeRouteIndex, formData.routes.length)} (Stop #{activeRouteIndex + 1})</span>
                          </p>
                        )}
                      </div>

                      {/* Live Search Input for Locations */}
                      <div className="w-full sm:w-64">
                        <Input
                          value={routeLocationSearch}
                          onChange={(e) => setRouteLocationSearch(e.target.value)}
                          placeholder="Search city, port, or country..."
                          className="h-8.5 text-xs rounded-xl bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Regional Country Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: "ALL", country: "ALL" },
                        { label: "⚓ ALL SEAPORTS", country: "PORTS" },
                        { label: "🇦🇪 DUBAI & UAE PORTS", country: "UAE" },
                        { label: "🇨🇮 IVORY COAST & AFRICA", country: "AFRICA" },
                        { label: "🇦🇫 AFGHANISTAN", country: "Afghanistan" },
                        { label: "🇺🇿 UZBEKISTAN", country: "Uzbekistan" },
                        { label: "🇮🇷 IRAN", country: "Iran" },
                        { label: "🇮🇳 INDIA", country: "India" },
                        { label: "🇵🇰 PAKISTAN", country: "Pakistan" },
                        { label: "🇸🇦 🇶🇦 GULF STATES", country: "GULF" },
                        { label: "🇹🇷 TURKEY", country: "Turkey" },
                        { label: "🇨🇳 CHINA & ASIA", country: "China" },
                        { label: "🇪🇺 EUROPE & AMERICAS", country: "EUROPE_AMERICAS" },
                        { label: "🌐 CENTRAL ASIA", country: "CENTRAL_ASIA" },
                      ].map((tab) => (
                        <button
                          key={tab.country}
                          type="button"
                          onClick={() => setSelectedCountryFilter(tab.country)}
                          className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition-all cursor-pointer ${
                            selectedCountryFilter === tab.country
                              ? "bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300"
                              : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Secondary Category Filter Pill Bar for INDIA */}
                    {selectedCountryFilter === "India" && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-linear-to-r from-amber-50/90 via-orange-50/50 to-white border border-amber-200/80 shadow-2xs">
                        <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider mr-1 flex items-center gap-1">
                          <span>🇮🇳</span>
                          <span>India Category:</span>
                        </span>
                        {[
                          { label: "ALL", value: "ALL" },
                          { label: "✈️ AIRPORTS", value: "AIRPORTS" },
                          { label: "⚓ SEAPORTS", value: "SEAPORTS" },
                          { label: "🚚 LAND PORTS", value: "LAND_PORTS" },
                          { label: "📦 ICD", value: "ICD" },
                          { label: "🏢 CFS", value: "CFS" },
                          { label: "🚢 WATERWAY TERMINALS", value: "TERMINALS" },
                          { label: "🌐 LOGISTICS HUBS", value: "LOGISTICS" },
                        ].map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setSelectedIndiaCategoryFilter(cat.value)}
                            className={`rounded-xl px-2.5 py-1 text-[10px] font-black transition-all cursor-pointer ${
                              selectedIndiaCategoryFilter === cat.value
                                ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
                                : "bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-200"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid max-h-96 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 overflow-y-auto pr-1">
                    {quickLocationMatches.map((loc) => (
                      <div
                        key={loc.name}
                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white/95 p-3 transition-all hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-md shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickLocationSelect(loc)}
                          className="flex flex-col items-start w-full text-left cursor-pointer"
                          title={`Add to Route Stop: ${loc.name}${loc.borderCountry ? ` (Border: ${loc.borderCountry})` : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="text-base shrink-0 mt-0.5">{countryFlags[loc.country] || "🌍"}</span>
                              <span className="font-black text-slate-900 text-xs leading-snug break-words">{loc.name}</span>
                            </div>
                            <span className="text-[9px] font-black bg-amber-100 text-amber-900 rounded px-1.5 py-0.5 shrink-0 self-start">{loc.code}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 w-full mt-1.5">
                            {loc.borderCountry && (
                              <span className="text-[8px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 shrink-0">
                                ⇄ {loc.borderCountry}
                              </span>
                            )}
                            {loc.locationType && (
                              <span className="text-[8px] font-black text-amber-900 bg-amber-100/80 px-1.5 py-0.2 rounded shrink-0">
                                {loc.locationType.replace(/_/g, " ")}
                              </span>
                            )}
                            {loc.state && (
                              <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                {loc.state}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 font-[vazirmatn] text-[10.5px] font-bold break-words w-full text-right mt-1.5 leading-snug" dir="rtl">{loc.persian}</span>
                        </button>

                        {/* Quick 1-Click Set Actions */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickLocationSelect(loc)}
                            className="text-[9px] font-extrabold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                            title="Add to Route Stops"
                          >
                            + Route
                          </button>
                          {loc.isPort && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickSetDischarge(loc.portName || loc.name)}
                                className="text-[9px] font-black bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                title="Set as Port of Discharge (بندر تخلیه)"
                              >
                                🚢 POD
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSetLoading(loc.portName || loc.name)}
                                className="text-[9px] font-black bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                title="Set as Port of Loading (بندر بارگیری)"
                              >
                                ⚓ POL
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleQuickSetDelivery(loc.country === "Ivory Coast" ? "Ivory Coast, West Africa" : loc.name)}
                            className="text-[9px] font-black bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                            title="Set as Place of Delivery (محل تحویل)"
                          >
                            📍 Delivery
                          </button>
                        </div>
                      </div>
                    ))}
                    {quickLocationMatches.length === 0 && (
                      <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/40 backdrop-blur-md px-3 py-5 text-center text-xs font-bold text-slate-500">
                        No matching locations / نتیجه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Container Details */}
            <Card id="section-container" className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Container Details</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">جزئیات کانتینر</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container Type / نوع کانتینر</label>
                    <Select value={formData.container_type || "none"} onValueChange={(value) => setFormData((prev) => ({ ...prev, container_type: value === "none" ? "" : value }))}>
                      <SelectTrigger className="h-11 glass-input rounded-xl">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Type</SelectItem>
                        <SelectItem value="dry">Dry Container</SelectItem>
                        <SelectItem value="reefer">Refrigerated (Reefer)</SelectItem>
                        <SelectItem value="open_top">Open Top</SelectItem>
                        <SelectItem value="flat_rack">Flat Rack</SelectItem>
                        <SelectItem value="tank">Tank Container</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container Size / اندازه کانتینر</label>
                    <Select value={formData.container_size || "none"} onValueChange={(value) => setFormData((prev) => ({ ...prev, container_size: value === "none" ? "" : value }))}>
                      <SelectTrigger className="h-11 glass-input rounded-xl">
                        <SelectValue placeholder="Select Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Size</SelectItem>
                        <SelectItem value="20ft">20 ft (TEU)</SelectItem>
                        <SelectItem value="40ft">40 ft (FEU)</SelectItem>
                        <SelectItem value="40ft_hc">40 ft High Cube</SelectItem>
                        <SelectItem value="45ft_hc">45 ft High Cube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container No. / شماره کانتینر</label>
                    <Input
                      name="container_numbers"
                      value={formData.container_numbers}
                      onChange={handleInputChange}
                      placeholder="e.g., MSCU1234567"
                      className="h-11 glass-input rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Seal No. / شماره سیل</label>
                    <Input
                      name="seal_numbers"
                      value={formData.seal_numbers}
                      onChange={handleInputChange}
                      placeholder="e.g., SL12345"
                      className="h-11 glass-input rounded-xl font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card id="section-shipping" className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-cyan-500 to-cyan-600 shadow-md shadow-cyan-500/30">
                      <Ship className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Shipping Details</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">جزئیات حمل</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* 1-Click Quick Port Presets */}
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                      <span>⚓</span> Quick Port & Location Presets / انتخاب سریع بندر و کشور:
                    </span>
                    <span className="text-[10px] font-bold text-cyan-700 font-[vazirmatn]" dir="rtl">
                      یک کلیک برای پر کردن بنادر
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          port_of_discharge: "Abidjan Port",
                          place_of_delivery: "Ivory Coast, West Africa",
                        }))
                        toast.success("Set POD: Abidjan Port & Delivery: Ivory Coast, West Africa")
                      }}
                      className="rounded-xl border border-cyan-300 bg-white px-2.5 py-1 text-xs font-black text-slate-900 shadow-2xs hover:bg-cyan-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇨🇮</span>
                      <span>Abidjan Port & Ivory Coast</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Jebel Ali Port (Mina Jebel Ali)" }))
                        toast.success("Set POL: Jebel Ali Port (Dubai)")
                      }}
                      className="rounded-xl border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-900 shadow-2xs hover:bg-cyan-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Jebel Ali Port (Dubai)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Port Rashid (Mina Rashid)" }))
                        toast.success("Set POL: Port Rashid (Dubai)")
                      }}
                      className="rounded-xl border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-900 shadow-2xs hover:bg-cyan-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Port Rashid (Dubai)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Al Hamriya Port (Dubai)" }))
                        toast.success("Set POL: Al Hamriya Port (Dubai)")
                      }}
                      className="rounded-xl border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-900 shadow-2xs hover:bg-cyan-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Al Hamriya Port (Dubai)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Dubai Creek (Deira Wharfage)" }))
                        toast.success("Set POL: Dubai Creek (Deira)")
                      }}
                      className="rounded-xl border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-900 shadow-2xs hover:bg-cyan-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Dubai Creek (Deira)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Port of Fujairah" }))
                        toast.success("Set POL: Port of Fujairah")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Fujairah Port</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Khalifa Port (Abu Dhabi)" }))
                        toast.success("Set POL: Khalifa Port (Abu Dhabi)")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Khalifa Port (Abu Dhabi)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Bandar Abbas (Shahid Rajaee)" }))
                        toast.success("Set POL: Bandar Abbas")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇮🇷</span>
                      <span>Bandar Abbas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Chabahar Port (Shahid Beheshti)" }))
                        toast.success("Set POL: Chabahar Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇮🇷</span>
                      <span>Chabahar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Jebel Ali Port, Dubai", port_of_discharge: prev.port_of_discharge || "Abidjan Port" }))
                        toast.success("Set POL: Jebel Ali, Dubai")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇦🇪</span>
                      <span>Jebel Ali / Dubai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Nhava Sheva (JNPT), Mumbai" }))
                        toast.success("Set POL: Nhava Sheva (JNPT)")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇮🇳</span>
                      <span>Nhava Sheva (Mumbai)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Mundra Port, Gujarat" }))
                        toast.success("Set POL: Mundra Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇮🇳</span>
                      <span>Mundra Port</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Karachi Port (KPT)" }))
                        toast.success("Set POL: Karachi Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇵🇰</span>
                      <span>Karachi Port</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_discharge: "Port of Rotterdam" }))
                        toast.success("Set POD: Port of Rotterdam")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇳🇱</span>
                      <span>Rotterdam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_discharge: "Port of Hamburg" }))
                        toast.success("Set POD: Port of Hamburg")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇩🇪</span>
                      <span>Hamburg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Shanghai Port (Yangshan)" }))
                        toast.success("Set POL: Shanghai Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇨🇳</span>
                      <span>Shanghai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_loading: "Port of Singapore" }))
                        toast.success("Set POL: Port of Singapore")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇸🇬</span>
                      <span>Singapore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_discharge: "Lagos Port / Apapa" }))
                        toast.success("Set POD: Lagos Port / Apapa")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇳🇬</span>
                      <span>Lagos (Apapa)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_discharge: "Durban Port" }))
                        toast.success("Set POD: Durban Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇿🇦</span>
                      <span>Durban</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, port_of_discharge: "Mombasa Port" }))
                        toast.success("Set POD: Mombasa Port")
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-2xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🇰🇪</span>
                      <span>Mombasa</span>
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Vessel / کشتی</label>
                    <Input
                      name="vessel_name"
                      value={formData.vessel_name}
                      onChange={handleInputChange}
                      placeholder="e.g. MSC AURELIA"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Voyage No. / سفر</label>
                    <Input
                      name="voyage_number"
                      value={formData.voyage_number}
                      onChange={handleInputChange}
                      placeholder="e.g. 2410E"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Port of Loading / بندر بارگیری</label>
                    <Input
                      name="port_of_loading"
                      list="world-seaports-list"
                      value={formData.port_of_loading}
                      onChange={handleInputChange}
                      placeholder="e.g. Bandar Abbas / Jebel Ali"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Port of Discharge / بندر تخلیه</label>
                    <Input
                      name="port_of_discharge"
                      list="world-seaports-list"
                      value={formData.port_of_discharge}
                      onChange={handleInputChange}
                      placeholder="e.g. Abidjan Port / Rotterdam"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="text-sm text-gray-600 mb-2 block">Place of Delivery / محل تحویل</label>
                    <Input
                      name="place_of_delivery"
                      list="world-places-list"
                      value={formData.place_of_delivery}
                      onChange={handleInputChange}
                      placeholder="e.g. Ivory Coast, West Africa / Europe"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>

                {/* Datalists for global ports and locations autocomplete */}
                <datalist id="world-seaports-list">
                  {predefinedLocations
                    .filter((loc) => loc.isPort)
                    .map((loc) => (
                      <option key={`port-${loc.name}`} value={loc.portName || loc.name}>
                        {`${countryFlags[loc.country] || "⚓"} ${loc.name} (${loc.code})`}
                      </option>
                    ))}
                </datalist>

                <datalist id="world-places-list">
                  {predefinedLocations.map((loc) => (
                    <option key={`place-${loc.name}`} value={loc.name}>
                      {`${countryFlags[loc.country] || "📍"} ${loc.name} - ${loc.persian}`}
                    </option>
                  ))}
                </datalist>
              </CardContent>
            </Card>

            {/* Freight Information */}
            <Card id="section-freight" className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30">
                      <ScrollText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Freight Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات حمل</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Freight Payable At / محل پرداخت کرایه</label>
                  <Input
                    name="freight_payable_at"
                    value={formData.freight_payable_at}
                    onChange={handleInputChange}
                    placeholder="Payment location"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Freight Terms / شرایط حمل</label>
                  <Input
                    name="freight_terms"
                    value={formData.freight_terms}
                    onChange={handleInputChange}
                    placeholder="e.g., Prepaid, Collect"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card id="section-remarks" className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-gray-500 to-gray-600 shadow-md shadow-gray-500/30">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Remarks</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">توضیحات</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <Textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Additional notes or special instructions"
                  rows={3}
                  className="glass-input rounded-xl min-h-20"
                />
              </CardContent>
            </Card>

            {/* Afghanistan Documents */}
            <Card id="section-afghan" className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-3 bg-linear-to-r from-green-500/12 via-green-400/6 to-transparent border-b border-green-200/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-green-600 to-green-700 shadow-lg shadow-green-500/25">
                      <ScrollText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Afghanistan Documents</span>
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {(formData.afghanistan_documents || []).length} selected
                    </span>
                  </div>
                  <span className="text-sm font-normal text-green-600/80 font-[vazirmatn]">اسناد افغانستان</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Category Legend */}
                <div className="flex flex-wrap gap-2 p-3 bg-linear-to-br from-gray-50/80 to-white/60 backdrop-blur-sm rounded-xl border border-gray-100/50">
                  <span className="text-xs font-medium text-gray-500 mr-1">Categories:</span>
                  {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => (
                    <span 
                      key={key} 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                        key === 'transport' ? 'bg-blue-100 text-blue-700' :
                        key === 'customs' ? 'bg-amber-100 text-amber-700' :
                        key === 'commercial' ? 'bg-emerald-100 text-emerald-700' :
                        key === 'health' ? 'bg-rose-100 text-rose-700' :
                        key === 'insurance' ? 'bg-purple-100 text-purple-700' :
                        key === 'driver' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {cat.label}
                    </span>
                  ))}
                </div>

                {/* Required Documents Alert */}
                <div className="flex items-start gap-3 p-3 bg-linear-to-br from-amber-50/80 to-white/60 backdrop-blur-sm rounded-xl border border-amber-200/50">
                  <div className="p-1.5 rounded-lg bg-amber-500 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Required Documents</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Documents marked with <Sparkles className="h-3 w-3 inline text-amber-500" /> are typically required for Afghanistan transit
                    </p>
                  </div>
                </div>

                {/* Document Selection Grid - Grouped by Category */}
                <div className="space-y-4">
                  {Object.entries(DOCUMENT_CATEGORIES).map(([categoryKey, category]) => {
                    const categoryDocs = AFGHANISTAN_DOCUMENT_OPTIONS.filter(doc => doc.category === categoryKey)
                    if (categoryDocs.length === 0) return null
                    
                    const categoryColor = categoryKey === 'transport' ? 'blue' :
                      categoryKey === 'customs' ? 'amber' :
                      categoryKey === 'commercial' ? 'emerald' :
                      categoryKey === 'health' ? 'rose' :
                      categoryKey === 'insurance' ? 'purple' :
                      categoryKey === 'driver' ? 'cyan' : 'red'

                    return (
                      <div key={categoryKey} className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-${categoryColor}-100 text-${categoryColor}-700`}>
                            {category.label}
                          </span>
                          <span className="text-xs text-gray-500 font-[vazirmatn]">{category.labelPersian}</span>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {categoryDocs.map((doc) => {
                            const isSelected = (formData.afghanistan_documents || []).includes(doc.id)
                            const DocIcon = doc.icon === 'truck' ? Truck :
                              doc.icon === 'file-text' ? FileText :
                              doc.icon === 'receipt' ? Receipt :
                              doc.icon === 'list' ? List :
                              doc.icon === 'globe' ? Globe :
                              doc.icon === 'shield' ? Shield :
                              doc.icon === 'leaf' ? Leaf :
                              doc.icon === 'heart' ? Heart :
                              doc.icon === 'scale' ? Scale :
                              doc.icon === 'bookmark' ? Bookmark :
                              doc.icon === 'id-card' ? IdCard :
                              doc.icon === 'car' ? Car :
                              doc.icon === 'building' ? Building2 :
                              doc.icon === 'landmark' ? Landmark :
                              doc.icon === 'map-pin' ? MapPin :
                              doc.icon === 'user' ? User :
                              doc.icon === 'package' ? Package :
                              doc.icon === 'shield-check' ? ShieldCheck :
                              FileText
                            
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => toggleAfghanistanDocument(doc.id)}
                                className={`group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                                  isSelected
                                    ? `border-${categoryColor}-400 bg-linear-to-br from-${categoryColor}-50/80 to-white/60 ring-1 ring-${categoryColor}-200/50 shadow-md`
                                    : "border-gray-200/60 bg-white/60 backdrop-blur-sm hover:border-gray-300 hover:bg-white/80 hover:shadow-sm"
                                }`}
                              >
                                {/* Required badge */}
                                {doc.required && (
                                  <div className="absolute -top-1.5 -right-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                  </div>
                                )}
                                
                                {/* Checkbox */}
                                <div className={`flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 transition-all ${
                                  isSelected
                                    ? `bg-${categoryColor}-600 border-${categoryColor}-600 text-white shadow-sm`
                                    : "border-gray-300 bg-white/80 group-hover:border-gray-400"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                
                                {/* Icon */}
                                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                  isSelected
                                    ? `bg-${categoryColor}-500/20`
                                    : "bg-gray-100 group-hover:bg-gray-200"
                                }`}>
                                  <DocIcon className={`h-4 w-4 ${isSelected ? `text-${categoryColor}-600` : "text-gray-500"}`} />
                                </div>
                                
                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-sm font-medium truncate ${isSelected ? "text-gray-800" : "text-gray-600"}`}>
                                      {doc.label}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500 font-[vazirmatn] truncate" dir="rtl">
                                    {doc.labelPersian}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                    {doc.description}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Document Details */}
                {(formData.afghanistan_documents || []).length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-green-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-semibold text-gray-800">
                          Document Details
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          {(formData.afghanistan_documents || []).length} documents
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-[vazirmatn]">جزئیات اسناد انتخاب شده</p>
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.afghanistan_documents || []).map((docId) => {
                        const doc = AFGHANISTAN_DOCUMENT_OPTIONS.find((d) => d.id === docId)
                        if (!doc) return null
                        const details = formData.afghanistan_document_details?.[docId] || { 
                          documentNumber: "", 
                          dateIssued: "", 
                          expiryDate: "",
                          issuingAuthority: "",
                          issuingLocation: "",
                          remarks: "",
                          verified: false
                        }
                        
                        const categoryColor = doc.category === 'transport' ? 'blue' :
                          doc.category === 'customs' ? 'amber' :
                          doc.category === 'commercial' ? 'emerald' :
                          doc.category === 'health' ? 'rose' :
                          doc.category === 'insurance' ? 'purple' :
                          doc.category === 'driver' ? 'cyan' : 'red'
                        
                        const DocIcon = doc.icon === 'truck' ? Truck :
                          doc.icon === 'file-text' ? FileText :
                          doc.icon === 'receipt' ? Receipt :
                          doc.icon === 'list' ? List :
                          doc.icon === 'globe' ? Globe :
                          doc.icon === 'shield' ? Shield :
                          doc.icon === 'leaf' ? Leaf :
                          doc.icon === 'heart' ? Heart :
                          doc.icon === 'scale' ? Scale :
                          doc.icon === 'bookmark' ? Bookmark :
                          doc.icon === 'id-card' ? IdCard :
                          doc.icon === 'car' ? Car :
                          doc.icon === 'building' ? Building2 :
                          doc.icon === 'landmark' ? Landmark :
                          doc.icon === 'map-pin' ? MapPin :
                          doc.icon === 'user' ? User :
                          doc.icon === 'package' ? Package :
                          doc.icon === 'shield-check' ? ShieldCheck :
                          FileText
                          
                        return (
                          <div key={docId} className={`p-4 bg-linear-to-br from-${categoryColor}-50/50 to-white/40 backdrop-blur-sm rounded-xl border border-${categoryColor}-100/40 shadow-sm`}>
                            {/* Document Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100/50">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${categoryColor}-500/20`}>
                                  <DocIcon className={`h-4 w-4 text-${categoryColor}-600`} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
                                  <p className="text-xs text-gray-500 font-[vazirmatn]" dir="rtl">{doc.labelPersian}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleDocumentDetailChange(docId, "verified", !details.verified)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    details.verified
                                      ? "bg-green-100 text-green-700 border border-green-200"
                                      : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                  }`}
                                >
                                  {details.verified ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Verified
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3.5 w-3.5" />
                                      Mark Verified
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAfghanistanDocument(docId)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete document"
                                  aria-label="Delete document"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Document Fields */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Document Number / شماره سند</label>
                                <Input
                                  value={details.documentNumber}
                                  onChange={(e) => handleDocumentDetailChange(docId, "documentNumber", e.target.value)}
                                  placeholder="e.g., TR-2024-001"
                                  className={`font-mono text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date Issued / تاریخ صدور</label>
                                <Input
                                  type="date"
                                  value={details.dateIssued}
                                  onChange={(e) => handleDocumentDetailChange(docId, "dateIssued", e.target.value)}
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Expiry Date / تاریخ انقضا</label>
                                <Input
                                  type="date"
                                  value={details.expiryDate || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "expiryDate", e.target.value)}
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Issuing Authority / مرجع صادرکننده</label>
                                <Input
                                  value={details.issuingAuthority}
                                  onChange={(e) => handleDocumentDetailChange(docId, "issuingAuthority", e.target.value)}
                                  placeholder="e.g., Ministry of Commerce"
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Issuing Location / محل صدور</label>
                                <Input
                                  value={details.issuingLocation || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "issuingLocation", e.target.value)}
                                  placeholder="e.g., Kabul, Afghanistan"
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Remarks / یادداشت</label>
                                <Input
                                  value={details.remarks || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "remarks", e.target.value)}
                                  placeholder="Additional notes..."
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {(formData.afghanistan_documents || []).length === 0 && (
                  <div className="text-center py-8 px-4 bg-linear-to-br from-gray-50/50 to-white/30 rounded-xl border border-dashed border-gray-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No documents selected</p>
                    <p className="text-xs text-gray-400 mt-1 font-[vazirmatn]">هیچ سندی انتخاب نشده است</p>
                    <p className="text-xs text-gray-400 mt-2">Select documents from the categories above to add details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-2.5">
            {/* Ultra-Sleek Executive Watermark & Document Studio Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl print:hidden">
              {/* Left: Background Watermark Preset & Intensity & Stamp */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Background Preset Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 rounded-lg text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-800 gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Palette className="h-3.5 w-3.5 text-blue-600" />
                      <span>
                        {DOCUMENT_BACKGROUNDS.find(preset => preset.url === bgImageUrl)?.label ?? "Custom Watermark"}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto p-1.5 bg-white rounded-xl shadow-xl border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                      PDF Background & Watermark
                    </DropdownMenuLabel>
                    {DOCUMENT_BACKGROUNDS.map((preset) => (
                      <DropdownMenuItem
                        key={preset.label}
                        onClick={() => {
                          setBgImageUrl(preset.url)
                          setBgOpacity(preset.opacity)
                        }}
                        className={`gap-2 text-xs font-bold cursor-pointer rounded-lg px-2 py-1.5 ${
                          bgImageUrl === preset.url ? "bg-blue-50 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{preset.label}</span>
                        {bgImageUrl === preset.url && <Check className="h-3.5 w-3.5 ml-auto text-blue-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Intensity pill if watermark is active */}
                {bgImageUrl && (
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 px-1.5">Opacity:</span>
                    {[
                      { label: "8%", val: 0.08 },
                      { label: "12%", val: 0.12 },
                      { label: "18%", val: 0.18 },
                      { label: "24%", val: 0.24 },
                    ].map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setBgOpacity(lvl.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          Math.round(bgOpacity * 100) === Math.round(lvl.val * 100)
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:bg-white hover:text-slate-900"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Stamp & Signature Toggle */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStampSignature(!showStampSignature)}
                  className={`h-8 px-2.5 rounded-lg font-bold text-xs shadow-2xs cursor-pointer transition-all ${
                    showStampSignature
                      ? "border-blue-400 bg-blue-50 text-blue-900 hover:bg-blue-100"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                  title="Toggle Official Stamp & Signature Overlay"
                >
                  <span className="mr-1">{showStampSignature ? "🖋️" : "⚪"}</span>
                  <span>{showStampSignature ? "Stamp: ON" : "Stamp: OFF"}</span>
                </Button>
              </div>

              {/* Center: A4 Preview Zoom Stepper & Presets */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (previewScale > 0.45) setPreviewScale(prev => Math.max(0.45, +(prev - 0.1).toFixed(2)))
                  }}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-white rounded-md cursor-pointer"
                  title="Zoom Out Preview"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>

                <button
                  type="button"
                  onClick={() => setPreviewScale(0.68)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    Math.abs(previewScale - 0.68) < 0.02
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Fit whole single-page A4 document on screen without scrolling"
                >
                  Fit Page
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewScale(0.85)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    Math.abs(previewScale - 0.85) < 0.02
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="85% Overview Scale"
                >
                  85%
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewScale(1.0)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    Math.abs(previewScale - 1.0) < 0.02
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="100% 1:1 Actual Print Size"
                >
                  100%
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (previewScale < 1.3) setPreviewScale(prev => Math.min(1.3, +(prev + 0.1).toFixed(2)))
                  }}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-white rounded-md cursor-pointer"
                  title="Zoom In Preview"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>

                <span className="font-mono text-[10px] font-bold text-slate-500 px-1 border-l border-slate-200">
                  {Math.round(previewScale * 100)}%
                </span>
              </div>

              {/* Right: Primary Print & PDF Download Buttons */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDocumentCenterOpen(true)}
                  disabled={isSaving}
                  className="h-8 px-2.5 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs cursor-pointer gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5 text-[#583184]" />
                  <span className="hidden sm:inline">Preview Documents</span>
                  <span className="sm:hidden">Preview</span>
                </Button>

                <div className="inline-flex items-center rounded-lg shadow-sm shadow-purple-950/20">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleShippingDocumentsDownload("all")}
                    onMouseEnter={() => void preloadBOLPDFGeneration()}
                    onFocus={() => void preloadBOLPDFGeneration()}
                    disabled={isSaving}
                    className="h-8 px-3 rounded-r-none bg-gradient-to-r from-[#583184] to-[#432366] hover:from-[#4a2673] hover:to-[#351b52] text-white font-extrabold text-xs cursor-pointer gap-1.5"
                    title="Download Complete PDF (Page 1: BOL, Page 2: Packing List, Page 3: Sticker Label)"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span>Download Complete PDF</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSaving}
                        className="h-8 px-1.5 rounded-l-none border-l border-white/20 bg-[#432366] hover:bg-[#351b52] text-white cursor-pointer"
                        title="Download options"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5 shadow-xl">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500">Shipping documents</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("all")} className="gap-2 text-xs font-black text-[#583184] cursor-pointer">
                        <Package className="h-3.5 w-3.5" />Download Complete PDF (All 3 Documents)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("bol")} className="gap-2 text-xs font-bold cursor-pointer">
                        <FileText className="h-3.5 w-3.5" />Download BOL Only (Page 1)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("packing-list")} className="gap-2 text-xs font-bold cursor-pointer">
                        <FileSpreadsheet className="h-3.5 w-3.5" />Download Packing List Only (Page 2)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleShippingDocumentsDownload("stickers")} className="gap-2 text-xs font-bold cursor-pointer">
                        <Layers className="h-3.5 w-3.5" />Download Sticker Label Only (Page 3)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDirectPrint}
                  className="h-8 px-2.5 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs cursor-pointer gap-1.5"
                  title="Instant Print (Ctrl + P)"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Print</span>
                </Button>
              </div>
            </div>

            {/* Document Studio Canvas with Realistic Paper Elevation & Fit Scale */}
            <div className="overflow-x-auto max-w-full flex flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-200/60 p-2 sm:p-4 shadow-inner print:hidden scrollbar-thin">
              <div
                className="flex items-center justify-between w-full text-[11px] font-bold text-slate-500 mb-2 px-1 transition-all"
                style={{ maxWidth: `${Math.max(794 * previewScale, 340)}px` }}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Single-Page Official A4 Bill of Lading</span>
                </span>
                <span className="font-mono text-[10.5px] shrink-0">210 × 297 mm • 384 DPI</span>
              </div>

              <div
                className="flex items-center justify-center transition-all duration-150 my-auto"
                style={{
                  width: `${794 * previewScale}px`,
                  minHeight: `${1123 * previewScale}px`,
                }}
              >
                <div 
                  className="w-[794px] min-w-[794px] min-h-[1123px] transform-gpu transition-all duration-150 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.08)] rounded-[2px]"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <A4Preview
                    bolNumber={bolNumber}
                    issueDate={issueDate}
                    persianDate={persianDate}
                    persianDateNumeric={persianDateNumeric}
                    formData={deferredFormData}
                    logoUrl={logoUrl}
                    companyName={companyName}
                    companyNamePersian={companyNamePersian}
                    companySubtitle={companySubtitle}
                    companyPhone={companyPhone}
                    companyEmail={companyEmail}
                    companyAddress={companyAddress}
                    companyLicence={companyLicence}
                    backgroundImageUrl={bgImageUrl}
                    backgroundOpacity={bgOpacity}
                    showStampSignature={showStampSignature}
                    onToggleStampSignature={setShowStampSignature}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved-documents" className="focus-visible:outline-none">
            {activeTab === "saved-documents" && (
              <section className="min-h-0 w-full print:hidden [content-visibility:auto]">
                {savedDocumentsPanel || (
                  <SavedDocuments
                    onLoadDocument={(id, targetTab) => {
                      startTransition(() => {
                        void loadDocument(id)
                        setActiveTab(targetTab || "form")
                      })
                    }}
                  />
                )}
              </section>
            )}
          </TabsContent>

          <TabsContent value="account" className="focus-visible:outline-none">
            {activeTab === "account" && (
              <section className="min-h-0 w-full overflow-hidden rounded-[30px] border border-white/70 bg-white/45 p-1 sm:p-2 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl print:hidden [content-visibility:auto]">
                {accountLedgerPanel || <LedgerView />}
              </section>
            )}
          </TabsContent>

          {/* PDF Settings Tab */}
          <TabsContent value="pdf-settings" className="focus-visible:outline-none">
            {activeTab === "pdf-settings" && (
              <div className="space-y-4 [content-visibility:auto]">
              <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25">
                      <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-base sm:text-lg font-black text-slate-950">BOL & Document Settings</span>
                      <span className="text-xs font-semibold text-slate-500">Configure company profile, stamp, watermarks, logo, and document export preferences</span>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-blue-700 font-[vazirmatn] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    تنظیمات بارنامه و اسناد
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pb-6 pt-5">
                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-linear-to-br from-blue-50/80 to-white/60 border border-blue-200/50">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      Download PDF
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Preview and download the BOL, packing list, sticker labels, or one combined shipping PDF.</p>
                    <Button 
                      onClick={() => setIsDocumentCenterOpen(true)} 
                      onMouseEnter={() => void preloadBOLPDFGeneration()}
                      onFocus={() => void preloadBOLPDFGeneration()}
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Open Document Center
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl bg-linear-to-br from-green-50/80 to-white/60 border border-green-200/50">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      Save to Cloud
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Save the PDF to cloud storage for easy access and sharing later.</p>
                    <Button 
                      onClick={handleExportPDF} 
                      disabled={isSaving || !formData.id}
                      variant="outline"
                      className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Save to Cloud
                    </Button>
                    {!formData.id && (
                      <p className="text-xs text-amber-600 mt-2">Save document first to enable cloud storage</p>
                    )}
                  </div>
                </div>

                {/* Document Mountain Scenery & Watermark Background Controls */}
                <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50/90 via-sky-50/50 to-white border border-amber-200 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-amber-600" />
                      Document Background Library
                    </span>
                    <span dir="rtl" className="text-xs font-bold text-amber-800 font-[vazirmatn]">پس‌زمینه کوهستانی و واترمارک</span>
                  </h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Explore 40 new backgrounds plus your classic collection. Select a thumbnail to update your BOL watermark.
                  </p>

                  <BackgroundGallery value={bgImageUrl} onSelect={(preset) => {
                    setBgImageUrl(preset.url)
                    setBgOpacity(preset.opacity)
                  }} />

                  {/* Opacity Slider */}
                  {bgImageUrl && (
                    <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Watermark Opacity:</label>
                      <input
                        type="range"
                        min="0.01"
                        max="0.35"
                        step="0.01"
                        aria-label="Watermark opacity"
                        value={Math.min(bgOpacity, 0.35)}
                        onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                        className="flex-1 accent-amber-600 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-amber-900 w-12 text-right">
                        {Math.round(bgOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* PDF Info */}
                <div className="p-4 rounded-xl bg-linear-to-br from-gray-50/80 to-white/60 border border-gray-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-600" />
                    PDF Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="font-medium text-gray-800">A4 (210mm x 297mm)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Orientation</p>
                      <p className="font-medium text-gray-800">Portrait</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quality</p>
                      <p className="font-medium text-gray-800">High (2x scale)</p>
                    </div>
                  </div>
                </div>

                {/* Print Option */}
                <div className="p-4 rounded-xl bg-linear-to-br from-purple-50/80 to-white/60 border border-purple-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-purple-600" />
                    Print Document
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Print the Bill of Lading directly using your browser&apos;s print dialog.</p>
                  <Button 
                    onClick={() => setIsPrintDialogOpen(true)}
                    disabled={isSaving}
                    variant="outline"
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Document
                  </Button>
                </div>

                {/* Tips */}
                <div className="p-4 rounded-xl bg-linear-to-br from-amber-50/80 to-white/60 border border-amber-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Tips for Best Results
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Fill in all required fields before generating PDF</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Preview the document in the A4 Preview tab first</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Use high-resolution logos for better print quality</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Save the document before using cloud storage</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Logo Editor */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-sm md:text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <ImageIcon className="h-4 w-4 text-white shrink-0" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Company Logo</span>
                      <span className="block text-xs font-normal text-blue-600/80 font-[vazirmatn]">لوگوی شرکت</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Auto-saved
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-blue-200/60 bg-linear-to-br from-white/80 to-blue-50/50 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <p className="text-xs md:text-sm text-gray-600">Upload your company logo for the Bill of Lading</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload-settings"
                        title="Upload company logo"
                        aria-label="Upload company logo"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs md:text-sm h-8 md:h-9 border-blue-200/60 bg-white/50 hover:bg-blue-50/80 hover:border-blue-300 shadow-sm"
                      >
                        <Upload className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 text-blue-600" />
                        Upload Logo
                      </Button>
                      {logoUrl !== "/images/logo.png" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetLogo}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 text-xs md:text-sm h-8 md:h-9"
                        >
                          <RotateCcw className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">Recommended: PNG or SVG, max 200x100px</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Company Information</span>
                      <span className="block text-xs font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات شرکت</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Auto-saved
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        persistCompanySettings()
                        toast.success("BOL & Company settings saved successfully! They will persist across all devices.")
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md h-8 text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Settings
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-700">Company Name (English)</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="SKY ARIANA LIMITED"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block font-[vazirmatn] text-gray-700" dir="rtl">نام شرکت (فارسی)</label>
                    <Input
                      value={companyNamePersian}
                      onChange={(e) => setCompanyNamePersian(e.target.value)}
                      placeholder="شرکت حمل و نقل بین المللی سکای آریانا لمیتد"
                      dir="rtl"
                      className="font-[vazirmatn] glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Subtitle / Description</label>
                  <Input
                    value={companySubtitle}
                    onChange={(e) => setCompanySubtitle(e.target.value)}
                    placeholder="Import & Export - International Transportation"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      Phone
                    </label>
                    <Input
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+93 700 000 000"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      Email
                    </label>
                    <Input
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Address</label>
                  <Input
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="2nd Floor, 16 No. Office, Shahidano, Chowk..."
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Licence Number</label>
                  <Input
                    value={companyLicence}
                    onChange={(e) => setCompanyLicence(e.target.value)}
                    placeholder="2401-2198"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Iran Office Information */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Iran Office Information</span>
                      <span className="block text-xs font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات دفتر ایران</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Auto-saved
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        persistCompanySettings()
                        toast.success("Iran office & company settings saved successfully!")
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md h-8 text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Settings
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Building / ساختمان</label>
                  <Input
                    value={formData.iran_office_building || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_building: e.target.value })}
                    placeholder="CUBIC BUILDING"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Location / موقعیت</label>
                  <Input
                    value={formData.iran_office_location || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_location: e.target.value })}
                    placeholder="BANDAR ABBASS - IRAN"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">P.O. Box / صندوق پستی</label>
                  <Input
                    value={formData.iran_office_pobox || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_pobox: e.target.value })}
                    placeholder="7913973295"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Telefax / تلفکس</label>
                  <Input
                    value={formData.iran_office_telefax || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_telefax: e.target.value })}
                    placeholder="+98 76 32226028"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Cell Phone / تلفن همراه</label>
                  <Input
                    value={formData.iran_office_cellphone || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_cellphone: e.target.value })}
                    placeholder="+98 09172325086"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Email / ایمیل</label>
                  <Input
                    value={formData.iran_office_email || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_email: e.target.value })}
                    placeholder="info@balambarbaran.com"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Print-only A4 Preview */}
        <PrintPreviewPortal>
          <div
            id="bol-print-preview"
            data-print-root="true"
            className="hidden print:block print:h-full print:max-h-[297mm] print:w-[210mm] print:max-w-[210mm] print:overflow-hidden print:m-0 print:p-0 print:box-border"
          >
            <PrintSafeBOL>
              <A4Preview
                bolNumber={bolNumber}
                issueDate={issueDate}
                persianDate={persianDate}
                persianDateNumeric={persianDateNumeric}
                formData={formData}
                logoUrl={logoUrl}
                companyName={companyName}
                companyNamePersian={companyNamePersian}
                companySubtitle={companySubtitle}
                companyPhone={companyPhone}
                companyEmail={companyEmail}
                companyAddress={companyAddress}
                companyLicence={companyLicence}
                includeColorStrip={activePrintOptions.includeColorStrip}
                backgroundImageUrl={bgImageUrl}
                backgroundOpacity={bgOpacity}
                showStampSignature={showStampSignature}
                onToggleStampSignature={setShowStampSignature}
              />
            </PrintSafeBOL>
          </div>
        </PrintPreviewPortal>

        {/* Dedicated PDF export source. Keep it rendered, but outside the viewport. */}
        <div
          data-pdf-export-container="true"
          aria-hidden="true"
          className="fixed top-0 left-[-9999px] w-[210mm] h-[297mm] max-h-[297mm] overflow-hidden opacity-100 pointer-events-none z-[-9999] print:hidden bg-white"
          style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
        >
          <A4Preview
            bolNumber={bolNumber}
            issueDate={issueDate}
            persianDate={persianDate}
            persianDateNumeric={persianDateNumeric}
            formData={formData}
            logoUrl={logoUrl}
            companyName={companyName}
            companyNamePersian={companyNamePersian}
            companySubtitle={companySubtitle}
            companyPhone={companyPhone}
            companyEmail={companyEmail}
            companyAddress={companyAddress}
            companyLicence={companyLicence}
            backgroundImageUrl={bgImageUrl}
            backgroundOpacity={bgOpacity}
            showStampSignature={showStampSignature}
            onToggleStampSignature={setShowStampSignature}
            pdfExport
          />
        </div>

        {/* Dedicated Shipping Documents export source (Packing List & Stickers) */}
        <div
          data-shipping-export-container="true"
          aria-hidden="true"
          className="fixed top-0 left-[-9999px] overflow-hidden opacity-100 pointer-events-none z-[-9999] print:hidden bg-white"
          style={{ width: "210mm" }}
        >
          <div data-shipping-preview="packing-list">
            <PackingListPdfPage
              data={shippingDocumentData}
              logoUrl={logoUrl}
              companyName={companyName}
              companySubtitle={companySubtitle}
            />
          </div>
          <div data-shipping-preview="stickers">
            <StickerPdfPage
              data={shippingDocumentData}
              logoUrl={logoUrl}
              companyName={companyName}
              companySubtitle={companySubtitle}
            />
          </div>
        </div>
      </div>

      <ShippingDocumentCenter
        open={isDocumentCenterOpen}
        onOpenChange={setIsDocumentCenterOpen}
        data={shippingDocumentData}
        logoUrl={logoUrl}
        companyName={companyName}
        companySubtitle={companySubtitle}
        onDownload={handleShippingDocumentsDownload}
        onPrint={handleShippingDocumentsPrint}
        bolPreview={(
          <A4Preview
            bolNumber={bolNumber}
            issueDate={issueDate}
            persianDate={persianDate}
            persianDateNumeric={persianDateNumeric}
            formData={formData}
            logoUrl={logoUrl}
            companyName={companyName}
            companyNamePersian={companyNamePersian}
            companySubtitle={companySubtitle}
            companyPhone={companyPhone}
            companyEmail={companyEmail}
            companyAddress={companyAddress}
            companyLicence={companyLicence}
            backgroundImageUrl={bgImageUrl}
            backgroundOpacity={bgOpacity}
            showStampSignature={showStampSignature}
            onToggleStampSignature={setShowStampSignature}
          />
        )}
      />

      {/* Print Options Dialog */}
      <PrintOptionsDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        onPrint={handlePrint}
        isPrinting={isSaving}
      />

      {/* Save Route Preset Dialog */}
      <Dialog open={isSaveRouteModalOpen} onOpenChange={setIsSaveRouteModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <BookmarkPlus className="h-4 w-4" />
              </span>
              Save Route to Quick Presets
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium font-[vazirmatn]" dir="rtl">
              ذخیره توقفگاه‌های فعلی مسیر ({formData.routes.length} توقفگاه) در نوار پیش‌فرض‌های سریع برای استفاده آسان
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1.5">
                Preset Name / نام پیش‌فرض مسیر
              </label>
              <Input
                value={newPresetTitle}
                onChange={(e) => setNewPresetTitle(e.target.value)}
                placeholder="e.g. Kandahar ➡️ Islam Qala ➡️ Mashhad"
                className="h-10 rounded-xl border-slate-200 font-bold text-sm focus:border-amber-500 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 block mb-1.5">
                Icon / آیکون مسیر
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["🚛", "🚢", "✈️", "🚆", "⭐", "🗺️", "📍", "📦", "🇦🇫", "🇮🇷", "🇵🇰", "🇦🇪", "🇮🇳", "🇺🇿"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewPresetIcon(emoji)}
                    className={`h-8 w-8 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                      newPresetIcon === emoji
                        ? "bg-amber-500 text-white shadow-md scale-110 ring-2 ring-amber-400"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Stops Preview */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 block mb-1.5">
                Stops to be saved ({formData.routes.length}):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-blue-950">
                {formData.routes.map((r, i) => (
                  <span key={r.id || i} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="text-blue-400">➡️</span>}
                    <span className="rounded-md bg-white px-2 py-0.5 border border-blue-200/80 shadow-2xs">
                      {r.location || r.locationPersian || `Stop #${i + 1}`}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSaveRouteModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Cancel / لغو
            </Button>
            <Button
              type="button"
              onClick={handleSaveRoutePreset}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save Preset / ذخیره پیش‌فرض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={isShortcutsModalOpen} onOpenChange={setIsShortcutsModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-black">
              <Keyboard className="h-5 w-5 text-blue-600" />
              Keyboard Shortcuts / کلیدهای میانبر
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Boost your logistics productivity with instant keyboard shortcuts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-3">
            {[
              { keys: ["Ctrl", "S"], desc: "Save / Update Bill of Lading", fa: "ذخیره یا ویرایش بارنامه" },
              { keys: ["Ctrl", "P"], desc: "Print Document / Open PDF Print Dialog", fa: "چاپ سند یا پیش‌نمایش" },
              { keys: ["Ctrl", "Shift", "N"], desc: "Create New Blank Document", fa: "ایجاد سند جدید و خالی" },
              { keys: ["Ctrl", "Shift", "D"], desc: "Duplicate Current Document", fa: "تکثیر و کپی بارنامه فعلی" },
              { keys: ["Ctrl", "/"], desc: "Open this Shortcuts Guide", fa: "نمایش این راهنما" },
            ].map((sc, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 bg-slate-50/80">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-900">{sc.desc}</span>
                  <span className="text-[10.5px] text-slate-500 font-bold font-[vazirmatn]">{sc.fa}</span>
                </div>
                <div className="flex items-center gap-1">
                  {sc.keys.map((k) => (
                    <kbd key={k} className="px-2 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-[11px] font-black font-mono text-blue-900">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsShortcutsModalOpen(false)}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Got it / فهمیدم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup & Restore Data Hub Dialog */}
      <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-black">
              <DownloadCloud className="h-5 w-5 text-emerald-600" />
              Backup & Restore Data Hub / پشتیبان‌گیری
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Export all your saved B/Ls, company profiles, and presets or restore from a JSON backup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Export Card */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-emerald-950">Export Full JSON Backup</h4>
                <p className="text-[11px] text-emerald-800 font-medium">Download complete backup file of all documents & settings</p>
              </div>
              <Button
                type="button"
                onClick={handleExportFullBackup}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
            </div>

            {/* Import Card */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-blue-950">Restore from Backup File</h4>
                <p className="text-[11px] text-blue-800 font-medium">Select a previously saved .json backup file to restore</p>
              </div>
              <label className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer inline-flex items-center justify-center">
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBackupModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Close / بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Device Cloud Sync Hub */}
      <CloudSyncModal
        open={isCloudSyncModalOpen}
        onOpenChange={setIsCloudSyncModalOpen}
        onSyncComplete={() => {
          if (onRefreshDocuments) onRefreshDocuments()
        }}
      />
    </div>
  )
}
