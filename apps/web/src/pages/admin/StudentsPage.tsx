import React from 'react';
import { Layout } from '../../components/Layout';

export const StudentsPage: React.FC = () => (
  <Layout>
    <div style={{ padding: '30px' }}>
      <h1>🎓 Student Management</h1>
      <p>Full CRUD operations, bulk import, promotions, documents.</p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Available Actions:</h3>
        <ul>
          <li>View all students with advanced filtering</li>
          <li>Add new student (with parent linkage)</li>
          <li>Bulk import via CSV/XLSX</li>
          <li>Generate student reports</li>
          <li>Manage student documents</li>
          <li>Promote students to next class</li>
        </ul>
      </div>
    </div>
  </Layout>
);
