/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Edge Function: finalize-session
 *
 * POST /functions/v1/finalize-session
 * Body: { "sessionId": "<uuid>", "playerId": "<uuid>", "playerToken": "tok_..." }
 *
 * Security Guarantees:
 * - Explicitly rejects any payload containing a client-supplied `score`
 *   (e.g. `{ "playerId": "someone", "score": 999999 }` is rejected with 403)
 * - Verifies session ownership via player token hash
 * - Calls the atomic PostgreSQL RPC `finalize_game_session` which locks the
 *   session row (`FOR UPDATE`), aggregates validated answers from `public.answers`,
 *   updates `player_scores.best_score = GREATEST(existing, new)`, and is 100%
 *   idempotent across network retries.
 */

import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  verifyPlayerOwnership,
} from '../_shared/security.ts';

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

    // Reject direct browser score injection attempts
    if (typeof body.score !== 'undefined' || !body.sessionId) {
      return jsonResponse(
        {
          error:
            'Direct score submissions are prohibited. Final scores are calculated exclusively from server-recorded session answers.',
          code: 'UNTRUSTED_SCORE_REJECTED',
        },
        403
      );
    }

    const playerToken = req.headers.get('x-player-token') || body.playerToken;
    const player = await verifyPlayerOwnership(supabase, body.playerId, playerToken);

    const { data: summary, error: rpcErr } = await supabase.rpc('finalize_game_session', {
      p_session_id: body.sessionId,
      p_player_id: player.id,
    });

    if (rpcErr || !summary) {
      return jsonResponse(
        {
          error: rpcErr?.message || 'Unable to finalize game session.',
          code: 'FINALIZE_FAILED',
        },
        400
      );
    }

    return jsonResponse(summary as Record<string, unknown>, 200);
  } catch (err: any) {
    return jsonResponse(
      {
        error: err.message || 'Internal error finalizing session.',
        code: err.code || 'INTERNAL_ERROR',
      },
      err.status || 500
    );
  }
});
