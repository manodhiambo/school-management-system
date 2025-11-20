import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import api from '@/services/api';

export function FeePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeeStats();
  }, []);

  const loadFeeStats = async () => {
    try {
      setLoading(true);
      const response: any = await api.getFeeStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading fee stats:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Fee Management</h2>
          <p className="text-gray-500">Manage fee collection and invoicing</p>
        </div>
        <Button>
          <DollarSign className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Total Amount</span>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{parseFloat(stats?.total_amount || '0').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Collected</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{parseFloat(stats?.total_collected || '0').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Pending</span>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">₹{parseFloat(stats?.total_pending || '0').toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Invoices</span>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_invoices || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Paid Invoices</span>
                <span className="font-bold text-green-600">{stats?.paid_invoices || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Invoices</span>
                <span className="font-bold text-yellow-600">{stats?.pending_invoices || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Overdue Invoices</span>
                <span className="font-bold text-red-600">{stats?.overdue_invoices || 0}</span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Collection Rate</span>
                  <span className="font-bold text-primary">{stats?.collection_percentage || 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">
              Generate Invoices
            </Button>
            <Button className="w-full" variant="outline">
              View Defaulters
            </Button>
            <Button className="w-full" variant="outline">
              Send Payment Reminders
            </Button>
            <Button className="w-full" variant="outline">
              Download Fee Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
