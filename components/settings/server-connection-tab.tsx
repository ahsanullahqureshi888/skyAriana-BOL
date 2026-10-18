"use client"

import React, { useState, useEffect } from "react"
import {
  Server,
  Laptop,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Activity,
  Layers,
  HardDrive,
  Database,
  Radio,
  Sliders,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"

interface NetworkConfig {
  mode: "local" | "server"
  serverHost: string
  serverPort: number
  useSsl: boolean
  customUrl?: string
}

interface ServerInfo {
  server_name: string
  version: string
  minimum_client_version: string
  connection_mode: string
  database_type: string
  maintenance_mode: boolean
  uptime_seconds: number
  server_time: string
}

export function ServerConnectionTab() {
  const [mode, setMode] = useState<"local" | "server">("local")
  const [serverHost, setServerHost] = useState("192.168.1.100")
  const [serverPort, setServerPort] = useState(8000)
  const [useSsl, setUseSsl] = useState(false)
  const [customUrl, setCustomUrl] = useState("")

  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    latencyMs?: number
    serverInfo?: ServerInfo
    error?: string
  } | null>(null)

  const [activeStatus, setActiveStatus] = useState<string>("LOCAL_READY")
  const [isDesktop, setIsDesktop] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load initial settings
  useEffect(() => {
    const desktopAvailable = typeof window !== "undefined" && Boolean((window as any).skyDesktop?.getNetworkConfig)
    setIsDesktop(desktopAvailable)

    if (desktopAvailable) {
      void (window as any).skyDesktop.getNetworkConfig().then((cfg: NetworkConfig) => {
        if (cfg) {
          setMode(cfg.mode || "local")
          if (cfg.serverHost) setServerHost(cfg.serverHost)
          if (cfg.serverPort) setServerPort(cfg.serverPort)
          setUseSsl(Boolean(cfg.useSsl))
          if (cfg.customUrl) setCustomUrl(cfg.customUrl)
        }
      })

      void (window as any).skyDesktop.getNetworkStatus().then((status: any) => {
        if (status?.state) setActiveStatus(status.state)
      })
    } else if (typeof window !== "undefined") {
      const savedMode = (localStorage.getItem("sky_connection_mode") as "local" | "server") || "local"
      const savedHost = localStorage.getItem("sky_server_host") || "192.168.1.100"
      const savedPort = parseInt(localStorage.getItem("sky_server_port") || "8000", 10)
      const savedSsl = localStorage.getItem("sky_server_ssl") === "true"
      const savedUrl = localStorage.getItem("sky_server_custom_url") || ""

      setMode(savedMode)
      setServerHost(savedHost)
      setServerPort(savedPort)
      setUseSsl(savedSsl)
      setCustomUrl(savedUrl)
    }
  }, [])

  const buildTargetUrl = () => {
    if (customUrl.trim().length > 0) {
      return customUrl.trim().replace(/\/+$/, "")
    }
    const proto = useSsl ? "https" : "http"
    return `${proto}://${serverHost.trim()}:${serverPort}`
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const targetUrl = buildTargetUrl()

    try {
      if (isDesktop && (window as any).skyDesktop?.testServerConnection) {
        const res = await (window as any).skyDesktop.testServerConnection(targetUrl)
        setTestResult(res)
      } else {
        const start = Date.now()
        const res = await fetch(`${targetUrl}/api/v1/system/server-status`, {
          signal: AbortSignal.timeout(5000),
        })
        const latencyMs = Date.now() - start
        if (res.ok) {
          const info = await res.json()
          setTestResult({ success: true, latencyMs, serverInfo: info })
        } else {
          setTestResult({
            success: false,
            latencyMs,
            error: `Server responded with HTTP ${res.status}: ${res.statusText}`,
          })
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Failed to reach server. Please check IP address, port, and firewall rules.",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveAndApply = async () => {
    setSaving(true)
    setSaveSuccess(false)
    const targetUrl = buildTargetUrl()

    const configPayload: Partial<NetworkConfig> = {
      mode,
      serverHost,
      serverPort,
      useSsl,
      customUrl: customUrl.trim() || undefined,
    }

    try {
      if (isDesktop && (window as any).skyDesktop?.switchNetworkMode) {
        const newStatus = await (window as any).skyDesktop.switchNetworkMode(mode, configPayload)
        if (newStatus?.state) setActiveStatus(newStatus.state)
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("sky_connection_mode", mode)
        localStorage.setItem("sky_server_host", serverHost)
        localStorage.setItem("sky_server_port", String(serverPort))
        localStorage.setItem("sky_server_ssl", String(useSsl))
        localStorage.setItem("sky_server_custom_url", customUrl)
        localStorage.setItem("sky_backend_api_url", mode === "server" ? targetUrl : "http://127.0.0.1:8000")
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      alert(`Failed to apply configuration: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl border border-blue-900/50 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/20">
                <Radio className="h-5 w-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Multi-PC Office Networking & Central Server</h2>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 font-mono text-xs">
                Phase 7 Architecture
              </Badge>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Configure whether this workstation operates as an independent offline PC or connects securely over the office LAN to the central AQ COMPANIES server and PostgreSQL database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Status</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    mode === "local"
                      ? "bg-blue-400 animate-pulse"
                      : activeStatus === "SERVER_READY"
                      ? "bg-emerald-400"
                      : activeStatus === "OFFLINE"
                      ? "bg-rose-400"
                      : "bg-amber-400 animate-spin"
                  }`}
                />
                <span className="text-xs font-bold text-white font-mono">
                  {mode === "local" ? "LOCAL OFFLINE" : activeStatus.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: Local Offline */}
        <div
          onClick={() => setMode("local")}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 ${
            mode === "local"
              ? "bg-blue-50/60 border-blue-600 shadow-md ring-2 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${mode === "local" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Local Offline Mode</h3>
                <p className="text-xs text-slate-500">Standalone Single PC</p>
              </div>
            </div>
            {mode === "local" && (
              <Badge className="bg-blue-600 text-white flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            All data is saved locally on this machine using the embedded SQLite engine. Ideal for portable laptops, single-PC offices, or fieldwork without internet or network connections.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <HardDrive className="h-3.5 w-3.5 text-blue-600" /> Embedded SQLite
            </span>
            <span>• Zero network latency</span>
            <span>• 100% Offline</span>
          </div>
        </div>

        {/* Mode 2: Central Office Server */}
        <div
          onClick={() => setMode("server")}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 ${
            mode === "server"
              ? "bg-emerald-50/60 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${mode === "server" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Central Server Mode</h3>
                <p className="text-xs text-slate-500">Multi-PC Office Network</p>
              </div>
            </div>
            {mode === "server" && (
              <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            Connects over the office LAN to the central server and PostgreSQL database. Multiple workstations collaborate seamlessly with live updates, automatic sequential numbers, and conflict protection.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Database className="h-3.5 w-3.5 text-emerald-600" /> PostgreSQL Ready
            </span>
            <span>• Concurrency Safe</span>
            <span>• Multi-PC LAN</span>
          </div>
        </div>
      </div>

      {/* Server Configuration Parameters (Visible or editable when Server Mode is active) */}
      <Card className={`border shadow-sm transition-all ${mode === "server" ? "border-emerald-200 ring-1 ring-emerald-500/10" : "border-slate-200 opacity-60"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-600" />
                Central Server Connection Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Specify the IP address or host name of the computer hosting the AQ COMPANIES server.
              </CardDescription>
            </div>
            {mode === "server" && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[11px]">
                Active Target
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Server Host / IP Address</Label>
              <Input
                placeholder="192.168.1.100 or server.office.local"
                value={serverHost}
                onChange={(e) => setServerHost(e.target.value)}
                disabled={mode !== "server"}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-slate-500">Enter the local LAN IP address of your main office server.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Port</Label>
              <Input
                type="number"
                placeholder="8000"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value, 10) || 8000)}
                disabled={mode !== "server"}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-slate-500">Default API port is 8000.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSsl}
                onChange={(e) => setUseSsl(e.target.checked)}
                disabled={mode !== "server"}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Use HTTPS / SSL Encryption
            </label>
          </div>

          {/* Test & Action Controls */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || mode !== "server"}
                className="border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5 text-blue-600" />
                    Testing Handshake...
                  </>
                ) : (
                  <>
                    <Wifi className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Test Connection
                  </>
                )}
              </Button>

              <span className="text-xs text-slate-500 font-mono">
                Target: {buildTargetUrl()}
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAndApply}
              disabled={saving}
              className={`${
                mode === "server" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
              } text-white font-bold shadow-sm px-5`}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Applying Configuration...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Configuration Saved!
                </>
              ) : (
                "Save & Apply Connection Mode"
              )}
            </Button>
          </div>

          {/* Test Feedback Result */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border mt-3 transition-all ${
                testResult.success
                  ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">
                      {testResult.success
                        ? "Connection Successful — Server Verified Ready"
                        : "Connection Failed"}
                    </h4>
                    {testResult.latencyMs !== undefined && (
                      <Badge className="bg-emerald-600/90 text-white font-mono text-xs">
                        {testResult.latencyMs} ms latency
                      </Badge>
                    )}
                  </div>
                  {testResult.success && testResult.serverInfo ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="bg-white/70 p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Server Name</span>
                        <span className="font-bold text-slate-900">{testResult.serverInfo.server_name}</span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Backend Engine</span>
                        <span className="font-bold text-slate-900 capitalize">{testResult.serverInfo.database_type}</span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Server Version</span>
                        <span className="font-bold text-slate-900">v{testResult.serverInfo.version}</span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Maintenance</span>
                        <span className="font-bold text-slate-900">
                          {testResult.serverInfo.maintenance_mode ? "Enabled" : "Normal Operations"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-700 leading-relaxed font-mono">
                      {testResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Architectural Safety Guarantees Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Data Safety & Office Network Invariance Rules
        </div>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 leading-relaxed">
          <li>
            <strong>Zero Network Share SQLite Corruption:</strong> The SQLite database is never placed in shared Windows SMB network folders, OneDrive, Dropbox, or Google Drive sync directories.
          </li>
          <li>
            <strong>API-Driven Multi-Client Architecture:</strong> Workstations communicate strictly over HTTP/REST API with the Central Server. Clients do not hold raw database locks.
          </li>
          <li>
            <strong>Optimistic Concurrency Protection:</strong> Edits to BOLs, Invoices, and Ledgers are validated by revision version numbers. If another staff member updates a record simultaneously, conflict protection preserves your draft.
          </li>
          <li>
            <strong>Accounting Invariance:</strong> Debits and Credits are verified mathematically across both SQLite and PostgreSQL (<code className="font-mono text-slate-700">Net Balance = Debit - Credit</code>).
          </li>
        </ul>
      </div>
    </div>
  )
}
