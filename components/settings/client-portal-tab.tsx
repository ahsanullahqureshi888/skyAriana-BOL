"use client"
import React, { useState, useEffect } from "react"
import { 
  Users, 
  UserPlus, 
  Building2, 
  ShieldCheck, 
  Mail, 
  Lock, 
  CheckCircle2, 
  Clock, 
  X, 
  CreditCard, 
  FileText, 
  Trash2, 
  Eye, 
  AlertCircle 
} from "lucide-react"

export function ClientPortalTab() {
  const [activeTab, setActiveTab] = useState<"USERS" | "PROOFS">("USERS")
  const [users, setUsers] = useState<any[]>([])
  const [proofs, setProofs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Invite modal
  const [modalOpen, setModalOpen] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("CUSTOMER_ADMIN")
  const [canFinancials, setCanFinancials] = useState(true)
  const [canDocs, setCanDocs] = useState(true)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [userMsg, setUserMsg] = useState("")
  const [userErr, setUserErr] = useState("")

  // Proof review modal
  const [selectedProof, setSelectedProof] = useState<any | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [uRes, pRes] = await Promise.all([
        fetch("/api/admin/client-portal/users").then(r => r.json()),
        fetch("/api/admin/client-portal/proofs").then(r => r.json()),
      ])
      if (uRes.success) setUsers(uRes.users || [])
      if (pRes.success) setProofs(pRes.proofs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserErr("")
    setUserMsg("")
    setSubmittingUser(true)

    try {
      const res = await fetch("/api/admin/client-portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          companyName: companyName || companyId,
          username,
          password,
          email,
          name,
          phone,
          role,
          permissions: {
            can_view_tracking: true,
            can_view_financials: canFinancials,
            can_view_documents: canDocs,
            can_upload_payment_proof: true,
            can_export_reports: true,
          }
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setUserMsg("Client user created successfully!")
        setModalOpen(false)
        setUsername("")
        setPassword("")
        setCompanyId("")
        setCompanyName("")
        setEmail("")
        setName("")
        setPhone("")
        fetchData()
      } else {
        setUserErr(data.error || "Failed to create user.")
      }
    } catch (err: any) {
      setUserErr("Network error. Please try again.")
    } finally {
      setSubmittingUser(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this client user's access?")) return
    try {
      await fetch(`/api/admin/client-portal/users?id=${id}`, { method: "DELETE" })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleReviewProof = async (id: string, status: "APPROVED" | "REJECTED") => {
    setSubmittingReview(true)
    try {
      const res = await fetch("/api/admin/client-portal/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          reviewerName: "Admin Staff",
          reviewNotes,
        })
      })
      if (res.ok) {
        setSelectedProof(null)
        setReviewNotes("")
        fetchData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingReview(false)
    }
  }

  const pendingProofsCount = proofs.filter(p => p.status === "SUBMITTED").length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Tab Navigation & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Client Portal Administration</h3>
              <p className="text-xs text-slate-500 font-bold">Manage external customer logins, BOL permissions, and audit payment receipts.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setModalOpen(true); setUserErr(""); setUserMsg(""); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-blue-700/20"
            >
              <UserPlus className="w-4 h-4" />
              Create Client User
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("USERS")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "USERS" 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Authorized Client Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("PROOFS")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "PROOFS" 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Payment Proof Audits
            {pendingProofsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {pendingProofsCount} Pending
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Client Users */}
        {activeTab === "USERS" && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Company Name</th>
                    <th className="px-5 py-3.5">Username</th>
                    <th className="px-5 py-3.5">Contact Details</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Financials</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {u.companyName || u.customerId}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-400 font-bold">
                        @{u.username}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <div>{u.name || "—"}</div>
                        <div className="text-[10px] text-slate-400">{u.email || u.phone || ""}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold">
                        {u.permissions?.can_view_financials ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Allowed</span>
                        ) : (
                          <span className="text-red-500">Hidden</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Revoke User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-bold">
                        No client user accounts created yet. Click "Create Client User" above to onboard a customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200">
                <strong>Strict Tenant Isolation Guard:</strong> Client users are verified against company records. All internal supplier expenses, driver vehicle rents, internal remarks, and draft unapproved documents are automatically filtered from the client portal API responses.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Payment Proofs */}
        {activeTab === "PROOFS" && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Submission Date</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Reference / Slip</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {proofs.map(p => {
                    const isPending = p.status === "SUBMITTED"
                    const isApproved = p.status === "APPROVED"
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{p.companyName}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.currency} {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {p.reference || "N/A"}
                          {p.fileName && <span className="block text-[10px] text-slate-400">📎 {p.fileName}</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isApproved 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                              : isPending 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => { setSelectedProof(p); setReviewNotes(p.reviewNotes || ""); }}
                            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-800"
                          >
                            Inspect & Audit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {proofs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-bold">
                        No payment proofs submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Customer Onboarding</div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Create Client Portal Account</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userErr && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{userErr}</div>}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company ID / Name *</label>
                  <input
                    type="text"
                    value={companyId}
                    onChange={e => { setCompanyId(e.target.value); setCompanyName(e.target.value); }}
                    placeholder="e.g. Al-Madina Trading"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. almadina"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Haji Ahmad"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-black text-slate-700 dark:text-slate-300 text-[11px] uppercase">Access Entitlements</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canFinancials}
                    onChange={e => setCanFinancials(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Allow viewing Invoices & Ledger</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDocs}
                    onChange={e => setCanDocs(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Allow downloading Released Documents</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 bg-blue-700 text-white font-black rounded-xl hover:bg-blue-800 disabled:opacity-50"
                >
                  {submittingUser ? "Creating..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Inspection Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Accounting Verification</div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Audit Payment Slip</h2>
              </div>
              <button onClick={() => setSelectedProof(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Company:</span> <strong className="text-slate-900 dark:text-white">{selectedProof.companyName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Amount:</span> <strong className="text-emerald-600 font-mono text-sm">{selectedProof.currency} {selectedProof.amount.toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Reference:</span> <strong className="text-slate-900 dark:text-white font-mono">{selectedProof.reference || "N/A"}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Status:</span> <strong className="uppercase">{selectedProof.status}</strong></div>
              {selectedProof.note && <div className="pt-1 text-slate-600 dark:text-slate-300">Note: {selectedProof.note}</div>}
            </div>

            {selectedProof.fileDataUrl && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-2 bg-slate-50 dark:bg-slate-800 text-center">
                <img src={selectedProof.fileDataUrl} alt="Bank Slip" className="max-h-60 mx-auto rounded-xl object-contain" />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Notes / Ledger Posting Remarks</label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Internal verification notes..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewProof(selectedProof.id, "REJECTED")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                >
                  Reject Proof
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewProof(selectedProof.id, "APPROVED")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Approve & Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
