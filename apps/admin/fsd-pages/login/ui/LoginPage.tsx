import { redirect } from "next/navigation";
import { isAuthenticated } from "@/shared/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await isAuthenticated()) redirect("/");

  const params = await searchParams;
  const error = params.error === "1";
  const next = params.next || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--faint)]">
            First Crack
          </div>
          <h1 className="mt-1 font-mono text-[15px] font-semibold tracking-wide text-[var(--fg)]">
            OPS CONSOLE ACCESS
          </h1>
        </div>
        <form action="/api/auth/login" method="post" className="space-y-3 p-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Operator password
            </span>
            <input
              type="password"
              name="password"
              autoFocus
              required
              className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)]/50"
            />
          </label>
          {error && (
            <p className="font-mono text-[11px] text-[var(--bad)]">
              Invalid credentials
            </p>
          )}
          <button
            type="submit"
            className="w-full border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--accent)] hover:bg-[var(--accent)]/25"
          >
            Authenticate
          </button>
        </form>
        <div className="border-t border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--faint)]">
          Service role · read-only · personal ops
        </div>
      </div>
    </div>
  );
}
