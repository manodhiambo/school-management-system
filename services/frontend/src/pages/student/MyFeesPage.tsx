import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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
  }, [user]);

  const loadFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getStudentFeeAccount(user?.id);
      console.log('My fees:', response);
      setFees(response);
    } catch (error: any) {
      console.error('Error loading fees:', error);
      setError(error?.message || 'Failed to load fee information');
    } finally {
      setLoading(false);
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
            <div className="text-2xl font-bold">
              KES {parseFloat(fees?.total_fees || '0').toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              KES {parseFloat(fees?.paid || '0').toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              KES {parseFloat(fees?.pending || '0').toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {fees?.invoices && fees.invoices.length > 0 ? (
            <div className="space-y-4">
              {fees.invoices.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium">{invoice.description || `Term ${invoice.term}`}</p>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold">KES {parseFloat(invoice.amount).toLocaleString()}</p>
                      <p className={`text-sm ${
                        invoice.status === 'paid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {invoice.status}
                      </p>
                    </div>
                    {invoice.status === 'pending' && (
                      <Button size="sm">Pay with M-Pesa</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No fee invoices found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
