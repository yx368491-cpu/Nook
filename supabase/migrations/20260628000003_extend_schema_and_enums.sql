-- Nook M3-1 · Migration 03 · Extend Schema + Enums
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4.2 + docs/02_Architecture/Nook-DATA-MODEL.md § 3
-- Extends the M2 minimal init_core_tables.sql (0001) with full v1.0 schema features:
--   • profiles.role (user_role enum) — required by ARCH § 5.3 conversations_insert_owner
--   • reactions (M:N msg×user×emoji, 6 hardcoded emojis) — CAP-15
--   • attachments (1:0..1 from messages, ≤ 50 MB, mime whitelist) — CAP-10/11
--   • schema_version (single row, infra tracking) — DATA-MODEL § 3.13
--
-- All operations are idempotent (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DO blocks)
-- so `supabase db reset` and `supabase db push --include-all` are safe to re-run.

-- ====================================================================
-- 1. user_role enum (owner | friend) — required by ARCH § 4.2 profiles
-- ====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('owner', 'friend');
  end if;
end $$;

-- ====================================================================
-- 2. profiles.role column (with safe DEFAULT 'friend' for backfill)
--    Existing M2 init left profiles.role-less; this is the canonical
--    addition that aligns with Nook-ARCH-DESIGN § 5.1 RLS self-read
--    and § 5.3 conversations_insert_owner role check.
-- ====================================================================
alter table public.profiles
  add column if not exists role public.user_role not null default 'friend';

-- Optional: assert only one 'owner' exists in the system (DATA-MODEL R-1).
-- Implement as a unique partial index — enforced at DB level, bypassable
-- only by service_role (which the admin-bootstrap EF uses explicitly).
create unique index if not exists profiles_one_owner_uidx
  on public.profiles ((true))
  where role = 'owner';

-- ====================================================================
-- 3. reactions table — emoji 6-hardcoded reactions to messages
--    Composite PK (message_id, user_id, emoji) lets the same user
--    exercise multiple emoji on the same message; user can replace
--    by deleting the old then inserting the new.
-- ====================================================================
create table if not exists public.reactions (
  message_id  uuid not null references public.messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  emoji       text not null check (emoji in ('👍','❤️','😂','👀','🔥','🙏')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_reactions_message
  on public.reactions(message_id);

alter table public.reactions enable row level security;

-- ====================================================================
-- 4. attachments table — single row per uploaded file/image
--    Strong FK dependency on messages: ON DELETE SET NULL so message
--    edits/recalls don't purge attachment metadata row.
-- ====================================================================
create table if not exists public.attachments (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,
  mime          text not null,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 52_428_800), -- 50 MiB
  width         int  check (width  is null or width  > 0),
  height        int  check (height is null or height > 0),
  original_name text,
  uploaded_by   uuid not null references public.profiles(user_id) on delete cascade,
  message_id    uuid references public.messages(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_attachments_uploaded_by
  on public.attachments(uploaded_by);

create index if not exists idx_attachments_message_id
  on public.attachments(message_id);

alter table public.attachments enable row level security;

-- Add attachment_id column to messages (M3-1 fix: column was missing from init 00001)
alter table public.messages
  add column if not exists attachment_id uuid;

-- Add FK from messages.attachment_id -> attachments.id now that attachments exists.
-- The M2 init intentionally omitted this FK until attachments table was created.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name   = 'messages'
      and tc.constraint_name = 'messages_attachment_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_attachment_id_fkey
      foreign key (attachment_id)
      references public.attachments(id)
      on delete set null;
  end if;
end $$;

-- Replace the M2 messages body length check with the full 4-kind payload
-- constraint from ARCH § 4.2. The M2 init only allowed text messages
-- (body NOT NULL OR in range 1..4000); now we also permit image/file
-- (attachment_id NOT NULL, body NULL) and system (both NULL) variants.
--
-- Use explicit DROP CONSTRAINT (deterministic name from the M2 init auto
-- generation) instead of LIKE matching, which is fragile against Postgres
-- canonicalization differences.
alter table public.messages
  drop constraint if exists messages_body_check;

do $$
begin
  begin
    alter table public.messages
      add constraint messages_kind_payload_chk
      check (
        (kind = 'text'    and body is not null and attachment_id is null)
        or (kind = 'system' and body is null     and attachment_id is null)
        or (kind in ('image','file') and body is null and attachment_id is not null)
      );
  exception when duplicate_object then
    -- Already applied in an earlier run — leave alone.
    null;
  end;
end $$;

-- ====================================================================
-- 6. Hot-path composite index for the message-list query
--    ARCH § 4.4: `messages_conv_created_desc`
--    The M2 init only has `idx_messages_conversation(conversation_id)`,
--    which forces an on-the-fly sort for the common
--    GET /rest/v1/messages?conversation_id=eq.X&order=created_at.desc&limit=50.
--    Composite (conversation_id, created_at DESC) collapses sort+filter
--    into a single index scan.
-- ====================================================================
create index if not exists idx_messages_conv_created_desc
  on public.messages (conversation_id, created_at desc);

-- ====================================================================
-- 5b. schema_version — single-row metadata table for migration orchestration
--    Owner-only RLS later; intended for migrations bookkeeping + future
--    Drizzle / Prisma compatibility (DATA-MODEL § 3.13).
-- ====================================================================
create table if not exists public.schema_version (
  id          int  primary key default 1 check (id = 1), -- enforce single-row
  version     text not null,
  applied_at  timestamptz not null default now()
);

-- Seed the singleton row if missing. Idempotent.
insert into public.schema_version (id, version, applied_at)
values (1, 'm3.1.0-extended', now())
on conflict (id) do nothing;

alter table public.schema_version enable row level security;

-- ====================================================================
-- End of migration 03
-- ====================================================================
