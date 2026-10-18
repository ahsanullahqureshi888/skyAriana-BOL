"use client"

import React from "react"
import { Sliders, Loader2 } from "lucide-react"

/**
 * BolSettingsSkeleton
 * 
 * Lightweight, zero-dependency skeleton placeholder for the Document Configuration Center.
 * Renders in < 3ms to guarantee < 16ms Interaction to Next Paint (INP) when switching tabs.
 */
export function BolSettingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse select-none" aria-busy="true" aria-label="Loading document configuration settings">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column Skeleton (Controls & Settings Tabs) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="bg-white/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden p-4 sm:p-5">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-600 flex items-center justify-center">
                  <Sliders className="h-4.5 w-4.5 opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-52 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-72 bg-slate-100 dark:bg-slate-800 rounded-md hidden sm:block" />
                </div>
              </div>
              <div className="h-6 w-28 bg-blue-100/60 dark:bg-blue-950/60 rounded-full" />
            </div>

            {/* Sub-tab Navigation Strip */}
            <div className="flex items-center gap-1 overflow-x-auto pt-3 pb-1 border-t border-slate-200/40 dark:border-slate-800/40 mt-3 no-scrollbar">
              {[
                { name: "Watermark", w: "w-20" },
                { name: "Logo & Branding", w: "w-28" },
                { name: "Stamp & Signature", w: "w-32" },
                { name: "General Profile", w: "w-24" },
                { name: "PDF & Print", w: "w-20" },
                { name: "Defaults", w: "w-16" },
                { name: "Backup", w: "w-16" },
              ].map((tab, idx) => (
                <div
                  key={tab.name}
                  className={`h-7 ${tab.w} rounded-lg ${
                    idx === 0
                      ? "bg-blue-600/30 dark:bg-blue-600/40"
                      : "bg-slate-100 dark:bg-slate-800/60"
                  } shrink-0`}
                />
              ))}
            </div>

            {/* Content Area: Watermark Panel Mockup */}
            <div className="mt-4 space-y-4">
              {/* Opacity Bar Mockup */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 p-4 text-white">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-20 w-16 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0" />
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-slate-700 rounded" />
                      <div className="h-3 w-28 bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="w-full lg:w-64 space-y-2">
                    <div className="h-3 w-24 bg-slate-800 rounded" />
                    <div className="h-2 w-full bg-slate-800 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <div
                    key={idx}
                    className="h-36 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2 flex flex-col justify-between"
                  >
                    <div className="h-24 rounded-lg bg-slate-200/60 dark:bg-slate-800/50" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Skeleton (Sticky Live A4 Preview) */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-3.5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="h-4 w-36 bg-slate-800 rounded" />
              <div className="h-5 w-20 bg-slate-800 rounded" />
            </div>
            <div className="aspect-[210/297] w-full rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-center p-6 space-y-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-xs font-mono text-slate-400 font-bold">Initializing Settings Preview…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
