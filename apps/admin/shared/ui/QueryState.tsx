export function QueryLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 font-mono text-[12px] text-[var(--muted)]">
      {label}…
    </div>
  );
}

export function QueryError({
  message = "Failed to load",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 font-mono text-[12px] text-[var(--bad)]">
      {message}
    </div>
  );
}
