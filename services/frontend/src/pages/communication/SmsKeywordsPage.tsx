import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  MessageSquare, Hash, BookOpen, Info, Plus, X,
  AlertTriangle, RefreshCw, ToggleLeft, ToggleRight, Clock
} from 'lucide-react';

const HANDLERS = [
  { value: 'balance', label: 'Balance — Returns student fee balance' },
  { value: 'attendance', label: 'Attendance — Returns today\'s attendance status' },
  { value: 'results', label: 'Results — Returns latest exam results' },
  { value: 'custom', label: 'Custom — Custom response message' },
];

export function SmsKeywordsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [keywords, setKeywords] = useState<any[]>([]);
  const [inboundLog, setInboundLog] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [kwForm, setKwForm] = useState({ keyword: '', description: '', handler: 'balance' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKeywords();
    loadLog();
  }, []);

  const loadKeywords = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getSmsKeywords();
      setKeywords(res?.data || []);
    } catch { setError('Failed to load keywords'); }
    setLoading(false);
  };

  const loadLog = async () => {
    setLogLoading(true);
    try {
      const res: any = await (api as any).getInboundSmsLog();
      setInboundLog(res?.data || []);
    } catch {}
    setLogLoading(false);
  };

  const saveKeyword = async () => {
    setSaving(true);
    try {
      await (api as any).createSmsKeyword(kwForm);
      setAddModal(false);
      setKwForm({ keyword: '', description: '', handler: 'balance' });
      setSuccess('Keyword added.');
      loadKeywords();
    } catch { setError('Failed to save keyword'); }
    setSaving(false);
  };

  const toggleKeyword = async (kw: any) => {
    try {
      await (api as any).updateSmsKeyword(kw.id, { ...kw, is_active: !kw.is_active });
      loadKeywords();
    } catch { setError('Failed to update keyword'); }
  };

  const handlerLabel = (h: string) => HANDLERS.find(x => x.value === h)?.label.split(' — ')[0] || h;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Hash className="h-6 w-6 text-blue-600" /> Two-Way SMS Keywords
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded p-3">
          {success}
          <button className="ml-auto" onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How Two-Way SMS Works</p>
            <p>Parents can send SMS keywords to your Mobitech number to receive instant automated replies. For example, a parent texts <strong>BALANCE</strong> and the system replies with their child's fee balance. Set up the keywords below and configure your Mobitech number to forward incoming messages to the webhook URL.</p>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Active Keywords
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadKeywords}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => { setKwForm({ keyword: '', description: '', handler: 'balance' }); setAddModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Keyword
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-gray-500">Loading...</p>
          ) : keywords.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No keywords configured yet. Add one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">Keyword</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Handler</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw: any) => (
                  <tr key={kw.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {kw.keyword?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{kw.description || '-'}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">
                        {handlerLabel(kw.handler)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${kw.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {kw.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                        title={kw.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleKeyword(kw)}
                      >
                        {kw.is_active
                          ? <ToggleRight className="h-5 w-5 text-green-500" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Inbound SMS Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" /> Inbound SMS Log
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadLog}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="p-0">
          {logLoading ? (
            <p className="p-4 text-gray-500">Loading...</p>
          ) : inboundLog.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No inbound messages received yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">From</th>
                  <th className="px-4 py-2">Keyword Received</th>
                  <th className="px-4 py-2">Response Sent</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {inboundLog.map((log: any, i: number) => (
                  <tr key={log.id || i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{log.from_phone}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        {log.keyword_received?.toUpperCase() || log.message || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate text-xs">{log.response_sent || '-'}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{log.created_at?.replace('T', ' ').split('.')[0] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Mobitech Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-gray-600">Configure your Mobitech account to forward incoming SMS messages to:</p>
          <div className="flex items-center gap-2 bg-white border rounded p-3">
            <code className="text-blue-700 font-mono text-sm flex-1 break-all">
              https://your-api-url/api/v1/sms-keywords/inbound
            </code>
          </div>
          <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-1">
            <li>Log in to your Mobitech dashboard at portal.mobitech.co.ke</li>
            <li>Navigate to <strong>SMS</strong> &rarr; <strong>Two-Way SMS</strong></li>
            <li>Set the <strong>Callback URL</strong> to the webhook URL above</li>
            <li>Save changes. Incoming keyword SMS will now trigger auto-replies.</li>
          </ol>
          <p className="text-gray-500 text-xs">The system matches the first word of the incoming SMS against your active keywords (case-insensitive).</p>
        </CardContent>
      </Card>

      {/* Add Keyword Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add SMS Keyword</h2>
              <button onClick={() => setAddModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Keyword</Label>
                <Input
                  value={kwForm.keyword}
                  onChange={e => setKwForm(f => ({ ...f, keyword: e.target.value.toUpperCase() }))}
                  placeholder="e.g. BALANCE"
                  className="font-mono uppercase"
                />
                <p className="text-xs text-gray-400 mt-1">Parents will SMS this word to your number.</p>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={kwForm.description} onChange={e => setKwForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this keyword do?" />
              </div>
              <div>
                <Label>Handler</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={kwForm.handler}
                  onChange={e => setKwForm(f => ({ ...f, handler: e.target.value }))}
                >
                  {HANDLERS.map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
              <Button onClick={saveKeyword} disabled={saving || !kwForm.keyword.trim()}>
                {saving ? 'Saving...' : 'Add Keyword'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
