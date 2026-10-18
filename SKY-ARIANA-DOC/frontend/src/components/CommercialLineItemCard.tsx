import React, { useEffect, useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  GripVertical, 
  Info, 
  MoreHorizontal, 
  Package, 
  Scale, 
  Trash2,
  Sparkles,
  Calculator,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { findDryFruitEntry, PACKAGE_TYPES, PRICE_BASES, QUANTITY_UNITS, WEIGHT_UNITS, type DryFruitSearchResult } from '../data/dryFruitCatalog'
import { buildCalculationLabel, calculateLineTotal, formatAmount, formatQuantity, type CommercialLineItem, type CommercialLineItemErrors } from '../utils/commercialLineItems'
import { ProductAutocomplete } from './ProductAutocomplete'

type CommercialLineItemCardProps = {
  item: CommercialLineItem
  index: number
  currency: string
  errors?: CommercialLineItemErrors
  isFirst: boolean
  isLast: boolean
  onChange: (field: keyof CommercialLineItem, value: string) => void
  onProductSelect: (result: DryFruitSearchResult | null, customValue?: string) => void
  onClearProduct: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (direction: 'up' | 'down') => void
  onBlur: () => void
  onDragStart: () => void
  onDrop: () => void
}

const Field: React.FC<{
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  full?: boolean
  className?: string
  children: React.ReactNode
}> = ({ label, htmlFor, hint, error, full, className = '', children }) => (
  <div className={`commercial-field ${full ? 'commercial-field--full' : ''} ${error ? 'has-error' : ''} ${className}`}>
    <label htmlFor={htmlFor} className="commercial-field__label">
      {label}
      {hint && <span className="commercial-field__hint" title={hint}><Info size={13} aria-label={hint} /></span>}
    </label>
    {children}
    {error && <p className="commercial-field__error" role="alert">{error}</p>}
  </div>
)

const formatNumericDisplay = (value: string, precision = 3) => {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return value
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return value
  return parsed.toLocaleString(undefined, { maximumFractionDigits: precision })
}

const FormattedNumberInput: React.FC<{
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onBlur: () => void
  precision?: number
}> = ({ id, value, placeholder, onChange, onBlur, precision = 3 }) => {
  const [focused, setFocused] = useState(false)
  const [displayValue, setDisplayValue] = useState(() => formatNumericDisplay(value, precision))

  useEffect(() => {
    if (!focused) setDisplayValue(formatNumericDisplay(value, precision))
  }, [focused, precision, value])

  return <input
    id={id}
    type="text"
    inputMode="decimal"
    value={focused ? value : displayValue}
    placeholder={placeholder}
    onFocus={() => { setFocused(true); setDisplayValue(value) }}
    onChange={event => {
      const next = event.target.value.replace(/,/g, '')
      setDisplayValue(next)
      onChange(next)
    }}
    onBlur={() => { const next = displayValue; setFocused(false); setDisplayValue(formatNumericDisplay(next, precision)); if (next !== value) onChange(next); onBlur() }}
    className="commercial-field-input commercial-number-input"
  />
}

export const CommercialLineItemCard: React.FC<CommercialLineItemCardProps> = ({
  item,
  index,
  currency,
  errors = {},
  isFirst,
  isLast,
  onChange,
  onProductSelect,
  onClearProduct,
  onDelete,
  onDuplicate,
  onMove,
  onBlur,
  onDragStart,
  onDrop,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [additionalOpen, setAdditionalOpen] = useState(false)
  const catalogEntry = findDryFruitEntry(item.product_catalog_id)
  const variants = catalogEntry?.varieties || []
  const grades = [...new Set(variants.flatMap(variant => variant.grades))]
  const lineTotal = calculateLineTotal(item)
  const customGradeSelected = item.grade === 'Custom Grade' || Boolean(item.custom_grade)
  const fieldId = (field: string) => `line-${item.local_id}-${field}`
  const itemName = item.description || item.product_name || 'Product details pending'

  // Numerical calculations for weights & tare
  const netNum = Number(String(item.net_weight || '').replace(/,/g, '')) || 0
  const grossNum = Number(String(item.gross_weight || '').replace(/,/g, '')) || 0
  const pkgCountNum = Number(String(item.package_count || '').replace(/,/g, '')) || 0
  const qtyNum = Number(String(item.quantity || '').replace(/,/g, '')) || 0
  const tareNum = Math.max(0, Math.round((grossNum - netNum) * 1000) / 1000)
  const isGrossInvalid = grossNum > 0 && grossNum < netNum
  const weightUnit = item.weight_unit || 'KG'

  const input = (field: keyof CommercialLineItem, type = 'text', placeholder = '') => (
    type === 'number'
      ? <FormattedNumberInput id={fieldId(String(field))} value={String(item[field] ?? '')} placeholder={placeholder} precision={field === 'unit_price' ? 4 : 3} onChange={value => onChange(field, value)} onBlur={onBlur} />
      : <input
        id={fieldId(String(field))}
        type={type}
        value={String(item[field] ?? '')}
        placeholder={placeholder}
        onChange={event => onChange(field, event.target.value)}
        onBlur={onBlur}
        className="commercial-field-input"
      />
  )

  // Smart Tare helper: updates gross weight with calculated percentage or exact net
  const applyTarePercentage = (percentage: number) => {
    if (netNum <= 0) return
    const calculatedGross = Math.round(netNum * (1 + percentage / 100) * 100) / 100
    onChange('gross_weight', calculatedGross.toString())
  }

  // Smart Package weight multiplier: sets Net Weight = Package Count * Per-Package Weight
  const applyPackageWeight = (pkgWeight: number) => {
    if (pkgCountNum <= 0) return
    const calculatedNet = Math.round(pkgCountNum * pkgWeight * 100) / 100
    const calculatedGross = Math.round(calculatedNet * 1.03 * 100) / 100 // default 3% tare
    onChange('net_weight', calculatedNet.toString())
    onChange('gross_weight', calculatedGross.toString())
    if (item.quantity_unit === 'KG' || item.quantity_unit === 'KGS') {
      onChange('quantity', calculatedNet.toString())
    }
  }

  return (
    <article className={`commercial-line-item-card ${collapsed ? 'is-collapsed' : ''}`} onDragOver={event => event.preventDefault()} onDrop={onDrop}>
      <header className="commercial-line-item-card__header">
        <div className="commercial-line-item-card__identity">
          <button type="button" className="commercial-line-item-card__drag" draggable title="Drag to reorder line item" aria-label={`Drag item ${String(index + 1).padStart(2, '0')} to reorder`} onDragStart={onDragStart}><GripVertical size={18} /></button>
          <div className="commercial-line-item-card__identity-copy">
            <span className="commercial-line-item-card__eyebrow">Commercial line item</span>
            <h4>Item {String(index + 1).padStart(2, '0')}</h4>
          </div>
          <div className="commercial-line-item-card__summary" title={itemName}>
            <strong>{itemName}</strong>
            <span>HS {item.hs_code || '—'} <i /> Net {formatQuantity(item.net_weight)} {weightUnit} <i /> Gross {formatQuantity(item.gross_weight || item.net_weight)} {weightUnit}</span>
          </div>
        </div>
        <div className="commercial-line-item-card__actions">
          <button type="button" title={collapsed ? 'Expand line item' : 'Collapse line item'} aria-label={collapsed ? 'Expand line item' : 'Collapse line item'} aria-expanded={!collapsed} onClick={() => setCollapsed(previous => !previous)}><ChevronDown className={collapsed ? '' : 'is-expanded'} size={15} /></button>
          <button type="button" title="Move item up" aria-label="Move item up" disabled={isFirst} onClick={() => onMove('up')}><ChevronUp size={15} /></button>
          <button type="button" title="Move item down" aria-label="Move item down" disabled={isLast} onClick={() => onMove('down')}><ChevronDown size={15} /></button>
          <button type="button" title="Duplicate line item" aria-label="Duplicate line item" onClick={onDuplicate}><Copy size={15} /></button>
          <div className="commercial-line-item-card__more">
            <button type="button" title="More line item actions" aria-label="More line item actions" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(previous => !previous)}><MoreHorizontal size={17} /></button>
            {moreOpen && <div className="commercial-line-item-card__more-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setCollapsed(false); setAdditionalOpen(true); setMoreOpen(false) }}>Open additional details</button>
              <button type="button" role="menuitem" onClick={() => { onClearProduct(); setMoreOpen(false) }}>Clear product selection</button>
            </div>}
          </div>
          <button type="button" title="Delete line item" aria-label="Delete line item" className="is-danger" onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      </header>

      {!collapsed && <div className="commercial-line-item-card__body space-y-4">
        {/* Section 1: Product details */}
        <section className="commercial-field-group">
          <div className="commercial-field-group__heading"><span className="commercial-field-group__icon"><Package size={15} /></span><div><h5>Product details</h5><p>Catalog matching stays optional; every value remains editable.</p></div></div>
          <div className="commercial-field-grid commercial-field-grid--product">
            <Field label="Product Autofill (Optional)" htmlFor={fieldId('product')} className="commercial-field--autofill" hint="Search product name, variety, grade, category or HS code."><ProductAutocomplete inputId={fieldId('product')} value={item.product_name} selectedEntryId={item.product_catalog_id} onChange={value => onChange('product_name', value)} onSelect={onProductSelect} onClear={onClearProduct} /></Field>
            <Field label="Custom HS Code" htmlFor={fieldId('hs_code')} className="commercial-field--hs" error={errors.hs_code} hint="Use digits and dots, for example 0804.20.10.">{input('hs_code', 'text', '0804.20.10')}</Field>
            <Field label="Description / Product Name" htmlFor={fieldId('description')} className="commercial-field--description" error={errors.description}>{input('description', 'text', 'e.g. DRY FIGS')}</Field>
            <Field label="Grade" htmlFor={fieldId('grade')} className="commercial-field--grade">
              <select id={fieldId('grade')} value={customGradeSelected ? 'Custom Grade' : item.grade} onChange={event => { const value = event.target.value; onChange('grade', value); if (value !== 'Custom Grade') onChange('custom_grade', '') }} onBlur={onBlur} className="commercial-field-input"><option value="">Select grade</option>{grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}<option value="Custom Grade">Custom Grade</option></select>
            </Field>
            <Field label="Variety" htmlFor={fieldId('variety')} className="commercial-field--variety">
              {variants.length > 1 ? <select id={fieldId('variety')} value={item.variety} onChange={event => onChange('variety', event.target.value)} onBlur={onBlur} className="commercial-field-input"><option value="">Select variety</option>{variants.map(variant => <option key={variant.name} value={variant.name}>{variant.name}</option>)}</select> : input('variety', 'text', 'e.g. Afghan Dry Figs')}
            </Field>
            {customGradeSelected && <Field label="Custom Grade" htmlFor={fieldId('custom_grade')} className="commercial-field--custom-grade">{input('custom_grade', 'text', 'Enter grade or specification')}</Field>}
          </div>
        </section>

        {/* Section 2: Quantity & packaging */}
        <section className="commercial-field-group">
          <div className="flex items-center justify-between mb-3">
            <div className="commercial-field-group__heading mb-0"><span className="commercial-field-group__icon"><Package size={15} /></span><div><h5>Quantity &amp; packaging</h5><p>Trade units, counts and package sizes.</p></div></div>
            {pkgCountNum > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-100/90 px-2 py-1 rounded-lg">
                <Calculator size={12} className="text-blue-600" />
                <span>Quick Net Wt ({pkgCountNum} pkgs):</span>
                {[5, 10, 20, 25, 50].map(kg => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => applyPackageWeight(kg)}
                    className="px-1.5 py-0.5 bg-white hover:bg-blue-600 hover:text-white rounded border border-slate-200 transition-colors cursor-pointer"
                    title={`Calculate ${pkgCountNum} pkgs × ${kg} KG = ${pkgCountNum * kg} KG Net Weight`}
                  >
                    {kg}k
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="commercial-field-grid commercial-field-grid--four">
            <Field label="Quantity" htmlFor={fieldId('quantity')} error={errors.quantity}>{input('quantity', 'number', '0')}</Field>
            <Field label="Quantity Unit" htmlFor={fieldId('quantity_unit')}><select id={fieldId('quantity_unit')} value={item.quantity_unit} onChange={event => onChange('quantity_unit', event.target.value)} onBlur={onBlur} className="commercial-field-input">{QUANTITY_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></Field>
            <Field label="Number of Packages" htmlFor={fieldId('package_count')} error={errors.package_count}>{input('package_count', 'number', '0')}</Field>
            <Field label="Package Type" htmlFor={fieldId('package_type')}><select id={fieldId('package_type')} value={item.package_type} onChange={event => onChange('package_type', event.target.value)} onBlur={onBlur} className="commercial-field-input"><option value="">Select package</option>{PACKAGE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
          </div>
        </section>

        {/* Section 3: Weight (Net Weight, Gross Weight & Tare) */}
        <section className="commercial-field-group">
          <div className="flex items-center justify-between mb-3">
            <div className="commercial-field-group__heading mb-0"><span className="commercial-field-group__icon"><Scale size={15} /></span><div><h5>Weight (Net &amp; Gross)</h5><p>Physical cargo weight with tare calculation.</p></div></div>
            {netNum > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-2xs font-bold text-slate-600">
                <span className="text-slate-400">Tare Preset:</span>
                <button
                  type="button"
                  onClick={() => applyTarePercentage(0)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="Gross = Net (0% Tare)"
                >
                  Gross = Net
                </button>
                <button
                  type="button"
                  onClick={() => applyTarePercentage(2)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="+2% Bags Tare"
                >
                  +2% Bags
                </button>
                <button
                  type="button"
                  onClick={() => applyTarePercentage(5)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="+5% Boxes Tare"
                >
                  +5% Boxes
                </button>
                <button
                  type="button"
                  onClick={() => applyTarePercentage(8)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
                  title="+8% Crates Tare"
                >
                  +8% Crates
                </button>
              </div>
            )}
          </div>

          <div className="commercial-field-grid commercial-field-grid--three">
            <Field label="Net Weight" htmlFor={fieldId('net_weight')} error={errors.net_weight} hint="Net product weight, excluding packaging.">{input('net_weight', 'number', '0')}</Field>
            <Field label="Gross Weight" htmlFor={fieldId('gross_weight')} error={errors.gross_weight} hint="Total shipped weight including packaging.">{input('gross_weight', 'number', '0')}</Field>
            <Field label="Weight Unit" htmlFor={fieldId('weight_unit')}><select id={fieldId('weight_unit')} value={item.weight_unit} onChange={event => onChange('weight_unit', event.target.value)} onBlur={onBlur} className="commercial-field-input">{WEIGHT_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></Field>
          </div>

          {/* Live Weight & Tare Calculation Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Net: {formatQuantity(netNum)} {weightUnit}
              </span>
              <span className="text-slate-400">+</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Tare: +{formatQuantity(tareNum)} {weightUnit} {netNum > 0 ? `(${Math.round((tareNum / netNum) * 1000) / 10}%)` : ''}
              </span>
              <span className="text-slate-400">=</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Gross: {formatQuantity(grossNum || netNum)} {weightUnit}
              </span>
            </div>

            {isGrossInvalid && (
              <div className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <AlertTriangle size={12} />
                <span>Gross weight ({grossNum}) is less than Net weight ({netNum})</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Pricing & Line Total Calculation */}
        <section className="commercial-field-group commercial-field-group--pricing">
          <div className="commercial-field-group__heading"><span className="commercial-field-group__icon commercial-field-group__icon--gold"><Scale size={15} /></span><div><h5>Pricing &amp; Line Total</h5><p>Formula: Rate × Billable basis = Total Amount.</p></div></div>
          <div className="commercial-field-grid commercial-field-grid--pricing">
            <Field label="Unit Price" htmlFor={fieldId('unit_price')} error={errors.unit_price}>{input('unit_price', 'number', '0.00')}</Field>
            <Field label="Currency" htmlFor={fieldId('currency')}><select id={fieldId('currency')} value={item.currency || currency} onChange={event => onChange('currency', event.target.value)} className="commercial-field-input"><option value="USD">USD</option><option value="AFN">AFN</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="IRR">IRR</option></select></Field>
            <Field label="Price Basis" htmlFor={fieldId('price_basis')} hint="Per KG, MT and LB use net weight. Per Piece, Carton, Bag and Package use their matching count."><select id={fieldId('price_basis')} value={item.price_basis} onChange={event => onChange('price_basis', event.target.value)} onBlur={onBlur} className="commercial-field-input">{PRICE_BASES.map(basis => <option key={basis} value={basis}>{basis}</option>)}</select></Field>
            <div className="commercial-total-field" aria-live="polite">
              <span className="commercial-field__label font-bold text-blue-900">Calculated Line Total</span>
              <strong>{formatAmount(lineTotal, item.currency || currency)}</strong>
              <small className="text-blue-700/80 font-mono">{buildCalculationLabel(item)}</small>
            </div>
          </div>
        </section>

        <details className="commercial-additional-details" open={additionalOpen}>
          <summary onClick={event => { event.preventDefault(); setAdditionalOpen(previous => !previous) }}><span className="commercial-additional-details__title">Additional details</span><span>Country, lot and remarks</span></summary>
          <div className="commercial-field-grid commercial-field-grid--three">
            <Field label="Country of Origin" htmlFor={fieldId('country_of_origin')}>{input('country_of_origin', 'text', 'Afghanistan')}</Field>
            <Field label="Lot / Batch Number" htmlFor={fieldId('lot_batch_number')}>{input('lot_batch_number', 'text', 'Optional')}</Field>
            <Field label="Remarks" htmlFor={fieldId('remarks')}>{input('remarks', 'text', 'Optional notes')}</Field>
          </div>
        </details>
      </div>}

      <footer className="commercial-line-item-card__mobile-summary"><span><small>Net</small><b>{formatQuantity(item.net_weight)} {weightUnit}</b></span><span><small>Gross</small><b>{formatQuantity(item.gross_weight || item.net_weight)} {weightUnit}</b></span><span><small>Line total</small><b>{formatAmount(lineTotal, item.currency || currency)}</b></span></footer>
    </article>
  )
}
