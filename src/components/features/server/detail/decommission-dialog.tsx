'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDecommissionServer } from '@/components/features/server/forms/hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

interface Props {
  ciId: number;
  ciNm: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DecommissionDialog({ ciId, ciNm, open, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const decommission = useDecommissionServer(ciId);

  async function handleConfirm() {
    if (reason.trim().length < 5) {
      toast.error('변경 사유를 5자 이상 입력해주세요.');
      return;
    }
    try {
      await decommission.mutateAsync({ reason: reason.trim() });
      toast.success('폐기되었습니다.');
      onOpenChange(false);
      setReason('');
    } catch (err) {
      const t = formatErrorForToast(err);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>서버 폐기 — {ciNm}</DialogTitle>
          <DialogDescription>
            이 작업은 비가역입니다. 폐기 후에는 다시 활성화할 수 없으며 관계는 자동으로 정리되지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decom-reason">변경 사유 (필수, 5자 이상)</Label>
          <Input
            id="decom-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 노후화, 신규 서버로 교체"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={decommission.isPending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={decommission.isPending}>
            {decommission.isPending ? '처리 중…' : '폐기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
