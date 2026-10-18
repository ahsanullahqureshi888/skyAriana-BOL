import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, X, ZoomIn, ZoomOut, RotateCcw, Check, Move, Image as ImageIcon } from 'lucide-react'

export interface ImageCropUploaderProps {
  onCropComplete: (file: File, dataUrl: string) => void
  onCancel?: () => void
  aspectRatio?: number // e.g. 1 for 1:1 square, 4/3 for 4:3, etc.
  title?: string
  accept?: string
  maxSizeMb?: number
  triggerLabel?: string
  currentImageUrl?: string
  isUploading?: boolean
}

export const ImageCropUploader: React.FC<ImageCropUploaderProps> = ({
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  title = 'Crop & Position Image',
  accept = 'image/png, image/jpeg, image/webp, image/svg+xml',
  maxSizeMb = 10,
  triggerLabel = 'Upload & Crop Image',
  currentImageUrl,
  isUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Handle file selection
  const handleFile = (file: File) => {
    setErrorMsg(null)
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, SVG).')
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrorMsg(`Image size must be under ${maxSizeMb} MB.`)
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setIsModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  // Drag & drop handlers for drop zone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  // Pan handlers inside modal canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCanvas(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 4))
  }

  // Reset zoom & pan
  const handleResetTransform = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Export cropped result using Canvas
  const handleApplyCrop = useCallback(() => {
    if (!imageSrc || !selectedFile) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const targetWidth = 400
      const targetHeight = Math.round(targetWidth / aspectRatio)

      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      // Calculate source crop parameters based on pan & zoom
      ctx.save()
      ctx.translate(targetWidth / 2 + pan.x, targetHeight / 2 + pan.y)
      ctx.scale(zoom, zoom)

      // Fit image maintaining aspect ratio
      const imgAspect = img.width / img.height
      let drawW = targetWidth
      let drawH = targetHeight

      if (imgAspect > aspectRatio) {
        drawW = targetHeight * imgAspect
      } else {
        drawH = targetWidth / imgAspect
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()

      const dataUrl = canvas.toDataURL('image/png', 0.95)

      canvas.toBlob((blob) => {
        if (!blob) return
        const croppedFile = new File([blob], selectedFile.name.replace(/\.[^/.]+$/, '') + '-cropped.png', {
          type: 'image/png',
        })
        onCropComplete(croppedFile, dataUrl)
        setIsModalOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }, 'image/png', 0.95)
    }
    img.src = imageSrc
  }, [imageSrc, selectedFile, pan, zoom, aspectRatio, onCropComplete])

  return (
    <div className="image-crop-uploader">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Trigger Button / Area */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
          dragActive ? 'border-blue-500 bg-blue-50/50' : ''
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Upload size={13} className="text-blue-600" />
        <span>{isUploading ? 'Uploading...' : triggerLabel}</span>
      </button>

      {errorMsg && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errorMsg}</p>}

      {/* Crop Modal Window */}
      {isModalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  onCancel?.()
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Canvas Viewport */}
            <div className="p-6 flex flex-col items-center gap-4 overflow-y-auto">
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className="relative bg-slate-900 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 border-dashed border-blue-400/60 shadow-inner select-none flex items-center justify-center"
                style={{
                  width: '320px',
                  height: `${320 / aspectRatio}px`,
                }}
              >
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: isDraggingCanvas ? 'none' : 'transform 0.05s ease-out',
                  }}
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Preview crop source"
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </div>

                {/* Aspect ratio grid guide overlay */}
                <div className="absolute inset-0 border border-white/40 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] text-white font-medium flex items-center gap-1">
                  <Move size={10} /> Drag to position • Scroll to zoom
                </div>
              </div>

              {/* Controls bar */}
              <div className="w-full max-w-[320px] space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Zoom Level</span>
                  <span className="text-blue-600">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(prev + 0.1, 4))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTransform}
                    title="Reset Zoom & Pan"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer ml-1"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  onCancel?.()
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Crop & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCropUploader
