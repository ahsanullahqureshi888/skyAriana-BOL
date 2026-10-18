"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, Settings2, Fingerprint } from "lucide-react"

export function BolAutomationSettings() {
  const [settings, setSettings] = useState<any>({
    autoCreateBolForNewShipment: true,
    autoCreateDraftBolForNewContainer: true,
    autoCreateBolDuringImport: true,
    bolPrefix: "SKY-BOL",
    sequenceFormat: "YYYY-NNNNNN",
    defaultBolStatus: "DRAFT",
    requireConsignee: false,
    requireShipper: false,
    requireDestination: false,
    duplicateDetection: true
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load from API in real implementation
    const stored = window.localStorage.getItem("sky-bol-automation-settings")
    if (stored) {
      try { setSettings(JSON.parse(stored)) } catch (e) {}
    }
  }, [])

  const handleChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      window.localStorage.setItem("sky-bol-automation-settings", JSON.stringify(settings))
      toast.success("Automation Settings Saved")
    } catch (e) {
      toast.error("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            BOL Automation Rules
          </h2>
          <p className="text-slate-500 text-sm mt-1">Configure automatic BOL creation for shipments, containers, and historical imports.</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Save className="h-4 w-4" /> Save Rules
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automatic Creation</CardTitle>
            <CardDescription>Triggers that automatically generate new BOL records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Create BOL for New Shipment</Label>
                <div className="text-xs text-slate-500">Generate BOL when saving a new quick shipment</div>
              </div>
              <Switch checked={settings.autoCreateBolForNewShipment} onCheckedChange={v => handleChange('autoCreateBolForNewShipment', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Create Draft for New Container</Label>
                <div className="text-xs text-slate-500">If container is added without a BOL</div>
              </div>
              <Switch checked={settings.autoCreateDraftBolForNewContainer} onCheckedChange={v => handleChange('autoCreateDraftBolForNewContainer', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Create During Import</Label>
                <div className="text-xs text-slate-500">Run bulk generation during JSON/Excel import</div>
              </div>
              <Switch checked={settings.autoCreateBolDuringImport} onCheckedChange={v => handleChange('autoCreateBolDuringImport', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-blue-600" />
              Duplicate Prevention
            </CardTitle>
            <CardDescription>Safety checks to prevent duplicate records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SHA-256 Fingerprint Detection</Label>
                <div className="text-xs text-slate-500">Prevent duplicating identical imported rows</div>
              </div>
              <Switch checked={settings.duplicateDetection} onCheckedChange={v => handleChange('duplicateDetection', v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Internal Number Formatting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Internal BOL Prefix</Label>
                <Input value={settings.bolPrefix} onChange={e => handleChange('bolPrefix', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sequence Format</Label>
                <Input value={settings.sequenceFormat} onChange={e => handleChange('sequenceFormat', e.target.value)} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
