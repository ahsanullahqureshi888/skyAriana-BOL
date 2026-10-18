"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export interface ReportColumnDef<T> {
  id: string
  header: string
  accessor?: (row: T) => string | number | boolean | null | undefined
  cell?: (row: T, index: number) => React.ReactNode
  align?: "left" | "center" | "right"
  sortable?: boolean
  defaultHidden?: boolean
  className?: string
  headerClassName?: string
  minWidth?: string
}

export interface SummaryMetricPill {
  label: string
  value: string | number
  color?: "blue" | "emerald" | "amber" | "purple" | "slate" | "cyan"
}

interface ReportDataTableProps<T> {
  data: T[]
  columns: ReportColumnDef<T>[]
  defaultSortColumn?: string
  defaultSortDirection?: "asc" | "desc"
  searchPlaceholder?: string
  searchFilter?: (row: T, query: string) => boolean
  onRowClick?: (row: T) => void
  summaryMetrics?: SummaryMetricPill[]
  emptyMessage?: string
  renderMobileCard?: (row: T, index: number) => React.ReactNode
  pageSizeOptions?: number[]
  initialPageSize?: number
  tableAriaLabel?: string
  actions?: React.ReactNode
}

export function ReportDataTable<T extends Record<string, any>>({
  data,
  columns,
  defaultSortColumn,
  defaultSortDirection = "desc",
  searchPlaceholder = "Search in table...",
  searchFilter,
  onRowClick,
  summaryMetrics,
  emptyMessage = "No matching records found.",
  renderMobileCard,
  pageSizeOptions = [25, 50, 100],
  initialPageSize = 25,
  tableAriaLabel = "Report Data Table",
  actions,
}: ReportDataTableProps<T>) {
  // 1. Column visibility state
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(() => {
    const set = new Set<string>()
    columns.forEach((col) => {
      if (!col.defaultHidden) set.add(col.id)
    })
    return set
  })

  // 2. Search state
  const [searchQuery, setSearchQuery] = useState("")

  // 3. Sorting state
  const [sortColumn, setSortColumn] = useState<string | undefined>(
    defaultSortColumn || (columns[0]?.sortable !== false ? columns[0]?.id : undefined)
  )
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultSortDirection)

  // 4. Pagination state
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        if (next.size > 1) next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  // Handle header click for sorting
  const handleSort = useCallback(
    (colId: string) => {
      if (sortColumn === colId) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortColumn(colId)
        setSortDirection("desc")
      }
      setCurrentPage(1)
    },
    [sortColumn]
  )

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data

    const query = searchQuery.trim().toLowerCase()
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, query))
    }

    // Default universal search across all row values
    return data.filter((row) => {
      for (const col of columns) {
        let val: any = undefined
        if (col.accessor) {
          val = col.accessor(row)
        } else if (col.id in row) {
          val = row[col.id]
        }
        if (val !== undefined && val !== null) {
          if (String(val).toLowerCase().includes(query)) return true
        }
      }
      return false
    })
  }, [data, searchQuery, searchFilter, columns])

  // Sorted dataset
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData
    const activeCol = columns.find((c) => c.id === sortColumn)
    if (!activeCol) return filteredData

    const sorted = [...filteredData].sort((a, b) => {
      let aVal: any = activeCol.accessor ? activeCol.accessor(a) : a[sortColumn]
      let bVal: any = activeCol.accessor ? activeCol.accessor(b) : b[sortColumn]

      if (aVal === undefined || aVal === null) aVal = ""
      if (bVal === undefined || bVal === null) bVal = ""

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })

    return sorted
  }, [filteredData, sortColumn, sortDirection, columns])

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Reset to page 1 on search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  // Visible columns definition
  const visibleColumns = useMemo(() => {
    return columns.filter((c) => visibleColumnIds.has(c.id))
  }, [columns, visibleColumnIds])

  return (
    <div className="w-full min-w-0 space-y-3 font-sans">
      {/* 1. TOP TOOLBAR: SUMMARY METRICS + SEARCH & COLUMN CONTROLS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Metric pills */}
        {summaryMetrics && summaryMetrics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {summaryMetrics.map((pill, idx) => {
              const colorClasses =
                pill.color === "emerald"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : pill.color === "amber"
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : pill.color === "purple"
                  ? "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  : pill.color === "cyan"
                  ? "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
                  : pill.color === "slate"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"

              return (
                <div
                  key={`${pill.label}-${idx}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${colorClasses}`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-75 font-bold">
                    {pill.label}:
                  </span>
                  <span className="font-mono font-black">{pill.value}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Search input + Column selector + Extra Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto w-full lg:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-7 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Column selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shrink-0"
                title="Toggle Columns"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Columns</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1 shadow-lg font-sans">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                Visible Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumnIds.has(col.id)}
                  onCheckedChange={() => toggleColumnVisibility(col.id)}
                  className="text-xs font-medium cursor-pointer"
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {actions}
        </div>
      </div>

      {/* 2. TABLE CONTAINER WITH LOCAL HORIZONTAL SCROLL & STICKY HEADER */}
      <div className="w-full min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {/* Mobile card view (optional fallback on small screens) */}
        {renderMobileCard && (
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-270px)] overflow-y-auto">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <div
                  key={idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 p-3" : "p-3"}
                >
                  {renderMobileCard(row, idx)}
                </div>
              ))
            ) : (
              <div className="py-12 px-4 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                {emptyMessage}
              </div>
            )}
          </div>
        )}

        {/* Desktop & default full table view with local horizontal scroll */}
        <div
          className={`${renderMobileCard ? "hidden sm:block" : "block"} w-full overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin`}
        >
          <table
            aria-label={tableAriaLabel}
            className="w-full text-xs text-left border-collapse min-w-[700px]"
          >
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr>
                {visibleColumns.map((col) => {
                  const isCurrentSort = sortColumn === col.id
                  const isSortable = col.sortable !== false

                  return (
                    <th
                      key={col.id}
                      onClick={() => isSortable && handleSort(col.id)}
                      style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                      className={`py-2.5 px-3 font-black text-slate-900 dark:text-slate-100 select-none ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${isSortable ? "cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors" : ""} ${
                        col.headerClassName || ""
                      }`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === "right"
                            ? "flex-row-reverse"
                            : col.align === "center"
                            ? "justify-center"
                            : "justify-start"
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="shrink-0 text-slate-400 dark:text-slate-500">
                            {isCurrentSort ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => {
                  return (
                    <tr
                      key={row.id || rowIdx}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`transition-colors ${
                        onRowClick
                          ? "hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {visibleColumns.map((col) => {
                        let content: React.ReactNode = null
                        if (col.cell) {
                          content = col.cell(row, rowIdx)
                        } else if (col.accessor) {
                          const val = col.accessor(row)
                          content = val !== undefined && val !== null ? String(val) : "—"
                        } else if (col.id in row) {
                          const val = row[col.id]
                          content = val !== undefined && val !== null ? String(val) : "—"
                        }

                        return (
                          <td
                            key={col.id}
                            className={`py-2 px-3 text-slate-800 dark:text-slate-200 ${
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            } ${col.className || ""}`}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium text-xs"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. PAGINATION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs">
          {/* Entries count info */}
          <div className="text-slate-500 dark:text-slate-400 font-medium">
            Showing{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold font-mono text-slate-950 dark:text-slate-100">
              {sortedData.length.toLocaleString()}
            </span>{" "}
            entries
            {searchQuery && (
              <span className="text-slate-400 dark:text-slate-500 ml-1.5">
                (filtered from {data.length.toLocaleString()} total)
              </span>
            )}
          </div>

          {/* Controls: page size + next/prev */}
          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev & Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 text-slate-600 dark:text-slate-300 font-bold">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
