-- Nook · Migration 20 · Add conversation_members → profiles FK
-- Fix: PostgREST PGRST200 — cannot resolve `profile:profiles!conversation_members_user_id_fkey`
-- because the only FK on conversation_members.user_id points to auth.users(id), not profiles(user_id).
-- PostgREST cannot chain auth.users → profiles in embedded resource expansion.
-- Adding a direct FK lets the hint resolve correctly.

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name   = 'conversation_members'
      and tc.constraint_name = 'conversation_members_user_id_profiles_fkey'
  ) then
    alter table public.conversation_members
      add constraint conversation_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(user_id);
  end if;
end $$;
