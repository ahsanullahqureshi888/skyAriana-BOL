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

export function GeminiDataChatPanel({ isOpen, onClose, analyticsData }: GeminiDataChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "👋 **Welcome to Sky Ariana AI Data Assistant!**\n\nI have real-time access to your **Bills of Lading (BOL)**, **Account Ledgers**, and **Financial Statements**.\n\nYou can ask questions like:\n- *\"Who are our top 5 shippers by cargo volume?\"*\n- *\"What is our total outstanding balance and aging status?\"*\n- *\"Show the breakdown of dried fruit commodities shipped this season.\"*",
      suggestions: [
        "Show top 5 shippers by volume",
        "What is our total outstanding balance?",
        "Breakdown of dry fruits shipped",
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
    setCurrentThoughts(["Analyzing query intent and extracting records..."])

    try {
      // Build lightweight conversation history
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
            totalShipments: analyticsData.kpis.totalShipments,
            totalCargoWeightKgs: analyticsData.kpis.totalCargoWeightKgs,
            totalPackagesCount: analyticsData.kpis.totalPackagesCount,
            totalGrossReceivablesUSD: analyticsData.kpis.totalGrossReceivablesUSD,
            totalReceivedUSD: analyticsData.kpis.totalReceivedUSD,
            netOutstandingBalanceUSD: analyticsData.kpis.netOutstandingBalanceUSD,
            collectionRatePercent: analyticsData.kpis.collectionRatePercent,
            topShippers: analyticsData.topShippers,
            exchangeRate: analyticsData.exchangeRate,
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

      // Finalize the message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content: accumulatedContent || "No response received.",
                thoughts: accumulatedThoughts,
                suggestions: receivedSuggestions,
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
        content: "Chat history cleared. How can I assist with your logistics analytics?",
        suggestions: [
          "Show top 5 shippers by volume",
          "What is our total outstanding balance?",
          "Analyze monthly freight trends",
        ],
      },
    ])
    toast.success("Chat history reset")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[520px] bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              Sky AI Data Copilot
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Gemini 2.0
              </span>
            </h3>
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
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
            title="Clear Chat History"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
            title="Close Panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
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
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs transition-all ${
                  isBot
                    ? "bg-zinc-100/90 dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                }`}
              >
                {/* Collapsible Thoughts Section */}
                {isBot && hasThoughts && (
                  <div className="mb-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-2 text-xs">
                    <button
                      onClick={() => toggleThoughts(msg.id)}
                      className="flex items-center justify-between w-full font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5 text-blue-500" />
                        Reasoning Steps ({msg.thoughts?.length})
                      </span>
                      {isThoughtExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isThoughtExpanded && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-blue-400 dark:border-blue-600 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {msg.thoughts?.map((t, idx) => (
                          <p key={idx} className="leading-relaxed">
                            • {t}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content with Markdown Typography */}
                <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 leading-relaxed [&>p]:mb-2 [&>h3]:text-sm [&>h3]:font-black [&>h3]:mt-3 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>table]:w-full [&>table]:text-xs [&>table]:border-collapse [&>table]:my-2 [&>table_th]:border [&>table_th]:border-zinc-300 [&>table_th]:dark:border-zinc-700 [&>table_th]:p-1.5 [&>table_th]:bg-zinc-200/50 [&>table_th]:dark:bg-zinc-800 [&>table_td]:border [&>table_td]:border-zinc-300 [&>table_td]:dark:border-zinc-700 [&>table_td]:p-1.5 [&>code]:font-mono [&>code]:bg-zinc-200 dark:[&>code]:bg-zinc-800 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
                  {msg.content.split("\n").map((line, idx) => {
                    if (line.startsWith("### ")) {
                      return <h3 key={idx} className="text-sm font-black mt-2 mb-1 text-zinc-950 dark:text-zinc-100">{line.replace("### ", "")}</h3>
                    }
                    if (line.startsWith("#### ")) {
                      return <h4 key={idx} className="text-xs font-bold mt-2 mb-1 text-zinc-800 dark:text-zinc-200">{line.replace("#### ", "")}</h4>
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <p key={idx} className="text-xs my-0.5 pl-2 border-l-2 border-blue-400/40">
                          {line.replace("- ", "")}
                        </p>
                      )
                    }
                    if (line.startsWith("> ")) {
                      return (
                        <blockquote key={idx} className="p-2 my-2 rounded bg-blue-50/70 dark:bg-blue-950/40 border-l-2 border-blue-500 text-xs text-blue-900 dark:text-blue-200">
                          {line.replace("> ", "")}
                        </blockquote>
                      )
                    }
                    return <p key={idx} className="text-xs whitespace-pre-wrap">{line}</p>
                  })}
                </div>

                {/* Copy Action Button */}
                {isBot && msg.content && (
                  <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Sky Ariana Copilot</span>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Follow-up Interactive Suggestions */}
                {isBot && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
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
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mb-0.5 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {/* Live Loading Thoughts Banner */}
        {isLoading && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold">Analyzing Live Data...</span>
              <p className="text-[11px] opacity-80 truncate">
                {currentThoughts[currentThoughts.length - 1] || "Querying records..."}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
