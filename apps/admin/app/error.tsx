"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg,#07090b)] px-4 text-[var(--fg,#e8eaed)]">
      <div className="w-full max-w-md border border-[rgba(255,255,255,0.08)] bg-[#0e1114] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff6b6b]">
          Ops console error
        </div>
        <h1 className="mt-2 font-mono text-[15px] font-semibold">
          Something failed while loading
        </h1>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-[#8b929a]">
          {error.message || "Unknown error"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 border border-[rgba(129,251,165,0.4)] bg-[rgba(129,251,165,0.12)] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[#81fba5]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
