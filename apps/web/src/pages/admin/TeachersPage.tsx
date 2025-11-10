import React from 'react';
import { Layout } from '../../components/Layout';

export const TeachersPage: React.FC = () => (
  <Layout>
    <div style={{ padding: '30px' }}>
      <h1>👨‍🏫 Teacher Management</h1>
      <p>Manage staff, schedules, payroll, attendance.</p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Available Actions:</h3>
        <ul>
          <li>View all teachers</li>
          <li>Add/edit teacher records</li>
          <li>Manage teacher schedules</li>
          <li>Track attendance</li>
          <li>Process payroll</li>
        </ul>
      </div>
    </div>
  </Layout>
);
