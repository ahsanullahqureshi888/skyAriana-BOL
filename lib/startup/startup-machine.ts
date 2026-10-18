/**
 * Application Startup State Machine
 * Central source of truth for startup lifecycle.
 */

export type StartupState =
  | "BOOTING"
  | "STARTING_BACKEND"
  | "WAITING_FOR_BACKEND"
  | "INITIALIZING_DATABASE"
  | "LOADING_SETTINGS"
  | "READY"
  | "DEGRADED"
  | "FAILED"

export interface StartupDiagnostics {
  state: StartupState
  startTime: number
  timings: {
    electronProcessMs?: number
    windowCreationMs?: number
    frontendBootMs?: number
    backendStartupMs?: number
    databaseInitMs?: number
    dashboardRequestMs?: number
    dashboardRenderMs?: number
    totalInteractiveMs?: number
  }
  history: Array<{ timestamp: string; totalMs: number; state: StartupState }>
  lastError?: string
}

class StartupMachine {
  private static instance: StartupMachine | null = null
  private currentState: StartupState = "BOOTING"
  private startTime: number = typeof performance !== "undefined" ? performance.now() : Date.now()
  private listeners: Set<(state: StartupState) => void> = new Set()
  private timings: StartupDiagnostics["timings"] = {}
  private lastError?: string

  public static getInstance(): StartupMachine {
    if (!StartupMachine.instance) {
      StartupMachine.instance = new StartupMachine()
    }
    return StartupMachine.instance
  }

  public getState(): StartupState {
    return this.currentState
  }

  public transition(newState: StartupState, error?: string): void {
    const prev = this.currentState
    this.currentState = newState
    if (error) this.lastError = error

    if (newState === "READY" || newState === "DEGRADED") {
      this.recordTiming("totalInteractiveMs", performance.now() - this.startTime)
      this.saveHistory()
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("skybol:startup-state-changed", {
          detail: { from: prev, to: newState, error, timings: this.timings },
        })
      )
    }

    this.listeners.forEach((listener) => {
      try {
        listener(newState)
      } catch (err) {
        console.warn("[StartupMachine] Listener error:", err)
      }
    })
  }

  public subscribe(listener: (state: StartupState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public recordTiming(key: keyof StartupDiagnostics["timings"], ms: number): void {
    this.timings[key] = Math.round(ms)
  }

  public getDiagnostics(): StartupDiagnostics {
    return {
      state: this.currentState,
      startTime: this.startTime,
      timings: { ...this.timings },
      history: this.loadHistory(),
      lastError: this.lastError,
    }
  }

  private loadHistory(): StartupDiagnostics["history"] {
    if (typeof window === "undefined") return []
    try {
      const raw = window.localStorage.getItem("skybol:startup-history")
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private saveHistory(): void {
    if (typeof window === "undefined") return
    try {
      const history = this.loadHistory()
      const totalMs = this.timings.totalInteractiveMs || Math.round(performance.now() - this.startTime)
      history.unshift({
        timestamp: new Date().toISOString(),
        totalMs,
        state: this.currentState,
      })
      const capped = history.slice(0, 10)
      window.localStorage.setItem("skybol:startup-history", JSON.stringify(capped))
    } catch {}
  }
}

export { StartupMachine }
export const startupMachine = StartupMachine.getInstance()
