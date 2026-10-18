import { NextRequest, NextResponse } from "next/server"
import { getTreasuryTransactions, appendTreasuryTransaction, getTreasuryAccountById } from "@/lib/treasury/treasury-service"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"
import { roundMoney, addMoney, subMoney, getCurrencyDecimals } from "@/lib/utils/money"
import { createClient } from "@/lib/supabase/server"

async function resolveUser(request: NextRequest) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) user = data.user
    } catch (e) {}
  }
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  return { user, role }
}

export async function GET(request: NextRequest) {
  const { role } = await resolveUser(request)
  if (role === "shipper" || role === "client") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId") || undefined
    const type = searchParams.get("type") || undefined
    const fromDate = searchParams.get("fromDate") || undefined
    const toDate = searchParams.get("toDate") || undefined

    let transactions = await getTreasuryTransactions(accountId)

    if (type) {
      transactions = transactions.filter((t) => t.transaction_type.toLowerCase() === type.toLowerCase())
    }
    if (fromDate) {
      transactions = transactions.filter((t) => (t.posting_date || t.transaction_date) >= fromDate)
    }
    if (toDate) {
      transactions = transactions.filter((t) => (t.posting_date || t.transaction_date) <= toDate)
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  } catch (error: any) {
    console.error("[Treasury Transactions API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role !== "superadmin" && role !== "admin" && role !== "accountant") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to post treasury adjustments" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { treasury_account_id, amount, is_credit, reason, date } = body

    if (!treasury_account_id || !amount || !reason) {
      return NextResponse.json({ success: false, error: "Account, amount, and reason are required for adjustments." }, { status: 400 })
    }

    const account = await getTreasuryAccountById(treasury_account_id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Treasury account not found." }, { status: 404 })
    }

    const txDate = date || new Date().toISOString().split("T")[0]
    await assertAccountingPeriodOpen(txDate, {
      role,
      actor: user?.email || role,
      entityType: "cash_adjustment",
      entityId: account.account_code,
    })

    const dec = getCurrencyDecimals(account.currency)
    const roundedAmount = roundMoney(amount, dec)
    const amountIn = is_credit ? roundedAmount : 0
    const amountOut = !is_credit ? roundedAmount : 0
    const nextBal = is_credit
      ? addMoney(account.current_balance, roundedAmount, account.currency)
      : subMoney(account.current_balance, roundedAmount, account.currency)

    const transaction = await appendTreasuryTransaction({
      treasury_account_id: account.id,
      transaction_date: txDate,
      posting_date: txDate,
      transaction_type: "CASH_ADJUSTMENT",
      description: `Manual Adjustment: ${reason}`,
      reference_number: `ADJ-${Date.now()}`,
      amount_in: amountIn,
      amount_out: amountOut,
      currency: account.currency,
      balance_after: nextBal,
      status: "POSTED",
      created_by: user?.email || role || "Accountant",
    })

    return NextResponse.json({
      success: true,
      data: transaction,
      message: "Adjustment posted successfully.",
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Treasury Transactions API] POST adjustment error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
