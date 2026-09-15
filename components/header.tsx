"use client"

import Image from 'next/image'
import { useRef } from 'react'
import { LogOut, Settings, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'

interface HeaderProps { showBack?: boolean; title?: string; subtitle?: string }

export function Header({ title, subtitle }: HeaderProps) {
  const { currentUser, logout, view, setView } = useApp()
  const previousView = useRef<typeof view>('accounts')
  return (
    <header className="workspace-header border-b border-slate-200 bg-white/95 no-print">
      <div className="workspace-header-inner mx-auto flex max-w-[1780px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="workspace-brand-mark">
            <Image src="/logo.png" alt="Sky Ariana" width={40} height={40} className="shrink-0 object-contain" priority />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900">{title || 'SKY ARIANA LIMITED'}</h1>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle || (view === 'settings' ? 'System Settings' : 'Bills of lading & account ledger')}</p>
          </div>
        </div>
        {currentUser && <div className="workspace-user-actions flex shrink-0 items-center gap-2">
          <div className="workspace-user hidden items-center gap-2.5 sm:flex">
            <span aria-hidden="true" className="workspace-avatar">{currentUser.name.trim().slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0">
              <span className="block max-w-36 truncate text-xs font-semibold text-slate-700">{currentUser.name}</span>
              <span className="block text-[10px] capitalize text-slate-500">{currentUser.role}</span>
            </div>
          </div>
          {currentUser.role !== 'shipper' && (
            <Button variant={view === 'settings' ? 'default' : 'outline'} size="sm" className="gap-1.5" aria-pressed={view === 'settings'}
              onPointerEnter={() => { void import('@/components/settings-view').catch(() => {}) }}
              onFocus={() => { void import('@/components/settings-view').catch(() => {}) }}
              onClick={() => {
                if (view === 'settings') setView(previousView.current)
                else { previousView.current = view; setView('settings') }
              }}>
              {view === 'settings' ? <ArrowLeft className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
              {view === 'settings' ? 'Back to workspace' : 'System Settings'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="gap-1.5"><LogOut className="h-3.5 w-3.5" />Logout</Button>
        </div>}
      </div>
    </header>
  )
}
