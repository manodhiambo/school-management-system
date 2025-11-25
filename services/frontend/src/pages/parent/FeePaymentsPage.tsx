import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function FeePaymentsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [feeDetails, setFeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      loadFeeDetails(selectedChild.student_id || selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use getParentByUserId instead of getParent
      const response: any = await api.getParentByUserId(user?.id);
      const parentData = response.data || response;
      const childrenData = parentData.children || [];
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error: any) {
      console.error('Error loading children:', error);
      setError(error?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadFeeDetails = async (studentId: string) => {
    try {
      const response: any = await api.getStudentFeeAccount(studentId);
      console.log('Fee details:', response);
      setFeeDetails(response.data || response);
    } catch (error: any) {
      console.error('Error loading fee details:', error);
      setFeeDetails(null);
    }
  };

  const handleMpesaPayment = async (invoiceId: string, amount: number) => {
    try {
      alert(`Initiating M-Pesa payment of KES ${amount.toLocaleString()} for invoice ${invoiceId}`);
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate M-Pesa payment');
    }
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
            <CardTitle className="text-red-600">Error Loading Fee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadChildren} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No children linked to your account</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Fee Payments</h2>
        <p className="text-gray-500">Manage and pay school fees</p>
      </div>

      {/* Child Selector */}
      <div className="flex gap-2 flex-wrap">
        {children.map((child) => (
          <Button
            key={child.student_id || child.id}
            variant={(selectedChild?.student_id || selectedChild?.id) === (child.student_id || child.id) ? "default" : "outline"}
            onClick={() => setSelectedChild(child)}
          >
            {child.first_name} {child.last_name}
          </Button>
        ))}
      </div>

      {selectedChild && (
        <>
          {/* Fee Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {parseFloat(feeDetails?.total_amount || feeDetails?.total_fees || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">This academic year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  KES {parseFloat(feeDetails?.paid_amount || feeDetails?.paid || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Cleared payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  KES {parseFloat(feeDetails?.balance || feeDetails?.pending || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Outstanding amount</p>
              </CardContent>
            </Card>
          </div>

          {/* Fee Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {feeDetails?.invoices && feeDetails.invoices.length > 0 ? (
                <div className="space-y-4">
                  {feeDetails.invoices.map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">
                            {invoice.description || `Term ${invoice.term} Fees`}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            KES {parseFloat(invoice.amount).toLocaleString()}
                          </p>
                        </div>
                        {invoice.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => handleMpesaPayment(invoice.id, invoice.amount)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No invoices found</p>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {feeDetails?.payments && feeDetails.payments.length > 0 ? (
                <div className="space-y-2">
                  {feeDetails.payments.map((payment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{payment.description || 'Fee Payment'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          KES {parseFloat(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{payment.payment_method || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No payment history</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
