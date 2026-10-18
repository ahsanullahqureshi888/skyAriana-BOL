"use client"

import React, { useState } from "react"
import { X, Scale, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react"
import { CargoLotRecord } from "@/lib/types/warehouse-cargo"

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  lot: CargoLotRecord
  onAdjust: (lotId: string, adjustment: number, reason: string, user: string) => void
}

const REASONS = [
  "Physical Count Correction (تطبیق شمارش عینی)",
  "Damaged Package Removed (کارتن آسیب‌دیده خارج شد)",
  "Repacking Difference (تفاوت پس از کارتن‌بندی مجدد)",
  "Found Uncounted Package (کارتن اضافه پیدا شده)",
  "Lost / Missing Package (کارتن مفقود شده)",
  "Data Entry Correction (تصحیح اشتباه ثبت قبلی)",
  "Customs Sampling Inspection (نمونه‌برداری گمرک)",
  "Other Authorized Adjustment (سایر دلایل با تایید)",
]

export function StockAdjustmentModal({ isOpen, onClose, lot, onAdjust }: StockAdjustmentModalProps) {
  const [adjustment, setAdjustment] = useState<number>(-5)
  const [reason, setReason] = useState(REASONS[0])
  const [customReason, setCustomReason] = useState("")
  const [authorizedUser, setAuthorizedUser] = useState("Warehouse General Manager")

  if (!isOpen) return null

  const currentStock = lot.remainingQuantity
  const newStock = currentStock + adjustment
  const isNegative = newStock < 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (adjustment === 0) {
      alert("Adjustment cannot be zero.")
      return
    }

    if (isNegative) {
      alert("Adjustment blocked: Resulting inventory cannot be negative.")
      return
    }

    const finalReason = reason.includes("Other") && customReason.trim() ? customReason.trim() : reason
    onAdjust(lot.id, Number(adjustment), finalReason, authorizedUser.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Authorized Inventory Adjustment
              </h2>
              <p className="text-xs text-slate-500">
                Lot: {lot.lotNumber} ({lot.commodity})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Customer:</span>
              <strong className="text-slate-900 dark:text-slate-100">{lot.customerName}</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Current Warehouse Stock:</span>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {currentStock.toLocaleString()} {lot.packageType}
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity Adjustment (+ or -) *
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              required
              className="w-full text-base font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Enter negative value to deduct damaged/lost cartons (e.g. -10), or positive to add found stock.
            </p>
          </div>

          {/* Before & After Tally Preview */}
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isNegative
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                : "border-purple-200 bg-purple-50 text-purple-900 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-200"
            }`}
          >
            <span>Before: {currentStock}</span>
            <span>Adjustment: {adjustment > 0 ? `+${adjustment}` : adjustment}</span>
            <span>
              Resulting Stock: <strong>{newStock}</strong> {lot.packageType}
            </span>
          </div>

          {isNegative && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Error: Physical stock cannot drop below zero!
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Authorized Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Authorizing Officer / Manager *
            </label>
            <input
              type="text"
              value={authorizedUser}
              onChange={(e) => setAuthorizedUser(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
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
              disabled={isNegative}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Commit Adjustment & Audit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
