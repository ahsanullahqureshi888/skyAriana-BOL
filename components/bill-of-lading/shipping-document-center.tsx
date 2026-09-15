"use client"

import { CombinedShippingPdf, type CombinedShippingPdfProps } from "./shipping-documents/combined-shipping-pdf"
import type { ShippingDocumentKind, StickerLayout } from "@/lib/utils/shipping-documents"

export interface ShippingDocumentCenterProps extends Omit<CombinedShippingPdfProps, "onDownload" | "onPrint"> {
  onDownload: (kind: ShippingDocumentKind, stickerQuantity?: number, stickerLayout?: StickerLayout) => Promise<void>
  onPrint: (kind: ShippingDocumentKind, stickerQuantity?: number, stickerLayout?: StickerLayout) => Promise<void>
}

/**
 * ShippingDocumentCenter - Unified 3-in-1 Bill of Lading, Packing List, and Sticker Preview dialog.
 * Backwards compatible with existing call-sites while delegating to the unified CombinedShippingPdf.
 */
export function ShippingDocumentCenter({
  onDownload,
  onPrint,
  ...props
}: ShippingDocumentCenterProps) {
  return (
    <CombinedShippingPdf
      {...props}
      onDownload={async (kind, stickerQuantity, stickerLayout) => {
        await onDownload(kind, stickerQuantity, stickerLayout)
      }}
      onPrint={async (kind, stickerQuantity, stickerLayout) => {
        await onPrint(kind, stickerQuantity, stickerLayout)
      }}
    />
  )
}

export { CombinedShippingPdf }
export default ShippingDocumentCenter
