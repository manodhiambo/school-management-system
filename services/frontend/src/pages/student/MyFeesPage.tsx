import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CheckCircle, AlertCircle, Clock, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyFeesPage() {
  const { user } = useAuthStore();
  const [fees, setFees] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadFees();
    }
  }, [user?.id]);

  const loadFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getStudentFeeAccount(user?.id || '');
      console.log('My fees response:', response);
      // Handle the response - data is nested in response.data
      setFees(response?.data || response);
    } catch (error: any) {
      console.error('Error loading fees:', error);
      setError(error?.message || 'Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount || '0');
    return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadFees} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFees = parseFloat(fees?.total_fees || '0');
  const paidAmount = parseFloat(fees?.paid || '0');
  const pendingAmount = parseFloat(fees?.pending || '0');
  const invoices = fees?.invoices || [];
  const payments = fees?.payments || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Fees</h2>
        <p className="text-gray-500">View and manage your fee payments</p>
      </div>

      {/* Fee Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFees)}</div>
            <p className="text-xs text-gray-500 mt-1">All invoices combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">Total payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      {totalFees > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Payment Progress</span>
              <span className="font-medium">{((paidAmount / totalFees) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((paidAmount / totalFees) * 100, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Fee Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice: any) => (
                <div 
                  key={invoice.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{invoice.description || invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">Invoice: {invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Due: {new Date(invoice.due_date).toLocaleDateString('en-KE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(invoice.amount)}</p>
                    <p className="text-sm text-gray-500">
                      Paid: {formatCurrency(invoice.paid)}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : invoice.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No fee invoices found</p>
              <p className="text-sm text-gray-400 mt-1">Your invoices will appear here once generated</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.slice(0, 10).map((payment: any, index: number) => (
                <div 
                  key={payment.id || index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {payment.payment_method?.toUpperCase()} • {payment.receipt_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(payment.payment_date).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
