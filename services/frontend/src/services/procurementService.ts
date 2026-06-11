import apiService from './api';

// Cast to any so TypeScript doesn't fight the interceptor's runtime type transformation
// (the interceptor returns response.data, not AxiosResponse)
const api = apiService.api as any;

export const procurementService = {
  // Dashboard
  getDashboard: () => api.get('/procurement/dashboard'),

  // Suppliers
  getSuppliers: (params?: any) => api.get('/procurement/suppliers', { params }),
  createSupplier: (data: any) => api.post('/procurement/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/procurement/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/procurement/suppliers/${id}`),
  getPrequalification: (sid: string) => api.get(`/procurement/suppliers/${sid}/prequalification`),
  createPrequalification: (sid: string, data: any) => api.post(`/procurement/suppliers/${sid}/prequalification`, data),

  // Purchase Requisitions
  getRequisitions: (params?: any) => api.get('/procurement/requisitions', { params }),
  getRequisition: (id: string) => api.get(`/procurement/requisitions/${id}`),
  createRequisition: (data: any) => api.post('/procurement/requisitions', data),
  updateRequisition: (id: string, data: any) => api.put(`/procurement/requisitions/${id}`, data),
  submitRequisition: (id: string) => api.put(`/procurement/requisitions/${id}/submit`, {}),
  approveRequisition: (id: string, comments?: string) => api.put(`/procurement/requisitions/${id}/approve`, { comments }),
  rejectRequisition: (id: string, comments?: string) => api.put(`/procurement/requisitions/${id}/reject`, { comments }),
  deleteRequisition: (id: string) => api.delete(`/procurement/requisitions/${id}`),

  // RFQs
  getRFQs: (params?: any) => api.get('/procurement/rfqs', { params }),
  getRFQ: (id: string) => api.get(`/procurement/rfqs/${id}`),
  createRFQ: (data: any) => api.post('/procurement/rfqs', data),
  publishRFQ: (id: string) => api.put(`/procurement/rfqs/${id}/publish`, {}),
  closeRFQ: (id: string) => api.put(`/procurement/rfqs/${id}/close`, {}),
  deleteRFQ: (id: string) => api.delete(`/procurement/rfqs/${id}`),

  // Quotations
  getQuotations: (params?: any) => api.get('/procurement/quotations', { params }),
  createQuotation: (data: any) => api.post('/procurement/quotations', data),
  recommendQuotation: (id: string) => api.put(`/procurement/quotations/${id}/recommend`, {}),

  // Purchase Orders
  getOrders: (params?: any) => api.get('/procurement/orders', { params }),
  getOrder: (id: string) => api.get(`/procurement/orders/${id}`),
  createOrder: (data: any) => api.post('/procurement/orders', data),
  approveOrder: (id: string) => api.put(`/procurement/orders/${id}/approve`, {}),
  sendOrder: (id: string) => api.put(`/procurement/orders/${id}/send`, {}),
  cancelOrder: (id: string) => api.put(`/procurement/orders/${id}/cancel`, {}),

  // Contracts
  getContracts: (params?: any) => api.get('/procurement/contracts', { params }),
  createContract: (data: any) => api.post('/procurement/contracts', data),
  updateContract: (id: string, data: any) => api.put(`/procurement/contracts/${id}`, data),
  deleteContract: (id: string) => api.delete(`/procurement/contracts/${id}`),

  // GRN
  getGRNs: (params?: any) => api.get('/procurement/grn', { params }),
  getGRN: (id: string) => api.get(`/procurement/grn/${id}`),
  createGRN: (data: any) => api.post('/procurement/grn', data),

  // Invoices
  getInvoices: (params?: any) => api.get('/procurement/invoices', { params }),
  createInvoice: (data: any) => api.post('/procurement/invoices', data),
  approveInvoice: (id: string) => api.put(`/procurement/invoices/${id}/approve`, {}),
  rejectInvoice: (id: string) => api.put(`/procurement/invoices/${id}/reject`, {}),

  // Payments
  getPayments: (params?: any) => api.get('/procurement/payments', { params }),
  createPayment: (data: any) => api.post('/procurement/payments', data),
  approvePayment: (id: string) => api.put(`/procurement/payments/${id}/approve`, {}),

  // Budgets
  getBudgets: () => api.get('/procurement/budgets'),
  createBudget: (data: any) => api.post('/procurement/budgets', data),
  updateBudget: (id: string, data: any) => api.put(`/procurement/budgets/${id}`, data),
  deleteBudget: (id: string) => api.delete(`/procurement/budgets/${id}`),

  // Plans
  getPlans: () => api.get('/procurement/plans'),
  createPlan: (data: any) => api.post('/procurement/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/procurement/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/procurement/plans/${id}`),

  // Assets
  getAssets: (params?: any) => api.get('/procurement/assets', { params }),
  createAsset: (data: any) => api.post('/procurement/assets', data),
  updateAsset: (id: string, data: any) => api.put(`/procurement/assets/${id}`, data),
  deleteAsset: (id: string) => api.delete(`/procurement/assets/${id}`),

  // Reports & Audit
  getReportSummary: (params?: any) => api.get('/procurement/reports/summary', { params }),
  getAuditTrail: (params?: any) => api.get('/procurement/audit', { params }),
};

export default procurementService;
