'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AppShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
}

interface AppShellProps {
  brandIcon: LucideIcon;
  brandLabel: string;
  brandSublabel?: string;
  navItems: AppShellNavItem[];
  userName: string;
  onLogout: () => void;
  children: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell({
  brandIcon: BrandIcon,
  brandLabel,
  brandSublabel,
  navItems,
  userName,
  onLogout,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-muted/25">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border/70 bg-card px-3.5 py-5">
        <div className="flex items-center gap-2.5 px-1.5 pb-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BrandIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-base tracking-tight">{brandLabel}</p>
            {brandSublabel && (
              <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                {brandSublabel}
              </p>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden="true"
                />
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground',
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <Badge variant="primary" className="h-5 min-w-5 justify-center px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/40 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(userName)}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{userName}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
