import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Database, CheckCircle2, AlertCircle, Download, FileJson, FileSpreadsheet,
  ExternalLink, RefreshCw, Settings, ShieldCheck,
} from 'lucide-react';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

type Tab = 'config' | 'validation' | 'export';

interface NemisConfig {
  school_code: string;
  county: string;
  sub_county: string;
  ward: string;
}

interface ValidationResult {
  total: number;
  complete: number;
  incomplete: number;
  students_with_issues: StudentIssue[];
}

interface StudentIssue {
  id: string;
  name: string;
  missing: string[];
}

const EMPTY_CONFIG: NemisConfig = {
  school_code: '',
  county: '',
  sub_county: '',
  ward: '',
};

export function NemisPage() {
  const [tab, setTab] = useState<Tab>('config');
  const navigate = useNavigate();

  // ---- Config state ----
  const [config, setConfig] = useState<NemisConfig>({ ...EMPTY_CONFIG });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---- Validation state ----
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [valLoading, setValLoading] = useState(false);
  const [valError, setValError] = useState<string | null>(null);

  // ---- Export state ----
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  useEffect(() => {
    (api as any).api.get('/nemis/config')
      .then((res: any) => {
        const d = res.data || res || {};
        setConfig({
          school_code: d.school_code || '',
          county: d.county || '',
          sub_county: d.sub_county || '',
          ward: d.ward || '',
        });
        if (d.last_export) setLastExport(d.last_export);
      })
      .catch(() => { /* silent */ })
      .finally(() => setConfigLoading(false));
  }, []);

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      await (api as any).api.put('/nemis/config', config);
      setConfigMsg({ type: 'success', text: 'Configuration saved successfully.' });
    } catch (e: any) {
      setConfigMsg({ type: 'error', text: e?.message || 'Failed to save configuration.' });
    } finally {
      setConfigSaving(false);
    }
  };

  const loadValidation = async () => {
    setValLoading(true);
    setValError(null);
    try {
      const res: any = await (api as any).api.get('/nemis/validate');
      const d = res?.data ?? res ?? null;
      if (d) {
        setValidation({
          ...d,
          students_with_issues: Array.isArray(d.students_with_issues) ? d.students_with_issues : [],
        });
      }
    } catch (e: any) {
      setValError(e?.message || 'Failed to load validation data.');
    } finally {
      setValLoading(false);
    }
  };

  const exportJSON = async () => {
    setExporting('json');
    try {
      const res: any = await (api as any).api.get('/nemis/export/students', { responseType: 'blob' });
      const blob = res instanceof Blob ? res : new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nemis-students-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setLastExport(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async () => {
    setExporting('csv');
    try {
      const res: any = await (api as any).api.get('/nemis/export/students/csv', { responseType: 'blob' });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nemis-students-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setLastExport(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'config',     label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
    { key: 'validation', label: 'Validation',    icon: <ShieldCheck className="h-4 w-4" /> },
    { key: 'export',     label: 'Export',        icon: <Download className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-indigo-600" /> NEMIS Integration
        </h2>
        <p className="text-gray-500 text-sm mt-1">National Education Management Information System — Kenya</p>
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === 'validation' && !validation) loadValidation();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ---- Configuration ---- */}
      {tab === 'config' && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">School NEMIS Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <div>
                  <Label>NEMIS School Code *</Label>
                  <Input
                    value={config.school_code}
                    onChange={(e) => setConfig((p) => ({ ...p, school_code: e.target.value }))}
                    placeholder="e.g. 12345678"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>County</Label>
                  <Input
                    value={config.county}
                    onChange={(e) => setConfig((p) => ({ ...p, county: e.target.value }))}
                    placeholder="e.g. Nairobi"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sub-County</Label>
                  <Input
                    value={config.sub_county}
                    onChange={(e) => setConfig((p) => ({ ...p, sub_county: e.target.value }))}
                    placeholder="e.g. Westlands"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Ward</Label>
                  <Input
                    value={config.ward}
                    onChange={(e) => setConfig((p) => ({ ...p, ward: e.target.value }))}
                    placeholder="e.g. Mountain View"
                    className="mt-1"
                  />
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                >
                  {configSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Validation ---- */}
      {tab === 'validation' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadValidation} disabled={valLoading} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${valLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {valError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{valError}</div>
          )}

          {valLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          )}

          {validation && !valLoading && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">{validation.total}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Students</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{validation.complete}</p>
                    <p className="text-sm text-gray-500 mt-1">Complete Records</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {validation.total > 0
                        ? `${Math.round((validation.complete / validation.total) * 100)}% complete`
                        : ''}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-700">{validation.incomplete}</p>
                    <p className="text-sm text-gray-500 mt-1">Records with Issues</p>
                  </CardContent>
                </Card>
              </div>

              {validation.students_with_issues.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-semibold">All records are complete!</p>
                    <p className="text-gray-500 text-sm mt-1">No issues found in NEMIS data.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> Students with Missing Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            {['Student', 'Missing Fields', 'Action'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {validation.students_with_issues.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(s.missing || []).map((f) => (
                                    <span key={f} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full capitalize">
                                      {f.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => navigate(`/app/students/${s.id}`)}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" /> Fix Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Export ---- */}
      {tab === 'export' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NEMIS Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                The NEMIS export contains structured student data required by the Kenya Ministry of Education.
                Fields included: Admission Number, Full Name, Date of Birth, Gender, Class, KCPE Index (where applicable),
                UPI Number, Nationality, Special Needs status, and Guardian information.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-indigo-600" /> JSON Format
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Structured JSON array. Use this for system-to-system integration with NEMIS API.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" /> CSV Format
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated file. Open in Excel or upload directly to the NEMIS portal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {lastExport && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Last export: {new Date(lastExport).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={exportJSON}
              disabled={!!exporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              {exporting === 'json'
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Exporting...</>
                : <><FileJson className="h-4 w-4" /> Export JSON</>}
            </Button>
            <Button
              onClick={exportCSV}
              disabled={!!exporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {exporting === 'csv'
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Exporting...</>
                : <><FileSpreadsheet className="h-4 w-4" /> Export CSV</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
