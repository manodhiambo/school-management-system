import { apiClient } from '../client';
import type { FeeStructure, FeeInvoice } from '@sms/shared-types';

export const feeService = {
  async getFeeStructures(): Promise<FeeStructure[]> {
    const response = await apiClient.get<FeeStructure[]>('/fees/structures');
    return response.data;
  },

  async getStudentInvoices(studentId: string): Promise<FeeInvoice[]> {
    const response = await apiClient.get<FeeInvoice[]>(`/fees/invoices/${studentId}`);
    return response.data;
  },

  async createInvoice(data: any): Promise<FeeInvoice> {
    const response = await apiClient.post<FeeInvoice>('/fees/invoices', data);
    return response.data;
  },
};
