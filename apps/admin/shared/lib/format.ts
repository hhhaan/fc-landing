import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { FALLBACK_CURRENCY } from "@/shared/lib/pricing";

export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtMoney(
  n: number | null | undefined,
  currency: string,
  opts?: { compact?: boolean; digits?: number },
): string {
  if (n == null || Number.isNaN(n)) return "—";
  const c = currency.toUpperCase();
  const zeroDec = c === "KRW" || c === "JPY";
  const digits = opts?.digits ?? (zeroDec ? 0 : 2);
  if (opts?.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtMrrBuckets(
  buckets: Array<{ currency: string; mrr: number }>,
  opts?: { compact?: boolean },
): string {
  if (!buckets.length) return fmtMoney(0, FALLBACK_CURRENCY, opts);
  return buckets
    .map((b) => fmtMoney(b.mrr, b.currency, opts))
    .join(" · ");
}

export function fmtUsd(
  n: number | null | undefined,
  opts?: { compact?: boolean; digits?: number },
): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (opts?.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.digits ?? 0,
    maximumFractionDigits: opts?.digits ?? 0,
  }).format(n);
}

export function fmtPct(
  n: number | null | undefined,
  opts?: { digits?: number },
): string {
  if (n == null || Number.isNaN(n)) return "—";
  const d = opts?.digits ?? 1;
  return `${(Math.round(n * 10 ** d) / 10 ** d).toFixed(d)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    // date-fns format() has no timeZone option; format as UTC via Intl
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(parseISO(iso))
      .replace(", ", " ");
  } catch {
    return iso;
  }
}

export function fmtRel(iso: string | null | undefined): string {
  if (!iso) return "never";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
