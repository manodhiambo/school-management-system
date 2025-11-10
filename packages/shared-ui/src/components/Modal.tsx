import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <button onClick={onClose} className="modal-close">
        <X className="h-4 w-4" />
      </button>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
};
