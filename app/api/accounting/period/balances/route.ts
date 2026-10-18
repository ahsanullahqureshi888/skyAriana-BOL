import { NextResponse } from "next/server"
import crypto from "crypto"
import {
  getAccountPeriodBalances,
  saveAccountPeriodBalances,
  getPeriodById,
  getActivePeriod,
} from "@/lib/accounting/period-closing/period-service"
import { calculatePeriodBalances } from "@/lib/accounting/period-closing/balance-calculator"
import type { AccountPeriodBalance } from "@/lib/accounting/period-closing/period-types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const accountId = searchParams.get("accountId")
    const currency = searchParams.get("currency")
    const recalculate = searchParams.get("recalculate") === "true"

    let balances: AccountPeriodBalance[] = []

    if (periodId) {
      const period = await getPeriodById(periodId)
      if (!period) {
        return NextResponse.json({ success: false, error: "Period not found" }, { status: 404 })
      }

      if (recalculate && period.status !== "CLOSED" && period.status !== "ARCHIVED") {
        const calc = await calculatePeriodBalances(period)
        balances = calc.balances
      } else {
        balances = await getAccountPeriodBalances(periodId)
        if (balances.length === 0) {
          const calc = await calculatePeriodBalances(period)
          balances = calc.balances
        }
      }
    } else {
      balances = await getAccountPeriodBalances()
    }

    if (accountId) {
      balances = balances.filter((b) => b.account_id === accountId)
    }

    if (currency) {
      balances = balances.filter((b) => b.currency === currency)
    }

    return NextResponse.json({
      success: true,
      count: balances.length,
      balances,
    })
  } catch (error: any) {
    console.error("[api/accounting/period/balances GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { period_id, account_id, account_name, account_type, currency, opening_balance } = body

    if (!period_id || !account_id || opening_balance === undefined) {
      return NextResponse.json(
        { success: false, error: "period_id, account_id, and opening_balance are required" },
        { status: 400 }
      )
    }

    const period = await getPeriodById(period_id)
    if (!period) {
      return NextResponse.json({ success: false, error: "Period not found" }, { status: 404 })
    }

    if (period.status === "CLOSED" || period.status === "ARCHIVED") {
      return NextResponse.json(
        { success: false, error: `Period [${period.code}] is CLOSED. Opening balances cannot be modified in a closed period.` },
        { status: 403 }
      )
    }

    const curr = currency || "USD"
    const openBal = Number(opening_balance) || 0
    const recId = `apb-${period.code}-${account_id}-${curr}`

    const payload = `${period.code}:${account_id}:${curr}:${openBal}:0:0:${openBal}`
    const hash = crypto.createHash("sha256").update(payload).digest("hex")

    const newBalance: AccountPeriodBalance = {
      id: recId,
      period_id,
      period_code: period.code,
      account_id,
      account_name: account_name || "Account",
      account_type: account_type || "customer",
      currency: curr,
      opening_balance: openBal,
      period_debit: 0,
      period_credit: 0,
      closing_balance: openBal,
      transaction_count: 0,
      snapshot_hash: hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveAccountPeriodBalances([newBalance])

    return NextResponse.json({
      success: true,
      message: "Opening balance configured successfully",
      balance: newBalance,
    })
  } catch (error: any) {
    console.error("[api/accounting/period/balances POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
