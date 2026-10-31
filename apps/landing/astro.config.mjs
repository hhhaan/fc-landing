import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
    site: 'https://firstcrackiscoming.com',
    output: 'server',
    adapter: cloudflare({
        imageService: 'passthrough',
    }),
    // OAuth token and revoke posts come from ChatGPT's servers with no browser Origin.
    security: { checkOrigin: false },
    env: {
        // Secrets resolve at runtime via CF env (not Vite-inlined).
        // Keep validateSecrets false so CI can build without secret values.
        validateSecrets: false,
        schema: {
            MCP_OAUTH_ENABLED: envField.string({ context: 'server', access: 'secret', optional: true }),
            MCP_OAUTH_ISSUER_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
            MCP_OAUTH_RESOURCE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
            MCP_OAUTH_READONLY_READY: envField.string({ context: 'server', access: 'secret', optional: true }),
            MCP_OAUTH_CLIENT_IDS: envField.string({ context: 'server', access: 'secret', optional: true }),
            MCP_OAUTH_REDIRECT_URIS: envField.string({ context: 'server', access: 'secret', optional: true }),
            PUBLIC_SUPABASE_URL: envField.string({
                context: 'client',
                access: 'public',
            }),
            PUBLIC_SUPABASE_ANON_KEY: envField.string({
                context: 'client',
                access: 'public',
            }),
            PUBLIC_SITE_URL: envField.string({
                context: 'client',
                access: 'public',
                optional: true,
            }),

            POLAR_SERVER: envField.enum({
                context: 'server',
                access: 'secret',
                values: ['production', 'sandbox'],
                default: 'production',
            }),
            POLAR_SUCCESS_URL: envField.string({
                context: 'server',
                access: 'secret',
                url: true,
                default: 'https://firstcrackiscoming.com/account?welcome=1',
            }),
            POLAR_ACCESS_TOKEN: envField.string({
                context: 'server',
                access: 'secret',
            }),
            POLAR_LEGACY_ACCESS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
            POLAR_WEBHOOK_SECRET_NEW: envField.string({ context: 'server', access: 'secret', optional: true }),
            POLAR_WEBHOOK_SECRET: envField.string({
                context: 'server',
                access: 'secret',
            }),
            SUPABASE_SERVICE_ROLE_KEY: envField.string({
                context: 'server',
                access: 'secret',
            }),
            /** Same webhook as Edge notify-signup when set — payment + webhook errors. */
            SLACK_WEBHOOK_URL: envField.string({
                context: 'server',
                access: 'secret',
                optional: true,
            }),
            /** Optional Sentry DSN for server-side webhook failures. */
            SENTRY_DSN: envField.string({
                context: 'server',
                access: 'secret',
                optional: true,
            }),
        },
    },
    vite: {
        plugins: [tailwindcss()],
    },
});
