import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proxyMcpRequest } from '../src/lib/mcpProxy.ts';

const project = 'https://native.example';
const config = { enabled: true, project };

test('public MCP proxy forwards the bearer and hides the session cookie', async () => {
    const request = new Request('https://firstcrackiscoming.com/mcp', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer fcmcp_at_fixture',
            Cookie: 'native-session=fixture',
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-06-18',
        },
        body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
    });
    const result = await proxyMcpRequest(request, '', config, async (url, init) => {
        assert.equal(url.href, `${project}/functions/v1/firstcrack-mcp`);
        const headers = new Headers(init.headers);
        assert.equal(headers.get('Authorization'), 'Bearer fcmcp_at_fixture');
        assert.equal(headers.has('Cookie'), false);
        assert.equal(init.redirect, 'manual');
        return new Response('{"jsonrpc":"2.0","id":1,"result":{}}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    });
    assert.equal(result.status, 200);
    assert.equal(await result.text(), '{"jsonrpc":"2.0","id":1,"result":{}}');
});

test('discovery is forwarded and a disabled proxy makes no request', async () => {
    const discovery = new Request('https://firstcrackiscoming.com/mcp/.well-known/oauth-protected-resource');
    const result = await proxyMcpRequest(discovery, '.well-known/oauth-protected-resource', config, async (url) => {
        assert.equal(url.href, `${project}/functions/v1/firstcrack-mcp/.well-known/oauth-protected-resource`);
        return Response.json({ resource: 'https://firstcrackiscoming.com/mcp' }, {
            headers: { 'WWW-Authenticate': 'Bearer realm="firstcrack"' },
        });
    });
    assert.equal(result.headers.get('WWW-Authenticate'), 'Bearer realm="firstcrack"');
    const noFetch = async () => {
        throw new Error('Must not call');
    };
    assert.equal((await proxyMcpRequest(discovery, '', { ...config, enabled: false }, noFetch)).status, 503);
    assert.equal((await proxyMcpRequest(discovery, '../oauth', config, noFetch)).status, 404);
});
