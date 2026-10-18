import type { LiveShipmentRow, OmniSearchResult } from "./types"

export function executeOmniSearch(query: string, shipments: LiveShipmentRow[]): OmniSearchResult[] {
  const q = (query || "").trim().toLowerCase()
  if (!q) return []

  const results: OmniSearchResult[] = []
  const addedKeys = new Set<string>()

  for (const s of shipments) {
    const bol = (s.bolNumber || s.referenceNumber || "").trim()
    const container = (s.containerNumber || "").trim()
    const truck = (s.truckPlate || "").trim()
    const driver = (s.driverName || "").trim()
    const driverPhone = (s.driverPhone || "").trim()
    const shipper = (s.shipperName || "").trim()
    const consignee = (s.consigneeName || "").trim()
    const vessel = (s.vesselName || "").trim()
    const booking = (s.bookingNumber || "").trim()
    const commodity = (s.commodity || "").trim()

    // 1. BOL Match
    if (bol.toLowerCase().includes(q)) {
      const key = `bol-${bol}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "bol",
          title: `BOL: ${bol}`,
          subtitle: `${shipper || "Shipper"} → ${consignee || "Consignee"} | ${s.origin} to ${s.destination}`,
          badgeText: s.statusLabel,
          badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
          targetView: "bol",
          targetParam: bol,
        })
      }
    }

    // 2. Container Match
    if (container && container !== "TEMU0000000" && container.toLowerCase().includes(q)) {
      const key = `cnt-${container}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "container",
          title: `Container: ${container}`,
          subtitle: `BOL: ${bol} | Seal: ${s.sealNumber || "N/A"} | Line: ${s.shippingLine || "N/A"}`,
          badgeText: s.statusLabel,
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
          targetView: "booking-containers",
          targetParam: container,
        })
      }
    }

    // 3. Truck & Driver Match
    if (
      (truck && truck.toLowerCase().includes(q)) ||
      (driver && driver.toLowerCase().includes(q)) ||
      (driverPhone && driverPhone.toLowerCase().includes(q))
    ) {
      const key = `trk-${truck || driver}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "truck",
          title: `Driver/Truck: ${driver || "Driver"} (${truck || "No Plate"})`,
          subtitle: `Phone: ${driverPhone || "N/A"} | BOL: ${bol} | At: ${s.currentLocation}`,
          badgeText: s.statusLabel,
          badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
          targetView: "shipments",
          targetParam: s.id,
        })
      }
    }

    // 4. Booking Reference Match
    if (booking && booking.toLowerCase().includes(q)) {
      const key = `bkg-${booking}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "booking",
          title: `Booking: ${booking}`,
          subtitle: `Line: ${s.shippingLine || "Carrier"} | Vessel: ${vessel || "Pending"} | BOL: ${bol}`,
          badgeText: "Carrier Booking",
          badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
          targetView: "booking-containers",
          targetParam: booking,
        })
      }
    }

    // 5. Shipper / Consignee / Customer Match
    if (
      (shipper && shipper.toLowerCase().includes(q)) ||
      (consignee && consignee.toLowerCase().includes(q))
    ) {
      const partyName = shipper.toLowerCase().includes(q) ? shipper : consignee
      const key = `cus-${partyName.toLowerCase()}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "customer",
          title: `Client: ${partyName}`,
          subtitle: `Active BOL: ${bol} | Cargo: ${commodity || "Goods"}`,
          badgeText: "Customer Ledger",
          badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
          targetView: "accounting",
          targetParam: partyName,
        })
      }
    }

    // 6. Vessel Match
    if (vessel && vessel.toLowerCase().includes(q)) {
      const key = `vsl-${vessel}`
      if (!addedKeys.has(key)) {
        addedKeys.add(key)
        results.push({
          id: key,
          type: "vessel",
          title: `Vessel: ${vessel} (Voy: ${s.voyageNumber || "N/A"})`,
          subtitle: `Discharge: ${s.destination} | Containers: ${container || "Multiple"}`,
          badgeText: "Sea Transit",
          badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
          targetView: "shipments",
          targetParam: s.id,
        })
      }
    }

    if (results.length >= 25) break
  }

  return results
}
