import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode }> = ({ 
  defaultValue, 
  children 
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      {children}
    </TabsContext.Provider>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value: triggerValue, 
  children, 
  onClick 
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');
  
  const { value, setValue } = context;
  
  return (
    <button
      onClick={() => {
        setValue(triggerValue);
        onClick?.();
      }}
      className={value === triggerValue ? 'tab-trigger active' : 'tab-trigger'}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode }> = ({ 
  value: contentValue, 
  children 
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');
  
  const { value } = context;
  
  return value === contentValue ? <div className="tab-content">{children}</div> : null;
};
