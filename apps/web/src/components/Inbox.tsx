import { useState } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Badge } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Mail, Bell } from 'lucide-react';

export default function Inbox() {
  const [filter, setFilter] = useState('all');
  const { addToast } = useToast();

  const { data: messages, isLoading } = useQuery(['messages'], () => 
    apiClient.request({ url: '/api/v1/messages', method: 'GET' })
  );

  const columns = [
    {
      key: 'from',
      title: 'From',
    },
    {
      key: 'subject',
      title: 'Subject',
    },
    {
      key: 'message',
      title: 'Message',
      render: (value: string) => value.substring(0, 50) + '...',
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'isRead',
      title: 'Status',
      render: (value: boolean) => (
        <Badge
          variant={value ? 'outline' : 'default'}
        >
          {value ? 'Read' : 'Unread'}
        </Badge>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbox</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={messages?.data || []}
          loading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
