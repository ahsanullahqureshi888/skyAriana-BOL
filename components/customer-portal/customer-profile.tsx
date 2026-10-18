"use client"

import { useState } from "react"
import { User, Lock, Building, Mail, Phone, Globe, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { CustomerPortalSession } from "@/lib/types/customer-portal"

interface CustomerProfileProps {
  session: CustomerPortalSession
  currentLanguage: "en" | "fa" | "ps"
  onChangeLanguage: (lang: "en" | "fa" | "ps") => void
}

export function CustomerProfileView({
  session,
  currentLanguage,
  onChangeLanguage,
}: CustomerProfileProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Please enter your current and new password." })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/portal/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Password changed successfully." })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage({ type: "error", text: data.error || "Password change failed." })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          <span>My Profile & Security</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Account details and access security for <strong>{session.customerName}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company & Profile Info */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building className="w-4 h-4 text-blue-400" />
            <span>Company Account Details</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Company Name</span>
              <span className="font-bold text-slate-200 text-sm">{session.customerName}</span>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Portal Username</span>
              <span className="font-mono text-slate-300 font-semibold">{session.username}</span>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Portal Access Role</span>
              <span className="capitalize font-bold text-blue-400">{session.role.replace("_", " ")}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Preferred Language</span>
              <div className="flex items-center gap-2">
                {[
                  { id: "en", label: "English" },
                  { id: "fa", label: "دری / فارسی" },
                  { id: "ps", label: "پښتو" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onChangeLanguage(l.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      currentLanguage === l.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Update Password</span>
          </h3>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/60 border border-red-800/60 text-red-300"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Current Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-slate-950/70 border-slate-700 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">New Password</label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-950/70 border-slate-700 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-950/70 border-slate-700 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 rounded-xl mt-2 cursor-pointer"
            >
              {loading ? "Updating..." : "Save New Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
