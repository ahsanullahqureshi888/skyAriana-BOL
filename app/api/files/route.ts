/**
 * Sky Ariana Logistics — Shipment Files API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getFilteredFiles,
  uploadShipmentFile,
  getFileCenterKPI,
} from "@/lib/files/shipment-file-service"
import type { DocumentCategoryCode, DocumentType, FileSource, PhotoType } from "@/lib/types/shipment-file"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || undefined
    const bolNumber = searchParams.get("bolNumber") || undefined
    const containerNumber = searchParams.get("containerNumber") || undefined
    const companyName = searchParams.get("companyName") || undefined
    const categoryCode = (searchParams.get("categoryCode") as DocumentCategoryCode) || undefined
    const documentType = (searchParams.get("documentType") as DocumentType) || undefined
    const status = (searchParams.get("status") as any) || undefined
    const clientVisible = searchParams.get("clientVisible") ? searchParams.get("clientVisible") === "true" : undefined
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined
    const isExpired = searchParams.get("isExpired") === "true"
    const sortBy = (searchParams.get("sortBy") as any) || "newest"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)
    const includeArchived = searchParams.get("includeArchived") === "true"

    // Optional client portal isolation
    const clientCompanyId = searchParams.get("clientCompanyId") || undefined
    const userRole = searchParams.get("userRole") || undefined

    const result = await getFilteredFiles(
      {
        search,
        bolNumber,
        containerNumber,
        companyName,
        categoryCode,
        documentType,
        status,
        clientVisible,
        dateFrom,
        dateTo,
        isExpired,
      },
      {
        page,
        pageSize,
        sortBy,
        includeArchived,
        userRole,
        clientCompanyId,
      }
    )

    const kpi = await getFileCenterKPI()

    return NextResponse.json({
      success: true,
      ...result,
      kpi,
    })
  } catch (error: any) {
    console.error("[Files API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to query files" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    let fileBuffer: Buffer
    let originalFileName = ""
    let bolNumber = ""
    let bolId: string | undefined
    let containerNumber: string | undefined
    let containerId: string | undefined
    let companyName: string | undefined
    let companyId: string | undefined
    let documentCategoryCode: DocumentCategoryCode = "OTHER"
    let documentType: DocumentType = "SUPPORTING_DOCUMENT"
    let documentNumber: string | undefined
    let documentDate: string | undefined
    let expiryDate: string | undefined
    let description: string | undefined
    let clientVisible = false
    let clientDownloadable = false
    let source: FileSource = "STAFF_UPLOAD"
    let uploadedBy = "Staff User"
    let tags: string[] = []
    let replaceFileId: string | undefined
    let allowDuplicate = false
    let photoType: PhotoType | null = null
    let customsCountry: string | undefined
    let customsPort: string | undefined

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided in form-data" }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      originalFileName = file.name

      bolNumber = (formData.get("bolNumber") as string) || ""
      bolId = (formData.get("bolId") as string) || undefined
      containerNumber = (formData.get("containerNumber") as string) || undefined
      containerId = (formData.get("containerId") as string) || undefined
      companyName = (formData.get("companyName") as string) || undefined
      companyId = (formData.get("companyId") as string) || undefined
      documentCategoryCode = ((formData.get("documentCategoryCode") as DocumentCategoryCode) || "OTHER")
      documentType = ((formData.get("documentType") as DocumentType) || "SUPPORTING_DOCUMENT")
      documentNumber = (formData.get("documentNumber") as string) || undefined
      documentDate = (formData.get("documentDate") as string) || undefined
      expiryDate = (formData.get("expiryDate") as string) || undefined
      description = (formData.get("description") as string) || undefined
      clientVisible = formData.get("clientVisible") === "true"
      clientDownloadable = formData.get("clientDownloadable") === "true"
      source = ((formData.get("source") as FileSource) || "STAFF_UPLOAD")
      uploadedBy = (formData.get("uploadedBy") as string) || "Staff User"
      const tagsRaw = formData.get("tags") as string | null
      if (tagsRaw) {
        tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      }
      replaceFileId = (formData.get("replaceFileId") as string) || undefined
      allowDuplicate = formData.get("allowDuplicate") === "true"
      photoType = (formData.get("photoType") as PhotoType) || null
      customsCountry = (formData.get("customsCountry") as string) || undefined
      customsPort = (formData.get("customsPort") as string) || undefined
    } else {
      // JSON payload (Base64 fileBuffer)
      const body = await request.json()
      if (!body.fileBase64 || !body.originalFileName) {
        return NextResponse.json(
          { success: false, error: "fileBase64 and originalFileName are required for JSON upload" },
          { status: 400 }
        )
      }
      fileBuffer = Buffer.from(body.fileBase64, "base64")
      originalFileName = body.originalFileName
      bolNumber = body.bolNumber || ""
      bolId = body.bolId
      containerNumber = body.containerNumber
      containerId = body.containerId
      companyName = body.companyName
      companyId = body.companyId
      documentCategoryCode = body.documentCategoryCode || "OTHER"
      documentType = body.documentType || "SUPPORTING_DOCUMENT"
      documentNumber = body.documentNumber
      documentDate = body.documentDate
      expiryDate = body.expiryDate
      description = body.description
      clientVisible = Boolean(body.clientVisible)
      clientDownloadable = Boolean(body.clientDownloadable)
      source = body.source || "STAFF_UPLOAD"
      uploadedBy = body.uploadedBy || "Staff User"
      tags = Array.isArray(body.tags) ? body.tags : []
      replaceFileId = body.replaceFileId
      allowDuplicate = Boolean(body.allowDuplicate)
      photoType = body.photoType || null
      customsCountry = body.customsCountry
      customsPort = body.customsPort
    }

    if (!bolNumber.trim()) {
      return NextResponse.json({ success: false, error: "BOL number is required" }, { status: 400 })
    }

    const uploadResult = await uploadShipmentFile({
      fileBuffer,
      originalFileName,
      bolNumber,
      bolId,
      containerNumber,
      containerId,
      companyName,
      companyId,
      documentCategoryCode,
      documentType,
      documentNumber,
      documentDate,
      expiryDate,
      description,
      clientVisible,
      clientDownloadable,
      source,
      uploadedBy,
      tags,
      replaceFileId,
      allowDuplicate,
      photoType,
      customsCountry,
      customsPort,
    })

    if (uploadResult.isDuplicateWarning) {
      return NextResponse.json(
        {
          success: false,
          isDuplicateWarning: true,
          message: "Possible duplicate file: exact same checksum already exists on this BOL.",
          existingFileId: uploadResult.existingDuplicateId,
          file: uploadResult.file,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      file: uploadResult.file,
      isNewVersion: uploadResult.isNewVersion,
    })
  } catch (error: any) {
    console.error("[Files API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to upload file" }, { status: 400 })
  }
}
