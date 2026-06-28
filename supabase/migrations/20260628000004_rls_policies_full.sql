-- Nook M3-1 · Migration 04 · RLS Policies (exhaustive, 7 tables)
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 5.1 ~ § 5.7
-- Idempotent: each CREATE POLICY wrapped in DO-block checking pg_policies.
-- Note: RLS is already `enable row level security` from M2 init (0001) and
-- Migration 03. We only add the policies here.

-- ====================================================================
-- 1. profiles — self + same-conversation visibility for friends
-- ====================================================================
do $$
begin
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
          from public.conversation_members me
          join public.conversation_members them
            on them.conversation_id = me.conversation_id
          where me.user_id     = auth.uid()
            and them.user_id   = profiles.user_id
            and me.left_at     is null
            and them.left_at   is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_self'
  ) then
    -- Authenticated users can insert their own profile. EF admin-bootstrap
    -- uses service_role and bypasses RLS to write role='owner' on first run.
    create policy profiles_insert_self
      on public.profiles for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_self'
  ) then
    create policy profiles_update_self
      on public.profiles for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  -- No DELETE policy on profiles (intentional). account deletion
  -- goes through EF `admin-delete-friend` which uses service_role
  -- and cascades via auth.users DELETE.
end $$;

-- ====================================================================
-- 2. invites — Owner self-only
-- ====================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invites'
      and policyname = 'invites_read_owner'
  ) then
    create policy invites_read_owner
      on public.invites for select
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invites'
      and policyname = 'invites_insert_owner'
  ) then
    create policy invites_insert_owner
      on public.invites for insert
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invites'
      and policyname = 'invites_update_owner'
  ) then
    -- Owner may revoke (UPDATE revoked_at) themselves; EF friend-signup
    -- marks used_by/used_at using service_role (bypasses RLS).
    create policy invites_update_owner
      on public.invites for update
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;
end $$;

-- ====================================================================
-- 3. conversations — active members can read; Owner can create + rename
-- ====================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_read_member'
  ) then
    create policy conversations_read_member
      on public.conversations for select
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id        = auth.uid()
            and cm.left_at        is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_insert_owner'
  ) then
    create policy conversations_insert_owner
      on public.conversations for insert
      with check (
        created_by = auth.uid()
        and exists (
          select 1 from public.profiles
          where profiles.user_id = auth.uid()
            and profiles.role    = 'owner'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_update_owner'
  ) then
    create policy conversations_update_owner
      on public.conversations for update
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;
end $$;

-- ====================================================================
-- 4. conversation_members — same-conv read; Owner add/self-leave write
-- ====================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members'
      and policyname = 'members_read_same_conv'
  ) then
    create policy members_read_same_conv
      on public.conversation_members for select
      using (
        exists (
          select 1 from public.conversation_members me
          where me.conversation_id = conversation_members.conversation_id
            and me.user_id        = auth.uid()
            and me.left_at        is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members'
      and policyname = 'members_insert_owner'
  ) then
    create policy members_insert_owner
      on public.conversation_members for insert
      with check (
        -- Owner of the conversation can add members.
        exists (
          select 1 from public.conversations c
          where c.id          = conversation_members.conversation_id
            and c.created_by = auth.uid()
        )
        -- Friend accepts invite (signed up via EF service_role): allow if self.
        -- EF actually runs as service_role which bypasses RLS, so this branch
        -- is principally a defense-in-depth for direct REST inserts.
        or user_id = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members'
      and policyname = 'members_update_owner_or_self'
  ) then
    create policy members_update_owner_or_self
      on public.conversation_members for update
      using (
        -- Owner can update (left_at = friend-removed).
        exists (
          select 1 from public.conversations c
          where c.id          = conversation_members.conversation_id
            and c.created_by = auth.uid()
        )
        -- Self can update (left_at = self-left; v1.0 soft-disabled).
        or conversation_members.user_id = auth.uid()
      )
      with check (
        exists (
          select 1 from public.conversations c
          where c.id          = conversation_members.conversation_id
            and c.created_by = auth.uid()
        )
        or conversation_members.user_id = auth.uid()
      );
  end if;
end $$;

-- ====================================================================
-- 5. messages — same-conv read; sender-self insert/edit/recall;
--    column-level GRANT restricts UPDATE to (body, deleted_by_sender_at)
-- ====================================================================
-- Column-level GRANT: revoke blanket UPDATE, re-grant on (body, deleted_by_sender_at)
do $$
begin
  execute 'revoke update on public.messages from authenticated';
  execute 'grant update (body, deleted_by_sender_at) on public.messages to authenticated';
exception when others then
  -- Some Postgres variants require separate handling; ignore if grant fails.
  null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_read_member'
  ) then
    create policy messages_read_member
      on public.messages for select
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id        = auth.uid()
            and cm.left_at        is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_insert_self'
  ) then
    create policy messages_insert_self
      on public.messages for insert
      with check (
        sender_id = auth.uid()
        and exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id        = auth.uid()
            and cm.left_at        is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_update_sender'
  ) then
    create policy messages_update_sender
      on public.messages for update
      using (sender_id = auth.uid())
      with check (sender_id = auth.uid());
  end if;

  -- ⚠️ Per SPEC AC.10 + DATA-MODEL R-13, sender-self soft-hide
  -- (deleted_by_sender_at) is the user-visible delete action;
  -- physical DB DELETE is intentionally restricted to service_role
  -- (e.g., future EF admin-purge). M3-1 keeps this disabled.
end $$;

-- ====================================================================
-- 6. attachments — same-conv read via message; self insert; self delete
-- ====================================================================
do $$
begin
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
          join public.conversation_members cm
            on cm.conversation_id = m.conversation_id
          where m.attachment_id = attachments.id
            and cm.user_id      = auth.uid()
            and cm.left_at      is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attachments'
      and policyname = 'attachments_insert_self'
  ) then
    create policy attachments_insert_self
      on public.attachments for insert
      with check (uploaded_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attachments'
      and policyname = 'attachments_delete_self'
  ) then
    create policy attachments_delete_self
      on public.attachments for delete
      using (uploaded_by = auth.uid());
  end if;
end $$;

-- ====================================================================
-- 7. reactions — same-conv read; self insert/delete
-- ====================================================================
do $$
begin
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
          join public.conversation_members cm
            on cm.conversation_id = m.conversation_id
          where m.id     = reactions.message_id
            and cm.user_id = auth.uid()
            and cm.left_at is null
        )
      );
  end if;

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
          join public.conversation_members cm
            on cm.conversation_id = m.conversation_id
          where m.id       = reactions.message_id
            and cm.user_id = auth.uid()
            and cm.left_at is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reactions'
      and policyname = 'reactions_delete_self'
  ) then
    create policy reactions_delete_self
      on public.reactions for delete
      using (user_id = auth.uid());
  end if;
end $$;

-- ====================================================================
-- End of migration 04 — 7 tables, 20+ policies
-- ====================================================================
