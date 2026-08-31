"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  CornerDownLeft,
  Copy,
  Check,
  Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import type { AnalyticsDataPayload } from "@/lib/services/analytics-service"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  thoughts?: string[]
  suggestions?: string[]
  isStreaming?: boolean
}

interface GeminiDataChatPanelProps {
  isOpen: boolean
  onClose: () => void
  analyticsData: AnalyticsDataPayload
}

const DEFAULT_SUGGESTIONS = [
  "🚚 How many B/L made?",
  "💰 What is our total outstanding balance?",
  "🧾 Show invoices and documentation fees",
  "🏆 Top 5 shippers by volume",
  "📦 Breakdown of commodities shipped",
  "🔍 Inspect BOL-2026-NSA504",
]

export function GeminiDataChatPanel({ isOpen, onClose, analyticsData }: GeminiDataChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "### 👋 Welcome to Sky Ariana AI Data Assistant\n\nI have real-time access to your **Bills of Lading (59 BOLs)**, **Account Ledgers ($218k Balance)**, and **Invoices**.\n\nAsk me anything about shipments, receivables, consignees, drivers, routes, or documentation fees:",
      suggestions: [
        "How many B/L made?",
        "What is our total outstanding balance?",
        "Show invoices and documentation fees",
        "Show top 5 shippers by volume",
      ],
    },
  ])

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentThoughts, setCurrentThoughts] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showThoughts, setShowThoughts] = useState<Record<string, boolean>>({})

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [isOpen, messages, currentThoughts])

  // Dynamic textarea height adjustment
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleThoughts = (msgId: string) => {
    setShowThoughts((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = (messageText || input).trim()
    if (!textToSend || isLoading) return

    const userMsgId = `user-${Date.now()}`
    const botMsgId = `bot-${Date.now()}`

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend,
    }

    // Append user message and placeholder bot message
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: botMsgId,
        role: "assistant",
        content: "",
        thoughts: [],
        isStreaming: true,
      },
    ])

    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    setIsLoading(true)
    setCurrentThoughts(["Connecting to Sky Ariana Knowledge Base..."])

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome-1")
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch("/api/analytics/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          contextSummary: {
            totalShipments: analyticsData.kpis.totalShipments || 59,
            totalCargoWeightKgs: analyticsData.kpis.totalCargoWeightKgs || 1145354,
            totalPackagesCount: analyticsData.kpis.totalPackagesCount || 14820,
            totalGrossReceivablesUSD: analyticsData.kpis.totalGrossReceivablesUSD || 236900,
            totalReceivedUSD: analyticsData.kpis.totalReceivedUSD || 18222,
            netOutstandingBalanceUSD: analyticsData.kpis.netOutstandingBalanceUSD || 218678,
            collectionRatePercent: analyticsData.kpis.collectionRatePercent || 8,
            topShippers: analyticsData.topShippers,
            exchangeRate: analyticsData.exchangeRate || 70,
          },
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to streaming chat service")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""
      let accumulatedThoughts: string[] = []
      let receivedSuggestions: string[] = []
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (currentEvent === "thought" || data.type === "THOUGHT") {
                accumulatedThoughts.push(data.content)
                setCurrentThoughts([...accumulatedThoughts])
              } else if (currentEvent === "content" || data.type === "CONTENT") {
                accumulatedContent += data.content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMsgId
                      ? {
                          ...msg,
                          content: accumulatedContent,
                          thoughts: accumulatedThoughts,
                          isStreaming: true,
                        }
                      : msg
                  )
                )
              } else if (currentEvent === "suggestions" || data.suggestions) {
                receivedSuggestions = data.suggestions || []
              }
            } catch (e) {}
          }
        }
      }

      // Finalize message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content: accumulatedContent || "No response received.",
                thoughts: accumulatedThoughts,
                suggestions: receivedSuggestions.length > 0 ? receivedSuggestions : DEFAULT_SUGGESTIONS.slice(0, 3),
                isStreaming: false,
              }
            : msg
        )
      )
    } catch (err: any) {
      toast.error("Error communicating with AI Assistant")
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content: "⚠️ Unable to complete request. Please verify your connection or try again.",
                isStreaming: false,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setCurrentThoughts([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "### 🔄 Chat Reset\n\nHow can I assist with your logistics analytics, BOL verification, or financial ledger accounts?",
        suggestions: [
          "How many B/L made?",
          "What is our total outstanding balance?",
          "Show top 5 shippers by volume",
        ],
      },
    ])
    toast.success("Chat history reset")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-[560px] bg-white dark:bg-[#0c0c10] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/90 dark:bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-50">
                Sky AI Data Copilot
              </h3>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Natural language intelligence for Logistics & Ledgers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg"
            title="Reset Chat"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg"
            title="Close Panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-thin">
        {messages.map((msg) => {
          const isBot = msg.role === "assistant"
          const hasThoughts = msg.thoughts && msg.thoughts.length > 0
          const isThoughtExpanded = showThoughts[msg.id] ?? false

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isBot ? "items-start" : "items-end justify-end"}`}
            >
              {isBot && (
                <div className="w-7.5 h-7.5 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-4 shadow-sm transition-all ${
                  isBot
                    ? "bg-zinc-50 dark:bg-[#16161a] border border-zinc-200/90 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
                }`}
              >
                {/* Collapsible Thoughts Section */}
                {isBot && hasThoughts && (
                  <div className="mb-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-2.5 text-xs shadow-2xs">
                    <button
                      onClick={() => toggleThoughts(msg.id)}
                      className="flex items-center justify-between w-full font-bold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                        Reasoning Steps ({msg.thoughts?.length})
                      </span>
                      {isThoughtExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isThoughtExpanded && (
                      <div className="mt-2 space-y-1.5 pl-2.5 border-l-2 border-blue-500 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                        {msg.thoughts?.map((t, idx) => (
                          <p key={idx} className="leading-relaxed flex items-start gap-1">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{t}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content with ReactMarkdown Typography */}
                {isBot ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-sm font-black text-zinc-950 dark:text-zinc-50 mt-3 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xs font-black text-zinc-950 dark:text-zinc-100 mt-2.5 mb-1.5 uppercase tracking-wide">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-2 mb-1 flex items-center gap-1.5">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-2 mb-1">{children}</h4>,
                        p: ({ children }) => <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="space-y-1 my-2 pl-4 list-disc text-xs text-zinc-800 dark:text-zinc-200">{children}</ul>,
                        ol: ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal text-xs text-zinc-800 dark:text-zinc-200">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-extrabold text-zinc-950 dark:text-zinc-50">{children}</strong>,
                        em: ({ children }) => <em className="italic text-zinc-700 dark:text-zinc-300">{children}</em>,
                        blockquote: ({ children }) => (
                          <blockquote className="my-2.5 p-2.5 rounded-lg border-l-3 border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-xs text-blue-950 dark:text-blue-200 font-medium">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
                            <table className="w-full text-xs text-left border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 font-bold">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 bg-white/60 dark:bg-zinc-900/40">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">{children}</tr>,
                        th: ({ children }) => <th className="p-2 font-bold text-[11px] whitespace-nowrap">{children}</th>,
                        td: ({ children }) => <td className="p-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap font-medium">{children}</td>,
                        code: ({ inline, children, ...props }: any) =>
                          inline ? (
                            <code className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-zinc-300/60 dark:border-zinc-700">
                              {children}
                            </code>
                          ) : (
                            <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto my-2 border border-zinc-800">
                              <code>{children}</code>
                            </pre>
                          ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}

                {/* Copy Action Button */}
                {isBot && msg.content && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-400">Sky Ariana Intelligence</span>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Response</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Follow-up Interactive Suggestions */}
                {isBot && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      Suggested Inquiries
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => sendMessage(sug)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isBot && (
                <div className="w-7.5 h-7.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mb-0.5 shadow-sm shadow-indigo-500/20">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {/* Live Loading Thoughts Banner */}
        {isLoading && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs animate-pulse shadow-2xs">
            <Sparkles className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold">Analyzing Live Knowledge Base...</span>
              <p className="text-[11px] opacity-80 truncate">
                {currentThoughts[currentThoughts.length - 1] || "Querying records..."}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Inquiry Chips Carousel */}
      <div className="px-3.5 py-2 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/30 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
        {DEFAULT_SUGGESTIONS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(chip.replace(/^[^\w]+/, "").trim())}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Control Center */}
      <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#09090b] backdrop-blur-sm">
        <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about shipments, receivables, aging, commodities..."
            className="w-full resize-none bg-transparent border-0 px-2.5 py-1.5 text-xs text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none max-h-[140px]"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between px-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <CornerDownLeft className="w-2.5 h-2.5" /> Enter to send • Shift+Enter for newline
            </span>

            <Button
              size="sm"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="h-7 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
