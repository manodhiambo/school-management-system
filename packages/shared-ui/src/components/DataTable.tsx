import React from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  data: T[];
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
}: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {columns.map((col) => (
              <td key={`${idx}-${String(col.key)}`}>
                {col.render ? col.render(row[col.key], row) : row[col.key]?.toString() || '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
