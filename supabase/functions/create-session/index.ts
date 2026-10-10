/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Edge Function: create-session
 *
 * POST /functions/v1/create-session
 * Body: { "playerId": "<uuid>", "playerToken": "tok_..." }
 *
 * Responsibilities:
 * - Authenticates the player token
 * - Selects 15 balanced active questions across difficulty tiers 1, 2, and 3
 * - Stores authoritative session state in `public.game_sessions`
 * - Returns ONLY question IDs and equation text (never `correct_answer`)
 */

import {
  corsHeaders,
  createServiceClient,
  enforceRateLimit,
  jsonResponse,
  verifyPlayerOwnership,
} from '../_shared/security.ts';

const QUESTIONS_PER_RUN = 6;
const QUESTION_DURATION_MS = 5000;
const PRE_GAME_COUNTDOWN_SEC = 0;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    await enforceRateLimit(supabase, `player:${player.id}`, 'create_session', 20, 60);

    // Fetch active questions from `question_bank`
    const { data: allQuestions, error: qError } = await supabase
      .from('question_bank')
      .select('id, equation, difficulty, points')
      .eq('is_active', true);

    if (qError || !allQuestions || allQuestions.length < QUESTIONS_PER_RUN) {
      throw new Error('Question bank unavailable or insufficient questions seeded.');
    }

    // Fetch player's recent 10 sessions to avoid repeating recently seen questions
    const { data: recentSessions } = await supabase
      .from('game_sessions')
      .select('question_sequence')
      .eq('player_id', player.id)
      .order('started_at', { ascending: false })
      .limit(10);

    const seenQuestionIds = new Set<string>();
    if (Array.isArray(recentSessions)) {
      for (const s of recentSessions) {
        if (Array.isArray(s.question_sequence)) {
          for (const item of s.question_sequence) {
            if (item?.id) seenQuestionIds.add(item.id);
          }
        }
      }
    }

    let candidatePool = allQuestions.filter((q) => !seenQuestionIds.has(q.id));
    if (candidatePool.length < QUESTIONS_PER_RUN * 3) {
      candidatePool = allQuestions;
    }

    const tier1 = shuffle(candidatePool.filter((q) => q.difficulty === 1));
    const tier2 = shuffle(candidatePool.filter((q) => q.difficulty === 2));
    const tier3 = shuffle(candidatePool.filter((q) => q.difficulty === 3));

    const selected = shuffle([
      ...tier1.slice(0, 2),
      ...tier2.slice(0, 2),
      ...tier3.slice(0, 2),
    ]).slice(0, QUESTIONS_PER_RUN);

    const sequence = selected.map((q, idx) => ({
      index: idx,
      id: q.id,
      equation: q.equation,
      difficulty: q.difficulty,
      points: q.points,
    }));

    const firstQuestionStart = new Date(
      Date.now() + PRE_GAME_COUNTDOWN_SEC * 1000
    ).toISOString();

    const { data: session, error: sError } = await supabase
      .from('game_sessions')
      .insert({
        player_id: player.id,
        question_sequence: sequence,
        total_questions: QUESTIONS_PER_RUN,
        question_duration_ms: QUESTION_DURATION_MS,
        current_index: 0,
        status: 'active',
        question_started_at: firstQuestionStart,
      })
      .select('id, player_id, status')
      .single();

    if (sError || !session) {
      throw new Error('Failed to create game session.');
    }

    return jsonResponse(
      {
        sessionId: session.id,
        playerId: session.player_id,
        status: session.status,
        questionsPerRun: QUESTIONS_PER_RUN,
        questionDurationMs: QUESTION_DURATION_MS,
        preGameCountdownSec: PRE_GAME_COUNTDOWN_SEC,
        questions: sequence.map((q) => ({
          index: q.index,
          questionId: q.id,
          equation: q.equation,
          difficulty: q.difficulty,
        })),
      },
      201
    );
  } catch (err: any) {
    return jsonResponse(
      {
        error: err.message || 'Could not start session.',
        code: err.code || 'INTERNAL_ERROR',
      },
      err.status || 500
    );
  }
});
