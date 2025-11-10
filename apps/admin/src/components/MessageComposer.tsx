import React from 'react'';
import { useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Send } from 'lucide-react';

export default function MessageComposer() {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const sendMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/messages',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('messages');
        addToast('success', 'Message sent successfully');
        setRecipients('');
        setSubject('');
        setMessage('');
      },
      onError: () => {
        addToast('error', 'Failed to send message');
      },
    }
  );

  const handleSubmit = () => {
    sendMutation.mutate({
      recipients: recipients.split(',').map(r => r.trim()),
      subject,
      message,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send size={20} />
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            label="To (comma-separated emails)"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="Enter recipient emails"
          />
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={6}
              placeholder="Enter your message"
            />
          </div>
          <Button onClick={handleSubmit} disabled={sendMutation.isLoading}>
            <Send size={16} className="mr-2" />
            {sendMutation.isLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
