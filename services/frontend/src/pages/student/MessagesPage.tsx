import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Clock, Plus, X, Send } from 'lucide-react';
import api from '@/services/api';

export function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    loadMessages();
    loadRecipients();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getMessages();
      setMessages(response.data || response.messages || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const res: any = await api.getMessageRecipients();
      const data: any[] = res.data || res || [];
      setRecipients(data.map((r: any) => ({
        id: r.id,
        name: r.name?.trim() || r.email,
        role: r.role === 'admin' ? 'Admin' : 'Teacher',
      })));
    } catch {
      /* compose form still opens; user sees empty recipient list */
    }
  };

  const handleSend = async () => {
    if (!recipientId) { setSendError('Please select a recipient.'); return; }
    if (!subject.trim()) { setSendError('Subject is required.'); return; }
    if (!body.trim()) { setSendError('Message body is required.'); return; }

    setSending(true);
    setSendError('');
    try {
      await api.sendMessage({ recipientId, subject, body });
      setShowCompose(false);
      setRecipientId('');
      setSubject('');
      setBody('');
      loadMessages();
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await api.markMessageAsRead(messageId);
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
      );
    } catch {
      /* silent */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadMessages} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Messages</h2>
          <p className="text-gray-500">View and send messages</p>
        </div>
        <Button onClick={() => { setShowCompose(true); setSendError(''); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                New Message
              </CardTitle>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">To</label>
                <select
                  value={recipientId}
                  onChange={e => setRecipientId(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">-- Select recipient --</option>
                  {recipients.length === 0 && (
                    <option disabled>No recipients available</option>
                  )}
                  {recipients.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={5}
                  placeholder="Write your message here..."
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {sendError && (
                <p className="text-sm text-red-600">{sendError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowCompose(false)}
                  className="flex-1"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No messages yet</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => {
            const unread = message.is_read === false;
            return (
              <Card
                key={message.id}
                className={`transition-shadow hover:shadow-md ${unread ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{message.subject || message.title || '(No subject)'}</span>
                    </CardTitle>
                    {unread && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full font-medium flex-shrink-0">
                        New
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{message.content || message.message}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                    <span>From: {message.sender_name?.trim() || message.sender_email || 'Unknown'}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(message.created_at || message.date).toLocaleDateString()}
                    </span>
                  </div>
                  {unread && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => markAsRead(message.id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
