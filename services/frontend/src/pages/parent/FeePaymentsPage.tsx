import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, CheckCircle, AlertCircle, Clock, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function FeePaymentsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [feeDetails, setFeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // M-Pesa payment state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');

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
      const response: any = await api.getParentByUserId(user?.id || '');
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

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance?.toString() || invoice.amount?.toString() || '');
    setPhoneNumber('');
    setPaymentStatus('idle');
    setPaymentMessage('');
    setPaymentModalOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!selectedInvoice || !phoneNumber || !paymentAmount) {
      setPaymentMessage('Please fill in all fields');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentMessage('Please enter a valid amount');
      return;
    }

    if (amount > parseFloat(selectedInvoice.balance || selectedInvoice.amount)) {
      setPaymentMessage('Amount exceeds the balance due');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setPaymentMessage('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentStatus('processing');
      setPaymentMessage('Sending payment request to your phone...');

      const response: any = await api.initiateMpesaPayment(
        selectedInvoice.id,
        phoneNumber.replace(/\s/g, ''),
        amount
      );

      console.log('M-Pesa response:', response);

      if (response.data?.success || response.success) {
        setPaymentStatus('success');
        setPaymentMessage(
          response.data?.message || response.message || 
          'Payment request sent! Please check your phone and enter your M-Pesa PIN to complete the payment.'
        );
        
        // Poll for payment status (optional - can be done via callback)
        // After successful payment, reload fee details
        setTimeout(() => {
          loadFeeDetails(selectedChild.student_id || selectedChild.id);
        }, 5000);
      } else {
        setPaymentStatus('failed');
        setPaymentMessage(response.data?.message || response.message || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      setPaymentStatus('failed');
      setPaymentMessage(error?.message || 'Failed to initiate M-Pesa payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedInvoice(null);
    setPhoneNumber('');
    setPaymentAmount('');
    setPaymentStatus('idle');
    setPaymentMessage('');
    
    // Reload fee details to get updated payment status
    if (selectedChild) {
      loadFeeDetails(selectedChild.student_id || selectedChild.id);
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
        <p className="text-gray-500">Manage and pay school fees via M-Pesa</p>
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
                  KES {parseFloat(feeDetails?.total_fees || '0').toLocaleString()}
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
                  KES {parseFloat(feeDetails?.paid || '0').toLocaleString()}
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
                  KES {parseFloat(feeDetails?.pending || '0').toLocaleString()}
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
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">
                            {invoice.description || invoice.invoice_number || 'School Fees'}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : invoice.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="text-left md:text-right">
                          <p className="text-lg font-bold">
                            KES {parseFloat(invoice.amount || invoice.net_amount || 0).toLocaleString()}
                          </p>
                          {invoice.balance > 0 && (
                            <p className="text-sm text-red-600">
                              Balance: KES {parseFloat(invoice.balance).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {invoice.status !== 'paid' && parseFloat(invoice.balance || invoice.amount) > 0 && (
                          <Button
                            onClick={() => openPaymentModal(invoice)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Pay with M-Pesa
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
              {feeDetails?.payment_history && feeDetails.payment_history.length > 0 ? (
                <div className="space-y-2">
                  {feeDetails.payment_history.map((payment: any, index: number) => (
                    <div key={payment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{payment.description || 'Fee Payment'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                          {payment.transaction_id && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {payment.transaction_id}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          KES {parseFloat(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{payment.payment_method || 'N/A'}</p>
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

      {/* M-Pesa Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/512px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" className="h-6" />
              Pay with M-Pesa
            </DialogTitle>
            <DialogDescription>
              Enter your M-Pesa registered phone number to receive a payment prompt
            </DialogDescription>
          </DialogHeader>

          {paymentStatus === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice</Label>
                <Input
                  id="invoice"
                  value={selectedInvoice?.invoice_number || selectedInvoice?.description || 'School Fees'}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={selectedInvoice?.balance || selectedInvoice?.amount}
                />
                <p className="text-xs text-gray-500">
                  Maximum: KES {parseFloat(selectedInvoice?.balance || selectedInvoice?.amount || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                />
                <p className="text-xs text-gray-500">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              {paymentMessage && (
                <p className="text-sm text-red-600">{paymentMessage}</p>
              )}
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium">Processing Payment</p>
              <p className="text-gray-500">{paymentMessage}</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium text-green-600">Payment Request Sent!</p>
              <p className="text-gray-500 mt-2">{paymentMessage}</p>
              <p className="text-sm text-gray-400 mt-4">
                You will receive an SMS confirmation once the payment is complete.
              </p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <p className="text-lg font-medium text-red-600">Payment Failed</p>
              <p className="text-gray-500 mt-2">{paymentMessage}</p>
            </div>
          )}

          <DialogFooter>
            {paymentStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={closePaymentModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMpesaPayment} 
                  disabled={paymentLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Send Payment Request
                    </>
                  )}
                </Button>
              </>
            )}
            {(paymentStatus === 'success' || paymentStatus === 'failed') && (
              <Button onClick={closePaymentModal}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
