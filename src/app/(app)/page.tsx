import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMyProfile } from '@/lib/auth/me';

export const dynamic = 'force-dynamic';

const STATS = [
  { label: '🖥️ 전체 서버', value: '—', tone: 'text-primary' },
  { label: '✅ 온라인', value: '—', tone: 'text-success' },
  { label: '❌ 오프라인', value: '—', tone: 'text-destructive' },
  { label: '⚠️ 점검중', value: '—', tone: 'text-warning' },
];

export default async function DashboardPage() {
  const profile = await getMyProfile();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-background rounded p-5 shadow-card"
          >
            <div className="text-xs text-muted-foreground mb-2">{s.label}</div>
            <div className={`text-3xl font-bold ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>환영합니다</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">사용자: </span>
            <span className="font-medium">{profile?.name ?? '—'}</span>
            {profile?.uid ? (
              <span className="text-muted-foreground"> · {profile.uid}</span>
            ) : null}
          </p>
          {profile?.email ? (
            <p>
              <span className="text-muted-foreground">이메일: </span>
              <span>{profile.email}</span>
            </p>
          ) : null}
          {profile?.empNo ? (
            <p>
              <span className="text-muted-foreground">사번: </span>
              <span>{profile.empNo}</span>
            </p>
          ) : null}
          {profile?.roles?.length ? (
            <p>
              <span className="text-muted-foreground">권한: </span>
              <span>{profile.roles.join(', ')}</span>
            </p>
          ) : null}
          <p className="text-muted-foreground pt-2">
            대시보드 위젯은 다음 마일스톤에서 백엔드 데이터에 연동됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
