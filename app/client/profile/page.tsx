"use client"
import React, { useState, useEffect } from "react"
import { User, Building2, Lock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react"

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwdMsg, setPwdMsg] = useState("")
  const [pwdErr, setPwdErr] = useState("")
  const [submittingPwd, setSubmittingPwd] = useState(false)

  // Contact details form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [contactMsg, setContactMsg] = useState("")
  const [contactErr, setContactErr] = useState("")
  const [submittingContact, setSubmittingContact] = useState(false)

  useEffect(() => {
    fetch("/api/client/profile")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success && data.user) {
          setProfile(data.user)
          setName(data.user.name || "")
          setEmail(data.user.email || "")
          setPhone(data.user.phone || "")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdErr("")
    setPwdMsg("")

    if (newPassword.length < 8) {
      setPwdErr("New password must be at least 8 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdErr("New password and confirmation do not match.")
      return
    }

    setSubmittingPwd(true)
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPwdMsg("Password updated successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPwdErr(data.error || "Failed to update password.")
      }
    } catch (err: any) {
      setPwdErr("Network error. Please try again.")
    } finally {
      setSubmittingPwd(false)
    }
  }

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactErr("")
    setContactMsg("")
    setSubmittingContact(true)

    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setContactMsg("Contact details updated successfully!")
        if (data.user) setProfile(data.user)
      } else {
        setContactErr(data.error || "Failed to update contact details.")
      }
    } catch (err: any) {
      setContactErr("Network error. Please try again.")
    } finally {
      setSubmittingContact(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading company profile...</p>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Company & Account Profile</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">
          Manage your portal access credentials and verified business contact points.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xl shadow-md">
            {profile.companyName ? profile.companyName.charAt(0).toUpperCase() : "C"}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{profile.companyName}</h2>
            <div className="text-xs text-slate-400 font-medium">Username: @{profile.username}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Role: {profile.role}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Status: {profile.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
          <div className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Permission Entitlements</div>
          <div className="text-slate-300">Tracking: <strong className="text-emerald-400">Granted</strong></div>
          <div className="text-slate-300">Financials: <strong className={profile.permissions?.can_view_financials ? "text-emerald-400" : "text-red-400"}>{profile.permissions?.can_view_financials ? "Authorized" : "Restricted"}</strong></div>
          <div className="text-slate-300">Documents: <strong className={profile.permissions?.can_view_documents ? "text-emerald-400" : "text-red-400"}>{profile.permissions?.can_view_documents ? "Authorized" : "Restricted"}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-black text-base text-white">
            <User className="w-4 h-4 text-blue-400" />
            <h3>Contact Information</h3>
          </div>

          {contactMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{contactMsg}</span>
            </div>
          )}

          {contactErr && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {contactErr}
            </div>
          )}

          <form onSubmit={handleContactUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">Authorized Contact Person</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">WhatsApp / Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingContact}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {submittingContact ? "Updating..." : "Save Contact Details"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-black text-base text-white">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3>Change Access Password</h3>
          </div>

          {pwdMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pwdMsg}</span>
            </div>
          )}

          {pwdErr && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {pwdErr}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">Current Password *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">New Password (Min 8 Characters) *</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-black text-slate-400 uppercase mb-1.5">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingPwd}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {submittingPwd ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
