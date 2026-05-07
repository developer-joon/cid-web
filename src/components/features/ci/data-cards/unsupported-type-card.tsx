import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UnsupportedTypeCard({ ciTpCd }: { ciTpCd: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">상세 카드 미지원 (ciTpCd: {ciTpCd})</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        이 CI 타입의 상세 카드는 다음 사이클에서 지원됩니다.
      </CardContent>
    </Card>
  );
}
