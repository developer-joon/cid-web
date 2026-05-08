'use client';

import { HistoryTimeline } from '@/components/features/history/history-timeline';

export function HistoryTab({ ciId }: { ciId: number }) {
  return <HistoryTimeline ciId={ciId} />;
}
