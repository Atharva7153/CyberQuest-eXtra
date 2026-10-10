-- ============================================================================
-- CYBER QUEST EXTRA — NEXUS
-- Migration 08: Seed 20 Matrix Breach 3x3 Grid Memory Challenges (mb01-mb20)
-- and update default total_questions per session to 7
-- ============================================================================

ALTER TABLE public.game_sessions
  ALTER COLUMN total_questions SET DEFAULT 7;

INSERT INTO public.question_bank (id, equation, correct_answer, difficulty, points, is_active)
VALUES
  ('mb01', 'MATRIX BREACH // 1-5-9-3', true, 2, 100, true),
  ('mb02', 'MATRIX BREACH // 2-5-8-4', true, 2, 100, true),
  ('mb03', 'MATRIX BREACH // 3-5-7-1', true, 2, 100, true),
  ('mb04', 'MATRIX BREACH // 4-6-2-8', true, 2, 100, true),
  ('mb05', 'MATRIX BREACH // 1-2-5-8', true, 2, 100, true),
  ('mb06', 'MATRIX BREACH // 7-4-1-5', true, 2, 100, true),
  ('mb07', 'MATRIX BREACH // 9-6-3-5', true, 2, 100, true),
  ('mb08', 'MATRIX BREACH // 8-5-2-6', true, 2, 100, true),
  ('mb09', 'MATRIX BREACH // 1-4-8-9', true, 2, 100, true),
  ('mb10', 'MATRIX BREACH // 3-6-5-2', true, 2, 100, true),
  ('mb11', 'MATRIX BREACH // 5-1-7-9', true, 2, 100, true),
  ('mb12', 'MATRIX BREACH // 2-4-6-8', true, 2, 100, true),
  ('mb13', 'MATRIX BREACH // 9-5-1-7', true, 2, 100, true),
  ('mb14', 'MATRIX BREACH // 6-5-4-2', true, 2, 100, true),
  ('mb15', 'MATRIX BREACH // 7-8-5-3', true, 2, 100, true),
  ('mb16', 'MATRIX BREACH // 4-1-5-9', true, 2, 100, true),
  ('mb17', 'MATRIX BREACH // 8-7-4-2', true, 2, 100, true),
  ('mb18', 'MATRIX BREACH // 2-3-6-9', true, 2, 100, true),
  ('mb19', 'MATRIX BREACH // 5-8-7-4', true, 2, 100, true),
  ('mb20', 'MATRIX BREACH // 1-3-9-7', true, 2, 100, true)
ON CONFLICT (id) DO UPDATE
SET
  equation = EXCLUDED.equation,
  correct_answer = EXCLUDED.correct_answer,
  difficulty = EXCLUDED.difficulty,
  points = EXCLUDED.points,
  is_active = EXCLUDED.is_active;
