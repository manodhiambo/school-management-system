import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@school/shared-ui';

interface Message {
  id: string;
  subject: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const Inbox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { getAuthToken } = useAuth();

  useEffect(() => {
    void loadMessages();
  }, []);

  const loadMessages = async () => {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const dataJson = await response.json();
    const data = dataJson as ApiResponse<Message[]>;
    if (data.success) setMessages(data.data);
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <Mail />
          <h3>{msg.subject}</h3>
        </div>
      ))}
    </div>
  );
};
