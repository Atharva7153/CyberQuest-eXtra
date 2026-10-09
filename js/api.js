/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Backend API Client & Zero-Lag Network Layer
 *
 * Designed for instant 0ms UI responsiveness:
 * - Zero artificial delays in local verification mode
 * - Tracks in-flight per-question `submitAnswer` calls so gameplay UI never blocks
 *   on network round-trips between questions, while guaranteeing all answers are
 *   flushed before `finalizeSession` executes.
 */

import { CONFIG, isCloudConfigured } from './config.js';
import { NexusAuthoritativeEngine } from './coreEngine.js';

const OPERATOR_STORAGE_KEY = 'nexus_operator_session_cloud_v2';
const PENDING_FINALIZE_KEY = 'nexus_pending_finalization_v2';
const SIMULATED_SERVER_SNAPSHOT_KEY = 'nexus_local_authoritative_db_v1';

class PersistentLocalAuthoritativeAdapter {
  constructor() {
    this.engine = new NexusAuthoritativeEngine({
      questionsPerRun: CONFIG.GAME.QUESTIONS_PER_RUN,
      questionDurationMs: CONFIG.GAME.QUESTION_DURATION_MS,
      latencyGraceMs: CONFIG.GAME.SERVER_LATENCY_GRACE_MS,
      preGameCountdownSec: CONFIG.GAME.PRE_GAME_COUNTDOWN_SEC,
      basePoints: CONFIG.GAME.BASE_POINTS_CORRECT,
      maxSpeedBonus: CONFIG.GAME.MAX_SPEED_BONUS,
    });
    this._restoreSnapshot();
  }

  _restoreSnapshot() {
    try {
      const raw = localStorage.getItem(SIMULATED_SERVER_SNAPSHOT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.players)) {
        for (const [k, v] of parsed.players) {
          this.engine._playersById.set(k, v);
          if (v?.phoneNormalized) {
            this.engine._playerIdByPhone.set(v.phoneNormalized, k);
          }
        }
      }
      if (Array.isArray(parsed.scores)) {
        for (const [k, v] of parsed.scores) {
          this.engine._scoresByPlayerId.set(k, v);
        }
      }
    } catch (_) {
      // Ignore storage parse issues
    }
  }

  _saveSnapshot() {
    try {
      const payload = {
        players: Array.from(this.engine._playersById.entries()),
        scores: Array.from(this.engine._scoresByPlayerId.entries()),
      };
      localStorage.setItem(SIMULATED_SERVER_SNAPSHOT_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignore storage quota errors
    }
  }

  registerPlayer(body) {
    const res = this.engine.registerPlayer(body);
    this._saveSnapshot();
    return res;
  }

  createSession(body) {
    return this.engine.createSession(body);
  }

  submitAnswer(body) {
    return this.engine.submitAnswer(body);
  }

  async finalizeSession(body) {
    const res = await this.engine.finalizeSession(body);
    this._saveSnapshot();
    return res;
  }

  getLeaderboard(params) {
    return this.engine.getLeaderboard(params);
  }
}

export class NexusApiClient {
  constructor(config = CONFIG) {
    this.config = config;
    this.localAdapter = new PersistentLocalAuthoritativeAdapter();
    this._inFlightAnswersBySession = new Map();
  }

  get isCloudMode() {
    return isCloudConfigured(this.config);
  }

  get functionsBaseUrl() {
    return `${this.config.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
  }

  getStoredOperator() {
    try {
      const raw =
        sessionStorage.getItem(OPERATOR_STORAGE_KEY) ||
        localStorage.getItem(OPERATOR_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.playerId && parsed?.playerToken && parsed?.displayName) {
        return parsed;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  saveStoredOperator({ playerId, playerToken, displayName }) {
    const safeRecord = {
      playerId,
      playerToken,
      displayName,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify(safeRecord));
      localStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify(safeRecord));
    } catch (_) {
      // Ignore
    }
  }

  clearStoredOperator() {
    try {
      sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
      localStorage.removeItem(OPERATOR_STORAGE_KEY);
    } catch (_) {
      // Ignore
    }
  }

  savePendingFinalization({ sessionId, playerId, playerToken }) {
    try {
      sessionStorage.setItem(
        PENDING_FINALIZE_KEY,
        JSON.stringify({ sessionId, playerId, playerToken, queuedAt: Date.now() })
      );
    } catch (_) {
      // Ignore
    }
  }

  getPendingFinalization() {
    try {
      const raw = sessionStorage.getItem(PENDING_FINALIZE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  clearPendingFinalization() {
    try {
      sessionStorage.removeItem(PENDING_FINALIZE_KEY);
    } catch (_) {
      // Ignore
    }
  }

  async registerPlayer({ name, phone }) {
    if (!this.isCloudMode) {
      const result = this.localAdapter.registerPlayer({ name, phone });
      this.saveStoredOperator(result);
      return result;
    }

    const result = await this._requestWithRetry(
      this.config.ENDPOINTS.REGISTER_PLAYER,
      {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      },
      `reg:${name}:${phone.slice(-4)}`
    );

    this.saveStoredOperator(result);
    return result;
  }

  async createSession({ playerId, playerToken }) {
    if (!this.isCloudMode) {
      return this.localAdapter.createSession({ playerId, playerToken });
    }

    return this._requestWithRetry(
      this.config.ENDPOINTS.CREATE_SESSION,
      {
        method: 'POST',
        headers: { 'X-Player-Token': playerToken },
        body: JSON.stringify({ playerId, playerToken }),
      },
      `create:${playerId}:${Date.now()}`
    );
  }

  /**
   * Submits an answer and tracks the promise per session so `finalizeSession`
   * waits for all sequential answers to finish even when the UI advances immediately.
   */
  submitAnswer({
    sessionId,
    playerId,
    playerToken,
    questionId,
    questionIndex,
    answer,
    clientElapsedMs,
  }) {
    if (!this.isCloudMode) {
      return Promise.resolve(
        this.localAdapter.submitAnswer({
          sessionId,
          playerId,
          playerToken,
          questionId,
          questionIndex,
          answer,
          clientElapsedMs,
        })
      );
    }

    const prevChain = this._inFlightAnswersBySession.get(sessionId) || Promise.resolve();
    const nextChain = prevChain
      .catch(() => {})
      .then(() =>
        this._requestWithRetry(
          this.config.ENDPOINTS.SUBMIT_ANSWER,
          {
            method: 'POST',
            headers: { 'X-Player-Token': playerToken },
            body: JSON.stringify({
              sessionId,
              playerId,
              playerToken,
              questionId,
              questionIndex,
              answer,
              clientElapsedMs,
            }),
          },
          `ans:${sessionId}:${questionIndex}`
        )
      );

    this._inFlightAnswersBySession.set(sessionId, nextChain);
    return nextChain;
  }

  async finalizeSession({ sessionId, playerId, playerToken }) {
    this.savePendingFinalization({ sessionId, playerId, playerToken });

    try {
      // Wait for any background answer submissions to settle first
      const pendingAnswers = this._inFlightAnswersBySession.get(sessionId);
      if (pendingAnswers) {
        await pendingAnswers.catch(() => {});
        this._inFlightAnswersBySession.delete(sessionId);
      }

      let result;
      if (!this.isCloudMode) {
        result = await this.localAdapter.finalizeSession({
          sessionId,
          playerId,
          playerToken,
        });
      } else {
        result = await this._requestWithRetry(
          this.config.ENDPOINTS.FINALIZE_SESSION,
          {
            method: 'POST',
            headers: { 'X-Player-Token': playerToken },
            body: JSON.stringify({ sessionId, playerId, playerToken }),
          },
          `fin:${sessionId}`
        );
      }

      this.clearPendingFinalization();
      return result;
    } catch (err) {
      throw err;
    }
  }

  async getLeaderboard({ limit = this.config.LEADERBOARD.LIMIT } = {}) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const offlineErr = new Error('Network offline.');
      offlineErr.code = 'OFFLINE';
      throw offlineErr;
    }

    if (!this.isCloudMode) {
      return this.localAdapter.getLeaderboard({ limit });
    }

    const query = `?limit=${encodeURIComponent(limit)}`;
    return this._requestWithRetry(
      `${this.config.ENDPOINTS.GET_LEADERBOARD}${query}`,
      { method: 'GET' },
      null,
      2
    );
  }

  async _requestWithRetry(
    endpoint,
    options = {},
    idempotencyKey = null,
    maxRetries = this.config.NETWORK.MAX_RETRIES
  ) {
    const url = `${this.functionsBaseUrl}${endpoint}`;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.NETWORK.REQUEST_TIMEOUT_MS
      );

      try {
        const headers = {
          'Content-Type': 'application/json',
          apikey: this.config.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${this.config.SUPABASE_ANON_KEY}`,
          ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
          ...(options.headers || {}),
        };

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const err = new Error(data.error || `Server error (${response.status})`);
          err.status = response.status;
          err.code = data.code || 'API_ERROR';

          const isTransient =
            response.status >= 500 || response.status === 408 || response.status === 429;
          if (isTransient && attempt < maxRetries) {
            attempt += 1;
            await this._sleep(this.config.NETWORK.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
            continue;
          }
          throw err;
        }

        return data;
      } catch (err) {
        clearTimeout(timeoutId);

        const isAbortOrNetwork =
          err.name === 'AbortError' ||
          err instanceof TypeError ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError');

        if (isAbortOrNetwork && attempt < maxRetries) {
          attempt += 1;
          await this._sleep(this.config.NETWORK.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
          continue;
        }

        throw err;
      }
    }
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new NexusApiClient(CONFIG);
