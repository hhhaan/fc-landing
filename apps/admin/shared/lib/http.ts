/** Same-origin JSON helpers. Replaces axios. */

type Query = Record<string, string | number | boolean | undefined | null>;

function url(path: string, params?: Query): string {
    const p = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
    if (!params) return p;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') continue;
        qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `${p}?${s}` : p;
}

async function parse<T>(res: Response): Promise<T> {
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg =
            data &&
            typeof data === 'object' &&
            'error' in data &&
            typeof (data as { error: unknown }).error === 'string'
                ? (data as { error: string }).error
                : res.statusText || 'Request failed';
        throw new Error(msg);
    }
    return data as T;
}

export async function apiGet<T>(path: string, params?: Query): Promise<T> {
    return parse(await fetch(url(path, params), { credentials: 'same-origin' }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
    return parse(
        await fetch(url(path), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: body != null ? JSON.stringify(body) : undefined,
        }),
    );
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    return parse(
        await fetch(url(path), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: body != null ? JSON.stringify(body) : undefined,
        }),
    );
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
    return parse(
        await fetch(url(path), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
            body: body != null ? JSON.stringify(body) : undefined,
        }),
    );
}
