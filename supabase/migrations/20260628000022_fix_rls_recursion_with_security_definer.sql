-- Nook · Migration 22 · Fix RLS infinite recursion via SECURITY DEFINER helper
--
-- ROOT CAUSE
-- ----------
-- Migration 04 defined `members_read_same_conv` on `conversation_members` as a
-- self-referencing USING clause (a SELECT policy that subqueries the SAME
-- table it's protecting). Postgres detects this as infinite recursion and
-- returns error `42P17 infinite recursion detected in policy for relation
-- "conversation_members"`. The same recursion indirectly cascades into many
-- dependent SELECT/WITH_CHECK policies which also subquery
-- `conversation_members` for membership checks:
--
--   - conversations_read_member    (SELECT on conversations)
--   - messages_read_member         (SELECT on messages)
--   - messages_insert_self         (INSERT WITH_CHECK on messages)
--   - profiles_read_self_or_same_conv (SELECT on profiles)
--   - attachments_read_via_message (SELECT on attachments via messages)
--   - reactions_read_member        (SELECT on reactions via messages)
--   - reactions_insert_self        (INSERT WITH_CHECK on reactions via messages)
--
-- The bug was masked in production because the prior missing
-- `conversations.updated_at` column (migration 19) caused a 400 error
-- BEFORE any RLS policy evaluation, hiding the recursion behind it. Now
-- that 400 is fixed, the 500 recursion surfaces and the sidebar shows
-- "加载对话失败" for every user.
--
-- FIX
-- ---
-- Introduce a SECURITY DEFINER helper `public.fn_is_conversation_member(uuid)`
-- that performs the membership lookup with the OWNER role (which bypasses
-- RLS). Replacing the recursive USING-clause subqueries with calls to this
-- helper breaks the cycle. SECURITY DEFINER is the standard Postgres fix
-- recommended by Supabase docs for this exact "42P17 infinite recursion"
-- failure mode (see https://supabase.com/docs/guides/auth/row-level-security
-- § "Infinite recursion between policies").
--
-- SAFETY
-- ------
-- The helper exposes NO data back to the caller besides a single boolean —
-- no rows, no PII. Wrapping as `language sql STABLE` lets Postgres cache
-- the per-conversation result within a single query for repeated calls.
-- `security definer` makes the function run as the migration-runner role
-- (superuser), which has BYPASSRLS, so the SELECT against
-- `conversation_members` inside the helper does not trigger the very
-- policy we are replacing.
--
-- IDEMPOTENCY
-- -----------
-- - CREATE OR REPLACE FUNCTION: re-runnable.
-- - DROP POLICY IF EXISTS: Postgres 14+ syntax, guarded against the
--   "policy does not exist" error class.
-- - CREATE POLICY wrapped in DO-blocks checking pg_policies: matches the
--   pattern used by migration 04.

-- ====================================================================
-- 1. SECURITY DEFINER helper
-- ====================================================================

create or replace function public.fn_is_conversation_member(p_conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = p_conv_id
      and user_id         = auth.uid()
      and left_at         is null
  );
$$;

grant execute on function public.fn_is_conversation_member(uuid) to authenticated;
grant execute on function public.fn_is_conversation_member(uuid) to anon;

-- ====================================================================
-- 2. Drop + re-create each broken policy using the helper
-- ====================================================================

do $$
begin
  -- 2.1 conversation_members · self-recursive SELECT → helper
  drop policy if exists members_read_same_conv on public.conversation_members;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members'
      and policyname = 'members_read_same_conv'
  ) then
    create policy members_read_same_conv
      on public.conversation_members for select
      using (public.fn_is_conversation_member(conversation_members.conversation_id));
  end if;

  -- 2.2 conversations · SELECT queries conversation_members → helper
  drop policy if exists conversations_read_member on public.conversations;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_read_member'
  ) then
    create policy conversations_read_member
      on public.conversations for select
      using (public.fn_is_conversation_member(conversations.id));
  end if;

  -- 2.3 messages · SELECT via conversation_members → helper
  drop policy if exists messages_read_member on public.messages;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_read_member'
  ) then
    create policy messages_read_member
      on public.messages for select
      using (public.fn_is_conversation_member(messages.conversation_id));
  end if;

  -- 2.4 messages · INSERT WITH_CHECK via conversation_members → helper
  drop policy if exists messages_insert_self on public.messages;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_insert_self'
  ) then
    create policy messages_insert_self
      on public.messages for insert
      with check (
        sender_id = auth.uid()
        and public.fn_is_conversation_member(messages.conversation_id)
      );
  end if;

  -- 2.5 profiles · SELECT same-conv part via conversation_members → helper
  -- The self-first OR (`user_id = auth.uid()`) already short-circuits for the
  -- user's own row, but profiling the same-conv branch through the helper
  -- -- which bypasses RLS -- keeps the evaluation non-recursive for the
  -- "show me my friend's profile" path too (used by chat message sender
  -- embeds and conversation list).
  drop policy if exists profiles_read_self_or_same_conv on public.profiles;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_read_self_or_same_conv'
  ) then
    create policy profiles_read_self_or_same_conv
      on public.profiles for select
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.conversation_members them
          where them.user_id       = profiles.user_id
            and them.left_at       is null
            and public.fn_is_conversation_member(them.conversation_id)
        )
      );
  end if;

  -- 2.6 attachments · SELECT via messages → helper (skip the join entirely)
  drop policy if exists attachments_read_via_message on public.attachments;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attachments'
      and policyname = 'attachments_read_via_message'
  ) then
    create policy attachments_read_via_message
      on public.attachments for select
      using (
        exists (
          select 1
          from public.messages m
          where m.attachment_id = attachments.id
            and public.fn_is_conversation_member(m.conversation_id)
        )
      );
  end if;

  -- 2.7 reactions · SELECT via messages → helper
  drop policy if exists reactions_read_member on public.reactions;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reactions'
      and policyname = 'reactions_read_member'
  ) then
    create policy reactions_read_member
      on public.reactions for select
      using (
        exists (
          select 1
          from public.messages m
          where m.id = reactions.message_id
            and public.fn_is_conversation_member(m.conversation_id)
        )
      );
  end if;

  -- 2.8 reactions · INSERT WITH_CHECK via messages → helper
  drop policy if exists reactions_insert_self on public.reactions;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reactions'
      and policyname = 'reactions_insert_self'
  ) then
    create policy reactions_insert_self
      on public.reactions for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.messages m
          where m.id = reactions.message_id
            and public.fn_is_conversation_member(m.conversation_id)
        )
      );
  end if;
end $$;

-- ====================================================================
-- End of migration 22 — RLS recursion broken via SECURITY DEFINER helper
-- ====================================================================
