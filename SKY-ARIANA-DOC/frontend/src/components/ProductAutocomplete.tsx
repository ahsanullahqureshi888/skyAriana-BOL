import React, { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { searchDryFruitCatalog, type DryFruitSearchResult } from '../data/dryFruitCatalog'

type ProductAutocompleteProps = {
  value: string
  selectedEntryId?: string
  onChange: (value: string) => void
  onSelect: (result: DryFruitSearchResult | null, customValue?: string) => void
  onClear: () => void
  inputId?: string
  disabled?: boolean
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({ value, selectedEntryId, onChange, onSelect, onClear, inputId, disabled }) => {
  const generatedId = useId()
  const listboxId = `${generatedId}-product-listbox`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dropUp, setDropUp] = useState(false)

  useEffect(() => setQuery(value || ''), [value])
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const results = searchDryFruitCatalog(query, 8)
  const hasCustomOption = query.trim().length > 0 && !results.some(result => result.entry.productName.toLowerCase() === query.trim().toLowerCase())
  const optionCount = results.length + (hasCustomOption ? 1 : 0)

  useEffect(() => {
    if (!open) return
    const updatePlacement = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropUp(rect.bottom + 300 > window.innerHeight - 12 && rect.top > 300)
    }
    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, optionCount])

  const selectResult = (result: DryFruitSearchResult | null, customValue?: string) => {
    if (result) {
      setQuery(result.entry.productName)
      onChange(result.entry.productName)
    } else if (customValue) {
      setQuery(customValue)
      onChange(customValue)
    }
    onSelect(result, customValue)
    setOpen(false)
    setActiveIndex(0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(index => Math.min(index + 1, Math.max(optionCount - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
    } else if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (results[activeIndex]) selectResult(results[activeIndex])
      else if (hasCustomOption) selectResult(null, query.trim())
    }
  }

  return <div ref={wrapperRef} className="product-autocomplete">
    <div className={`product-autocomplete__input-wrap ${open ? 'is-open' : ''}`}>
      <Search size={16} aria-hidden="true" className="product-autocomplete__search" />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && optionCount ? `${listboxId}-option-${activeIndex}` : undefined}
        value={query}
        placeholder="Search product, variety, grade or HS code"
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); onChange(event.target.value); setOpen(true); setActiveIndex(0) }}
        onKeyDown={handleKeyDown}
        className="commercial-field-input product-autocomplete__input"
      />
      {query && <button type="button" title="Clear product selection" aria-label="Clear product selection" className="product-autocomplete__clear" onClick={() => { setQuery(''); onClear(); setOpen(false) }}><X size={15} /></button>}
      <ChevronDown size={15} aria-hidden="true" className="product-autocomplete__chevron" />
    </div>
    {open && <div id={listboxId} role="listbox" className={`product-autocomplete__menu ${dropUp ? 'is-drop-up' : ''}`}>
      {results.map((result, index) => <button
        type="button"
        role="option"
        aria-selected={selectedEntryId === result.entry.id}
        id={`${listboxId}-option-${index}`}
        key={`${result.entry.id}-${result.variety.name}`}
        className={`product-autocomplete__option ${activeIndex === index ? 'is-active' : ''}`}
        onMouseDown={event => event.preventDefault()}
        onClick={() => selectResult(result)}
      >
        <span className="product-autocomplete__option-main"><strong>{result.entry.productName}</strong><small>{result.variety.name}</small></span>
        <span className="product-autocomplete__option-meta"><small>{result.gradeLabel}</small><small>HS {result.variety.hsCode}</small></span>
        {selectedEntryId === result.entry.id && <Check size={15} aria-hidden="true" />}
      </button>)}
      {hasCustomOption && <button
        type="button"
        role="option"
        aria-selected="false"
        id={`${listboxId}-option-${results.length}`}
        className={`product-autocomplete__custom ${activeIndex === results.length ? 'is-active' : ''}`}
        onMouseDown={event => event.preventDefault()}
        onClick={() => selectResult(null, query.trim())}
      >
        <strong>Use "{query.trim()}" as custom product</strong><small>Keep the product name and enter the remaining customs details manually.</small>
      </button>}
      {!results.length && !hasCustomOption && <div className="product-autocomplete__empty">No catalog match. Type a custom product name.</div>}
    </div>}
  </div>
}
