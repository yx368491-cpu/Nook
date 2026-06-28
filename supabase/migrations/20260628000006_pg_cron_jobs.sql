-- Nook M3-1 · Migration 06 · pg_cron daily jobs (J-01 / J-02 / J-03)
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4.5
-- Three scheduled tasks per spec:
--   J-01 · 03:00 UTC every day  → 30-day messages TTL cleanup (cascades attachments)
--   J-02 · 04:00 UTC every day  → invite TTL cleanup (used + expired)
--   J-03 · 04:30 UTC every day  → storage orphans cleanup (calls Edge Function)
--
-- ⚠️ pg_cron + pg_net are only available on Supabase Cloud and on local
-- `supabase start` (Docker image); standalone Postgres may lack them.
-- This migration wraps each `CREATE EXTENSION` in DO + exception handling
-- so the rest of the migration still applies if pg_cron is unavailable.

-- ====================================================================
-- 1. Enable pg_cron (idempotent; silently skip if unsupported)
-- ====================================================================
do $$
begin
  create extension if not exists pg_cron;
  raise notice 'pg_cron extension enabled';
exception when others then
  raise notice 'pg_cron not available in this environment — J-01/J-02/J-03 will not schedule. (OK for local-only boots; required for staging/prod.)';
end $$;

-- ====================================================================
-- 2. Enable pg_net (needed by J-03 for net.http_post to Edge Function)
-- ====================================================================
do $$
begin
  create extension if not exists pg_net;
  raise notice 'pg_net extension enabled';
exception when others then
  raise notice 'pg_net not available — J-03 (cleanup-orphans HTTP call) will be skipped.';
end $$;

-- ====================================================================
-- 3. J-01 · 30-day messages TTL — 03:00 UTC daily
--    Deletes messages older than 30 days; returns their attachment_ids
--    to then delete the corresponding attachment rows atomically.
-- ====================================================================
do $$
begin
  -- Remove pre-existing job with same name (idempotent re-schedule)
  perform cron.unschedule(jobname => 'nook_messages_ttl');

  perform cron.schedule(
    jobname  => 'nook_messages_ttl',
    schedule => '0 3 * * *',
    command  => $cmd$
      with deleted_msgs as (
        delete from public.messages
        where created_at < now() - interval '30 days'
        returning attachment_id
      )
      delete from public.attachments
      where id in (select attachment_id from deleted_msgs where attachment_id is not null);
    $cmd$
  );

  raise notice 'J-01 nook_messages_ttl scheduled (0 3 * * *)';
exception when undefined_function or insufficient_privilege then
  raise notice 'cron.schedule unavailable — J-01 not scheduled. Verify pg_cron + service_role perms when running on cloud.';
end $$;

-- ====================================================================
-- 4. J-02 · invites TTL cleanup — 04:00 UTC daily
--    Deletes:
--      a) expired (expires_at < now()), AND
--      b) used 24h+ ago (used_at is not null AND used_at < now() - 1d)
--    Revoked_at is intentionally not separately purged (rare event;
--    30-day hard cap aligns with lifecycle policy).
-- ====================================================================
do $$
begin
  perform cron.unschedule(jobname => 'nook_invites_ttl');

  perform cron.schedule(
    jobname  => 'nook_invites_ttl',
    schedule => '0 4 * * *',
    command  => $cmd$
      delete from public.invites
      where (expires_at < now())
         or (used_at is not null and used_at < now() - interval '1 day');
    $cmd$
  );

  raise notice 'J-02 nook_invites_ttl scheduled (0 4 * * *)';
exception when undefined_function or insufficient_privilege then
  raise notice 'cron.schedule unavailable — J-02 not scheduled.';
end $$;

-- ====================================================================
-- 5. J-03 · storage orphans cleanup — 04:30 UTC daily
--    Calls the `cleanup-storage-orphans` Edge Function via pg_net.
--    Falls back gracefully if app.cron_key isn't set (logs warning
--    but doesn't hard-fail to keep the rest of the migration safe).
-- ====================================================================
do $$
declare
  functions_url text;
  cron_key      text;
begin
  -- Try to read runtime config; missing settings is normal in dev.
  begin
    functions_url := current_setting('app.functions_url', true);
  exception when others then
    functions_url := null;
  end;
  begin
    cron_key := current_setting('app.cron_key', true);
  exception when others then
    cron_key := null;
  end;

  perform cron.unschedule(jobname => 'nook_cleanup_orphans');

  if functions_url is null or cron_key is null then
    -- Still schedule the job — it'll just emit a warning on first run.
    -- Set the settings via: ALTER DATABASE nook SET app.functions_url = '...';
    raise notice 'J-03 scheduling without app.functions_url / app.cron_key — set those GUCs after deploy.';
  end if;

  perform cron.schedule(
    jobname  => 'nook_cleanup_orphans',
    schedule => '30 4 * * *',
    command  => $cmd$
      select net.http_post(
        url     := coalesce(current_setting('app.functions_url', true), 'http://localhost:54321/functions/v1/cleanup-storage-orphans'),
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || coalesce(current_setting('app.cron_key', true), 'missing-cron-key')
        ),
        body    := '{}'::jsonb
      );
    $cmd$
  );

  raise notice 'J-03 nook_cleanup_orphans scheduled (30 4 * * *)';
exception when undefined_function or insufficient_privilege then
  raise notice 'cron.schedule or net.http_post unavailable — J-03 not scheduled.';
end $$;

-- ====================================================================
-- End of migration 06 — pg_cron + pg_net enable + J-01/J-02/J-03 schedule
-- ====================================================================
