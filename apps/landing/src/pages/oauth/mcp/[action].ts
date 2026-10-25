import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { MCP_OAUTH_ENABLED, MCP_OAUTH_ISSUER_URL, MCP_OAUTH_READONLY_READY } from 'astro:env/server';
import type { APIRoute } from 'astro';
import { proxyIssuerRequest } from '../../../lib/mcpIssuer';

export const ALL: APIRoute = ({ request, params }) =>
    proxyIssuerRequest(request, params.action ?? '', {
        enabled: MCP_OAUTH_ENABLED === 'true' && MCP_OAUTH_READONLY_READY === 'true',
        issuer: MCP_OAUTH_ISSUER_URL ?? '',
        project: PUBLIC_SUPABASE_URL,
    });
