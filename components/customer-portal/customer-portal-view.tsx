"use client"

import { useState } from "react"
import { CustomerPortalHeader } from "./customer-portal-header"
import { CustomerDashboard } from "./customer-dashboard"
import { CustomerShipments } from "./customer-shipments"
import { CustomerShipmentDetailView } from "./customer-shipment-detail"
import { CustomerDocumentsView } from "./customer-documents"
import { CustomerLedgerView } from "./customer-ledger"
import { CustomerReportsView } from "./customer-reports"
import { CustomerRequestsView } from "./customer-requests"
import { CustomerProfileView } from "./customer-profile"
import type { CustomerPortalSession } from "@/lib/types/customer-portal"

interface CustomerPortalViewProps {
  session: CustomerPortalSession
  onSignOut: () => void
}

export function CustomerPortalView({ session, onSignOut }: CustomerPortalViewProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [prefilledBolForCorrection, setPrefilledBolForCorrection] = useState<{ bol: string; id: string } | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "fa" | "ps">(session.preferredLanguage || "en")

  const isRtl = currentLanguage === "fa" || currentLanguage === "ps"

  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id)
    setActiveTab("shipment-detail")
  }

  const handleRequestCorrection = (bolNumber: string, id: string) => {
    setPrefilledBolForCorrection({ bol: bolNumber, id })
    setActiveTab("requests")
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${
        isRtl ? "font-farsi" : ""
      }`}
    >
      <CustomerPortalHeader
        session={session}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          if (tab !== "shipment-detail") setSelectedShipmentId(null)
          if (tab !== "requests") setPrefilledBolForCorrection(null)
        }}
        onSignOut={onSignOut}
        currentLanguage={currentLanguage}
        onChangeLanguage={setCurrentLanguage}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "dashboard" && (
          <CustomerDashboard
            session={session}
            onViewShipments={() => setActiveTab("shipments")}
            onSelectShipment={handleSelectShipment}
            onViewDocuments={() => setActiveTab("documents")}
            onViewLedger={() => setActiveTab("ledger")}
          />
        )}

        {activeTab === "shipments" && (
          <CustomerShipments
            session={session}
            onSelectShipment={handleSelectShipment}
            onViewDocuments={(shipmentId) => {
              setActiveTab("documents")
            }}
          />
        )}

        {activeTab === "shipment-detail" && selectedShipmentId && (
          <CustomerShipmentDetailView
            session={session}
            shipmentId={selectedShipmentId}
            onBack={() => {
              setSelectedShipmentId(null)
              setActiveTab("shipments")
            }}
            onRequestCorrection={handleRequestCorrection}
          />
        )}

        {activeTab === "documents" && (
          <CustomerDocumentsView session={session} />
        )}

        {activeTab === "ledger" && session.permissions.viewAccountLedger && (
          <CustomerLedgerView session={session} />
        )}

        {activeTab === "reports" && session.permissions.viewReports && (
          <CustomerReportsView session={session} />
        )}

        {activeTab === "requests" && (
          <CustomerRequestsView
            session={session}
            initialBolNumber={prefilledBolForCorrection?.bol}
            initialShipmentId={prefilledBolForCorrection?.id}
          />
        )}

        {activeTab === "profile" && (
          <CustomerProfileView
            session={session}
            currentLanguage={currentLanguage}
            onChangeLanguage={setCurrentLanguage}
          />
        )}
      </main>

      {/* Portal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        Sky Ariana Limited — Secure Customer Consignment Portal • Certified ISO Data Isolation
      </footer>
    </div>
  )
}
