import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Bell, Pin, Plus, Pencil, Trash2, CheckCircle2, AlertCircle,
  Info, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

type Priority = 'urgent' | 'high' | 'normal' | 'low';
type Tab = 'feed' | 'manage';

interface Announcement {
  id: string;
  title: string;
  body: string;
  target_roles: string[];
  priority: Priority;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  is_read?: boolean;
  author_name?: string;
}

const ROLES = ['admin', 'teacher', 'student', 'parent'];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3" /> },
  high:   { label: 'High',   color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <AlertTriangle className="h-3 w-3" /> },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Info className="h-3 w-3" /> },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Bell className="h-3 w-3" /> },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = {
  title: '',
  body: '',
  target_roles: [] as string[],
  priority: 'normal' as Priority,
  is_pinned: false,
  expires_at: '',
};

export function AnnouncementsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [tab, setTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<Announcement[]>([]);
  const [all, setAll] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    if (isAdmin) loadAll();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await (api as any).api.get('/announcements');
      setFeed(res.data || res || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      const res: any = await (api as any).api.get('/announcements?all=true');
      setAll(res.data || res || []);
    } catch { /* silent */ }
  };

  const unreadCount = feed.filter((a) => !a.is_read).length;

  const markRead = async (id: string) => {
    try {
      await (api as any).api.post(`/announcements/${id}/read`);
      setFeed((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* silent */ }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setForm({
      title: item.title,
      body: item.body,
      target_roles: item.target_roles || [],
      priority: item.priority,
      is_pinned: item.is_pinned,
      expires_at: item.expires_at ? item.expires_at.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const saveAnnouncement = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        expires_at: form.expires_at || null,
      };
      if (editItem) {
        await (api as any).api.put(`/announcements/${editItem.id}`, payload);
      } else {
        await (api as any).api.post('/announcements', payload);
      }
      setModalOpen(false);
      loadAll();
      loadFeed();
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await (api as any).api.delete(`/announcements/${id}`);
      setDeleteId(null);
      loadAll();
      loadFeed();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  const tabs: Tab[] = isAdmin ? ['feed', 'manage'] : ['feed'];
  const TAB_LABELS: Record<Tab, string> = { feed: 'My Announcements', manage: 'Manage' };

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
            <Bell className="h-6 w-6 text-indigo-600" /> Announcements
            {unreadCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-gray-500 text-sm mt-1">School announcements and notices</p>
        </div>
        {isAdmin && tab === 'manage' && (
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> New Announcement
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {tab === 'feed' && (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
          )}
          {feed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No announcements for you right now.</p>
              </CardContent>
            </Card>
          ) : (
            [...feed].sort((a, b) => {
              if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }).map((ann) => {
              const isExpanded = expandedId === ann.id;
              return (
                <Card
                  key={ann.id}
                  className={`transition-all border ${ann.is_read ? 'border-gray-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {ann.is_pinned && (
                            <Pin className="h-4 w-4 text-indigo-600 shrink-0" />
                          )}
                          <span className={`font-semibold text-gray-900 ${!ann.is_read ? 'font-bold' : ''}`}>
                            {ann.title}
                          </span>
                          <PriorityBadge priority={ann.priority} />
                          {!ann.is_read && (
                            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {fmt(ann.created_at)}
                          {ann.author_name && ` · ${ann.author_name}`}
                          {ann.expires_at && ` · Expires ${new Date(ann.expires_at).toLocaleDateString('en-KE')}`}
                        </p>
                        {isExpanded && (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{ann.body}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                          className="text-gray-400 hover:text-indigo-600 p-1"
                          title={isExpanded ? 'Collapse' : 'Read more'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {!ann.is_read && (
                          <button
                            onClick={() => markRead(ann.id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-indigo-200 rounded px-2 py-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Manage Tab */}
      {tab === 'manage' && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Announcements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {all.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                No announcements yet. Create one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Title', 'Priority', 'Targets', 'Pinned', 'Expires', 'Created', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {all.map((ann) => (
                      <tr key={ann.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{ann.title}</td>
                        <td className="px-4 py-3"><PriorityBadge priority={ann.priority} /></td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {(ann.target_roles || []).join(', ') || 'All'}
                        </td>
                        <td className="px-4 py-3">
                          {ann.is_pinned ? <Pin className="h-4 w-4 text-indigo-600" /> : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {ann.expires_at ? new Date(ann.expires_at).toLocaleDateString('en-KE') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmt(ann.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(ann)} className="text-indigo-600 hover:text-indigo-800 p-1" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteId(ann.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <DialogClose onClick={() => setModalOpen(false)} />
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Announcement title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Write your announcement here..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="mb-1 block">Target Roles</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.target_roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Priority }))}
                  className="mt-1"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div>
                <Label>Expires At</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm((p) => ({ ...p, is_pinned: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Pin this announcement</span>
              <Pin className="h-4 w-4 text-indigo-600" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={saveAnnouncement}
              disabled={saving || !form.title.trim() || !form.body.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete this announcement? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              onClick={() => deleteId && deleteAnnouncement(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
