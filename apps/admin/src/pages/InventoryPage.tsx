import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@school/shared-ui';
import { DataTable } from '@school/shared-ui';

export const InventoryPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', category: '', quantity: '' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          placeholder="Name" 
          value={formData.name} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} 
        />
        <Button>Add Item</Button>
        <DataTable data={[]} columns={[]} />
      </CardContent>
    </Card>
  );
};
