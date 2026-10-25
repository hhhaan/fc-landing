export const CONNECTION_COOKIE = 'fc_mcp_connections_csrf';
type Grant = {
    id: string;
    client_name: string;
    workspace_name: string;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
};
type ConnectionAuth = {
    getUser(): Promise<{ data: { user: { id: string; is_anonymous?: boolean } | null }; error: unknown }>;
    getGrants(): Promise<{ data: unknown; error: unknown }>;
    revokeGrant(id: string): Promise<{ data: unknown; error: unknown }>;
};
type State =
    | { kind: 'login'; location: string }
    | { kind: 'unavailable'; status: number }
    | { kind: 'redirect'; location: string }
    | { kind: 'list'; grants: Grant[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleMcpConnections(
    request: Request,
    auth: ConnectionAuth,
    enabled: boolean,
    csrfCookie?: string,
    form?: FormData,
): Promise<State> {
    if (!enabled) return { kind: 'unavailable', status: 503 };
    if (!['GET', 'POST'].includes(request.method)) return { kind: 'unavailable', status: 405 };
    if (
        request.method === 'POST' &&
        (request.headers.get('Origin') !== new URL(request.url).origin ||
            !csrfCookie ||
            form?.get('csrf') !== csrfCookie ||
            typeof form?.get('grant_id') !== 'string' ||
            !uuid.test(String(form.get('grant_id'))))
    )
        return { kind: 'unavailable', status: 403 };
    try {
        const identity = await auth.getUser();
        if (identity.error || !identity.data.user || identity.data.user.is_anonymous)
            return { kind: 'login', location: '/login?next=%2Faccount%2Fconnections' };
        if (request.method === 'POST') {
            const result = await auth.revokeGrant(String(form?.get('grant_id')));
            if (result.error) return { kind: 'unavailable', status: 503 };
            return { kind: 'redirect', location: '/account/connections' };
        }
        const result = await auth.getGrants();
        if (
            result.error ||
            !result.data ||
            typeof result.data !== 'object' ||
            !('grants' in result.data) ||
            !Array.isArray(result.data.grants)
        )
            return { kind: 'unavailable', status: 503 };
        const grants = result.data.grants as Grant[];
        if (
            grants.length > 100 ||
            grants.some(
                (grant) =>
                    !grant ||
                    !uuid.test(grant.id) ||
                    typeof grant.client_name !== 'string' ||
                    typeof grant.workspace_name !== 'string' ||
                    !Number.isFinite(Date.parse(grant.created_at)) ||
                    !Number.isFinite(Date.parse(grant.expires_at)) ||
                    (grant.revoked_at !== null && !Number.isFinite(Date.parse(grant.revoked_at))),
            )
        )
            return { kind: 'unavailable', status: 503 };
        return { kind: 'list', grants };
    } catch {
        return { kind: 'unavailable', status: 503 };
    }
}
