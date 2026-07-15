import { clsx } from "@/shared/lib/format";

export function Panel({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "border border-[var(--border)] bg-[var(--panel)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-[var(--faint)]">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={clsx("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "good";
}) {
  const TONE_TEXT: Record<"default" | "accent" | "warn" | "good", string> = {
    default: "text-[var(--fg)]",
    accent: "text-[var(--accent)]",
    warn: "text-[var(--warn)]",
    good: "text-[var(--good)]",
  };
  const valueColor = TONE_TEXT[tone];

  return (
    <div className="border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </div>
      <div
        className={clsx(
          "mt-1 font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums",
          valueColor,
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] text-[var(--faint)]">{hint}</div>
      )}
    </div>
  );
}

export function StatusDot({
  tone = "good",
}: {
  tone?: "good" | "warn" | "bad" | "idle";
}) {
  const TONE_BG: Record<"good" | "warn" | "bad" | "idle", string> = {
    good: "bg-[var(--good)]",
    warn: "bg-[var(--warn)]",
    bad: "bg-[var(--bad)]",
    idle: "bg-[var(--faint)]",
  };
  const color = TONE_BG[tone];
  return (
    <span
      className={clsx("inline-block h-1.5 w-1.5 rounded-full", color)}
      aria-hidden
    />
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "good" | "warn" | "accent";
}) {
  const TONE_BADGE: Record<"default" | "good" | "warn" | "accent", string> = {
    default: "border-[var(--border)] text-[var(--muted)]",
    good: "border-[var(--good)]/40 text-[var(--good)]",
    warn: "border-[var(--warn)]/40 text-[var(--warn)]",
    accent: "border-[var(--accent)]/40 text-[var(--accent)]",
  };
  const styles = TONE_BADGE[tone];
  return (
    <span
      className={clsx(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        styles,
      )}
    >
      {children}
    </span>
  );
}
