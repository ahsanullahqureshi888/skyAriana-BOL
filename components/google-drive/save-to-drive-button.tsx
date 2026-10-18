"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { DocumentCategory } from "@/lib/google-drive/types"

export interface SaveToDriveButtonProps {
  category: DocumentCategory
  fileName: string
  getPdfBlob: () => Promise<Blob> | Blob
  metadata?: Record<string, string>
  variant?: "outline" | "default" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  label?: string
  showIconOnly?: boolean
}

export function SaveToDriveButton({
  category,
  fileName,
  getPdfBlob,
  metadata = {},
  variant = "outline",
  size = "sm",
  className = "",
  label = "Save to Google Drive",
  showIconOnly = false,
}: SaveToDriveButtonProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleSaveToDrive = async () => {
    setIsUploading(true)
    const toastId = toast.loading(`Uploading ${fileName} to Google Drive...`)

    try {
      // 1. Check if Google Drive is connected
      const statusRes = await fetch("/api/google-drive/status")
      const statusData = await statusRes.json().catch(() => ({}))

      if (statusData.state === "not_connected") {
        toast.error("Google Drive is not connected", {
          id: toastId,
          description: "Please connect your account in Settings → Backup & Data → Google Drive.",
        })
        return
      }

      if (statusData.state === "expired") {
        toast.error("Google Drive authentication expired", {
          id: toastId,
          description: "Please reconnect your Google Drive account in Settings.",
        })
        return
      }

      // 2. Generate/fetch the PDF Blob
      const pdfBlob = await getPdfBlob()
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("Unable to generate PDF file for upload")
      }

      // 3. Upload to Google Drive API
      const formData = new FormData()
      formData.append("file", pdfBlob, fileName)
      formData.append("fileName", fileName)
      formData.append("category", category)
      formData.append("metadata", JSON.stringify(metadata))

      const uploadRes = await fetch("/api/google-drive/upload-document", {
        method: "POST",
        body: formData,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload document to Google Drive")
      }

      toast.success("Saved to Google Drive!", {
        id: toastId,
        description: `Stored in Sky Ariana BOL/${uploadData.folderName}/${uploadData.fileName}`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      })
    } catch (error: any) {
      console.error("Save to Google Drive error:", error)
      toast.error("Upload failed", {
        id: toastId,
        description: error?.message || "Could not save document to Google Drive.",
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleSaveToDrive}
      disabled={isUploading}
      title="Save to Google Drive"
      className={`gap-1.5 cursor-pointer ${className}`}
    >
      {isUploading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
      ) : (
        <Cloud className="w-3.5 h-3.5 text-blue-500" />
      )}
      {!showIconOnly && <span>{isUploading ? "Saving..." : label}</span>}
    </Button>
  )
}
