import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import {
  MessageCircle, Settings, Send, List, Eye, EyeOff,
  X, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Smartphone, ExternalLink
} from 'lucide-react';

function waLink(phone: string, message: string) {
  const cleaned = phone.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

type Target = 'all_parents' | 'by_class' | 'custom';
type MsgStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

function StatusBadge({ status }: { status: MsgStatus }) {
  const map: Record<MsgStatus, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
    sent: { color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
    delivered: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
    read: { color: 'bg-purple-100 text-purple-700', icon: <CheckCircle className="h-3 w-3" /> },
    failed: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status] || { color: 'bg-gray-100 text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize ${s.color}`}>
      {s.icon} {status}
    </span>
  );
}

export function WhatsAppPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Config
  const [configForm, setConfigForm] = useState({ phone_number_id: '', access_token: '', is_enabled: false });
  const [showToken, setShowToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Test modal
  const [testModal, setTestModal] = useState(false);
  const [testForm, setTestForm] = useState({ phone: '', message: '' });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Send
  const [classes, setClasses] = useState<any[]>([]);
  const [target, setTarget] = useState<Target>('all_parents');
  const [classId, setClassId] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  // Log
  const [log, setLog] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // Direct WhatsApp (no API) fallback
  const [directPhones, setDirectPhones] = useState<any[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [directCustomPhone, setDirectCustomPhone] = useState('');
  const [directMsg, setDirectMsg] = useState('');
  const [directTarget, setDirectTarget] = useState<'custom' | 'all_parents' | 'by_class'>('custom');
  const [directClassId, setDirectClassId] = useState('');
  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});

  const fetchDirectPhones = async () => {
    if (directTarget === 'custom') return;
    setDirectLoading(true);
    try {
      const params: any = { target: directTarget === 'all_parents' ? 'all' : 'class' };
      if (directTarget === 'by_class' && directClassId) params.class_id = directClassId;
      const res: any = await (api as any).getWhatsAppPhones(params);
      setDirectPhones(Array.isArray(res?.data) ? res.data : []);
      setPhoneOverrides({});
    } catch { setDirectPhones([]); }
    setDirectLoading(false);
  };

  useEffect(() => {
    loadConfig();
    loadClasses();
    loadLog();
  }, []);

  const loadConfig = async () => {
    try {
      const res: any = await (api as any).getWhatsAppConfig();
      const d = res?.data || {};
      setConfigForm({ phone_number_id: d.phone_number_id || '', access_token: d.access_token || '', is_enabled: d.is_enabled || false });
    } catch { /* config not set up yet */ }
  };

  const loadClasses = async () => {
    try {
      const res: any = await (api as any).getClasses?.();
      setClasses(res?.data || []);
    } catch { /* classes optional — leave list empty */ }
  };

  const loadLog = async () => {
    setLogLoading(true);
    try {
      const res: any = await (api as any).getWhatsAppLog();
      setLog(res?.data || []);
    } catch { /* log optional — leave list empty */ }
    setLogLoading(false);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    setError('');
    try {
      await (api as any).saveWhatsAppConfig(configForm);
      setSuccess('Configuration saved.');
      loadConfig();
    } catch { setError('Failed to save config'); }
    setSavingConfig(false);
  };

  const sendTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res: any = await (api as any).testWhatsApp(testForm);
      setTestResult(res?.data || { status: 'sent' });
    } catch (e: any) { setTestResult({ error: e?.message || 'Failed' }); }
    setTestLoading(false);
  };

  const sendMessage = async () => {
    setSendLoading(true);
    setSendResult(null);
    setConfirmSend(false);
    try {
      const payload: any = { target, message: msgBody };
      if (target === 'by_class') payload.class_id = classId;
      if (target === 'custom') payload.phone = customPhone;
      const res: any = await (api as any).sendWhatsApp(payload);
      setSendResult(res?.data || {});
      loadLog();
    } catch (e: any) { setError('Send failed: ' + (e?.message || '')); }
    setSendLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-green-500" /> WhatsApp Integration
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded p-3">
          <CheckCircle className="h-4 w-4" /> {success}
          <button className="ml-auto" onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Config Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <CardTitle>WhatsApp API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Phone Number ID</Label>
              <Input
                value={configForm.phone_number_id}
                onChange={e => setConfigForm(f => ({ ...f, phone_number_id: e.target.value }))}
                placeholder="From Meta Business Manager"
              />
            </div>
            <div>
              <Label>Access Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={configForm.access_token}
                  onChange={e => setConfigForm(f => ({ ...f, access_token: e.target.value }))}
                  placeholder="EAAxxxxx..."
                />
                <button
                  type="button"
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowToken(v => !v)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={configForm.is_enabled}
                onChange={e => setConfigForm(f => ({ ...f, is_enabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
            </label>
            <span className="text-sm text-gray-700">{configForm.is_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={savingConfig}>
              {savingConfig ? 'Saving...' : 'Save Config'}
            </Button>
            <Button variant="outline" onClick={() => setTestModal(true)}>
              Send Test Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Send Message Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Send className="h-5 w-5 text-green-500" />
          <CardTitle>Send WhatsApp Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Target Audience</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {[
                { value: 'all_parents', label: 'All Parents' },
                { value: 'by_class', label: 'By Class' },
                { value: 'custom', label: 'Custom Phone' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTarget(opt.value as Target)}
                  className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                    target === opt.value ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {target === 'by_class' && (
            <div>
              <Label>Select Class</Label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={classId} onChange={e => setClassId(e.target.value)}>
                <option value="">Choose class...</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {target === 'custom' && (
            <div>
              <Label>Phone Number (with country code)</Label>
              <Input value={customPhone} onChange={e => setCustomPhone(e.target.value)} placeholder="+254700000000" />
            </div>
          )}
          <div>
            <Label>Message</Label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm mt-1 h-28 resize-none"
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              placeholder="Type your message here..."
            />
            <p className="text-xs text-gray-400 text-right">{msgBody.length} chars</p>
          </div>
          {sendResult && (
            <div className="flex gap-4 bg-gray-50 rounded p-3 text-sm">
              <span className="text-green-600 font-medium">Sent: {sendResult.sent || 0}</span>
              <span className="text-red-600 font-medium">Failed: {sendResult.failed || 0}</span>
            </div>
          )}
          <Button
            onClick={() => setConfirmSend(true)}
            disabled={!msgBody.trim() || sendLoading || !configForm.is_enabled}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-1" /> {sendLoading ? 'Sending...' : 'Send Message'}
          </Button>
          {!configForm.is_enabled && (
            <p className="text-xs text-red-500">WhatsApp is disabled. Enable it in Configuration above.</p>
          )}
        </CardContent>
      </Card>

      {/* Direct WhatsApp (device app fallback — always available) */}
      <Card className="border-green-200">
        <CardHeader className="flex flex-row items-center gap-2 bg-green-50 rounded-t-lg">
          <Smartphone className="h-5 w-5 text-green-600" />
          <CardTitle className="text-green-800">Direct WhatsApp (Device App)</CardTitle>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">No API needed</span>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm text-gray-500">
            Opens WhatsApp on your device with the recipient and message pre-filled. Works without any API configuration.
          </p>
          <div>
            <Label>Mode</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {[
                { value: 'custom', label: 'Single Number' },
                { value: 'all_parents', label: 'All Parents' },
                { value: 'by_class', label: 'By Class' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setDirectTarget(opt.value as any); setDirectPhones([]); }}
                  className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                    directTarget === opt.value ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {directTarget === 'custom' && (
            <div>
              <Label>Phone Number (with country code)</Label>
              <Input
                value={directCustomPhone}
                onChange={e => setDirectCustomPhone(e.target.value)}
                placeholder="+254700000000"
              />
            </div>
          )}
          {directTarget === 'by_class' && (
            <div>
              <Label>Select Class</Label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={directClassId} onChange={e => setDirectClassId(e.target.value)}>
                <option value="">Choose class...</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label>Message</Label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm mt-1 h-24 resize-none"
              value={directMsg}
              onChange={e => setDirectMsg(e.target.value)}
              placeholder="Type your message..."
            />
          </div>

          {directTarget === 'custom' ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!directCustomPhone.trim() || !directMsg.trim()}
              onClick={() => window.open(waLink(directCustomPhone, directMsg), '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Open WhatsApp
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="border-green-500 text-green-700"
                disabled={directLoading || (directTarget === 'by_class' && !directClassId)}
                onClick={fetchDirectPhones}
              >
                {directLoading ? 'Loading...' : 'Fetch Recipients'}
              </Button>
              {directPhones.length > 0 && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {directPhones.map((p: any) => {
                    const key = p.id || p.phone;
                    const effectivePhone = phoneOverrides[key] ?? p.phone;
                    const needsCountryCode = p.needs_country_code && !effectivePhone.trim().startsWith('+');
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-700 block truncate">
                            {p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : p.email || 'Parent'}
                          </span>
                          {needsCountryCode ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <Input
                                value={effectivePhone}
                                onChange={e => setPhoneOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="+254 7XX XXX XXX"
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs">{effectivePhone}</span>
                          )}
                        </div>
                        <a
                          href={waLink(effectivePhone, directMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-semibold shrink-0 ${(!directMsg.trim() || needsCountryCode) ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          <ExternalLink className="h-3 w-3" /> Send
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-gray-500" />
            <CardTitle>Message Log</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={loadLog}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="p-0">
          {logLoading ? (
            <p className="p-4 text-gray-500">Loading...</p>
          ) : log.length === 0 ? (
            <p className="p-4 text-gray-400">No messages sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2">Message</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {log.map((msg: any, i: number) => (
                  <tr key={msg.id || i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{msg.to_phone}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{msg.body || msg.message || '-'}</td>
                    <td className="px-4 py-2"><StatusBadge status={msg.status} /></td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{msg.created_at?.replace('T', ' ').split('.')[0] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Test Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Send Test Message</h2>
              <button onClick={() => setTestModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Phone Number</Label><Input value={testForm.phone} onChange={e => setTestForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254700000000" /></div>
              <div><Label>Message</Label><textarea className="w-full border rounded px-3 py-2 text-sm h-24" value={testForm.message} onChange={e => setTestForm(f => ({ ...f, message: e.target.value }))} /></div>
            </div>
            {testResult && (
              <div className={`p-3 rounded text-sm ${testResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {testResult.error ? `Error: ${testResult.error}` : 'Test message sent successfully!'}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTestModal(false)}>Close</Button>
              <Button onClick={sendTest} disabled={testLoading || !testForm.phone || !testForm.message}>
                {testLoading ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Send Modal */}
      {confirmSend && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Confirm Send</h2>
            <p className="text-sm text-gray-600">
              Send this message to <strong>{target === 'all_parents' ? 'all parents' : target === 'by_class' ? 'class parents' : customPhone}</strong>?
            </p>
            <p className="text-sm bg-gray-50 rounded p-2 text-gray-700">{msgBody}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmSend(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={sendMessage}>Yes, Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
