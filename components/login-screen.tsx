"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Phone, 
  Globe, 
  Eye, 
  EyeOff, 
  Shield, 
  Truck, 
  AlertCircle,
  HelpCircle,
  Check,
  KeyRound,
  ExternalLink,
  Plane,
  Ship,
  Layers
} from "lucide-react"

const bgImages = [
  {
    url: '/images/sky_freight_cargo_plane.jpg',
    title: 'Sky Ariana Air Freight',
    location: 'Boeing 777F Sky Cargo · Global Logistics Network',
    tag: 'Air Cargo Express',
  },
  {
    url: '/images/maritime_port_cargo_ship.jpg',
    title: 'Maritime Deepwater Terminal',
    location: 'Deepwater Container Terminals & Sea Port Logistics',
    tag: 'Ocean Freight',
  },
  {
    url: '/images/mountain_logistics_bg.jpg',
    title: 'Trans-Continental Mountain Corridor',
    location: 'Heavy-Duty Highway Convoy · Central Asian Trade Route',
    tag: 'Overland Transit',
  },
  {
    url: '/images/afghan_cargo_fleet_pass.jpg',
    title: 'Multimodal Dry Port & Border Logistics',
    location: 'Intermodal Rail & Inland Terminal Logistics Hub',
    tag: 'Multimodal Hub',
  }
]

export function LoginScreen() {
  const { login } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const activePortal = "admin"
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => { setIsReady(true) }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError(null)
    const success = login(u, p, rememberMe)
    if (!success) {
      setError("Invalid username or password. Please try again.")
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setError(null)
    setIsLoading(true)

    const cleanUser = username.trim()
    const cleanPass = password

    try {
      const success = login(cleanUser, cleanPass, rememberMe)
      if (!success) {
        setError("Invalid username or password. Please try again.")
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    } catch (err) {
      setError("An unexpected error occurred during login.")
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans text-slate-800 z-50 select-none">
      
      {/* Full-bleed Dynamic Background Image Layers (Zero clipping / Zero lines) */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        {bgImages.map((bg, index) => (
          <div 
            key={bg.url}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-out ${
              index === currentBg ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{ backgroundImage: `url("${bg.url}")` }}
          />
        ))}
        {/* Soft, clean translucent overlay */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px] z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 z-10" />
      </div>

      {/* Floating Top Left Brand Pill */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md border border-white/15 text-white/90 shadow-lg">
        <div className="h-6 w-6 rounded-lg bg-white/15 flex items-center justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-[11px] font-black tracking-wider uppercase">
          SKY ARIANA LIMITED <span className="text-amber-400 font-bold ml-1 text-[9px]">v5.1pro</span>
        </div>
      </div>

      {/* Floating Top Right Support Button */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-md border border-white/20 rounded-full text-white transition-all shadow-md hover:scale-105 active:scale-95"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
          <span>Support & Help</span>
        </button>
      </div>

      {/* Centered Main Login Card - Compact & Elegant */}
      <main className="relative z-20 w-full max-w-[390px] my-auto">
        <div className="relative group">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-amber-500/30 rounded-[28px] blur-md opacity-60 pointer-events-none" />

          <div className="relative bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] border border-white p-5 sm:p-6 flex flex-col items-center">
            
            {/* Header / Logo */}
            <div className="w-full flex flex-col items-center mb-3">
              <div className="relative mb-2.5">
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-600/30 to-amber-400/20 rounded-full blur-md" />
                <div className="relative p-1 bg-white rounded-full shadow-[0_8px_20px_-4px_rgba(10,37,64,0.15)] border border-slate-100">
                  <img 
                    src="/logo.png" 
                    alt="SKY ARIANA LIMITED" 
                    className="h-20 sm:h-22 w-auto object-contain transition-transform hover:scale-105 duration-300"
                  />
                </div>
              </div>
              
              <h1 className="text-lg font-black tracking-tight text-[#0a2540] uppercase text-center leading-tight">
                SKY ARIANA LIMITED
              </h1>
              <p className="text-[9px] font-extrabold tracking-[0.2em] text-slate-500 uppercase mt-0.5" dir="rtl">
                سکای آریانا لمیتد • Global Logistics
              </p>

              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300/80 text-[9px] uppercase tracking-wider text-amber-900 font-extrabold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Secure Access Gateway</span>
              </div>
            </div>

            {/* Login Form */}
            <form 
              onSubmit={handleSubmit} 
              className="w-full space-y-3"
            >
              
              {error && (
                <div className="p-2 text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="text-[11px] leading-tight">{error}</span>
                </div>
              )}

              {/* Username / Email */}
              <div className="space-y-1">
                <label 
                  htmlFor="login-username"
                  className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider ml-1 flex items-center justify-between"
                >
                  <span>{activePortal === "admin" ? "Admin Username / Email" : "Shipper Account / Email"}</span>
                </label>
                <div className="relative group">
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin or admin@skyariana.com"
                    disabled={isLoading || !isReady}
                    className="w-full h-9.5 pl-3 pr-9 text-xs bg-white border border-slate-200 shadow-inner rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label 
                  htmlFor="login-password"
                  className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider ml-1 flex items-center justify-between"
                >
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("admin", "admin")}
                    disabled={!isReady || isLoading}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200/80 transition-colors uppercase tracking-tight cursor-pointer"
                  >
                    1-Click Login (admin)
                  </button>
                </label>
                <div className="relative group">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (e.g. admin)"
                    disabled={isLoading || !isReady}
                    className="w-full h-9.5 pl-3 pr-9 text-xs bg-white border border-slate-200 shadow-inner rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-black text-slate-900 placeholder:text-slate-400 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer group select-none">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer peer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors bg-white shadow-2xs"
                    />
                    <Check className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
                  </div>
                  <span className="group-hover:text-slate-900 transition-colors">Remember Session</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 transition-colors hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(e)
                }}
                disabled={isLoading || !isReady}
                className="group relative w-full h-10 mt-1 bg-gradient-to-r from-[#0a2540] via-[#1d4ed8] to-[#0a2540] bg-[length:200%_auto] hover:bg-right transition-[background-position] duration-500 text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-md shadow-blue-900/25 flex items-center justify-center gap-2 overflow-hidden cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[11px]">Verifying...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Log In Securely
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2.5 text-[10px] font-bold text-slate-500">
              <button 
                type="button"
                onClick={() => setShowHelpModal(true)} 
                className="hover:text-blue-700 transition-colors"
              >
                Activate Account
              </button>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <button 
                type="button"
                onClick={() => setShowHelpModal(true)} 
                className="hover:text-blue-700 transition-colors"
              >
                24/7 Support
              </button>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <button 
                type="button"
                onClick={() => setShowHelpModal(true)} 
                className="hover:text-blue-700 transition-colors"
              >
                Contact IT
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Bottom Left Corridor Showcase Badge */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 hidden md:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/15 text-white shadow-xl max-w-sm transition-all duration-300">
        <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-amber-300">
          {currentBg === 0 && <Plane className="w-4 h-4" />}
          {currentBg === 1 && <Ship className="w-4 h-4" />}
          {currentBg === 2 && <Truck className="w-4 h-4" />}
          {currentBg === 3 && <Layers className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              {bgImages[currentBg].tag}
            </span>
            <span className="text-[9px] text-white/40">·</span>
            <span className="text-[10px] font-extrabold text-white/90 truncate">
              {bgImages[currentBg].title}
            </span>
          </div>
          <div className="text-[10px] font-medium text-white/60 truncate">
            {bgImages[currentBg].location}
          </div>
        </div>
      </div>

      {/* Floating Bottom Center Status & Carousel Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/15 text-white/80 text-[10px] shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
          <span className="font-semibold text-white/90">System Online · SSL Encrypted</span>
        </div>
        <span className="w-1 h-1 rounded-full bg-white/30" />
        <div className="flex items-center gap-1.5">
          {bgImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentBg(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentBg 
                  ? "w-6 bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                  : "w-2 bg-white/40 hover:bg-white/80"
              }`}
              title={img.title}
            />
          ))}
        </div>
      </div>

      {/* Support & Account Recovery Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 sm:p-6 shadow-2xl relative border border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors font-bold text-xs"
            >
              ✕
            </button>

            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Enterprise System Support
            </h3>
            <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed">
              For password reset or operational support, contact IT administration.
            </p>

            <div className="space-y-2 text-left mb-4">
              <a 
                href="tel:+93700939365" 
                className="p-2.5 bg-slate-50 hover:bg-blue-50/80 rounded-xl border border-slate-100 hover:border-blue-200 flex items-center gap-2.5 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Afghanistan Office</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">+93 700 939 365</div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
              </a>

              <a 
                href="tel:+989172325086" 
                className="p-2.5 bg-slate-50 hover:bg-blue-50/80 rounded-xl border border-slate-100 hover:border-blue-200 flex items-center gap-2.5 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Iran Office</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">+98 9172325086</div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
              </a>

              <a 
                href="mailto:info@skyariana.com" 
                className="p-2.5 bg-slate-50 hover:bg-blue-50/80 rounded-xl border border-slate-100 hover:border-blue-200 flex items-center gap-2.5 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Email Support</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">info@skyariana.com</div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
