import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt,
  Building2, AlertTriangle, CheckCircle, Clock, Wallet,
  ArrowUpRight, ArrowDownRight, FileText, BarChart2, Calendar,
  Activity, Users, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import financeService from '@/services/financeService';
import { UserManualCard } from '@/components/UserManualCard';
import { useLanguageStore } from '@/store/languageStore';

export function FinanceOfficerDashboard() {
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();
  const [loading, setLoading] = useState(true);
  const [financeDash, setFinanceDash] = useState<any>(null);
  const [feeCollection, setFeeCollection] = useState<any>(null);
  const [feeByMonth, setFeeByMonth] = useState<any[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [pettyCashSummary, setPettyCashSummary] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dash, fees, months, expenses, banks, petty] = await Promise.allSettled([
        financeService.getDashboard(),
        api.getFeeCollectionSummary(),
        api.getFeeCollectionByMonth(),
        financeService.getExpenseRecords({ status: 'pending' }),
        financeService.getBankAccounts(),
        financeService.getPettyCashSummary(),
      ]);

      if (dash.status === 'fulfilled') setFinanceDash(dash.value);
      if (fees.status === 'fulfilled') {
        const d = (fees.value as any)?.data || fees.value;
        setFeeCollection(d);
      }
      if (months.status === 'fulfilled') {
        const d = (months.value as any)?.data || months.value;
        setFeeByMonth(Array.isArray(d) ? d.slice(-6) : []);
      }
      if (expenses.status === 'fulfilled') setPendingExpenses(expenses.value || []);
      if (banks.status === 'fulfilled') setBankAccounts(banks.value || []);
      if (petty.status === 'fulfilled') setPettyCashSummary(petty.value);
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (language === 'sw') {
      if (h < 12) return 'Habari za Asubuhi';
      if (h < 17) return 'Habari za Mchana';
      return 'Habari za Jioni';
    }
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const collectionRate = feeCollection?.total_amount > 0
    ? Math.round((feeCollection.total_collected / feeCollection.total_amount) * 100)
    : 0;

  const totalBankBalance = bankAccounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

  const netPosition = (financeDash?.totalIncome || 0) - (financeDash?.totalExpenses || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" />
          <p className="mt-4 text-gray-500">{t('Loading finance dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {t('Finance Officer')}!</h1>
            <p className="text-amber-100 mt-1">{t('Here is your financial overview for today.')}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Total Income')}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(financeDash?.totalIncome)}</h3>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  {t('This Year')}
                </div>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Total Expenses')}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(financeDash?.totalExpenses)}</h3>
                <div className="flex items-center mt-2 text-sm text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  {t('This Year')}
                </div>
              </div>
              <div className="h-14 w-14 bg-red-100 rounded-2xl flex items-center justify-center">
                <TrendingDown className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Position */}
        <Card className={`border-0 shadow-lg bg-gradient-to-br ${netPosition >= 0 ? 'from-blue-50' : 'from-orange-50'} to-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Net Position')}</p>
                <h3 className={`text-2xl font-bold mt-1 ${netPosition >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {fmt(netPosition)}
                </h3>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  {t('Income minus expenses')}
                </div>
              </div>
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${netPosition >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <Wallet className={`h-7 w-7 ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Balance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Bank Balance')}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalBankBalance)}</h3>
                <div className="flex items-center mt-2 text-sm text-indigo-600">
                  {bankAccounts.length} {t('account(s)')}
                </div>
              </div>
              <div className="h-14 w-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection + Pending Approvals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fee Collection Overview */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-amber-600" />
                {t('Fee Collection Overview')}
              </span>
              <Link to="/app/fee" className="text-sm text-amber-600 hover:underline font-normal">
                {t('Manage Fees')} →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('Collection Progress')}</span>
                  <span className="font-semibold text-amber-600">{collectionRate}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Expected')}</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">{fmt(feeCollection?.total_amount)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Collected')}</p>
                  <p className="text-lg font-bold text-green-700 mt-1">{fmt(feeCollection?.total_collected)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Outstanding')}</p>
                  <p className="text-lg font-bold text-red-700 mt-1">
                    {fmt((feeCollection?.total_amount || 0) - (feeCollection?.total_collected || 0))}
                  </p>
                </div>
              </div>

              {/* Monthly trend */}
              {feeByMonth.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">{t('Monthly Collection (last 6 months)')}</p>
                  <div className="flex items-end gap-1 h-20">
                    {feeByMonth.map((m: any, i: number) => {
                      const max = Math.max(...feeByMonth.map((x: any) => Number(x.total_collected || x.amount || 0)));
                      const val = Number(m.total_collected || m.amount || 0);
                      const pct = max > 0 ? (val / max) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-amber-400 rounded-t transition-all"
                            style={{ height: `${pct}%` }}
                            title={`${m.month || m.period}: ${fmt(val)}`}
                          />
                          <span className="text-[9px] text-gray-400 truncate w-full text-center">
                            {(m.month || m.period || '').toString().slice(-3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Expense Approvals */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                {t('Pending Approvals')}
              </span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                pendingExpenses.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {pendingExpenses.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CheckCircle className="h-10 w-10 mb-2 text-green-400" />
                <p className="text-sm">{t('All expenses approved')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingExpenses.slice(0, 5).map((exp: any) => (
                  <div key={exp.id} className="flex items-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="h-9 w-9 bg-orange-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <Receipt className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{exp.description}</p>
                      <p className="text-xs text-gray-500">{fmt(exp.total_amount || exp.amount)}</p>
                    </div>
                  </div>
                ))}
                {pendingExpenses.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{pendingExpenses.length - 5} more
                  </p>
                )}
                <Link to="/app/finance/transactions">
                  <div className="mt-2 text-center text-sm text-amber-600 hover:text-amber-700 font-medium cursor-pointer">
                    {t('Review all')} →
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts + Petty Cash + Monthly Finance */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bank Accounts */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
                {t('Bank Accounts')}
              </span>
              <Link to="/app/finance/bank-accounts" className="text-sm text-indigo-600 hover:underline font-normal">
                {t('Manage')} →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bankAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <CreditCard className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">{t('No bank accounts')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bankAccounts.slice(0, 4).map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{acc.bank_name}</p>
                      <p className="text-xs text-gray-500">{acc.account_name}</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-700">{fmt(acc.current_balance)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t text-sm font-bold">
                  <span className="text-gray-600">{t('Total')}</span>
                  <span className="text-indigo-700">{fmt(totalBankBalance)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Petty Cash */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-yellow-600" />
                {t('Petty Cash')}
              </span>
              <Link to="/app/finance/petty-cash" className="text-sm text-yellow-600 hover:underline font-normal">
                {t('Manage')} →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('Current Balance')}</p>
                <p className="text-2xl font-bold text-yellow-700 mt-1">
                  {fmt(pettyCashSummary?.balance || pettyCashSummary?.current_balance)}
                </p>
              </div>
              {pettyCashSummary && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{t('Total In')}</p>
                    <p className="text-base font-bold text-green-700">{fmt(pettyCashSummary.total_in || pettyCashSummary.total_replenishments)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{t('Total Out')}</p>
                    <p className="text-base font-bold text-red-700">{fmt(pettyCashSummary.total_out || pettyCashSummary.total_expenses)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-600" />
              {t('This Month')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">{t('Income')}</span>
                </div>
                <span className="font-bold text-green-700">{fmt(financeDash?.monthlyIncome)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center">
                  <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm text-gray-700">{t('Expenses')}</span>
                </div>
                <span className="font-bold text-red-700">{fmt(financeDash?.monthlyExpenses)}</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl ${(financeDash?.cashFlow || 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <div className="flex items-center">
                  <Wallet className={`h-5 w-5 mr-2 ${(financeDash?.cashFlow || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  <span className="text-sm text-gray-700">{t('Cash Flow')}</span>
                </div>
                <span className={`font-bold ${(financeDash?.cashFlow || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {fmt(financeDash?.cashFlow)}
                </span>
              </div>
              {(financeDash?.pendingApprovals || 0) > 0 && (
                <div className="flex items-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                  <span className="text-sm text-amber-800 font-medium">
                    {financeDash.pendingApprovals} {t('expense(s) pending approval')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{t('Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: t('Record Income'), href: '/app/finance/transactions?type=income', icon: TrendingUp, color: 'bg-green-100 text-green-700' },
              { label: t('Record Expense'), href: '/app/finance/transactions?type=expense', icon: TrendingDown, color: 'bg-red-100 text-red-700' },
              { label: t('Fee Management'), href: '/app/fee', icon: Receipt, color: 'bg-amber-100 text-amber-700' },
              { label: t('Fee Structure'), href: '/app/fee-structure', icon: FileText, color: 'bg-orange-100 text-orange-700' },
              { label: t('Bank Accounts'), href: '/app/finance/bank-accounts', icon: CreditCard, color: 'bg-indigo-100 text-indigo-700' },
              { label: t('Petty Cash'), href: '/app/finance/petty-cash', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700' },
              { label: t('Reports'), href: '/app/finance/reports', icon: BarChart2, color: 'bg-purple-100 text-purple-700' },
              { label: t('Vendors & POs'), href: '/app/finance/vendors', icon: Building2, color: 'bg-blue-100 text-blue-700' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.color} hover:opacity-80 transition-opacity text-center`}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Manual */}
      <UserManualCard />
    </div>
  );
}
