/**
 * Minimal Sentry capture for Cloudflare/Astro server (no full SDK).
 * Set SENTRY_DSN to enable; no-op when missing. Best-effort: never throws.
 */

type CaptureOpts = {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: 'error' | 'warning' | 'info';
};

function parseDsn(dsn: string): {
    publicKey: string;
    host: string;
    projectId: string;
} | null {
    try {
        const u = new URL(dsn);
        const publicKey = u.username;
        const projectId = u.pathname.replace(/^\//, '').split('/')[0];
        if (!publicKey || !projectId) return null;
        return { publicKey, host: u.host, projectId };
    } catch {
        return null;
    }
}

export async function captureServerException(
    err: unknown,
    dsn: string | undefined,
    opts: CaptureOpts = {},
): Promise<void> {
    if (!dsn) return;
    try {
        const parsed = parseDsn(dsn);
        if (!parsed) {
            console.error('[sentry] invalid SENTRY_DSN');
            return;
        }

        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        const eventId = crypto.randomUUID().replace(/-/g, '');
        const event = {
            event_id: eventId,
            timestamp: Date.now() / 1000,
            platform: 'javascript',
            level: opts.level ?? 'error',
            server_name: 'fc-landing',
            environment: 'production',
            tags: { runtime: 'cloudflare-pages', ...opts.tags },
            extra: opts.extra,
            exception: {
                values: [
                    {
                        type: err instanceof Error ? err.name : 'Error',
                        value: message,
                        stacktrace: stack
                            ? {
                                  frames: stack
                                      .split('\n')
                                      .slice(1, 12)
                                      .map((line) => ({ filename: line.trim(), function: '?' })),
                              }
                            : undefined,
                    },
                ],
            },
        };

        const url = `https://${parsed.host}/api/${parsed.projectId}/store/`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=fc-landing/1.0`,
            },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) {
            console.error('[sentry] send failed', res.status);
        }
    } catch (sendErr) {
        console.error('[sentry] send failed', sendErr);
    }
}
