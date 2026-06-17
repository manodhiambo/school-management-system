import { Fragment, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Activity, Download, ChevronLeft, ChevronRight, Search,
  User, Clock, Zap, ShieldAlert, Monitor, Smartphone, Tablet,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/services/api';

interface LogEntry {
  id: string;
  created_at: string;
  user_name: string | null;
  user_email: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, any> | string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  http_method: string | null;
  request_path: string | null;
  status_code: number | null;
}

interface Summary {
  total_today: number;
  most_active_user: string | null;
  most_common_action: string | null;
  failed_logins_today: number;
}

const LIMIT = 50;

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function parseDetails(details: LogEntry['details']) {
  if (!details) return null;
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch { return details; }
  }
  return details;
}

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  if (deviceType === 'mobile') return <Smartphone className="h-3.5 w-3.5 text-gray-500" />;
  if (deviceType === 'tablet') return <Tablet className="h-3.5 w-3.5 text-gray-500" />;
  return <Monitor className="h-3.5 w-3.5 text-gray-500" />;
}

function exportCSV(rows: LogEntry[]) {
  const headers = [
    'Timestamp', 'User', 'Role', 'Action', 'Resource', 'Resource ID',
    'IP Address', 'Device', 'Browser', 'OS', 'Method', 'Path', 'Status',
  ];
  const lines = rows.map((r) => [
    fmt(r.created_at),
    r.user_name || r.user_email || '',
    r.user_role || '',
    r.action,
    r.resource,
    r.resource_id || '',
    r.ip_address || '',
    r.device_type || '',
    r.browser || '',
    r.os || '',
    r.http_method || '',
    r.request_path || '',
    r.status_code ?? '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [ipSearch, setIpSearch] = useState('');
  const [ipInput, setIpInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (filterAction) params.action = filterAction;
      if (filterDevice) params.device_type = filterDevice;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (userSearch) params.user = userSearch;
      if (ipSearch) params.ip_address = ipSearch;

      const res: any = await api.getAuditLog(params);
      // Response interceptor unwraps axios → res = { success, data: [...], total, page, pages }
      const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLogs(rows);
      setTotal(typeof res?.total === 'number' ? res.total : rows.length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterDevice, fromDate, toDate, userSearch, ipSearch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getAuditSummary().then((res: any) => {
      setSummary(res?.data ?? res ?? null);
    }).catch(() => { /* silent */ });
    api.getAuditActions().then((res: any) => {
      setActions(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    }).catch(() => { /* silent */ });
  }, []);

  const applySearch = () => {
    setUserSearch(searchInput);
    setIpSearch(ipInput);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-indigo-100 text-indigo-800',
    teacher: 'bg-green-100 text-green-800',
    student: 'bg-blue-100 text-blue-800',
    parent: 'bg-purple-100 text-purple-800',
    superadmin: 'bg-red-100 text-red-800',
    finance_officer: 'bg-amber-100 text-amber-800',
  };

  const isSecurityAction = (action: string) => action === 'login_failed' || action === 'login_blocked';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" /> Audit Log
          </h2>
          <p className="text-gray-500 text-sm mt-1">Track every action across the system — who, when, from where, and on what device</p>
        </div>
        <Button
          onClick={() => exportCSV(logs)}
          variant="outline"
          className="flex items-center gap-2"
          disabled={logs.length === 0}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Actions Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_today ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Most Active User</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{summary?.most_active_user ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Most Common Action</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{summary?.most_common_action ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Failed Logins Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.failed_logins_today ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Action</label>
              <Select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              >
                <option value="">All Actions</option>
                {actions.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Device</label>
              <Select
                value={filterDevice}
                onChange={(e) => { setFilterDevice(e.target.value); setPage(1); }}
              >
                <option value="">All Devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search User</label>
              <div className="flex gap-1">
                <Input
                  placeholder="Name or email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search IP</label>
              <div className="flex gap-1">
                <Input
                  placeholder="e.g. 41.90"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
                <Button onClick={applySearch} size="sm" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No audit log entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Timestamp', 'User', 'Role', 'Action', 'Resource', 'IP Address', 'Device', 'Browser / OS', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((row) => {
                    const isOpen = expanded === row.id;
                    const parsedDetails = parseDetails(row.details);
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={`hover:bg-gray-50 cursor-pointer ${isSecurityAction(row.action) ? 'bg-red-50/40' : ''}`}
                          onClick={() => setExpanded(isOpen ? null : row.id)}
                        >
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(row.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.user_name || row.user_email || '—'}</div>
                            {row.user_name && row.user_email && (
                              <div className="text-xs text-gray-400">{row.user_email}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[row.user_role] ?? 'bg-gray-100 text-gray-700'}`}>
                              {row.user_role || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className={isSecurityAction(row.action) ? 'text-red-700 font-semibold' : 'text-indigo-700'}>
                              {row.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.resource}
                            {row.resource_id && <span className="text-gray-400 font-mono text-xs ml-1">#{row.resource_id.slice(0, 8)}</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.ip_address || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <DeviceIcon deviceType={row.device_type} />
                              <span className="text-xs capitalize">{row.device_type || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {row.browser || '—'}{row.os ? ` · ${row.os}` : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-4 py-3 text-xs text-gray-600">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="font-semibold text-gray-700">Request: </span>
                                  {row.http_method || '—'} {row.request_path || ''} {row.status_code ? `→ ${row.status_code}` : ''}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">User Agent: </span>
                                  <span className="break-all">{row.user_agent || '—'}</span>
                                </div>
                                {parsedDetails && (
                                  <div className="sm:col-span-2">
                                    <span className="font-semibold text-gray-700">Details: </span>
                                    <pre className="mt-1 bg-white border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                      {typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} — {total.toLocaleString()} total entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
