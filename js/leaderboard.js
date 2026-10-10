/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Public Leaderboard Controller
 *
 * Responsibilities:
 * - Fetches top validated player rankings from the backend (`get-leaderboard`)
 * - Highlights the Top 5 qualifiers who earn extra Resistance Credits in the
 *   main Cyber Quest event
 * - Auto-refreshes every 12 seconds while the leaderboard screen is visible
 * - Renders Loading, Empty, Offline, and Error states cleanly
 * - Uses strict `textContent` DOM creation to prevent XSS and never renders
 *   private phone numbers or session identifiers
 */

import { CONFIG } from './config.js';

export class NexusLeaderboardController {
  constructor({ apiClient }) {
    this.api = apiClient;
    this.pollIntervalId = null;
    this.isFetching = false;
    this.currentPlayerName = null;

    this.els = {
      statusBadge: document.getElementById('leaderboard-sync-status'),
      lastUpdatedText: document.getElementById('leaderboard-last-updated'),
      btnRefresh: document.getElementById('btn-refresh-leaderboard'),

      stateLoading: document.getElementById('leaderboard-state-loading'),
      stateEmpty: document.getElementById('leaderboard-state-empty'),
      stateOffline: document.getElementById('leaderboard-state-offline'),
      stateError: document.getElementById('leaderboard-state-error'),
      errorMessageText: document.getElementById('leaderboard-error-text'),
      btnRetryError: document.getElementById('btn-leaderboard-retry'),

      tableWrapper: document.getElementById('leaderboard-table-wrapper'),
      tbody: document.getElementById('leaderboard-tbody'),
      totalOperatorsCount: document.getElementById('leaderboard-total-count'),
    };

    this._bindEvents();
  }

  _bindEvents() {
    if (this.els.btnRefresh) {
      this.els.btnRefresh.addEventListener('click', () => {
        this.refresh({ showFullLoader: false });
      });
    }
    if (this.els.btnRetryError) {
      this.els.btnRetryError.addEventListener('click', () => {
        this.refresh({ showFullLoader: true });
      });
    }
    window.addEventListener('online', () => {
      if (this.pollIntervalId) {
        this.refresh({ showFullLoader: false });
      }
    });
    window.addEventListener('offline', () => {
      if (this.pollIntervalId) {
        this._setViewState('offline');
      }
    });
  }

  setCurrentPlayerHighlight(displayName) {
    this.currentPlayerName = displayName || null;
  }

  /**
   * Starts automatic polling every 12 seconds when the leaderboard screen opens.
   */
  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refresh({ showFullLoader: true });
    this.pollIntervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refresh({ showFullLoader: false });
      }
    }, CONFIG.LEADERBOARD.REFRESH_INTERVAL_MS);
  }

  stopAutoRefresh() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  async refresh({ showFullLoader = false } = {}) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this._setViewState('offline');
      this.isFetching = false;
      return;
    }

    if (showFullLoader && (!this.els.tbody || this.els.tbody.children.length === 0)) {
      this._setViewState('loading');
    } else if (this.els.statusBadge) {
      this.els.statusBadge.textContent = 'SYNCING TELEMETRY...';
    }

    try {
      const response = await this.api.getLeaderboard({
        limit: CONFIG.LEADERBOARD.LIMIT,
      });

      const entries = Array.isArray(response?.entries) ? response.entries : [];
      if (this.els.totalOperatorsCount) {
        this.els.totalOperatorsCount.textContent = String(
          response?.totalPlayers ?? entries.length
        );
      }

      if (entries.length === 0) {
        this._setViewState('empty');
      } else {
        this._renderRows(entries);
        this._setViewState('table');
      }

      if (this.els.statusBadge) {
        this.els.statusBadge.textContent = 'LIVE SYNC // 12S';
      }
      if (this.els.lastUpdatedText) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        this.els.lastUpdatedText.textContent = `UPDATED ${timeStr}`;
      }
    } catch (err) {
      if (err.code === 'OFFLINE' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        this._setViewState('offline');
      } else {
        if (this.els.errorMessageText) {
          this.els.errorMessageText.textContent =
            err.message || 'Unable to reach NEXUS ranking telemetry.';
        }
        this._setViewState('error');
      }
    } finally {
      this.isFetching = false;
    }
  }

  _setViewState(state) {
    const states = {
      loading: this.els.stateLoading,
      empty: this.els.stateEmpty,
      offline: this.els.stateOffline,
      error: this.els.stateError,
      table: this.els.tableWrapper,
    };

    for (const [key, el] of Object.entries(states)) {
      if (el) {
        el.hidden = key !== state;
      }
    }
  }

  _renderRows(entries) {
    if (!this.els.tbody) return;
    this.els.tbody.textContent = '';

    const fragment = document.createDocumentFragment();

    entries.forEach((item, index) => {
      const rank = typeof item.rank === 'number' ? item.rank : index + 1;
      const isTopFive = rank <= CONFIG.LEADERBOARD.TOP_QUALIFIERS_COUNT;
      const isCurrentUser =
        this.currentPlayerName &&
        item.displayName?.toLowerCase() === this.currentPlayerName.toLowerCase();

      const tr = document.createElement('tr');
      tr.className = [
        'leaderboard-row',
        isTopFive ? 'is-top-five' : '',
        rank === 1 ? 'is-rank-one' : '',
        isCurrentUser ? 'is-current-operator' : '',
      ]
        .filter(Boolean)
        .join(' ');

      // 1. Rank cell
      const tdRank = document.createElement('td');
      tdRank.className = 'col-rank';
      const rankBadge = document.createElement('span');
      rankBadge.className = 'rank-badge';
      rankBadge.textContent = `#${String(rank).padStart(2, '0')}`;
      tdRank.appendChild(rankBadge);

      // 2. Public Operator Name + Top 5 Qualifier tag
      const tdName = document.createElement('td');
      tdName.className = 'col-operator';
      const nameWrap = document.createElement('div');
      nameWrap.className = 'operator-name-wrap';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'operator-name';
      nameSpan.textContent = String(item.displayName || 'UNKNOWN OPERATOR');
      nameWrap.appendChild(nameSpan);

      if (isTopFive) {
        const creditTag = document.createElement('span');
        creditTag.className = 'top-five-pill';
        creditTag.textContent = 'TEAM BONUS QUALIFIER';
        nameWrap.appendChild(creditTag);
      }

      if (isCurrentUser) {
        const youTag = document.createElement('span');
        youTag.className = 'you-pill';
        youTag.textContent = 'YOU';
        nameWrap.appendChild(youTag);
      }

      tdName.appendChild(nameWrap);

      // 3. Accuracy cell
      const tdAcc = document.createElement('td');
      tdAcc.className = 'col-accuracy';
      tdAcc.textContent =
        typeof item.accuracy === 'number' ? `${item.accuracy}%` : '—';

      // 4. Validated Best Score cell
      const tdScore = document.createElement('td');
      tdScore.className = 'col-score';
      const scoreVal = document.createElement('span');
      scoreVal.className = 'score-value';
      scoreVal.textContent = Number(item.bestScore || 0).toLocaleString();
      tdScore.appendChild(scoreVal);

      tr.appendChild(tdRank);
      tr.appendChild(tdName);
      tr.appendChild(tdAcc);
      tr.appendChild(tdScore);

      fragment.appendChild(tr);
    });

    this.els.tbody.appendChild(fragment);
  }
}
