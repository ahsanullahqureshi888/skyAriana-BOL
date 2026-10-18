import { NextRequest, NextResponse } from "next/server"
import {
  generateShipmentMessage,
  generatePaymentReminder,
  generateAccountBalanceSummary,
  generateDocumentReadyNotice,
  getCommunicationContext,
  renderTemplateText,
  getAllTemplates,
} from "@/lib/services/communication-service"
import type {
  CommunicationType,
  MessageLanguage,
  MessageLengthMode,
  RenderTemplateOptions,
  TemplateCategory,
} from "@/lib/types/communication"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type = "SHIPMENT_STATUS" as CommunicationType,
      entityType = "BOL",
      entityId,
      category,
      level = "DUE_SOON",
      documentTypes = [],
      language = "en" as MessageLanguage,
      lengthMode = "STANDARD" as MessageLengthMode,
      isCustomerSafe = true,
      customRemark,
      omitMissing = false,
      customTemplateText,
    } = body

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: "entityId is required" },
        { status: 400 }
      )
    }

    const options: RenderTemplateOptions = {
      language,
      lengthMode,
      isCustomerSafe,
      customRemark,
      omitMissing,
    }

    if (type === "PAYMENT_REMINDER") {
      const res = await generatePaymentReminder(entityId, level, options)
      return NextResponse.json({ success: true, ...res })
    }

    if (type === "BALANCE_SUMMARY") {
      const res = await generateAccountBalanceSummary(entityId, options)
      return NextResponse.json({ success: true, ...res })
    }

    if (type === "DOCUMENT_NOTICE") {
      const res = await generateDocumentReadyNotice(entityId, documentTypes, options)
      return NextResponse.json({ success: true, ...res })
    }

    if (customTemplateText) {
      const context = await getCommunicationContext(entityType, entityId)
      const text = renderTemplateText(customTemplateText, context, options)
      return NextResponse.json({ success: true, text, context })
    }

    // Default: SHIPMENT_STATUS
    const cat: TemplateCategory = category || "Shipment Created"
    const res = await generateShipmentMessage(entityId, cat, options)
    return NextResponse.json({ success: true, ...res })
  } catch (error: any) {
    console.error("[API Communications Generate] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate communication" },
      { status: 500 }
    )
  }
}
