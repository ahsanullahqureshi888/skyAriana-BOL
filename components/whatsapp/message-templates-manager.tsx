"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Edit2,
  FileCode,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { NormalizedWhatsAppShipment, WhatsAppLanguage, WhatsAppMessageType, WhatsAppTemplate } from "@/lib/whatsapp/message-types"
import { BUILTIN_TEMPLATES, renderTemplate } from "@/lib/whatsapp/template-engine"

interface MessageTemplatesManagerProps {
  currentShipment: NormalizedWhatsAppShipment | null
}

const TEMPLATE_VARIABLES = [
  { token: "{{bolNumber}}", desc: "BOL reference number" },
  { token: "{{containerNumber}}", desc: "Container number" },
  { token: "{{truckNumber}}", desc: "Truck license plate" },
  { token: "{{commodity}}", desc: "Cargo commodity name" },
  { token: "{{packages}}", desc: "Number and type of packages" },
  { token: "{{shipper}}", desc: "Shipper / exporter name" },
  { token: "{{consignee}}", desc: "Consignee name" },
  { token: "{{currentLocation}}", desc: "Current station / border / port" },
  { token: "{{destination}}", desc: "Final discharge destination" },
  { token: "{{status}}", desc: "Current status narrative" },
  { token: "{{vessel}}", desc: "Vessel name" },
  { token: "{{voyage}}", desc: "Voyage number" },
  { token: "{{eta}}", desc: "Estimated time of arrival" },
  { token: "{{lastUpdated}}", desc: "Last milestone date" },
  { token: "{{companyName}}", desc: "Company brand name" },
]

export function MessageTemplatesManager({ currentShipment }: MessageTemplatesManagerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(BUILTIN_TEMPLATES)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate>(BUILTIN_TEMPLATES[0])

  // Dialog state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Partial<WhatsAppTemplate>>({
    name: "",
    category: "custom",
    language: "en",
    messageType: "custom",
    templateText: "",
  })

  // Load templates from server
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/whatsapp/templates")
      if (res.ok) {
        const data = await res.json()
        if (data.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates)
          if (!selectedTemplate && data.templates.length > 0) {
            setSelectedTemplate(data.templates[0])
          }
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedCategory !== "all" && t.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return t.name.toLowerCase().includes(q) || t.templateText.toLowerCase().includes(q)
      }
      return true
    })
  }, [templates, selectedCategory, searchQuery])

  // Live preview with current shipment (or safe placeholders)
  const previewText = useMemo(() => {
    if (!selectedTemplate) return ""
    const dummyShipment: NormalizedWhatsAppShipment = currentShipment || {
      id: "demo-1",
      bolNumber: "BOL-2026-NSA583",
      shipper: { name: "NAJEB AMIN LTD" },
      consignee: { name: "HIND TRADING CO" },
      containerNumber: "MSCU1234567",
      truckNumber: "42223 Herat",
      commodity: "Black Raisins",
      packagesFormatted: "1,400 CTNS",
      currentLocation: "Bandar Abbas",
      destination: "Nhava Sheva, India",
      statusCode: "at_port",
      statusDisplay: "Reached Port",
      vesselName: "MERYAN 7",
      voyageNumber: "012",
      eta: "20 Sep 2026",
      origin: "Kandahar, Afghanistan",
      lastUpdated: new Date().toISOString(),
    }

    return renderTemplate(selectedTemplate.templateText, dummyShipment)
  }, [selectedTemplate, currentShipment])

  const handleSaveTemplate = async () => {
    if (!editingTemplate.name?.trim() || !editingTemplate.templateText?.trim()) {
      toast.error("Please fill in template name and text")
      return
    }

    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      })
      if (res.ok) {
        toast.success("Template saved successfully")
        setIsEditorOpen(false)
        fetchTemplates()
      } else {
        toast.error("Failed to save template")
      }
    } catch {
      toast.error("Failed to save template")
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom template?")) return
    try {
      const res = await fetch(`/api/whatsapp/templates?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Template deleted")
        fetchTemplates()
      }
    } catch {
      toast.error("Failed to delete template")
    }
  }

  const insertVariable = (token: string) => {
    setEditingTemplate((prev) => ({
      ...prev,
      templateText: (prev.templateText || "") + " " + token + " ",
    }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: Template List (Cols 1 to 5) */}
      <Card className="lg:col-span-5 rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">Message Templates</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingTemplate({
                name: "",
                category: "custom",
                language: "en",
                messageType: "custom",
                templateText: "",
              })
              setIsEditorOpen(true)
            }}
            className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Template</span>
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Search and Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="h-8.5 pl-8 text-xs bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {["all", "vessel", "border", "port", "truck", "delivery", "custom"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 shadow-2xs"
                      : "border-slate-200 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                      {tpl.name}
                      {tpl.isBuiltIn && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          Built-In
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 font-mono leading-relaxed">
                    {tpl.templateText}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: Live Template Preview & Actions (Cols 6 to 12) */}
      <Card className="lg:col-span-7 rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800">
              {selectedTemplate?.name || "Template Preview"}
            </CardTitle>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Testing against: <b>{currentShipment?.bolNumber || "Sample BOL (NSA583)"}</b>
            </div>
          </div>
          {selectedTemplate && !selectedTemplate.isBuiltIn && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate(selectedTemplate)
                  setIsEditorOpen(true)
                }}
                className="h-7 text-xs font-bold gap-1"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                className="h-7 text-xs text-red-600 hover:bg-red-50 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3.5">
          <div>
            <Label className="text-xs font-bold text-slate-700">Rendered Message Output</Label>
            <Textarea
              readOnly
              value={previewText}
              rows={12}
              className="mt-1 w-full text-xs font-mono bg-slate-50/70 border-slate-200 leading-relaxed resize-y p-3"
            />
          </div>

          {/* Raw Template String */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Underlying Template Format</span>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-words">
              {selectedTemplate?.templateText}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingTemplate.id ? "Edit WhatsApp Template" : "Create Custom WhatsApp Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Template Name</Label>
              <Input
                value={editingTemplate.name || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="e.g. Vessel Departure"
                className="h-8.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Category</Label>
                <Select
                  value={editingTemplate.category || "custom"}
                  onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v as any })}
                >
                  <SelectTrigger className="h-8.5 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vessel">Vessel</SelectItem>
                    <SelectItem value="border">Border</SelectItem>
                    <SelectItem value="port">Port</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Language</Label>
                <Select
                  value={editingTemplate.language || "en"}
                  onValueChange={(v) => setEditingTemplate({ ...editingTemplate, language: v as any })}
                >
                  <SelectTrigger className="h-8.5 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fa">Persian / Dari (فارسی)</SelectItem>
                    <SelectItem value="ps">Pashto (پښتو)</SelectItem>
                    <SelectItem value="ur">Urdu (اردو)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template Variables Toolbar */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-bold text-slate-600">Insert Variable Token (Click to insert):</Label>
              <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-[10px] font-mono text-blue-800 transition-all cursor-pointer"
                    title={v.desc}
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Template Text</Label>
              <Textarea
                value={editingTemplate.templateText || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, templateText: e.target.value })}
                rows={7}
                placeholder="The vessel {{vessel}} has departed from {{currentLocation}} toward {{destination}}. ETA: {{eta}}."
                className="w-full text-xs font-mono p-3 leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditorOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveTemplate} className="h-8 text-xs font-bold bg-blue-600 text-white">
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
