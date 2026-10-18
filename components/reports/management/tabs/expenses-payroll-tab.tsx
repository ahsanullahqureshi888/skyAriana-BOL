"use client"

import React, { useState } from "react"
import {
  DollarSign,
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  Briefcase,
  FileText,
  Search
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GeneralExpenseItem, PayrollRecord } from "@/lib/reports/management-reporting-service"

interface TabProps {
  generalExpenses: GeneralExpenseItem[]
  payrollRecords: PayrollRecord[]
  expensesByCategory: { category: string; amount: number; currency: string }[]
  totalGeneralExpensesUsd: number
  totalPayrollUsd: number
  userRole?: string
  onMetricClick: (metricId: string, title: string) => void
}

export function ExpensesPayrollTab({
  generalExpenses,
  payrollRecords,
  expensesByCategory,
  totalGeneralExpensesUsd,
  totalPayrollUsd,
  userRole = "admin",
  onMetricClick,
}: TabProps) {
  const [subView, setSubView] = useState<"expenses" | "payroll">("expenses")
  const [searchTerm, setSearchTerm] = useState<string>("")

  const isPayrollAllowed =
    userRole.toLowerCase() === "superadmin" ||
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "management"

  const formatMoney = (amount: number, curr = "USD") => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const filteredExpenses = generalExpenses.filter((e) =>
    searchTerm
      ? e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  )

  const filteredPayroll = payrollRecords.filter((p) =>
    searchTerm
      ? p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.branch.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  )

  return (
    <div className="space-y-6">
      {/* Header & Sub-view Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Operating Overhead & Compensation Ledger
            </h3>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[11px] font-mono">
              Indirect Operating Costs
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Facility rent, IT infrastructure, administrative utilities, banking charges, and payroll
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSubView("expenses")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subView === "expenses"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Operating Expenses ({generalExpenses.length})
          </button>
          <button
            onClick={() => setSubView("payroll")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subView === "payroll"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Payroll & Direct Compensation {isPayrollAllowed ? `(${payrollRecords.length})` : "🔒"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Total Operating Expenses (USD)</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatMoney(totalGeneralExpensesUsd)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all branches & categories</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Staff Compensation & Salaries</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {isPayrollAllowed ? formatMoney(totalPayrollUsd) : "•••••••• USD"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isPayrollAllowed ? `${payrollRecords.length} active employees` : "Masked for your role"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Total Combined Overhead</span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {isPayrollAllowed ? formatMoney(totalGeneralExpensesUsd + totalPayrollUsd) : formatMoney(totalGeneralExpensesUsd)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Deducted from Gross Profit</div>
          </CardContent>
        </Card>
      </div>

      {/* 1. GENERAL EXPENSES VIEW */}
      {subView === "expenses" && (
        <div className="space-y-4">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {expensesByCategory.map((c) => (
              <Badge
                key={c.category}
                variant="outline"
                className="py-1 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <span className="text-slate-500 mr-1.5">{c.category}:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{formatMoney(c.amount)}</span>
              </Badge>
            ))}
          </div>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Operating Expense Voucher Register
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="text-left py-2.5 px-4 font-bold">Posting Date</th>
                      <th className="text-left py-2.5 px-3 font-bold">Category</th>
                      <th className="text-left py-2.5 px-3 font-bold">Description & Vendor</th>
                      <th className="text-center py-2.5 px-3 font-bold">Branch</th>
                      <th className="text-right py-2.5 px-4 font-bold">Amount</th>
                      <th className="text-center py-2.5 px-3 font-bold">Status</th>
                      <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono">{exp.postingDate || exp.date}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {exp.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{exp.description}</div>
                          <div className="text-[10px] text-slate-400">{exp.vendorName}</div>
                        </td>
                        <td className="text-center py-2.5 px-3">{exp.branch}</td>
                        <td className="text-right py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(exp.amount, exp.currency)}
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-300">
                            {exp.paymentStatus}
                          </Badge>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMetricClick(`expense:${exp.id}`, `${exp.description} Voucher`)}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. PAYROLL VIEW */}
      {subView === "payroll" && (
        <div>
          {!isPayrollAllowed ? (
            <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-8 text-center">
              <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Confidential Payroll Information Masked
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your user role does not possess the <span className="font-mono font-bold">payroll_summary_view</span> permission required to inspect individual staff salaries and net compensation amounts.
              </p>
            </Card>
          ) : (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Staff Compensation & Payroll Ledger
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="text-left py-2.5 px-4 font-bold">Employee Name</th>
                        <th className="text-left py-2.5 px-3 font-bold">Department</th>
                        <th className="text-center py-2.5 px-3 font-bold">Branch</th>
                        <th className="text-center py-2.5 px-3 font-bold">Period</th>
                        <th className="text-right py-2.5 px-4 font-bold">Net Salary</th>
                        <th className="text-center py-2.5 px-3 font-bold">Status</th>
                        <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredPayroll.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{pay.employeeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{pay.employeeId}</div>
                          </td>
                          <td className="py-2.5 px-3">{pay.department}</td>
                          <td className="text-center py-2.5 px-3">{pay.branch}</td>
                          <td className="text-center py-2.5 px-3 font-mono">{pay.periodMonth}</td>
                          <td className="text-right py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatMoney(pay.netSalary, pay.currency)}
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                              {pay.status}
                            </Badge>
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onMetricClick(`payroll:${pay.id}`, `${pay.employeeName} Salary Receipt`)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
