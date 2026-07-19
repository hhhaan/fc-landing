-- Applied as fc-desktop migration 20260722000001
-- Fix: subscriptions table should only be writable by service_role (webhook handler).
-- Users may SELECT their own rows only.

-- Drop overly permissive write policies
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;

-- Recreate SELECT-only policy (keep or replace if it already exists under a different name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Users can view own subscriptions'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
        FOR SELECT USING (auth.uid() = user_id);
    $p$;
  END IF;
END $$;

-- Ensure RLS is on
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Note: service_role (used by the webhook handler via SERVICE_ROLE_KEY) bypasses RLS
-- automatically in Supabase. No explicit service_role policies are needed.

-- Verify (run this SELECT after applying to confirm):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'subscriptions';
