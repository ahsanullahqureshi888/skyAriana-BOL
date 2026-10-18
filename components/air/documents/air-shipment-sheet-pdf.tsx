'use client'

import React from 'react'
import {
  AirBookingRecord,
  AirLegRecord,
  MAWBRecord,
  CargoAcceptanceRecord,
  AirReleaseTracker,
} from '@/lib/types/air-freight'

interface AirShipmentSheetPdfProps {
  booking: AirBookingRecord
  legs: AirLegRecord[]
  mawb?: MAWBRecord
  acceptance?: CargoAcceptanceRecord
  release?: AirReleaseTracker
  printedBy?: string
}

export function AirShipmentSheetPdf({
  booking,
  legs,
  mawb,
  acceptance,
  release,
  printedBy = 'Air Operations Desk',
}: AirShipmentSheetPdfProps) {
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white text-slate-900 font-sans p-8 max-w-4xl mx-auto shadow-lg print:shadow-none print:p-4 print:max-w-none text-xs">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
            SKY ARIANA LIMITED
          </h1>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            AIR FREIGHT MOVEMENT & ACCEPTANCE RELEASE SHEET • تصدیق‌نامه کارګوی هوایی
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-mono px-3 py-1 text-xs font-bold rounded">
            BOOKING: {booking.bookingReference}
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Printed: {printDate}</p>
          <p className="text-[11px] text-slate-600">Officer: {printedBy}</p>
        </div>
      </div>

      {/* Shipment & Waybill Overview */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded mb-6 bg-slate-50">
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Shipper / Exporter</div>
          <div className="font-semibold text-slate-900 text-sm">{booking.shipper}</div>
          <div className="text-slate-600 mt-2 text-[10px] uppercase text-slate-500 font-bold">
            Consignee / Importer
          </div>
          <div className="font-semibold text-slate-900 text-sm">{booking.consignee}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Air Waybill Details</div>
          <div className="text-slate-700">
            MAWB No: <strong className="font-mono text-slate-950">{booking.mawbNumber || 'PENDING'}</strong>
          </div>
          <div className="text-slate-700">
            Airline Carrier: <strong>{booking.airlineName} (Prefix {booking.airlineAwbPrefix})</strong>
          </div>
          <div className="text-slate-700">
            Route: <strong className="font-mono">{booking.originAirportIata} ➡️ {booking.destinationAirportIata}</strong> ({booking.serviceType})
          </div>
          <div className="text-slate-700">
            Flight Date: <strong>{booking.flightDate}</strong> | Flight No: <strong>{booking.flightNumber}</strong>
          </div>
        </div>
      </div>

      {/* Cargo & Weight Specifications */}
      <div className="border border-slate-300 rounded mb-6 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-300">
          Cargo & Weight Specifications
        </div>
        <div className="p-4 grid grid-cols-4 gap-4 bg-white text-center">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Packages</div>
            <div className="text-sm font-bold text-slate-900">{booking.packagesCount} {booking.packagingType}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Scale Gross Weight</div>
            <div className="text-sm font-mono font-bold text-slate-900">{booking.grossWeightKg} Kg</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Volumetric Weight</div>
            <div className="text-sm font-mono font-bold text-slate-700">{booking.volumetricWeightKg} Kg</div>
          </div>
          <div className="bg-emerald-50 rounded p-1">
            <div className="text-[10px] text-emerald-800 uppercase font-bold">Chargeable Weight</div>
            <div className="text-sm font-mono font-bold text-emerald-900">{booking.chargeableWeightKg} Kg</div>
          </div>
        </div>
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-slate-700">
          <strong>Commodity:</strong> {booking.commodity}
        </div>
      </div>

      {/* Flight Legs Manifest */}
      <div className="border border-slate-300 rounded mb-6 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-300">
          Flight Routing & Segments
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 uppercase">
              <th className="py-2 px-3">Leg</th>
              <th className="py-2 px-3">Flight</th>
              <th className="py-2 px-3">Airline</th>
              <th className="py-2 px-3">Route</th>
              <th className="py-2 px-3">Departure (ETD)</th>
              <th className="py-2 px-3">Arrival (ETA)</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {legs.length > 0 ? (
              legs.map((leg) => (
                <tr key={leg.id} className="text-slate-800">
                  <td className="py-2 px-3 font-semibold">{leg.legNumber}</td>
                  <td className="py-2 px-3 font-mono font-bold">{leg.flightNumber}</td>
                  <td className="py-2 px-3">{leg.airlineName}</td>
                  <td className="py-2 px-3 font-mono">{leg.originAirportIata} ➡️ {leg.destinationAirportIata}</td>
                  <td className="py-2 px-3 font-mono text-[11px]">{leg.scheduledDeparture}</td>
                  <td className="py-2 px-3 font-mono text-[11px]">{leg.scheduledArrival}</td>
                  <td className="py-2 px-3 font-semibold">{leg.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-3 px-3 text-center text-slate-500">
                  Direct Flight {booking.flightNumber} on {booking.flightDate}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3-Way Release Verification */}
      <div className="border border-slate-300 rounded mb-6 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-300">
          3-Way Release Clearance Verification
        </div>
        <div className="p-4 grid grid-cols-3 gap-4 text-center">
          <div className="border border-slate-200 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase">Airline Release</span>
            <span className={`text-xs font-bold ${release?.airlineRelease ? 'text-emerald-700' : 'text-slate-400'}`}>
              {release?.airlineRelease ? 'CLEARED & GRANTED' : 'PENDING'}
            </span>
          </div>
          <div className="border border-slate-200 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase">Customs Clearance</span>
            <span className={`text-xs font-bold ${release?.customsRelease ? 'text-emerald-700' : 'text-slate-400'}`}>
              {release?.customsRelease ? 'CUSTOMS RELEASED' : 'PENDING'}
            </span>
          </div>
          <div className="border border-slate-200 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase">Terminal Release</span>
            <span className={`text-xs font-bold ${release?.terminalRelease ? 'text-emerald-700' : 'text-slate-400'}`}>
              {release?.terminalRelease ? 'THC SETTLED' : 'PENDING'}
            </span>
          </div>
        </div>
      </div>

      {/* Signatures Block */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-slate-700">
        <div>
          <div className="h-16 border-b border-dashed border-slate-400" />
          <div className="text-[10px] uppercase text-slate-500 font-bold mt-2">
            Shipper / Agent Authorization
          </div>
          <div className="text-[10px] text-slate-400">Name, Date & Stamp</div>
        </div>
        <div>
          <div className="h-16 border-b border-dashed border-slate-400" />
          <div className="text-[10px] uppercase text-slate-500 font-bold mt-2">
            Terminal / Screening Officer
          </div>
          <div className="text-[10px] text-slate-400">Security Certificate & Stamp</div>
        </div>
        <div>
          <div className="h-16 border-b border-dashed border-slate-400" />
          <div className="text-[10px] uppercase text-slate-500 font-bold mt-2">
            Consignee Receiving Agent
          </div>
          <div className="text-[10px] text-slate-400">Signature & ID Verification</div>
        </div>
      </div>
    </div>
  )
}
