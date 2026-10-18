import axios from 'axios'
import { normalizeInvoiceParty } from '../utils/invoiceParty'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

export const getApiErrorMessage = (error: unknown, fallback = 'The request could not be completed.') => {
  if (!axios.isAxiosError(error)) return fallback

  const data = error.response?.data as any
  const detail = data?.detail
  let message = fallback
  if (typeof detail === 'string' && detail.trim()) {
    message = detail
  } else if (Array.isArray(detail) && detail.length) {
    message = detail
      .map((issue: any) => {
        const path = Array.isArray(issue?.loc) ? issue.loc.filter((part: unknown) => part !== 'body').join('.') : ''
        return path ? `${path}: ${issue?.msg || 'Invalid value'}` : (issue?.msg || 'Invalid value')
      })
      .join(' ')
  } else if (typeof data?.message === 'string' && data.message.trim()) {
    message = data.message
  } else if (error.message) {
    message = error.message
  }

  return data?.requestId ? `${message} (Request ID: ${data.requestId})` : message
}

const normalizeInvoice = (invoice: any) => {
  if (!invoice) return invoice
  const notifyParty = normalizeInvoiceParty(invoice.notifyParty ?? invoice.notify_party)
  const notifyPartySameAsConsignee = Boolean(
    notifyParty && (invoice.notifyPartySameAsConsignee ?? invoice.notify_party_same_as_consignee ?? false),
  )

  return {
    ...invoice,
    notifyParty,
    notifyPartySameAsConsignee,
    notifyPartyCustomerId: notifyParty
      ? (invoice.notifyPartyCustomerId ?? invoice.notify_party_customer_id ?? null)
      : null,
    shipperPartyId: invoice.shipperPartyId ?? invoice.shipper_party_id ?? null,
    consigneePartyId: invoice.consigneePartyId ?? invoice.consignee_party_id ?? null,
    notifyPartyId: notifyParty ? (invoice.notifyPartyId ?? invoice.notify_party_id ?? null) : null,
    shipperExporter: normalizeInvoiceParty(invoice.shipperExporter ?? invoice.shipper_exporter, true),
    consigneeBuyer: normalizeInvoiceParty(invoice.consigneeBuyer ?? invoice.consignee_buyer, true),
    notifyPartyEnabled: Boolean(notifyParty),
    documentationFees: Number(invoice.documentationFees ?? invoice.documentation_fees ?? 0),
    customsClearanceFees: Number(invoice.customsClearanceFees ?? invoice.customs_clearance_fees ?? 0),
    invoice_template: invoice.invoice_template ?? 'premium_afghan_glass',
  }
}

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return config
})

// Response interceptor to handle token expiry / authorization errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRoute = window.location.pathname === '/login'
      const isLoginEndpoint = error.config?.url?.includes('/auth/login')
      
      const currentToken = localStorage.getItem('token')
      const reqHeaders = error.config?.headers
      const requestAuth = reqHeaders?.Authorization || reqHeaders?.authorization
      const requestToken = typeof requestAuth === 'string' && requestAuth.startsWith('Bearer ')
        ? requestAuth.slice(7)
        : null

      // If request was sent with a token that doesn't match current token (e.g. stale request), ignore it
      if (currentToken && requestToken && requestToken !== currentToken) {
        return Promise.reject(error)
      }

      if (!isLoginRoute && !isLoginEndpoint) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (email: string, password: string) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    
    const response = await api.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },
  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

export const userManagementApi = {
  listUsers: async (params?: Record<string, unknown>) => {
    const response = await api.get('/users', { params })
    return response.data
  },
  getUser: async (id: number) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },
  createUser: async (data: any) => {
    const response = await api.post('/users', data)
    return response.data
  },
  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },
  suspendUser: async (id: number) => {
    const response = await api.post(`/users/${id}/suspend`)
    return response.data
  },
  activateUser: async (id: number) => {
    const response = await api.post(`/users/${id}/activate`)
    return response.data
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },
  changeRole: async (id: number, role: string) => {
    const response = await api.post(`/users/${id}/role`, { role })
    return response.data
  },
  updatePermissions: async (id: number, permissions: string[]) => {
    const response = await api.put(`/users/${id}/permissions`, { permissions })
    return response.data
  },
  resetPassword: async (id: number, data?: any) => {
    const response = await api.post(`/users/${id}/password-reset`, data || {})
    return response.data
  },
  sendInvitation: async (id: number) => {
    const response = await api.post(`/users/${id}/invitation`)
    return response.data
  },
  sendPasswordResetLink: async (id: number) => {
    const response = await api.post(`/users/${id}/password-reset-link`)
    return response.data
  },
  listRoles: async () => {
    const response = await api.get('/users/roles/list')
    return response.data
  },
  createRole: async (data: any) => {
    const response = await api.post('/users/roles', data)
    return response.data
  },
  updateRole: async (id: number, data: any) => {
    const response = await api.put(`/users/roles/${id}`, data)
    return response.data
  },
  deleteRole: async (id: number) => {
    const response = await api.delete(`/users/roles/${id}`)
    return response.data
  },
  listPermissions: async () => {
    const response = await api.get('/users/permissions/list')
    return response.data
  },
  listLoginActivity: async (params?: Record<string, unknown>) => {
    const response = await api.get('/users/login-activity', { params })
    return response.data
  },
  listSessions: async (params?: Record<string, unknown>) => {
    const response = await api.get('/users/sessions', { params })
    return response.data
  },
  revokeSession: async (id: number) => {
    const response = await api.post(`/users/sessions/${id}/revoke`)
    return response.data
  },
  revokeAllSessions: async (userId: number, exceptCurrent = true) => {
    const response = await api.post(`/users/${userId}/sessions/revoke-all`, null, { params: { except_current: exceptCurrent } })
    return response.data
  },
  getSecuritySettings: async () => {
    const response = await api.get('/users/security-settings')
    return response.data
  },
  updateSecuritySettings: async (data: any, confirmWeakening = false) => {
    const response = await api.put('/users/security-settings', data, {
      headers: confirmWeakening ? { 'x-confirm-security-change': 'true' } : undefined,
    })
    return response.data
  },
}

export const invoicesApi = {
  list: async (filters?: { search?: string; status?: string; customer_id?: number }) => {
    const response = await api.get('/invoices', { params: filters })
    return response.data
  },
  get: async (id: number) => {
    const response = await api.get(`/invoices/${id}`)
    return normalizeInvoice(response.data)
  },
  create: async (data: any) => {
    const response = await api.post('/invoices', data)
    return normalizeInvoice(response.data)
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/invoices/${id}`, data)
    return normalizeInvoice(response.data)
  },
  delete: async (id: number) => {
    const response = await api.delete(`/invoices/${id}`)
    return response.data
  },
  duplicate: async (id: number) => {
    const response = await api.post(`/invoices/${id}/duplicate`)
    return normalizeInvoice(response.data)
  },
  recordPayment: async (id: number, paymentData: { amount: number; payment_method: string; payment_date: string; reference_number?: string; notes?: string }) => {
    const response = await api.post(`/invoices/${id}/payments`, null, {
      params: paymentData,
    })
    return response.data
  },
  getPayments: async (id: number) => {
    const response = await api.get(`/invoices/${id}/payments`)
    return response.data
  },
  getPdfUrl: (id: number, token: string) => {
    return `${API_BASE_URL}/invoices/${id}/pdf?token=${token}`
  },
}

export const customersApi = {
  list: async () => {
    const response = await api.get('/customers')
    return response.data
  },
  get: async (id: number) => {
    const response = await api.get(`/customers/${id}`)
    return response.data
  },
  create: async (data: any) => {
    const response = await api.post('/customers', data)
    return response.data
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/customers/${id}`, data)
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/customers/${id}`)
    return response.data
  },
}

export const businessPartiesApi = {
  list: async (params?: { party_type?: string; search?: string; include_archived?: boolean; country?: string; review_status?: string; has_identifier?: string; source_type?: string; previously_used?: boolean; sort_by?: string; sort_direction?: string; offset?: number; limit?: number }) => {
    const response = await api.get('/business-parties', { params })
    return response.data
  },
  get: async (id: number) => {
    const response = await api.get(`/business-parties/${id}`)
    return response.data
  },
  getSnapshot: async (id: number) => {
    const response = await api.get(`/business-parties/${id}/snapshot`)
    return response.data
  },
  getUsage: async (id: number) => {
    const response = await api.get(`/business-parties/${id}/usage`)
    return response.data
  },
  relatedNotifyParties: async (id: number) => {
    const response = await api.get(`/business-parties/${id}/related-notify-parties`)
    return response.data
  },
  create: async (data: any) => {
    const response = await api.post('/business-parties', data)
    return response.data
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/business-parties/${id}`, data)
    return response.data
  },
  archive: async (id: number) => {
    const response = await api.post(`/business-parties/${id}/archive`)
    return response.data
  },
  restore: async (id: number) => {
    const response = await api.post(`/business-parties/${id}/restore`)
    return response.data
  },
  duplicateCheck: async (data: any) => {
    const response = await api.post('/business-parties/duplicate-check', data)
    return response.data
  },
  import: async () => {
    const response = await api.post('/business-parties/import')
    return response.data
  },
  importConsignees: async () => {
    const response = await api.post('/business-parties/import-consignees')
    return response.data
  },
  reviewIssues: async () => {
    const response = await api.get('/business-parties/review-issues')
    return response.data
  },
  review: async (id: number, action: 'mark_reviewed' | 'reopen' = 'mark_reviewed') => {
    const response = await api.post(`/business-parties/${id}/review`, { action })
    return response.data
  },
  assignRole: async (id: number, role: string) => {
    const response = await api.post(`/business-parties/${id}/roles`, { role })
    return response.data
  },
  merge: async (id: number, duplicatePartyId: number) => {
    const response = await api.post(`/business-parties/${id}/merge`, { duplicatePartyId })
    return response.data
  },
  export: async (partyType?: string) => {
    const response = await api.get('/business-parties/export', { params: partyType ? { party_type: partyType } : undefined })
    return response.data
  },
}

export const productsApi = {
  list: async () => {
    const response = await api.get('/products')
    return response.data
  },
  create: async (data: any) => {
    const response = await api.post('/products', data)
    return response.data
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/products/${id}`, data)
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/products/${id}`)
    return response.data
  },
}

export const settingsApi = {
  getPublicBranding: async () => {
    const response = await api.get('/settings/public-branding')
    return response.data
  },
  get: async () => {
    const response = await api.get('/settings')
    return response.data
  },
  update: async (data: any) => {
    const response = await api.put('/settings', data)
    return response.data
  },
  uploadLogo: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  uploadSignature: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/settings/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  uploadStamp: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/settings/stamp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export const dashboardApi = {
  getSummary: async () => {
    const response = await api.get('/dashboard/summary')
    return response.data
  },
  getMonthlyTotals: async () => {
    const response = await api.get('/dashboard/monthly-totals')
    return response.data
  },
  getRecentActivity: async () => {
    const response = await api.get('/dashboard/recent-activity')
    return response.data
  },
  getLogs: async (filters?: { search?: string; action?: string; entity_type?: string }) => {
    const response = await api.get('/dashboard/logs', { params: filters })
    return response.data
  },
}

export const backupApi = {
  create: async () => {
    const response = await api.post('/backup/create')
    return response.data
  },
  list: async () => {
    const response = await api.get('/backup/list')
    return response.data
  },
  delete: async (filename: string) => {
    const response = await api.delete(`/backup/delete/${filename}`)
    return response.data
  },
  downloadUrl: (filename: string, token: string) => {
    return `${API_BASE_URL}/backup/download/${filename}?token=${token}`
  },
  restore: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  exportJsonUrl: () => {
    return `${API_BASE_URL}/backup/export/json`
  },
  exportExcelUrl: () => {
    return `${API_BASE_URL}/backup/export/excel`
  },
  importCustomers: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/backup/import/customers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  importProducts: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/backup/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export const systemUpdateApi = {
  getStatus: async () => {
    const response = await api.get('/system/update-status')
    return response.data
  },
  checkUpdates: async () => {
    const response = await api.post('/system/check-updates')
    return response.data
  },
  auditIntegrity: async () => {
    const response = await api.post('/system/audit-integrity')
    return response.data
  },
  clearCache: async () => {
    const response = await api.post('/system/clear-cache')
    return response.data
  },
  installUpdate: async () => {
    const response = await api.post('/system/install-update')
    return response.data
  },
  toggleAutoGenerate: async (enabled: boolean) => {
    const response = await api.post('/system/toggle-auto-generate', { enabled })
    return response.data
  },
  publishDraft: async () => {
    const response = await api.post('/system/publish-draft')
    return response.data
  },
  logChange: async (change_description: string) => {
    const response = await api.post('/system/log-change', { change_description })
    return response.data
  },
}
