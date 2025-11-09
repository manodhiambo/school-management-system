import { useState } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Tabs, TabsList, TabsTrigger, TabsContent, DataTable, Badge } from '@school/shared-ui';
import { DollarSign, CreditCard, FileText, TrendingUp, Users } from 'lucide-react';
import { useToast } from '@school/shared-ui';
import FeeCollection from '../../components/FeeCollection';
import FeeStructureManager from '../../components/FeeStructureManager';

export default function FeeManagement() {
  const [activeTab, setActiveTab] = useState('collection');
  const { addToast } = useToast();

  const { data: stats } = useQuery(['fee-stats'], () => 
    apiClient.request({ url: '/api/v1/fee/analytics', method: 'GET' })
  );

  const statCards = [
    { label: 'Total Collection', value: `₹${stats?.data?.totalCollection || '0'}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Pending Fees', value: `₹${stats?.data?.pendingFees || '0'}`, icon: CreditCard, color: 'text-yellow-600' },
    { label: 'Active Invoices', value: stats?.data?.activeInvoices || 0, icon: FileText, color: 'text-blue-600' },
    { label: 'Defaulters', value: stats?.data?.defaulters || 0, icon: Users, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fee Management</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className={stat.color} size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">Current session</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="collection">Fee Collection</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulters</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="collection">
          <FeeCollection />
        </TabsContent>

        <TabsContent value="structure">
          <FeeStructureManager />
        </TabsContent>

        <TabsContent value="defaulters">
          <Card>
            <CardHeader>
              <CardTitle>Fee Defaulters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Defaulter list will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Fee Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Fee reports will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
