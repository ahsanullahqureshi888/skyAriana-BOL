import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
});

export const downloadClientBlob = async (endpoint, filename, params) => {
  const response = await client.get(endpoint, { params, responseType: 'blob' });
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const openClientBlob = async (endpoint, filename, params) => {
  const response = await client.get(endpoint, { params, responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || 'application/pdf';
  const blob = new Blob([response.data], { type: contentType });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');

  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const getClientBlobUrl = async (endpoint, params) => {
  const response = await client.get(endpoint, { params, responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });
  return URL.createObjectURL(blob);
};

// Request interceptor to add JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sky_banking_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized access
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('sky_banking_token');
      localStorage.removeItem('sky_banking_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('sky_banking_token', response.data.access_token);
      localStorage.setItem('sky_banking_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: (name, email, password, role) =>
    client.post('/auth/register', { name, email, password, role }),
  me: () => client.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('sky_banking_token');
    localStorage.removeItem('sky_banking_user');
  },
  listUsers: () => client.get('/auth/users'),
  updateUser: (id, data) => client.put(`/auth/users/${id}`, data),
  changePassword: (id, password) => client.put(`/auth/users/${id}/password`, { password }),
  toggleUser: (id) => client.put(`/auth/users/${id}/toggle`),
  deleteUser: (id) => client.delete(`/auth/users/${id}`),
};

export const customerAPI = {
  list: () => client.get('/customers'),
  get: (id) => client.get(`/customers/${id}`),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.put(`/customers/${id}`, data),
  delete: (id) => client.delete(`/customers/${id}`),
  getLedger: (id) => client.get(`/ledger/customer/${id}`),
};

export const bankAPI = {
  list: () => client.get('/bank-accounts'),
  get: (id) => client.get(`/bank-accounts/${id}`),
  create: (data) => client.post('/bank-accounts', data),
  update: (id, data) => client.put(`/bank-accounts/${id}`, data),
  delete: (id) => client.delete(`/bank-accounts/${id}`),
  getLedger: (id) => client.get(`/ledger/bank/${id}`),
};

export const transactionAPI = {
  list: (params) => client.get('/transactions', { params }),
  get: (id) => client.get(`/transactions/${id}`),
  create: (data) => client.post('/transactions', data),
  update: (id, data) => client.put(`/transactions/${id}`, data),
  delete: (id) => client.delete(`/transactions/${id}`),
  uploadReceipt: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/transactions/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getPDFUrl: (id) => `/api/transactions/${id}/pdf`,
  downloadPDF: (id, filename = `transaction-${id}.pdf`) =>
    downloadClientBlob(`/transactions/${id}/pdf`, filename),
  openPDF: (id, filename = `transaction-${id}.pdf`) =>
    openClientBlob(`/transactions/${id}/pdf`, filename),
  getAttachmentBlobUrl: (id) => getClientBlobUrl(`/transactions/${id}/attachment`),
  openAttachment: (id, filename = `transaction-${id}-attachment`) =>
    openClientBlob(`/transactions/${id}/attachment`, filename),
  downloadAttachment: (id, filename = `transaction-${id}-attachment`) =>
    downloadClientBlob(`/transactions/${id}/attachment`, filename),
};

export const dashboardAPI = {
  getSummary: () => client.get('/dashboard/summary'),
  getRecentTransactions: (limit = 10) =>
    client.get('/dashboard/recent-transactions', { params: { limit } }),
  getMonthlyChart: () => client.get('/dashboard/monthly-chart'),
};

export const reportAPI = {
  getDaily: () => client.get('/reports/daily'),
  getMonthly: () => client.get('/reports/monthly'),
  getCustomersReport: () => client.get('/reports/customer'),
  getBanksReport: () => client.get('/reports/bank'),
  getCurrencyReport: () => client.get('/reports/currency'),
  exportExcelUrl: () => '/api/reports/export/excel',
  exportPDFUrl: () => '/api/reports/export/pdf',
  exportExcel: (filename = 'transaction-report.csv', params) =>
    downloadClientBlob('/reports/export/excel', filename, params),
  exportPDF: (filename = 'transaction-report.pdf', params) =>
    downloadClientBlob('/reports/export/pdf', filename, params),
};

export const settingsAPI = {
  get: () => client.get('/settings'),
  update: (data) => client.put('/settings', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getNextReceiptNo: () => client.get('/settings/next-receipt-no'),
};

export const ocrAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  extract: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  saveTransaction: (data) => client.post('/ocr/save-transaction', data),
  getTempPreviewUrl: (path) => `/api/ocr/temp-preview?path=${encodeURIComponent(path)}`,
  getAttachmentUrl: (id) => `/api/transactions/${id}/attachment`,
};


export const backupAPI = {
  exportUrl: () => '/api/backup/export',
  export: () => client.get('/backup/export'),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/backup/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportAttachmentsUrl: () => '/api/backup/export-attachments',
  exportAttachments: () => client.get('/backup/export-attachments', { responseType: 'blob' }),
  importAttachments: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/backup/import-attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  status: () => client.get('/backup/status'),
  auditLogs: () => client.get('/audit-logs'),
};


export default client;
