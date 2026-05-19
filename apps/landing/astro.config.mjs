import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    output: 'server',
    adapter: cloudflare(),
    vite: {
        plugins: [tailwindcss()],
    },
    // integrations: [] ← 필요하면 여기에 다른 것 추가
});
