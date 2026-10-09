-- ============================================================================
-- CYBER QUEST EXTRA — NEXUS
-- Migration 03: Allow 6-question rounds on public.game_sessions
-- ============================================================================

ALTER TABLE public.game_sessions
  DROP CONSTRAINT IF EXISTS game_sessions_total_questions_check;

ALTER TABLE public.game_sessions
  ALTER COLUMN total_questions SET DEFAULT 6;

ALTER TABLE public.game_sessions
  ADD CONSTRAINT game_sessions_total_questions_check
  CHECK (total_questions BETWEEN 1 AND 50);
