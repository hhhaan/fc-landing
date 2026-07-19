/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    /** Override invite/share origin; default https://cup.firstcrackiscoming.com */
    readonly VITE_CUPPING_PUBLIC_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
