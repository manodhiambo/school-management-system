import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle, XCircle, DollarSign, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res: any = await api.getSuperAdminStats();
      setStats(res?.data ?? res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
      <p className="text-red-600">{error}</p>
      <Button onClick={loadStats} className="mt-3" variant="outline">Retry</Button>
    </div>
  );

  const s = stats || {};

  const kpiCards = [
    {
      title: 'Total Schools',
      value: s.total_tenants ?? 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      desc: 'Registered tenants',
    },
    {
      title: 'Active Schools',
      value: s.active_tenants ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      desc: 'Currently active',
    },
    {
      title: 'Inactive / Suspended',
      value: (s.total_tenants ?? 0) - (s.active_tenants ?? 0),
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      desc: 'Pending or suspended',
    },
    {
      title: 'Total Revenue (KSh)',
      value: `${((s.total_revenue ?? 0) / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      desc: 'Lifetime payments',
    },
    {
      title: 'Monthly Revenue',
      value: `${((s.monthly_revenue ?? 0) / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      desc: 'This month',
    },
    {
      title: 'Expiring Soon',
      value: s.expiring_soon ?? 0,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      desc: 'Subscription ending <30 days',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of all tenant schools on the platform</p>
        </div>
        <Link to="/superadmin/tenants">
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
            Manage Schools
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Registrations */}
      {s.recent_registrations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {s.recent_registrations.map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t.school_name}</p>
                    <p className="text-xs text-gray-500">{t.admin_email} · {t.county || 'N/A'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.status === 'active' ? 'bg-green-100 text-green-700' :
                      t.status === 'suspended' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.status}
                    </span>
                    <Link to={`/superadmin/tenants?highlight=${t.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Subscriptions */}
      {s.expiring_list?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-base text-orange-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Subscriptions Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {s.expiring_list.map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t.school_name}</p>
                    <p className="text-xs text-gray-500">Expires: {new Date(t.subscription_end_date).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/superadmin/tenants`}>
                    <Button size="sm" variant="outline" className="text-xs h-7 border-orange-300 text-orange-600 hover:bg-orange-50">
                      Extend
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!s.recent_registrations?.length && !s.expiring_list?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No schools registered yet.</p>
            <p className="text-sm text-gray-400 mt-1">Share the registration link to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
