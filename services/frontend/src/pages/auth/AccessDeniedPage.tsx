import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface AccessDeniedPageProps {
  message?: string;
}

export function AccessDeniedPage({ message }: AccessDeniedPageProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const roleLabel: Record<string, string> = {
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
    finance_officer: 'Finance Officer',
    driver: 'Driver',
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-red-50 rounded-full p-5 mb-6">
        <ShieldOff className="w-14 h-14 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-1 max-w-md">
        {message || 'You do not have permission to view this page.'}
      </p>
      {user?.role && roleLabel[user.role] && (
        <p className="text-sm text-gray-400 mb-6">
          This section is not available to <span className="font-medium">{roleLabel[user.role]}</span> accounts.
        </p>
      )}
      <button
        onClick={() => navigate('/app/dashboard')}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
    </div>
  );
}
