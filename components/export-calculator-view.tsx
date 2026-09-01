"use client"

import { useState } from "react"
import { ExportLogisticsCalculator } from "@/components/export-logistics-calculator"
import { useApp } from "@/lib/app-context"
import { toast } from "sonner"

export function ExportCalculatorView() {
  const { setView } = useApp()

  const handleApplyToBOL = (routes: any[], freightUSD: number, equipmentType?: string) => {
    toast.success("Corridor configuration transferred to Bill of Lading Editor!")
    setView("bol")
  }

  const handlePostToLedger = (journalEntries: any[]) => {
    toast.success("Quote entries successfully posted to Financial Ledger!")
    setView("ledger")
  }

  return (
    <div className="w-full min-h-screen bg-slate-950/95 py-6 px-3 sm:px-6">
      <div className="max-w-[1800px] mx-auto">
        <ExportLogisticsCalculator
          onApplyToBOL={handleApplyToBOL}
          onPostToLedger={handlePostToLedger}
        />
      </div>
    </div>
  )
}

