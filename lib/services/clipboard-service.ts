/**
 * AQ COMPANIES — Enterprise Global Clipboard & Text Editing Service
 * Supports Cut, Copy, Paste, Select All, Undo, Redo across all React & Electron modules.
 * Fully compatible with React controlled inputs, multiline textareas, and Arabic/Pashto/Dari Unicode.
 */

/**
 * Copies text to the system clipboard with browser API & legacy fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // 1. Check Electron Desktop bridge
  if (typeof window !== "undefined" && (window as any).skyDesktop?.writeClipboardText) {
    try {
      const ok = await (window as any).skyDesktop.writeClipboardText(text)
      if (ok) return true
    } catch {}
  }

  // 2. Try modern navigator.clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback below
    }
  }

  // 3. Legacy execCommand fallback for unsecure contexts or restricted webviews
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.contain = "strict"
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      textarea.style.top = "-9999px"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand("copy")
      document.body.removeChild(textarea)
      return success
    } catch (err) {
      console.warn("[ClipboardService] execCommand copy failed:", err)
    }
  }

  return false
}

/**
 * Reads text from the system clipboard.
 */
export async function readFromClipboard(): Promise<string | null> {
  // 1. Check Electron Desktop bridge
  if (typeof window !== "undefined" && (window as any).skyDesktop?.readClipboardText) {
    try {
      const text = await (window as any).skyDesktop.readClipboardText()
      if (typeof text === "string") return text
    } catch (err) {
      console.warn("[ClipboardService] Electron clipboard read failed:", err)
    }
  }

  // 2. Modern navigator.clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    try {
      if (typeof document !== "undefined" && !document.hasFocus()) {
        window.focus()
      }
      return await navigator.clipboard.readText()
    } catch (err: any) {
      console.warn("[ClipboardService] navigator.clipboard.readText failed:", err)
      return null
    }
  }
  return null
}

/**
 * Dispatches input and change events so React state management registers the change.
 */
export function updateNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  newValue: string
): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")

  // Reset React internal value tracker to ensure onChange fires
  const tracker = (element as any)._valueTracker
  if (tracker) {
    tracker.setValue(element.value === newValue ? "" : element.value)
  }

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, newValue)
  } else {
    element.value = newValue
  }

  // Dispatch standard InputEvent & Change Event
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: newValue,
    })
  )
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

/**
 * Pastes text into an editable element at current selection or cursor position.
 * Preserves cursor position, multiline text, and React controlled state.
 */
export async function pasteTextIntoTarget(
  target: HTMLElement,
  textToInsert?: string
): Promise<boolean> {
  if (!target) return false

  let text = textToInsert
  if (text === undefined) {
    text = (await readFromClipboard()) ?? ""
  }

  if (!text) {
    // If clipboard read failed, try native execCommand paste
    try {
      target.focus()
      return document.execCommand("paste")
    } catch {
      return false
    }
  }

  target.focus()

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    if (target.disabled || target.readOnly) return false

    // Attempt 1: Native execCommand("insertText") to preserve native browser undo stack
    const prevVal = target.value
    let execSuccess = false
    try {
      execSuccess = document.execCommand("insertText", false, text)
    } catch {}

    if (execSuccess && target.value !== prevVal) {
      target.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }

    // Attempt 2: Programmatic slice replacement with React value tracker reset
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? target.value.length
    const currentVal = target.value
    const nextVal = currentVal.slice(0, start) + text + currentVal.slice(end)

    updateNativeInputValue(target, nextVal)

    const nextPos = start + text.length
    try {
      target.setSelectionRange(nextPos, nextPos)
    } catch {}

    return true
  }

  if (target.isContentEditable) {
    try {
      return document.execCommand("insertText", false, text)
    } catch {
      return false
    }
  }

  return false
}

/**
 * Cuts the current selection from the target element and copies it to the clipboard.
 */
export async function cutSelectionFromTarget(
  target: HTMLElement,
  selectedText: string
): Promise<boolean> {
  if (!selectedText) return false

  const copied = await copyToClipboard(selectedText)
  if (!copied) return false

  target.focus()

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    if (target.disabled || target.readOnly) return false

    // Attempt native cut command
    let executed = false
    try {
      executed = document.execCommand("cut")
    } catch {}

    if (!executed) {
      const start = target.selectionStart ?? 0
      const end = target.selectionEnd ?? 0
      if (start !== end) {
        const val = target.value
        const nextVal = val.slice(0, start) + val.slice(end)
        updateNativeInputValue(target, nextVal)
        target.setSelectionRange(start, start)
      }
    }
    return true
  }

  if (target.isContentEditable) {
    try {
      return document.execCommand("cut")
    } catch {
      return false
    }
  }

  return false
}

/**
 * Selects all text inside the target element.
 */
export function selectAllInTarget(target: HTMLElement): void {
  if (!target) return

  target.focus()

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.select()
    return
  }

  if (target.isContentEditable) {
    const range = document.createRange()
    range.selectNodeContents(target)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    return
  }

  // Regular container / table cell / text block
  const cell = target.closest("td, th, tr, [data-cell], p, div") || target
  const range = document.createRange()
  range.selectNodeContents(cell)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * Triggers Undo on the focused target element.
 */
export function triggerUndo(target?: HTMLElement | null): boolean {
  if (target) target.focus()
  try {
    return document.execCommand("undo")
  } catch {
    return false
  }
}

/**
 * Triggers Redo on the focused target element.
 */
export function triggerRedo(target?: HTMLElement | null): boolean {
  if (target) target.focus()
  try {
    return document.execCommand("redo")
  } catch {
    return false
  }
}
