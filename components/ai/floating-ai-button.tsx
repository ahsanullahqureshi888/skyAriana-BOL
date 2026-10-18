'use client'

import React, { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { AIChatInterface } from './ai-chat-interface'
import { useApp } from '@/lib/app-context'

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { view } = useApp()

  // If user is already on the dedicated full-screen AI view, don't show the floating widget
  if (view === 'ai-assistant') return null

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40 no-print">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-black text-xs shadow-xl transition-all cursor-pointer ${
            isOpen
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white hover:scale-105 border border-amber-400/30 shadow-indigo-900/40'
          }`}
          title="Ask SKY AI Assistant"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="tracking-wide">Ask SKY AI</span>
        </button>
      </div>

      {/* Floating Slide-over / Popup Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[460px] max-w-[500px] animate-in slide-in-from-bottom-5 duration-200">
          <AIChatInterface isFloating onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  )
}
