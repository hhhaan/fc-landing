import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        host: true, // 0.0.0.0 — phone on LAN can open via machine IP
    },
});
