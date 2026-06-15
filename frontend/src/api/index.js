import api from './axios'

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
  getSuperAdmin: () => api.get('/dashboard/super-admin'),
  getAutomoveis: () => api.get('/dashboard/automoveis'),
}

// Clients
export const clientsAPI = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

// Products
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  categories: () => api.get('/products/categories'),
}

// Stock
export const stockAPI = {
  list: (params) => api.get('/movements', { params }),
  create: (data) => api.post('/movements', data),
}

// Orders
export const ordersAPI = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  delete: (id) => api.delete(`/orders/${id}`),
}

// Reports
export const reportsAPI = {
  sales: (params) => api.get('/reports/sales', { params }),
  stock: (params) => api.get('/reports/stock', { params }),
  clients: (params) => api.get('/reports/clients', { params }),
  exportSales: (params) => api.get('/reports/sales/export', { params, responseType: 'blob' }),
  exportStock: (params) => api.get('/reports/stock/export', { params, responseType: 'blob' }),
  exportClients: (params) => api.get('/reports/clients/export', { params, responseType: 'blob' }),
  builderSources: () => api.get('/reports/builder/sources'),
  builder: (data, format = 'json') =>
    api.post(`/reports/builder?format=${format}`, data, format !== 'json' ? { responseType: 'blob' } : {}),
  // Power BI
  powerbiReports: () => api.get('/reports/powerbi/reports'),
  powerbiWorkspaces: () => api.get('/reports/powerbi/workspaces'),
}

// Report Config (super admin)
export const reportConfigAPI = {
  getMyPermissions: () => api.get('/companies/me/report-permissions'),
  getPermissions: (id) => api.get(`/companies/${id}/report-permissions`),
  updatePermissions: (id, data) => api.put(`/companies/${id}/report-permissions`, data),
}

// WhatsApp
export const whatsappAPI = {
  adminOverview: () => api.get('/whatsapp/admin/overview'),
  botStatus: () => api.get('/whatsapp/bot/status'),
  botQr: () => api.get('/whatsapp/bot/qr'),
  botGroups: () => api.get('/whatsapp/bot/groups'),
  botContacts: (params) => api.get('/whatsapp/bot/contacts', { params }),
  getSettings: () => api.get('/whatsapp/settings'),
  updateSettings: (data) => api.put('/whatsapp/settings', data),
  test: (data) => api.post('/whatsapp/test', data),
  status: () => api.post('/whatsapp/status'),
  send: (data) => api.post('/whatsapp/send', data),
  sendReport: () => api.post('/whatsapp/send-report'),
  // Usage & Credits
  getMyUsage: () => api.get('/whatsapp/usage/me'),
  getAllUsage: () => api.get('/whatsapp/usage/all'),
  getCompanyUsage: (id) => api.get(`/whatsapp/usage/${id}`),
  addCredits: (id, amount, reason) => api.post(`/whatsapp/credits/${id}`, null, { params: { amount, reason } }),
}

// Users
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

// Companies (super admin)
export const companiesAPI = {
  list: (params) => api.get('/companies', { params }),
  get: (id) => api.get(`/companies/${id}`),
  me: () => api.get('/companies/me'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  updateMe: (data) => api.put('/companies/me', data),
  delete: (id) => api.delete(`/companies/${id}`),
}

// Trabalhadores e Documentos (Construção Civil)
export const trabalhadoresAPI = {
  list: (params) => api.get('/trabalhadores', { params }),
  create: (data) => api.post('/trabalhadores', data),
  update: (id, data) => api.put(`/trabalhadores/${id}`, data),
  delete: (id) => api.delete(`/trabalhadores/${id}`),
  listDocumentos: (id) => api.get(`/trabalhadores/${id}/documentos`),
  uploadDocumento: (id, formData) => api.post(`/trabalhadores/${id}/documentos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  replaceDocumento: (id, docId, formData) => api.post(`/trabalhadores/${id}/documentos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocumento: (trabId, docId) => api.delete(`/trabalhadores/${trabId}/documentos/${docId}`),
}

export const documentosAPI = {
  list: (params) => api.get('/documentos', { params }),
  upload: (entityType, entityId, formData) =>
    api.post(`/documentos?entity_type=${entityType}&entity_id=${entityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id) => api.delete(`/documentos/${id}`),
}

// Financeiro (Construção Civil)
export const financeiroAPI = {
  list: (params) => api.get('/financeiro', { params }),
  create: (data) => api.post('/financeiro', data),
  update: (id, data) => api.put(`/financeiro/${id}`, data),
  delete: (id) => api.delete(`/financeiro/${id}`),
}

// Compras & Requisições (Construção Civil)
export const comprasAPI = {
  list: (params) => api.get('/compras', { params }),
  get: (id) => api.get(`/compras/${id}`),
  create: (data) => api.post('/compras', data),
  updateStatus: (id, data) => api.patch(`/compras/${id}/status`, data),
  delete: (id) => api.delete(`/compras/${id}`),
  addItem: (reqId, data) => api.post(`/compras/${reqId}/items`, data),
  deleteItem: (reqId, itemId) => api.delete(`/compras/${reqId}/items/${itemId}`),
}

// Orçamentos (Construção Civil)
export const orcamentosAPI = {
  list: (params) => api.get('/orcamentos', { params }),
  get: (id) => api.get(`/orcamentos/${id}`),
  create: (data) => api.post('/orcamentos', data),
  update: (id, data) => api.put(`/orcamentos/${id}`, data),
  delete: (id) => api.delete(`/orcamentos/${id}`),
  addItem: (orcId, data) => api.post(`/orcamentos/${orcId}/items`, data),
  updateItem: (orcId, itemId, data) => api.put(`/orcamentos/${orcId}/items/${itemId}`, data),
  deleteItem: (orcId, itemId) => api.delete(`/orcamentos/${orcId}/items/${itemId}`),
}

// Obras (Construção Civil)
export const obrasAPI = {
  list: (params) => api.get('/obras', { params }),
  get: (id) => api.get(`/obras/${id}`),
  create: (data) => api.post('/obras', data),
  update: (id, data) => api.put(`/obras/${id}`, data),
  delete: (id) => api.delete(`/obras/${id}`),
  createEtapa: (obraId, data) => api.post(`/obras/${obraId}/etapas`, data),
  updateEtapa: (obraId, etapaId, data) => api.put(`/obras/${obraId}/etapas/${etapaId}`, data),
  deleteEtapa: (obraId, etapaId) => api.delete(`/obras/${obraId}/etapas/${etapaId}`),
}

// Financeiro Auto (Loja de Carros)
export const gastosAutoAPI = {
  list: (params) => api.get('/gastos-auto', { params }),
  create: (data) => api.post('/gastos-auto', data),
  update: (id, data) => api.put(`/gastos-auto/${id}`, data),
  delete: (id) => api.delete(`/gastos-auto/${id}`),
}

// Veículos (Loja de Carros)
export const veiculosAPI = {
  list: (params) => api.get('/veiculos', { params }),
  get: (id) => api.get(`/veiculos/${id}`),
  create: (data) => api.post('/veiculos', data),
  update: (id, data) => api.put(`/veiculos/${id}`, data),
  delete: (id) => api.delete(`/veiculos/${id}`),
  uploadFoto: (id, formData) => api.post(`/veiculos/${id}/fotos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteFoto: (id, index) => api.delete(`/veiculos/${id}/fotos/${index}`),
}

// Plans
export const plansAPI = {
  list: () => api.get('/plans'),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
}

// Payments
export const paymentsAPI = {
  list: () => api.get('/payments'),
  myPayments: () => api.get('/payments/company'),
}
