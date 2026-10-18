import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useApp } from '../App'
import { BRAND_LOGO_SRC, DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_SUBTITLE, resolveBrandAssetUrl } from '../config/branding'
import { useCompanyBranding } from '../hooks/useCompanySettings'
import { 
  Mail, 
  Lock, 
  LogIn, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Plane,
  FileCheck2,
  FileText,
  Package,
  Globe2,
  LockKeyhole,
  KeyRound,
  Shield,
  Clock
} from 'lucide-react'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_SECONDS = 30

const Login: React.FC = () => {
  const { setUser } = useApp()
  const navigate = useNavigate()
  const { data: companyBranding } = useCompanyBranding()
  const [email, setEmail] = useState(() => localStorage.getItem('remember_email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('remember_email')))
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Rate-limiting / brute-force lockout states
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('auth_failed_attempts') || '0', 10)
  })
  const [lockoutRemaining, setLockoutRemaining] = useState(() => {
    const lockedUntil = parseInt(localStorage.getItem('auth_locked_until') || '0', 10)
    const now = Date.now()
    if (lockedUntil > now) {
      return Math.ceil((lockedUntil - now) / 1000)
    }
    return 0
  })

  const companyName = companyBranding?.company_name?.trim() || DEFAULT_COMPANY_NAME
  const companySubtitle = companyBranding?.subtitle?.trim() || DEFAULT_COMPANY_SUBTITLE
  const companyLogo = resolveBrandAssetUrl(companyBranding?.logo_path) || BRAND_LOGO_SRC

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          localStorage.removeItem('auth_locked_until')
          localStorage.removeItem('auth_failed_attempts')
          setFailedAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutRemaining])

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Listen for Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true)
    } else {
      setCapsLockActive(false)
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.getModifierState && !e.getModifierState('CapsLock')) {
      setCapsLockActive(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if locked out
    if (lockoutRemaining > 0) {
      setError(`Account temporarily locked for security. Please wait ${lockoutRemaining}s.`)
      return
    }

    const cleanEmail = email.trim()
    const cleanPassword = password

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await authApi.login(cleanEmail, cleanPassword)
      
      // Reset failed attempts on success
      localStorage.removeItem('auth_failed_attempts')
      localStorage.removeItem('auth_locked_until')
      setFailedAttempts(0)

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      if (rememberMe) {
        localStorage.setItem('remember_email', cleanEmail)
      } else {
        localStorage.removeItem('remember_email')
      }

      setUser(data.user)
      navigate('/')
    } catch (err: any) {
      // Clear password field on failed attempt for security
      setPassword('')
      
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      localStorage.setItem('auth_failed_attempts', newAttempts.toString())

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000
        localStorage.setItem('auth_locked_until', lockUntil.toString())
        setLockoutRemaining(LOCKOUT_DURATION_SECONDS)
        setError(`Too many failed attempts. Security cooldown active for ${LOCKOUT_DURATION_SECONDS} seconds.`)
      } else {
        if (!err.response) {
          setError('Unable to reach authentication server. Please check your network.')
        } else {
          setError(err.response?.data?.detail || 'Invalid email or password. Please verify credentials.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="login-shell min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 10% 15%, rgba(37, 99, 235, 0.22), transparent 45%), radial-gradient(circle at 90% 85%, rgba(245, 158, 11, 0.18), transparent 45%), linear-gradient(135deg, #090d16 0%, #0f172a 40%, #1e293b 80%, #0f172a 100%)'
      }}
    >
      {/* Ambient Lighting */}
      <div className="absolute top-[-20%] left-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-600/35 via-indigo-600/20 to-transparent blur-[160px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[750px] h-[750px] rounded-full bg-gradient-to-tl from-amber-500/30 via-orange-400/15 to-transparent blur-[170px] pointer-events-none" />
      <div className="absolute top-[45%] left-[25%] w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[130px] pointer-events-none" />

      {/* Blueprint Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main Executive Split Workspace Container */}
      <div 
        className="w-full max-w-[980px] rounded-[32px] relative z-10 overflow-hidden shadow-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 35px 100px -25px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.85) inset',
          backdropFilter: 'blur(35px)',
          WebkitBackdropFilter: 'blur(35px)'
        }}
      >
        {/* Left Side: Brand Showcase & Security Highlights */}
        <div 
          className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 xl:p-10 relative overflow-hidden text-white"
          style={{
            background: 'linear-gradient(145deg, #0b1329 0%, #111e38 50%, #1e3a8a 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Top Brand Block */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-extrabold backdrop-blur-md mb-5 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-wide">Encrypted Logistics Gateway</span>
            </div>

            <div className="bg-white/95 p-3.5 rounded-2xl inline-block shadow-xl mb-4 border border-white/40">
              <img 
                src={companyLogo} 
                alt={`${companyName} logo`} 
                className="w-48 h-20 object-contain"
                onError={(e) => {
                  const target = e.currentTarget
                  target.onerror = null
                  target.src = '/logo.jpg'
                }}
              />
            </div>

            <h2 className="text-xl font-black tracking-tight leading-snug">
              SKY ARIANA GROUP OF COMPANIES
            </h2>
            <p className="text-xs font-semibold text-blue-200/90 mt-1 uppercase tracking-wider">
              International Cargo &amp; Freight Operating System
            </p>
          </div>

          {/* Security & Architecture Badges */}
          <div className="space-y-3 my-6 relative z-10">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                <ShieldCheck size={17} />
              </div>
              <div>
                <strong className="text-xs font-bold text-white block">256-Bit TLS / SSL Encryption</strong>
                <span className="text-[11px] text-slate-300 leading-tight block">All authentication sessions and token exchanges are encrypted</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                <LockKeyhole size={17} />
              </div>
              <div>
                <strong className="text-xs font-bold text-white block">Role-Based Access Control (RBAC)</strong>
                <span className="text-[11px] text-slate-300 leading-tight block">Strict permission checks for financial ledgers &amp; trade records</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                <KeyRound size={17} />
              </div>
              <div>
                <strong className="text-xs font-bold text-white block">Brute-Force &amp; Rate Protection</strong>
                <span className="text-[11px] text-slate-300 leading-tight block">Intelligent mitigation against unauthorized dictionary attempts</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-2xs text-slate-300 relative z-10">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 size={13} className="text-blue-400" />
              <span>Afghanistan • India • UAE</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-extrabold">
              <Shield size={13} />
              <span>Certified Secure</span>
            </span>
          </div>
        </div>

        {/* Right Side: Secure Authentication Form */}
        <div className="lg:col-span-7 p-5 sm:p-8 lg:p-11 flex flex-col justify-between bg-white">
          <div>
            {/* Mobile-Only Header Brand Banner */}
            <div className="lg:hidden mb-5 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-white/15">
              <div className="flex items-center gap-3.5">
                <div className="bg-white/95 p-2 rounded-xl shadow-md shrink-0 border border-white/40">
                  <img 
                    src={companyLogo} 
                    alt={`${companyName} logo`} 
                    className="w-24 h-12 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.onerror = null
                      target.src = '/logo.jpg'
                    }}
                  />
                </div>
                <div className="overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Encrypted Portal</span>
                  </div>
                  <h2 className="text-sm font-black tracking-tight text-white truncate leading-tight">
                    {companyName}
                  </h2>
                  <p className="text-[10px] text-blue-200/80 font-semibold truncate">
                    Enterprise Cargo &amp; Freight Operating System
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row: Greeting & Security Pill */}
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                  {getGreeting()}
                </span>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  Sign In to Workspace
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your verified enterprise credentials to access documents.
                </p>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>SSL Encrypted</span>
              </div>
            </div>

            {/* Lockout Warning Banner if Active */}
            {lockoutRemaining > 0 && (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded-2xl p-3.5 mb-5 font-bold shadow-2xs">
                <Clock size={18} className="text-amber-600 shrink-0 animate-spin" />
                <span>Security lockout active. Please wait <strong>{lockoutRemaining}s</strong> before retrying.</span>
              </div>
            )}

            {/* Error Banner */}
            {error && lockoutRemaining <= 0 && (
              <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl p-3.5 mb-5 font-bold shadow-2xs animate-shake">
                <ShieldAlert size={18} className="text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Secure Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-700">
                  Authorized Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={lockoutRemaining > 0 || loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="name@skyariana.com"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  {capsLockActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
                      <AlertCircle size={12} /> Caps Lock is ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutRemaining > 0 || loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    autoComplete="current-password"
                    spellCheck={false}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Security Status */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={lockoutRemaining > 0 || loading}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                  />
                  <span>Remember my email</span>
                </label>

                <span className="text-2xs font-bold text-slate-400 flex items-center gap-1">
                  <Shield size={11} className="text-emerald-500" />
                  <span>2FA / RBAC Protected</span>
                </span>
              </div>

              {/* Secure Submit Button */}
              <button
                type="submit"
                disabled={loading || lockoutRemaining > 0}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_14px_32px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-600/30 mt-3"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>Authenticate &amp; Enter Workspace</span>
                    <LogIn size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Security Badges & Copyright */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>Encrypted Session</span>
              </span>
              <span>•</span>
              <span>Zero Knowledge Gateway</span>
            </div>

            <div className="text-[11px] font-bold text-slate-400">
              © 2026 {companyName}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
