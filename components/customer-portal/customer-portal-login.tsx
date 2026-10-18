"use client"

import { useState } from "react"
import Image from "next/image"
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { CustomerPortalSession } from "@/lib/types/customer-portal"

interface CustomerPortalLoginProps {
  onLoginSuccess: (session: CustomerPortalSession, token: string) => void
  onAdminBack?: () => void
}

export function CustomerPortalLogin({ onLoginSuccess, onAdminBack }: CustomerPortalLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError("Please enter your username and password.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Authentication failed. Please check your credentials.")
        setLoading(false)
        return
      }

      onLoginSuccess(data.session, data.token)
    } catch (err: any) {
      setError("Unable to connect to server. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center p-2 shadow-inner">
            <Image src="/logo.png" alt="AQ Companies Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">AQ Companies</span>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
              Customer Portal
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Secure access to your shipments, containers, documents, and account ledger.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="e.g. najeb or info@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm focus-visible:ring-blue-500"
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm focus-visible:ring-blue-500"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md gap-2 mt-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="pt-4 border-t border-slate-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Customer Data Isolation Guaranteed</span>
              </div>

              {onAdminBack && (
                <button
                  type="button"
                  onClick={onAdminBack}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer block mx-auto pt-1 underline"
                >
                  Return to Admin Workspace
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
