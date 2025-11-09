import React from 'react';
// Note: cn and Button imports removed as they're not used

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onOpenChange, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6">
          {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
};
