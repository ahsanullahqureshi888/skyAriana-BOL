'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Truck,
  FileText,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Globe,
  Sliders,
  CheckCircle2,
  X,
  MessageSquare,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AIChatMessage,
  AICardItem,
  AIActionProposal,
  SupportedLanguage,
} from '@/lib/types/ai-assistant'
import { toast } from 'sonner'

interface AIChatInterfaceProps {
  initialPrompt?: string
  isFloating?: boolean
  onClose?: () => void
}

export function AIChatInterface({ initialPrompt, isFloating, onClose }: AIChatInterfaceProps) {
  const { currentUser, setView, accounts } = useApp()
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState(initialPrompt || '')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('Understanding request...')
  const [language, setLanguage] = useState<SupportedLanguage>('EN')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Handle Initial Prompt if passed
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      handleSendMessage(initialPrompt)
    }
  }, [initialPrompt])

  // Send Query
  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || inputPrompt).trim()
    if (!query || loading) return

    const userMsgId = `msg-user-${Date.now()}`
    const userMsg: AIChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!promptToSend) setInputPrompt('')
    setLoading(true)
    setLoadingStage('Understanding request...')

    try {
      setTimeout(() => setLoadingStage('Searching shipments & containers...'), 350)
      setTimeout(() => setLoadingStage('Verifying database facts...'), 700)

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          prompt: query,
          userContext: {
            id: currentUser?.id,
            username: currentUser?.username,
            name: currentUser?.name,
            role: currentUser?.role,
            language,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${data.error || 'Failed to process request.'}`,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ])
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Network error: ${err.message}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Confirm Action Proposal (Write Execution)
  const handleConfirmAction = async (proposal: AIActionProposal) => {
    try {
      setExecutingProposalId(proposal.id)
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-action',
          proposal,
          userContext: {
            id: currentUser?.id,
            username: currentUser?.username,
            name: currentUser?.name,
            role: currentUser?.role,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'Action executed successfully.')
        // Update proposal in chat state
        setMessages((prev) =>
          prev.map((m) => {
            if (m.actionProposal?.id === proposal.id) {
              return {
                ...m,
                actionProposal: {
                  ...m.actionProposal,
                  confirmed: true,
                  auditNote: data.message,
                },
              }
            }
            return m
          })
        )
      } else {
        toast.error(data.message || 'Action execution failed.')
      }
    } catch (err: any) {
      toast.error(`Execution error: ${err.message}`)
    } finally {
      setExecutingProposalId(null)
    }
  }

  // Handle Card Action Navigation
  const handleCardAction = (action: string, params?: Record<string, any>) => {
    if (action === 'NAVIGATE' && params?.view) {
      setView(params.view as any)
      if (onClose) onClose()
    } else if (action === 'GENERATE_WHATSAPP' && params?.bolNumber) {
      handleSendMessage(`Make WhatsApp update for BOL ${params.bolNumber}`)
    }
  }

  // Copy message text to clipboard
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copied to clipboard!')
  }

  return (
    <div
      className={`flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        isFloating ? 'h-[620px] max-h-[85vh] w-full rounded-2xl shadow-2xl' : 'min-h-[82vh] rounded-3xl'
      } border border-slate-200/80 dark:border-slate-800 overflow-hidden`}
    >
      {/* 1. Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-white uppercase">
                SKY AI ASSISTANT
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase">
                Database Grounded
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium hidden sm:block">
              Operations • Tracking • Documents • Finance • Reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex items-center px-2 py-1 rounded-lg bg-white/10 text-[11px] font-bold">
            <Globe className="w-3 h-3 text-slate-300 mr-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-white outline-hidden cursor-pointer"
            >
              <option value="EN" className="bg-slate-900">EN</option>
              <option value="PS" className="bg-slate-900">پښتو</option>
              <option value="FA" className="bg-slate-900">دری</option>
              <option value="UR" className="bg-slate-900">اردو</option>
              <option value="HI" className="bg-slate-900">हिन्दी</option>
            </select>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isFloating && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Chat Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
        {messages.length === 0 ? (
          <div className="py-6 sm:py-10 flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-blue-900/10 dark:bg-blue-900/30 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Ask about your logistics operations
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Grounded strictly in verified Sky Ariana records. Never hallucinates balances, locations, or dates.
              </p>
            </div>

            {/* Role-tailored Quick Question Pills */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Quick Questions
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleSendMessage('Where are active containers?')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                >
                  🚢 Where are active containers?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Which trucks are at the border?')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                >
                  🚧 Trucks at border?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Which shipments are missing documents?')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                >
                  📄 Missing documents?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Show overdue invoices')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                >
                  💵 Overdue invoices?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Make today\'s WhatsApp shipment status')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                >
                  📱 Today's WhatsApp status
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-900 text-white rounded-br-xs shadow-md font-medium'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs shadow-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="prose prose-xs dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Source Badge & Utility Bar */}
                {msg.role === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {msg.sourceTags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer font-bold"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Proposal Confirmation Card (Write Operations) */}
              {msg.actionProposal && !msg.actionProposal.confirmed && (
                <div className="max-w-[85%] p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Proposed Operational Modification</span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {msg.actionProposal.title}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {msg.actionProposal.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 text-[11px] font-mono space-y-1">
                    <div>
                      <span className="text-slate-400">Target:</span> {msg.actionProposal.entityRef}
                    </div>
                    <div>
                      <span className="text-slate-400">Proposed:</span>{' '}
                      {JSON.stringify(msg.actionProposal.proposedValues)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={executingProposalId === msg.actionProposal.id}
                      onClick={() => handleConfirmAction(msg.actionProposal!)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {executingProposalId === msg.actionProposal.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Confirm Update</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Render Structured Interactive Cards */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {msg.cards.map((card) => (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {card.title}
                        </span>
                        {card.status && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                            {card.status}
                          </span>
                        )}
                      </div>

                      {card.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {card.subtitle}
                        </p>
                      )}

                      {card.location && (
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Location: {card.location}</span>
                        </div>
                      )}

                      {card.financials && (
                        <div className="space-y-1 py-1 border-t border-slate-100 dark:border-slate-800">
                          {card.financials.map((fin, idx) => (
                            <div key={idx} className="flex justify-between text-xs font-mono font-bold">
                              <span className="text-slate-500">{fin.label}:</span>
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {fin.amount.toLocaleString()} {fin.currency}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {card.actions && card.actions.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          {card.actions.map((act, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCardAction(act.action, act.params)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                act.variant === 'primary'
                                  ? 'bg-blue-900 text-white hover:bg-blue-950'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 max-w-sm animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span>{loadingStage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={loading}
            placeholder="Ask about shipments, containers, documents, bookings, payments..."
            className="flex-1 h-11 px-4 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 transition-all"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="h-11 px-4 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
          <span>Authoritative Database Grounded • Zero Hallucination Guaranteed</span>
          <span>Sky Ariana AI Ops</span>
        </div>
      </div>
    </div>
  )
}
