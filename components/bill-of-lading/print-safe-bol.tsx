"use client"

import type { ReactNode } from "react"

export default function PrintSafeBOL({ children }: { children: ReactNode }) {
  return (
    <div className="print-wrapper w-full h-full p-0 m-0 print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-[297mm] print:overflow-hidden print:box-border">
      <div className="print-page w-full h-full p-0 m-0 print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-[297mm] print:overflow-hidden print:box-border">{children}</div>
    </div>
  )
}
