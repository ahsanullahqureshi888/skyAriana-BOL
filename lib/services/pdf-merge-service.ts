import type { PDFDocument as PDFDocumentType } from "pdf-lib"
import fs from "fs/promises"
import path from "path"
import { getUploadPath } from "../server-paths"

export interface MergeRequestItem {
  type: string
  title: string
  filePath: string // Absolute path or relative to upload dir
}

export async function mergeShipmentDocuments(
  bolNumber: string,
  bolData: any,
  items: MergeRequestItem[]
): Promise<{ pdfBuffer: Buffer, mergedFileName: string }> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
  
  const mergedPdf = await PDFDocument.create()
  const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
  
  // 1. Create Cover Page
  const coverPage = mergedPdf.addPage([595.28, 841.89]) // A4 size
  const { width, height } = coverPage.getSize()
  
  coverPage.drawText("SKY ARIANA LIMITED", { x: 50, y: height - 100, size: 24, font: helveticaBold, color: rgb(0, 0.2, 0.6) })
  coverPage.drawText("SHIPMENT DOCUMENT FILE", { x: 50, y: height - 140, size: 18, font: helveticaBold })
  
  coverPage.drawText(`BOL: ${bolNumber}`, { x: 50, y: height - 200, size: 12, font: helveticaBold })
  coverPage.drawText(`SHIPPER: ${bolData.shipper_name || 'N/A'}`, { x: 50, y: height - 225, size: 12, font: helveticaBold })
  coverPage.drawText(`CONSIGNEE: ${bolData.consignee_name || 'N/A'}`, { x: 50, y: height - 250, size: 12, font: helveticaBold })
  coverPage.drawText(`COMMODITY: ${bolData.commodity_description || 'N/A'}`, { x: 50, y: height - 275, size: 12, font: helveticaBold })
  coverPage.drawText(`ORIGIN: ${bolData.port_of_loading || 'N/A'}`, { x: 50, y: height - 300, size: 12, font: helveticaBold })
  coverPage.drawText(`DESTINATION: ${bolData.port_of_discharge || 'N/A'}`, { x: 50, y: height - 325, size: 12, font: helveticaBold })
  
  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  coverPage.drawText(`Generated: ${genDate}`, { x: 50, y: height - 400, size: 10, font: helveticaFont })
  
  // 2. Create Index Page
  const indexPage = mergedPdf.addPage([595.28, 841.89])
  indexPage.drawText("DOCUMENT INDEX", { x: 50, y: height - 100, size: 18, font: helveticaBold })
  
  let yPos = height - 150
  items.forEach((item, index) => {
    indexPage.drawText(`${index + 1}. ${item.title}`, { x: 50, y: yPos, size: 12, font: helveticaFont })
    yPos -= 25
  })
  
  // 3. Merge each PDF
  for (const item of items) {
    try {
      const p = path.isAbsolute(item.filePath) ? item.filePath : path.join(getUploadPath("pdfs"), item.filePath)
      const fileBytes = await fs.readFile(p)
      
      const docToMerge = await PDFDocument.load(fileBytes)
      const copiedPages = await mergedPdf.copyPages(docToMerge, docToMerge.getPageIndices())
      
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page)
      })
    } catch (err) {
      console.warn(`[PDF Merge] Skipping file ${item.filePath}:`, err)
      
      // Optionally insert a warning page
      const warningPage = mergedPdf.addPage([595.28, 841.89])
      warningPage.drawText(`MISSING DOCUMENT: ${item.title}`, { x: 50, y: height - 100, size: 14, font: helveticaBold, color: rgb(0.8, 0, 0) })
    }
  }
  
  const pdfBytes = await mergedPdf.save()
  
  return {
    pdfBuffer: Buffer.from(pdfBytes),
    mergedFileName: `${bolNumber.replace(/[^a-zA-Z0-9_-]/g, "")}-Complete-Shipment-File.pdf`
  }
}
