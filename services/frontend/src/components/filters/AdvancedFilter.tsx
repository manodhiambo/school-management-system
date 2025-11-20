import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

interface FilterConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  filters: FilterConfig[];
  onApply: (filters: Record<string, string>) => void;
  onReset: () => void;
}

export function AdvancedFilter({ filters, onApply, onReset }: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(values);
    setIsOpen(false);
  };

  const handleReset = () => {
    setValues({});
    onReset();
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)}>
        <Filter className="mr-2 h-4 w-4" />
        Advanced Filters
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filter Options</h3>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.field}>
                <Label htmlFor={filter.field}>{filter.label}</Label>
                {filter.type === 'text' && (
                  <Input
                    id={filter.field}
                    value={values[filter.field] || ''}
                    onChange={(e) => handleChange(filter.field, e.target.value)}
                  />
                )}
                {filter.type === 'select' && filter.options && (
                  <Select
                    id={filter.field}
                    value={values[filter.field] || ''}
                    onChange={(e) => handleChange(filter.field, e.target.value)}
                  >
                    <option value="">All</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
                {filter.type === 'date' && (
                  <Input
                    id={filter.field}
                    type="date"
                    value={values[filter.field] || ''}
                    onChange={(e) => handleChange(filter.field, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex space-x-2 mt-4">
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
