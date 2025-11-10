import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ FIX: Add this line
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    ...(user?.role === 'admin' ? [
      { path: '/admin/students', label: 'Students', icon: '🎓' },
      { path: '/admin/teachers', label: 'Teachers', icon: '👨‍🏫' },
      { path: '/admin/finance', label: 'Finance', icon: '💰' },
      { path: '/admin/attendance', label: 'Attendance', icon: '📅' },
      { path: '/admin/timetable', label: 'Timetable', icon: '🗓️' },
      { path: '/admin/messages', label: 'Messages', icon: '💬' },
      { path: '/admin/reports', label: 'Reports', icon: '📈' },
      { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
    ] : []),
    ...(user?.role === 'teacher' ? [
      { path: '/teacher/attendance', label: 'Mark Attendance', icon: '✅' },
      { path: '/teacher/grades', label: 'Enter Grades', icon: '📝' },
      { path: '/teacher/classes', label: 'My Classes', icon: '📚' },
      { path: '/teacher/students', label: 'My Students', icon: '👥' },
      { path: '/teacher/schedule', label: 'My Schedule', icon: '🕐' },
    ] : []),
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: sidebarOpen ? '250px' : '60px', 
        background: '#2c3e50', 
        color: 'white', 
        transition: 'width 0.3s',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', background: '#1a252f', textAlign: sidebarOpen ? 'left' : 'center' }}>
          <h3 style={{ margin: 0 }}>{sidebarOpen ? 'School System' : '🏫'}</h3>
        </div>
        
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            textAlign: sidebarOpen ? 'right' : 'center'
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        <nav style={{ marginTop: '20px' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              style={{ 
                display: 'block', 
                padding: '12px 20px', 
                color: 'white', 
                textDecoration: 'none', 
                borderLeft: location.pathname === item.path ? '3px solid #3498db' : 'none',
                background: location.pathname === item.path ? '#34495e' : 'transparent'
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {sidebarOpen && <span style={{ marginLeft: '10px' }}>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ 
          height: '60px', 
          background: 'white', 
          borderBottom: '1px solid #ddd', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 30px'
        }}>
          <div>
            <h3 style={{ margin: 0 }}>Welcome, {user?.firstName || 'User'}</h3>
            <small style={{ color: '#666' }}>Role: <strong>{user?.role}</strong></small>
          </div>
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: '8px 16px', 
              background: '#e74c3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '30px', overflowY: 'auto', background: '#f8f9fa' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
