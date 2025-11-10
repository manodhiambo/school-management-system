export interface FeeStructure {
  id: string;
  classId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  dueDay: number;
  lateFeeAmount: number;
  lateFeePerDay: number;
  isActive: boolean;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  invoiceNumber: string;
  month: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
}

export interface FeePayment {
  id: string;
  invoiceId: string;
  paymentMethod: 'cash' | 'cheque' | 'card' | 'upi' | 'net_banking' | 'wallet';
  transactionId?: string;
  amount: number;
  paymentDate: string;
}
