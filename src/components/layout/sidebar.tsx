import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';

interface MenuItem {
  href: string;
  icon: string;
  label: string;
  disabled?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU: MenuGroup[] = [
  {
    title: '메인',
    items: [{ href: '/', icon: '📊', label: '대시보드' }],
  },
  {
    title: '인프라',
    items: [
      { href: '/servers', icon: '🖥️', label: '서버' },
      { href: '/ip', icon: '🌐', label: 'IP 관리', disabled: true },
      { href: '/subnet', icon: '📡', label: 'IP 대역' },
      { href: '/rack', icon: '🗄️', label: '렉 관리' },
      { href: '/location', icon: '📍', label: '위치' },
    ],
  },
  {
    title: '네트워크',
    items: [
      { href: '/domain', icon: '🔗', label: '도메인', disabled: true },
      { href: '/dns', icon: '📋', label: 'DNS', disabled: true },
    ],
  },
  {
    title: '자산',
    items: [
      { href: '/license', icon: '🔑', label: '라이센스', disabled: true },
      { href: '/vendor', icon: '🏢', label: '벤더' },
      { href: '/contact', icon: '👤', label: '담당자' },
    ],
  },
  {
    title: '시스템',
    items: [
      { href: '/dept', icon: '🏢', label: '부서' },
      { href: '/users', icon: '👥', label: '사용자', disabled: true },
      { href: '/settings', icon: '⚙️', label: '설정', disabled: true },
    ],
  },
];

interface SidebarProps {
  activePath: string;
}

export function Sidebar({ activePath }: SidebarProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'CMDB';
  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar text-sidebar-foreground overflow-y-auto">
      <div className="px-5 py-4 text-xl font-bold text-primary border-b border-sidebar-foreground/10">
        🔧 {appName}
      </div>
      {MENU.map((group) => (
        <div key={group.title} className="py-2">
          <div className="px-5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground/80">
            {group.title}
          </div>
          {group.items.map((item) => {
            const active = item.href === activePath;
            const baseClass = cn(
              'flex items-center gap-2 px-5 py-2.5 text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground',
              item.disabled && !active && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground/70',
            );
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={baseClass}
                  aria-disabled="true"
                  title="MVP 이후 제공"
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={baseClass}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
