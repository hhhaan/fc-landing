import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
    output: 'server',
    adapter: cloudflare({
        imageService: 'passthrough',
    }),
    env: {
        // Secrets resolve at runtime via CF env (not Vite-inlined).
        // Keep validateSecrets false so CI can build without secret values.
        validateSecrets: false,
        schema: {
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
            POLAR_WEBHOOK_SECRET: envField.string({
                context: 'server',
                access: 'secret',
            }),
            SUPABASE_SERVICE_ROLE_KEY: envField.string({
                context: 'server',
                access: 'secret',
            }),
        },
    },
    vite: {
        plugins: [tailwindcss()],
    },
});
