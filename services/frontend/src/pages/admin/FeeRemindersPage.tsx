import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Bell, Send, CheckCircle2, XCircle, AlertCircle, Phone,
  RefreshCw, ToggleLeft, ToggleRight, MessageSquare,
} from 'lucide-react';
import api from '@/services/api';

interface FeeRemindersConfig {
  enabled: boolean;
  reminder_days: number[];
  message_template: string;
}

interface ReminderStats {
  sent_this_month: number;
  sent_this_week: number;
  failed: number;
}

interface ReminderLog {
  id: string;
  student_name: string;
  parent_phone: string;
  balance: number;
  channel: string;
  status: 'sent' | 'failed' | 'skipped';
  sent_at: string;
}

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

const DEFAULT_TEMPLATE =
  'Dear Parent, {student_name} has an outstanding fee balance of KES {balance}. Please clear this balance to avoid disruption of studies. Thank you.';

const DEFAULT_CONFIG: FeeRemindersConfig = {
  enabled: false,
  reminder_days: [7, 3, 1],
  message_template: DEFAULT_TEMPLATE,
};

function fmt(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent:    'bg-green-100 text-green-800',
    failed:  'bg-red-100 text-red-800',
    skipped: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export function FeeRemindersPage() {
  const [config, setConfig] = useState<FeeRemindersConfig>({ ...DEFAULT_CONFIG });
  const [daysInput, setDaysInput] = useState('7,3,1');
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, statsRes]: any[] = await Promise.all([
        (api as any).api.get('/fee-reminders/config'),
        (api as any).api.get('/fee-reminders/stats'),
      ]);
      const cfg = cfgRes.data || cfgRes || {};
      setConfig({
        enabled: cfg.enabled ?? false,
        reminder_days: cfg.reminder_days ?? [7, 3, 1],
        message_template: cfg.message_template || DEFAULT_TEMPLATE,
      });
      setDaysInput((cfg.reminder_days ?? [7, 3, 1]).join(','));
      setStats(statsRes.data || statsRes || null);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
    loadLogs();
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res: any = await (api as any).api.get('/fee-reminders/log?limit=50');
      setLogs(res.data || res || []);
    } catch { /* silent */ } finally {
      setLogsLoading(false);
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      const days = daysInput
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d) && d > 0);
      const payload = { ...config, reminder_days: days };
      await (api as any).api.put('/fee-reminders/config', payload);
      setConfig((p) => ({ ...p, reminder_days: days }));
      setConfigMsg({ type: 'success', text: 'Configuration saved successfully.' });
    } catch (e: any) {
      setConfigMsg({ type: 'error', text: e?.message || 'Failed to save configuration.' });
    } finally {
      setConfigSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res: any = await (api as any).api.post('/fee-reminders/send-now');
      setSendResult(res.data || res || { sent: 0, failed: 0, skipped: 0 });
      setConfirmOpen(false);
      loadLogs();
      // refresh stats
      (api as any).api.get('/fee-reminders/stats').then((r: any) => setStats(r.data || r || null)).catch(() => {});
    } catch (e: any) {
      alert(e?.message || 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" /> Fee Reminders
          </h2>
          <p className="text-gray-500 text-sm mt-1">Automated fee balance reminders to parents via SMS</p>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Send className="h-4 w-4" /> Send Reminders Now
        </Button>
      </div>

      {/* Send Result */}
      {sendResult && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{sendResult.sent}</p>
            <p className="text-sm text-green-600">Sent</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{sendResult.failed}</p>
            <p className="text-sm text-red-600">Failed</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{sendResult.skipped}</p>
            <p className="text-sm text-gray-600">Skipped</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sent This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent_this_month}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sent This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent_this_week}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Config Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Reminder Configuration
            <button
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                config.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {config.enabled
                ? <><ToggleRight className="h-4 w-4" /> Enabled</>
                : <><ToggleLeft className="h-4 w-4" /> Disabled</>}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Reminder Days</Label>
            <p className="text-xs text-gray-400 mb-1">
              Comma-separated number of days before due date to send reminders (e.g. 7,3,1)
            </p>
            <Input
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              placeholder="7,3,1"
              className="max-w-xs"
            />
          </div>

          <div>
            <Label>Message Template</Label>
            <p className="text-xs text-gray-400 mb-1">
              Available placeholders: <code className="bg-gray-100 px-1 rounded">{'{student_name}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{balance}'}</code>
            </p>
            <Textarea
              value={config.message_template}
              onChange={(e) => setConfig((p) => ({ ...p, message_template: e.target.value }))}
              rows={4}
              className="w-full"
              placeholder="Enter message template..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Character count: {config.message_template.length} / 160 (1 SMS)
            </p>
          </div>

          {configMsg && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              configMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {configMsg.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {configMsg.text}
            </div>
          )}

          <Button
            onClick={saveConfig}
            disabled={configSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {configSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Recent Reminder Log
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading} className="flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No reminders sent yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Student', 'Parent Phone', 'Balance (KES)', 'Channel', 'Status', 'Sent At'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{log.student_name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" />{log.parent_phone}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {Number(log.balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full uppercase font-medium">
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(log.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Send Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" /> Send Reminders Now
            </DialogTitle>
          </DialogHeader>
          <DialogClose onClick={() => setConfirmOpen(false)} />
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This will immediately send fee balance SMS reminders to all parents of students with outstanding balances.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                SMS charges will apply for each message sent. This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</Button>
            <Button
              onClick={sendNow}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {sending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</>
                : <><Send className="h-4 w-4" /> Confirm Send</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
