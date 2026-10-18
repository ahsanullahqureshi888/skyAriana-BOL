"use client"

import { BookingMaster, ContainerLifecycle, ShippingLine, FreeDaysConfig, ContainerEvent } from "../types/booking"

const STORAGE_KEYS = {
  BOOKINGS: "sky-ariana-bookings",
  CONTAINERS: "sky-ariana-containers",
  SHIPPING_LINES: "sky-ariana-shipping-lines",
  EVENTS: "sky-ariana-container-events",
}

// Helper to safely read from local storage
const readStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (e) {
    console.error(`Error reading ${key}`, e)
    return defaultValue
  }
}

// Helper to safely write to local storage
const writeStorage = (key: string, data: any) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error(`Error writing ${key}`, e)
  }
}

export const BookingService = {
  // === SHIPPING LINES ===
  getShippingLines: (): ShippingLine[] => readStorage(STORAGE_KEYS.SHIPPING_LINES, []),
  
  saveShippingLine: (line: ShippingLine) => {
    const lines = BookingService.getShippingLines()
    const idx = lines.findIndex(l => l.id === line.id)
    if (idx >= 0) lines[idx] = line
    else lines.push(line)
    writeStorage(STORAGE_KEYS.SHIPPING_LINES, lines)
  },

  // === BOOKINGS ===
  getBookings: (): BookingMaster[] => readStorage(STORAGE_KEYS.BOOKINGS, []),
  
  getBooking: (id: string): BookingMaster | undefined => {
    return BookingService.getBookings().find(b => b.id === id)
  },

  saveBooking: (booking: BookingMaster) => {
    const bookings = BookingService.getBookings()
    const idx = bookings.findIndex(b => b.id === booking.id)
    const updated = { ...booking, updatedAt: new Date().toISOString() }
    
    if (idx >= 0) bookings[idx] = updated
    else {
      if (!updated.createdAt) updated.createdAt = new Date().toISOString()
      bookings.push(updated)
    }
    writeStorage(STORAGE_KEYS.BOOKINGS, bookings)
    return updated
  },

  // === CONTAINERS ===
  getContainers: (): ContainerLifecycle[] => readStorage(STORAGE_KEYS.CONTAINERS, []),
  
  getContainersByBooking: (bookingId: string): ContainerLifecycle[] => {
    return BookingService.getContainers().filter(c => c.bookingId === bookingId)
  },

  saveContainer: (container: ContainerLifecycle) => {
    const containers = BookingService.getContainers()
    const idx = containers.findIndex(c => c.id === container.id)
    const updated = { ...container, updatedAt: new Date().toISOString() }
    
    if (idx >= 0) containers[idx] = updated
    else {
      if (!updated.createdAt) updated.createdAt = new Date().toISOString()
      containers.push(updated)
    }
    writeStorage(STORAGE_KEYS.CONTAINERS, containers)
    return updated
  },

  // === EVENTS ===
  getEvents: (containerId: string): ContainerEvent[] => {
    const all = readStorage<ContainerEvent[]>(STORAGE_KEYS.EVENTS, [])
    return all.filter(e => e.containerId === containerId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  },

  addEvent: (event: Omit<ContainerEvent, "id">) => {
    const all = readStorage<ContainerEvent[]>(STORAGE_KEYS.EVENTS, [])
    const newEvent = { ...event, id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
    all.push(newEvent)
    writeStorage(STORAGE_KEYS.EVENTS, all)
    return newEvent
  }
}

// === FREE DAYS CALCULATION ENGINE ===
export const FreeDayEngine = {
  calculateLastFreeDay: (container: ContainerLifecycle): Date | null => {
    if (!container.freeDaysConfig) return null
    const config = container.freeDaysConfig
    
    let startDateStr: string | undefined
    switch(config.startDateRule) {
      case "Discharge Date": startDateStr = container.dischargeDate; break
      case "Availability Date": startDateStr = container.dischargeDate; break // Map to discharge if not explicitly tracked
      case "Custom Start Date": startDateStr = config.customStartDate; break
      default: break // Actual Arrival not strictly on container, usually leg
    }

    if (!startDateStr) return null

    const startDate = new Date(startDateStr)
    const totalFreeDays = config.combinedFreeDays > 0 ? config.combinedFreeDays : config.detentionFreeDays
    
    if (totalFreeDays <= 0) return startDate

    const lastFreeDay = new Date(startDate)
    lastFreeDay.setDate(lastFreeDay.getDate() + totalFreeDays)
    return lastFreeDay
  },

  calculateDetentionExposure: (container: ContainerLifecycle, checkDate: Date = new Date()): number => {
    const lastFreeDay = FreeDayEngine.calculateLastFreeDay(container)
    if (!lastFreeDay || !container.freeDaysConfig?.detentionTariff) return 0
    
    // If container is empty returned, use that date instead of checkDate
    const endDate = container.emptyReturnDate ? new Date(container.emptyReturnDate) : checkDate
    
    const diffTime = endDate.getTime() - lastFreeDay.getTime()
    const overDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (overDays <= 0) return 0

    let totalCharge = 0
    let daysRemaining = overDays

    for (const tier of container.freeDaysConfig.detentionTariff) {
      if (daysRemaining <= 0) break
      
      const tierDaysLength = tier.daysEnd ? (tier.daysEnd - tier.daysStart + 1) : 99999
      const applicableDays = Math.min(daysRemaining, tierDaysLength)
      
      totalCharge += applicableDays * tier.rate
      daysRemaining -= applicableDays
    }

    return totalCharge
  }
}
