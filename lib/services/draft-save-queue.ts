export type DraftSaveState = 'saving' | 'saved' | 'local'

/** One request at a time; intermediate edits are replaced by the newest draft. */
export class DraftSaveQueue<T> {
  private pending: T | undefined
  private running = false
  private stopped = false
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private failures = 0

  constructor(
    private readonly save: (draft: T) => Promise<void>,
    private readonly status: (state: DraftSaveState) => void,
  ) {}

  enqueue(draft: T) {
    this.pending = draft
    this.failures = 0
    this.retry()
  }

  retry() {
    if (this.stopped) return
    clearTimeout(this.retryTimer)
    void this.drain()
  }

  dispose() {
    this.stopped = true
    clearTimeout(this.retryTimer)
  }

  private async drain() {
    if (this.running || this.stopped || this.pending === undefined) return
    this.running = true
    try {
      while (this.pending !== undefined && !this.stopped) {
        const draft: T = this.pending
        this.status('saving')
        try {
          await this.save(draft)
          if (this.stopped) return
          this.failures = 0
          if (this.pending === draft) {
            this.pending = undefined
            this.status('saved')
          }
        } catch {
          if (this.stopped) return
          if (this.pending !== draft) continue
          this.status('local')
          this.failures += 1
          if (this.failures <= 3) {
            this.retryTimer = setTimeout(() => this.retry(), 2000 * 2 ** (this.failures - 1))
          }
          return
        }
      }
    } finally {
      this.running = false
    }
  }
}
