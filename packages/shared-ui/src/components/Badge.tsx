import React from 'react';
import { cn } from '../utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
