"use client"

import React, { useState } from "react"
import { FileSpreadsheet, MessageCircle, FileJson, LayoutGrid, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { WhatsAppParser } from "@/lib/services/whatsapp-parser"
import { ParsedBulkRow } from "@/lib/types/bulk-import"

interface BulkInputMethodsProps {
  onComplete: (parsed: ParsedBulkRow[], raw: any[], sourceType: any) => void
}

export function BulkInputMethods({ onComplete }: BulkInputMethodsProps) {
  const [activeMethod, setActiveMethod] = useState<"SELECT" | "WHATSAPP" | "EXCEL" | "JSON">("SELECT")
  const [whatsappText, setWhatsappText] = useState("")

  const handleWhatsAppParse = () => {
    if (!whatsappText.trim()) return
    const { mappedRow } = WhatsAppParser.parseText(whatsappText)
    onComplete([mappedRow], [{ originalText: whatsappText }], "WHATSAPP")
  }

  const handleEmptyGrid = () => {
    // Generate 10 empty rows
    const emptyRows: ParsedBulkRow[] = Array(10).fill({})
    onComplete(emptyRows, emptyRows, "MANUAL")
  }

  if (activeMethod === "WHATSAPP") {
    return (
      <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6">
          <button onClick={() => setActiveMethod("SELECT")} className="text-sm text-slate-500 hover:text-slate-800 mb-2">← Back to Methods</button>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" /> Paste WhatsApp Shipment
          </h3>
          <p className="text-sm text-slate-500 mt-1">Paste unstructured text (English, Dari, Pashto). The parser will automatically extract fields.</p>
        </div>
        
        <Textarea 
          className="min-h-[300px] font-mono text-sm p-4 bg-white"
          placeholder="جنس: کشمش گردک&#10;تعداد: 1427 کارتن 16 کیلویی&#10;باردان: 1.900 kg&#10;نرخ: 3.4 دالر&#10;موتر نمبر: 81745 هرات..."
          value={whatsappText}
          onChange={(e) => setWhatsappText(e.target.value)}
          dir="auto"
        />
        
        <div className="mt-6 flex justify-end">
          <Button onClick={handleWhatsAppParse} className="bg-green-600 hover:bg-green-700" disabled={!whatsappText.trim()}>
            Parse & Open Grid <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl font-black text-slate-900">How would you like to enter shipments?</h3>
        <p className="text-slate-500 mt-2">Select an input method. All methods will take you to the Grid Editor where you can review, fix errors, and map columns before finalizing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Empty Grid */}
        <Card className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group" onClick={handleEmptyGrid}>
          <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900">Manual Grid</h4>
            <p className="text-xs text-slate-500 mt-2">Start with an empty spreadsheet and type or paste data manually.</p>
          </CardContent>
        </Card>

        {/* WhatsApp Paste */}
        <Card className="cursor-pointer hover:border-green-400 hover:shadow-md transition-all group" onClick={() => setActiveMethod("WHATSAPP")}>
          <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
            <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900">WhatsApp Text</h4>
            <p className="text-xs text-slate-500 mt-2">Paste a multilingual chat message to auto-extract fields.</p>
          </CardContent>
        </Card>

        {/* Excel Paste */}
        <Card className="cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group" onClick={() => setActiveMethod("EXCEL")}>
          <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900">Paste Excel</h4>
            <p className="text-xs text-slate-500 mt-2">Copy rows directly from Excel and paste them. (Coming soon)</p>
          </CardContent>
        </Card>

        {/* JSON / CSV Upload */}
        <Card className="cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
            <div className="h-12 w-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileJson className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900">Upload File</h4>
            <p className="text-xs text-slate-500 mt-2">Upload a CSV or JSON backup file for batch restoration.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
