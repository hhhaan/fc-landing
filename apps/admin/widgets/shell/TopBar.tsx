"use client";

import { fmtDate } from "@/shared/lib/format";
import { StatusDot } from "@/shared/ui/Panel";

export function TopBar({
  title,
  subtitle,
  refreshedAt,
}: {
  title: string;
  subtitle?: string;
  refreshedAt?: string;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--sidebar)] px-3 sm:px-4">
      <div className="min-w-0">

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--fg)]">
              {title}
            </h1>
            <span className="hidden font-mono text-[10px] text-[var(--faint)] sm:inline">
              / first-crack
            </span>
          </div>
          {subtitle && (
            <p className="truncate text-[11px] text-[var(--muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--muted)]">
        <span className="hidden items-center gap-1.5 sm:flex">
          <StatusDot tone="good" />
          LIVE
        </span>
        {refreshedAt && (
          <span className="hidden tabular-nums text-[var(--faint)] md:inline">
            REF {fmtDate(refreshedAt)}
          </span>
        )}
      </div>
    </header>
  );
}
