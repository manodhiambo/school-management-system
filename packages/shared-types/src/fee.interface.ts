export interface FeeStructure {
  id: string;
  classId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  dueDay: number;
  isActive: boolean;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  invoiceNumber: string;
  month: string;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
}
