"use client"

import { useState, useEffect } from 'react'
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true)
        return
      }

      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
      setIsIOS(isIosDevice)

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
      }

      const handleAppInstalled = () => {
        setIsInstalled(true)
        setDeferredPrompt(null)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.addEventListener('appinstalled', handleAppInstalled)

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (isInstalled) return

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSModal(true)
    } else {
      alert("To install the Sky Ariana BOL app on your device:\n- On Android/Chrome: tap '⋮' then 'Install App' or 'Add to Home Screen'\n- On iPhone/iPad: tap the Share button then 'Add to Home Screen'\n- On PC/Mac: click the Install icon in your browser address bar.")
    }
  }

  if (isInstalled) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        title="Install Sky Ariana BOL App on your Device"
        className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 rounded-xl text-xs font-black border-emerald-300 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 shadow-2xs cursor-pointer transition-all ${className}`}
      >
        <Smartphone className="h-3.5 w-3.5 text-emerald-700 animate-pulse" />
        <span>Install App</span>
        <span className="hidden xl:inline font-[vazirmatn] text-[10px] opacity-80">/ نصب</span>
      </Button>

      {/* iOS Install Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="relative w-14 h-14 mx-auto rounded-xl overflow-hidden shadow-md border border-slate-100">
              <Image src="/logo.png" alt="App Logo" fill className="object-contain p-1" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Install Sky Ariana BOL</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Install this app on your iPhone or iPad for instant access and full-screen experience.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 text-left text-xs font-semibold text-slate-700 space-y-2 border border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs shrink-0">1</span>
                <span>Tap the <Share className="inline h-3.5 w-3.5 text-blue-600 mx-0.5" /> <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs shrink-0">2</span>
                <span>Scroll down and select <PlusSquare className="inline h-3.5 w-3.5 text-blue-600 mx-0.5" /> <strong>Add to Home Screen</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner</span>
              </div>
            </div>
            <Button onClick={() => setShowIOSModal(false)} className="w-full rounded-xl bg-blue-600 text-white font-bold h-9">
              Got It
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
