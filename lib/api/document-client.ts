/**
 * Sky Ariana Document Engine Client.
 *
 * Coordinates synchronous and asynchronous background document generation
 * with the Python FastAPI backend, offering real-time progress callbacks,
 * automatic job polling, and graceful fallback to browser-side generation.
 */

export interface DocumentJobStatus {
  job_id: string
  doc_type: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  created_at: string
  completed_at?: string | null
  download_url?: string
  result?: {
    filename: string
    file_size: number
    sha256_checksum: string
    file_path?: string
  }
  error?: string
}

export interface DocumentGenerationResult {
  success: boolean
  downloadUrl?: string
  blob?: Blob
  filename?: string
  jobId?: string
  source: "python-backend" | "client-fallback"
  error?: string
}

export type ProgressCallback = (progress: number, message: string) => void

/**
 * Polls background document job until completed or failed.
 */
export async function pollDocumentJob(
  jobId: string,
  onProgress?: ProgressCallback,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 800
): Promise<DocumentJobStatus> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        headers: { Accept: "application/json" },
      })

      if (res.ok) {
        const json = await res.json()
        const job: DocumentJobStatus = json.data || json

        if (onProgress) {
          const msg =
            job.status === "queued"
              ? "Preparing document in background queue..."
              : job.status === "processing"
              ? `Processing document (${job.progress}%)...`
              : job.status === "completed"
              ? "Document generated successfully!"
              : "Document generation failed"
          onProgress(job.progress || 50, msg)
        }

        if (job.status === "completed") {
          return job
        }

        if (job.status === "failed") {
          throw new Error(job.error || "Background document generation failed on server")
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("failed on server")) {
        throw err
      }
      // Non-fatal network glitch during polling, keep trying
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }

  throw new Error(`Document generation timed out after ${Math.round(maxWaitMs / 1000)} seconds`)
}

/**
 * Request document generation from Python backend with optional async worker queue.
 */
export async function requestDocumentGeneration(
  type: "bol" | "invoice" | "packing-list" | "transit" | "phytosanitary" | "stickers" | "excel-export",
  data: Record<string, any>,
  options?: {
    asyncJob?: boolean
    onProgress?: ProgressCallback
  }
): Promise<DocumentGenerationResult> {
  const isAsync = Boolean(options?.asyncJob)
  options?.onProgress?.(10, "Connecting to Python document engine...")

  try {
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        async_job: isAsync,
        ...data,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Server responded with ${res.status}`)
    }

    const json = await res.json()

    // 1. Asynchronous job path
    if (isAsync && json.data?.job_id) {
      const jobId = json.data.job_id
      options?.onProgress?.(25, "Job queued in background worker...")
      const finalJob = await pollDocumentJob(jobId, options?.onProgress)

      const dlUrl = finalJob.download_url
        ? `/api/documents/download/${type}/${finalJob.result?.filename || ""}`
        : undefined

      return {
        success: true,
        jobId,
        downloadUrl: dlUrl,
        filename: finalJob.result?.filename,
        source: "python-backend",
      }
    }

    // 2. Synchronous immediate return
    if (json.data?.filename) {
      options?.onProgress?.(100, "Document ready!")
      const filename = json.data.filename
      return {
        success: true,
        downloadUrl: `/api/documents/download/${type}/${filename}`,
        filename,
        source: "python-backend",
      }
    }

    return {
      success: true,
      source: "python-backend",
    }
  } catch (err: any) {
    console.warn(`[DocumentClient] Backend generation failed (${err.message}), fallback to browser engine.`)
    return {
      success: false,
      error: err.message,
      source: "client-fallback",
    }
  }
}

/**
 * Trigger download of document given URL or Blob.
 */
export function triggerBrowserDownload(urlOrBlob: string | Blob, filename: string): void {
  const url = typeof urlOrBlob === "string" ? urlOrBlob : window.URL.createObjectURL(urlOrBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (typeof urlOrBlob !== "string") {
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }
}
