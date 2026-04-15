import { useAuthStore } from '@/store/authStore';
import { AdminDashboard } from './AdminDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDashboard } from './StudentDashboard';
import { ParentDashboard } from './ParentDashboard';
import { FinanceOfficerDashboard } from './FinanceOfficerDashboard';

export function DashboardPage() {
  const { user } = useAuthStore();

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'finance_officer':
      return <FinanceOfficerDashboard />;
    default:
      return <StudentDashboard />;
  }
}
