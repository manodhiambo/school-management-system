import { useQuery } from '@tanstack/react-query';
import { DataTable, Button } from '@school/shared-ui';

export const Inventory: React.FC = () => {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Promise.resolve({ data: [] }),
  });

  const columns = [
    { key: 'name', header: 'Asset Name' },
    { key: 'category', header: 'Category' },
    { key: 'quantity', header: 'Quantity' },
  ];

  if (isLoading) return <div>Loading inventory...</div>;

  return (
    <div>
      <h1>Inventory Management</h1>
      <DataTable columns={columns} data={assets?.data || []} />
      <Button>Add Asset</Button>
    </div>
  );
};
