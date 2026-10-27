import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideNativeConsent, handleMcpConsent } from '../src/lib/mcpConsent.ts';
import { safeRedirectPath, webAuthCallbackUrl } from '../src/lib/safeRedirect.ts';

const id = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const callback = 'https://host.example/callback'; // Local fixture, never a real host registration.
const requestUrl = `https://firstcrack.example/oauth/consent?authorization_id=${id}`;
const csrf = `${id}.local-test-nonce`;
const policy = {
    enabled: true,
    readOnlyReady: true,
    clientIds: [clientId],
    redirectUris: [callback],
    issuer: 'https://firstcrack.example/oauth/mcp',
    resource: 'https://resource.example/mcp',
};

function fixture(overrides = {}) {
    const calls = [];
    const details = {
        authorization_id: id,
        user: { id: userId },
        client: { id: clientId, name: 'Local test app' },
        redirect_uri: callback,
        scope: 'firstcrack:read',
        issuer: policy.issuer,
        resource: policy.resource,
        credential_kind: 'mcp_opaque_v1',
        workspaces: [{ owner_id: userId, name: 'My workspace' }],
        ...overrides,
    };
    const auth = {
        async getUser() {
            calls.push('user');
            return { data: { user: { id: userId } }, error: null };
        },
        async getDetails(value) {
            calls.push(['details', value]);
            return { data: details, error: null };
        },
        async decide(value, decision, owner) {
            calls.push(['decision', value, decision, owner]);
            return {
                data: {
                    redirect_url: `${callback}?${decision === 'approve' ? 'code=local-code' : 'error=access_denied'}&state=local-state&iss=${encodeURIComponent(policy.issuer)}`,
                },
                error: null,
            };
        },
    };
    return { auth, calls };
}
function post(origin = 'https://firstcrack.example', token = csrf, decision = 'approve') {
    const form = new FormData();
    form.set('csrf', token);
    form.set('decision', decision);
    form.set('workspace_owner_id', userId);
    return { request: new Request(requestUrl, { method: 'POST', headers: { Origin: origin } }), form };
}

test('disabled or unverified issuance makes no Auth calls or grants', async () => {
    const { auth, calls } = fixture();
    for (const config of [
        { ...policy, enabled: false },
        { ...policy, readOnlyReady: false },
        { ...policy, clientIds: [] },
    ]) {
        assert.equal((await handleMcpConsent(new Request(requestUrl), auth, config)).kind, 'unavailable');
    }
    assert.deepEqual(calls, []);
});

test('production native adapter refuses approval regardless of feature flags', async () => {
    let denied = 0;
    const deny = async () => {
        denied++;
        return { data: { redirect_url: callback }, error: null };
    };
    assert.ok((await decideNativeConsent(id, 'approve', deny)).error);
    assert.equal(denied, 0);
    assert.equal((await decideNativeConsent(id, 'deny', deny)).error, null);
    assert.equal(denied, 1);
});
test('existing login and callback preserve the exact consent request', async () => {
    const { auth } = fixture();
    auth.getUser = async () => ({ data: { user: null }, error: null });
    const result = await handleMcpConsent(new Request(requestUrl), auth, policy);
    assert.equal(result.kind, 'login');
    const next = new URL(result.location, requestUrl).searchParams.get('next');
    assert.equal(next, `/oauth/consent?authorization_id=${id}`);
    const callbackUrl = new URL(webAuthCallbackUrl('https://firstcrack.example', next));
    assert.equal(callbackUrl.pathname, '/auth/callback');
    assert.equal(safeRedirectPath(callbackUrl.searchParams.get('next')), next);
});
test('GET reviews the verified client and own workspace without approval', async () => {
    const { auth, calls } = fixture();
    assert.deepEqual(await handleMcpConsent(new Request(requestUrl), auth, policy), {
        kind: 'review',
        authorizationId: id,
        clientName: 'Local test app',
        workspaceOwnerId: userId,
        accountLabel: userId,
        redirectUri: callback,
        workspaces: [{ owner_id: userId, name: 'My workspace' }],
    });
    assert.ok(!calls.some((call) => call[0] === 'decision'));
});
test('rejects a different identity, client, callback or unexpected scope', async () => {
    for (const change of [
        { user: { id: id } },
        { client: { id: id, name: 'Other app' } },
        { redirect_uri: 'https://attacker.example/callback' },
        { scope: 'openid profile' },
        { authorization_id: userId },
        { issuer: 'https://other.example' },
        { resource: 'https://other.example' },
        { credential_kind: 'native_jwt' },
        { workspaces: [] },
    ]) {
        const { auth, calls } = fixture(change);
        assert.equal((await handleMcpConsent(new Request(requestUrl), auth, policy)).status, 403);
        assert.ok(!calls.some((call) => call[0] === 'decision'));
    }
});
test('does not follow an automatic approval without verified consent details', async () => {
    const { auth } = fixture();
    auth.getDetails = async () => ({ data: { redirect_url: `${callback}?code=unreviewed` }, error: null });
    assert.equal((await handleMcpConsent(new Request(requestUrl), auth, policy)).status, 409);
});
test('rejects CSRF, other origins and invalid decisions before calling Auth', async () => {
    for (const input of [post('https://attacker.example'), post(undefined, 'wrong'), post(undefined, csrf, 'other')]) {
        const { auth, calls } = fixture();
        const result = await handleMcpConsent(input.request, auth, policy, csrf, input.form);
        assert.equal(result.status, 403);
        assert.deepEqual(calls, []);
    }
});
test('explicit approve and deny decisions use only the verified authorization ID', async () => {
    for (const decision of ['approve', 'deny']) {
        const { auth, calls } = fixture();
        const input = post(undefined, csrf, decision);
        input.form.set('workspace_owner_id', userId);
        const result = await handleMcpConsent(input.request, auth, policy, csrf, input.form);
        assert.equal(result.kind, 'redirect');
        assert.deepEqual(calls.at(-1), ['decision', id, decision, userId]);
        assert.equal(new URL(result.location).searchParams.get('state'), 'local-state');
    }
});
test('refuses redirect substitution even after a provider response', async () => {
    const { auth } = fixture();
    auth.decide = async () => ({
        data: { redirect_url: 'https://attacker.example/callback?code=local-code' },
        error: null,
    });
    const input = post();
    assert.equal((await handleMcpConsent(input.request, auth, policy, csrf, input.form)).status, 400);
});
test('expired sessions return to login and provider failures never use sample data', async () => {
    const { auth } = fixture();
    auth.getUser = async () => ({ data: { user: null }, error: new Error('expired') });
    assert.equal((await handleMcpConsent(new Request(requestUrl), auth, policy)).kind, 'login');
    auth.getUser = async () => {
        throw new Error('Auth unavailable');
    };
    const result = await handleMcpConsent(new Request(requestUrl), auth, policy);
    assert.equal(result.status, 503);
    assert.ok(!JSON.stringify(result).includes('Auth unavailable'));
});
test('web login next rejects external, backslash and control-character redirects', () => {
    for (const next of [
        'https://attacker.example',
        '//attacker.example',
        '/\\attacker.example',
        '/%5cattacker.example',
        '/\n/attacker.example',
        'firstcrack://callback',
    ]) {
        assert.equal(safeRedirectPath(next), '/');
    }
});

test('a submitted workspace must be a verified membership', async () => {
    const { auth, calls } = fixture();
    const input = post();
    input.form.set('workspace_owner_id', id);
    assert.equal((await handleMcpConsent(input.request, auth, policy, csrf, input.form)).status, 403);
    assert.ok(!calls.some((call) => call[0] === 'decision'));
});
