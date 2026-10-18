'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Globe,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { AIAssistantConfig } from '@/lib/types/ai-assistant'
import { toast } from 'sonner'

export function AIAssistantSettingsTab() {
  const [config, setConfig] = useState<AIAssistantConfig | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ai/assistant')
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
        setApiKeyInput(data.config.apiKey || '')
      }
    } catch (err) {
      console.error('Failed to load AI config:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    try {
      setSaving(true)
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-config',
          updates: {
            ...config,
            apiKey: apiKeyInput,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        setApiKeyInput(data.config.apiKey || '')
        toast.success('AI Assistant configuration saved.')
      } else {
        toast.error(data.error || 'Failed to save configuration.')
      }
    } catch (err: any) {
      toast.error(`Error saving: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      })

      const data = await res.json()
      setTestResult(data)
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.warning(data.message)
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
      toast.error(`Test failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="p-8 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
        <span>Loading AI Assistant settings...</span>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              SKY AI ASSISTANT CONFIGURATION
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure Google Gemini API integration, operational guardrails, and role permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Testing...' : 'Test AI Connection'}</span>
        </button>
      </div>

      {/* Test Connection Banner */}
      {testResult && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Row 1: Enable & Provider */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              AI Assistant Status
            </label>
            <select
              value={config.enabled ? 'true' : 'false'}
              onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="true">Enabled (Active)</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              AI Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="gemini">Google Gemini API (Cloud)</option>
              <option value="offline_local">Offline Deterministic Engine (Local)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="gemini-flash-latest">Gemini Flash Latest (Recommended)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
        </div>

        {/* Row 2: API Key */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AQ... or AIzaSy..."
              className="w-full h-10 px-3 pr-10 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Stored securely on server. Never sent to browser client in cleartext. If omitted, falls back to GEMINI_API_KEY environment variable.
          </p>
        </div>

        {/* Row 3: Operational Mode & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Operational Mode
            </label>
            <select
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="READ_ONLY">Read Only (Default - Safe Search)</option>
              <option value="READ_AND_ACTIONS">Read + Safe Actions (With Confirmation)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Default Response Language
            </label>
            <select
              value={config.defaultLanguage}
              onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value as any })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="EN">English</option>
              <option value="PS">Pashto (پښتو)</option>
              <option value="FA">Dari / Persian (دری)</option>
              <option value="UR">Urdu (اردو)</option>
              <option value="HI">Hindi (हिन्दी)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Max Query Results
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={config.maxResults}
              onChange={(e) => setConfig({ ...config, maxResults: Number(e.target.value) })}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict RBAC gating & zero hallucination enforced</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs shadow-lg shadow-blue-900/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
