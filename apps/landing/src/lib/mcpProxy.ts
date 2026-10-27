const MAX_BODY_BYTES = 65536;
const PUBLIC_SUFFIXES = new Set(['', '.well-known/oauth-protected-resource']);

function backendUrl(project: string, suffix: string) {
    const base = new URL(project);
    if (
        base.protocol !== 'https:' ||
        base.username ||
        base.password ||
        base.search ||
        base.hash ||
        base.pathname !== '/'
    ) {
        throw new Error('Invalid identity backend');
    }
    const path = suffix ? `/functions/v1/firstcrack-mcp/${suffix}` : '/functions/v1/firstcrack-mcp';
    return new URL(path, base);
}

async function limitedBody(request: Request) {
    const reader = request.body?.getReader();
    if (!reader) return undefined;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.byteLength;
            if (size > MAX_BODY_BYTES) {
                await reader.cancel();
                throw new Error('MCP request exceeds limit');
            }
            chunks.push(part.value);
        }
    } finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return bytes;
}

/** Public MCP host. Session cookies stay on the landing origin. */
export async function proxyMcpRequest(
    request: Request,
    suffix: string,
    config: { enabled: boolean; project: string },
    fetcher: typeof fetch = fetch,
): Promise<Response> {
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const failure = (status = 503) => Response.json({ error: 'temporarily_unavailable' }, { status, headers });
    if (!config.enabled || !PUBLIC_SUFFIXES.has(suffix)) return failure(config.enabled ? 404 : 503);
    if (!['GET', 'POST', 'OPTIONS'].includes(request.method)) {
        headers.set('Allow', 'GET, POST, OPTIONS');
        return failure(405);
    }
    try {
        const target = backendUrl(config.project, suffix);
        const forwarded = new Headers();
        for (const name of ['authorization', 'content-type', 'accept', 'mcp-protocol-version', 'origin']) {
            const value = request.headers.get(name);
            if (value) forwarded.set(name, value);
        }
        const response = await fetcher(target, {
            method: request.method,
            redirect: 'manual',
            headers: forwarded,
            body: request.method === 'POST' ? await limitedBody(request) : undefined,
        });
        if (response.status >= 300 && response.status < 400) return failure();
        for (const name of [
            'content-type',
            'www-authenticate',
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers',
            'access-control-expose-headers',
            'allow',
        ]) {
            const value = response.headers.get(name);
            if (value) headers.set(name, value);
        }
        return new Response(response.body, { status: response.status, headers });
    } catch {
        return failure();
    }
}
