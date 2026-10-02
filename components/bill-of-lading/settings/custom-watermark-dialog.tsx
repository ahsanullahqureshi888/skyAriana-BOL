"use client"

import React, { useState, useRef } from 'react'
import {
  Upload,
  AlertTriangle,
  Check,
  X,
  FileText,
  Sliders,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomWatermarkItem } from './bol-settings-types'
import { sanitizeSvgString } from './svg-sanitizer'

export interface CustomWatermarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveWatermark: (item: CustomWatermarkItem) => void
}

export function CustomWatermarkDialog({
  open,
  onOpenChange,
  onSaveWatermark,
}: CustomWatermarkDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('Custom')
  const [opacity, setOpacity] = useState<number>(0.14)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [format, setFormat] = useState<'svg' | 'png' | 'jpeg' | 'webp'>('svg')
  const [error, setError] = useState<string | null>(null)
  const [isSanitizing, setIsSanitizing] = useState(false)

  const handleReset = () => {
    setFile(null)
    setLabel('')
    setCategory('Custom')
    setOpacity(0.14)
    setPreviewUrl('')
    setError(null)
    setIsSanitizing(false)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)
    const fileType = selectedFile.type
    const fileName = selectedFile.name.toLowerCase()

    // 1. File size checks: max 4MB
    if (selectedFile.size > 4 * 1024 * 1024) {
      setError('File size exceeds 4MB limit. Please provide a lighter asset.')
      return
    }

    // Auto-fill label from filename
    const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    const titleCased = cleanName.replace(/\b\w/g, (c) => c.toUpperCase())
    setLabel(titleCased)

    if (fileName.endsWith('.svg') || fileType === 'image/svg+xml') {
      setFormat('svg')
      setIsSanitizing(true)
      try {
        const text = await selectedFile.text()
        const result = sanitizeSvgString(text)
        if (!result.isValid) {
          setError(result.error || 'Invalid or potentially unsafe SVG file.')
          setIsSanitizing(false)
          return
        }

        // Create safe SVG Data URL
        const safeBlob = new Blob([result.sanitizedSvg], { type: 'image/svg+xml' })
        const safeUrl = URL.createObjectURL(safeBlob)
        setFile(selectedFile)
        setPreviewUrl(safeUrl)
      } catch (err: any) {
        setError(`Failed to process SVG: ${err?.message || 'Unknown error'}`)
      } finally {
        setIsSanitizing(false)
      }
    } else if (
      fileType === 'image/png' ||
      fileType === 'image/jpeg' ||
      fileType === 'image/webp'
    ) {
      const detectedFormat = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpeg'
      setFormat(detectedFormat)
      const objectUrl = URL.createObjectURL(selectedFile)
      setFile(selectedFile)
      setPreviewUrl(objectUrl)
    } else {
      setError('Unsupported file format. Please upload SVG (recommended), PNG, JPG, or WebP.')
    }
  }

  const handleSave = () => {
    if (!previewUrl || !label.trim()) {
      setError('Please provide a name and upload a valid file.')
      return
    }

    const newItem: CustomWatermarkItem = {
      id: `custom-wm-${Date.now()}`,
      label: label.trim(),
      category: category.trim() || 'Custom',
      url: previewUrl,
      opacity: Math.max(0.02, Math.min(0.35, opacity)),
      format,
      createdAt: new Date().toISOString(),
      version: 1,
      fileSizeBytes: file?.size,
    }

    onSaveWatermark(newItem)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-950 dark:text-slate-50">
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Upload Custom Watermark
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Upload custom vector SVG or high-resolution PNG for official Bill of Lading security background.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* File Picker */}
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-full text-blue-600 dark:text-blue-400">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click to select SVG or image file
                </p>
                <p className="text-xs text-slate-400">
                  SVG Vector (Recommended for infinite zoom), PNG, JPG, or WebP up to 4MB
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Auto-sanitized & script-protected
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                    {file?.name || label}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Format: {format.toUpperCase()} · {(file?.size ? (file.size / 1024).toFixed(1) : '0')} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-red-600"
              >
                Change File
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewUrl && (
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              {/* Form Controls */}
              <div className="space-y-3.5">
                <div>
                  <Label className="text-xs font-bold">Watermark Name</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Kandahar Logistics Route"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold">Category</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Custom, Regional, Maritime"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Recommended Opacity</Label>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.35"
                    step="0.01"
                    aria-label="Recommended opacity"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="mt-2 w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[0.08, 0.12, 0.14, 0.18, 0.22].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpacity(val)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                          Math.round(opacity * 100) === Math.round(val * 100)
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {Math.round(val * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live A4 Mini Preview Sheet */}
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Document Legibility Preview</Label>
                <div className="relative aspect-[210/297] w-full max-h-56 mx-auto rounded-lg bg-white shadow-md border border-slate-200 overflow-hidden p-3 flex flex-col justify-between select-none">
                  {/* Watermark at tested opacity */}
                  <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
                    style={{
                      backgroundImage: `url('${previewUrl}')`,
                      opacity,
                    }}
                  />
                  {/* Simulated Text */}
                  <div className="relative z-10 space-y-1 text-[6px] text-slate-800 leading-tight">
                    <div className="flex justify-between border-b border-blue-900 pb-0.5 font-bold text-blue-950">
                      <span>SKY ARIANA LOGISTICS</span>
                      <span className="font-mono">BOL-SAMPLE</span>
                    </div>
                    <p className="text-slate-600">Shipper: Afghan Dry Fruit Processors Corp</p>
                    <p className="text-slate-600">Route: Kabul Customs → Islam Qala → Dubai</p>
                    <div className="mt-1 h-1 w-20 bg-slate-300 rounded" />
                    <div className="h-1 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="relative z-10 border-t border-slate-200 pt-0.5 text-[5px] text-slate-600 font-mono flex justify-between">
                    <span>1,454 PACKAGES</span>
                    <span className="font-bold text-blue-900">BAL: $18,450 USD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!previewUrl || !label.trim() || isSanitizing}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Save Custom Watermark
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
