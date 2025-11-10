import React from 'react'';
import { format } from 'date-fns';
import { 
  Mail, 
  Send, 
  Reply, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { 
  ApiResponse, 
  User,
  Message, 
  MessageStatus,
  MessageType 
} from '@school/shared-types';
import { Button } from '@school/shared-ui';
import { useAuth } from '../hooks/useAuth';

interface InboxProps {
  currentUser: User;
}

interface Message extends ApiResponse<any> {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
  isRead: boolean;
}

export const Inbox: React.FC<InboxProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const { getAuthToken } = useAuth();

  useEffect(() => {
    // Initialize WebSocket connection
    const token = getAuthToken();
    const socketInstance = io(process.env.REACT_APP_WS_URL || 'ws://localhost:5000', {
      auth: { token },
    });

    socketInstance.on('message:new', (newMessage: Message) => {
      setMessages(prev => [newMessage, ...prev]);
    });

    socketInstance.on('message:read', ({ messageId }) => {
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? { ...msg, isRead: true, status: 'read' as MessageStatus } : msg)
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [getAuthToken]);

  useEffect(() => {
    loadMessages();
  }, [currentUser.id]);

  useEffect(() => {
    // Apply filters
    let filtered = messages;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(msg => 
        filterStatus === 'unread' ? !msg.isRead : msg.isRead
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchTerm, filterStatus]);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data: ApiResponse<Message[]> = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    const token = getAuthToken();
    await fetch(`${process.env.REACT_APP_API_URL}/api/v1/messages/${messageId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // Optimistic update
    setMessages(prev =>
      prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true, status: 'read' } : msg
      )
    );
  };

  const deleteMessage = async (messageId: string) => {
    const token = getAuthToken();
    await fetch(`${process.env.REACT_APP_API_URL}/api/v1/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setSelectedMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <Button onClick={loadMessages} className="mt-3">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar - Message list */}
      <div className="w-96 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Inbox</h2>
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Plus size={16} className="mr-2" />
              Compose
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'unread' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('unread')}
            >
              Unread
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'read' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('read')}
            >
              Read
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No messages found</p>
            </div>
          ) : (
            filteredMessages.map(message => (
              <div
                key={message.id}
                onClick={() => {
                  setSelectedMessage(message);
                  if (!message.isRead) {
                    markAsRead(message.id);
                  }
                }}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                } ${!message.isRead ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{message.senderName}</p>
                    <p className="text-sm text-gray-700 mt-1 truncate">{message.subject}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(message.createdAt), 'MMM d')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Message detail */}
      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <>
            <div className="bg-white border-b p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedMessage.subject}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    From: {selectedMessage.senderName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(selectedMessage.createdAt), 'PPp')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Reply size={16} className="mr-2" />
                    Reply
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteMessage(selectedMessage.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-white p-6 overflow-y-auto">
              <div className="prose max-w-none">
                <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>

            {!selectedMessage.isRead && (
              <div className="bg-blue-50 border-t border-blue-200 p-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-600" />
                <span className="text-sm text-blue-800">Message marked as read</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail size={64} className="mx-auto mb-4 text-gray-300" />
              <p>Select a message to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Compose Message</h3>
            {/* Add compose form here */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button>
                <Send size={16} className="mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
