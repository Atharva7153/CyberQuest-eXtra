-- ============================================================================
-- CYBER QUEST EXTRA — NEXUS
-- Migration 04: Cumulative Grind Scoring (Rounds Add to Total Leaderboard Score)
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
  -- 1. Lock session row exclusively so concurrent requests cannot double-add
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

  -- 2. Idempotency check: if already completed, return stored summary without double-adding
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

  -- 4. Check existing cumulative score
  SELECT best_score INTO v_prev_best
    FROM public.player_scores
   WHERE player_id = p_player_id;

  IF v_prev_best IS NULL OR v_final_score > 0 THEN
    v_is_new_best := true;
  END IF;

  -- 5. Atomic cumulative addition into `public.player_scores`
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
    best_accuracy = GREATEST(public.player_scores.best_accuracy, EXCLUDED.best_accuracy),
    fastest_time_ms = LEAST(public.player_scores.fastest_time_ms, EXCLUDED.fastest_time_ms),
    achieved_at = CASE
      WHEN EXCLUDED.best_score > 0 THEN now()
      ELSE public.player_scores.achieved_at
    END,
    best_score = public.player_scores.best_score + EXCLUDED.best_score
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
