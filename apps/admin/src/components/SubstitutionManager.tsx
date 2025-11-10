import React from 'react'';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@school/shared-ui';
import { Users, AlertCircle } from 'lucide-react';

export default function SubstitutionManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={20} />
          Substitute Teacher Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Substitution management will appear here</p>
          <Button className="mt-4">Find Substitute</Button>
        </div>
      </CardContent>
    </Card>
  );
}
