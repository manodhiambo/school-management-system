import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import api from '@/services/api';

interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SendMessageModal({ open, onOpenChange, onSuccess }: SendMessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'individual' | 'role'>('individual');
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    recipientRole: '',
    subject: '',
    message: '',
    priority: 'normal',
  });

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      // Get all users directly - this gives us user IDs
      const response: any = await api.getUsers();
      const allUsers = response?.data || [];
      // Filter out the current user and format for display
      setUsers(allUsers.filter((u: any) => u.role !== 'admin').map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.first_name && u.last_name 
          ? `${u.first_name} ${u.last_name}` 
          : u.email,
        displayName: u.first_name && u.last_name 
          ? `${u.first_name} ${u.last_name} (${u.role})` 
          : `${u.email} (${u.role})`
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const messageData: any = {
        subject: formData.subject,
        body: formData.message,
        content: formData.message,
        priority: formData.priority,
        messageType: recipientType === 'individual' ? 'direct' : 'broadcast'
      };

      if (recipientType === 'individual') {
        if (!formData.recipientId) {
          alert('Please select a recipient');
          setLoading(false);
          return;
        }
        messageData.recipientId = formData.recipientId;
      } else if (recipientType === 'role') {
        if (!formData.recipientRole) {
          alert('Please select a role');
          setLoading(false);
          return;
        }
        messageData.recipientRole = formData.recipientRole;
      }

      console.log('Sending message:', messageData);
      await api.sendMessage(messageData);
      alert('Message sent successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        recipientId: '',
        recipientRole: '',
        subject: '',
        message: '',
        priority: 'normal',
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      alert(error?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Send To</Label>
              <div className="flex space-x-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant={recipientType === 'individual' ? 'default' : 'outline'}
                  onClick={() => setRecipientType('individual')}
                >
                  Individual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={recipientType === 'role' ? 'default' : 'outline'}
                  onClick={() => setRecipientType('role')}
                >
                  All (By Role)
                </Button>
              </div>
            </div>

            {recipientType === 'individual' && (
              <div>
                <Label htmlFor="recipientId">Recipient *</Label>
                <Select
                  id="recipientId"
                  value={formData.recipientId}
                  onChange={(e) => handleChange('recipientId', e.target.value)}
                  required
                >
                  <option value="">Select Recipient</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </Select>
                {users.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Loading users...</p>
                )}
              </div>
            )}

            {recipientType === 'role' && (
              <div>
                <Label htmlFor="recipientRole">Role *</Label>
                <Select
                  id="recipientRole"
                  value={formData.recipientRole}
                  onChange={(e) => handleChange('recipientRole', e.target.value)}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="student">All Students</option>
                  <option value="teacher">All Teachers</option>
                  <option value="parent">All Parents</option>
                  <option value="all">Everyone</option>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Enter subject..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Type your message..."
                rows={6}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
