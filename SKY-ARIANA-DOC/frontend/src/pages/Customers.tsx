import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi, backupApi } from '../services/api'
import { useApp } from '../App'
import { Plus, Search, Edit2, Trash2, Upload, Users, MapPin, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react'

const Customers: React.FC = () => {
  const { t } = useApp()
  const queryClient = useQueryClient()
  
  // States
  const [search, setSearch] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  
  // Form states
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [address, setAddress] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [taxNumber, setTaxNumber] = useState('')

  // Queries
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      handleCloseModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      handleCloseModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })

  // Handlers
  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setCompanyName('')
    setContactPerson('')
    setAddress('')
    setCountry('')
    setPhone('')
    setEmail('')
    setTaxNumber('')
    setShowModal(true)
  }

  const handleOpenEdit = (cust: any) => {
    setEditingCustomer(cust)
    setCompanyName(cust.company_name)
    setContactPerson(cust.contact_person || '')
    setAddress(cust.address || '')
    setCountry(cust.country || '')
    setPhone(cust.phone || '')
    setEmail(cust.email || '')
    setTaxNumber(cust.tax_number || '')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCustomer(null)
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      company_name: companyName,
      contact_person: contactPerson || null,
      address: address || null,
      country: country || null,
      phone: phone || null,
      email: email || null,
      tax_number: taxNumber || null
    }

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await backupApi.importCustomers(file)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      alert('Customers imported successfully!')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to import customers from Excel')
    } finally {
      setImporting(false)
    }
  }

  // Get unique countries for filter dropdown
  const countries = Array.from(new Set(customers?.map((c: any) => c.country).filter(Boolean) || [])) as string[]

  const filtered = customers?.filter((c: any) => {
    const matchText = 
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.country || '').toLowerCase().includes(search.toLowerCase())
    
    const matchCountry = selectedCountry ? c.country === selectedCountry : true
    
    return matchText && matchCountry
  })

  // Helper to generate customer initials avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'C'
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header and top controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Operations Hub</span>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
            <Users className="text-blue-600" size={24} />
            {t.customers || 'Customers CRM'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Create, import, and organize client profiles for seamless shipping and commercial invoicing.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <label className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer hover:border-slate-300">
            <Upload size={14} className="text-blue-600" />
            {importing ? 'Importing...' : 'Import Excel'}
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search & filter toolbar (frosted glass) */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search company or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[140px]"
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {selectedCountry && (
            <button
              onClick={() => setSelectedCountry('')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Customers database card */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-400 text-xs mt-3">Loading customer database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-12 text-center">Client</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered?.map((cust: any) => (
                  <tr key={cust.id} className="hover:bg-blue-50/10 transition-colors group">
                    <td className="p-4 text-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] flex items-center justify-center border border-blue-200 shadow-sm mx-auto">
                        {getInitials(cust.company_name)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{cust.company_name}</div>
                      {cust.tax_number && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">TIN: {cust.tax_number}</div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-400" />
                        {cust.contact_person || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      {cust.country ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                          <MapPin size={10} />
                          {cust.country}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <Phone size={10} className="text-slate-400" />
                          {cust.phone}
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <Mail size={10} className="text-slate-400" />
                          {cust.email}
                        </div>
                      )}
                      {!cust.phone && !cust.email && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="inline-flex p-2 hover:bg-blue-50 rounded-xl text-slate-600 hover:text-blue-600 transition-all cursor-pointer border border-transparent hover:border-blue-100"
                        title="Edit Customer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(cust.id, cust.company_name)}
                        className="inline-flex p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all cursor-pointer border border-transparent hover:border-red-100"
                        title="Delete Customer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-2 text-slate-300" />
                      No customers found in database.
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
                <Users size={16} className="text-blue-600" />
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. WAVELON IMPEX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Purchasing Director"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tax Code / TIN</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. GST-36WAVELON9"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="e.g. A 4008, RKLP MARKET, SURAT"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 261 440 9901"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. imports@wavelonimpex.in"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-700 bg-white"
                  />
                </div>
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
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
