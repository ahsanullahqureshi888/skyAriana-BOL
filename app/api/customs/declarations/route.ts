import { NextRequest, NextResponse } from 'next/server'
import { customsBorderService } from '@/lib/services/customs-border-service'
import { CustomsDeclarationRecord } from '@/lib/types/customs-border'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const decls: CustomsDeclarationRecord[] = customsBorderService.getDeclarations({
      status,
      search,
    })

    return NextResponse.json({
      success: true,
      count: decls.length,
      data: decls,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.declarationNumber || !body.exporter || !body.commodity) {
      return NextResponse.json(
        { success: false, error: 'Required fields: declarationNumber, exporter, commodity' },
        { status: 400 }
      )
    }

    const decl = customsBorderService.createDeclaration(body)
    return NextResponse.json({ success: true, data: decl }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
