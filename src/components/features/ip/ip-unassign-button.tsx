'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useUnassignIp } from './hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

interface Props { ipId: number; ipAddr: string; ciId: number }

export function IpUnassignButton({ ipId, ipAddr, ciId }: Props) {
  const [open, setOpen] = useState(false);
  const unassign = useUnassignIp(ipId, ciId);

  async function handleConfirm() {
    try {
      await unassign.mutateAsync({});
      toast.success('IP가 회수되었습니다.');
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive"
        onClick={() => setOpen(true)}
      >
        회수
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!unassign.isPending) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IP 회수 — {ipAddr}</DialogTitle>
            <DialogDescription>
              이 IP를 현재 CI에서 회수합니다. IP 자체는 보존되며, 다른 CI에 다시 할당할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={unassign.isPending}>취소</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={unassign.isPending}>
              {unassign.isPending ? '처리 중…' : '회수'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
