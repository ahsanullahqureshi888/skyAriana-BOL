import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../services/api'
import { useApp } from '../App'
import { Plus, Search, Edit2, Trash2, Tag, Box, DollarSign, Archive, CheckCircle2 } from 'lucide-react'

const Products: React.FC = () => {
  const { t } = useApp()
  const queryClient = useQueryClient()

  // States
  const [search, setSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [hsCode, setHsCode] = useState('')
  const [defaultUnit, setDefaultUnit] = useState('KGS')
  const [defaultPrice, setDefaultPrice] = useState<number>(0)
  const [description, setDescription] = useState('')

  // Queries
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      handleCloseModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      handleCloseModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  // Handlers
  const handleOpenAdd = () => {
    setEditingProduct(null)
    setName('')
    setHsCode('')
    setDefaultUnit('KGS')
    setDefaultPrice(0)
    setDescription('')
    setShowModal(true)
  }

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod)
    setName(prod.name)
    setHsCode(prod.hs_code || '')
    setDefaultUnit(prod.default_unit || 'KGS')
    setDefaultPrice(Number(prod.default_price) || 0)
    setDescription(prod.description || '')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name,
      hs_code: hsCode || null,
      default_unit: defaultUnit,
      default_price: Number(defaultPrice) || 0,
      description: description || null
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Get unique units for filter dropdown
  const units = Array.from(new Set(products?.map((p: any) => p.default_unit).filter(Boolean) || [])) as string[]

  const filtered = products?.filter((p: any) => {
    const matchText =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.hs_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())

    const matchUnit = selectedUnit ? p.default_unit === selectedUnit : true

    return matchText && matchUnit
  })

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header and top controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Inventory & Tariffs</span>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
            <Archive className="text-blue-600" size={24} />
            Products & Services
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage commodities, default units, and HS codes for fast commercial invoicing.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search & filter toolbar (frosted glass) */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, description or HS code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[140px]"
          >
            <option value="">All Units</option>
            {units.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {selectedUnit && (
            <button
              onClick={() => setSelectedUnit('')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Products list panel */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-400 text-xs mt-3">Loading products...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Commodity Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">HS Code</th>
                  <th className="p-4">Default Unit</th>
                  <th className="p-4">Default Rate</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered?.map((prod: any) => (
                  <tr key={prod.id} className="hover:bg-blue-50/10 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{prod.name}</div>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate font-medium">
                      {prod.description || '—'}
                    </td>
                    <td className="p-4">
                      {prod.hs_code ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-slate-200">
                          <Tag size={10} className="text-slate-400" />
                          {prod.hs_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                        <Box size={10} />
                        {prod.default_unit}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800 text-sm">
                      <div className="flex items-center gap-0.5 text-blue-800">
                        <DollarSign size={12} className="text-blue-500" />
                        {Number(prod.default_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="inline-flex p-2 hover:bg-blue-50 rounded-xl text-slate-600 hover:text-blue-600 transition-all cursor-pointer border border-transparent hover:border-blue-100"
                        title="Edit Product"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id, prod.name)}
                        className="inline-flex p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all cursor-pointer border border-transparent hover:border-red-100"
                        title="Delete Product"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Archive size={32} className="mx-auto mb-2 text-slate-300" />
                      No products found in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden text-left animate-scale-up" dir="ltr">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Archive size={16} className="text-blue-600" />
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all cursor-pointer text-sm"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Commodity / Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DRY FIGS"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">HS Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    placeholder="e.g. 0804.20.90"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Default Unit</label>
                  <select
                    value={defaultUnit}
                    onChange={(e) => setDefaultUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white cursor-pointer"
                  >
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="BAGS">BAGS (Bags)</option>
                    <option value="BOXES">BOXES (Boxes)</option>
                    <option value="TONS">TONS (Metric Tons)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Default Price (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={defaultPrice || ''}
                      onChange={(e) => setDefaultPrice(parseFloat(e.target.value || '0'))}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Additional description of goods..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
