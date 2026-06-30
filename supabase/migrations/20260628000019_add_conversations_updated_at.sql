-- Nook · Migration 19 · Add conversations.updated_at
-- Fix: listConversations() SELECTs + ORDERs BY updated_at, but the M2 init
-- table never defined this column. PostgREST rejects the query with
-- "column conversations.updated_at does not exist", causing the sidebar
-- to display "加载对话失败" for every user (including newly-registered).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill any existing rows that were created before this column existed.
UPDATE public.conversations
  SET updated_at = created_at
  WHERE updated_at IS NULL;
