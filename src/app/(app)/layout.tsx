import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getMyProfile } from '@/lib/auth/me';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect('/login');

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activePath="/" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header profile={profile} />
        <main className="flex-1 overflow-y-auto bg-muted p-6">{children}</main>
      </div>
    </div>
  );
}
