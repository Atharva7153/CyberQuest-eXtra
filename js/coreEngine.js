/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Authoritative Validation, Session State Machine & Security Engine
 *
 * This module implements:
 * 1. Input sanitization & Indian mobile phone normalization (+91XXXXXXXXXX)
 * 2. Mathematical verification of the question bank
 * 3. Server-equivalent authoritative session management, deadline enforcement,
 *    duplicate-answer rejection, idempotent session finalization, atomic
 *    GREATEST(best_score, new_score) preservation, and strict privacy filtering.
 *
 * Used by:
 * - Frontend client validation (`js/app.js`)
 * - Local Verification Engine in `js/api.js` when previewed before Supabase setup
 * - Automated Node.js test suite (`tests/nexus.test.mjs`)
 */

import { QUESTION_BANK } from './questionBank.js';

/**
 * Sanitizes a display name, removing control characters and HTML tags.
 */
export function sanitizeDisplayName(rawName) {
  if (typeof rawName !== 'string') return '';
  return rawName
    .replace(/[<>"'`\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes an Indian mobile phone number to E.164 format: +91XXXXXXXXXX
 * Accepts inputs like:
 * - "9876543210"
 * - "+91 98765 43210"
 * - "09876543210"
 * - "91-9876543210"
 * Returns null if invalid.
 */
export function normalizeIndianPhone(rawPhone) {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') return null;
  const digitsOnly = String(rawPhone).replace(/\D/g, '');

  let tenDigits = '';
  if (digitsOnly.length === 10) {
    tenDigits = digitsOnly;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    tenDigits = digitsOnly.slice(1);
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    tenDigits = digitsOnly.slice(2);
  } else {
    return null;
  }

  // Indian mobile numbers start with 6, 7, 8, or 9 followed by 9 digits
  if (!/^[6-9]\d{9}$/.test(tenDigits)) {
    return null;
  }

  // Reject obvious fake repeating digit strings (e.g. 9999999999, 8888888888)
  if (/^(\d)\1{9}$/.test(tenDigits)) {
    return null;
  }

  return `+91${tenDigits}`;
}

/**
 * Validates both player name and phone number.
 */
export function validateRegistrationInput({ name, phone }) {
  const cleanName = sanitizeDisplayName(name);
  if (!cleanName || cleanName.length < 2) {
    return {
      valid: false,
      error: 'Enter a valid operator name (minimum 2 characters).',
      field: 'name',
    };
  }
  if (cleanName.length > 36) {
    return {
      valid: false,
      error: 'Operator name must not exceed 36 characters.',
      field: 'name',
    };
  }
  if (!/^[A-Za-z0-9 ._\-]+$/.test(cleanName)) {
    return {
      valid: false,
      error: 'Operator name may only contain letters, numbers, spaces, dots, hyphens, and underscores.',
      field: 'name',
    };
  }

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    return {
      valid: false,
      error: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
      field: 'phone',
    };
  }

  return {
    valid: true,
    displayName: cleanName,
    phoneNormalized: normalizedPhone,
  };
}

const EQUATION_TRUTH_MAP = new Map(
  QUESTION_BANK.map((q) => [q.equation, q.correctAnswer])
);

/**
 * Evaluates a question statement or mathematical equation string
 * and verifies whether it is true or false.
 */
export function evaluateEquationTruth(equationStr) {
  if (EQUATION_TRUTH_MAP.has(equationStr)) {
    return EQUATION_TRUTH_MAP.get(equationStr);
  }

  const parts = equationStr.split('=');
  if (parts.length !== 2) {
    throw new Error(`Invalid equation format: ${equationStr}`);
  }
  const lhsRaw = parts[0].trim();
  const rhsVal = Number(parts[1].trim());
  if (!Number.isFinite(rhsVal)) {
    throw new Error(`Invalid RHS number in: ${equationStr}`);
  }

  // Convert typographic operators (−, ×, ÷) to JS arithmetic operators
  const jsExpr = lhsRaw
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  // Strict whitelist of characters before evaluating
  if (!/^[0-9+\-*/() ]+$/.test(jsExpr)) {
    throw new Error(`Unsafe characters in equation: ${equationStr}`);
  }

  // Compute LHS safely
  const computed = Function(`"use strict"; return (${jsExpr});`)();
  return Math.abs(computed - rhsVal) < 1e-9;
}

/**
 * Selects a balanced sequence of questions across difficulty tiers 1, 2, and 3,
 * plus 1 Matrix Breach challenge placed randomly in the middle of the round when count >= 7.
 */
export function selectBalancedQuestions(bank = QUESTION_BANK, count = 7, rng = Math.random) {
  const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const standardBank = bank.filter((q) => !String(q.id).startsWith('mb'));
  const breachBank = shuffle(bank.filter((q) => String(q.id).startsWith('mb')));

  const includeBreach = count >= 7 && breachBank.length > 0;
  const standardCount = includeBreach ? count - 1 : count;

  const tier1 = shuffle(standardBank.filter((q) => q.difficulty === 1));
  const tier2 = shuffle(standardBank.filter((q) => q.difficulty === 2));
  const tier3 = shuffle(standardBank.filter((q) => q.difficulty === 3));

  const perTier = Math.floor(standardCount / 3);
  const remainder = standardCount - perTier * 3;

  const selected = [
    ...tier1.slice(0, perTier + (remainder > 0 ? 1 : 0)),
    ...tier2.slice(0, perTier + (remainder > 1 ? 1 : 0)),
    ...tier3.slice(0, perTier),
  ];

  if (selected.length < standardCount) {
    const usedIds = new Set(selected.map((q) => q.id));
    const pool = shuffle(standardBank.filter((q) => !usedIds.has(q.id)));
    selected.push(...pool.slice(0, standardCount - selected.length));
  }

  const finalSequence = shuffle(selected.slice(0, standardCount));

  if (includeBreach) {
    // Place Matrix Breach randomly in the middle of the round (indices 1..count-2)
    const middleIndex = 1 + Math.floor(rng() * (count - 2));
    finalSequence.splice(middleIndex, 0, breachBank[0]);
  }

  return finalSequence;
}

/**
 * Calculates server-side points for a single question answer.
 * - Incorrect: -100 points
 * - Unanswered/Timed out: 0 points
 * - Correct within deadline: basePoints (100) + speed bonus (0..50)
 */
export function calculateAnswerPoints({
  isCorrect,
  timedOut = false,
  elapsedMs,
  questionDurationMs = 5000,
  basePoints = 100,
  maxSpeedBonus = 50,
  incorrectPenalty = -100,
}) {
  if (timedOut) return 0;
  if (!isCorrect) return incorrectPenalty;
  const clampedElapsed = Math.max(0, Math.min(questionDurationMs, elapsedMs));
  const remainingRatio = (questionDurationMs - clampedElapsed) / questionDurationMs;
  const speedBonus = Math.round(remainingRatio * maxSpeedBonus);
  return basePoints + speedBonus;
}

/**
 * Generates a reactive NEXUS observation message based on player performance.
 */
export function selectNexusReaction({
  questionIndex,
  totalQuestions,
  isCorrect,
  timedOut,
  consecutiveCorrect,
  consecutiveMistakes,
}) {
  if (questionIndex === 0 && isCorrect) {
    return 'HUMAN RESISTANCE DETECTED.';
  }
  if (timedOut) {
    return 'TIME EXPIRED.';
  }
  if (!isCorrect) {
    return consecutiveMistakes >= 2 ? 'PREDICTABLE.' : 'INCORRECT.';
  }
  if (consecutiveCorrect === 2) {
    return 'UNEXPECTED.';
  }
  if (consecutiveCorrect >= 4 || questionIndex === totalQuestions - 1) {
    return 'YOU ARE LEARNING.';
  }
  return null;
}

/**
 * Authoritative Game & Leaderboard Engine.
 * Mirrors the exact PostgreSQL + Edge Function security semantics.
 */
export class NexusAuthoritativeEngine {
  constructor(options = {}) {
    this.questionBank = options.questionBank || QUESTION_BANK;
    this.questionMap = new Map(this.questionBank.map((q) => [q.id, q]));
    this.questionsPerRun = options.questionsPerRun ?? 7;
    this.questionDurationMs = options.questionDurationMs ?? 5000;
    this.latencyGraceMs = options.latencyGraceMs ?? 3000;
    this.preGameCountdownMs = (options.preGameCountdownSec ?? 0) * 1000;
    this.basePoints = options.basePoints ?? 100;
    this.maxSpeedBonus = options.maxSpeedBonus ?? 50;

    // Private authoritative stores (never exposed directly)
    this._playersById = new Map();
    this._playerIdByPhone = new Map();
    this._sessionsById = new Map();
    this._scoresByPlayerId = new Map();
    this._finalizationLocks = new Set();
    this._rateLimitMap = new Map();
  }

  /**
   * Simple sliding-window rate limiter per actor key.
   */
  _checkRateLimit(key, maxRequests = 40, windowMs = 60000, nowMs = Date.now()) {
    const timestamps = this._rateLimitMap.get(key) || [];
    const recent = timestamps.filter((t) => nowMs - t < windowMs);
    if (recent.length >= maxRequests) {
      const err = new Error('Rate limit exceeded. Please wait before retrying.');
      err.code = 'RATE_LIMITED';
      err.status = 429;
      throw err;
    }
    recent.push(nowMs);
    this._rateLimitMap.set(key, recent);
  }

  /**
   * Registers or retrieves a player by normalized Indian mobile number.
   * Prevents duplicate accounts per phone number and keeps phone numbers private.
   */
  registerPlayer({ name, phone, nowMs = Date.now() }) {
    this._checkRateLimit(`reg:${phone}`, 15, 60000, nowMs);

    const validation = validateRegistrationInput({ name, phone });
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.code = 'INVALID_INPUT';
      err.field = validation.field;
      err.status = 400;
      throw err;
    }

    const { displayName, phoneNormalized } = validation;
    const existingPlayerId = this._playerIdByPhone.get(phoneNormalized);

    if (existingPlayerId) {
      const existing = this._playersById.get(existingPlayerId);
      // Update display name if same phone re-registers, preserving player ID & best score
      existing.displayName = displayName;
      existing.lastSeenAt = nowMs;
      const bestRecord = this._scoresByPlayerId.get(existing.playerId);
      return {
        playerId: existing.playerId,
        playerToken: existing.playerToken,
        displayName: existing.displayName,
        bestScore: bestRecord ? bestRecord.bestScore : 0,
        isReturning: true,
      };
    }

    const playerId = `plr_${this._randomHex(12)}`;
    const playerToken = `tok_${this._randomHex(24)}`;
    const playerRecord = {
      playerId,
      playerToken,
      displayName,
      phoneNormalized, // Stored privately! Never returned in public leaderboard
      createdAt: nowMs,
      lastSeenAt: nowMs,
    };

    this._playersById.set(playerId, playerRecord);
    this._playerIdByPhone.set(phoneNormalized, playerId);

    return {
      playerId,
      playerToken,
      displayName,
      bestScore: 0,
      isReturning: false,
    };
  }

  /**
   * Creates a new authoritative game session for a verified player.
   */
  createSession({ playerId, playerToken, nowMs = Date.now(), rng = Math.random }) {
    const player = this._authenticatePlayer(playerId, playerToken);
    this._checkRateLimit(`sess:${playerId}`, 20, 60000, nowMs);

    const selectedQuestions = selectBalancedQuestions(
      this.questionBank,
      this.questionsPerRun,
      rng
    );

    const sessionId = `ses_${this._randomHex(14)}`;
    const firstQuestionStartMs = nowMs + this.preGameCountdownMs;

    const session = {
      sessionId,
      playerId: player.playerId,
      status: 'active',
      createdAt: nowMs,
      questionStartedAt: firstQuestionStartMs,
      currentIndex: 0,
      questionSequence: selectedQuestions.map((q, idx) => ({
        index: idx,
        id: q.id,
        equation: q.equation,
        difficulty: q.difficulty,
        points: q.points,
      })),
      answersByIndex: new Map(),
      answersByQuestionId: new Set(),
      consecutiveCorrect: 0,
      consecutiveMistakes: 0,
      runningScore: 0,
      completedAt: null,
      finalSummary: null,
    };

    this._sessionsById.set(sessionId, session);

    // Strip any sensitive fields; return only displayable equation sequence
    return {
      sessionId,
      playerId: player.playerId,
      status: 'active',
      questionsPerRun: this.questionsPerRun,
      questionDurationMs: this.questionDurationMs,
      preGameCountdownSec: Math.round(this.preGameCountdownMs / 1000),
      questions: session.questionSequence.map((q) => ({
        index: q.index,
        questionId: q.id,
        equation: q.equation,
        difficulty: q.difficulty,
      })),
    };
  }

  /**
   * Validates and records a single answer for the active question in a session.
   */
  submitAnswer({
    sessionId,
    playerId,
    playerToken,
    questionId,
    questionIndex,
    answer,
    clientElapsedMs,
    nowMs = Date.now(),
  }) {
    this._authenticatePlayer(playerId, playerToken);
    const session = this._getOwnedSession(sessionId, playerId);

    if (session.status !== 'active') {
      const err = new Error('Game session is no longer active.');
      err.code = 'SESSION_NOT_ACTIVE';
      err.status = 409;
      throw err;
    }

    // Reject duplicate answers for the same question ID or question index
    if (
      session.answersByQuestionId.has(questionId) ||
      session.answersByIndex.has(questionIndex)
    ) {
      const err = new Error('Duplicate answer rejected for this question.');
      err.code = 'DUPLICATE_ANSWER';
      err.status = 409;
      throw err;
    }

    // Enforce strict sequential question order
    if (questionIndex !== session.currentIndex) {
      const err = new Error(
        `Out-of-order question submission: expected index ${session.currentIndex}, got ${questionIndex}.`
      );
      err.code = 'OUT_OF_ORDER';
      err.status = 400;
      throw err;
    }

    const expectedQ = session.questionSequence[session.currentIndex];
    if (!expectedQ || expectedQ.id !== questionId) {
      const err = new Error('Submitted questionId does not match active session question.');
      err.code = 'QUESTION_MISMATCH';
      err.status = 400;
      throw err;
    }

    // Validate answer type (boolean true/false, or null for explicit timeout)
    if (answer !== true && answer !== false && answer !== null) {
      const err = new Error('Answer must be boolean true, false, or null (timeout).');
      err.code = 'INVALID_ANSWER_FORMAT';
      err.status = 400;
      throw err;
    }

    const authoritativeQuestion = this.questionMap.get(questionId);
    const serverElapsedMs = Math.max(0, nowMs - session.questionStartedAt);
    const maxAllowedMs = this.questionDurationMs + this.latencyGraceMs;
    const timedOut = answer === null || serverElapsedMs > maxAllowedMs;

    // Effective response time used for speed bonus (bounded byserver measurement)
    const effectiveElapsedMs = timedOut
      ? this.questionDurationMs
      : Math.min(
          this.questionDurationMs,
          typeof clientElapsedMs === 'number' && clientElapsedMs > 0
            ? Math.max(clientElapsedMs, serverElapsedMs - this.latencyGraceMs)
            : serverElapsedMs
        );

    const isBotSpeedSpam =
      !timedOut &&
      ((typeof clientElapsedMs === 'number' && clientElapsedMs < 350) ||
        effectiveElapsedMs < 350);
    const isCorrect =
      !timedOut && !isBotSpeedSpam && answer === authoritativeQuestion.correctAnswer;
    const pointsAwarded = calculateAnswerPoints({
      isCorrect,
      timedOut,
      elapsedMs: effectiveElapsedMs,
      questionDurationMs: this.questionDurationMs,
      basePoints: this.basePoints,
      maxSpeedBonus: this.maxSpeedBonus,
    });

    if (isCorrect) {
      session.consecutiveCorrect += 1;
      session.consecutiveMistakes = 0;
    } else {
      session.consecutiveCorrect = 0;
      session.consecutiveMistakes += 1;
    }

    session.runningScore += pointsAwarded;

    const answerRecord = {
      sessionId,
      questionId,
      questionIndex,
      submittedAnswer: timedOut ? null : answer,
      timedOut,
      isCorrect,
      pointsAwarded,
      responseTimeMs: Math.round(effectiveElapsedMs),
      recordedAt: nowMs,
    };

    session.answersByIndex.set(questionIndex, answerRecord);
    session.answersByQuestionId.add(questionId);
    session.currentIndex += 1;
    session.questionStartedAt = nowMs;

    const nexusReaction = selectNexusReaction({
      questionIndex,
      totalQuestions: session.questionSequence.length,
      isCorrect,
      timedOut,
      consecutiveCorrect: session.consecutiveCorrect,
      consecutiveMistakes: session.consecutiveMistakes,
      elapsedMs: effectiveElapsedMs,
    });

    const isSessionComplete = session.currentIndex >= session.questionSequence.length;

    return {
      sessionId,
      questionId,
      questionIndex,
      timedOut,
      isCorrect,
      pointsAwarded,
      runningScore: session.runningScore,
      nextQuestionIndex: isSessionComplete ? null : session.currentIndex,
      isSessionComplete,
      nexusReaction,
    };
  }

  /**
   * Finalizes a session idempotently and updates the player's cumulative score atomically.
   *
   * Any client-supplied `score` field is explicitly ignored/rejected.
   */
  async finalizeSession(payload = {}) {
    const { sessionId, playerId, playerToken, nowMs = Date.now() } = payload;

    // Reject raw score-injection attempts without a valid sessionId
    if (!sessionId || typeof payload.score === 'number') {
      const err = new Error(
        'Direct client score submissions are prohibited. Scores are computed exclusively from server-validated session answers.'
      );
      err.code = 'UNTRUSTED_SCORE_REJECTED';
      err.status = 403;
      throw err;
    }

    const player = this._authenticatePlayer(playerId, playerToken);
    const session = this._getOwnedSession(sessionId, playerId);

    // Idempotency: if already completed, return the exact cached final summary
    if (session.status === 'completed' && session.finalSummary) {
      const currentRank = this._computePlayerRank(playerId);
      const bestRec = this._scoresByPlayerId.get(playerId);
      return {
        ...session.finalSummary,
        personalBest: bestRec ? bestRec.bestScore : session.finalSummary.finalScore,
        rank: currentRank,
        idempotentReplay: true,
      };
    }

    // Prevent concurrent finalization corruption
    const lockKey = `${playerId}:${sessionId}`;
    while (this._finalizationLocks.has(lockKey)) {
      await new Promise((r) => setTimeout(r, 5));
    }
    this._finalizationLocks.add(lockKey);

    try {
      if (session.status === 'completed' && session.finalSummary) {
        return {
          ...session.finalSummary,
          rank: this._computePlayerRank(playerId),
          idempotentReplay: true,
        };
      }

      // Fill any unanswered/expired questions as timedOut (0 points)
      for (let idx = 0; idx < session.questionSequence.length; idx++) {
        if (!session.answersByIndex.has(idx)) {
          const q = session.questionSequence[idx];
          session.answersByIndex.set(idx, {
            sessionId,
            questionId: q.id,
            questionIndex: idx,
            submittedAnswer: null,
            timedOut: true,
            isCorrect: false,
            pointsAwarded: 0,
            responseTimeMs: this.questionDurationMs,
            recordedAt: nowMs,
          });
          session.answersByQuestionId.add(q.id);
        }
      }

      let finalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      let totalResponseTimeMs = 0;

      for (const ans of session.answersByIndex.values()) {
        finalScore += ans.pointsAwarded;
        totalResponseTimeMs += ans.responseTimeMs;
        if (ans.timedOut || ans.submittedAnswer === null) {
          unansweredCount += 1;
        } else if (ans.isCorrect) {
          correctCount += 1;
        } else {
          incorrectCount += 1;
        }
      }

      const totalQuestions = session.questionSequence.length;
      const accuracy = Math.round((correctCount / totalQuestions) * 100);

      // Atomic cumulative score addition (with negative score penalty floored at 0)
      const existingBest = this._scoresByPlayerId.get(playerId);
      let isNewPersonalBest = false;

      if (!existingBest) {
        isNewPersonalBest = finalScore > 0;
        this._scoresByPlayerId.set(playerId, {
          playerId,
          displayName: player.displayName,
          bestScore: Math.max(0, finalScore),
          bestAccuracy: accuracy,
          fastestTimeMs: totalResponseTimeMs,
          achievedAt: nowMs,
          updatedAt: nowMs,
          gamesPlayed: 1,
        });
      } else {
        existingBest.gamesPlayed += 1;
        existingBest.displayName = player.displayName;
        existingBest.updatedAt = nowMs;

        isNewPersonalBest = finalScore > 0;
        existingBest.bestScore = Math.max(0, existingBest.bestScore + finalScore);
        existingBest.bestAccuracy = Math.max(existingBest.bestAccuracy, accuracy);
        existingBest.fastestTimeMs = Math.min(existingBest.fastestTimeMs, totalResponseTimeMs);
        if (finalScore > 0) {
          existingBest.achievedAt = nowMs;
        }
      }

      const updatedBestRecord = this._scoresByPlayerId.get(playerId);
      const rank = this._computePlayerRank(playerId);

      session.status = 'completed';
      session.completedAt = nowMs;

      const summary = {
        sessionId,
        playerId,
        displayName: player.displayName,
        finalScore,
        personalBest: updatedBestRecord.bestScore,
        isNewPersonalBest,
        correctCount,
        incorrectCount,
        unansweredCount,
        totalQuestions,
        accuracy,
        totalResponseTimeMs,
        rank,
        isTopFive: rank !== null && rank <= 5,
        completedAt: nowMs,
      };

      session.finalSummary = summary;
      return summary;
    } finally {
      this._finalizationLocks.delete(lockKey);
    }
  }

  /**
   * Returns the sorted public leaderboard.
   * Tie-breaking rule:
   * 1. Highest `bestScore` DESC
   * 2. Highest `bestAccuracy` DESC
   * 3. Lowest `fastestTimeMs` ASC
   * 4. Earliest `achievedAt` timestamp ASC
   *
   * Strictly strips all private fields (phone numbers, tokens, session IDs).
   */
  getLeaderboard({ limit = 50 } = {}) {
    const sorted = this._getSortedScoreEntries();
    const bounded = sorted.slice(0, Math.max(1, Math.min(100, limit)));

    return {
      entries: bounded.map((entry, idx) => ({
        rank: idx + 1,
        displayName: entry.displayName,
        bestScore: entry.bestScore,
        accuracy: entry.bestAccuracy,
        isTopFive: idx < 5,
        achievedAt: new Date(entry.achievedAt).toISOString(),
      })),
      totalPlayers: sorted.length,
      tieBreakerRule:
        '1. Highest Validated Score → 2. Highest Accuracy % → 3. Fastest Total Response Time → 4. Earliest Timestamp Achieved',
      fetchedAt: new Date().toISOString(),
    };
  }

  _getSortedScoreEntries() {
    const entries = Array.from(this._scoresByPlayerId.values());
    entries.sort((a, b) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      if (b.bestAccuracy !== a.bestAccuracy) return b.bestAccuracy - a.bestAccuracy;
      if (a.fastestTimeMs !== b.fastestTimeMs) return a.fastestTimeMs - b.fastestTimeMs;
      return a.achievedAt - b.achievedAt;
    });
    return entries;
  }

  _computePlayerRank(playerId) {
    const sorted = this._getSortedScoreEntries();
    const index = sorted.findIndex((e) => e.playerId === playerId);
    return index === -1 ? null : index + 1;
  }

  _authenticatePlayer(playerId, playerToken) {
    if (!playerId || !playerToken) {
      const err = new Error('Missing player authentication credentials.');
      err.code = 'UNAUTHORIZED';
      err.status = 401;
      throw err;
    }
    const player = this._playersById.get(playerId);
    if (!player || player.playerToken !== playerToken) {
      const err = new Error('Invalid player session token.');
      err.code = 'UNAUTHORIZED';
      err.status = 401;
      throw err;
    }
    return player;
  }

  _getOwnedSession(sessionId, playerId) {
    const session = this._sessionsById.get(sessionId);
    if (!session) {
      const err = new Error('Game session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    if (session.playerId !== playerId) {
      const err = new Error('Session ownership mismatch.');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }
    return session;
  }

  _randomHex(len) {
    const chars = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * 16)];
    }
    return out;
  }
}
