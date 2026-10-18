import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Printer, ZoomIn, ZoomOut } from 'lucide-react'
import { PremiumAfghanHeritageInvoice } from '../components/invoice-templates/PremiumAfghanHeritageInvoice'
import { TemplateStepper } from '../components/invoice-templates/TemplateSelector'
import { invoicesApi, settingsApi } from '../services/api'
import type { InvoiceTemplateId } from '../types'
import { BRAND_LOGO_SRC, resolveBrandAssetUrl } from '../config/branding'

const PrintPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const invoiceId = Number(id) || 0
  const token = searchParams.get('token')
  const [previewZoom, setPreviewZoom] = React.useState(1.1)
  const [selectedTemplate, setSelectedTemplate] = React.useState<InvoiceTemplateId>('premium_afghan_heritage')

  if (token && !localStorage.getItem('token')) localStorage.setItem('token', token)

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: Boolean(invoiceId),
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  React.useEffect(() => {
    if (invoice) setSelectedTemplate(invoice.invoice_template || settings?.default_invoice_template || 'premium_afghan_heritage')
  }, [invoice?.id, invoice?.invoice_template, settings?.default_invoice_template])

  const templateMutation = useMutation({
    mutationFn: (template: InvoiceTemplateId) => invoicesApi.update(invoiceId, { invoice_template: template }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }),
  })
  const defaultTemplateMutation = useMutation({
    mutationFn: (template: InvoiceTemplateId) => settingsApi.update({ default_invoice_template: template }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handlePrint = () => {
    if (!invoice) return
    const originalTitle = document.title
    document.title = invoice.invoice_number || 'Commercial Invoice'
    window.addEventListener('afterprint', () => { document.title = originalTitle }, { once: true })
    window.print()
  }

  if (isLoading) return <div className="print-status">Preparing invoice…</div>
  if (isError || !invoice) return <div className="print-status">Unable to load this invoice.</div>

  const logoUrl = resolveBrandAssetUrl(settings?.logo_path) || BRAND_LOGO_SRC
  const signatureUrl = resolveBrandAssetUrl(settings?.signature_path)
  const stampUrl = resolveBrandAssetUrl(settings?.stamp_path)
  const savePending = templateMutation.isPending || defaultTemplateMutation.isPending

  return <main className="print-workspace">
    <header className="print-toolbar screen-only">
      <div className="print-toolbar__left">
        <button className="toolbar-back" type="button" onClick={() => navigate(`/invoices/${invoiceId}`)}><ArrowLeft size={16} />Close</button>
        <button className="toolbar-edit" type="button" onClick={() => navigate(`/invoices/${invoiceId}/edit`)}><Edit size={16} />Edit Invoice</button>
      </div>
      <div className="print-toolbar__center">
        <strong>Commercial Invoice Preview</strong>
        <span>A4 portrait · Print-ready document</span>
      </div>
      <div className="print-toolbar__right">
        <div className="preview-zoom-controls" aria-label="Preview zoom controls">
          <button type="button" aria-label="Zoom out" onClick={() => setPreviewZoom(value => Math.max(0.65, Number((value - 0.05).toFixed(2))))}><ZoomOut size={15} /></button>
          <span>{Math.round(previewZoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setPreviewZoom(value => Math.min(1.25, Number((value + 0.05).toFixed(2))))}><ZoomIn size={15} /></button>
        </div>
        <button className="toolbar-print" type="button" onClick={handlePrint}><Printer size={17} />Print Document</button>
      </div>
    </header>

    <p className="preview-print-hint screen-only">For a clean invoice, disable “Headers and footers” in the browser print dialog.</p>

    <section className="template-preview-controls screen-only" aria-label="Invoice template controls">
      <TemplateStepper value={selectedTemplate} onChange={setSelectedTemplate} />
      <div className="template-preview-controls__actions">
        <button type="button" disabled={savePending} onClick={() => templateMutation.mutate(selectedTemplate)}>{templateMutation.isPending ? 'Applying…' : 'Apply Template'}</button>
        <button type="button" disabled={savePending} onClick={() => defaultTemplateMutation.mutate(selectedTemplate)}>{defaultTemplateMutation.isPending ? 'Saving…' : 'Set as Company Default'}</button>
      </div>
    </section>

    <section className="preview-canvas" aria-label="Invoice document preview">
      <div className="preview-document-scale" style={{ zoom: previewZoom }}>
        <PremiumAfghanHeritageInvoice
          invoice={invoice}
          settings={settings}
          template={selectedTemplate}
          logoUrl={logoUrl}
          signatureUrl={signatureUrl}
          stampUrl={stampUrl}
        />
      </div>
    </section>
  </main>
}

export default PrintPreview
