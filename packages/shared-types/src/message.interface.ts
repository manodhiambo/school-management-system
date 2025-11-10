export type MessageType = 'private' | 'announcement' | 'ptm' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
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
