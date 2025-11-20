import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Inbox, Users, Bell, Plus } from 'lucide-react';
import { SendMessageModal } from '@/components/modals/SendMessageModal';
import { BroadcastAnnouncementModal } from '@/components/modals/BroadcastAnnouncementModal';
import api from '@/services/api';

export function CommunicationPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');

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
      setMessages([]);
      setNotifications([]);
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
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowBroadcastModal(true)}>
            <Users className="mr-2 h-4 w-4" />
            Broadcast
          </Button>
          <Button onClick={() => setShowMessageModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
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
              <span>Quick Action</span>
              <Users className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm" onClick={() => setShowBroadcastModal(true)}>
              Send to All
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Mailbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant={activeTab === 'inbox' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('inbox')}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Inbox ({messages.length})
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
              variant="ghost"
              onClick={() => setShowMessageModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {activeTab === 'inbox' ? 'Inbox Messages' : 'Sent Messages'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No messages yet</p>
                <Button onClick={() => setShowMessageModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Send First Message
                </Button>
              </div>
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
            <div className="text-center py-8">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No notifications yet</p>
              <Button onClick={() => setShowBroadcastModal(true)}>
                <Users className="mr-2 h-4 w-4" />
                Broadcast Announcement
              </Button>
            </div>
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

      <SendMessageModal
        open={showMessageModal}
        onOpenChange={setShowMessageModal}
        onSuccess={loadCommunicationData}
      />

      <BroadcastAnnouncementModal
        open={showBroadcastModal}
        onOpenChange={setShowBroadcastModal}
        onSuccess={loadCommunicationData}
      />
    </div>
  );
}
