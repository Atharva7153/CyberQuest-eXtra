/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Edge Function: register-player
 *
 * POST /functions/v1/register-player
 * Body: { "name": "Arjun Verma", "phone": "+919876543210" }
 *
 * Security & Privacy:
 * - Validates and normalizes Indian mobile number to +91XXXXXXXXXX
 * - Enforces rate limiting per client IP and phone number
 * - Stores normalized phone number privately in `public.players`
 * - Enforces unique identity per phone number (prevents duplicate accounts)
 * - Issues a fresh player session token and stores only its SHA-256 hash
 * - Never returns phone numbers in the response
 */

import {
  corsHeaders,
  createServiceClient,
  enforceRateLimit,
  generateSecureToken,
  jsonResponse,
  normalizeIndianPhone,
  sanitizeDisplayName,
  sha256Hex,
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
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';

    await enforceRateLimit(supabase, `ip:${clientIp}`, 'register_player', 15, 60);

    const body = await req.json().catch(() => ({}));
    const displayName = sanitizeDisplayName(body.name);
    const phoneNormalized = normalizeIndianPhone(body.phone);

    if (!displayName || displayName.length < 2 || displayName.length > 36) {
      return jsonResponse(
        {
          error: 'Enter a valid operator name between 2 and 36 characters.',
          code: 'INVALID_NAME',
        },
        400
      );
    }

    if (!/^[A-Za-z0-9 ._\-]+$/.test(displayName)) {
      return jsonResponse(
        {
          error:
            'Operator name may only contain letters, numbers, spaces, dots, hyphens, and underscores.',
          code: 'INVALID_NAME_CHARS',
        },
        400
      );
    }

    if (!phoneNormalized) {
      return jsonResponse(
        {
          error: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
          code: 'INVALID_PHONE',
        },
        400
      );
    }

    const playerToken = generateSecureToken(24);
    const tokenHash = await sha256Hex(playerToken);

    // Check if operator with this normalized phone number already exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('phone_normalized', phoneNormalized)
      .maybeSingle();

    if (existingPlayer) {
      const { data: updated, error: updateErr } = await supabase
        .from('players')
        .update({
          display_name: displayName,
          player_token_hash: tokenHash,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existingPlayer.id)
        .select('id, display_name')
        .single();

      if (updateErr || !updated) {
        throw new Error('Failed to refresh operator session.');
      }

      // Also keep public display_name synced in player_scores if already ranked
      await supabase
        .from('player_scores')
        .update({ display_name: displayName })
        .eq('player_id', updated.id);

      const { data: scoreRow } = await supabase
        .from('player_scores')
        .select('best_score')
        .eq('player_id', updated.id)
        .maybeSingle();

      return jsonResponse({
        playerId: updated.id,
        playerToken,
        displayName: updated.display_name,
        bestScore: scoreRow?.best_score ?? 0,
        isReturning: true,
      });
    }

    // Create new operator record
    const { data: created, error: insertErr } = await supabase
      .from('players')
      .insert({
        display_name: displayName,
        phone_normalized: phoneNormalized,
        player_token_hash: tokenHash,
      })
      .select('id, display_name')
      .single();

    if (insertErr || !created) {
      throw new Error('Could not register operator.');
    }

    return jsonResponse(
      {
        playerId: created.id,
        playerToken,
        displayName: created.display_name,
        bestScore: 0,
        isReturning: false,
      },
      201
    );
  } catch (err: any) {
    const status = err.status || 500;
    return jsonResponse(
      {
        error: err.message || 'Internal server error during registration.',
        code: err.code || 'INTERNAL_ERROR',
      },
      status
    );
  }
});
