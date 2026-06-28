-- Nook M3-1 · Migration 05 · Triggers + RPC functions
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4.3 + § 6.1
-- Three hard-cap/edit triggers (T-01 / T-02 / T-03) and two RPC functions
-- (fn_unread_counts, fn_mark_conversation_read) for CAP-21 / CAP-21b.
--
-- Idempotency strategy:
--   - Functions use CREATE OR REPLACE FUNCTION so re-application is safe.
--   - Triggers use DROP TRIGGER IF EXISTS before CREATE TRIGGER.
--   - Trigger exceptions emit well-known `errcode = 'P0001'` strings that
--     EF / supabase-js error mapping translates into Nook error codes
--     (see Nook-API-DESIGN § 3.4 mapSupabaseError).

-- ====================================================================
-- T-01 — conversations 4-group hard-cap
-- ====================================================================
create or replace function public.fn_check_conv_cap()
returns trigger
language plpgsql
as $$
declare
  cnt int;
begin
  -- Only count 'group' (spec: 1:1 direct conv doesn't count toward the cap).
  select count(*) into cnt
  from public.conversations
  where kind = 'group';

  if cnt >= 4 then
    raise exception 'CONV_HARD_CAP' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_conversations_cap on public.conversations;
create trigger trg_conversations_cap
  before insert on public.conversations
  for each row
  execute function public.fn_check_conv_cap();

-- ====================================================================
-- T-02 — conversation_members 8-cap on active (left_at IS NULL)
-- ====================================================================
create or replace function public.fn_check_member_cap()
returns trigger
language plpgsql
as $$
declare
  cnt int;
begin
  select count(*) into cnt
  from public.conversation_members
  where conversation_id = NEW.conversation_id
    and left_at is null;

  if cnt >= 8 then
    raise exception 'MEMBER_HARD_CAP' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_conversation_members_cap on public.conversation_members;
create trigger trg_conversation_members_cap
  before insert on public.conversation_members
  for each row
  execute function public.fn_check_member_cap();

-- ====================================================================
-- T-03 — messages.body 2-minute edit window (auto-set edited_at)
-- ====================================================================
create or replace function public.fn_check_edit_window()
returns trigger
language plpgsql
as $$
begin
  -- Only enforce on UPDATE where body content actually changes.
  if (TG_OP = 'UPDATE') and (NEW.body is distinct from OLD.body) then
    if OLD.created_at < now() - interval '2 minutes' then
      raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001';
    end if;
    -- Auto-stamp edited_at; client cannot override (REVOKE UPDATE on this col).
    NEW.edited_at := now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_messages_edit_window on public.messages;
create trigger trg_messages_edit_window
  before update on public.messages
  for each row
  execute function public.fn_check_edit_window();

-- ====================================================================
-- RPC: fn_unread_counts(p_user) — CAP-21
-- Returns per-conversation unread message counts for the calling user.
-- SECURITY INVOKER: runs as the JWT principal, so we use auth.uid()
-- inside the function body (more portable than passing p_user as a
-- parameter that's compared against auth.uid).
-- ====================================================================
create or replace function public.fn_unread_counts()
returns table(conversation_id uuid, count int)
language sql
stable
security invoker
set search_path = public
as $$
  select m.conversation_id, count(*)::int
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id         = auth.uid()
   and cm.left_at         is null
  where m.created_at > cm.last_read_at - interval '1 minute'  -- self-echo guard
    and m.recalled_at is null                                   -- recalled msgs don't count
    and m.deleted_by_sender_at is null                          -- sender-deleted msgs drop on sender side; n/a here
  group by m.conversation_id;
$$;

grant execute on function public.fn_unread_counts() to authenticated;
grant execute on function public.fn_unread_counts() to anon;
grant execute on function public.fn_unread_counts() to service_role;

comment on function public.fn_unread_counts()
  is 'CAP-21: returns per-conversation unread counts for auth.uid(); excludes recalled messages; suppressed self-echo via last_read_at - 1min grace.';

-- ====================================================================
-- RPC: fn_mark_conversation_read(p_conv) — CAP-21b
-- Bumps conversation_members.last_read_at for the calling user on the
-- given conversation (must be an active member; left_at IS NULL).
-- ====================================================================
create or replace function public.fn_mark_conversation_read(p_conv uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.conversation_members
  set last_read_at = greatest(last_read_at, now())
  where conversation_id = p_conv
    and user_id         = auth.uid()
    and left_at         is null;
$$;

grant execute on function public.fn_mark_conversation_read(uuid) to authenticated;
grant execute on function public.fn_mark_conversation_read(uuid) to service_role;

comment on function public.fn_mark_conversation_read(uuid)
  is 'CAP-21b: bumps last_read_at cursor for active member in given conversation.';

-- ====================================================================
-- End of migration 05 — 3 trigger functions + 3 triggers + 2 RPC functions
-- ====================================================================
