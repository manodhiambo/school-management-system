interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: Toast) => {
    const message = description || title || 'Action completed';
    if (variant === 'destructive') {
      alert(`Error: ${message}`);
    } else {
      alert(message);
    }
  };

  return { toast };
}
