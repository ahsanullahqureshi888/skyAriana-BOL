/**
 * Sky Ariana Multi-Tier Auto-Save Engine
 * Provides sub-second debounced local & session syncing,
 * background API replication, draft recovery, and real-time status indicators.
 */

import { useState, useEffect, useRef, useCallback } from "react"

export type AutoSaveStatus = "saved" | "saving" | "idle" | "error"

export interface UseAutoSaveOptions<T> {
  debounceMs?: number
  enabled?: boolean
  validate?: (data: T) => boolean
  onSave?: (data: T) => void
  apiEndpoint?: string
}

export interface UseAutoSaveReturn<T> {
  status: AutoSaveStatus
  lastSavedAt: Date | null
  saveNow: () => void
  restoreDraft: () => T | null
  clearDraft: () => void
  hasDraft: boolean
}

/**
 * Universal Hook for Auto-Saving Form & Document Drafts
 */
export function useAutoSave<T>(
  storageKey: string,
  currentData: T,
  options: UseAutoSaveOptions<T> = {}
): UseAutoSaveReturn<T> {
  const {
    debounceMs = 350,
    enabled = true,
    validate,
    onSave,
    apiEndpoint,
  } = options

  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState<boolean>(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadRef = useRef<boolean>(true)

  // Check if draft already exists in storage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        setHasDraft(true)
      }
    } catch (_) {}
  }, [storageKey])

  // Core save routine
  const executeSave = useCallback(
    (data: T) => {
      if (typeof window === "undefined" || !enabled) return
      if (validate && !validate(data)) return

      setStatus("saving")
      try {
        const json = JSON.stringify(data)
        // Tier 1: LocalStorage fast RAM sync
        window.localStorage.setItem(storageKey, json)
        // Tier 2: Session storage backup mirror
        window.sessionStorage.setItem(`${storageKey}:backup`, json)

        // Tier 3: Background API replication if endpoint specified
        if (apiEndpoint) {
          fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: storageKey, draft: data, timestamp: new Date().toISOString() }),
          }).catch(() => {})
        }

        const now = new Date()
        setLastSavedAt(now)
        setStatus("saved")
        setHasDraft(true)
        if (onSave) onSave(data)

        // Dispatch custom global event
        window.dispatchEvent(
          new CustomEvent("skybol:draft-saved", {
            detail: { storageKey, timestamp: now.toISOString() },
          })
        )
      } catch (err) {
        console.error(`[AutoSave] Error saving to ${storageKey}:`, err)
        setStatus("error")
      }
    },
    [storageKey, enabled, validate, onSave, apiEndpoint]
  )

  // Debounced auto-save trigger on data changes
  useEffect(() => {
    // Skip initial mount to avoid overwriting stored drafts with initial blank state
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    if (!enabled) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setStatus("saving")
    timerRef.current = setTimeout(() => {
      executeSave(currentData)
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentData, executeSave, debounceMs, enabled])

  // Manual save trigger
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    executeSave(currentData)
  }, [currentData, executeSave])

  // Restore draft from storage
  const restoreDraft = useCallback((): T | null => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.localStorage.getItem(storageKey) || window.sessionStorage.getItem(`${storageKey}:backup`)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed as T
      }
    } catch (err) {
      console.error(`[AutoSave] Error restoring draft for ${storageKey}:`, err)
    }
    return null
  }, [storageKey])

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(storageKey)
      window.sessionStorage.removeItem(`${storageKey}:backup`)
      setHasDraft(false)
      setStatus("idle")
    } catch (_) {}
  }, [storageKey])

  return {
    status,
    lastSavedAt,
    saveNow,
    restoreDraft,
    clearDraft,
    hasDraft,
  }
}

