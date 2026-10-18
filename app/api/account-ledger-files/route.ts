import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getUploadPath } from "@/lib/server-paths"

export const runtime = "nodejs"

const uploadRoots = {
  pdf: {
    dir: getUploadPath("account-ledger-pdfs"),
    publicPrefix: "/uploads/account-ledger-pdfs",
  },
  media: {
    dir: getUploadPath("account-ledger-media"),
    publicPrefix: "/uploads/account-ledger-media",
  },
}

function timestampFilePrefix() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

function mediaFolderFor(file: File) {
  const lowerName = file.name.toLowerCase()
  if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(lowerName)) return "Images"
  if (file.type.startsWith("video/") || /\.(mp4|mov|avi|webm)$/i.test(lowerName)) return "Videos"
  if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(lowerName)) return "VoiceMessages"
  return "Documents"
}

function mediaKindFor(file: File) {
  const folder = mediaFolderFor(file)
  if (folder === "Images") return "image"
  if (folder === "Videos") return "video"
  if (folder === "VoiceMessages") return "audio"
  return "document"
}

function sanitizeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 160)
}

function extensionFor(file: File, kind: "pdf" | "media") {
  const nameExtension = path.extname(file.name || "").toLowerCase()
  if (kind === "pdf") return ".pdf"
  if (nameExtension && nameExtension.length <= 8) return nameExtension
  if (file.type.includes("png")) return ".png"
  if (file.type.includes("jpeg") || file.type.includes("jpg")) return ".jpg"
  if (file.type.includes("webp")) return ".webp"
  if (file.type.includes("gif")) return ".gif"
  if (file.type.includes("mp4")) return ".mp4"
  if (file.type.includes("webm")) return ".webm"
  if (file.type.includes("quicktime")) return ".mov"
  if (file.type.includes("avi")) return ".avi"
  if (file.type.includes("mpeg")) return ".mp3"
  if (file.type.includes("wav")) return ".wav"
  if (file.type.includes("ogg")) return ".ogg"
  if (file.type.includes("m4a")) return ".m4a"
  return ".bin"
}

export async function POST(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const kind = formData.get("kind") === "media" ? "media" : "pdf"
    const rowId = sanitizeFileName(String(formData.get("rowId") || "ledger"))
    const role = sanitizeFileName(String(formData.get("role") || kind))

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 })
    }

    if (kind === "pdf" && !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Please upload a PDF file" }, { status: 400 })
    }

    if (
      kind === "media" &&
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/") &&
      !file.type.startsWith("audio/") &&
      !/\.(jpg|jpeg|png|webp|gif|mp4|mov|avi|webm|mp3|wav|ogg|m4a)$/i.test(file.name)
    ) {
      return NextResponse.json({ success: false, error: "Please upload an image, video, or voice message file" }, { status: 400 })
    }

    const root = uploadRoots[kind]
    const categoryFolder = kind === "media" ? mediaFolderFor(file) : ""
    const uploadDir = categoryFolder ? path.join(root.dir, categoryFolder) : root.dir
    await mkdir(uploadDir, { recursive: true })
    if (kind === "media") {
      await mkdir(path.join(root.dir, "Thumbnails"), { recursive: true })
    }

    const baseName = sanitizeFileName(path.parse(file.name || role).name || role)
    const fileName =
      kind === "media"
        ? `${timestampFilePrefix()}_${baseName}${extensionFor(file, kind)}`
        : `${rowId}-${role}-${Date.now()}-${baseName}${extensionFor(file, kind)}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const localPath = path.join(uploadDir, fileName)

    await writeFile(localPath, bytes)

    return NextResponse.json({
      success: true,
      name: file.name || fileName,
      storedName: fileName,
      url: categoryFolder
        ? `${root.publicPrefix}/${categoryFolder}/${encodeURIComponent(fileName)}`
        : `${root.publicPrefix}/${encodeURIComponent(fileName)}`,
      localPath,
      type: file.type,
      size: file.size,
      mediaKind: kind === "media" ? mediaKindFor(file) : "document",
      uploadedAt: new Date().toISOString(),
      storageFolder: uploadDir,
    })
  } catch (error) {
    console.error("Account ledger file upload failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "File upload failed" },
      { status: 500 }
    )
  }
}
