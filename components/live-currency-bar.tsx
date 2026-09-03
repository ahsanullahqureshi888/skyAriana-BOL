"use client"

import React, { useState } from "react"
import {
  ArrowRightLeft,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export interface LiveRates {
  USD: number
  AFN: number
  IRR: number
  AED: number
  EUR: number
  PKR: number
  CNY: number
}

const DEFAULT_RATES: LiveRates = {
  USD: 1,
  AFN: 70.85,
  IRR: 625000,
  AED: 3.6725,
  EUR: 0.925,
  PKR: 279.5,
  CNY: 7.24,
}

export function LiveCurrencyBar() {
  const [rates, setRates] = useState<LiveRates>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("skybol:live-exchange-rates")
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return DEFAULT_RATES
  })

  const [amount, setAmount] = useState<string>("1000")
  const [baseCurrency, setBaseCurrency] = useState<keyof LiveRates>("USD")
  const [targetCurrency, setTargetCurrency] = useState<keyof LiveRates>("AFN")
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  const numAmount = Number(amount) || 0
  const amountInUSD = baseCurrency === "USD" ? numAmount : numAmount / (rates[baseCurrency] || 1)
  const convertedAmount = baseCurrency === targetCurrency ? numAmount : amountInUSD * (rates[targetCurrency] || 1)

  const handleCopyResult = () => {
    const formatted = convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    navigator.clipboard.writeText(`${formatted} ${targetCurrency}`)
    setCopied(true)
    toast.success(`Copied ${formatted} ${targetCurrency} to clipboard!`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpdateRate = (cur: keyof LiveRates, val: number) => {
    if (val <= 0 || isNaN(val)) return
    const updated = { ...rates, [cur]: val }
    setRates(updated)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skybol:live-exchange-rates", JSON.stringify(updated))
    }
    toast.success(`Updated ${cur} exchange rate to ${val.toLocaleString()}`)
  }

  const handleResetRates = () => {
    setRates(DEFAULT_RATES)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skybol:live-exchange-rates", JSON.stringify(DEFAULT_RATES))
    }
    toast.success("Exchange rates reset to default benchmark values")
  }

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800/80 text-slate-300 text-xs select-none no-print">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-5 py-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        
        {/* Ticker rates */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 py-0.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold shrink-0">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10.5px] font-black tracking-wider uppercase">FX RATES:</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-medium">
              USD/AFN: <span className="text-emerald-400 font-black">{rates.AFN}</span>
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-medium">
              USD/IRR: <span className="text-cyan-400 font-black">{rates.IRR.toLocaleString()}</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-medium">
              USD/AED: <span className="text-amber-400 font-black">{rates.AED}</span>
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-medium">
              USD/EUR: <span className="text-purple-400 font-black">{rates.EUR}</span>
            </span>
            <span className="hidden lg:inline-block px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-medium">
              USD/PKR: <span className="text-blue-400 font-black">{rates.PKR}</span>
            </span>
          </div>
        </div>

        {/* Fast Interactive Converter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-14 sm:w-16 bg-transparent text-white font-mono text-[11px] px-1 py-0.5 outline-none font-bold text-right"
              placeholder="1000"
            />

            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value as keyof LiveRates)}
              className="bg-slate-800 text-amber-300 text-[10.5px] font-black px-1 py-0.5 rounded outline-none cursor-pointer"
            >
              <option value="USD">USD</option>
              <option value="AFN">AFN</option>
              <option value="IRR">IRR</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
              <option value="PKR">PKR</option>
            </select>

            <ArrowRightLeft className="w-3 h-3 text-slate-500 mx-0.5 shrink-0" />

            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value as keyof LiveRates)}
              className="bg-slate-800 text-emerald-300 text-[10.5px] font-black px-1 py-0.5 rounded outline-none cursor-pointer"
            >
              <option value="AFN">AFN</option>
              <option value="USD">USD</option>
              <option value="IRR">IRR</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
              <option value="PKR">PKR</option>
            </select>

            <span className="px-1.5 text-emerald-400 font-mono font-black text-[11px]">
              = {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyResult}
              className="h-5.5 w-5.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Copy converted result"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-1.5 text-[10.5px] text-slate-400 hover:text-white rounded cursor-pointer"
            title="Customize Exchange Rates"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Rate Customizer */}
      {isExpanded && (
        <div className="bg-slate-950 border-t border-slate-800/80 p-2.5 animate-in fade-in duration-150">
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Custom Market Rates Override (against 1 USD):</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <label className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">AFN:</span>
                <input
                  type="number"
                  value={rates.AFN}
                  onChange={(e) => handleUpdateRate("AFN", Number(e.target.value))}
                  className="w-16 bg-transparent text-white text-right outline-none font-bold"
                />
              </label>

              <label className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">IRR:</span>
                <input
                  type="number"
                  value={rates.IRR}
                  onChange={(e) => handleUpdateRate("IRR", Number(e.target.value))}
                  className="w-24 bg-transparent text-white text-right outline-none font-bold"
                />
              </label>

              <label className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">AED:</span>
                <input
                  type="number"
                  value={rates.AED}
                  onChange={(e) => handleUpdateRate("AED", Number(e.target.value))}
                  className="w-16 bg-transparent text-white text-right outline-none font-bold"
                />
              </label>

              <label className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">EUR:</span>
                <input
                  type="number"
                  value={rates.EUR}
                  onChange={(e) => handleUpdateRate("EUR", Number(e.target.value))}
                  className="w-16 bg-transparent text-white text-right outline-none font-bold"
                />
              </label>

              <label className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">PKR:</span>
                <input
                  type="number"
                  value={rates.PKR}
                  onChange={(e) => handleUpdateRate("PKR", Number(e.target.value))}
                  className="w-16 bg-transparent text-white text-right outline-none font-bold"
                />
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRates}
                className="h-7 px-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Defaults
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
