'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isPending?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
}

export function MasterFormDialog({ open, onOpenChange, title, description, isPending, onSubmit, submitLabel = '저장', children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>취소</Button>
          <Button onClick={onSubmit} disabled={isPending}>{isPending ? '저장 중…' : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
