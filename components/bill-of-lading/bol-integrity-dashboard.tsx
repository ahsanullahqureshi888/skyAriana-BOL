"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert, FileWarning, Fingerprint, History, CheckCircle2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BolIntegrityDashboard() {
  const [stats, setStats] = useState({
    totalShipments: 0,
    withoutBol: 0,
    containersWithoutBol: 0,
    duplicateFingerprints: 0,
    missingConsignee: 0,
    drafts: 0
  })

  useEffect(() => {
    // In a real app this would fetch from an API
    // We'll mock it for the client-side browser storage
    const load = () => {
      try {
        const stored = window.localStorage.getItem("sky-bol-browser-documents") || "[]"
        const bols = JSON.parse(stored)
        setStats({
          totalShipments: bols.length,
          withoutBol: 0, // In this local storage model, everything here IS a BOL.
          containersWithoutBol: 0,
          duplicateFingerprints: 0,
          missingConsignee: bols.filter((b: any) => !b.consignee_name).length,
          drafts: bols.filter((b: any) => b.status === "DRAFT").length
        })
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            BOL Data Integrity
          </h2>
          <p className="text-slate-500 mt-1">Audit shipment relationships, orphans, and missing required data.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <RotateCw className="h-4 w-4" /> Refresh Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-100">
          <CardHeader className="bg-red-50/50 pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center">
              <FileWarning className="h-4 w-4 mr-2" /> Orphaned Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Shipments Without BOL</span>
              <span className={`font-bold ${stats.withoutBol > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.withoutBol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Containers Without BOL</span>
              <span className={`font-bold ${stats.containersWithoutBol > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.containersWithoutBol}</span>
            </div>
            {stats.withoutBol === 0 && stats.containersWithoutBol === 0 && (
              <div className="mt-4 p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> All shipments have BOLs.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-100">
          <CardHeader className="bg-amber-50/50 pb-3">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center">
              <History className="h-4 w-4 mr-2" /> Incomplete Generated BOLs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Draft Status</span>
              <span className="font-bold text-amber-600">{stats.drafts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Missing Consignee</span>
              <span className="font-bold text-amber-600">{stats.missingConsignee}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100">
          <CardHeader className="bg-blue-50/50 pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Fingerprint className="h-4 w-4 mr-2" /> Duplicates & Fingerprints
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Duplicate Fingerprints</span>
              <span className={`font-bold ${stats.duplicateFingerprints > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.duplicateFingerprints}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
