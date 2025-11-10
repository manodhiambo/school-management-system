import React from 'react';
import { Layout } from '../../components/Layout';

export const GradesPage: React.FC = () => (
  <Layout>
    <div style={{ padding: '30px' }}>
      <h1>📝 Enter Grades</h1>
      <p>Grade entry for exams and assessments.</p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Features:</h3>
        <ul>
          <li>Enter exam results</li>
          <li>Calculate grades</li>
          <li>Generate report cards</li>
          <li>Track performance</li>
        </ul>
      </div>
    </div>
  </Layout>
);
