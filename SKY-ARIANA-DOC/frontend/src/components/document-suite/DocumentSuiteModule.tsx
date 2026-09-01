import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ExternalLink,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  ReceiptText,
  ClipboardCheck,
  Tag,
  Plane,
  Award,
} from 'lucide-react'
import { getDocumentSuiteBaseUrl } from '../../config/documentSuite'

type ModuleKey = 'acci' | 'acciPackingLists' | 'shippingStickers' | 'airWaybills' | 'saftaCertificates'

type DocumentSuiteModuleProps = {
  moduleKey: ModuleKey
  title: string
  eyebrow: string
  description: string
}

const modulePaths: Record<ModuleKey, string> = {
  acci: 'acci-invoices',
  acciPackingLists: 'acci-packing-lists',
  shippingStickers: 'shipping-stickers',
  airWaybills: 'air-waybills',
  saftaCertificates: 'safta-certificates',
}

const suiteNavigation = [
  { key: 'acci', name: 'ACCI Invoices', path: '/acci-invoices', icon: ReceiptText, badge: 'ACCI' },
  { key: 'acciPackingLists', name: 'Packing Lists', path: '/acci-packing-lists', icon: ClipboardCheck, badge: 'PKG' },
  { key: 'shippingStickers', name: 'Shipping Stickers', path: '/shipping-stickers', icon: Tag, badge: 'STICKER' },
  { key: 'airWaybills', name: 'Air Waybills', path: '/air-waybills', icon: Plane, badge: 'IATA' },
  { key: 'saftaCertificates', name: 'SAFTA Certificates', path: '/safta-certificates', icon: Award, badge: 'SAFTA' },
]

const DocumentSuiteModule = ({ moduleKey, title, eyebrow }: DocumentSuiteModuleProps) => {
  const documentSuiteBaseUrl = getDocumentSuiteBaseUrl()
  const [activeBaseUrl] = useState<string>(() => {
    const custom = localStorage.getItem('document-suite-url')
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '')
    return documentSuiteBaseUrl
  })

  const [isLoading, setIsLoading] = useState(true)
  const [frameKey, setFrameKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeZoom, setActiveZoom] = useState<string>(() => localStorage.getItem('acci-app-zoom') || '0.90')
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const location = useLocation()

  const moduleUrl = `${activeBaseUrl}/${modulePaths[moduleKey]}`

  useEffect(() => {
    setIsLoading(true)
  }, [moduleKey, frameKey])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {})
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  const syncWithIframe = () => {
    setIsLoading(false)
    if (iframeRef.current?.contentWindow) {
      try {
        const saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]')
        iframeRef.current.contentWindow.postMessage({ type: 'RECEIVE_SAVED_STICKERS', stickers: saved }, '*')
      } catch (e) {}
    }
  }

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return
      if (e.data.type === 'TOGGLE_FULLSCREEN') {
        toggleFullscreen()
      }
      if (e.data.type === 'STICKER_SAVED' && e.data.sticker) {
        try {
          let saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]')
          const idx = saved.findIndex((s: any) => s.sticker_no === e.data.sticker.sticker_no)
          if (idx >= 0) {
            saved[idx] = { ...saved[idx], ...e.data.sticker }
          } else {
            saved.unshift(e.data.sticker)
          }
          localStorage.setItem('user_saved_stickers', JSON.stringify(saved))
        } catch (err) {}
      }
      if (e.data.type === 'DELETE_STICKER' && e.data.sticker_no) {
        try {
          let saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]')
          saved = saved.filter((s: any) => s.sticker_no !== e.data.sticker_no)
          localStorage.setItem('user_saved_stickers', JSON.stringify(saved))
        } catch (err) {}
      }
      if (e.data.type === 'REQUEST_SAVED_STICKERS') {
        syncWithIframe()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const refreshService = () => {
    setIsLoading(true)
    setFrameKey((value) => value + 1)
  }

  const setZoom = (scale: string) => {
    setActiveZoom(scale)
    localStorage.setItem('acci-app-zoom', scale)
    refreshService()
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col min-h-0 bg-slate-50 flex-1 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-9999 bg-white' : ''
      }`}
    >
      {/* Top Document Suite Navigation & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3.5 py-2 bg-white border-b border-slate-200/90 gap-2 shrink-0 no-print shadow-xs z-20">
        {/* Left: Quick Suite Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {suiteNavigation.map((nav) => {
            const Icon = nav.icon
            const isActive = location.pathname === nav.path
            return (
              <Link
                key={nav.key}
                to={nav.path}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{nav.name}</span>
                <span
                  className={`text-[9px] font-extrabold px-1 py-0.2 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {nav.badge}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right: Controls (Zoom, Refresh, Fullscreen, Open in Tab) */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
          {/* Zoom Presets */}
          <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {['0.80', '0.85', '0.90', '1.0'].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  activeZoom === z ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={`Set zoom to ${Math.round(parseFloat(z) * 100)}%`}
              >
                {Math.round(parseFloat(z) * 100)}%
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={refreshService}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-colors cursor-pointer"
            title="Refresh document workspace"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={isFullscreen ? 'Exit full screen (Esc)' : 'Expand to full screen (F11)'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden md:inline">{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>

          <a
            href={moduleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            title="Open in new browser tab"
          >
            <ExternalLink size={13} />
            <span className="hidden md:inline">New Tab</span>
          </a>
        </div>
      </div>

      {/* Main Document Frame Area */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-slate-100">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-2xs transition-opacity duration-300">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-2xl shadow-lg border border-slate-200">
              <LoaderCircle size={22} className="animate-spin text-blue-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">Opening {title}...</div>
                <div className="text-[10px] text-slate-500">{eyebrow} • Fast Loading</div>
              </div>
            </div>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          ref={iframeRef}
          key={frameKey}
          title={title}
          src={moduleUrl}
          allow="fullscreen; clipboard-write; clipboard-read"
          onLoad={syncWithIframe}
          className="w-full h-full flex-1 border-0 block bg-slate-50 min-h-0"
        />
      </div>
    </div>
  )
}

export default DocumentSuiteModule
