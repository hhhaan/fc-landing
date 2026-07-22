/**
 * Slack incoming webhook helper (server-only).
 * Pass SLACK_WEBHOOK_URL from env at call site.
 */

export type SlackPayload = {
    text: string;
    blocks?: unknown[];
};

export async function postSlack(webhookUrl: string | undefined, payload: SlackPayload): Promise<boolean> {
    if (!webhookUrl) {
        return false;
    }

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            console.error('[slack] webhook failed', res.status);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[slack] request failed', err);
        return false;
    }
}

/** Strip CR/LF/backticks so user-controlled fields can't inject Slack markdown. */
export function sanitizeSlackField(s: string): string {
    return s.replace(/[\r\n`]/g, ' ').trim();
}
