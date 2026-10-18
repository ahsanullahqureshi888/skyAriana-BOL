import { NextResponse } from "next/server"
import { getLedgerSystemDb, saveLedgerSystemDb } from "@/lib/services/ledger-db-service"
import { AccountRecord, AccountType } from "@/lib/types/ledger-system"
import crypto from "crypto"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as AccountType | null
    const currency = searchParams.get("currency")
    const search = (searchParams.get("search") || "").trim().toLowerCase()
    const filter = searchParams.get("filter") // "outstanding" | "credit" | "all"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))

    const db = await getLedgerSystemDb()
    let accounts = db.accounts.filter((a) => a.status !== "merged")

    if (type) {
      accounts = accounts.filter((a) => a.account_type === type)
    }

    if (currency) {
      accounts = accounts.filter((a) => a.currency === currency)
    }

    if (search) {
      accounts = accounts.filter(
        (a) =>
          a.account_name.toLowerCase().includes(search) ||
          a.display_name.toLowerCase().includes(search) ||
          (a.account_code && a.account_code.toLowerCase().includes(search)) ||
          a.aliases.some((alias) => alias.toLowerCase().includes(search))
      )
    }

    if (filter === "outstanding") {
      accounts = accounts.filter((a) => a.current_balance > 0.01)
    } else if (filter === "credit") {
      accounts = accounts.filter((a) => a.current_balance < -0.01)
    }

    // Sort accounts alphabetically by display name
    accounts.sort((a, b) => a.display_name.localeCompare(b.display_name))

    // Summary statistics grouped by currency
    const summaryByCurrency: Record<
      string,
      {
        totalDebit: number
        totalCredit: number
        netBalance: number
        outstandingAmount: number
        creditAdvanceAmount: number
        accountCount: number
        outstandingCount: number
        creditCount: number
      }
    > = {}

    for (const acc of db.accounts) {
      if (acc.status === "merged") continue
      const c = acc.currency || "USD"
      if (!summaryByCurrency[c]) {
        summaryByCurrency[c] = {
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          outstandingAmount: 0,
          creditAdvanceAmount: 0,
          accountCount: 0,
          outstandingCount: 0,
          creditCount: 0,
        }
      }
      summaryByCurrency[c].totalDebit += acc.total_debit
      summaryByCurrency[c].totalCredit += acc.total_credit
      summaryByCurrency[c].netBalance += acc.current_balance
      summaryByCurrency[c].accountCount++

      if (acc.current_balance > 0.01) {
        summaryByCurrency[c].outstandingAmount += acc.current_balance
        summaryByCurrency[c].outstandingCount++
      } else if (acc.current_balance < -0.01) {
        summaryByCurrency[c].creditAdvanceAmount += Math.abs(acc.current_balance)
        summaryByCurrency[c].creditCount++
      }
    }

    // Round stats
    Object.keys(summaryByCurrency).forEach((c) => {
      const s = summaryByCurrency[c]
      s.totalDebit = Math.round(s.totalDebit * 100) / 100
      s.totalCredit = Math.round(s.totalCredit * 100) / 100
      s.netBalance = Math.round(s.netBalance * 100) / 100
      s.outstandingAmount = Math.round(s.outstandingAmount * 100) / 100
      s.creditAdvanceAmount = Math.round(s.creditAdvanceAmount * 100) / 100
    })

    const totalAccounts = accounts.length
    const paginated = accounts.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      success: true,
      accounts: paginated,
      pagination: {
        total: totalAccounts,
        page,
        limit,
        totalPages: Math.ceil(totalAccounts / limit),
      },
      summaryByCurrency,
    })
  } catch (error: any) {
    console.error("[api/accounting/ledgers GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { account_name, account_type, currency, opening_balance, notes } = body

    if (!account_name || !account_name.trim()) {
      return NextResponse.json({ success: false, error: "Account name is required" }, { status: 400 })
    }

    const db = await getLedgerSystemDb()
    const trimmed = account_name.trim()

    const existing = db.accounts.find(
      (a) => a.account_name.toLowerCase() === trimmed.toLowerCase() && a.status !== "merged"
    )
    if (existing) {
      return NextResponse.json({ success: false, error: "An account with this name already exists." }, { status: 409 })
    }

    const accountId = `ACC-${crypto.randomBytes(6).toString("hex")}`
    const opBal = Number(opening_balance) || 0

    const newAccount: AccountRecord = {
      id: accountId,
      account_code: `AC-${String(db.accounts.length + 1).padStart(6, "0")}`,
      account_name: trimmed,
      display_name: trimmed,
      normalized_name: trimmed.toUpperCase().replace(/[\s\-_]+/g, " "),
      aliases: [],
      account_type: account_type || "customer",
      currency: currency || "USD",
      opening_balance: opBal,
      total_debit: 0,
      total_credit: 0,
      current_balance: opBal,
      status: "active",
      source: "manual",
      notes: notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    db.accounts.push(newAccount)
    await saveLedgerSystemDb(db)

    return NextResponse.json({ success: true, account: newAccount })
  } catch (error: any) {
    console.error("[api/accounting/ledgers POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
