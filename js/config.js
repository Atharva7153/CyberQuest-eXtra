/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Global Configuration & Authoritative Constants
 */

export const CONFIG = Object.freeze({
  MAINTENANCE_MODE: true,
  EVENT_TITLE: 'CYBER QUEST — NEXUS',
  EVENT_YEAR: 2035,

  // =========================================================================
  // SUPABASE CLOUD CONFIGURATION
  // =========================================================================
  SUPABASE_URL:
    window.__NEXUS_CONFIG__?.SUPABASE_URL || 'https://ttyhobmughtbqpwlbcqg.supabase.co',
  SUPABASE_ANON_KEY:
    window.__NEXUS_CONFIG__?.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWhvYm11Z2h0YnFwd2xiY3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTg1NTAsImV4cCI6MjEwNzEzNDU1MH0._O2NR5QKP-3Sr7JGP_F6JM0KM8vPTbwoWD2g_S3k7Ac',

  ENDPOINTS: Object.freeze({
    REGISTER_PLAYER: '/register-player',
    CREATE_SESSION: '/create-session',
    SUBMIT_ANSWER: '/submit-answer',
    FINALIZE_SESSION: '/finalize-session',
    GET_LEADERBOARD: '/get-leaderboard',
  }),

  // =========================================================================
  // GAMEPLAY & SCORING RULES (6 Questions, Fast Arcade Pacing)
  // =========================================================================
  GAME: Object.freeze({
    QUESTIONS_PER_RUN: 6,             // 6 questions per round
    QUESTION_DURATION_MS: 5000,       // 5.0 seconds per question
    SERVER_LATENCY_GRACE_MS: 1500,    // Server-side network latency tolerance window
    PRE_GAME_COUNTDOWN_SEC: 0,        // Start immediately (0s delay) for snappy feel
    FEEDBACK_HOLD_MS: 550,            // Clear 550ms visual flash for CORRECT / WRONG
    BASE_POINTS_CORRECT: 100,         // Base points per correct answer
    MAX_SPEED_BONUS: 50,              // Up to +50 bonus points for speed
    POINTS_INCORRECT: 0,
    POINTS_UNANSWERED: 0,
  }),

  // =========================================================================
  // LEADERBOARD & NETWORK SETTINGS
  // =========================================================================
  LEADERBOARD: Object.freeze({
    LIMIT: 50,
    TOP_QUALIFIERS_COUNT: 5,
    REFRESH_INTERVAL_MS: 12000,
  }),

  NETWORK: Object.freeze({
    MAX_RETRIES: 2,
    RETRY_BASE_DELAY_MS: 350,
    REQUEST_TIMEOUT_MS: 6000,
  }),

  LORE: Object.freeze({
    INITIAL_INTEGRITY: 100,
    INTEGRITY_BY_QUESTION: Object.freeze([100, 91, 82, 74, 63, 52]),
    MESSAGES: Object.freeze({
      START: 'HUMAN RESISTANCE DETECTED.',
      STREAK_2: 'UNEXPECTED.',
      STREAK_4: 'YOU ARE LEARNING.',
      MISTAKE_REPEAT: 'PREDICTABLE.',
      TIMEOUT: 'TIME EXPIRED.',
    }),
  }),
});

export function isCloudConfigured(config = CONFIG) {
  const url = (config.SUPABASE_URL || '').trim();
  const key = (config.SUPABASE_ANON_KEY || '').trim();
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('YOUR_PROJECT_REF') &&
    !key.includes('YOUR_SUPABASE_PUBLIC_ANON_KEY') &&
    url.startsWith('http')
  );
}
