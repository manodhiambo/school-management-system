import React, { createContext, useContext, useState } from 'react';
import { cn } from '../utils';

interface TabsContextType {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onChange, children }) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  const contextValue = {
    value: value || internalValue,
    onChange: onChange || setInternalValue,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs');
  }
  return context;
};

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn("flex space-x-1 border-b", className)} {...props}>
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { value: selectedValue, onChange } = useTabs();
  
  return (
    <button
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
        selectedValue === value
          ? "bg-background text-foreground border-b-2 border-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { value: selectedValue } = useTabs();
  
  if (selectedValue !== value) return null;
  
  return <div className="p-4">{children}</div>;
};
