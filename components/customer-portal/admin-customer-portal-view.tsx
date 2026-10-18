"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Shield,
  Eye,
  Plus,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Lock,
  MessageSquare,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { CustomerPortalPermissions } from "@/lib/types/customer-portal"
import { DEFAULT_PORTAL_PERMISSIONS } from "@/lib/types/customer-portal"

interface AdminCustomerPortalViewProps {
  onPreviewCustomer: (customerId: string) => void
}

export function AdminCustomerPortalView({ onPreviewCustomer }: AdminCustomerPortalViewProps) {
  const [customers, setCustomers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"customers" | "requests">("customers")

  // Create Account Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCust, setSelectedCust] = useState<any | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("customer_admin")

  // Permissions Modal
  const [isPermsOpen, setIsPermsOpen] = useState(false)
  const [permsTargetUser, setPermsTargetUser] = useState<any | null>(null)
  const [permissions, setPermissions] = useState<CustomerPortalPermissions>(DEFAULT_PORTAL_PERMISSIONS)

  // Reply Modal
  const [replyTarget, setReplyTarget] = useState<any | null>(null)
  const [replyText, setReplyText] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/portal/admin/customers")
      if (res.ok) {
        const body = await res.json()
        if (Array.isArray(body.customers)) {
          setCustomers(body.customers)
        }
      }

      // Fetch requests
      const reqRes = await fetch("/api/portal/requests")
      if (reqRes.ok) {
        const rBody = await reqRes.json()
        if (Array.isArray(rBody.requests)) {
          setRequests(rBody.requests)
        }
      }
    } catch (err) {
      toast.error("Failed to load customer portal data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCust || !username || !password) return

    try {
      const res = await fetch("/api/portal/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_account",
          customerId: selectedCust.customerId,
          customerName: selectedCust.customerName,
          username,
          email,
          password,
          role,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Portal account created for ${selectedCust.customerName}`)
        setIsCreateOpen(false)
        setUsername("")
        setPassword("")
        setEmail("")
        loadData()
      } else {
        toast.error(data.error || "Failed to create account")
      }
    } catch {
      toast.error("Connection error")
    }
  }

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === "active" ? "disabled" : "active"
    try {
      const res = await fetch("/api/portal/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          userId: user.id,
          status: nextStatus,
        }),
      })

      if (res.ok) {
        toast.success(`Account status changed to ${nextStatus}`)
        loadData()
      }
    } catch {
      toast.error("Status change failed")
    }
  }

  const handleSavePermissions = async () => {
    if (!permsTargetUser) return
    try {
      const res = await fetch("/api/portal/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_permissions",
          userId: permsTargetUser.id,
          permissions,
        }),
      })

      if (res.ok) {
        toast.success("Permissions updated successfully")
        setIsPermsOpen(false)
        loadData()
      }
    } catch {
      toast.error("Failed to update permissions")
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-[1780px] mx-auto p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Administrative Control Center
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Customer Portal Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage customer accounts, grant granular visibility permissions, and audit client sessions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "customers"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Portal Accounts ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "requests"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Client Requests ({requests.length})
          </button>
        </div>
      </div>

      {activeTab === "customers" ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Filter customer accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl"
            />
          </div>

          {/* Customers Table */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Customer / Company</th>
                    <th className="p-3.5">Portal Status</th>
                    <th className="p-3.5">Linked Users</th>
                    <th className="p-3.5">Active Shipments</th>
                    <th className="p-3.5">Total BOLs</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((c) => {
                    const primaryUser = c.users[0]
                    return (
                      <tr key={c.customerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div>{c.customerName}</div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{c.customerId}</span>
                        </td>
                        <td className="p-3.5">
                          {c.hasPortalAccess ? (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                                primaryUser?.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                                  : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800"
                              }`}
                            >
                              {primaryUser?.status || "Disabled"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Not Configured</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">
                          {c.usersCount > 0 ? (
                            <div className="space-y-0.5">
                              {c.users.map((u: any) => (
                                <span key={u.id} className="font-mono text-[11px] block text-blue-600 dark:text-blue-400">
                                  {u.username} ({u.role.replace("_", " ")})
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">{c.activeShipments}</td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{c.linkedBolCount}</td>
                        <td className="p-3.5 text-slate-500">
                          {primaryUser?.lastLogin ? new Date(primaryUser.lastLogin).toLocaleDateString() : "Never"}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          {c.hasPortalAccess ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPreviewCustomer(c.customerId)}
                                className="h-7 text-xs gap-1 cursor-pointer"
                                title="View live portal as this customer"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-500" />
                                <span>Preview</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPermsTargetUser(primaryUser)
                                  setPermissions(primaryUser.permissions || DEFAULT_PORTAL_PERMISSIONS)
                                  setIsPermsOpen(true)
                                }}
                                className="h-7 text-xs gap-1 cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5 text-blue-500" />
                                <span>Permissions</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleStatus(primaryUser)}
                                className={`h-7 text-xs cursor-pointer ${
                                  primaryUser.status === "active"
                                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                }`}
                              >
                                {primaryUser.status === "active" ? "Disable" : "Enable"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCust(c)
                                setUsername(c.customerName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 12))
                                setIsCreateOpen(true)
                              }}
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Enable Portal</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Requests Inbox */
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">BOL</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No customer requests in inbox.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold">{r.customerName}</td>
                      <td className="p-3.5 capitalize">{r.requestType}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{r.subject}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{r.message}</p>
                      </td>
                      <td className="p-3.5 font-mono text-blue-500">{r.bolNumber || "-"}</td>
                      <td className="p-3.5 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 uppercase">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Enable Portal Account Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Portal Access for {selectedCust?.customerName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="portal username"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Initial Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="secure password"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address (Optional)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Granular Permissions Dialog */}
      <Dialog open={isPermsOpen} onOpenChange={setIsPermsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Granular Permissions: {permsTargetUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2.5 py-3 text-xs max-h-96 overflow-y-auto">
            {Object.keys(DEFAULT_PORTAL_PERMISSIONS).map((key) => {
              const k = key as keyof CustomerPortalPermissions
              return (
                <label
                  key={k}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={permissions[k]}
                    onChange={(e) => setPermissions((prev) => ({ ...prev, [k]: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} className="bg-blue-600 hover:bg-blue-500 text-white">
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
