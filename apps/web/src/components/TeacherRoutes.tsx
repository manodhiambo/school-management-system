import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const TeacherRoutes: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname.replace('/teacher', '');
  
  return (
    <div style={{ padding: '50px' }}>
      <h1>👩‍🏫 Teacher Dashboard</h1>
      <p>Welcome Teacher! Access your classes and academic tools.</p>
      
      <nav style={{ marginTop: '20px', marginBottom: '30px' }}>
        <Link to="/teacher/classes" style={{ marginRight: '15px', padding: '10px', background: '#ffc107', color: 'black', textDecoration: 'none', borderRadius: '4px' }}>My Classes</Link>
        <Link to="/teacher/students" style={{ padding: '10px', background: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>My Students</Link>
      </nav>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        {currentPath === '/' && (
          <>
            <h2>Teacher Portal</h2>
            <p>Your personalized teaching dashboard.</p>
          </>
        )}
        {currentPath === '/classes' && (
          <>
            <h2>My Classes</h2>
            <p>View and manage your assigned classes and sections.</p>
          </>
        )}
        {currentPath === '/students' && (
          <>
            <h2>My Students</h2>
            <p>View your students and their academic records.</p>
          </>
        )}
      </div>
    </div>
  );
};
