import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMcpConnections } from '../src/lib/mcpConnections.ts';
import { issuerConsentClient, proxyIssuerRequest } from '../src/lib/mcpIssuer.ts';

const issuer = 'https://identity.example/oauth/mcp';
const project = 'https://native.example';
const config = { enabled: true, issuer, project };
const tokens = {
    access_token: `fcmcp_at_${'a'.repeat(43)}`,
    refresh_token: `fcmcp_rt_${'r'.repeat(43)}`,
    token_type: 'Bearer',
    expires_in: 300,
    scope: 'firstcrack:read',
};
const req = () =>
    new Request(`${issuer}/token`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer native-fixture',
            Cookie: 'native-session=fixture',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=refresh_token',
    });

test('public proxy strips native session proof and rejects native token responses', async () => {
    let calls = 0;
    const fetcher = async (url, init) => {
        calls++;
        assert.equal(url.href, `${project}/functions/v1/firstcrack-oauth/token`);
        assert.ok(!new Headers(init.headers).has('Authorization'));
        assert.ok(!new Headers(init.headers).has('Cookie'));
        assert.equal(init.redirect, 'manual');
        return Response.json(tokens);
    };
    const result = await proxyIssuerRequest(req(), 'token', config, fetcher);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await result.json(), tokens);
    assert.equal(calls, 1);
    for (const change of [
        { access_token: 'ey.native.jwt' },
        { refresh_token: 'native-refresh' },
        { scope: 'openid' },
        { expires_in: 3600 },
    ]) {
        const blocked = await proxyIssuerRequest(req(), 'token', config, async () =>
            Response.json({ ...tokens, ...change }),
        );
        assert.equal(blocked.status, 503);
        assert.ok(!(await blocked.text()).includes('ey.native.jwt'));
    }
});
test('disabled proxy makes no request; provider redirects and errors fail closed', async () => {
    const noFetch = async () => {
        throw new Error('Must not call');
    };
    assert.equal((await proxyIssuerRequest(req(), 'token', { ...config, enabled: false }, noFetch)).status, 503);
    const authorize = new Request(`${issuer}/authorize?client_id=fixture`);
    const badRedirect = async () =>
        new Response(null, { status: 303, headers: { Location: 'https://other.example/oauth/consent' } });
    assert.equal((await proxyIssuerRequest(authorize, 'authorize', config, badRedirect)).status, 503);
    assert.equal(
        (
            await proxyIssuerRequest(req(), 'token', config, async () => {
                throw new Error('private backend error');
            })
        ).status,
        503,
    );
});
test('internal native identity goes only to the fixed project and is not redirected', async () => {
    const native = {
        auth: {
            getUser: async () => ({ data: { user: { id: 'fixture' } }, error: null }),
            getSession: async () => ({ data: { session: { access_token: 'native-fixture' } }, error: null }),
        },
    };
    let calls = 0;
    const client = issuerConsentClient(native, project, async (url, init) => {
        calls++;
        assert.equal(url.origin, project);
        assert.equal(init.redirect, 'error');
        assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer native-fixture');
        return Response.json({ grants: [] });
    });
    await client.getGrants();
    assert.equal(calls, 1);
    await assert.rejects(() => issuerConsentClient(native, 'https://evil.example@native.example').getGrants());
});
test('grant UI requires login and CSRF; unavailable backend never becomes an empty list', async () => {
    const url = 'https://identity.example/account/connections';
    const id = '11111111-1111-4111-8111-111111111111';
    let revoked;
    const auth = {
        getUser: async () => ({ data: { user: { id } }, error: null }),
        getGrants: async () => ({ data: { grants: [] }, error: null }),
        revokeGrant: async (value) => {
            revoked = value;
            return { data: {}, error: null };
        },
    };
    assert.equal((await handleMcpConnections(new Request(url), auth, true)).kind, 'list');
    const form = new FormData();
    form.set('csrf', 'fixture');
    form.set('grant_id', id);
    const post = new Request(url, { method: 'POST', headers: { Origin: 'https://identity.example' } });
    assert.equal((await handleMcpConnections(post, auth, true, 'wrong', form)).status, 403);
    assert.equal(revoked, undefined);
    assert.equal((await handleMcpConnections(post, auth, true, 'fixture', form)).kind, 'redirect');
    assert.equal(revoked, id);
    assert.equal(
        (
            await handleMcpConnections(
                new Request(url),
                { ...auth, getUser: async () => ({ data: { user: null }, error: null }) },
                true,
            )
        ).kind,
        'login',
    );
    assert.equal(
        (
            await handleMcpConnections(
                new Request(url),
                { ...auth, getGrants: async () => ({ data: null, error: true }) },
                true,
            )
        ).status,
        503,
    );
});
