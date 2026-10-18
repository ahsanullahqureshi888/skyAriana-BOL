"use strict"

function normalize(value) {
  return String(value ?? "").trim().toLowerCase()
}

function isShipmentOwnedByCustomer(shipment, customerId, customerName) {
  if (!shipment) return { isOwner: false, customerRole: "client" }
  const id = normalize(customerId)
  const name = normalize(customerName)
  const parties = [
    ["shipper", shipment.shipper],
    ["consignee", shipment.consignee],
    ["notify", shipment.notifyParty],
  ]
  for (const [role, party] of parties) {
    const partyId = normalize(party?.id)
    const partyName = normalize(party?.name)
    if ((id && partyId === id) || (name && partyName && (partyName === name || partyName.includes(name) || name.includes(partyName)))) {
      return { isOwner: true, customerRole: role }
    }
  }
  return { isOwner: false, customerRole: "client" }
}

function filterCustomerVisibleMilestones(milestones = []) {
  return milestones.filter((milestone) => {
    if (milestone?.customerVisible === false) return false
    const text = `${milestone?.title ?? ""} ${milestone?.description ?? ""}`.toLowerCase()
    return !["driver rent", "payment pending", "internal hold", "staff note", "driver payment"].some((term) => text.includes(term))
  }).map((milestone) => ({
    id: milestone.id,
    location: milestone.location,
    status: milestone.status,
    title: milestone.title,
    description: milestone.description,
    timestamp: milestone.timestamp,
    actualDate: milestone.actualDate,
    completed: milestone.completed,
  }))
}

module.exports = { isShipmentOwnedByCustomer, filterCustomerVisibleMilestones }
