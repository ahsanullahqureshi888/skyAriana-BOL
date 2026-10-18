"use client"

import React from "react"

interface ShipmentFilesSkeletonProps {
  bolNumber?: string
}

export function ShipmentFilesSkeleton({ bolNumber }: ShipmentFilesSkeletonProps) {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Loading shipment files">
      {/* Shipment Folder Banner Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10 border border-blue-200/80 dark:border-blue-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="h-11 w-11 rounded-2xl bg-blue-200 dark:bg-blue-900/50 shrink-0" />
          <div className="space-y-2 flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="h-4 w-36 bg-slate-300 dark:bg-slate-700 rounded-md" />
              {bolNumber ? (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {bolNumber}
                </span>
              ) : (
                <div className="h-4 w-20 bg-blue-200 dark:bg-blue-900/60 rounded-md" />
              )}
            </div>
            <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-36 bg-blue-400/50 dark:bg-blue-800/50 rounded-xl" />
        </div>
      </div>

      {/* Checklist Skeleton */}
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-48 bg-amber-300/70 dark:bg-amber-800/50 rounded-md" />
          <div className="h-3 w-16 bg-amber-200 dark:bg-amber-900/40 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2"
            >
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-2 w-14 bg-amber-200 dark:bg-amber-900/40 rounded" />
              </div>
              <div className="h-6 w-14 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Structured Category Folder Skeletons */}
      <div className="space-y-3">
        {[
          { name: "Shipping Documents", open: true, count: 2 },
          { name: "Customs & Transit Documents", open: false, count: 1 },
          { name: "Commercial Invoices & Packing Lists", open: false, count: 1 },
          { name: "Official Certificates", open: false, count: 0 },
        ].map((folder, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
          >
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 bg-slate-300 dark:bg-slate-700 rounded" />
                <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                  {folder.name}
                </span>
                <span className="h-4 px-2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-transparent">
                  {folder.count}
                </span>
              </div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>

            {folder.open && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2].map((fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-5 w-5 bg-blue-100 dark:bg-blue-900/50 rounded" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-2 w-1/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full" />
                    </div>
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-2.5 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
