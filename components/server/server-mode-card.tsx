"use client"

import React, { useEffect, useState } from "react"
import {
  Server,
  Laptop,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  Shield,
  KeyRound,
  Download,
  Upload,
  AlertTriangle,
  HardDrive,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient, type ServerConnectionState } from "@/lib/client/api-client"
import { offlineQueue } from "@/lib/client/offline-queue"

export function ServerModeCard() {
  const [mode, setMode] = useState<"server" | "client">("server")
  const [loading, setLoading] = useState(false)
  const [statusData, setStatusData] = useState<any>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Server PC state
  const [pairingRole, setPairingRole] = useState("accounting")
  const [generatedCode, setGeneratedCode] = useState<any>(null)
  const [adminSetupOpen, setAdminSetupOpen] = useState(false)
  const [adminUsername, setAdminUsername] = useState("admin")
  const [adminPassword, setAdminPassword] = useState("")
  const [devices, setDevices] = useState<any[]>([])
  const [backups, setBackups] = useState<any[]>([])

  // Client PC state
  const [clientServerUrl, setClientServerUrl] = useState("")
  const [clientDeviceName, setClientDeviceName] = useState("")
  const [clientPairingCode, setClientPairingCode] = useState("")
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null)
  const [clientState, setClientState] = useState<ServerConnectionState>(apiClient.getState())
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0)

  // Load configuration & status
  const refreshStatus = async () => {
    try {
      const res = await fetch("/api/server/status")
      const data = await res.json()
      if (data.success) {
        setStatusData(data)
        setMode(data.mode || "server")
      }
    } catch {
      // Ignored
    }
  }

  const loadDevices = async () => {
    try {
      const activeToken = typeof window !== "undefined" ? localStorage.getItem("sky_server_token") : null
      if (!activeToken) return
      const res = await fetch("/api/server/devices", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
      const data = await res.json()
      if (data.success) setDevices(data.devices || [])
    } catch {}
  }

  const loadBackups = async () => {
    try {
      const activeToken = typeof window !== "undefined" ? localStorage.getItem("sky_server_token") : null
      if (!activeToken) return
      const res = await fetch("/api/server/backups", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
      const data = await res.json()
      if (data.success) setBackups(data.backups || [])
    } catch {}
  }

  useEffect(() => {
    void refreshStatus()
    void loadDevices()
    void loadBackups()

    const unsubClient = apiClient.subscribe(setClientState)
    const unsubQueue = offlineQueue.subscribe((q) => setPendingQueueCount(q.length))

    if (typeof window !== "undefined") {
      setClientServerUrl(localStorage.getItem("sky_server_url") || "")
      setClientDeviceName(localStorage.getItem("sky_device_name") || "Office PC")
    }

    return () => {
      unsubClient()
      unsubQueue()
    }
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Mode switch
  const handleModeSwitch = async (newMode: "server" | "client") => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/server/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      })
      const data = await res.json()
      if (data.success) {
        setMode(newMode)
        setSuccessMsg(`Switched to ${newMode === "server" ? "Main Server PC" : "Client PC"} mode.`)
        await refreshStatus()
      } else {
        setErrorMsg(data.error || "Failed to switch mode")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to switch mode")
    } finally {
      setLoading(false)
    }
  }

  // Server Admin Setup
  const handleAdminSetup = async () => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/server/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg("Administrator account configured successfully.")
        setAdminSetupOpen(false)
        await refreshStatus()
      } else {
        setErrorMsg(data.error || "Failed to setup admin")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Admin setup error")
    } finally {
      setLoading(false)
    }
  }

  // Generate Pairing Code
  const handleGeneratePairingCode = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/server/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", role: pairingRole }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedCode(data)
      } else {
        setErrorMsg(data.error || "Failed to generate pairing code")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate pairing code")
    } finally {
      setLoading(false)
    }
  }

  // Device Revoke/Block
  const handleDeviceAction = async (deviceId: string, action: "revoke" | "block" | "unrevoke" | "delete") => {
    try {
      const res = await fetch("/api/server/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, deviceId }),
      })
      const data = await res.json()
      if (data.success) {
        await loadDevices()
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Device action failed")
    }
  }

  // Create Backup
  const handleCreateBackup = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/server/backups", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(`Backup created: ${data.backup.filename}`)
        await loadBackups()
      } else {
        setErrorMsg(data.error || "Backup failed")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Backup failed")
    } finally {
      setLoading(false)
    }
  }

  // Restore Backup
  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore ${filename}? A pre-restore snapshot will be created automatically.`)) {
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/server/backups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(`Database restored successfully from ${filename}`)
        await refreshStatus()
      } else {
        setErrorMsg(data.error || "Restore failed")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Restore failed")
    } finally {
      setLoading(false)
    }
  }

  // Migrate Data
  const handleMigrateData = async () => {
    if (!window.confirm("Migrate existing local records into the server database? A backup will be preserved automatically.")) {
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/server/migrate", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(`Migration complete! Migrated: ${data.counts.bols} BOLs, ${data.counts.invoices} invoices, ${data.counts.ledgerAccounts} ledger accounts.`)
        await refreshStatus()
      } else {
        setErrorMsg(data.error || "Migration failed")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Migration failed")
    } finally {
      setLoading(false)
    }
  }

  // Client Test Connection
  const handleTestClientConnection = async () => {
    if (!clientServerUrl) return
    setLoading(true)
    setTestResult(null)
    try {
      const result = await apiClient.testServerUrl(clientServerUrl)
      setTestResult(result)
    } finally {
      setLoading(false)
    }
  }

  // Client Pair
  const handleClientPair = async () => {
    if (!clientServerUrl || !clientPairingCode || !clientDeviceName) {
      setErrorMsg("Please fill in Server URL, Device Name, and Pairing Code.")
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      localStorage.setItem("sky_device_name", clientDeviceName)
      await apiClient.pair(clientServerUrl, clientPairingCode, clientDeviceName)
      setSuccessMsg("Paired successfully with Main Server PC!")
      await apiClient.checkConnection()
    } catch (err: any) {
      setErrorMsg(err.message || "Pairing failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                Office LAN Server & Client Architecture
              </CardTitle>
              <CardDescription>
                Run one Main PC as the central server and connect other PCs securely over the local network.
              </CardDescription>
            </div>
            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => handleModeSwitch("server")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "server" ? "bg-white shadow text-blue-700 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Server className="inline-block h-3.5 w-3.5 mr-1.5" />
                Main Server PC
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("client")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "client" ? "bg-white shadow text-blue-700 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Laptop className="inline-block h-3.5 w-3.5 mr-1.5" />
                Client PC
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SERVER PC VIEW */}
      {mode === "server" && (
        <div className="space-y-6">
          {/* Server Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 font-medium">Server Address (Local LAN)</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {statusData?.serverUrl || "http://127.0.0.1:8000"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => copyToClipboard(statusData?.serverUrl || "http://127.0.0.1:8000", "serverUrl")}
                  >
                    {copied === "serverUrl" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Provide this address to Client PCs</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 font-medium">Central Data Directory</div>
                <div className="mt-1 font-mono text-xs font-semibold text-slate-800 truncate" title="C:\ProgramData\SkyArianaBOL\">
                  C:\ProgramData\SkyArianaBOL\
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" /> No Windows file share needed
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 font-medium">Connected Devices</div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {devices.length} Registered
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {devices.filter((d) => !d.revoked).length} Active trusted sessions
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Initial Admin Setup Prompt if not configured */}
          {!statusData?.adminConfigured && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">Set Up Central Server Administrator</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Protect pairing code generation and database management by configuring an administrator password.
                    </p>
                    {adminSetupOpen ? (
                      <div className="mt-3 flex flex-wrap gap-3 items-end">
                        <div>
                          <Label className="text-xs">Username</Label>
                          <Input
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            className="h-8 text-xs w-36 mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Password (min 8 chars)</Label>
                          <Input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="h-8 text-xs w-48 mt-1 bg-white"
                          />
                        </div>
                        <Button size="sm" onClick={handleAdminSetup} disabled={loading} className="h-8 text-xs">
                          Save Admin Account
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdminSetupOpen(false)} className="h-8 text-xs">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setAdminSetupOpen(true)} className="mt-3 h-8 text-xs">
                        Configure Admin Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pairing Code Generator */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Device Pairing & Access Control
              </CardTitle>
              <CardDescription className="text-xs">
                Generate secure, one-time 15-minute pairing codes for new Client PCs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <Label className="text-xs">Device Role</Label>
                  <select
                    value={pairingRole}
                    onChange={(e) => setPairingRole(e.target.value)}
                    className="h-8 text-xs rounded-md border border-slate-300 bg-white px-2 mt-1 block"
                  >
                    <option value="accounting">Accounting (Ledger & Invoices)</option>
                    <option value="operations">Operations (BOL & Cargo)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
                <div className="pt-5">
                  <Button size="sm" onClick={handleGeneratePairingCode} disabled={loading} className="h-8 text-xs gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Generate Pairing Code
                  </Button>
                </div>
              </div>

              {generatedCode && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs text-blue-700 font-medium">One-Time Pairing Code (Valid for 15 minutes)</div>
                    <div className="font-mono text-xl font-bold tracking-wider text-blue-950 mt-0.5">
                      {generatedCode.code}
                    </div>
                    <div className="text-[11px] text-blue-600 mt-1">
                      Expires: {new Date(generatedCode.expiresAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCode.code, "pairCode")}
                    className="gap-1.5 bg-white"
                  >
                    {copied === "pairCode" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    Copy Code
                  </Button>
                </div>
              )}

              {/* Devices Table */}
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Registered Client Devices
                </div>
                {devices.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-md">
                    No client devices registered yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="p-2.5">Device Name</th>
                          <th className="p-2.5">Role</th>
                          <th className="p-2.5">IP Address</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {devices.map((device) => (
                          <tr key={device.id}>
                            <td className="p-2.5 font-medium text-slate-800">{device.name}</td>
                            <td className="p-2.5 capitalize">
                              <Badge variant="outline" className="text-[10px]">{device.role}</Badge>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">{device.ip}</td>
                            <td className="p-2.5">
                              {device.revoked ? (
                                <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                              ) : device.blocked ? (
                                <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                              ) : (
                                <Badge className="bg-emerald-600 text-[10px]">Trusted</Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-right space-x-1">
                              {!device.revoked ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-rose-600 text-[11px]"
                                  onClick={() => handleDeviceAction(device.id, "revoke")}
                                >
                                  Revoke
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-emerald-600 text-[11px]"
                                  onClick={() => handleDeviceAction(device.id, "unrevoke")}
                                >
                                  Unrevoke
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Central Backups & Migration */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    Server Database Backups & Migration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Local zip archives saved directly to C:\ProgramData\SkyArianaBOL\backups\.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMigrateData}
                    disabled={loading}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    Migrate Existing Local Data
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateBackup}
                    disabled={loading}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Backup Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-md">
                  No server backups created yet. Click "Backup Now" to create your first archive.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {backups.map((b) => (
                    <div
                      key={b.filename}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-medium text-slate-800">{b.filename}</div>
                        <div className="text-[11px] text-slate-500">
                          {Math.round(b.sizeBytes / 1024)} KB • {new Date(b.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreBackup(b.filename)}
                        disabled={loading}
                        className="h-7 text-xs text-amber-700 hover:text-amber-900"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CLIENT PC VIEW */}
      {mode === "client" && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              Connect to Main Sky Ariana Server
            </CardTitle>
            <CardDescription className="text-xs">
              Connect this workstation to the central Sky Ariana Server PC over the local network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Server URL (e.g. http://192.168.1.50:8000)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="http://192.168.1.50:8000"
                    value={clientServerUrl}
                    onChange={(e) => setClientServerUrl(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestClientConnection}
                    disabled={loading || !clientServerUrl}
                    className="h-8 text-xs shrink-0"
                  >
                    Test Ping
                  </Button>
                </div>
                {testResult && (
                  <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${testResult.success ? "text-emerald-600 font-semibold" : "text-rose-600"}`}>
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Server connected ({testResult.latencyMs}ms)
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        {testResult.error || "Connection failed"}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Workstation Name</Label>
                <Input
                  placeholder="e.g. Accounting PC 2"
                  value={clientDeviceName}
                  onChange={(e) => setClientDeviceName(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Pairing Code (Obtain from Main Server PC)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="SKY-XXXX-XXXX"
                  value={clientPairingCode}
                  onChange={(e) => setClientPairingCode(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono uppercase tracking-wider max-w-sm"
                />
                <Button
                  size="sm"
                  onClick={handleClientPair}
                  disabled={loading || !clientPairingCode || !clientServerUrl}
                  className="h-8 text-xs"
                >
                  Pair & Connect
                </Button>
              </div>
            </div>

            {/* Client Status Indicator */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-3 w-3 rounded-full ${
                  clientState.status === "connected" ? "bg-emerald-500" :
                  clientState.status === "reconnecting" ? "bg-amber-500" :
                  "bg-rose-500"
                }`} />
                <div>
                  <div className="text-xs font-semibold capitalize text-slate-800">
                    Status: {clientState.status}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {clientState.latencyMs ? `Latency: ${clientState.latencyMs}ms` : "Offline queue active"}
                    {pendingQueueCount > 0 ? ` • ${pendingQueueCount} pending changes queued` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => apiClient.checkConnection()}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Check Now
                </Button>
                {clientState.status !== "unconfigured" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => apiClient.clearCredentials()}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
