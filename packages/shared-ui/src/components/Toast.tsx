import React from 'react';
import { cn } from '../utils';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const baseClasses = "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5";

  const variants = {
    default: "border-l-4 border-blue-500",
    success: "border-l-4 border-green-500",
    warning: "border-l-4 border-yellow-500",
    error: "border-l-4 border-red-500",
  };

  return (
    <div className={cn(baseClasses, variants[toast.variant || 'default'])}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-1">
            {toast.title && <p className="text-sm font-medium text-gray-900">{toast.title}</p>}
            {toast.description && <p className="mt-1 text-sm text-gray-500">{toast.description}</p>}
          </div>
          <button
            className="ml-4 inline-flex text-gray-400 hover:text-gray-600"
            onClick={() => onDismiss(toast.id)}
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const toast = e.detail as Toast;
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    };
    window.addEventListener('show-toast' as any, handler);
    return () => window.removeEventListener('show-toast' as any, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      ))}
    </div>
  );
};

// --- Add useToast hook ---
export const useToast = () => {
  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const event = new CustomEvent('show-toast', { detail: { ...toast, id } });
    window.dispatchEvent(event);
  };
  return { showToast };
};
