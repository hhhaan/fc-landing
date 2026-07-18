import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database.types';

let client: SupabaseClient<Database> | null = null;

/** Prefer server-only SUPABASE_URL — NEXT_PUBLIC_ is inlined at build and breaks on Sensitive CLI pulls. */
function resolveSupabaseUrl(): string {
    const raw = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    if (!raw || raw === '[SENSITIVE]') {
        throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
    }
    if (!/^https?:\/\//i.test(raw)) {
        throw new Error(`Invalid SUPABASE_URL: must be http(s), got length=${raw.length}`);
    }
    return raw;
}

export function getAdminClient(): SupabaseClient<Database> {
    if (client) return client;

    const url = resolveSupabaseUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!key || key === '[SENSITIVE]') {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    client = createClient<Database>(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return client;
}
