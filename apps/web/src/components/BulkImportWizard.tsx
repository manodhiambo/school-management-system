import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@school/shared-ui';

interface BulkImportWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BulkImportWizard({ onSuccess, onCancel }: BulkImportWizardProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'import'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const uploadMutation = useMutation(
    async (formData: FormData) => {
      const response = await apiClient.request({
        url: '/api/v1/students/bulk-import',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        addToast('success', 'Students imported successfully');
        onSuccess();
      },
      onError: (error: any) => {
        addToast('error', error.response?.data?.message || 'Import failed');
      },
    }
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      addToast('error', 'Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preview', 'true');

      const response = await apiClient.request({
        url: '/api/v1/students/bulk-import-preview',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreviewData(response.data.validRows || []);
      setErrors(response.data.errors || []);
      setStep('preview');
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Preview failed');
    }
  };

  const handleImport = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csvContent = [
      'admissionNumber,firstName,lastName,dateOfBirth,gender,classId,sectionId,parentId',
      'ADM001,John,Doe,2010-05-15,male,CLASS001,SEC001,PARENT001',
      'ADM002,Jane,Smith,2011-03-22,female,CLASS001,SEC001,PARENT002',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-4">
                Drop your CSV or Excel file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Choose File
              </label>
              {file && (
                <p className="mt-4 text-sm text-gray-500">{file.name}</p>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Supported formats: CSV, Excel (.xlsx, .xls). Max file size: 10MB
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <a
                href="#"
                onClick={downloadTemplate}
                className="text-primary-600 hover:underline"
              >
                Download template file
              </a>
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handlePreview} disabled={!file}>
            Preview
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Preview Data</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <span className="font-medium text-red-700">Errors Found</span>
                </div>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Admission No</th>
                    <th className="px-4 py-2 text-left">First Name</th>
                    <th className="px-4 py-2 text-left">Last Name</th>
                    <th className="px-4 py-2 text-left">Class</th>
                    <th className="px-4 py-2 text-left">Parent ID</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{row.admissionNumber}</td>
                      <td className="px-4 py-2">{row.firstName}</td>
                      <td className="px-4 py-2">{row.lastName}</td>
                      <td className="px-4 py-2">{row.classId}</td>
                      <td className="px-4 py-2">{row.parentId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing 10 of {previewData.length} rows. All rows will be imported.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={uploadMutation.isLoading || previewData.length === 0}>
            {uploadMutation.isLoading ? 'Importing...' : 'Import Data'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
