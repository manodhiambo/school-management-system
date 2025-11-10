import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const AdminRoutes: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname.replace('/admin', '');
  
  return (
    <div style={{ padding: '50px' }}>
      <h1>🔐 Admin Dashboard</h1>
      <p>Welcome Administrator! You have full system access.</p>
      
      <nav style={{ marginTop: '20px', marginBottom: '30px' }}>
        <Link to="/admin/users" style={{ marginRight: '15px', padding: '10px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Manage Users</Link>
        <Link to="/admin/settings" style={{ padding: '10px', background: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>System Settings</Link>
      </nav>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        {currentPath === '/' && (
          <>
            <h2>Overview</h2>
            <p>Total control panel for school management system.</p>
          </>
        )}
        {currentPath === '/users' && (
          <>
            <h2>User Management</h2>
            <p>Create, edit, and manage all system users.</p>
          </>
        )}
        {currentPath === '/settings' && (
          <>
            <h2>System Settings</h2>
            <p>Configure school policies, academic sessions, and system preferences.</p>
          </>
        )}
      </div>
    </div>
  );
};
