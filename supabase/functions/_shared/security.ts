/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Shared Supabase Edge Function Security, Validation & Rate-Limiting Utilities
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-player-token, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Creates a privileged server-side Supabase client using environment variables
 * injected solely into the Edge Function runtime.
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function runtime.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function sanitizeDisplayName(rawName: unknown): string {
  if (typeof rawName !== 'string') return '';
  return rawName
    .replace(/[<>"'`\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeIndianPhone(rawPhone: unknown): string | null {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') return null;
  const digits = String(rawPhone).replace(/\D/g, '');

  let tenDigits = '';
  if (digits.length === 10) {
    tenDigits = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    tenDigits = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    tenDigits = digits.slice(2);
  } else {
    return null;
  }

  if (!/^[6-9]\d{9}$/.test(tenDigits)) return null;
  if (/^(\d)\1{9}$/.test(tenDigits)) return null;

  return `+91${tenDigits}`;
}

export function generateSecureToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return (
    'tok_' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPlayerOwnership(
  supabase: SupabaseClient,
  playerId: unknown,
  playerToken: unknown
): Promise<{ id: string; display_name: string }> {
  if (typeof playerId !== 'string' || typeof playerToken !== 'string' || !playerId || !playerToken) {
    const err = new Error('Missing player authentication credentials.');
    (err as any).status = 401;
    (err as any).code = 'UNAUTHORIZED';
    throw err;
  }

  const tokenHash = await sha256Hex(playerToken);
  const { data: player, error } = await supabase
    .from('players')
    .select('id, display_name, player_token_hash')
    .eq('id', playerId)
    .single();

  if (error || !player || player.player_token_hash !== tokenHash) {
    const err = new Error('Invalid player session token.');
    (err as any).status = 401;
    (err as any).code = 'UNAUTHORIZED';
    throw err;
  }

  return { id: player.id, display_name: player.display_name };
}

/**
 * Enforces sliding-window rate limits per IP or player key.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  actorKey: string,
  actionType: string,
  maxRequests: number,
  windowSeconds = 60
): Promise<void> {
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('actor_key', actorKey)
    .eq('action_type', actionType)
    .gte('created_at', sinceIso);

  if ((count ?? 0) >= maxRequests) {
    const err = new Error('Too many requests. Please wait a moment and try again.');
    (err as any).status = 429;
    (err as any).code = 'RATE_LIMITED';
    throw err;
  }

  await supabase.from('rate_limit_events').insert({
    actor_key: actorKey,
    action_type: actionType,
  });
}
