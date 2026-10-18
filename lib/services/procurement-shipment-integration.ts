import { ServiceOrder } from "../types/procurement"
import { getAllShipments, saveShipment } from "./shipment-service"

export async function applyServiceOrderToShipment(order: ServiceOrder): Promise<void> {
  // Only apply confirmed orders that have a shipment ID
  if (!order.shipmentId) return
  if (order.status !== "CONFIRMED" && order.status !== "APPROVED" && order.status !== "IN_PROGRESS" && order.status !== "COMPLETED") return

  const shipments = await getAllShipments()
  const shipment = shipments.find(s => s.id === order.shipmentId || s.referenceNumber === order.shipmentId)
  
  if (!shipment) {
    console.warn(`Shipment not found for ServiceOrder ${order.id}`)
    return
  }

  // Update expected cost based on Service Type
  const cost = order.totalExpectedCost

  switch (order.service) {
    case "ROAD_FREIGHT":
      shipment.finance.truckFreight = cost
      break
    case "SEA_FREIGHT":
    case "AIR_FREIGHT":
      shipment.finance.supplierCost = cost
      break
    case "CUSTOMS":
    case "BORDER_HANDLING":
      shipment.finance.customsFee = cost
      break
    case "DOCUMENTATION":
      shipment.finance.documentationFee = cost
      break
    case "PORT_SERVICE":
      shipment.finance.portCharges = cost
      break
    default:
      shipment.finance.otherCosts = cost
      break
  }

  // Re-calculate outstandings/profit
  const totalCost = 
    shipment.finance.supplierCost + 
    shipment.finance.truckFreight + 
    shipment.finance.customsFee + 
    shipment.finance.documentationFee + 
    shipment.finance.portCharges + 
    shipment.finance.otherCosts + 
    shipment.finance.detentionCost + 
    shipment.finance.demurrageCost

  shipment.finance.supplierOutstanding = totalCost - shipment.finance.amountPaid
  shipment.finance.profitOrLoss = shipment.finance.customerAmount - totalCost

  await saveShipment(shipment, "Procurement System")
}
