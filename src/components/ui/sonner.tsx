'use client';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-background text-foreground border shadow-dropdown rounded',
          success: 'border-success/50',
          error: 'border-destructive/50',
        },
      }}
    />
  );
}
