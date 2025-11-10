import React from 'react';
import { Layout } from '../../components/Layout';

export const AttendancePage: React.FC = () => (
  <Layout>
    <div style={{ padding: '30px' }}>
      <h1>✅ Mark Attendance</h1>
      <p>Daily attendance marking with statistics.</p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Features:</h3>
        <ul>
          <li>Mark attendance for your classes</li>
          <li>View attendance statistics</li>
          <li>Generate reports</li>
          <li>Track patterns</li>
        </ul>
      </div>
    </div>
  </Layout>
);
