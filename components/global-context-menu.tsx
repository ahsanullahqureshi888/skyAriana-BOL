"use client"

import * as React from "react"
import {
  Scissors,
  Copy,
  ClipboardPaste,
  CheckSquare,
  Undo2,
  Redo2,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import {
  copyToClipboard,
  pasteTextIntoTarget,
  cutSelectionFromTarget,
  selectAllInTarget,
  triggerUndo,
  triggerRedo,
} from "@/lib/services/clipboard-service"

interface ContextTargetState {
  target: HTMLElement
  isInput: boolean
  isEditable: boolean
  isReadOnly: boolean
  isDisabled: boolean
  hasSelection: boolean
  selectedText: string
  isPassword?: boolean
  selectionStart?: number
  selectionEnd?: number
  cellText?: string
  isTableCell?: boolean
  canCut: boolean
  canCopy: boolean
  canPaste: boolean
  canSelectAll: boolean
  canUndo: boolean
  canRedo: boolean
}

export function GlobalContextMenu() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [targetState, setTargetState] = React.useState<ContextTargetState | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const closeMenu = React.useCallback(() => {
    setIsOpen(false)
    setTargetState(null)
  }, [])

  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow developers or users holding Alt or Shift to bypass custom context menu if desired
      if (e.shiftKey || e.altKey) {
        closeMenu()
        return
      }

      const rawTarget = e.target as HTMLElement | null
      if (!rawTarget) return

      // Don't interfere if an element explicitly opts out with data-no-context-menu
      if (rawTarget.closest("[data-no-context-menu]")) {
        return
      }

      // 1. Detect if target is an input or textarea
      const inputEl = (
        rawTarget instanceof HTMLInputElement || rawTarget instanceof HTMLTextAreaElement
          ? rawTarget
          : rawTarget.closest("input, textarea")
      ) as HTMLInputElement | HTMLTextAreaElement | null

      const isContentEditable = rawTarget.isContentEditable || !!rawTarget.closest("[contenteditable='true']")
      const activeEl = inputEl || (isContentEditable ? rawTarget : null)

      let isInput = false
      let isEditable = false
      let isReadOnly = false
      let isDisabled = false
      let hasSelection = false
      let selectedText = ""
      let isPassword = false
      let selectionStart = 0
      let selectionEnd = 0
      let cellText = ""
      let isTableCell = false

      if (inputEl) {
        isInput = true
        isPassword = inputEl.type === "password"
        isReadOnly = inputEl.readOnly
        isDisabled = inputEl.disabled
        isEditable = !isReadOnly && !isDisabled

        selectionStart = inputEl.selectionStart ?? 0
        selectionEnd = inputEl.selectionEnd ?? 0
        if (selectionStart !== selectionEnd) {
          hasSelection = true
          selectedText = inputEl.value.substring(selectionStart, selectionEnd)
        }
      } else if (isContentEditable) {
        isEditable = true
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) {
          hasSelection = true
          selectedText = sel.toString()
        }
      } else {
        // Non-input element: check window text selection
        const sel = window.getSelection()
        const text = sel ? sel.toString().trim() : ""
        if (text) {
          hasSelection = true
          selectedText = text
        }

        // Check if inside a table cell, data-cell, or card with text content
        const cell = rawTarget.closest("td, th, [data-cell], [role='gridcell'], [role='cell']") as HTMLElement | null
        if (cell) {
          isTableCell = true
          cellText = cell.innerText?.trim() || cell.textContent?.trim() || ""
        }
      }

      // Check if user clicked on readable text (e.g. document notes, labels, previews)
      if (!isInput && !hasSelection && !isTableCell) {
        const text = rawTarget.innerText?.trim() || rawTarget.textContent?.trim() || ""
        // If target has reasonable concise text (under 500 chars) and isn't the whole page body
        if (text && text.length < 500 && rawTarget !== document.body) {
          cellText = text
        }
      }

      // Determine capabilities
      const canCut = isEditable && hasSelection && !isPassword
      const canCopy = (hasSelection || !!cellText) && !isPassword
      const canPaste = isEditable
      const canSelectAll = isInput
        ? (inputEl?.value?.length ?? 0) > 0
        : hasSelection || !!cellText || isTableCell
      const canUndo = isEditable
      const canRedo = isEditable

      // If no valid actions are available at all (e.g. clicking on empty background), don't open
      if (!isInput && !hasSelection && !cellText && !isTableCell) {
        closeMenu()
        return
      }

      e.preventDefault()

      // Calculate position clamped to viewport
      const menuWidth = 210
      const menuHeight = isInput ? 240 : 130
      const padding = 12

      let x = e.clientX
      let y = e.clientY

      if (x + menuWidth > window.innerWidth - padding) {
        x = Math.max(padding, x - menuWidth)
      }
      if (y + menuHeight > window.innerHeight - padding) {
        y = Math.max(padding, y - menuHeight)
      }

      setPosition({ x, y })
      setTargetState({
        target: (activeEl || rawTarget) as HTMLElement,
        isInput,
        isEditable,
        isReadOnly,
        isDisabled,
        hasSelection,
        selectedText,
        isPassword,
        selectionStart,
        selectionEnd,
        cellText,
        isTableCell,
        canCut,
        canCopy,
        canPaste,
        canSelectAll,
        canUndo,
        canRedo,
      })
      setIsOpen(true)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu()
      }
    }

    const handleWindowChange = () => {
      closeMenu()
    }

    document.addEventListener("contextmenu", handleContextMenu, { capture: true })
    window.addEventListener("mousedown", handleClickOutside, { capture: true })
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", handleWindowChange, { passive: true })
    window.addEventListener("resize", handleWindowChange, { passive: true })

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true })
      window.removeEventListener("mousedown", handleClickOutside, { capture: true })
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleWindowChange)
      window.removeEventListener("resize", handleWindowChange)
    }
  }, [closeMenu])

  // Context Menu Action Handlers
  const handleCut = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canCut) return
    const { target, selectedText } = targetState
    closeMenu()

    const ok = await cutSelectionFromTarget(target, selectedText)
    if (ok) {
      toast.success("Cut to clipboard", { duration: 1500 })
    } else {
      toast.error("Cut operation failed", { duration: 2000 })
    }
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canCopy) return
    const { selectedText, cellText } = targetState
    closeMenu()

    const textToCopy = selectedText || cellText || ""
    if (!textToCopy) return

    const ok = await copyToClipboard(textToCopy)
    if (ok) {
      toast.success("Copied to clipboard", { duration: 1500 })
    } else {
      toast.error("Copy operation failed", { duration: 2000 })
    }
  }

  const handlePaste = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canPaste) return
    const { target, selectionStart, selectionEnd } = targetState
    closeMenu()

    // Restore cursor position if was input
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      target.focus()
      if (selectionStart !== undefined && selectionEnd !== undefined) {
        try {
          target.setSelectionRange(selectionStart, selectionEnd)
        } catch {}
      }
    }

    const ok = await pasteTextIntoTarget(target)
    if (ok) {
      toast.success("Pasted from clipboard", { duration: 1500 })
    } else {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
      const shortcutKey = isMac ? "⌘+V" : "Ctrl+V"
      toast(`Press ${shortcutKey} to paste here`, {
        icon: "📋",
        description: "Browser requires keyboard shortcut for clipboard security.",
        duration: 3000,
      })
    }
  }

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canSelectAll) return
    const { target } = targetState
    closeMenu()
    selectAllInTarget(target)
  }

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canUndo) return
    const { target } = targetState
    closeMenu()
    triggerUndo(target)
  }

  const handleRedo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!targetState?.canRedo) return
    const { target } = targetState
    closeMenu()
    triggerRedo(target)
  }

  if (!isOpen || !targetState) return null

  const isInputContext = targetState.isInput || targetState.isEditable

  return (
    <div
      ref={menuRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="fixed z-[999999] min-w-[200px] w-max select-none rounded-xl border border-slate-200/90 bg-white/95 p-1.5 text-slate-800 shadow-2xl backdrop-blur-md transition-all animate-in fade-in-0 zoom-in-95 duration-100 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. EDIT ACTIONS */}
      {isInputContext ? (
        <>
          <MenuItem
            icon={<Scissors className="h-4 w-4" />}
            label="Cut"
            shortcut="Ctrl+X"
            disabled={!targetState.canCut}
            onClick={handleCut}
          />
          <MenuItem
            icon={<Copy className="h-4 w-4" />}
            label="Copy"
            shortcut="Ctrl+C"
            disabled={!targetState.canCopy}
            onClick={handleCopy}
          />
          <MenuItem
            icon={<ClipboardPaste className="h-4 w-4" />}
            label="Paste"
            shortcut="Ctrl+V"
            disabled={!targetState.canPaste}
            onClick={handlePaste}
          />

          <MenuSeparator />

          {/* 2. SELECTION */}
          <MenuItem
            icon={<CheckSquare className="h-4 w-4" />}
            label="Select All"
            shortcut="Ctrl+A"
            disabled={!targetState.canSelectAll}
            onClick={handleSelectAll}
          />

          <MenuSeparator />

          {/* 3. HISTORY */}
          <MenuItem
            icon={<Undo2 className="h-4 w-4" />}
            label="Undo"
            shortcut="Ctrl+Z"
            disabled={!targetState.canUndo}
            onClick={handleUndo}
          />
          <MenuItem
            icon={<Redo2 className="h-4 w-4" />}
            label="Redo"
            shortcut="Ctrl+Y"
            disabled={!targetState.canRedo}
            onClick={handleRedo}
          />
        </>
      ) : (
        <>
          {/* Read-only / Table / Text Selection Context */}
          <MenuItem
            icon={<Copy className="h-4 w-4" />}
            label={targetState.hasSelection ? "Copy" : targetState.isTableCell ? "Copy Cell Text" : "Copy Text"}
            shortcut="Ctrl+C"
            disabled={!targetState.canCopy}
            onClick={handleCopy}
          />
          <MenuItem
            icon={<CheckSquare className="h-4 w-4" />}
            label="Select All"
            shortcut="Ctrl+A"
            disabled={!targetState.canSelectAll}
            onClick={handleSelectAll}
          />
        </>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  shortcut,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-35"
          : "cursor-pointer hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white"
      }`}
    >
      <span className="shrink-0 text-slate-500 transition-colors group-hover:text-white dark:text-slate-400">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="ml-auto font-mono text-[10px] tracking-wider opacity-50 group-hover:opacity-90">
          {shortcut}
        </span>
      )}
    </button>
  )
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
}
