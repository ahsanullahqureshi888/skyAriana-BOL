"use client"
import React, { useState, useEffect } from "react"
import { FileText, Download, Search, CheckCircle2, Eye, X, Printer, ShieldCheck } from "lucide-react"

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const fetchDocs = () => {
    const url = category === "ALL" ? "/api/client/documents" : `/api/client/documents?category=${category.toLowerCase()}`
    fetch(url)
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setDocuments(data.documents || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchDocs()
  }, [category])

  const viewDoc = async (id: string) => {
    setLoadingDoc(true)
    try {
      const res = await fetch(`/api/client/documents/${id}/download`)
      const data = await res.json()
      if (data?.success) {
        setSelectedDoc(data.document)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDoc(false)
    }
  }

  const filtered = documents.filter(d => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
      (d.bolNumber && d.bolNumber.toLowerCase().includes(q)) ||
      (d.title && d.title.toLowerCase().includes(q))
    )
  })

  const docTypes = [
    { label: "All Documents", val: "ALL" },
    { label: "Bill of Lading", val: "bol" },
    { label: "Commercial Invoice", val: "commercial_invoice" },
    { label: "Packing List", val: "packing_list" },
    { label: "Transit Paper", val: "transit_paper" },
    { label: "Phytosanitary", val: "phytosanitary" },
    { label: "Stickers", val: "stickers" },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Verifying released shipment documents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Released Document Center</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Download and print official customs, transit, and quarantine documents released for your shipments.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {docTypes.map(t => (
            <button
              key={t.val}
              onClick={() => setCategory(t.val)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                category === t.val
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Doc # or BOL..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Released
                </span>
              </div>

              <div>
                <h3 className="font-black text-sm text-white">{doc.title}</h3>
                <div className="font-mono text-xs text-amber-400 font-bold mt-0.5">{doc.documentNumber}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Associated BOL:</span>
                  <span className="font-mono font-bold text-white">{doc.bolNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Release Date:</span>
                  <span className="text-slate-300">{doc.issuedDate ? new Date(doc.issuedDate).toLocaleDateString() : "Active"}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => viewDoc(doc.id)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Eye className="w-3.5 h-3.5" /> View Package
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-slate-500 font-bold bg-slate-900 rounded-3xl border border-slate-800">
          No released documents found matching this category.
        </div>
      )}

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">{selectedDoc.documentType?.replace(/_/g, " ")}</div>
                <h2 className="text-xl font-black text-white">{selectedDoc.documentNumber}</h2>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">Bill of Lading:</span>
                <span className="font-mono font-bold text-white">{selectedDoc.bolNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedDoc.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">Date Released:</span>
                <span className="text-slate-300">{selectedDoc.issuedDate ? new Date(selectedDoc.issuedDate).toLocaleString() : "Official"}</span>
              </div>
            </div>

            {/* Document Payload Summary */}
            {selectedDoc.payload && (
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-400 uppercase">Document Data Summary</div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDoc.payload, null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                <Printer className="w-4 h-4" /> Print Sheet
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
