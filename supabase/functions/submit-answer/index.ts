/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Edge Function: submit-answer
 *
 * POST /functions/v1/submit-answer
 * Body: {
 *   "sessionId": "<uuid>",
 *   "playerId": "<uuid>",
 *   "playerToken": "tok_...",
 *   "questionId": "q001",
 *   "questionIndex": 0,
 *   "answer": true,
 *   "clientElapsedMs": 1820
 * }
 *
 * Enforces:
 * - Session ownership & active status
 * - Strict sequential question order (`questionIndex === session.current_index`)
 * - Server-side deadline (`5000ms` + `1200ms` network latency grace window)
 * - Duplicate answer rejection (`UNIQUE(session_id, question_id)`)
 * - Server-side correctness & speed-bonus points calculation
 */

import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  verifyPlayerOwnership,
} from '../_shared/security.ts';

const SERVER_LATENCY_GRACE_MS = 8000;
const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 50;

function selectReaction(
  questionIndex: number,
  totalQuestions: number,
  isCorrect: boolean,
  timedOut: boolean,
  consecutiveCorrect: number,
  consecutiveMistakes: number,
  elapsedMs: number
): string | null {
  if (questionIndex === 0 && isCorrect) return 'HUMAN RESISTANCE DETECTED.';
  if (questionIndex === totalQuestions - 2) {
    return 'CORE PROXIMITY CRITICAL. EVALUATING FINAL JUDGEMENT.';
  }
  if (timedOut) return 'LATENCY DETECTED. HUMAN DOUBT CONFIRMED.';
  if (!isCorrect) {
    return consecutiveMistakes >= 2 ? 'PREDICTABLE.' : 'COGNITIVE DEVIATION LOGGED.';
  }
  if (consecutiveCorrect === 2) return 'UNEXPECTED.';
  if (consecutiveCorrect === 4) return 'RISK-TAKING BEHAVIOUR IDENTIFIED.';
  if (consecutiveCorrect >= 6 && questionIndex >= 8) return 'YOU ARE LEARNING.';
  if (questionIndex === 6) {
    return elapsedMs < 2000
      ? 'INTERESTING. YOU VALUE POTENTIAL REWARD OVER CERTAINTY.'
      : 'MOST HUMANS CHOOSE SAFETY.';
  }
  if (questionIndex === 10) return 'YOU ARE LEARNING.';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const supabase = createServiceClient();
    const body = await req.json().catch(() => ({}));
    const playerToken = req.headers.get('x-player-token') || body.playerToken;

    const player = await verifyPlayerOwnership(supabase, body.playerId, playerToken);

    const { sessionId, questionId, questionIndex, answer, clientElapsedMs } = body;
    if (typeof sessionId !== 'string' || typeof questionId !== 'string') {
      return jsonResponse({ error: 'Invalid sessionId or questionId.', code: 'BAD_REQUEST' }, 400);
    }
    if (typeof questionIndex !== 'number' || !Number.isInteger(questionIndex)) {
      return jsonResponse({ error: 'Invalid questionIndex.', code: 'BAD_REQUEST' }, 400);
    }
    if (answer !== true && answer !== false && answer !== null) {
      return jsonResponse(
        { error: 'Answer must be boolean true, false, or null.', code: 'INVALID_ANSWER_FORMAT' },
        400
      );
    }

    // Fetch authoritative session
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('player_id', player.id)
      .single();

    if (sErr || !session) {
      return jsonResponse({ error: 'Game session not found.', code: 'SESSION_NOT_FOUND' }, 404);
    }

    if (session.status !== 'active') {
      return jsonResponse(
        { error: 'Session is no longer active.', code: 'SESSION_NOT_ACTIVE' },
        409
      );
    }

    // Check if this question was already answered
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('session_id', sessionId)
      .or(`question_id.eq.${questionId},question_index.eq.${questionIndex}`)
      .maybeSingle();

    if (existingAnswer) {
      return jsonResponse(
        { error: 'Duplicate answer rejected for this question.', code: 'DUPLICATE_ANSWER' },
        409
      );
    }

    if (questionIndex !== session.current_index) {
      return jsonResponse(
        {
          error: `Out-of-order question submission: expected index ${session.current_index}.`,
          code: 'OUT_OF_ORDER',
        },
        400
      );
    }

    const sequence = Array.isArray(session.question_sequence) ? session.question_sequence : [];
    const expectedItem = sequence[session.current_index];
    if (!expectedItem || expectedItem.id !== questionId) {
      return jsonResponse(
        { error: 'Submitted questionId does not match active session question.', code: 'QUESTION_MISMATCH' },
        400
      );
    }

    // Fetch authoritative correct_answer from question_bank
    const { data: dbQuestion, error: qErr } = await supabase
      .from('question_bank')
      .select('id, correct_answer, points')
      .eq('id', questionId)
      .single();

    if (qErr || !dbQuestion) {
      throw new Error('Question definition missing in question_bank.');
    }

    const nowMs = Date.now();
    const startedMs = new Date(session.question_started_at).getTime();
    const serverElapsedMs = Math.max(0, nowMs - startedMs);
    const durationMs = session.question_duration_ms || 5000;
    const maxAllowedMs = durationMs + SERVER_LATENCY_GRACE_MS;

    const timedOut = answer === null || serverElapsedMs > maxAllowedMs;
    const effectiveElapsedMs = timedOut
      ? durationMs
      : Math.min(
          durationMs,
          typeof clientElapsedMs === 'number' && clientElapsedMs >= 0
            ? Math.max(clientElapsedMs, serverElapsedMs - SERVER_LATENCY_GRACE_MS)
            : serverElapsedMs
        );

    const isBotSpeedSpam =
      !timedOut &&
      ((typeof clientElapsedMs === 'number' && clientElapsedMs < 350) ||
        effectiveElapsedMs < 350);

    const isCorrect = !timedOut && !isBotSpeedSpam && answer === dbQuestion.correct_answer;
    let pointsAwarded = 0;

    if (isCorrect) {
      const remainingRatio = Math.max(0, (durationMs - effectiveElapsedMs) / durationMs);
      const speedBonus = Math.round(remainingRatio * MAX_SPEED_BONUS);
      pointsAwarded = (dbQuestion.points || BASE_POINTS) + speedBonus;
    } else if (!timedOut) {
      pointsAwarded = -100;
    }

    // Insert validated answer (protected by UNIQUE constraints)
    const { error: insertErr } = await supabase.from('answers').insert({
      session_id: sessionId,
      question_id: questionId,
      question_index: questionIndex,
      submitted_answer: timedOut ? null : answer,
      timed_out: timedOut,
      response_time_ms: Math.round(effectiveElapsedMs),
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    });

    if (insertErr) {
      return jsonResponse(
        { error: 'Duplicate answer rejected.', code: 'DUPLICATE_ANSWER' },
        409
      );
    }

    const newConsecutiveCorrect = isCorrect ? session.consecutive_correct + 1 : 0;
    const newConsecutiveMistakes = isCorrect ? 0 : session.consecutive_mistakes + 1;
    const newRunningScore = session.running_score + pointsAwarded;
    const nextIndex = session.current_index + 1;
    const isSessionComplete = nextIndex >= session.total_questions;

    await supabase
      .from('game_sessions')
      .update({
        current_index: nextIndex,
        consecutive_correct: newConsecutiveCorrect,
        consecutive_mistakes: newConsecutiveMistakes,
        running_score: newRunningScore,
        question_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const nexusReaction = selectReaction(
      questionIndex,
      session.total_questions,
      isCorrect,
      timedOut,
      newConsecutiveCorrect,
      newConsecutiveMistakes,
      effectiveElapsedMs
    );

    return jsonResponse({
      sessionId,
      questionId,
      questionIndex,
      timedOut,
      isCorrect,
      pointsAwarded,
      runningScore: newRunningScore,
      nextQuestionIndex: isSessionComplete ? null : nextIndex,
      isSessionComplete,
      nexusReaction,
    });
  } catch (err: any) {
    return jsonResponse(
      {
        error: err.message || 'Failed to record answer.',
        code: err.code || 'INTERNAL_ERROR',
      },
      err.status || 500
    );
  }
});
