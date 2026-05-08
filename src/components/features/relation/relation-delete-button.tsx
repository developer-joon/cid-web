'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteRelation } from './hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

interface Props { ciId: number; relId: number; label: string }

export function RelationDeleteButton({ ciId, relId, label }: Props) {
  const [open, setOpen] = useState(false);
  const del = useDeleteRelation(ciId);

  async function handleConfirm() {
    try {
      await del.mutateAsync({ relId });
      toast.success('관계가 삭제되었습니다.');
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="관계 삭제">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!del.isPending) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관계 삭제</DialogTitle>
            <DialogDescription>
              {label} 관계를 삭제합니다. 이 작업은 hard delete이며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={del.isPending}>취소</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={del.isPending}>
              {del.isPending ? '처리 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
