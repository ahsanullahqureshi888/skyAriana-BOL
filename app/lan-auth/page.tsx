"use client"

import { useState } from "react"
import { Shield, KeyRound, MonitorSmartphone, ArrowRight, Server, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LanAuthPage() {
  const [code, setCode] = useState("")
  const [deviceName, setDeviceName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!code.trim() || !deviceName.trim()) {
      setError("Pairing code and device name are required.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/server/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          code,
          deviceName
        })
      })
      
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to pair device")
      }

      // Set cookie (valid for 1 year matching session)
      document.cookie = `sky_auth_token=${data.token}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
      
      // Redirect to home
      window.location.href = "/"
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2">Device Pairing Required</h1>
          <p className="text-blue-100 text-sm font-medium">
            You are connecting to the Sky Ariana Server over the local network. 
            Please pair this device to continue.
          </p>
        </div>

        <form onSubmit={handlePair} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Pairing Code
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SKY-XXXX-XXXX"
                className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-hidden font-mono font-bold text-slate-900 text-lg transition-all uppercase placeholder:font-sans placeholder:font-medium placeholder:text-base"
                maxLength={13}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
              This Device's Name
            </label>
            <div className="relative">
              <MonitorSmartphone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Ali's Laptop"
                className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-hidden font-bold text-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Pairing Device...</span>
            ) : (
              <>
                <span>Connect to Server</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-center font-bold text-slate-400 mt-6 flex items-center justify-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            Generate a code from the Main PC Settings.
          </p>
        </form>
      </div>
    </div>
  )
}
