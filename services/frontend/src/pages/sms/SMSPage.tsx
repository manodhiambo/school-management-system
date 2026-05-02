import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import {
  MessageSquare, Send, Users, User, Search, CheckCircle2,
  XCircle, Clock, RefreshCw, Phone, BookOpen, AlertCircle
} from 'lucide-react';

type Tab = 'compose' | 'logs' | 'templates';

const CATEGORY_OPTIONS = [
  { value: 'general',      label: 'General Announcement' },
  { value: 'fee_reminder', label: 'Fee Reminder' },
  { value: 'absence',      label: 'Absence Alert' },
  { value: 'results',      label: 'Results Published' },
  { value: 'discipline',   label: 'Discipline Notice' },
  { value: 'event',        label: 'School Event' },
  { value: 'transport',    label: 'Transport Alert' },
  { value: 'emergency',    label: 'Emergency Alert' },
];

const TARGET_OPTIONS = [
  { value: 'all_parents',    label: 'All Parents',          icon: '👨‍👩‍👧‍👦' },
  { value: 'all_teachers',   label: 'All Teachers',         icon: '👩‍🏫' },
  { value: 'class_parents',  label: 'Parents of a Class',   icon: '🏫' },
  { value: 'custom',         label: 'Custom Phone Number',  icon: '📱' },
];

function charCount(msg: string) {
  const len  = msg.length;
  const smss = Math.ceil(len / 160) || 1;
  return { len, smss };
}

export function SMSPage() {
  const [tab, setTab]             = useState<Tab>('compose');
  const [classes, setClasses]     = useState<any[]>([]);
  const [logs, setLogs]           = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [stats, setStats]         = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Compose form
  const [target, setTarget]       = useState('all_parents');
  const [classId, setClassId]     = useState('');
  const [phone, setPhone]         = useState('');
  const [message, setMessage]     = useState('');
  const [category, setCategory]   = useState('general');
  const [result, setResult]       = useState<any>(null);

  useEffect(() => {
    loadMeta();
  }, []);

  const loadMeta = async () => {
    try {
      const [classRes, tplRes, statsRes]: any[] = await Promise.all([
        api.getClasses(),
        (api as any).getSMSTemplates(),
        (api as any).getSMSStats(),
      ]);
      setClasses(classRes?.data || []);
      setTemplates(tplRes?.data || []);
      setStats(statsRes?.data || null);
    } catch { /* silent */ }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res: any = await (api as any).getSMSLogs({ limit: 100 });
      setLogs(res?.data || []);
    } finally { setLogsLoading(false); }
  };

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab]);

  const handleSend = async () => {
    if (!message.trim()) { alert('Please enter a message'); return; }
    if (target === 'custom' && !phone.trim()) { alert('Enter a phone number'); return; }
    if (target === 'class_parents' && !classId) { alert('Select a class'); return; }

    setLoading(true);
    setResult(null);
    try {
      let res: any;
      if (target === 'custom') {
        res = await (api as any).sendSMS({ phone_number: phone.trim(), message, category });
      } else {
        res = await (api as any).sendBulkSMS({ target, class_id: classId || undefined, message, category });
      }
      setResult(res?.data);
      setMessage('');
    } catch (err: any) {
      setResult({ error: err?.response?.data?.message || 'Send failed' });
    } finally { setLoading(false); }
  };

  const applyTemplate = (tpl: any) => {
    setMessage(tpl.text);
    setCategory(tpl.category);
    setTab('compose');
  };

  const { len, smss } = charCount(message);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">SMS Messaging</h2>
          <p className="text-gray-500">Send SMS notifications directly to parents and teachers</p>
        </div>
        {stats && (
          <div className="flex gap-3 text-sm">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
              <p className="font-bold text-blue-700">{stats.last_30_days}</p>
              <p className="text-xs text-gray-500">This month</p>
            </div>
            <div className="text-center px-4 py-2 bg-green-50 rounded-xl">
              <p className="font-bold text-green-700">{stats.successful}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'compose', label: 'Compose', icon: Send },
          { key: 'templates', label: 'Templates', icon: BookOpen },
          { key: 'logs', label: 'SMS Logs', icon: Clock },
        ] as { key: Tab; label: string; icon: any }[]).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Compose Tab */}
      {tab === 'compose' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle>Compose Message</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Target */}
                <div>
                  <Label>Send To</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {TARGET_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setTarget(o.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          target === o.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>{o.icon}</span> {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class selector */}
                {target === 'class_parents' && (
                  <div>
                    <Label>Select Class</Label>
                    <select
                      value={classId}
                      onChange={e => setClassId(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Choose class…</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom phone */}
                {target === 'custom' && (
                  <div>
                    <Label>Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}

                {/* Category */}
                <div>
                  <Label>Category</Label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Message Text</Label>
                    <span className={`text-xs ${len > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {len} chars · {smss} SMS
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Type your message here…"
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {len > 160 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Message exceeds 160 characters and will be split into {smss} SMS messages.
                    </p>
                  )}
                </div>

                <Button onClick={handleSend} disabled={loading || !message.trim()} className="w-full">
                  {loading ? (
                    <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send SMS</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result */}
            {result && (
              <div className={`rounded-xl p-4 border ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                {result.error ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Error:</span> {result.error}
                  </div>
                ) : (
                  <div className="text-green-700">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <CheckCircle2 className="h-5 w-5" /> Message sent!
                    </div>
                    {result.sent !== undefined ? (
                      <p className="text-sm">Sent: {result.sent} · Failed: {result.failed} · Total: {result.total}</p>
                    ) : (
                      <p className="text-sm">Status: {result.status} {result.phone && `· To: ${result.phone}`}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Tips</CardTitle></CardHeader>
              <CardContent className="text-xs text-gray-500 space-y-2">
                <p>• 160 characters = 1 SMS. Longer messages split automatically.</p>
                <p>• Use the Templates tab for pre-written messages.</p>
                <p>• <strong>All Parents</strong> sends to every parent with a phone number.</p>
                <p>• <strong>Class Parents</strong> targets only parents in a specific class.</p>
                <p>• All SMS are logged for audit under the SMS Logs tab.</p>
                <p>• Configure Africa's Talking API key in server environment variables for live SMS delivery.</p>
              </CardContent>
            </Card>

            {stats && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">SMS Statistics</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Total sent (all time)', val: stats.total_sent },
                    { label: 'Successful',            val: stats.successful },
                    { label: 'Failed',                val: stats.failed    },
                    { label: 'Last 7 days',           val: stats.last_7_days },
                    { label: 'Last 30 days',          val: stats.last_30_days },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-semibold">{s.val || 0}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(tpl => (
            <Card key={tpl.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  {tpl.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 leading-relaxed">{tpl.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{tpl.category}</span>
                  <Button size="sm" variant="outline" onClick={() => applyTemplate(tpl)} className="text-xs">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>SMS History</CardTitle>
              <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Sent by</th>
                      <th className="py-2 pr-3">To</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Message</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3 text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleDateString('en-KE')}<br/>
                          {new Date(log.created_at).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td className="py-2 pr-3 text-xs">{log.sent_by_name || '—'}</td>
                        <td className="py-2 pr-3 text-xs font-mono">{log.phone_number}</td>
                        <td className="py-2 pr-3">
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{log.category}</span>
                        </td>
                        <td className="py-2 pr-3 max-w-xs">
                          <p className="text-xs text-gray-700 truncate">{log.message}</p>
                        </td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            log.status === 'sent' || log.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : log.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">No SMS messages sent yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
