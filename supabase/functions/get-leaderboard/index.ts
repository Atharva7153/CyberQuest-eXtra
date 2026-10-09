/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Edge Function: get-leaderboard
 *
 * GET /functions/v1/get-leaderboard?limit=50
 *
 * Privacy & Performance Guarantees:
 * - Queries ONLY `public.player_scores` (never joins or selects `public.players.phone_normalized`)
 * - Bounded query (`LIMIT <= 100`, default 50) using composite index `idx_player_scores_ranking`
 * - Applies deterministic tie-breaking:
 *   1. `best_score` DESC
 *   2. `best_accuracy` DESC
 *   3. `fastest_time_ms` ASC
 *   4. `achieved_at` ASC
 */

import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
} from '../_shared/security.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get('limit') || '50');
    const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? rawLimit : 50));

    const { data: rows, count, error } = await supabase
      .from('player_scores')
      .select('display_name, best_score, best_accuracy, achieved_at', { count: 'exact' })
      .order('best_score', { ascending: false })
      .order('best_accuracy', { ascending: false })
      .order('fastest_time_ms', { ascending: true })
      .order('achieved_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch leaderboard standings.');
    }

    const entries = (rows || []).map((row, idx) => ({
      rank: idx + 1,
      displayName: row.display_name,
      bestScore: row.best_score,
      accuracy: row.best_accuracy,
      isTopFive: idx < 5,
      achievedAt: row.achieved_at,
    }));

    return jsonResponse({
      entries,
      totalPlayers: count ?? entries.length,
      tieBreakerRule:
        '1. Highest Validated Score → 2. Highest Accuracy % → 3. Fastest Total Response Time → 4. Earliest Timestamp Achieved',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return jsonResponse(
      {
        error: err.message || 'Could not load leaderboard.',
        code: err.code || 'INTERNAL_ERROR',
      },
      err.status || 500
    );
  }
});
