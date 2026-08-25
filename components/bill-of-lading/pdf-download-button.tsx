"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, Trash2 } from "lucide-react"
import { downloadPDFFromServer, deletePDFFromServer, buildBolSmartFileName } from "@/lib/utils/pdf-upload"
import { toast } from "sonner"

interface PDFDownloadButtonProps {
  bolId: string
  bolNumber: string
  pdfUrl?: string | null
  documentData?: any
  onDeleted?: () => void
}

export function PDFDownloadButton({
  bolId,
  bolNumber,
  pdfUrl,
  documentData,
  onDeleted,
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const fileName = buildBolSmartFileName(documentData, bolNumber, ".pdf")
      const success = await downloadPDFFromServer(bolId, fileName)
      if (success) {
        toast.success("PDF download started", {
          description: `Opening ${fileName}...`,
        })
      } else {
        toast.error("Failed to download PDF")
      }
    } catch (error) {
      toast.error("Error downloading PDF")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deletePDFFromServer(bolId)
      if (result.success) {
        toast.success("PDF deleted", {
          description: "The PDF has been removed from storage",
        })
        onDeleted?.()
      } else {
        toast.error("Failed to delete PDF", {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error("Error deleting PDF")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!pdfUrl) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        title="Download PDF"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Delete PDF"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
