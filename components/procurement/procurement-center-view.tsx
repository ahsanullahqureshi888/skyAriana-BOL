"use client"

import React, { useState, useEffect } from "react"
import { 
  Building2, 
  FileText, 
  DollarSign, 
  Truck, 
  Search, 
  Plus, 
  Activity, 
  RefreshCw, 
  AlertCircle 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { VendorsTab } from "./vendors-tab"
import { OrdersTab } from "./orders-tab"
import { RequestsTab } from "./requests-tab"
import { QuotesTab } from "./quotes-tab"
import { InvoiceMatchesTab } from "./invoice-matches-tab"

export function ProcurementCenterView() {
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Basic layout for the new module
  return (
    <div className="flex h-full w-full flex-col bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-purple-600" />
              SUPPLIER, AGENT & PROCUREMENT CENTER
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              Vendors • Rate Requests • Orders • Costs • Invoices • Payables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 font-bold">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 h-8 font-bold shadow-sm">
              <Plus className="h-4 w-4" /> New RFQ
            </Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 h-8 font-bold shadow-sm">
              <Plus className="h-4 w-4" /> Service Order
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <TabsList className="w-full flex-wrap justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 pb-px mb-6 gap-6">
            <TabsTrigger 
              value="dashboard" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="vendors" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Vendors
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Requests & RFQs
            </TabsTrigger>
            <TabsTrigger 
              value="quotes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Supplier Quotes
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Service Orders
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Invoice Matches
            </TabsTrigger>
            <TabsTrigger 
              value="contracts" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent px-1 py-2 font-bold text-slate-500 data-[state=active]:text-purple-700 data-[state=active]:shadow-none"
            >
              Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="flex-1 mt-0">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {[
                { title: "ACTIVE SUPPLIERS", value: "24", color: "text-blue-600" },
                { title: "RATE REQUESTS OPEN", value: "8", color: "text-amber-600" },
                { title: "QUOTES RECEIVED", value: "12", color: "text-emerald-600" },
                { title: "ORDERS PENDING", value: "7", color: "text-purple-600" },
                { title: "INVOICE VARIANCE", value: "3", color: "text-red-600" },
                { title: "PAYMENTS PENDING", value: "6", color: "text-orange-600" },
                { title: "ADVANCES OUT", value: "2", color: "text-sky-600" },
                { title: "CONTRACTS EXPIRING", value: "2", color: "text-rose-600" },
              ].map((kpi, idx) => (
                <Card key={idx} className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] sm:text-xs font-extrabold text-slate-500 tracking-wider uppercase mb-1">
                      {kpi.title}
                    </p>
                    <p className={`text-2xl sm:text-3xl font-black ${kpi.color}`}>
                      {kpi.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    RECENT PROCUREMENT ACTIVITY
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800">SO-2026-00125 created</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Service Order for Road Freight assigned to Vendor A</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">10 mins ago</span>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800">RFQ-2026-00125 sent</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Sent to 3 suppliers for Ocean Freight</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">1 hour ago</span>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Invoice Variance Detected</p>
                        <p className="text-[10px] font-semibold text-red-500 mt-0.5">Invoice INV-992 exceeds Order SO-2026-00118 by USD 200</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">2 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Required */}
              <Card className="shadow-sm border-amber-200">
                <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/50">
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    ACTION REQUIRED
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-none">
                          <DollarSign className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Approve Invoice Variance</p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">3 invoices require variance approval</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold">Review</Button>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-none">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Pending Service Orders</p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">7 orders waiting for manager approval</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold">Review</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="flex-1 mt-0">
            <VendorsTab />
          </TabsContent>

          <TabsContent value="requests" className="flex-1 mt-0">
            <RequestsTab />
          </TabsContent>

          <TabsContent value="quotes" className="flex-1 mt-0">
            <QuotesTab />
          </TabsContent>

          <TabsContent value="orders" className="flex-1 mt-0">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="invoices" className="flex-1 mt-0">
            <InvoiceMatchesTab />
          </TabsContent>

          <TabsContent value="contracts" className="flex-1 mt-0">
            <Card className="h-full shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-black text-slate-800">Supplier Contracts</h3>
                <p className="text-sm font-semibold text-slate-500 max-w-md mt-2">
                  Manage service agreements and track contract expiries.
                </p>
                <Button className="mt-6 font-bold" variant="outline">Import Contracts</Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
