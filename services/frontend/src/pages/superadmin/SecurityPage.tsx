import { Fragment, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ShieldAlert, ShieldX, ShieldCheck, Lock, Globe, ChevronLeft, ChevronRight, Search,
  Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, MapPin, Loader2, Ban, History,
} from 'lucide-react';
import api from '@/services/api';

interface LogEntry {
  id: string;
  created_at: string;
  tenant_name: string | null;
  user_name?: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
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
  failed_today: number;
  blocked_today: number;
  unique_ips_today: number;
  top_offending_ips: { ip_address: string; attempts: number }[];
  top_targeted_emails: { email: string; attempts: number }[];
}

interface BlacklistEntry {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  blacklisted_by_email: string | null;
}

interface BlacklistedUser {
  id: string;
  email: string;
  role: string;
  tenant_name: string | null;
  blacklist_reason: string | null;
  blacklisted_at: string;
  blacklisted_by_email: string | null;
}

const LIMIT = 50;

const REASON_LABELS: Record<string, string> = {
  user_not_found: 'Unknown email',
  invalid_password: 'Wrong password',
  account_deactivated: 'Account deactivated',
  no_password_set: 'No password set',
  tenant_suspended: 'School suspended',
  tenant_expired: 'Subscription expired',
  tenant_pending: 'School pending activation',
  device_blacklisted: 'Device blacklisted',
  user_blacklisted: 'User blacklisted',
};

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

type BlacklistTarget =
  | { type: 'device'; ip_address: string | null; user_agent: string | null; label: string }
  | { type: 'user'; userId: string; label: string };

export function SecurityPage() {
  const [tab, setTab] = useState<'attempts' | 'activity' | 'blacklist'>('attempts');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState<string | null>(null);
  const [blacklistTarget, setBlacklistTarget] = useState<BlacklistTarget | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSecuritySummary().then((res: any) => setSummary(res?.data ?? res ?? null)).catch(() => {});
  }, []);

  const locate = useCallback(async (ip: string) => {
    if (!ip || locations[ip] || locating === ip) return;
    setLocating(ip);
    try {
      const res: any = await api.getSecurityIpLocation(ip);
      const data = res?.data ?? res;
      setLocations((prev) => ({ ...prev, [ip]: data?.location || 'Unknown' }));
    } catch {
      setLocations((prev) => ({ ...prev, [ip]: 'Lookup failed' }));
    } finally {
      setLocating(null);
    }
  }, [locations, locating]);

  const openBlacklistDevice = (row: LogEntry, label: string) => {
    setBlacklistReason('');
    setBlacklistTarget({ type: 'device', ip_address: row.ip_address, user_agent: row.user_agent, label });
  };
  const openBlacklistUser = (userId: string, label: string) => {
    setBlacklistReason('');
    setBlacklistTarget({ type: 'user', userId, label });
  };

  const confirmBlacklist = async () => {
    if (!blacklistTarget) return;
    setSubmitting(true);
    try {
      if (blacklistTarget.type === 'device') {
        await api.blacklistDevice({
          ip_address: blacklistTarget.ip_address || undefined,
          user_agent: blacklistTarget.user_agent || undefined,
          reason: blacklistReason || undefined,
        });
      } else {
        await api.blacklistUser(blacklistTarget.userId, blacklistReason || undefined);
      }
      setBlacklistTarget(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to blacklist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-600" /> Security
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Unauthorized login attempts, full login activity, and device/user blacklisting — across every school on the platform.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg"><Lock className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Failed Logins Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.failed_today ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg"><ShieldAlert className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Blocked Logins Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.blocked_today ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><Globe className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Unique IPs Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.unique_ips_today ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary && (summary.top_offending_ips.length > 0 || summary.top_targeted_emails.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Offending IPs (7 days)</p>
              <ul className="space-y-1">
                {summary.top_offending_ips.map((r) => (
                  <li key={r.ip_address} className="flex justify-between text-sm">
                    <span className="font-mono text-gray-700">{r.ip_address}</span>
                    <span className="text-gray-500">{r.attempts} attempts</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Targeted Accounts (7 days)</p>
              <ul className="space-y-1">
                {summary.top_targeted_emails.map((r) => (
                  <li key={r.email} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate">{r.email}</span>
                    <span className="text-gray-500">{r.attempts} attempts</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'attempts', label: 'Unauthorized Attempts', icon: ShieldAlert },
          { key: 'activity', label: 'All Login Activity', icon: History },
          { key: 'blacklist', label: 'Blacklist Registry', icon: Ban },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'attempts' && (
        <AttemptsTab
          locations={locations}
          locating={locating}
          locate={locate}
          onBlacklistDevice={openBlacklistDevice}
          onBlacklistUser={openBlacklistUser}
        />
      )}
      {tab === 'activity' && (
        <ActivityTab locations={locations} locating={locating} locate={locate} />
      )}
      {tab === 'blacklist' && <BlacklistTab />}

      {/* Blacklist confirmation modal */}
      <Dialog open={!!blacklistTarget} onOpenChange={(open) => !open && setBlacklistTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" /> {blacklistTarget?.type === 'user' ? 'Blacklist User' : 'Blacklist Device'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-3">
            {blacklistTarget?.type === 'user'
              ? <>This will immediately block <strong>{blacklistTarget.label}</strong> from logging in or using any active session, across all schools.</>
              : <>This will block all future requests from <strong>{blacklistTarget?.label}</strong>, including already-logged-in sessions from this device.</>}
          </p>
          <Input
            placeholder="Reason (optional, but recommended)"
            value={blacklistReason}
            onChange={(e) => setBlacklistReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistTarget(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={confirmBlacklist} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Blacklist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Unauthorized Attempts tab
// ============================================================
function AttemptsTab({
  locations, locating, locate, onBlacklistDevice, onBlacklistUser,
}: {
  locations: Record<string, string>;
  locating: string | null;
  locate: (ip: string) => void;
  onBlacklistDevice: (row: LogEntry, label: string) => void;
  onBlacklistUser: (userId: string, label: string) => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterReason, setFilterReason] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [ipSearch, setIpSearch] = useState('');
  const [ipInput, setIpInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (filterReason) params.reason = filterReason;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (emailSearch) params.email = emailSearch;
      if (ipSearch) params.ip_address = ipSearch;
      const res: any = await api.getSecurityLoginAttempts(params);
      const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLogs(rows);
      setTotal(typeof res?.total === 'number' ? res.total : rows.length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load login attempts');
    } finally {
      setLoading(false);
    }
  }, [page, filterReason, fromDate, toDate, emailSearch, ipSearch]);

  useEffect(() => { load(); }, [load]);

  const applySearch = () => { setEmailSearch(emailInput); setIpSearch(ipInput); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reason</label>
              <Select value={filterReason} onChange={(e) => { setFilterReason(e.target.value); setPage(1); }}>
                <option value="">All Reasons</option>
                {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search Email</label>
              <Input placeholder="attempted email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applySearch()} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search IP</label>
              <div className="flex gap-1">
                <Input placeholder="e.g. 41.90" value={ipInput} onChange={(e) => setIpInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applySearch()} />
                <Button onClick={applySearch} size="sm" variant="outline"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500"><ShieldAlert className="h-8 w-8 text-gray-300 mx-auto mb-2" />No unauthorized login attempts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Timestamp', 'School', 'Attempted Email', 'Reason', 'IP / Location', 'Device', 'Browser / OS', 'Actions', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((row) => {
                    const isOpen = expanded === row.id;
                    const parsedDetails = parseDetails(row.details);
                    const reason = parsedDetails?.reason as string | undefined;
                    const attemptedEmail = parsedDetails?.email || row.user_email;
                    const knownUserId = row.resource_id && reason !== 'user_not_found' ? row.resource_id : null;
                    return (
                      <Fragment key={row.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer bg-red-50/30" onClick={() => setExpanded(isOpen ? null : row.id)}>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(row.created_at)}</td>
                          <td className="px-4 py-3 text-gray-700">{row.tenant_name || <span className="text-gray-400">Unregistered</span>}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{attemptedEmail || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {reason ? (REASON_LABELS[reason] || reason) : row.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-gray-600">{row.ip_address || '—'}</div>
                            {row.ip_address && (
                              <div className="mt-0.5">
                                {locations[row.ip_address] ? (
                                  <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {locations[row.ip_address]}</span>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); locate(row.ip_address!); }} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    {locating === row.ip_address ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />} Locate
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-gray-600"><DeviceIcon deviceType={row.device_type} /><span className="text-xs capitalize">{row.device_type || '—'}</span></div></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{row.browser || '—'}{row.os ? ` · ${row.os}` : ''}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => onBlacklistDevice(row, row.ip_address || row.user_agent || 'this device')}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1"
                                disabled={!row.ip_address && !row.user_agent}
                              >
                                <Ban className="h-3 w-3" /> Blacklist Device
                              </button>
                              {knownUserId && (
                                <button onClick={() => onBlacklistUser(knownUserId, attemptedEmail || 'this user')} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                                  <Ban className="h-3 w-3" /> Blacklist User
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-4 py-3 text-xs text-gray-600">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><span className="font-semibold text-gray-700">Targeted Role: </span>{row.user_role || 'unknown'}</div>
                                <div><span className="font-semibold text-gray-700">Request: </span>{row.http_method || '—'} {row.request_path || ''} {row.status_code ? `→ ${row.status_code}` : ''}</div>
                                <div className="sm:col-span-2"><span className="font-semibold text-gray-700">User Agent: </span><span className="break-all">{row.user_agent || '—'}</span></div>
                                {parsedDetails && (
                                  <div className="sm:col-span-2">
                                    <span className="font-semibold text-gray-700">Details: </span>
                                    <pre className="mt-1 bg-white border rounded p-2 overflow-x-auto whitespace-pre-wrap">{typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}</pre>
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
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages} — {total.toLocaleString()} total attempts</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// All Login Activity tab — successful + failed + blocked, cross-tenant
// ============================================================
function ActivityTab({
  locations, locating, locate,
}: { locations: Record<string, string>; locating: string | null; locate: (ip: string) => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSearch, setEmailSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (filterAction) params.action = filterAction;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (emailSearch) params.email = emailSearch;
      const res: any = await api.getAllLogins(params);
      const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLogs(rows);
      setTotal(typeof res?.total === 'number' ? res.total : rows.length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load login activity');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, fromDate, toDate, emailSearch]);

  useEffect(() => { load(); }, [load]);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const ACTION_BADGE: Record<string, string> = {
    login: 'bg-green-100 text-green-700',
    login_failed: 'bg-red-100 text-red-700',
    login_blocked: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Result</label>
              <Select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="login">Successful</option>
                <option value="login_failed">Failed</option>
                <option value="login_blocked">Blocked</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Search Email</label>
              <Input placeholder="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setEmailSearch(emailInput); setPage(1); } }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500"><History className="h-8 w-8 text-gray-300 mx-auto mb-2" />No login activity found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Timestamp', 'School', 'User', 'Role', 'Result', 'IP / Location', 'Device', 'Browser / OS', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((row) => {
                    const isOpen = expanded === row.id;
                    const parsedDetails = parseDetails(row.details);
                    const email = row.user_email || parsedDetails?.email;
                    return (
                      <Fragment key={row.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : row.id)}>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(row.created_at)}</td>
                          <td className="px-4 py-3 text-gray-700">{row.tenant_name || <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.user_name || email || '—'}</div>
                            {row.user_name && email && <div className="text-xs text-gray-400">{email}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{row.user_role || '—'}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_BADGE[row.action] || 'bg-gray-100 text-gray-700'}`}>{row.action === 'login' ? 'Success' : (row.action === 'login_failed' ? 'Failed' : 'Blocked')}</span></td>
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-gray-600">{row.ip_address || '—'}</div>
                            {row.ip_address && (
                              <div className="mt-0.5">
                                {locations[row.ip_address] ? (
                                  <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {locations[row.ip_address]}</span>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); locate(row.ip_address!); }} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    {locating === row.ip_address ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />} Locate
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-gray-600"><DeviceIcon deviceType={row.device_type} /><span className="text-xs capitalize">{row.device_type || '—'}</span></div></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{row.browser || '—'}{row.os ? ` · ${row.os}` : ''}</td>
                          <td className="px-4 py-3 text-gray-400">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-4 py-3 text-xs text-gray-600">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><span className="font-semibold text-gray-700">Request: </span>{row.http_method || '—'} {row.request_path || ''} {row.status_code ? `→ ${row.status_code}` : ''}</div>
                                <div className="sm:col-span-2"><span className="font-semibold text-gray-700">User Agent: </span><span className="break-all">{row.user_agent || '—'}</span></div>
                                {parsedDetails && (
                                  <div className="sm:col-span-2">
                                    <span className="font-semibold text-gray-700">Details: </span>
                                    <pre className="mt-1 bg-white border rounded p-2 overflow-x-auto whitespace-pre-wrap">{typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}</pre>
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
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages} — {total.toLocaleString()} total entries</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Blacklist Registry tab — devices + users, with revoke actions
// ============================================================
function BlacklistTab() {
  const [devices, setDevices] = useState<BlacklistEntry[]>([]);
  const [users, setUsers] = useState<BlacklistedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u] = await Promise.all([api.getDeviceBlacklist(), api.getBlacklistedUsers()]);
      const dRows = Array.isArray((d as any)?.data) ? (d as any).data : [];
      const uRows = Array.isArray((u as any)?.data) ? (u as any).data : [];
      setDevices(dRows);
      setUsers(uRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revokeDevice = async (id: string) => {
    setBusy(id);
    try { await api.unblacklistDevice(id); await load(); } finally { setBusy(null); }
  };
  const restoreUser = async (id: string) => {
    setBusy(id);
    try { await api.unblacklistUser(id); await load(); } finally { setBusy(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Blacklisted Devices</p>
          {devices.filter(d => d.is_active).length === 0 ? (
            <p className="text-sm text-gray-400">No devices are currently blacklisted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="py-2 pr-4">IP</th><th className="py-2 pr-4">User Agent</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Blacklisted By</th><th className="py-2 pr-4">Date</th><th></th></tr></thead>
                <tbody className="divide-y">
                  {devices.filter(d => d.is_active).map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-4 font-mono text-xs">{d.ip_address || '—'}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500 max-w-xs truncate">{d.user_agent || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{d.reason || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{d.blacklisted_by_email || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{fmt(d.created_at)}</td>
                      <td className="py-2">
                        <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => revokeDevice(d.id)}>
                          {busy === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />} Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><ShieldX className="h-3.5 w-3.5" /> Blacklisted Users</p>
          {users.length === 0 ? (
            <p className="text-sm text-gray-400">No users are currently blacklisted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">School</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Blacklisted By</th><th className="py-2 pr-4">Date</th><th></th></tr></thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{u.email}</td>
                      <td className="py-2 pr-4 text-gray-600 text-xs">{u.role}</td>
                      <td className="py-2 pr-4 text-gray-600">{u.tenant_name || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{u.blacklist_reason || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{u.blacklisted_by_email || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{fmt(u.blacklisted_at)}</td>
                      <td className="py-2">
                        <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => restoreUser(u.id)}>
                          {busy === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />} Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
