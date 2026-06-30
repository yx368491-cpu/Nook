-- Nook · Migration 21 · Add messages → profiles FK
-- Fix: PostgREST PGRST200 — `sender:profiles!messages_sender_id_fkey` has the
-- same indirect-FK-through-auth.users issue as migration 20. Adding a direct
-- FK from messages.sender_id → profiles.user_id lets PostgREST resolve
-- the embedded sender profile in listMessages.

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name   = 'messages'
      and tc.constraint_name = 'messages_sender_id_profiles_fkey'
  ) then
    alter table public.messages
      add constraint messages_sender_id_profiles_fkey
      foreign key (sender_id) references public.profiles(user_id);
  end if;
end $$;
