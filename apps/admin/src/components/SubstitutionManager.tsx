import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@school/shared-ui';
import { Users } from 'lucide-react';

export const SubstitutionManager: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Substitute Teachers</CardTitle>
      </CardHeader>
      <CardContent>
        <Users />
        <Button>Find Substitute</Button>
      </CardContent>
    </Card>
  );
};
