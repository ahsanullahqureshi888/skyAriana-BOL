"use client"

import { useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DOCUMENT_BACKGROUNDS, type DocumentBackground } from '@/lib/document-backgrounds'

export function BackgroundGallery({ value, onSelect }: { value: string; onSelect: (preset: DocumentBackground) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const categories = ['All', ...new Set(DOCUMENT_BACKGROUNDS.map(item => item.category))]
  const filtered = DOCUMENT_BACKGROUNDS.filter(item => (category === 'All' || item.category === category) && `${item.label} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="space-y-3 mb-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:max-w-xs">
        <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input aria-label="Search backgrounds" placeholder="Search mountains, ocean, flight…" value={query} onChange={event => setQuery(event.target.value)} className="pl-9 bg-white" />
      </div>
      <p className="text-xs text-slate-600" role="status">{filtered.length} options · Selected: <strong>{DOCUMENT_BACKGROUNDS.find(item => item.url === value)?.label ?? 'Custom'}</strong></p>
    </div>
    <div className="flex flex-wrap gap-1.5" aria-label="Background categories">
      {categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${category === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>{item}</button>)}
    </div>
    <div className="grid max-h-[440px] overflow-y-auto grid-cols-2 gap-3 p-1 sm:grid-cols-3 lg:grid-cols-4" aria-label="Document backgrounds">
      {filtered.map(item => <button type="button" key={item.label} aria-label={`Use ${item.label} background`} aria-pressed={value === item.url} onClick={() => onSelect(item)} className={`group overflow-hidden rounded-xl border bg-white text-left transition-shadow focus-visible:outline-2 focus-visible:outline-blue-600 ${value === item.url ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}>
        <div className="relative h-36 overflow-hidden bg-linear-to-br from-slate-100 via-white to-blue-50">
          {item.url ? <img src={item.url} alt="" loading="lazy" className="h-full w-full object-contain object-center transition-transform motion-safe:group-hover:scale-[1.03]" /> : <div className="h-full bg-white flex items-center justify-center text-xs text-slate-400">Pure paper</div>}
          {value === item.url && <span className="absolute right-2 top-2 rounded-full bg-blue-600 p-1 text-white"><Check aria-hidden="true" className="h-3.5 w-3.5" /></span>}
        </div>
        <div className="p-2.5"><p className="text-xs font-bold text-slate-900">{item.label}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.category}</p></div>
      </button>)}
    </div>
    {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No backgrounds found. Try another search or category.</p>}
    <p className="text-[11px] text-slate-500">Full-color thumbnails · Applied as a subtle watermark for readable documents. All backgrounds are stored locally.</p>
  </div>
}
