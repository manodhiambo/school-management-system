import { useState } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, DataTable, Input } from '@school/shared-ui';
import { Shield } from 'lucide-react';

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
  });

  const { data: logs } = useQuery(['audit-logs', filters], () =>
    apiClient.request({ url: '/api/v1/admin/audit-logs', method: 'GET', params: filters })
  );

  const columns = [
    { key: 'createdAt', title: 'Timestamp', render: (v: string) => new Date(v).toLocaleString() },
    { key: 'userId', title: 'User' },
    { key: 'action', title: 'Action' },
    { key: 'resource', title: 'Resource' },
    { key: 'ipAddress', title: 'IP Address' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield size={24} />
        Audit Logs
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              placeholder="Filter by User ID"
              value={filters.userId}
              onChange={(e) => setFilters({...filters, userId: e.target.value})}
            />
            <Input
              placeholder="Filter by Action"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
            />
            <Input
              placeholder="Filter by Resource"
              value={filters.resource}
              onChange={(e) => setFilters({...filters, resource: e.target.value})}
            />
          </div>
          <DataTable
            columns={columns}
            data={logs?.data || []}
            loading={!logs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
