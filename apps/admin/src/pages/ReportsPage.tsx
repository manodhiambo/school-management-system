import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card } from '@school/shared-ui';
import { BarChart3 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <Tabs defaultValue="enrollment">
      <TabsList>
        <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
      </TabsList>
      <TabsContent value="enrollment">
        <Card>
          <BarChart3 />
        </Card>
      </TabsContent>
    </Tabs>
  );
};
