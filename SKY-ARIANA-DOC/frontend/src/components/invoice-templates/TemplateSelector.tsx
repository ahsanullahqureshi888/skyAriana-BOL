import React from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InvoiceTemplateId } from '../../types'

const INVOICE_TEMPLATES: Array<{ id: InvoiceTemplateId; name: string; description: string }> = [
  { id: 'premium_afghan_heritage', name: 'Premium Afghan Heritage', description: 'Banknote-inspired Afghan landmarks with navy and muted-gold detailing.' },
  { id: 'premium_afghan_glass', name: 'Premium Afghan Glass', description: 'Modern pale-blue glass design with refined gold accents.' },
  { id: 'classic_afghan_blue_gold', name: 'Classic Afghan Blue & Gold', description: 'Formal compact layout with royal-blue headers and gold rules.' },
]

export const TemplateCards: React.FC<{ value: InvoiceTemplateId; onChange: (value: InvoiceTemplateId) => void; compact?: boolean }> = ({ value, onChange, compact }) => (
  <div className={`template-card-grid ${compact ? 'template-card-grid--compact' : ''}`}>
    {INVOICE_TEMPLATES.map(template => (
      <button type="button" key={template.id} onClick={() => onChange(template.id)} className={`template-card ${value === template.id ? 'selected' : ''}`}>
        <span className={`template-card__thumb template-card__thumb--${template.id}`}><i /><i /><i /></span>
        <span className="template-card__copy"><strong>{template.name}</strong><small>{template.description}</small></span>
        {value === template.id && <span className="template-card__check"><Check size={12} /> Selected</span>}
      </button>
    ))}
  </div>
)

export const TemplateStepper: React.FC<{ value: InvoiceTemplateId; onChange: (value: InvoiceTemplateId) => void }> = ({ value, onChange }) => {
  const index = INVOICE_TEMPLATES.findIndex(item => item.id === value)
  const move = (direction: number) => onChange(INVOICE_TEMPLATES[(index + direction + INVOICE_TEMPLATES.length) % INVOICE_TEMPLATES.length].id)
  return <div className="template-stepper" aria-label="Invoice template selector">
    <button type="button" onClick={() => move(-1)} aria-label="Previous template"><ChevronLeft size={15} /></button>
    <select value={value} onChange={event => onChange(event.target.value as InvoiceTemplateId)}>{INVOICE_TEMPLATES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <button type="button" onClick={() => move(1)} aria-label="Next template"><ChevronRight size={15} /></button>
  </div>
}

export const invoiceTemplateName = (value: InvoiceTemplateId): string =>
  INVOICE_TEMPLATES.find(template => template.id === value)?.name || 'Commercial Invoice'
