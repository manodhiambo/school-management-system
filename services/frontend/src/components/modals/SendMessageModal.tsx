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
  const [recipientType, setRecipientType] = useState<'individual' | 'class' | 'role'>('individual');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    recipientRole: '',
    subject: '',
    message: '',
    priority: 'normal',
  });

  useEffect(() => {
    if (open) {
      loadRecipients();
    }
  }, [open, recipientType]);

  const loadRecipients = async () => {
    try {
      if (recipientType === 'individual') {
        const [studentsRes, teachersRes, parentsRes]: any = await Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getParents(),
        ]);
        setStudents(studentsRes.students || []);
        setTeachers(teachersRes.data || []);
        setParents(parentsRes.data || []);
      } else if (recipientType === 'class') {
        const classesRes: any = await api.getClasses();
        setClasses(classesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
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
        content: formData.message,
        priority: formData.priority,
      };

      if (recipientType === 'individual') {
        messageData.recipientId = formData.recipientId;
      } else if (recipientType === 'class') {
        messageData.classId = formData.recipientId;
      } else if (recipientType === 'role') {
        messageData.recipientRole = formData.recipientRole;
      }

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
      alert(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const allRecipients = [
    ...students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name} (Student)`, type: 'student' })),
    ...teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name} (Teacher)`, type: 'teacher' })),
    ...parents.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name} (Parent)`, type: 'parent' })),
  ];

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
                  variant={recipientType === 'class' ? 'default' : 'outline'}
                  onClick={() => setRecipientType('class')}
                >
                  Class
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
                  {allRecipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {recipientType === 'class' && (
              <div>
                <Label htmlFor="recipientId">Class *</Label>
                <Select
                  id="recipientId"
                  value={formData.recipientId}
                  onChange={(e) => handleChange('recipientId', e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </Select>
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
                  <option value="admin">All Admins</option>
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
