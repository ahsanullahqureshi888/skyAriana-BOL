/**
 * AQ COMPANIES — Standardized API Response & Correlation ID Architecture
 * Phase 3: Production Release Hardening (Requirements 22 & 23)
 */

import { NextResponse } from "next/server"

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    requestId: string
    details?: any
  }
}

export interface ApiSuccessBody<T = any> {
  success: true
  data: T
  meta?: {
    requestId: string
    timestamp: string
    [key: string]: any
  }
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getRequestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") || generateRequestId()
}

export function createApiError(
  code: string,
  message: string,
  statusCode = 400,
  requestId?: string,
  details?: any
): NextResponse<ApiErrorBody> {
  const reqId = requestId || generateRequestId()
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        requestId: reqId,
        ...(details && process.env.NODE_ENV !== "production" ? { details } : {}),
      },
    },
    {
      status: statusCode,
      headers: {
        "x-request-id": reqId,
        "content-type": "application/json; charset=utf-8",
      },
    }
  )
}

export function createApiSuccess<T>(
  data: T,
  statusCode = 200,
  requestId?: string,
  meta?: Record<string, any>
): NextResponse<ApiSuccessBody<T>> {
  const reqId = requestId || generateRequestId()
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId: reqId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    {
      status: statusCode,
      headers: {
        "x-request-id": reqId,
        "content-type": "application/json; charset=utf-8",
      },
    }
  )
}
