import { useAuthStore } from '@/store/authStore';
import { AdminDashboard } from './AdminDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDashboard } from './StudentDashboard';
import { ParentDashboard } from './ParentDashboard';
import { FinanceOfficerDashboard } from './FinanceOfficerDashboard';
import { DriverDashboard } from '../driver/DriverDashboard';
import { SecurityDashboard } from '../gate/SecurityDashboard';
import { TechnicianDashboard } from '../maintenance/TechnicianDashboard';

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
    case 'driver':
      return <DriverDashboard />;
    case 'security':
      return <SecurityDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    default:
      return <StudentDashboard />;
  }
}
