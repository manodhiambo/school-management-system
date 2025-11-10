import React, { useState } from 'react';
import { cn } from '../utils/cn';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, ...props }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

export const TabsList: React.FC<TabsListProps> = ({ className, children, ...props }) => (
  <div className={cn('flex space-x-1 border-b', className)} {...props}>
    {children}
  </div>
);

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, activeTab, setActiveTab, className, children, ...props }) => (
  <button
    className={cn(
      'px-4 py-2 text-sm font-medium rounded-t-lg hover:bg-gray-100',
      activeTab === value ? 'bg-white border-t border-l border-r border-gray-300 -mb-px' : '',
      className
    )}
    onClick={() => setActiveTab?.(value)}
    {...props}
  >
    {children}
  </button>
);

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeTab?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, activeTab, className, children, ...props }) => {
  if (activeTab !== value) return null;
  
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  );
};
