"use client"

import React, { useState, useEffect } from "react"
import { X, UserCheck, ShieldCheck, Phone, FileText, CheckCircle2, Lock } from "lucide-react"
import { DriverRecord, DriverStatus } from "@/lib/types/fleet-operations"

interface DriverEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (driver: DriverRecord) => void
  initialDriver?: DriverRecord | null
}

export function DriverEditorDrawer({ isOpen, onClose, onSave, initialDriver }: DriverEditorDrawerProps) {
  const [fullName, setFullName] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [driverCode, setDriverCode] = useState("")
  const [nationalIdTazkira, setNationalIdTazkira] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [passportExpiry, setPassportExpiry] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [licenseType, setLicenseType] = useState("Class 1 Heavy Trailer (درجه یک)")
  const [licenseExpiry, setLicenseExpiry] = useState("")
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [secondaryPhone, setSecondaryPhone] = useState("")
  const [emergencyContact, setEmergencyContact] = useState("")
  const [country, setCountry] = useState("AF")
  const [city, setCity] = useState("Kabul")
  const [isCompanyEmployee, setIsCompanyEmployee] = useState(true)
  const [truckingCompanyName, setTruckingCompanyName] = useState("Sky Ariana Internal Fleet")
  const [currentStatus, setCurrentStatus] = useState<DriverStatus>("ACTIVE")
  const [currentLocationName, setCurrentLocationName] = useState("Kabul Logistics Hub")
  const [safetyRating, setSafetyRating] = useState(5)
  const [verified, setVerified] = useState(true)
  const [hidePrivateDocsFromCustomer, setHidePrivateDocsFromCustomer] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (initialDriver) {
      setFullName(initialDriver.fullName || "")
      setFatherName(initialDriver.fatherName || "")
      setDriverCode(initialDriver.driverCode || "")
      setNationalIdTazkira(initialDriver.nationalIdTazkira || "")
      setPassportNumber(initialDriver.passportNumber || "")
      setPassportExpiry(initialDriver.passportExpiry || "")
      setLicenseNumber(initialDriver.licenseNumber || "")
      setLicenseType(initialDriver.licenseType || "Class 1 Heavy Trailer (درجه یک)")
      setLicenseExpiry(initialDriver.licenseExpiry || "")
      setPrimaryPhone(initialDriver.primaryPhone || "")
      setSecondaryPhone(initialDriver.secondaryPhone || "")
      setEmergencyContact(initialDriver.emergencyContact || "")
      setCountry(initialDriver.country || "AF")
      setCity(initialDriver.city || "Kabul")
      setIsCompanyEmployee(initialDriver.isCompanyEmployee ?? true)
      setTruckingCompanyName(initialDriver.truckingCompanyName || "Sky Ariana Internal Fleet")
      setCurrentStatus(initialDriver.currentStatus || "ACTIVE")
      setCurrentLocationName(initialDriver.currentLocationName || "Kabul Logistics Hub")
      setSafetyRating(initialDriver.safetyRating || 5)
      setVerified(initialDriver.verified ?? true)
      setHidePrivateDocsFromCustomer(initialDriver.hidePrivateDocsFromCustomer ?? true)
      setNotes(initialDriver.notes || "")
    } else {
      setFullName("")
      setFatherName("")
      setDriverCode(`DRV-${Math.floor(100 + Math.random() * 900)}`)
      setNationalIdTazkira("")
      setPassportNumber("")
      setPassportExpiry("")
      setLicenseNumber("")
      setLicenseType("Class 1 Heavy Trailer (درجه یک)")
      setLicenseExpiry("2028-12-31")
      setPrimaryPhone("+93 ")
      setSecondaryPhone("")
      setEmergencyContact("")
      setCountry("AF")
      setCity("Kabul")
      setIsCompanyEmployee(true)
      setTruckingCompanyName("Sky Ariana Internal Fleet")
      setCurrentStatus("ACTIVE")
      setCurrentLocationName("Kabul Logistics Hub")
      setSafetyRating(5)
      setVerified(true)
      setHidePrivateDocsFromCustomer(true)
      setNotes("")
    }
  }, [initialDriver, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !primaryPhone.trim()) {
      alert("Please provide the driver's full name and primary phone.")
      return
    }

    const payload: DriverRecord = {
      id: initialDriver?.id || `drv-${Date.now()}`,
      driverCode: driverCode.trim() || `DRV-${Math.floor(100 + Math.random() * 900)}`,
      fullName: fullName.trim(),
      fatherName: fatherName.trim(),
      nationalIdTazkira: nationalIdTazkira.trim() || undefined,
      passportNumber: passportNumber.trim() || undefined,
      passportExpiry: passportExpiry || undefined,
      licenseNumber: licenseNumber.trim(),
      licenseType: licenseType.trim(),
      licenseExpiry: licenseExpiry || undefined,
      primaryPhone: primaryPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      country,
      city: city.trim(),
      isCompanyEmployee,
      truckingCompanyName: truckingCompanyName.trim(),
      currentStatus,
      currentLocationName: currentLocationName.trim(),
      safetyRating: Number(safetyRating),
      verified,
      hidePrivateDocsFromCustomer,
      notes: notes.trim(),
      createdAt: initialDriver?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {initialDriver ? "Edit Driver Profile" : "Register Transit Driver"}
              </h2>
              <p className="text-xs text-slate-500">
                Road transport crew, compliance & Tazkira identification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Personal Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Driver Identification
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (نام و تخلص) *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ahmadullah Niazi"
                  required
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Father Name (نام پدر / ولد) *
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Ghulam Sakhi"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Driver Code
                </label>
                <input
                  type="text"
                  value={driverCode}
                  onChange={(e) => setDriverCode(e.target.value)}
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nationality
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="AF">🇦🇫 Afghanistan</option>
                  <option value="IR">🇮🇷 Iran</option>
                  <option value="PK">🇵🇰 Pakistan</option>
                  <option value="TR">🇹🇷 Turkey</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Home City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Herat or Kabul"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" /> Communication & Contacts
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Mobile (شماره تماس اصلی) *
                </label>
                <input
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="+93 79 123 4567"
                  required
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp / Roaming SIM (سیم‌کارت دوم / ایران)
                </label>
                <input
                  type="tel"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="+98 912 345 6789"
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Relative Contact (تماس اضطراری)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Brother: Mohammad Niazi (+93 70 012 3456)"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Legal Documents & Tazkira */}
          <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> Government Credentials
              </h3>
              <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-medium">
                <Lock className="w-3 h-3" /> Confidential Data
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  National ID / Tazkira (تذکره الکترونیکی یا کاغذی)
                </label>
                <input
                  type="text"
                  value={nationalIdTazkira}
                  onChange={(e) => setNationalIdTazkira(e.target.value)}
                  placeholder="e.g. AFG-1392-884920"
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Driver License Number (شماره لایسنس)
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. LIC-KBL-77402"
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  License Class
                </label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="Class 1 Heavy Trailer (درجه یک)">Class 1 Heavy Trailer (درجه یک)</option>
                  <option value="Class 1 Heavy Reefer (درجه یک یخچالی)">Class 1 Reefer (یخچالی)</option>
                  <option value="Class 2 Commercial (درجه دو)">Class 2 Commercial (درجه دو)</option>
                  <option value="International Transit License (ترانزیت بین‌المللی)">International TIR License</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="e.g. P01984210"
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Passport Expiry
                </label>
                <input
                  type="date"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Privacy Shield Toggle */}
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePrivateDocsFromCustomer}
                  onChange={(e) => setHidePrivateDocsFromCustomer(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Strict Customer Data Isolation Active (حفظ محرمانگی اسناد)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Automatically hides Tazkira, Passport, and Private Phone from customer-facing views and WhatsApp quotes.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Operational Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Operations & Affiliation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as DriverStatus)}
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="ACTIVE">ACTIVE (آماده برای سفر)</option>
                  <option value="ON_TRIP">ON_TRIP (در سفر جاده‌ای)</option>
                  <option value="RESTING">RESTING (استراحت / نوبت‌دهی)</option>
                  <option value="BORDER_DELAYED">BORDER_DELAYED (متوقف در مرز / گمرک)</option>
                  <option value="ON_LEAVE">ON_LEAVE (مرخصی)</option>
                  <option value="SUSPENDED">SUSPENDED (تعلیق انضباطی)</option>
                  <option value="INACTIVE">INACTIVE (غیرفعال)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Location
                </label>
                <input
                  type="text"
                  value={currentLocationName}
                  onChange={(e) => setCurrentLocationName(e.target.value)}
                  placeholder="e.g. Islam Qala Border or Kabul Depot"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Employment Status
                </label>
                <select
                  value={isCompanyEmployee ? "company" : "contractor"}
                  onChange={(e) => setIsCompanyEmployee(e.target.value === "company")}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="company">Direct Company Driver (راننده استخدامی)</option>
                  <option value="contractor">Owner-Operator / Contractor (مالک موتر / قراردادی)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Affiliated Trucking Co.
                </label>
                <input
                  type="text"
                  value={truckingCompanyName}
                  onChange={(e) => setTruckingCompanyName(e.target.value)}
                  placeholder="e.g. Sky Ariana Internal Fleet"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Driver Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reliable driver on Islam Qala route. Experienced with cold chain handling."
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Driver Record
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
