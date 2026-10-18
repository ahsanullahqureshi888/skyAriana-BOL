import { NextResponse } from "next/server"
import { getAllSuppliers } from "@/lib/services/finance-storage-service"
import { createOrUpdateSupplier } from "@/lib/services/finance-service"
import type { SupplierProfile } from "@/lib/types/finance"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")?.toLowerCase().trim()

    let suppliers: SupplierProfile[] = await getAllSuppliers()

    if (category) {
      suppliers = suppliers.filter((s: SupplierProfile) => s.category.toLowerCase() === category.toLowerCase())
    }

    if (search) {
      suppliers = suppliers.filter(
        (s: SupplierProfile) =>
          s.name.toLowerCase().includes(search) ||
          s.supplierNumber.toLowerCase().includes(search) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({ success: true, count: suppliers.length, data: suppliers })
  } catch (error: any) {
    console.error("[api/finance/suppliers GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.category) {
      return NextResponse.json(
        { success: false, error: "Supplier name and category are required" },
        { status: 400 }
      )
    }

    const supplier = await createOrUpdateSupplier(body)
    return NextResponse.json({ success: true, supplier })
  } catch (error: any) {
    console.error("[api/finance/suppliers POST] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
