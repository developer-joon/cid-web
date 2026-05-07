import type { CiDetail } from '@/lib/api/schemas';
import { UnsupportedTypeCard } from './unsupported-type-card';

export interface CiDataCardProps {
  ci: CiDetail;
  rack?: unknown;
  vendor?: unknown;
}

/** Dispatch by ciTpCd. SERVER wiring lands in Task 16. */
export function CiDataCard({ ci }: CiDataCardProps) {
  return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
}
