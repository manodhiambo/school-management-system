import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Mail, Copy, CheckCircle } from 'lucide-react';
import api from '@/services/api';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess?: () => void;
}

export function ResetPasswordModal({ open, onOpenChange, user, onSuccess }: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (useCustomPassword && customPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response: any = await api.resetUserPassword(user.id, {
        newPassword: useCustomPassword ? customPassword : undefined,
        sendEmail
      });
      
      setResult(response?.data || response);
    } catch (error: any) {
      console.error('Reset password error:', error);
      alert(error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCustomPassword('');
    setUseCustomPassword(false);
    setSendEmail(true);
    onOpenChange(false);
    if (result) {
      onSuccess?.();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-orange-600" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* User Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Resetting password for:</p>
              <p className="font-semibold">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                {user.role}
              </span>
            </div>

            {/* Password Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="autoPassword"
                  checked={!useCustomPassword}
                  onChange={() => setUseCustomPassword(false)}
                  className="h-4 w-4"
                />
                <label htmlFor="autoPassword" className="text-sm cursor-pointer">
                  Generate random password
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="customPasswordOption"
                  checked={useCustomPassword}
                  onChange={() => setUseCustomPassword(true)}
                  className="h-4 w-4"
                />
                <label htmlFor="customPasswordOption" className="text-sm cursor-pointer">
                  Set custom password
                </label>
              </div>

              {useCustomPassword && (
                <div className="ml-6">
                  <Input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Email Notification */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="sendEmailNotification"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="sendEmailNotification" className="flex items-center cursor-pointer">
                <Mail className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm">Send new password via email</span>
              </label>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            {/* Success Message */}
            <div className="text-center py-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">Password Reset Successfully!</h3>
            </div>

            {/* New Password Display */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm text-gray-500">New Password:</Label>
              <div className="flex items-center mt-2">
                <code className="flex-1 bg-white px-4 py-2 rounded border font-mono text-lg">
                  {result.tempPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopy}
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Email Status */}
            {result.emailSent && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <Mail className="h-4 w-4 mr-2" />
                Password has been sent to the user's email
              </div>
            )}

            {!result.emailSent && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                <Mail className="h-4 w-4 mr-2" />
                Email was not sent. Please share the password manually.
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
