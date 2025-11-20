import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Inbox, Users, Bell } from 'lucide-react';
import api from '@/services/api';

export function CommunicationPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');

  useEffect(() => {
    loadCommunicationData();
  }, []);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      const [messagesRes, notificationsRes]: any = await Promise.all([
        api.getMessages(),
        api.getNotifications(),
      ]);
      setMessages(messagesRes.data || []);
      setNotifications(notificationsRes.data || []);
    } catch (error) {
      console.error('Error loading communication data:', error);
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
          <h2 className="text-3xl font-bold">Communication</h2>
          <p className="text-gray-500">Manage messages and announcements</p>
        </div>
        <Button onClick={() => setActiveTab('compose')}>
          <Send className="mr-2 h-4 w-4" />
          Compose Message
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Inbox</span>
              <Inbox className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Unread</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {messages.filter((m: any) => !m.is_read).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Notifications</span>
              <Bell className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Broadcast</span>
              <Users className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm">
              Send to All
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant={activeTab === 'inbox' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('inbox')}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Inbox
            </Button>
            <Button
              className="w-full justify-start"
              variant={activeTab === 'sent' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('sent')}
            >
              <Send className="mr-2 h-4 w-4" />
              Sent
            </Button>
            <Button
              className="w-full justify-start"
              variant={activeTab === 'compose' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('compose')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {activeTab === 'inbox' && 'Inbox Messages'}
              {activeTab === 'sent' && 'Sent Messages'}
              {activeTab === 'compose' && 'Compose New Message'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'compose' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <Input placeholder="Select recipients..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input placeholder="Enter subject..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    className="w-full border rounded-md p-3 min-h-[200px]"
                    placeholder="Type your message..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button variant="outline">Save Draft</Button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No messages</p>
            ) : (
              <div className="space-y-2">
                {messages.slice(0, 10).map((message: any) => (
                  <div
                    key={message.id}
                    className={`p-4 border rounded hover:bg-gray-50 cursor-pointer ${
                      !message.is_read ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{message.subject || 'No Subject'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {message.content?.substring(0, 100)}...
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notification: any) => (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded"
                >
                  <Bell className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
