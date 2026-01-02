import { useState } from 'react';
import { Download, FileText, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('income-statement');
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const reports = [
    {
      id: 'income-statement',
      name: 'Income Statement',
      description: 'Profit & Loss report showing income and expenses',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity summary',
      icon: FileText,
      color: 'green',
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Cash inflows and outflows',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      id: 'budget-variance',
      name: 'Budget vs Actual',
      description: 'Compare budgeted amounts with actual spending',
      icon: FileText,
      color: 'yellow',
    },
    {
      id: 'fee-collection',
      name: 'Fee Collection Report',
      description: 'Student fee payments and outstanding balances',
      icon: FileText,
      color: 'indigo',
    },
    {
      id: 'expense-summary',
      name: 'Expense Summary',
      description: 'Detailed breakdown of all expenses',
      icon: TrendingUp,
      color: 'red',
    },
  ];

  const handleGenerateReport = () => {
    console.log('Generating report:', { reportType, period, dateFrom, dateTo });
    alert('Report generation feature coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive financial reports</p>
        </div>
        <button 
          onClick={handleGenerateReport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Report Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setReportType(report.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                reportType === report.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`bg-${report.color}-100 p-3 rounded-full w-fit mb-3`}>
                <report.icon className={`h-6 w-6 text-${report.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
              <p className="text-sm text-gray-600">{report.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Report Parameters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">This Month's Summary</p>
                <p className="text-sm text-gray-600">Income, expenses, and profit for current month</p>
              </div>
            </div>
            <Download className="h-5 w-5 text-gray-400" />
          </button>

          <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Year-to-Date Report</p>
                <p className="text-sm text-gray-600">Complete financial summary for this year</p>
              </div>
            </div>
            <Download className="h-5 w-5 text-gray-400" />
          </button>

          <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Fee Collection Status</p>
                <p className="text-sm text-gray-600">Current term fee collection report</p>
              </div>
            </div>
            <Download className="h-5 w-5 text-gray-400" />
          </button>

          <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-yellow-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Outstanding Expenses</p>
                <p className="text-sm text-gray-600">Pending and unpaid expense items</p>
              </div>
            </div>
            <Download className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* KRA Compliance Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">KRA Tax Compliance</h3>
        <p className="text-green-800 mb-4">
          All reports include VAT calculations at 16% as per Kenya Revenue Authority requirements.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Current VAT Rate</p>
            <p className="text-2xl font-bold text-green-600">16%</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tax Period</p>
            <p className="text-lg font-semibold text-gray-900">Monthly</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Next Filing</p>
            <p className="text-lg font-semibold text-gray-900">20th of Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
