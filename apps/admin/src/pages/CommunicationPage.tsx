import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const CommunicationPage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Communication content</p>
      </CardContent>
    </Card>
  );
};
