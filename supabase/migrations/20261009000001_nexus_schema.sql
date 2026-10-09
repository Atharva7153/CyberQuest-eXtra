-- ============================================================================
-- CYBER QUEST — NEXUS: THE LAST CHANCE
-- Migration 01: Core Schema, Constraints, Indexes, Atomic RPCs & RLS Policies
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PLAYERS TABLE (Private Registration Data)
-- Phone numbers are normalized to +91XXXXXXXXXX and protected by strict RLS.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 36),
  phone_normalized TEXT NOT NULL UNIQUE CHECK (phone_normalized ~ '^\+91[6-9][0-9]{9}$'),
  player_token_hash TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. QUESTION BANK TABLE
-- Locked behind RLS so clients cannot query `correct_answer` directly.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank (
  id TEXT PRIMARY KEY,
  equation TEXT NOT NULL,
  correct_answer BOOLEAN NOT NULL,
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. GAME SESSIONS TABLE (Server-Controlled Authoritative State)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  question_sequence JSONB NOT NULL,
  total_questions SMALLINT NOT NULL DEFAULT 6 CHECK (total_questions BETWEEN 1 AND 50),
  question_duration_ms INTEGER NOT NULL DEFAULT 5000,
  current_index SMALLINT NOT NULL DEFAULT 0 CHECK (current_index >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  consecutive_correct SMALLINT NOT NULL DEFAULT 0,
  consecutive_mistakes SMALLINT NOT NULL DEFAULT 0,
  running_score INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  question_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  final_summary JSONB
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_status
  ON public.game_sessions (player_id, status);

-- ----------------------------------------------------------------------------
-- 4. ANSWERS TABLE (Per-Question Server-Validated Audit Trail)
-- Uniqueness constraints prevent duplicate answers at the database level.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.answers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.question_bank(id),
  question_index SMALLINT NOT NULL CHECK (question_index >= 0),
  submitted_answer BOOLEAN,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_answers_session_question UNIQUE (session_id, question_id),
  CONSTRAINT uq_answers_session_index UNIQUE (session_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_answers_session_id
  ON public.answers (session_id, question_index);

-- ----------------------------------------------------------------------------
-- 5. PLAYER SCORES TABLE (Public Leaderboard Projection — Zero Phone Numbers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_scores (
  player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  best_accuracy SMALLINT NOT NULL DEFAULT 0 CHECK (best_accuracy BETWEEN 0 AND 100),
  fastest_time_ms INTEGER NOT NULL DEFAULT 75000 CHECK (fastest_time_ms >= 0),
  games_played INTEGER NOT NULL DEFAULT 1 CHECK (games_played >= 1),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index matching the deterministic tie-breaker sort order
CREATE INDEX IF NOT EXISTS idx_player_scores_ranking
  ON public.player_scores (
    best_score DESC,
    best_accuracy DESC,
    fastest_time_ms ASC,
    achieved_at ASC
  );

-- ----------------------------------------------------------------------------
-- 6. RATE LIMIT EVENTS TABLE (Abuse Prevention)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON public.rate_limit_events (actor_key, action_type, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke direct anonymous table mutations across all tables
REVOKE ALL ON public.players FROM anon, authenticated;
REVOKE ALL ON public.question_bank FROM anon, authenticated;
REVOKE ALL ON public.game_sessions FROM anon, authenticated;
REVOKE ALL ON public.answers FROM anon, authenticated;
REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_scores FROM anon, authenticated;

-- Allow read-only SELECT on `player_scores` (contains ONLY public display_name & scores, no phone numbers)
GRANT SELECT ON public.player_scores TO anon, authenticated;

DROP POLICY IF EXISTS "Public read access to validated leaderboard scores" ON public.player_scores;
CREATE POLICY "Public read access to validated leaderboard scores"
  ON public.player_scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- ATOMIC SESSION FINALIZATION STORED PROCEDURE
-- Guarantees:
-- 1. Row-level locking (`FOR UPDATE`) so concurrent requests cannot race
-- 2. Idempotent completion (repeated calls return identical finalized summary)
-- 3. Authoritative score aggregation from `public.answers`
-- 4. Atomic `GREATEST(player_scores.best_score, v_final_score)` preservation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.finalize_game_session(
  p_session_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.game_sessions%ROWTYPE;
  v_player public.players%ROWTYPE;
  v_answered_count INTEGER;
  v_missing_unanswered INTEGER;
  v_final_score INTEGER;
  v_correct_count INTEGER;
  v_incorrect_count INTEGER;
  v_timeout_count INTEGER;
  v_unanswered_count INTEGER;
  v_total_time_ms INTEGER;
  v_accuracy SMALLINT;
  v_prev_best INTEGER;
  v_new_best INTEGER;
  v_is_new_best BOOLEAN := false;
  v_rank INTEGER;
  v_summary JSONB;
BEGIN
  -- 1. Lock session row exclusively to prevent concurrent finalization races
  SELECT *
    INTO v_session
    FROM public.game_sessions
   WHERE id = p_session_id
     AND player_id = p_player_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game session not found or access denied'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Idempotency check: if already completed, return stored summary with live rank
  IF v_session.status = 'completed' AND v_session.final_summary IS NOT NULL THEN
    SELECT best_score INTO v_new_best
      FROM public.player_scores
     WHERE player_id = p_player_id;

    SELECT r.rnk INTO v_rank
      FROM (
        SELECT player_id,
               ROW_NUMBER() OVER (
                 ORDER BY best_score DESC, best_accuracy DESC, fastest_time_ms ASC, achieved_at ASC
               ) AS rnk
          FROM public.player_scores
      ) r
     WHERE r.player_id = p_player_id;

    RETURN v_session.final_summary || jsonb_build_object(
      'personalBest', COALESCE(v_new_best, (v_session.final_summary->>'finalScore')::INTEGER),
      'rank', v_rank,
      'isTopFive', (v_rank IS NOT NULL AND v_rank <= 5),
      'idempotentReplay', true
    );
  END IF;

  SELECT * INTO v_player FROM public.players WHERE id = p_player_id;

  -- 3. Aggregate recorded answers from `public.answers`
  SELECT
    COUNT(*),
    COALESCE(SUM(points_awarded), 0),
    COUNT(*) FILTER (WHERE is_correct = true AND timed_out = false),
    COUNT(*) FILTER (WHERE is_correct = false AND timed_out = false AND submitted_answer IS NOT NULL),
    COUNT(*) FILTER (WHERE timed_out = true OR submitted_answer IS NULL),
    COALESCE(SUM(response_time_ms), 0)
  INTO
    v_answered_count,
    v_final_score,
    v_correct_count,
    v_incorrect_count,
    v_timeout_count,
    v_total_time_ms
  FROM public.answers
  WHERE session_id = p_session_id;

  v_missing_unanswered := GREATEST(0, v_session.total_questions - v_answered_count);
  v_unanswered_count := v_timeout_count + v_missing_unanswered;
  v_total_time_ms := v_total_time_ms + (v_missing_unanswered * v_session.question_duration_ms);
  v_accuracy := ROUND((v_correct_count::NUMERIC / GREATEST(1, v_session.total_questions)) * 100)::SMALLINT;

  -- 4. Check existing personal best
  SELECT best_score INTO v_prev_best
    FROM public.player_scores
   WHERE player_id = p_player_id;

  IF v_prev_best IS NULL OR v_final_score > v_prev_best THEN
    v_is_new_best := true;
  END IF;

  -- 5. Atomic upsert into `public.player_scores` using GREATEST(existing, new)
  INSERT INTO public.player_scores (
    player_id,
    display_name,
    best_score,
    best_accuracy,
    fastest_time_ms,
    games_played,
    achieved_at,
    updated_at
  )
  VALUES (
    p_player_id,
    v_player.display_name,
    v_final_score,
    v_accuracy,
    v_total_time_ms,
    1,
    now(),
    now()
  )
  ON CONFLICT (player_id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    games_played = public.player_scores.games_played + 1,
    updated_at = now(),
    best_accuracy = CASE
      WHEN EXCLUDED.best_score > public.player_scores.best_score THEN EXCLUDED.best_accuracy
      WHEN EXCLUDED.best_score = public.player_scores.best_score
           AND EXCLUDED.best_accuracy > public.player_scores.best_accuracy THEN EXCLUDED.best_accuracy
      ELSE public.player_scores.best_accuracy
    END,
    fastest_time_ms = CASE
      WHEN EXCLUDED.best_score > public.player_scores.best_score THEN EXCLUDED.fastest_time_ms
      WHEN EXCLUDED.best_score = public.player_scores.best_score
           AND EXCLUDED.best_accuracy = public.player_scores.best_accuracy
           AND EXCLUDED.fastest_time_ms < public.player_scores.fastest_time_ms THEN EXCLUDED.fastest_time_ms
      ELSE public.player_scores.fastest_time_ms
    END,
    achieved_at = CASE
      WHEN EXCLUDED.best_score > public.player_scores.best_score THEN now()
      ELSE public.player_scores.achieved_at
    END,
    best_score = GREATEST(public.player_scores.best_score, EXCLUDED.best_score)
  RETURNING best_score INTO v_new_best;

  -- 6. Compute authoritative rank
  SELECT r.rnk INTO v_rank
    FROM (
      SELECT player_id,
             ROW_NUMBER() OVER (
               ORDER BY best_score DESC, best_accuracy DESC, fastest_time_ms ASC, achieved_at ASC
             ) AS rnk
        FROM public.player_scores
    ) r
   WHERE r.player_id = p_player_id;

  v_summary := jsonb_build_object(
    'sessionId', p_session_id,
    'playerId', p_player_id,
    'displayName', v_player.display_name,
    'finalScore', v_final_score,
    'personalBest', v_new_best,
    'isNewPersonalBest', v_is_new_best,
    'correctCount', v_correct_count,
    'incorrectCount', v_incorrect_count,
    'unansweredCount', v_unanswered_count,
    'totalQuestions', v_session.total_questions,
    'accuracy', v_accuracy,
    'totalResponseTimeMs', v_total_time_ms,
    'rank', v_rank,
    'isTopFive', (v_rank IS NOT NULL AND v_rank <= 5),
    'completedAt', now()
  );

  -- 7. Mark session completed and persist final_summary
  UPDATE public.game_sessions
     SET status = 'completed',
         completed_at = now(),
         final_summary = v_summary
   WHERE id = p_session_id;

  RETURN v_summary;
END;
$$;
