import { createClient } from '@/lib/supabase/client'
import { BillOfLadingFormData } from '@/lib/types/bill-of-lading'

export class BOLService {
  private supabase = createClient()

  // Fetch all BOLs
  async fetchBOLs() {
    try {
      const response = await fetch('/api/bol')
      if (!response.ok) throw new Error('Failed to fetch BOLs')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error fetching BOLs:', error)
      throw error
    }
  }

  // Fetch single BOL
  async fetchBOL(id: string) {
    try {
      const response = await fetch(`/api/bol/${id}`)
      if (!response.ok) throw new Error('BOL not found')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error fetching BOL:', error)
      throw error
    }
  }

  // Create new BOL
  async createBOL(data: Partial<BillOfLadingFormData>) {
    try {
      const response = await fetch('/api/bol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create BOL')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error creating BOL:', error)
      throw error
    }
  }

  // Update BOL
  async updateBOL(id: string, data: Partial<BillOfLadingFormData>) {
    try {
      const response = await fetch(`/api/bol/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update BOL')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error updating BOL:', error)
      throw error
    }
  }

  // Delete BOL
  async deleteBOL(id: string) {
    try {
      const response = await fetch(`/api/bol/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete BOL')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error deleting BOL:', error)
      throw error
    }
  }

  // Save BOL to Redis cache
  async cacheBOL(id: string, data: BillOfLadingFormData, expirationSeconds = 3600) {
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `bol:${id}`,
          value: data,
          expirationSeconds,
        }),
      })
      if (!response.ok) throw new Error('Failed to cache BOL')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error caching BOL:', error)
    }
  }

  // Get BOL from Redis cache
  async getCachedBOL(id: string) {
    try {
      const response = await fetch(`/api/cache?key=bol:${id}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('[v0] Error retrieving cached BOL:', error)
      return null
    }
  }

  // Record BOL history
  async recordHistory(bolId: string, action: string, changes?: any) {
    try {
      const response = await fetch(`/api/bol/${bolId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, changes }),
      })
      if (!response.ok) throw new Error('Failed to record history')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error recording history:', error)
    }
  }

  // Fetch BOL history
  async fetchHistory(bolId: string) {
    try {
      const response = await fetch(`/api/bol/${bolId}/history`)
      if (!response.ok) throw new Error('Failed to fetch history')
      return await response.json()
    } catch (error) {
      console.error('[v0] Error fetching history:', error)
      return []
    }
  }
}

// Export singleton instance
export const bolService = new BOLService()
