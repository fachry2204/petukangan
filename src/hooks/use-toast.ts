import { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<any[]>([]);

  const toast = ({ title, description, variant }: any) => {
    console.log(`Toast: ${title} - ${description} (${variant})`);
    // Simple alert for now, can be improved with sonner
    alert(`${title}\n${description}`);
  };

  return { toast, toasts };
}
