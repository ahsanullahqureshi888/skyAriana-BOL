import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

type InvoiceBarcodeProps = {
  value?: string
  showText?: boolean
}

/**
 * InvoiceBarcode
 *
 * Renders a CODE128 barcode from the invoice number using JsBarcode.
 * Falls back silently (renders nothing) when the value is empty or
 * barcode generation fails so it never crashes print or PDF output.
 */
export function InvoiceBarcode({ value, showText = true }: InvoiceBarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement | null>(null)
  const normalizedValue = value?.trim() ?? ''

  useEffect(() => {
    if (!barcodeRef.current || !normalizedValue) return

    try {
      JsBarcode(barcodeRef.current, normalizedValue, {
        format: 'CODE128',
        displayValue: showText,
        fontSize: 11,
        textMargin: 4,
        height: 42,
        width: 1.5,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
      })
    } catch (error) {
      console.error('[InvoiceBarcode] Unable to generate barcode:', error)
    }
  }, [normalizedValue, showText])

  if (!normalizedValue) return null

  return (
    <div
      className="invoice-barcode"
      aria-label={`Barcode for invoice ${normalizedValue}`}
      role="img"
    >
      <svg ref={barcodeRef} aria-hidden="true" />
    </div>
  )
}
