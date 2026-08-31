import { NextRequest, NextResponse } from "next/server"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { getBolAccountLedgerDatabase, saveBolAccountLedgerDatabase } from "@/lib/services/bol-account-ledger-storage-service"
import * as localStorage from "@/lib/services/local-storage-service"

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")
}

// GET: Fetch ledger entries by company or account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId") || searchParams.get("company_id")
    const accountName = searchParams.get("accountName") || searchParams.get("shipper_name")

    const db = await getAccountLedgerDatabase()
    const bolDb = await getBolAccountLedgerDatabase()

    let entries: any[] = []

    const candidateKeys = [
      companyId,
      companyId ? normalizeKey(companyId) : null,
      companyId ? companyId.replace(/^company-/, "") : null,
      accountName,
      accountName ? normalizeKey(accountName) : null,
      accountName ? accountName.toLowerCase() : null,
    ].filter(Boolean) as string[]

    for (const key of candidateKeys) {
      if (db.ledgerEntries[key] && Array.isArray(db.ledgerEntries[key]) && db.ledgerEntries[key].length > 0) {
        entries = db.ledgerEntries[key]
        break
      }
      if (bolDb.ledgerRecords[key] && Array.isArray(bolDb.ledgerRecords[key]) && bolDb.ledgerRecords[key].length > 0) {
        entries = bolDb.ledgerRecords[key]
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
    })
  } catch (error) {
    console.error("[ledger-entries API] GET error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch entries" },
      { status: 500 }
    )
  }
}

// POST: Create a single entry or batch import entries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const db = await getAccountLedgerDatabase()
    const bolDb = await getBolAccountLedgerDatabase()

    // Handle batch import
    if (body.entries && Array.isArray(body.entries)) {
      const companyId = body.companyId || body.company_id || (body.entries[0]?.company_id) || "default"
      const cleanKey = normalizeKey(companyId)

      const formattedEntries = body.entries.map((e: any, idx: number) => ({
        id: e.id || crypto.randomUUID(),
        sNo: idx + 1,
        date: e.date || new Date().toISOString().split("T")[0],
        description: e.shipper_description || e.shipperDescription || e.description || "",
        shipperDescription: e.shipper_description || e.shipperDescription || e.description || "",
        invoiceNo: e.invoice_no || e.invoiceNo || "",
        shipDate: e.date_of_ship || e.dateOfShip || e.shipDate || "",
        dateOfShip: e.date_of_ship || e.dateOfShip || e.shipDate || "",
        barnamehNo: e.bill_of_landing || e.barnamehNo || e.bolNo || "",
        bolNo: e.bill_of_landing || e.barnamehNo || e.bolNo || "",
        billOfLanding: e.bill_of_landing || e.billOfLanding || "",
        containerNo: e.container_no || e.containerNo || "",
        containerType: e.container_type || e.containerType || "",
        containerDetails: e.container_details || e.containerDetails || "",
        consignee: e.consignee || "",
        quantity: e.quantity || "",
        driverFreight: e.driver_freight || e.driverFreight || e.driverRent || "",
        driverRent: e.driver_freight || e.driverFreight || e.driverRent || "",
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        surrenderedBL: Boolean(e.surrenderedBL || e.billOfLandingSurrendered),
        pdfFile: e.pdf_url || e.pdf_pathname || e.pdfPathname || e.pdfFile || undefined,
        pdfPathname: e.pdf_url || e.pdf_pathname || e.pdfPathname || e.pdfFile || undefined,
      }))

      const existingRows = db.ledgerEntries[cleanKey] || db.ledgerEntries[companyId] || []
      const combined = [...existingRows, ...formattedEntries]

      const newEntriesMap: Record<string, any[]> = {
        ...db.ledgerEntries,
        [cleanKey]: combined,
        [companyId]: combined,
      }

      await saveAccountLedgerDatabase({
        ledgerEntries: newEntriesMap,
      })

      await saveBolAccountLedgerDatabase({
        ledgerRecords: newEntriesMap,
      })

      return NextResponse.json({
        success: true,
        imported: formattedEntries.length,
        message: `Successfully imported ${formattedEntries.length} entries`,
      }, { status: 201 })
    }

    // Handle single entry creation
    const companyId = body.companyId || body.company_id || "default"
    const cleanKey = normalizeKey(companyId)

    const entryId = body.id || crypto.randomUUID()
    const newRow = {
      id: entryId,
      sNo: body.sNo || 1,
      date: body.date || new Date().toISOString().split("T")[0],
      description: body.shipperDescription || body.description || "",
      shipperDescription: body.shipperDescription || body.description || "",
      invoiceNo: body.invoiceNo || "",
      shipDate: body.dateOfShip || body.shipDate || "",
      dateOfShip: body.dateOfShip || body.shipDate || "",
      barnamehNo: body.barnamehNo || body.bolNo || "",
      bolNo: body.barnamehNo || body.bolNo || "",
      billOfLanding: body.billOfLanding || "",
      surrenderedBL: Boolean(body.surrenderedBL),
      containerNo: body.containerNo || "",
      containerType: body.containerType || "",
      containerDetails: body.containerDetails || "",
      consignee: body.consignee || "",
      quantity: body.quantity || "",
      driverFreight: body.driverFreight || body.driverRent || "",
      driverRent: body.driverFreight || body.driverRent || "",
      debit: Number(body.debit) || 0,
      credit: Number(body.credit) || 0,
      pdfFile: body.pdfPathname || body.pdfFile || undefined,
      pdfPathname: body.pdfPathname || body.pdfFile || undefined,
    }

    const currentRows = db.ledgerEntries[cleanKey] || db.ledgerEntries[companyId] || []
    const updatedRows = [newRow, ...currentRows.filter((r: any) => r.id !== entryId)]

    const newEntriesMap: Record<string, any[]> = {
      ...db.ledgerEntries,
      [cleanKey]: updatedRows,
      [companyId]: updatedRows,
    }

    await saveAccountLedgerDatabase({
      ledgerEntries: newEntriesMap,
    })

    await saveBolAccountLedgerDatabase({
      ledgerRecords: newEntriesMap,
    })

    return NextResponse.json({
      success: true,
      data: newRow,
    }, { status: 201 })
  } catch (error) {
    console.error("[ledger-entries API] POST error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create entry" },
      { status: 500 }
    )
  }
}

// PATCH: Atomically update any ledger entry details (especially Debit, Credit, Freight, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const entryId = body.id || body.entryId
    const barnamehNo = (body.barnamehNo || body.bolNo || "").trim()

    if (!entryId && !barnamehNo) {
      return NextResponse.json(
        { success: false, error: "Entry ID or Barnameh No is required to update" },
        { status: 400 }
      )
    }

    const db = await getAccountLedgerDatabase()
    const bolDb = await getBolAccountLedgerDatabase()

    let updated = false
    let updatedRecord: any = null

    // Helper to merge fields into an existing row
    const applyUpdates = (row: any) => {
      const merged = { ...row }
      if (body.date !== undefined) merged.date = body.date
      if (body.shipperDescription !== undefined) {
        merged.shipperDescription = body.shipperDescription
        merged.description = body.shipperDescription
      }
      if (body.invoiceNo !== undefined) merged.invoiceNo = body.invoiceNo
      if (body.dateOfShip !== undefined) {
        merged.dateOfShip = body.dateOfShip
        merged.shipDate = body.dateOfShip
      }
      if (body.barnamehNo !== undefined) {
        merged.barnamehNo = body.barnamehNo
        merged.bolNo = body.barnamehNo
      }
      if (body.billOfLanding !== undefined) merged.billOfLanding = body.billOfLanding
      if (body.surrenderedBL !== undefined) merged.surrenderedBL = Boolean(body.surrenderedBL)
      if (body.containerNo !== undefined) merged.containerNo = body.containerNo
      if (body.containerType !== undefined) merged.containerType = body.containerType
      if (body.containerDetails !== undefined) merged.containerDetails = body.containerDetails
      if (body.consignee !== undefined) merged.consignee = body.consignee
      if (body.quantity !== undefined) merged.quantity = body.quantity
      if (body.driverFreight !== undefined) {
        merged.driverFreight = body.driverFreight
        merged.driverRent = body.driverFreight
      }
      if (body.debit !== undefined) {
        merged.debit = Number(body.debit) || 0
      }
      if (body.credit !== undefined) {
        merged.credit = Number(body.credit) || 0
      }
      if (body.pdfPathname !== undefined) {
        merged.pdfPathname = body.pdfPathname
        merged.pdfFile = body.pdfPathname
      }
      return merged
    }

    // 1. Update in AccountLedgerDatabase
    const newDbEntries: Record<string, any[]> = {}
    for (const [compKey, rows] of Object.entries(db.ledgerEntries)) {
      if (Array.isArray(rows)) {
        newDbEntries[compKey] = rows.map((row) => {
          const matchId = entryId && row.id === entryId
          const matchBol = barnamehNo && ((row.barnamehNo || row.bolNo || "").trim().toLowerCase() === barnamehNo.toLowerCase())
          if (matchId || matchBol) {
            updated = true
            updatedRecord = applyUpdates(row)
            return updatedRecord
          }
          return row
        })
      } else {
        newDbEntries[compKey] = rows
      }
    }

    // 2. Update in BolAccountLedgerDatabase
    const newBolRecords: Record<string, any[]> = {}
    for (const [compKey, rows] of Object.entries(bolDb.ledgerRecords)) {
      if (Array.isArray(rows)) {
        newBolRecords[compKey] = rows.map((row) => {
          const matchId = entryId && row.id === entryId
          const matchBol = barnamehNo && ((row.barnamehNo || row.bolNo || "").trim().toLowerCase() === barnamehNo.toLowerCase())
          if (matchId || matchBol) {
            updated = true
            updatedRecord = applyUpdates(row)
            return updatedRecord
          }
          return row
        })
      } else {
        newBolRecords[compKey] = rows
      }
    }

    // If row was not found in existing arrays, add it to target company or default
    if (!updated && (body.companyId || body.company_id || body.shipperDescription)) {
      const compKey = normalizeKey(body.companyId || body.company_id || body.shipperDescription || "default")
      const newEntry = applyUpdates({
        id: entryId || crypto.randomUUID(),
        date: body.date || new Date().toISOString().split("T")[0],
        shipperDescription: body.shipperDescription || "",
        barnamehNo: barnamehNo,
      })
      newDbEntries[compKey] = [newEntry, ...(newDbEntries[compKey] || [])]
      newBolRecords[compKey] = [newEntry, ...(newBolRecords[compKey] || [])]
      updated = true
      updatedRecord = newEntry
    }

    await saveAccountLedgerDatabase({
      ledgerEntries: newDbEntries,
    })

    await saveBolAccountLedgerDatabase({
      ledgerRecords: newBolRecords,
    })

    // 3. Also update local BOL if linked to a Barnameh No
    const targetBolNo = barnamehNo || updatedRecord?.barnamehNo || updatedRecord?.bolNo
    if (targetBolNo) {
      try {
        const existingBol = await localStorage.getLocalBOL(targetBolNo)
        if (existingBol) {
          await localStorage.updateLocalBOL(targetBolNo, {
            ...existingBol,
            debit: updatedRecord?.debit !== undefined ? updatedRecord.debit : existingBol.debit,
            credit: updatedRecord?.credit !== undefined ? updatedRecord.credit : existingBol.credit,
            driver_rent: updatedRecord?.driverFreight || existingBol.driver_rent,
            updated_at: new Date().toISOString(),
          })
        }
      } catch (e) {
        console.warn("[ledger-entries API] Warning updating local BOL:", e)
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord || body,
      message: "Ledger entry updated and persisted successfully",
    })
  } catch (error) {
    console.error("[ledger-entries API] PATCH error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update entry" },
      { status: 500 }
    )
  }
}

// DELETE: Delete a ledger entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const barnamehNo = searchParams.get("barnamehNo")

    if (!id && !barnamehNo) {
      return NextResponse.json(
        { success: false, error: "Entry ID or Barnameh No is required to delete" },
        { status: 400 }
      )
    }

    const db = await getAccountLedgerDatabase()
    const bolDb = await getBolAccountLedgerDatabase()

    const newDbEntries: Record<string, any[]> = {}
    for (const [k, rows] of Object.entries(db.ledgerEntries)) {
      if (Array.isArray(rows)) {
        newDbEntries[k] = rows.filter((r) => {
          if (id && r.id === id) return false
          if (barnamehNo && (r.barnamehNo === barnamehNo || r.bolNo === barnamehNo)) return false
          return true
        })
      } else {
        newDbEntries[k] = rows
      }
    }

    const newBolRecords: Record<string, any[]> = {}
    for (const [k, rows] of Object.entries(bolDb.ledgerRecords)) {
      if (Array.isArray(rows)) {
        newBolRecords[k] = rows.filter((r) => {
          if (id && r.id === id) return false
          if (barnamehNo && (r.barnamehNo === barnamehNo || r.bolNo === barnamehNo)) return false
          return true
        })
      } else {
        newBolRecords[k] = rows
      }
    }

    const newDeleted = [
      ...(Array.isArray(db.deletedLedgerEntries) ? db.deletedLedgerEntries : []),
      {
        entry: { id: id || undefined, barnamehNo: barnamehNo || undefined },
        deletedAt: new Date().toISOString(),
      }
    ]

    await saveAccountLedgerDatabase({ ledgerEntries: newDbEntries, deletedLedgerEntries: newDeleted })
    await saveBolAccountLedgerDatabase({ ledgerRecords: newBolRecords, deletedLedgerEntries: newDeleted })

    return NextResponse.json({ success: true, message: "Entry deleted successfully" })
  } catch (error) {
    console.error("[ledger-entries API] DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete entry" },
      { status: 500 }
    )
  }
}
