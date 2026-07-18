'use client';

import {
    Activity,
    Building2,
    ClipboardList,
    DollarSign,
    Globe2,
    LayoutDashboard,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    RefreshCw,
    Server,
    Ticket,
    Users,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from '@/shared/lib/format';
import { useShell } from '@/widgets/shell/DashboardShell';

const NAV = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/retention', label: 'Retention', icon: RefreshCw },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/organizations', label: 'Organizations', icon: Building2 },
    { href: '/compliance', label: 'Compliance', icon: ClipboardList },
    { href: '/coupons', label: 'Coupons', icon: Ticket },
    { href: '/activity', label: 'Activity', icon: Activity },
    { href: '/map', label: 'Map', icon: Globe2 },
    { href: '/system', label: 'Service Ops', icon: Server },
] as const;

export function Sidebar() {
    const pathname = usePathname();
    const { collapsed, toggle } = useShell();

    return (
        <aside
            className={clsx(
                'flex h-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width] duration-200 ease-out',
                collapsed ? 'w-[56px]' : 'w-[220px]',
            )}
        >
            <div
                className={clsx(
                    'flex h-12 shrink-0 items-center border-b border-[var(--border)]',
                    collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-3',
                )}
            >
                {!collapsed && (
                    <div className="min-w-0">
                        <div className="truncate font-mono text-[12px] font-semibold tracking-wide text-[var(--fg)]">
                            FIRST CRACK
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--faint)]">
                            Ops Console
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={toggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--panel)] hover:text-[var(--fg)]"
                >
                    {collapsed ? (
                        <PanelLeftOpen size={16} strokeWidth={1.75} />
                    ) : (
                        <PanelLeftClose size={16} strokeWidth={1.75} />
                    )}
                </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {!collapsed && (
                    <div className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--faint)]">
                        Navigate
                    </div>
                )}
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active =
                        href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={collapsed ? label : undefined}
                            className={clsx(
                                'flex items-center border font-mono text-[12px] transition-colors',
                                collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-1.5',
                                active
                                    ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                                    : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--panel)] hover:text-[var(--fg)]',
                            )}
                        >
                            <Icon size={14} strokeWidth={1.75} className="shrink-0" />
                            {!collapsed && <span className="truncate">{label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className={clsx('border-t border-[var(--border)]', collapsed ? 'p-2' : 'p-3')}>
                {!collapsed && (
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] text-[var(--faint)]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--good)]" />
                        PROD · {process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/([^.]+)\./)?.[1] ?? 'fc-admin'}
                    </div>
                )}
                <form action="/api/auth/logout" method="post">
                    <button
                        type="submit"
                        title={collapsed ? 'Sign out' : undefined}
                        className={clsx(
                            'flex w-full items-center justify-center border border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:border-[var(--bad)]/40 hover:text-[var(--bad)]',
                            collapsed ? 'px-0 py-2' : 'gap-1.5 px-2 py-1',
                        )}
                    >
                        <LogOut size={12} strokeWidth={1.75} />
                        {!collapsed && <span>Sign out</span>}
                    </button>
                </form>
            </div>
        </aside>
    );
}
