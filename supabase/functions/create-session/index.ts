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

const QUESTIONS_PER_RUN = 7;
const QUESTION_DURATION_MS = 5000;
const PRE_GAME_COUNTDOWN_SEC = 0;

function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hasThreeInARow(questions: Array<{ correct_answer?: boolean }>): boolean {
  for (let i = 0; i <= questions.length - 3; i++) {
    const a = Boolean(questions[i]?.correct_answer);
    const b = Boolean(questions[i + 1]?.correct_answer);
    const c = Boolean(questions[i + 2]?.correct_answer);
    if (a === b && b === c) return true;
  }
  return false;
}

function shuffleWithoutStreaks<T extends { correct_answer?: boolean }>(arr: T[]): T[] {
  let best = shuffle(arr);
  for (let attempt = 0; attempt < 24; attempt++) {
    if (!hasThreeInARow(best)) return best;
    best = shuffle(arr);
  }
  // Deterministic fallback: interleave true and false if random attempts still had a 3-streak
  const trues = shuffle(arr.filter((q) => Boolean(q.correct_answer)));
  const falses = shuffle(arr.filter((q) => !Boolean(q.correct_answer)));
  const interleaved: T[] = [];
  let pickTrueNext = cryptoRandomInt(2) === 0;
  while (trues.length > 0 || falses.length > 0) {
    if (pickTrueNext && trues.length > 0) {
      interleaved.push(trues.pop()!);
    } else if (!pickTrueNext && falses.length > 0) {
      interleaved.push(falses.pop()!);
    } else if (trues.length > 0) {
      interleaved.push(trues.pop()!);
    } else if (falses.length > 0) {
      interleaved.push(falses.pop()!);
    }
    pickTrueNext = !pickTrueNext;
  }
  return interleaved;
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
      .select('id, equation, correct_answer, difficulty, points')
      .eq('is_active', true);

    if (qError || !allQuestions || allQuestions.length < QUESTIONS_PER_RUN) {
      throw new Error('Question bank unavailable or insufficient questions seeded.');
    }

    // Fetch player's recent 30 sessions to avoid repeating recently seen questions
    const { data: recentSessions } = await supabase
      .from('game_sessions')
      .select('question_sequence')
      .eq('player_id', player.id)
      .order('started_at', { ascending: false })
      .limit(30);

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

    const allStandard = allQuestions.filter((q) => !String(q.id).startsWith('mb'));
    const allBreach = allQuestions.filter((q) => String(q.id).startsWith('mb'));

    let candidateStandard = allStandard.filter((q) => !seenQuestionIds.has(q.id));
    if (candidateStandard.length < 24) {
      candidateStandard = allStandard;
    }

    let candidateBreach = allBreach.filter((q) => !seenQuestionIds.has(q.id));
    if (candidateBreach.length === 0) {
      candidateBreach = allBreach;
    }

    // Pick 3 TRUE and 3 FALSE standard questions from the entire shuffled candidate pool
    // so True/False never clumps into all-True or all-False or 3-in-a-row blocks
    const shuffledPool = shuffle(candidateStandard);
    const truePool = shuffledPool.filter((q) => q.correct_answer === true);
    const falsePool = shuffledPool.filter((q) => q.correct_answer === false);

    const rawSix = [
      ...truePool.slice(0, 3),
      ...falsePool.slice(0, 3),
    ];

    if (rawSix.length < 6) {
      const used = new Set(rawSix.map((q) => q.id));
      for (const q of shuffledPool) {
        if (!used.has(q.id)) {
          rawSix.push(q);
          used.add(q.id);
          if (rawSix.length >= 6) break;
        }
      }
    }

    const selected = shuffleWithoutStreaks(rawSix.slice(0, 6));

    if (candidateBreach.length > 0) {
      const breachPick = shuffle(candidateBreach)[0];
      // Insert Matrix Breach randomly in the middle of the 7-question round (indices 1..5)
      const middleIdx = 1 + cryptoRandomInt(5);
      selected.splice(middleIdx, 0, breachPick);
    }

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
