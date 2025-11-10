import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { DashboardStats } from '@school/shared-types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        console.log('Fetching stats from:', `${apiUrl}/api/v1/dashboard/stats`);
        
        const response = await fetch(`${apiUrl}/api/v1/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch stats');
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setError(`API Error: ${error.message}. Check backend console.`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <Layout>
      <div>
        {loading && <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px' }}>Loading dashboard...</div>}
        
        {error && (
          <div style={{ 
            color: '#856404', 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px' 
          }}>
            <strong>⚠️ API Error:</strong> {error}
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              <strong>Debug Info:</strong>
              <ul style={{ marginTop: '5px' }}>
                <li>Backend URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</li>
                <li>Token present: {localStorage.getItem('accessToken') ? 'Yes' : 'No'}</li>
                <li>Check browser DevTools Console for more details</li>
              </ul>
            </div>
          </div>
        )}
        
        {!loading && stats && (
          <>
            <h2 style={{ marginBottom: '30px' }}>System Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#666' }}>Total Students</h3>
                <p style={{ fontSize: '3em', margin: '10px 0', color: '#007bff', fontWeight: 'bold' }}>{stats.totalStudents}</p>
                <small style={{ color: '#999' }}>Active from database</small>
              </div>
              <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#666' }}>Total Teachers</h3>
                <p style={{ fontSize: '3em', margin: '10px 0', color: '#28a745', fontWeight: 'bold' }}>{stats.totalTeachers}</p>
                <small style={{ color: '#999' }}>Active from database</small>
              </div>
              <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#666' }}>Total Classes</h3>
                <p style={{ fontSize: '3em', margin: '10px 0', color: '#ffc107', fontWeight: 'bold' }}>{stats.totalClasses}</p>
                <small style={{ color: '#999' }}>From database</small>
              </div>
              <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#666' }}>New Messages</h3>
                <p style={{ fontSize: '3em', margin: '10px 0', color: '#dc3545', fontWeight: 'bold' }}>{stats.recentMessages}</p>
                <small style={{ color: '#999' }}>Unread messages for you</small>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>✅ API Connection Active</h2>
              <p style={{ color: '#666', marginTop: '10px' }}>Data is being fetched live from the backend database.</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
