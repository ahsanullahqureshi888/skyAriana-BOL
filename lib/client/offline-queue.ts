/**
 * Offline operation queue for Client PC mode.
 * Stores pending mutations locally when connection is lost,
 * and replays them in FIFO order when connectivity is restored.
 */

import { apiClient, type ServerConnectionState } from "./api-client"

export interface QueuedMutation {
  id: string
  endpoint: string
  method: "POST" | "PUT" | "DELETE" | "PATCH"
  payload: any
  timestamp: string
  retryCount: number
  lastError?: string
}

const STORAGE_KEY = "sky_offline_queue_v1"

type QueueListener = (queue: QueuedMutation[]) => void

class OfflineQueueManager {
  private static instance: OfflineQueueManager
  private queue: QueuedMutation[] = []
  private isProcessing = false
  private listeners: Set<QueueListener> = new Set()

  private constructor() {
    if (typeof window !== "undefined") {
      this.loadQueue()
      apiClient.subscribe(this.handleConnectionChange.bind(this))
    }
  }

  public static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager()
    }
    return OfflineQueueManager.instance
  }

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.queue = JSON.parse(raw)
      }
    } catch {
      this.queue = []
    }
  }

  private saveQueue(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
      } catch (err) {
        console.error("[OfflineQueue] Failed to persist queue:", err)
      }
    }
    this.notify()
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener)
    listener([...this.queue])
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener([...this.queue])
      } catch (err) {
        console.error("[OfflineQueue] Listener error:", err)
      }
    }
  }

  public getPendingCount(): number {
    return this.queue.length
  }

  public getQueue(): QueuedMutation[] {
    return [...this.queue]
  }

  public async enqueue(endpoint: string, method: QueuedMutation["method"], payload: any): Promise<void> {
    const item: QueuedMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      endpoint,
      method,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    }

    this.queue.push(item)
    this.saveQueue()

    // Attempt immediate drain if online
    if (apiClient.getState().status === "connected") {
      void this.drain()
    }
  }

  private handleConnectionChange(state: ServerConnectionState): void {
    if (state.status === "connected" && this.queue.length > 0 && !this.isProcessing) {
      void this.drain()
    }
  }

  public async drain(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { processed: 0, failed: 0 }
    }

    this.isProcessing = true
    let processed = 0
    let failed = 0

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0]
        try {
          await apiClient.request(item.endpoint, {
            method: item.method,
            body: JSON.stringify(item.payload),
          })
          // Success: dequeue
          this.queue.shift()
          this.saveQueue()
          processed++
        } catch (err: any) {
          failed++
          item.retryCount = (item.retryCount || 0) + 1
          item.lastError = err?.message || String(err)
          this.saveQueue()

          // If conflict or client error (4xx not 401), move on or break
          if (err?.status >= 400 && err?.status < 500 && err?.status !== 401) {
            console.error(`[OfflineQueue] Request ${item.id} rejected with client error ${err.status}, removing from queue:`, err)
            this.queue.shift()
            this.saveQueue()
          } else {
            // Likely network problem, wait for next connection event
            break
          }
        }
      }
    } finally {
      this.isProcessing = false
    }

    return { processed, failed }
  }

  public clearQueue(): void {
    this.queue = []
    this.saveQueue()
  }
}

export const offlineQueue = OfflineQueueManager.getInstance()
