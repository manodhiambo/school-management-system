import * as React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const icon = {
    success: <CheckCircle className="text-green-500" />,
    error: <AlertCircle className="text-red-500" />,
    info: <AlertCircle className="text-blue-500" />,
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-lg shadow-lg bg-white min-w-[300px]',
      'border-l-4',
      type === 'success' && 'border-green-500',
      type === 'error' && 'border-red-500',
      type === 'info' && 'border-blue-500'
    )}>
      {icon[type]}
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
        <X size={16} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: number }>>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message, onClose: () => removeToast(id) }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );

  return { addToast, ToastContainer };
};
