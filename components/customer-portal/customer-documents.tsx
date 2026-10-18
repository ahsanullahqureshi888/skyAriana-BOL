"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Search, Filter, ShieldCheck, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { CustomerPortalSession, CustomerDocumentItem } from "@/lib/types/customer-portal"

interface CustomerDocumentsProps {
  session: CustomerPortalSession
}

export function CustomerDocumentsView({ session }: CustomerDocumentsProps) {
  const [documents, setDocuments] = useState<CustomerDocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    let isMounted = true
    const loadDocs = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/portal/documents")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.documents)) {
            setDocuments(data.documents)
          }
        }
      } catch (err) {
        console.error("Error loading documents:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadDocs()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.bolNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.documentType.toLowerCase().includes(search.toLowerCase())

    const matchesType = typeFilter === "all" || d.documentType === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>My Documents</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified PDF documents published for <strong>{session.customerName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Session Download Protection</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search documents by title or BOL number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus-visible:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {["all", "bol", "commercial_invoice", "packing_list", "transit_paper", "phytosanitary"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === t
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t === "all" ? "All Documents" : t.toUpperCase().replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading document vault...</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No documents found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Documents will be accessible here as soon as our operations team approves and releases them.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Document Title</th>
                  <th className="p-3.5">BOL Reference</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Date Published</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{d.title}</span>
                    </td>
                    <td className="p-3.5 font-mono text-blue-400">{d.bolNumber}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {d.documentType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{d.createdDate}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Available
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <a
                        href={d.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
