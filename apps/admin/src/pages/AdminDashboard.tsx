import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { BarChart3, DollarSign, Users, Package } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>Total Staff</CardHeader>
          <CardContent>125</CardContent>
        </Card>
        <Card>
          <CardHeader>Monthly Payroll</CardHeader>
          <CardContent>₹12,50,000</CardContent>
        </Card>
        <Card>
          <CardHeader>Inventory Items</CardHeader>
          <CardContent>342</CardContent>
        </Card>
        <Card>
          <CardHeader>Active Sessions</CardHeader>
          <CardContent>45</CardContent>
        </Card>
      </div>
    </div>
  );
}
