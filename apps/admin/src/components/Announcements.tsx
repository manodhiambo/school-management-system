import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Bell } from 'lucide-react';

export default function Announcements() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('all');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const broadcastMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/messages/broadcast',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('messages');
        addToast('success', 'Announcement sent successfully');
        setTitle('');
        setContent('');
      },
      onError: () => {
        addToast('error', 'Failed to send announcement');
      },
    }
  );

  const handleSubmit = () => {
    broadcastMutation.mutate({
      title,
      content,
      target,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={6}
              placeholder="Enter announcement content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="parents">Parents</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button onClick={handleSubmit} disabled={broadcastMutation.isLoading}>
            <Bell size={16} className="mr-2" />
            {broadcastMutation.isLoading ? 'Sending...' : 'Send Announcement'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
