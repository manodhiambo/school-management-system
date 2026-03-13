import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { Bell, BellOff, CheckCircle, AlertTriangle, BookOpen, DollarSign, Shield, Heart } from 'lucide-react';

const ALERT_TYPE_ICONS: Record<string, any> = {
  attendance_absent: AlertTriangle, attendance_late: AlertTriangle, attendance_early_exit: AlertTriangle,
  grade_published: BookOpen, grade_low: BookOpen, report_card: BookOpen,
  fee_due: DollarSign, fee_overdue: DollarSign, fee_payment_received: DollarSign, fee_reminder: DollarSign,
  discipline_incident: Shield, discipline_action: Shield,
  exam_schedule: BookOpen, exam_result: BookOpen,
  health_incident: Heart, transport_delay: AlertTriangle,
  general_announcement: Bell, system: Bell,
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  attendance_absent: 'bg-red-100 text-red-800',
  attendance_late: 'bg-orange-100 text-orange-800',
  fee_overdue: 'bg-red-100 text-red-800',
  grade_low: 'bg-orange-100 text-orange-800',
  discipline_incident: 'bg-red-100 text-red-800',
  health_incident: 'bg-rose-100 text-rose-800',
  fee_payment_received: 'bg-green-100 text-green-800',
  grade_published: 'bg-blue-100 text-blue-800',
  report_card: 'bg-indigo-100 text-indigo-800',
  general_announcement: 'bg-gray-100 text-gray-700',
};

function alertLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const ALERT_TYPES = [
  'attendance_absent','attendance_late','grade_published','grade_low','report_card',
  'fee_due','fee_overdue','fee_payment_received','discipline_incident','health_incident','general_announcement',
];

export function ParentAlertsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['parent-alerts', filter, showUnreadOnly],
    queryFn: () => (api as any).getParentAlerts({ alert_type: filter || undefined, is_read: showUnreadOnly ? 'false' : undefined }),
  });
  const { data: countData } = useQuery({
    queryKey: ['parent-alerts-count'],
    queryFn: () => (api as any).getParentAlertsCount(),
    refetchInterval: 30000,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => (api as any).markParentAlertRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-alerts'] });
      qc.invalidateQueries({ queryKey: ['parent-alerts-count'] });
    },
  });
  const markAllMutation = useMutation({
    mutationFn: () => (api as any).markAllParentAlertsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-alerts'] });
      qc.invalidateQueries({ queryKey: ['parent-alerts-count'] });
    },
  });

  const alerts = (alertsData as any)?.data || [];
  const unreadCount = (countData as any)?.data?.count || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            My Alerts
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Notifications about your children's school activities</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {markAllMutation.isPending ? 'Marking...' : `Mark all read (${unreadCount})`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              All
            </button>
            {ALERT_TYPES.map(type => (
              <button key={type} onClick={() => setFilter(filter === type ? '' : type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {alertLabel(type)}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <input type="checkbox" id="unread-only" checked={showUnreadOnly}
                onChange={e => setShowUnreadOnly(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="unread-only" className="text-sm text-gray-600 cursor-pointer">Unread only</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No alerts found</p>
            <p className="text-gray-400 text-sm mt-1">
              {showUnreadOnly ? 'You have no unread alerts.' : 'You have no alerts yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const Icon = ALERT_TYPE_ICONS[alert.alert_type] || Bell;
            const colorClass = ALERT_TYPE_COLORS[alert.alert_type] || 'bg-gray-100 text-gray-700';
            return (
              <Card key={alert.id} className={!alert.is_read ? 'shadow-md border-indigo-200' : 'opacity-80'}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${!alert.is_read ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${!alert.is_read ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold text-sm ${!alert.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {alert.title}
                            {!alert.is_read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-indigo-500" />}
                          </p>
                          <p className="text-xs text-indigo-600 font-medium mt-0.5">{alert.student_name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${colorClass}`}>{alertLabel(alert.alert_type)}</Badge>
                          {!alert.is_read && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => readMutation.mutate(alert.id)}>
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(alert.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
