"use client"

import { useEffect, useState, useCallback, useRef } from "react"

export interface OverflowDiagnostic {
  tagName: string
  identifier: string
  className: string
  clientWidth: number
  scrollWidth: number
  overflowAmount: number
  rectWidth: number
}

/**
 * UI Overflow Detector
 * Scans the live DOM for elements causing horizontal overflow (scrollWidth > clientWidth)
 * Logs [UI OVERFLOW] reports and provides a non-intrusive development inspector.
 */
export function UiOverflowDetector() {
  const [overflows, setOverflows] = useState<OverflowDiagnostic[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [viewportMetrics, setViewportMetrics] = useState({
    windowW: 0,
    windowH: 0,
    bodyClientW: 0,
    bodyScrollW: 0,
    docClientW: 0,
    docScrollW: 0,
    hasBodyHorizontalScroll: false,
  })

  const auditDom = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    const docEl = document.documentElement
    const body = document.body

    const windowW = window.innerWidth
    const windowH = window.innerHeight
    const bodyClientW = body ? body.clientWidth : 0
    const bodyScrollW = body ? body.scrollWidth : 0
    const docClientW = docEl.clientWidth
    const docScrollW = docEl.scrollWidth
    const hasBodyHorizontalScroll = docScrollW > docClientW + 1 || bodyScrollW > bodyClientW + 1

    setViewportMetrics({
      windowW,
      windowH,
      bodyClientW,
      bodyScrollW,
      docClientW,
      docScrollW,
      hasBodyHorizontalScroll,
    })

    const found: OverflowDiagnostic[] = []
    const allElements = document.querySelectorAll<HTMLElement>("body *")

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i]
      // Skip hidden or zero-size elements
      if (el.offsetWidth === 0 || el.offsetHeight === 0) continue

      // Skip script/style/svg internals
      const tag = el.tagName.toLowerCase()
      if (tag === "script" || tag === "style" || tag === "path" || tag === "defs") continue

      const style = window.getComputedStyle(el)
      // If the element is intentionally a scroll container or clips its contents, it's not leaking overflow
      const overflowX = style.overflowX
      if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden" || overflowX === "clip") continue
      if (style.overflow === "hidden" || style.overflow === "clip") continue
      if (typeof el.className === "string" && (el.className.includes("sr-only") || el.className.includes("truncate"))) continue

      const cw = el.clientWidth
      const sw = el.scrollWidth

      if (sw > cw + 1 && cw > 0) {
        const diff = sw - cw
        // Only consider if overflowing the viewport width or parent container significantly
        if (diff >= 2) {
          const rect = el.getBoundingClientRect()
          const id = el.id ? `#${el.id}` : ""
          const firstClasses = el.className && typeof el.className === "string"
            ? el.className.split(" ").slice(0, 3).join(".")
            : ""
          const identifier = `${tag}${id}${firstClasses ? `.${firstClasses}` : ""}`

          found.push({
            tagName: tag,
            identifier,
            className: typeof el.className === "string" ? el.className : "",
            clientWidth: Math.round(cw),
            scrollWidth: Math.round(sw),
            overflowAmount: Math.round(diff),
            rectWidth: Math.round(rect.width),
          })

          // Diagnostic Console Output matching User Specification
          console.warn(
            `[UI OVERFLOW]\nElement: ${identifier}\nClient Width: ${Math.round(cw)}px\nScroll Width: ${Math.round(sw)}px\nOverflow Amount: ${Math.round(diff)}px`
          )
        }
      }
    }

    setOverflows(found.slice(0, 10)) // Keep top 10 offenders
  }, [])

  useEffect(() => {
    // Check URL for ?debugOverflow=1
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("debugOverflow") === "1" || params.get("debug_overflow") === "1") {
        setIsOpen(true)
        document.documentElement.setAttribute("data-debug-overflow", "true")
      }
    }

    // Run audit after initial render and on resize
    const timer = setTimeout(auditDom, 500)

    let rafId: number | null = null
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(auditDom)
    }

    window.addEventListener("resize", handleResize)

    // Keyboard shortcut: Ctrl + Shift + U toggles UI overflow inspector
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        setIsOpen((prev) => {
          const next = !prev
          if (next) {
            document.documentElement.setAttribute("data-debug-overflow", "true")
          } else {
            document.documentElement.removeAttribute("data-debug-overflow")
          }
          return next
        })
        auditDom()
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearTimeout(timer)
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [auditDom])

  // Only render in development mode
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <>
      {/* Floating Status Pill if Horizontal Overflow Detected */}
      {viewportMetrics.hasBodyHorizontalScroll && !isOpen && (
        <button
          type="button"
          onClick={() => {
            auditDom()
            setIsOpen(true)
          }}
          className="fixed bottom-2 left-2 z-[9999] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-mono font-bold shadow-xl border border-rose-400 animate-bounce cursor-pointer"
          title="Horizontal Overflow Detected! Click to inspect (Ctrl+Shift+U)"
        >
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          <span>UI OVERFLOW: +{viewportMetrics.docScrollW - viewportMetrics.docClientW}px</span>
        </button>
      )}

      {/* Floating Diagnostics Drawer */}
      {isOpen && (
        <div className="fixed bottom-2 left-2 z-[9999] w-[420px] max-w-[95vw] rounded-2xl border border-slate-700 bg-slate-900/98 p-3 text-slate-100 shadow-2xl backdrop-blur-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-bold text-sky-400">
            <span>[UI OVERFLOW DIAGNOSTICS]</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={auditDom}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px]"
              >
                Re-scan
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[10px]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Viewport Specs */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 mb-2 text-[11px]">
            <div>
              <span className="text-slate-400">Window: </span>
              <span className="font-bold text-white">{viewportMetrics.windowW} × {viewportMetrics.windowH}</span>
            </div>
            <div>
              <span className="text-slate-400">Doc Client: </span>
              <span className="font-bold text-white">{viewportMetrics.docClientW}px</span>
            </div>
            <div>
              <span className="text-slate-400">Doc Scroll: </span>
              <span className={`font-bold ${viewportMetrics.hasBodyHorizontalScroll ? "text-rose-400" : "text-emerald-400"}`}>
                {viewportMetrics.docScrollW}px
              </span>
            </div>
            <div>
              <span className="text-slate-400">Page Scrollbar: </span>
              <span className={`font-bold ${viewportMetrics.hasBodyHorizontalScroll ? "text-rose-400" : "text-emerald-400"}`}>
                {viewportMetrics.hasBodyHorizontalScroll ? "DETECTED ❌" : "NONE ✓"}
              </span>
            </div>
          </div>

          {/* List of Overflow Elements */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {overflows.length === 0 ? (
              <p className="text-emerald-400 py-3 text-center font-bold">
                ✓ No horizontal DOM overflows detected!
              </p>
            ) : (
              overflows.map((item, idx) => (
                <div key={idx} className="p-1.5 rounded bg-slate-800/80 border border-slate-700 text-[10.5px]">
                  <div className="text-rose-300 font-bold truncate">{item.identifier}</div>
                  <div className="flex items-center justify-between text-slate-400 mt-0.5">
                    <span>Client: {item.clientWidth}px</span>
                    <span>Scroll: {item.scrollWidth}px</span>
                    <span className="text-rose-400 font-bold">+{item.overflowAmount}px</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center">
            Press Ctrl+Shift+U to toggle
          </div>
        </div>
      )}
    </>
  )
}
