import React from 'react';
import { cn } from '../utils';

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    header: string;
    render?: (value: any, row: T) => React.ReactNode;
  }[];
  className?: string;
}

export function DataTable<T>({ data, columns, className }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm border-collapse", className)}>
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th key={String(column.key)} className="text-left p-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-3 text-center text-muted-foreground">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-muted/50">
                {columns.map((column) => (
                  <td key={String(column.key)} className="p-3">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
