import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, FileText, Plus, Users, Bell, Download } from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { GenerateInvoicesModal } from '@/components/modals/GenerateInvoicesModal';
import api from '@/services/api';

export function FeePage() {
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, invoicesRes]: any = await Promise.all([
        api.getFeeStatistics(),
        api.getFeeInvoices()
      ]);
      
      console.log('Fee stats response:', statsRes);
      console.log('Fee invoices response:', invoicesRes);
      
      // Handle both response formats (direct data or nested in data property)
      const statsData = statsRes?.data?.data || statsRes?.data || statsRes || {};
      const invoicesData = invoicesRes?.data?.data || invoicesRes?.data || [];
      
      setStats(statsData);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (error) {
      console.error('Error loading fee data:', error);
      setStats({});
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDefaulters = async () => {
    try {
      const response: any = await api.getFeeDefaulters();
      const defaulters = response?.data?.data || response?.data || [];
      if (defaulters.length === 0) {
        alert('No fee defaulters found!');
      } else {
        const list = defaulters.map((d: any) => 
          `${d.first_name} ${d.last_name} - KES ${parseFloat(d.total_due).toLocaleString()}`
        ).join('\n');
        alert(`Fee Defaulters:\n\n${list}`);
      }
    } catch (error) {
      console.error('Error loading defaulters:', error);
      alert('Failed to load defaulters');
    }
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
  const totalInvoices = parseInt(stats?.total_invoices || '0');
  const paidCount = parseInt(stats?.paid_count || '0');
  const pendingCount = parseInt(stats?.pending_count || '0');
  const overdueCount = parseInt(stats?.overdue_count || '0');
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
            <div className="text-2xl font-bold">KES {totalAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{totalInvoices} invoice(s)</p>
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
            <div className="text-2xl font-bold text-green-600">KES {totalCollected.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{paidCount} paid</p>
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
            <div className="text-2xl font-bold text-yellow-600">KES {totalPending.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{pendingCount} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Collection Rate</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{collectionPercentage}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${collectionPercentage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewDefaulters}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">View Defaulters</p>
                <p className="text-lg font-bold">{overdueCount} overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleSendReminders}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Send Reminders</p>
                <p className="text-lg font-bold">SMS & Email</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleDownloadReport}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Download Report</p>
                <p className="text-lg font-bold">Fee Statement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
              <p className="text-sm text-gray-400">Generate invoices to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Invoice #</th>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                    <th className="text-right p-3 font-medium">Paid</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 10).map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{invoice.invoice_number}</td>
                      <td className="p-3">
                        {invoice.first_name} {invoice.last_name}
                        <span className="text-xs text-gray-500 block">{invoice.admission_number}</span>
                      </td>
                      <td className="p-3 text-right">KES {parseFloat(invoice.net_amount || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-green-600">KES {parseFloat(invoice.paid_amount || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-red-600">KES {parseFloat(invoice.balance_amount || 0).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        onSuccess={loadData}
      />
      <GenerateInvoicesModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        onSuccess={loadData}
      />
    </div>
  );
}
