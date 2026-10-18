"use client"

import React, { useState, useEffect } from "react"
import { X, Truck, ShieldCheck, Calendar, MapPin, CheckCircle2 } from "lucide-react"
import { TruckRecord, PlateCountry, TruckOwnership, TruckType, TruckStatus } from "@/lib/types/fleet-operations"
import { AfghanTruckPlate } from "@/components/ui/afghan-truck-plate"
import { AFGHAN_PROVINCES } from "@/lib/utils/afghan-plate"

interface TruckEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (truck: TruckRecord) => void
  initialTruck?: TruckRecord | null
}

const AFGHAN_LETTERS = [
  { fa: "ل", en: "L", label: "ل (L) — باربری / Commercial" },
  { fa: "ش", en: "SH", label: "ش (SH) — شخصی / Private" },
  { fa: "م", en: "M", label: "م (M) — موسسات / Org" },
  { fa: "ت", en: "T", label: "ت (T) — تاکسی / Taxi" },
]

export function TruckEditorDrawer({ isOpen, onClose, onSave, initialTruck }: TruckEditorDrawerProps) {
  const [plateCountry, setPlateCountry] = useState<PlateCountry>("AF")
  const [plateProvince, setPlateProvince] = useState("Kabul")
  const [plateNumber, setPlateNumber] = useState("")
  const [plateLetter, setPlateLetter] = useState("ل")
  const [truckCode, setTruckCode] = useState("")
  const [ownership, setOwnership] = useState<TruckOwnership>("OWNED")
  const [truckType, setTruckType] = useState<TruckType>("TRAILER_40FT")
  const [makeModel, setMakeModel] = useState("")
  const [yearOfManufacture, setYearOfManufacture] = useState(2020)
  const [capacityTons, setCapacityTons] = useState(25)
  const [maxCbm, setMaxCbm] = useState(85)
  const [isReefer, setIsReefer] = useState(false)
  const [reeferGensetUnit, setReeferGensetUnit] = useState("")
  const [truckingCompanyName, setTruckingCompanyName] = useState("Sky Ariana Internal Fleet")
  const [currentStatus, setCurrentStatus] = useState<TruckStatus>("AVAILABLE")
  const [currentLocationName, setCurrentLocationName] = useState("Kabul ACCS Logistics Hub")
  const [currentBorderStation, setCurrentBorderStation] = useState("")
  const [insuranceExpiry, setInsuranceExpiry] = useState("")
  const [roadPermitExpiry, setRoadPermitExpiry] = useState("")
  const [fitnessExpiry, setFitnessExpiry] = useState("")
  const [gpsDeviceInstalled, setGpsDeviceInstalled] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (initialTruck) {
      setPlateCountry(initialTruck.plateCountry || "AF")
      setPlateProvince(initialTruck.plateProvince || "Kabul")
      setPlateNumber(initialTruck.plateNumber || "")
      setPlateLetter(initialTruck.plateLetter || "ل")
      setTruckCode(initialTruck.truckCode || "")
      setOwnership(initialTruck.ownership || "OWNED")
      setTruckType(initialTruck.truckType || "TRAILER_40FT")
      setMakeModel(initialTruck.makeModel || "")
      setYearOfManufacture(initialTruck.yearOfManufacture || 2020)
      setCapacityTons(initialTruck.capacityTons || 25)
      setMaxCbm(initialTruck.maxCbm || 85)
      setIsReefer(initialTruck.isReefer || false)
      setReeferGensetUnit(initialTruck.reeferGensetUnit || "")
      setTruckingCompanyName(initialTruck.truckingCompanyName || "Sky Ariana Internal Fleet")
      setCurrentStatus(initialTruck.currentStatus || "AVAILABLE")
      setCurrentLocationName(initialTruck.currentLocationName || "Kabul ACCS Logistics Hub")
      setCurrentBorderStation(initialTruck.currentBorderStation || "")
      setInsuranceExpiry(initialTruck.insuranceExpiry || "")
      setRoadPermitExpiry(initialTruck.roadPermitExpiry || "")
      setFitnessExpiry(initialTruck.fitnessExpiry || "")
      setGpsDeviceInstalled(initialTruck.gpsDeviceInstalled || false)
      setNotes(initialTruck.notes || "")
    } else {
      setPlateCountry("AF")
      setPlateProvince("Kabul")
      setPlateNumber("")
      setPlateLetter("ل")
      setTruckCode(`TRK-AF-${Math.floor(100 + Math.random() * 900)}`)
      setOwnership("OWNED")
      setTruckType("TRAILER_40FT")
      setMakeModel("Mercedes-Benz Actros")
      setYearOfManufacture(2020)
      setCapacityTons(25)
      setMaxCbm(85)
      setIsReefer(false)
      setReeferGensetUnit("")
      setTruckingCompanyName("Sky Ariana Internal Fleet")
      setCurrentStatus("AVAILABLE")
      setCurrentLocationName("Kabul ACCS Logistics Hub")
      setCurrentBorderStation("")
      setInsuranceExpiry("2026-12-31")
      setRoadPermitExpiry("2026-12-31")
      setFitnessExpiry("2026-12-31")
      setGpsDeviceInstalled(false)
      setNotes("")
    }
  }, [initialTruck, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!plateNumber.trim()) {
      alert("Please provide the registration plate number.")
      return
    }

    const payload: TruckRecord = {
      id: initialTruck?.id || `trk-${Date.now()}`,
      truckCode: truckCode.trim() || `TRK-${plateNumber.trim()}`,
      plateNumber: plateNumber.trim(),
      plateCountry,
      plateProvince: plateCountry === "AF" ? plateProvince : undefined,
      plateLetter: plateCountry === "AF" ? plateLetter : undefined,
      ownership,
      truckType,
      makeModel: makeModel.trim(),
      yearOfManufacture: Number(yearOfManufacture),
      capacityTons: Number(capacityTons),
      maxCbm: Number(maxCbm),
      isReefer,
      reeferGensetUnit: isReefer ? reeferGensetUnit.trim() : undefined,
      truckingCompanyName: truckingCompanyName.trim(),
      currentStatus,
      currentLocationName: currentLocationName.trim(),
      currentBorderStation: currentBorderStation.trim() || undefined,
      insuranceExpiry: insuranceExpiry || undefined,
      roadPermitExpiry: roadPermitExpiry || undefined,
      fitnessExpiry: fitnessExpiry || undefined,
      gpsDeviceInstalled,
      notes: notes.trim(),
      isActive: true,
      createdAt: initialTruck?.createdAt || new Date().toISOString(),
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
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {initialTruck ? "Edit Fleet Vehicle" : "Register New Truck"}
              </h2>
              <p className="text-xs text-slate-500">
                Afghan & International road freight fleet management
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
          {/* Plate Configuration & Preview */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> License Plate & Country of Origin
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Registration Country
                </label>
                <select
                  value={plateCountry}
                  onChange={(e) => setPlateCountry(e.target.value as PlateCountry)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="AF">🇦🇫 Afghanistan (Official License Plate)</option>
                  <option value="IR">🇮🇷 Iran (Transit Partner)</option>
                  <option value="PK">🇵🇰 Pakistan (Transit Partner)</option>
                  <option value="TR">🇹🇷 Turkey (TIR Transit)</option>
                  <option value="AE">🇦🇪 United Arab Emirates</option>
                  <option value="UZ">🇺🇿 Uzbekistan (Northern Corridor)</option>
                  <option value="TM">🇹🇲 Turkmenistan (Torghundi/Aqina)</option>
                  <option value="TJ">🇹🇯 Tajikistan (Sher Khan Bandar)</option>
                  <option value="OTHER">Other / International</option>
                </select>
              </div>

              {plateCountry === "AF" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Province (ولایت)
                  </label>
                  <select
                    value={plateProvince}
                    onChange={(e) => setPlateProvince(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    {AFGHAN_PROVINCES.map((p) => (
                      <option key={p.code} value={p.nameEn}>
                        {p.nameEn} ({p.nameFa} - {p.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Internal Fleet Code
                  </label>
                  <input
                    type="text"
                    value={truckCode}
                    onChange={(e) => setTruckCode(e.target.value)}
                    placeholder="e.g. TRK-IR-01"
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plate Number Digits
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder={plateCountry === "AF" ? "e.g. 2877 or 35974" : "e.g. 72 B 845 IR"}
                  required
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              {plateCountry === "AF" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category Letter
                  </label>
                  <select
                    value={plateLetter}
                    onChange={(e) => setPlateLetter(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    {AFGHAN_LETTERS.map((l) => (
                      <option key={l.en} value={l.fa}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Live Visual Plate Preview */}
            <div className="pt-2 flex flex-col items-center justify-center p-3 rounded-lg bg-slate-200/50 dark:bg-slate-950/60 border border-slate-300/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 mb-2 uppercase tracking-wider">
                Visual Plate Render Preview
              </span>
              {plateCountry === "AF" ? (
                <AfghanTruckPlate
                  plateNumber={plateNumber || "0000"}
                  province={plateProvince}
                  plateLetter={plateLetter}
                  size="default"
                />
              ) : (
                <div className="px-4 py-2 bg-yellow-400 text-slate-950 font-mono font-black text-lg rounded border-2 border-slate-950 shadow-md">
                  [{plateCountry}] {plateNumber || "XX-0000"}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Specifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Specifications & Equipment
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Truck Body Type
                </label>
                <select
                  value={truckType}
                  onChange={(e) => {
                    const val = e.target.value as TruckType
                    setTruckType(val)
                    if (val === "REEFER_TRUCK") setIsReefer(true)
                  }}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="TRAILER_40FT">40FT Enclosed Trailer (تریلر چادری)</option>
                  <option value="REEFER_TRUCK">Refrigerated Reefer Trailer (موتر یخچالی)</option>
                  <option value="CONTAINER_CHASSIS">Container Chassis Skeleton (کفی کانتینربر)</option>
                  <option value="FLATBED">Flatbed Open Trailer (کفی بدون لبه)</option>
                  <option value="TRAILER_20FT">20FT Short Trailer (تریلر کوتاه)</option>
                  <option value="LOWBOY">Heavy Equipment Lowboy (کمرشکن)</option>
                  <option value="BOX_TRUCK">Rigid Box Truck (کامیون ده چرخ)</option>
                  <option value="TANKER">Liquid Tanker (تانکر سوخت/مایعات)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ownership Model
                </label>
                <select
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value as TruckOwnership)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="OWNED">Sky Ariana Owned Asset (ملکی شرکت)</option>
                  <option value="DEDICATED_CONTRACT">Dedicated Long-Term Contract (قراردادی)</option>
                  <option value="MARKET_HIRED">Market Hired / Spot (نوبتی / بازار آزاد)</option>
                  <option value="INTERCHANGE">Cross-Border Interchange (ترانزیت مشترک)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Make & Model
                </label>
                <input
                  type="text"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  placeholder="e.g. Volvo FH 500"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Capacity (Tons)
                </label>
                <input
                  type="number"
                  value={capacityTons}
                  onChange={(e) => setCapacityTons(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Volume (CBM)
                </label>
                <input
                  type="number"
                  value={maxCbm}
                  onChange={(e) => setMaxCbm(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Reefer specific option */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReefer}
                  onChange={(e) => setIsReefer(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Equipped with Reefer Generator Unit (یخچالی)
                </span>
              </label>

              {isReefer && (
                <div className="mt-2 pl-6">
                  <input
                    type="text"
                    value={reeferGensetUnit}
                    onChange={(e) => setReeferGensetUnit(e.target.value)}
                    placeholder="e.g. Thermo King SLXi 400 Whisper or Carrier Vector"
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Location & Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" /> Current Operational Status
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as TruckStatus)}
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="AVAILABLE">AVAILABLE (آماده اعزام)</option>
                  <option value="ASSIGNED">ASSIGNED (رزرو شده)</option>
                  <option value="ON_TRIP">ON_TRIP (در حال حرکت در جاده)</option>
                  <option value="BORDER_WAITING">BORDER_WAITING (در صف مرز)</option>
                  <option value="CUSTOMS_CLEARANCE">CUSTOMS_CLEARANCE (داخل گمرک)</option>
                  <option value="TRANSLOADING">TRANSLOADING (تخلیه و بارگیری مرزی)</option>
                  <option value="MAINTENANCE">MAINTENANCE (تعمیرگاه / سرویس)</option>
                  <option value="BROKEN_DOWN">BROKEN_DOWN (نقص فنی در مسیر)</option>
                  <option value="INACTIVE">INACTIVE (غیرفعال)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Station / City
                </label>
                <input
                  type="text"
                  value={currentLocationName}
                  onChange={(e) => setCurrentLocationName(e.target.value)}
                  placeholder="e.g. Islam Qala Customs Gate"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Carrier / Trucking Partner Company
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

          {/* Compliance & Expiries */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" /> Compliance & Road Permits
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Road Permit Expiry
                </label>
                <input
                  type="date"
                  value={roadPermitExpiry}
                  onChange={(e) => setRoadPermitExpiry(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Insurance Expiry
                </label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Technical Fitness Expiry
                </label>
                <input
                  type="date"
                  value={fitnessExpiry}
                  onChange={(e) => setFitnessExpiry(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Maintenance & Equipment Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Oil change due in 2,000 km. Heavy payload certified."
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
              className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Vehicle Record
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
