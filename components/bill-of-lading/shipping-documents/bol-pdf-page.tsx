"use client"

import type { ReactNode } from "react"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { A4Preview } from "../a4-preview"

export interface BOLPdfPageProps {
  bolNumber?: string
  issueDate?: string
  persianDate?: string
  persianDateNumeric?: string
  formData: BillOfLadingFormData
  logoUrl?: string
  companyName?: string
  companyNamePersian?: string
  companySubtitle?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyLicence?: string
  includeColorStrip?: boolean
  backgroundImageUrl?: string | null
  backgroundOpacity?: number
  showStampSignature?: boolean
  onToggleStampSignature?: (show: boolean) => void
  customBolElement?: ReactNode
}

/**
 * BOLPdfPage - Preserves the exact existing Bill of Lading design,
 * fields, stamps, and layout on standard A4 (210mm x 297mm).
 */
export function BOLPdfPage({
  bolNumber,
  issueDate,
  persianDate,
  persianDateNumeric,
  formData,
  logoUrl,
  companyName,
  companyNamePersian,
  companySubtitle,
  companyPhone,
  companyEmail,
  companyAddress,
  companyLicence,
  includeColorStrip,
  backgroundImageUrl,
  backgroundOpacity,
  showStampSignature,
  onToggleStampSignature,
  customBolElement,
}: BOLPdfPageProps) {
  if (customBolElement) {
    return (
      <div data-bol-pdf-page="true" className="w-[210mm] bg-white shadow-xs">
        {customBolElement}
      </div>
    )
  }

  return (
    <div data-bol-pdf-page="true" className="w-[210mm] bg-white shadow-xs">
      <A4Preview
        bolNumber={bolNumber || formData.bol_number || "BOL"}
        issueDate={issueDate || formData.issue_date || ""}
        persianDate={persianDate || ""}
        persianDateNumeric={persianDateNumeric || ""}
        formData={formData}
        logoUrl={logoUrl}
        companyName={companyName}
        companyNamePersian={companyNamePersian}
        companySubtitle={companySubtitle}
        companyPhone={companyPhone}
        companyEmail={companyEmail}
        companyAddress={companyAddress}
        companyLicence={companyLicence}
        includeColorStrip={includeColorStrip}
        backgroundImageUrl={backgroundImageUrl || undefined}
        backgroundOpacity={backgroundOpacity}
        showStampSignature={showStampSignature}
        onToggleStampSignature={onToggleStampSignature}
      />
    </div>
  )
}
