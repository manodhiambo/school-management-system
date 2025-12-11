import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Mail, Send, Users } from 'lucide-react';
import api from '@/services/api';

interface SendAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendAnnouncementModal({ open, onOpenChange, onSuccess }: SendAnnouncementModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRole: 'all',
    priority: 'normal',
    sendEmail: true
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Please enter both title and message');
      return;
    }

    setLoading(true);
    try {
      const response: any = await api.sendAnnouncement(formData);
      
      const data = response?.data || response;
      alert(`Announcement sent successfully!\n\nNotifications: ${data?.notificationsCreated || 0}\nEmails sent: ${data?.emailsSent || 0}`);
      
      onOpenChange(false);
      setFormData({
        title: '',
        message: '',
        targetRole: 'all',
        priority: 'normal',
        sendEmail: true
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Send announcement error:', error);
      alert(error?.message || 'Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-orange-600" />
            Send Announcement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Announcement Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., School Closure Notice"
              required
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Enter your announcement message..."
              rows={5}
              required
            />
          </div>

          {/* Target Audience */}
          <div>
            <Label htmlFor="targetRole">Send To</Label>
            <Select
              id="targetRole"
              value={formData.targetRole}
              onChange={(e) => handleChange('targetRole', e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="student">Students Only</option>
              <option value="teacher">Teachers Only</option>
              <option value="parent">Parents Only</option>
              <option value="admin">Admins Only</option>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High (Urgent)</option>
            </Select>
          </div>

          {/* Email Option */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="sendEmail"
              checked={formData.sendEmail}
              onChange={(e) => handleChange('sendEmail', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="sendEmail" className="flex items-center cursor-pointer">
              <Mail className="h-4 w-4 mr-2 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Also send via Email</p>
                <p className="text-xs text-gray-500">Users will receive this announcement in their inbox</p>
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Preview</p>
            <div className={`border-l-4 pl-3 ${formData.priority === 'high' ? 'border-red-500' : 'border-blue-500'}`}>
              <h4 className="font-semibold">{formData.title || 'Announcement Title'}</h4>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                {formData.message || 'Your message will appear here...'}
              </p>
            </div>
            <div className="flex items-center mt-3 text-xs text-gray-500">
              <Users className="h-3 w-3 mr-1" />
              <span>
                Sending to: {formData.targetRole === 'all' ? 'All Users' : `${formData.targetRole}s`}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
