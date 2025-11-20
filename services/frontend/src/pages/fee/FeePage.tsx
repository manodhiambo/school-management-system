import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, FileText, Plus, Users, Bell, Download } from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { GenerateInvoicesModal } from '@/components/modals/GenerateInvoicesModal';
import api from '@/services/api';

export function FeePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    loadFeeStats();
  }, []);

  const loadFeeStats = async () => {
    try {
      setLoading(true);
      const response: any = await api.getFeeStatistics();
      setStats(response.data || {});
    } catch (error) {
      console.error('Error loading fee stats:', error);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleViewDefaulters = () => {
    alert('Defaulters list functionality coming soon!');
  };

  const handleSendReminders = () => {
    alert('Payment reminders will be sent via SMS/Email');
  };

  const handleDownloadReport = () => {
    alert('Fee report download functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalAmount = parseFloat(stats?.total_amount || '0');
  const totalCollected = parseFloat(stats?.total_collected || '0');
  const totalPending = parseFloat(stats?.total_pending || '0');
  const collectionPercentage = totalAmount > 0 ? ((totalCollected / totalAmount) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Fee Management</h2>
          <p className="text-gray-500">Manage fee collection and invoicing</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowInvoiceModal(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoices
          </Button>
          <Button onClick={() => setShowPaymentModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
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
            <div className="text-2xl font-bold">KSH {totalAmount.toLocaleString()}</div>
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
            <div className="text-2xl font-bold text-green-600">KSH {totalCollected.toLocaleString()}</div>
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
            <div className="text-2xl font-bold text-yellow-600">KSH {totalPending.toLocaleString()}</div>
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
                  <span className="font-bold text-primary">{collectionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${collectionPercentage}%` }}
                  ></div>
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
            <Button className="w-full" variant="outline" onClick={() => setShowInvoiceModal(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoices
            </Button>
            <Button className="w-full" variant="outline" onClick={handleViewDefaulters}>
              <Users className="mr-2 h-4 w-4" />
              View Defaulters
            </Button>
            <Button className="w-full" variant="outline" onClick={handleSendReminders}>
              <Bell className="mr-2 h-4 w-4" />
              Send Payment Reminders
            </Button>
            <Button className="w-full" variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Fee Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        onSuccess={loadFeeStats}
      />

      <GenerateInvoicesModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        onSuccess={loadFeeStats}
      />
    </div>
  );
}
