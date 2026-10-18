import React from 'react'
import type { CompanySettings, InvoiceTemplateId } from '../../types'

type TemplateProps = {
  children: React.ReactNode
  zoom: number
  settings?: Partial<CompanySettings>
}

const documentClass = (template: InvoiceTemplateId, settings?: Partial<CompanySettings>) => [
  'print-page',
  `invoice-template--${template}`,
  settings?.invoice_compact_layout_enabled ? 'invoice-template--compact' : '',
  settings?.invoice_color_printing_enabled === false ? 'invoice-template--monochrome' : '',
].filter(Boolean).join(' ')

export const PremiumAfghanGlassTemplate: React.FC<TemplateProps> = ({ children, zoom, settings }) => (
  <article id="invoice-print-root" className={documentClass('premium_afghan_glass', settings)} dir="ltr" style={{ zoom }}>
    {children}
  </article>
)

export const ClassicAfghanBlueGoldTemplate: React.FC<TemplateProps> = ({ children, zoom, settings }) => (
  <article id="invoice-print-root" className={documentClass('classic_afghan_blue_gold', settings)} dir="ltr" style={{ zoom }}>
    {children}
  </article>
)

export const PremiumAfghanHeritageTemplate: React.FC<TemplateProps> = ({ children, zoom, settings }) => (
  <article id="invoice-print-root" className={documentClass('premium_afghan_heritage', settings)} dir="ltr" style={{ zoom }}>
    {children}
  </article>
)

export const CommercialInvoiceRenderer: React.FC<TemplateProps & { template: InvoiceTemplateId }> = (props) => {
  if (props.template === 'premium_afghan_heritage') return <PremiumAfghanHeritageTemplate {...props} />
  if (props.template === 'classic_afghan_blue_gold') return <ClassicAfghanBlueGoldTemplate {...props} />
  return <PremiumAfghanGlassTemplate {...props} />
}
