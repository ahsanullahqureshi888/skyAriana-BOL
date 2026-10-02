"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
export const A4_WIDTH_PX = (210 * 96) / 25.4 // ~793.7008 px (210mm at 96 DPI)
export const A4_HEIGHT_PX = (297 * 96) / 25.4 // ~1122.5197 px (297mm at 96 DPI)
export const SAFE_PADDING_PX = 16

export type PreviewMode = "page" | "width" | "manual"

// Discrete standardized zoom ladder (40% to 200%)
export const ZOOM_LADDER = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0]
export const MIN_SCALE = 0.4
export const MAX_SCALE = 2.0

const SESSION_STORAGE_KEY = "aq_bol_preview_mode_pref_v2"

/**
 * Resets scrollTop and scrollLeft across all parent scroll containers up to window/body
 * to prevent stale scroll offsets from the Form tab displacing the A4 preview.
 */
export function resetAllParentScrolls(viewportEl?: HTMLElement | null) {
  if (typeof window === "undefined") return
  window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  if (document.documentElement) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollLeft = 0
  }
  if (document.body) {
    document.body.scrollTop = 0
    document.body.scrollLeft = 0
  }

  // Reset any ancestor elements up to document body
  let el = viewportEl?.parentElement
  while (el && el !== document.body) {
    if (el.scrollTop !== 0) el.scrollTop = 0
    if (el.scrollLeft !== 0) el.scrollLeft = 0
    el = el.parentElement
  }

  // Ensure main workspace explicitly resets scroll
  const mainWorkspace = document.querySelector('[data-main-workspace="true"]') as HTMLElement | null
  if (mainWorkspace && mainWorkspace.scrollTop !== 0) {
    mainWorkspace.scrollTop = 0
    mainWorkspace.scrollLeft = 0
  }
}

export function useA4PreviewScale(active: boolean, pageCount: number = 1) {
  const viewportRef = useRef<HTMLDivElement>(null)

  // Initialize with session preference or default to "manual" (100% Zoom / 1:1 scale)
  const [previewMode, setPreviewModeState] = useState<PreviewMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        if (saved === "page" || saved === "width" || saved === "manual") {
          return saved as PreviewMode
        }
      } catch {}
    }
    return "manual"
  })

  const [manualScale, setScale] = useState(1.0)
  const [fit, setFit] = useState({ page: 0.65, width: 1.0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScaleReady, setIsScaleReady] = useState(true)
  const [verticalPadding, setVerticalPadding] = useState(8)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [debugMetrics, setDebugMetrics] = useState({
    viewportW: 0,
    viewportH: 0,
    stageW: 0,
    stageH: 0,
    overflowX: 0,
    overflowY: 0,
    docTopRel: 0,
    docBottomRel: 0,
  })

  // Remember pre-fullscreen mode to restore context on exit
  const preFullscreenMode = useRef<PreviewMode>(previewMode)

  const safePageCount = Math.max(1, pageCount)
  const totalUnscaledHeight =
    safePageCount > 1
      ? safePageCount * A4_HEIGHT_PX + (safePageCount - 1) * 24
      : A4_HEIGHT_PX

  // Set mode with session persistence and scroll reset
  const setPreviewMode = useCallback((mode: PreviewMode) => {
    setPreviewModeState(mode)
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, mode)
      } catch {}
    }

    requestAnimationFrame(() => {
      resetAllParentScrolls(viewportRef.current)
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" })
      }
    })
  }, [])

  // Calculate scales based on actual measured viewport dimensions and canonical A4 dimensions
  const calculateScales = useCallback(() => {
    const viewer = viewportRef.current || (typeof document !== "undefined" ? (document.querySelector("[data-a4-viewport]") as HTMLDivElement | null) : null)
    if (!viewer) return
    if (!viewportRef.current && viewer) {
      (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = viewer
    }

    // Never measure when hidden / collapsed
    if (viewer.clientWidth <= 0 || viewer.clientHeight <= 0) return

    const style = window.getComputedStyle(viewer)
    const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
    const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)

    // Breathing clearance so paper border and shadow fit with zero clipping
    const clearanceX = 16
    const clearanceY = 16
    const availableWidth = Math.max(100, Math.floor(viewer.clientWidth - padX - clearanceX))
    const availableHeight = Math.max(100, Math.floor(viewer.clientHeight - padY - clearanceY))

    // Fit Page calculation (Section 10):
    // scaleX = availableWidth / baseA4Width
    // scaleY = availableHeight / baseA4Height
    // fitScale = Math.min(scaleX, scaleY)
    const scaleX = availableWidth / A4_WIDTH_PX
    const scaleY = availableHeight / A4_HEIGHT_PX
    const rawPageScale = Math.min(scaleX, scaleY)
    // Floor to 3 decimal places to prevent subpixel overflow
    const pageScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.floor(rawPageScale * 1000) / 1000))

    // Fit Width calculation: snugly fits 210mm document width into available width
    const rawWidthScale = availableWidth / A4_WIDTH_PX
    const widthScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.floor(rawWidthScale * 1000) / 1000))

    const activeComputedScale =
      previewMode === "page" ? pageScale : previewMode === "width" ? widthScale : manualScale

    const scaledW = Math.floor(A4_WIDTH_PX * activeComputedScale)
    const scaledH = Math.floor(
      (previewMode === "page" || safePageCount <= 1 ? A4_HEIGHT_PX : totalUnscaledHeight) *
        activeComputedScale
    )

    const overX = Math.max(0, scaledW - availableWidth)
    const overY = previewMode === "page" ? Math.max(0, scaledH - availableHeight) : 0

    // Vertical padding to center document when smaller than viewport, but NEVER negative
    const vertPadding = previewMode === "page"
      ? Math.max(8, Math.floor((availableHeight - scaledH) / 2))
      : 8
    setVerticalPadding((prev) => (prev === vertPadding ? prev : vertPadding))

    // Measure document top/bottom relative to viewport for diagnostics (Section 32)
    const viewerRect = viewer.getBoundingClientRect()
    const stageEl = viewer.querySelector("[data-a4-stage='true']") as HTMLElement | null
    const stageRect = stageEl ? stageEl.getBoundingClientRect() : null
    const docTopRel = stageRect ? stageRect.top - viewerRect.top : 0
    const docBottomRel = stageRect ? stageRect.bottom - viewerRect.top : 0

    if (showDiagnostics) {
      setDebugMetrics((prev) => {
        if (
          prev.viewportW === viewer.clientWidth &&
          prev.viewportH === viewer.clientHeight &&
          prev.stageW === scaledW &&
          prev.stageH === scaledH &&
          prev.overflowX === overX &&
          prev.overflowY === overY
        ) {
          return prev
        }
        return {
          viewportW: viewer.clientWidth,
          viewportH: viewer.clientHeight,
          stageW: scaledW,
          stageH: scaledH,
          overflowX: overX,
          overflowY: overY,
          docTopRel: Math.round(docTopRel * 10) / 10,
          docBottomRel: Math.round(docBottomRel * 10) / 10,
        }
      })
    }

    // Development Diagnostics & Invariance Assertions (Section 32, 33, 34)
    if (process.env.NODE_ENV !== "production" && showDiagnostics) {
      console.debug(
        `[A4 PREVIEW DEBUG]\n` +
        `Mode: ${previewMode}\n` +
        `Viewport width: ${viewer.clientWidth}px\n` +
        `Viewport height: ${viewer.clientHeight}px\n` +
        `Base A4 width: ${A4_WIDTH_PX.toFixed(2)}px\n` +
        `Base A4 height: ${A4_HEIGHT_PX.toFixed(2)}px\n` +
        `Preview scale: ${(activeComputedScale * 100).toFixed(1)}%\n` +
        `Scaled width: ${scaledW}px\n` +
        `Scaled height: ${scaledH}px\n` +
        `Stage width: ${scaledW}px\n` +
        `Stage height: ${scaledH}px\n` +
        `Viewport scrollTop: ${viewer.scrollTop}\n` +
        `Viewport scrollHeight: ${viewer.scrollHeight}\n` +
        `Viewport clientHeight: ${viewer.clientHeight}\n` +
        `Transform: scale(${activeComputedScale})\n` +
        `Transform origin: top left\n` +
        `Document top relative to viewport: ${docTopRel.toFixed(1)}px\n` +
        `Document bottom relative to viewport: ${docBottomRel.toFixed(1)}px`
      )

      if (previewMode === "page" && stageRect) {
        if (docTopRel < -1) {
          console.error(`[A4 PREVIEW ASSERTION ERROR] A4 PAGE ABOVE VIEWPORT: docTopRel=${docTopRel.toFixed(1)}px`)
        }
        if (docBottomRel > viewerRect.height + 2) {
          console.error(`[A4 PREVIEW ASSERTION ERROR] A4 PAGE BELOW VIEWPORT: docBottomRel=${docBottomRel.toFixed(1)}px, viewerH=${viewerRect.height}px`)
        }
        if (viewer.scrollHeight > viewer.clientHeight + 4) {
          console.warn(`[A4 PREVIEW ASSERTION WARNING] FIT PAGE HAS UNEXPECTED SCROLL: scrollHeight=${viewer.scrollHeight}, clientHeight=${viewer.clientHeight}`)
        }
      }
    }

    setFit((prev) => {
      if (Math.abs(prev.page - pageScale) < 0.001 && Math.abs(prev.width - widthScale) < 0.001) {
        return prev
      }
      return { page: pageScale, width: widthScale }
    })

    setIsScaleReady(true)
  }, [previewMode, manualScale, safePageCount, totalUnscaledHeight, showDiagnostics])

  // Active scale based on current mode
  const activeScale = previewMode === "manual" ? manualScale : fit[previewMode]

  // Zoom stepper logic through standardized ZOOM_LADDER
  const zoomIn = useCallback(() => {
    const current = previewMode === "manual" ? manualScale : fit[previewMode]
    const nextStep = ZOOM_LADDER.find((step) => step > current + 0.015) ?? MAX_SCALE
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(nextStep * 100) / 100))
    setScale(target)
    setPreviewMode("manual")
  }, [previewMode, manualScale, fit, setPreviewMode])

  const zoomOut = useCallback(() => {
    const current = previewMode === "manual" ? manualScale : fit[previewMode]
    const reversed = [...ZOOM_LADDER].reverse()
    const prevStep = reversed.find((step) => step < current - 0.015) ?? MIN_SCALE
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(prevStep * 100) / 100))
    setScale(target)
    setPreviewMode("manual")
  }, [previewMode, manualScale, fit, setPreviewMode])

  // Fullscreen lifecycle: save context when entering, recalculate, restore when exiting (Section 28)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev
      if (next) {
        preFullscreenMode.current = previewMode
        setPreviewModeState("page")
      } else {
        setPreviewModeState(preFullscreenMode.current)
      }
      return next
    })
  }, [previewMode])

  const calculateScalesRef = useRef(calculateScales)
  calculateScalesRef.current = calculateScales

  // Lifecycle on preview activation & ResizeObserver (Section 11 & 12)
  useEffect(() => {
    if (!active) return

    const getViewer = () =>
      viewportRef.current ||
      (typeof document !== "undefined" ? (document.querySelector("[data-a4-viewport]") as HTMLDivElement | null) : null)

    const viewer = getViewer()
    if (viewer && !viewportRef.current) {
      (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = viewer
    }

    if (viewer) {
      resetAllParentScrolls(viewer)
      viewer.scrollTop = 0
      viewer.scrollLeft = 0
    }

    // Wait until layout is visible and stable (Section 11)
    let raf1: number
    let raf2: number
    raf1 = requestAnimationFrame(() => {
      const v = getViewer()
      if (v) resetAllParentScrolls(v)
      raf2 = requestAnimationFrame(() => {
        calculateScalesRef.current()
        const v2 = getViewer()
        if (v2) {
          resetAllParentScrolls(v2)
          v2.scrollTop = 0
          v2.scrollLeft = 0
        }
      })
    })

    // Immediate calibration bursts to ensure accurate scaling after tab transitions
    const timer = setInterval(() => {
      calculateScalesRef.current()
    }, 140)
    const timeout = setTimeout(() => {
      clearInterval(timer)
    }, 560)

    if (typeof document !== "undefined" && document.fonts) {
      void document.fonts.ready.then(() => {
        calculateScalesRef.current()
      })
    }

    // Observe ONLY the viewport container to avoid observer loops (Section 12)
    let rafResize: number | null = null
    let observer: ResizeObserver | null = null
    const targetEl = getViewer()
    if (targetEl) {
      observer = new ResizeObserver(() => {
        if (rafResize !== null) cancelAnimationFrame(rafResize)
        rafResize = requestAnimationFrame(() => {
          calculateScalesRef.current()
        })
      })
      observer.observe(targetEl)
    }

    const handleWindowResize = () => {
      calculateScalesRef.current()
    }

    window.addEventListener("resize", handleWindowResize)
    window.addEventListener("orientationchange", handleWindowResize)

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearInterval(timer)
      clearTimeout(timeout)
      if (rafResize !== null) cancelAnimationFrame(rafResize)
      if (observer) observer.disconnect()
      window.removeEventListener("resize", handleWindowResize)
      window.removeEventListener("orientationchange", handleWindowResize)
    }
  }, [active, isFullscreen, previewMode])

  // Mouse wheel zoom: Ctrl + Wheel zooms document, normal wheel scrolls
  useEffect(() => {
    const viewer = viewportRef.current
    if (!active || !viewer) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else if (e.deltaY > 0) {
          zoomOut()
        }
      }
    }

    viewer.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewer.removeEventListener("wheel", handleWheel)
  }, [active, zoomIn, zoomOut])

  // Reset scroll and recompute on mode change (Section 4 & 19)
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0
      viewportRef.current.scrollLeft = 0
    }
    resetAllParentScrolls(viewportRef.current)
    if (active) {
      calculateScales()
    }
  }, [previewMode, active, calculateScales])

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return
      }

      // Ctrl/Cmd + 0 -> Fit Page (Ctrl + Shift + 0 -> Fit Width)
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        if (e.shiftKey) {
          setPreviewMode("width")
        } else {
          setPreviewMode("page")
        }
      }
      // Ctrl/Cmd + 1 -> 100% actual size
      else if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault()
        setScale(1.0)
        setPreviewMode("manual")
      }
      // Zoom In (+ or = or Ctrl +)
      else if (e.key === "+" || ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+"))) {
        e.preventDefault()
        zoomIn()
      }
      // Zoom Out (- or _ or Ctrl -)
      else if (e.key === "-" || ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_"))) {
        e.preventDefault()
        zoomOut()
      }
      // Esc -> Exit fullscreen
      else if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false)
          setPreviewModeState(preFullscreenMode.current)
        }
      }
      // Ctrl + Shift + X -> Toggle Diagnostics Overlay
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault()
        setShowDiagnostics((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [active, isFullscreen, zoomIn, zoomOut, setPreviewMode])

  const currentDocHeight =
    previewMode === "page" || safePageCount <= 1 ? A4_HEIGHT_PX : totalUnscaledHeight

  return {
    viewportRef,
    previewMode,
    setPreviewMode,
    previewScale: activeScale,
    setManualScale: (scale: number) => {
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale * 100) / 100)))
      setPreviewMode("manual")
    },
    zoomIn,
    zoomOut,
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    isScaleReady,
    showDiagnostics,
    setShowDiagnostics,
    debugMetrics,
    stageWidth: Math.floor(A4_WIDTH_PX * activeScale),
    stageHeight: Math.floor(currentDocHeight * activeScale),
    verticalPadding,
    totalUnscaledHeight,
    calculateScales,
  }
}
