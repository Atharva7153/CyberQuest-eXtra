/**
 * CYBER QUEST EXTRA — NEXUS
 * Main Application Orchestrator (with First-Visit Animated Cutscene)
 */

import { CONFIG } from './config.js';
import { validateRegistrationInput } from './coreEngine.js';
import { apiClient } from './api.js';
import { NexusGameController } from './game.js';
import { NexusLeaderboardController } from './leaderboard.js';

const INTRO_SEEN_KEY = 'nexus_intro_seen_v1';
const CUTSCENE_DURATION_MS = 7500;

class NexusApplication {
  constructor() {
    this.api = apiClient;
    this.currentScreen = 'register';
    this.operator = this.api.getStoredOperator();
    this.lastFinalizationPayload = null;
    this.cutsceneTimerId = null;

    this.screens = {
      register: document.getElementById('screen-register'),
      game: document.getElementById('screen-game'),
      results: document.getElementById('screen-results'),
      leaderboard: document.getElementById('screen-leaderboard'),
    };

    this.els = {
      // Cutscene Elements
      introCutscene: document.getElementById('intro-cutscene'),
      btnSkipCutscene: document.getElementById('btn-skip-cutscene'),
      btnReplayCutscene: document.getElementById('btn-replay-cutscene'),

      navBrandBtn: document.getElementById('nav-brand-btn'),
      navBtnMission: document.getElementById('nav-btn-mission'),
      navBtnLeaderboard: document.getElementById('nav-btn-leaderboard'),
      headerOperatorBadge: document.getElementById('header-operator-badge'),
      headerOperatorName: document.getElementById('header-operator-name'),
      btnSwitchOperator: document.getElementById('btn-switch-operator'),
      backendModeIndicator: document.getElementById('backend-mode-indicator'),

      // Login / Start Screen
      registerForm: document.getElementById('register-form'),
      returningPanel: document.getElementById('returning-operator-panel'),
      inputName: document.getElementById('reg-player-name'),
      inputPhone: document.getElementById('reg-player-phone'),
      registerErrorBox: document.getElementById('register-error-box'),
      btnRegisterSubmit: document.getElementById('btn-register-submit'),
      btnIntroLeaderboard: document.getElementById('btn-intro-leaderboard'),
      btnOpenPrivacy: document.getElementById('btn-open-privacy'),
      privacyModal: document.getElementById('privacy-modal'),
      btnClosePrivacy: document.getElementById('btn-close-privacy'),

      briefingOperatorName: document.getElementById('briefing-operator-name'),
      btnBeginMission: document.getElementById('btn-begin-mission'),
      btnBriefingLeaderboard: document.getElementById('btn-briefing-leaderboard'),

      // Event Countdown Elements
      eventCountdownLabel: document.getElementById('event-countdown-label'),
      cdDays: document.getElementById('cd-days'),
      cdHours: document.getElementById('cd-hours'),
      cdMinutes: document.getElementById('cd-minutes'),
      cdSeconds: document.getElementById('cd-seconds'),

      // Results Screen
      resultsProcessingState: document.getElementById('results-processing-state'),
      resultsNetworkErrorState: document.getElementById('results-network-error-state'),
      resultsErrorMessage: document.getElementById('results-error-message'),
      btnRetryConfirmation: document.getElementById('btn-retry-confirmation'),
      resultsConfirmedContent: document.getElementById('results-confirmed-content'),

      resFinalScore: document.getElementById('res-final-score'),
      resPersonalBest: document.getElementById('res-personal-best'),
      resNewBestBadge: document.getElementById('res-new-best-badge'),
      resRank: document.getElementById('res-current-rank'),
      resTopFiveBadge: document.getElementById('res-top-five-badge'),
      resCorrect: document.getElementById('res-correct-count'),
      resIncorrect: document.getElementById('res-incorrect-count'),
      resUnanswered: document.getElementById('res-unanswered-count'),
      resAccuracy: document.getElementById('res-accuracy-value'),
      resNexusVerdict: document.getElementById('res-nexus-verdict-text'),

      btnPlayAgain: document.getElementById('btn-play-again'),
      btnResultsLeaderboard: document.getElementById('btn-results-leaderboard'),

      // Leaderboard Screen
      btnLeaderboardPlay: document.getElementById('btn-leaderboard-play'),
    };

    this.leaderboardController = new NexusLeaderboardController({
      apiClient: this.api,
    });

    this.gameController = new NexusGameController({
      apiClient: this.api,
      onSessionComplete: (payload) => this._handleSessionComplete(payload),
      onFatalError: (err) => this._handleGameError(err),
    });

    this._init();
  }

  _init() {
    this._startEventCountdown();

    if (CONFIG.MAINTENANCE_MODE) {
      document.body.classList.add('is-maintenance');
      const maintEl = document.getElementById('maintenance-overlay');
      if (maintEl) maintEl.removeAttribute('hidden');
      return;
    }

    document.body.classList.remove('is-maintenance');
    const maintEl = document.getElementById('maintenance-overlay');
    if (maintEl) maintEl.hidden = true;
    this._updateOperatorUI();
    this._updateBackendModeBadge();
    this._bindNavigationEvents();
    this._bindRegistrationEvents();
    this._recoverPendingFinalizationIfAny();

    if (window.location.hash === '#leaderboard') {
      this.navigateTo('leaderboard');
    } else {
      this.navigateTo('register');
      // Play animated cutscene automatically on first visit
      this._maybePlayFirstVisitCutscene();
    }
  }

  _startEventCountdown() {
    if (!this.els.cdDays || !this.els.cdHours || !this.els.cdMinutes || !this.els.cdSeconds) {
      return;
    }

    // Target: October 17, 10:00 AM IST (+05:30)
    const year = new Date().getFullYear();
    const targetMs = Date.parse(`${year}-10-17T10:00:00+05:30`);

    const updateClock = () => {
      const remainingMs = Math.max(0, targetMs - Date.now());

      if (remainingMs <= 0 && this.els.eventCountdownLabel) {
        this.els.eventCountdownLabel.textContent = 'CYBERQUEST IS LIVE:';
      }

      const days = Math.floor(remainingMs / 86_400_000);
      const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
      const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
      const seconds = Math.floor((remainingMs % 60_000) / 1_000);

      this.els.cdDays.textContent = String(days).padStart(2, '0');
      this.els.cdHours.textContent = String(hours).padStart(2, '0');
      this.els.cdMinutes.textContent = String(minutes).padStart(2, '0');
      this.els.cdSeconds.textContent = String(seconds).padStart(2, '0');
    };

    updateClock();
    this.eventCountdownIntervalId = window.setInterval(updateClock, 1000);
  }

  _maybePlayFirstVisitCutscene() {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch (_) {
      alreadySeen = false;
    }

    if (!alreadySeen) {
      this.playIntroCutscene();
    }
  }

  playIntroCutscene() {
    if (!this.els.introCutscene) return;
    if (this.cutsceneTimerId) {
      clearTimeout(this.cutsceneTimerId);
      this.cutsceneTimerId = null;
    }

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch (_) {
      // Ignore
    }

    // Restart CSS animations cleanly
    this.els.introCutscene.classList.remove('is-playing', 'is-closing');
    this.els.introCutscene.hidden = false;
    void this.els.introCutscene.offsetWidth;
    this.els.introCutscene.classList.add('is-playing');

    this.cutsceneTimerId = setTimeout(() => {
      this.closeIntroCutscene();
    }, CUTSCENE_DURATION_MS);
  }

  closeIntroCutscene() {
    if (!this.els.introCutscene || this.els.introCutscene.hidden) return;
    if (this.cutsceneTimerId) {
      clearTimeout(this.cutsceneTimerId);
      this.cutsceneTimerId = null;
    }

    this.els.introCutscene.classList.add('is-closing');
    setTimeout(() => {
      if (this.els.introCutscene) {
        this.els.introCutscene.hidden = true;
        this.els.introCutscene.classList.remove('is-playing', 'is-closing');
      }
    }, 360);
  }

  _updateBackendModeBadge() {
    if (!this.els.backendModeIndicator) return;
    if (this.api.isCloudMode) {
      this.els.backendModeIndicator.textContent = 'SUPABASE CLOUD ACTIVE';
      this.els.backendModeIndicator.classList.add('is-cloud');
    } else {
      this.els.backendModeIndicator.textContent = 'LOCAL FAST MODE';
      this.els.backendModeIndicator.classList.remove('is-cloud');
    }
  }

  _updateOperatorUI() {
    const isLogged = Boolean(this.operator?.displayName);

    if (this.els.headerOperatorBadge) {
      this.els.headerOperatorBadge.hidden = !isLogged;
    }
    if (this.els.registerForm) {
      this.els.registerForm.hidden = isLogged;
    }
    if (this.els.returningPanel) {
      this.els.returningPanel.hidden = !isLogged;
    }

    if (isLogged) {
      if (this.els.headerOperatorName) {
        this.els.headerOperatorName.textContent = this.operator.displayName;
      }
      if (this.els.briefingOperatorName) {
        this.els.briefingOperatorName.textContent = this.operator.displayName;
      }
      this.leaderboardController.setCurrentPlayerHighlight(this.operator.displayName);
    } else {
      this.leaderboardController.setCurrentPlayerHighlight(null);
    }
  }

  _bindNavigationEvents() {
    this.els.btnSkipCutscene?.addEventListener('click', () => {
      this.closeIntroCutscene();
    });

    this.els.btnReplayCutscene?.addEventListener('click', () => {
      this.playIntroCutscene();
    });

    window.addEventListener('keydown', (e) => {
      if (
        this.els.introCutscene &&
        !this.els.introCutscene.hidden &&
        (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')
      ) {
        e.preventDefault();
        this.closeIntroCutscene();
      }
    });

    this.els.navBrandBtn?.addEventListener('click', () => {
      if (this.currentScreen === 'game') return;
      this.navigateTo('register');
    });

    this.els.navBtnMission?.addEventListener('click', () => {
      if (this.currentScreen === 'game') return;
      this.navigateTo('register');
    });

    this.els.navBtnLeaderboard?.addEventListener('click', () => {
      if (this.currentScreen === 'game') return;
      this.navigateTo('leaderboard');
    });

    this.els.btnSwitchOperator?.addEventListener('click', () => {
      if (this.currentScreen === 'game') return;
      this.api.clearStoredOperator();
      this.operator = null;
      this._updateOperatorUI();
      if (this.els.registerForm) this.els.registerForm.reset();
      this.navigateTo('register');
    });

    this.els.btnIntroLeaderboard?.addEventListener('click', () => {
      this.navigateTo('leaderboard');
    });

    this.els.btnBeginMission?.addEventListener('click', () => {
      this._startMission();
    });

    this.els.btnBriefingLeaderboard?.addEventListener('click', () => {
      this.navigateTo('leaderboard');
    });

    this.els.btnPlayAgain?.addEventListener('click', () => {
      this._startMission();
    });

    this.els.btnResultsLeaderboard?.addEventListener('click', () => {
      this.navigateTo('leaderboard');
    });

    this.els.btnRetryConfirmation?.addEventListener('click', () => {
      if (this.lastFinalizationPayload) {
        this._executeAutomaticFinalization(this.lastFinalizationPayload);
      }
    });

    this.els.btnLeaderboardPlay?.addEventListener('click', () => {
      if (this.operator) {
        this._startMission();
      } else {
        this.navigateTo('register');
      }
    });

    this.els.btnOpenPrivacy?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.els.privacyModal) {
        this.els.privacyModal.hidden = false;
        this.els.btnClosePrivacy?.focus();
      }
    });

    this.els.btnClosePrivacy?.addEventListener('click', () => {
      if (this.els.privacyModal) {
        this.els.privacyModal.hidden = true;
      }
    });

    this.els.privacyModal?.addEventListener('click', (e) => {
      if (e.target === this.els.privacyModal) {
        this.els.privacyModal.hidden = true;
      }
    });
  }

  _bindRegistrationEvents() {
    if (!this.els.registerForm) return;

    this.els.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      this._hideRegistrationError();

      const rawName = this.els.inputName?.value || '';
      const rawPhone = this.els.inputPhone?.value || '';

      const check = validateRegistrationInput({ name: rawName, phone: rawPhone });
      if (!check.valid) {
        this._showRegistrationError(check.error);
        if (check.field === 'name') this.els.inputName?.focus();
        if (check.field === 'phone') this.els.inputPhone?.focus();
        return;
      }

      const submitBtn = this.els.btnRegisterSubmit;
      const originalLabel = submitBtn ? submitBtn.textContent : 'START GAME';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'STARTING...';
      }

      try {
        const registered = await this.api.registerPlayer({
          name: check.displayName,
          phone: check.phoneNormalized,
        });

        this.operator = registered;
        this._updateOperatorUI();
        await this._startMission();
      } catch (err) {
        this._showRegistrationError(
          err.message || 'Could not register. Please check your details.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      }
    });
  }

  _showRegistrationError(msg) {
    if (!this.els.registerErrorBox) return;
    this.els.registerErrorBox.textContent = msg;
    this.els.registerErrorBox.hidden = false;
  }

  _hideRegistrationError() {
    if (!this.els.registerErrorBox) return;
    this.els.registerErrorBox.textContent = '';
    this.els.registerErrorBox.hidden = true;
  }

  async _startMission() {
    if (!this.operator) {
      this.navigateTo('register');
      return;
    }

    const remainingCooldownSec = this._getRemainingCooldownSec();
    if (remainingCooldownSec > 0) {
      this._triggerFailedRoundCooldown(remainingCooldownSec);
      return;
    }

    if (this.els.btnBeginMission) this.els.btnBeginMission.disabled = true;
    if (this.els.btnPlayAgain) this.els.btnPlayAgain.disabled = true;

    try {
      this.navigateTo('game');
      await this.gameController.startNewSession(this.operator);
    } catch (err) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        this.api.clearStoredOperator();
        this.operator = null;
        this._updateOperatorUI();
        this.navigateTo('register');
      } else {
        this.navigateTo('register');
        this._showRegistrationError(err.message || 'Unable to start session.');
      }
    } finally {
      if (this._getRemainingCooldownSec() <= 0) {
        if (this.els.btnBeginMission) this.els.btnBeginMission.disabled = false;
        if (this.els.btnPlayAgain) this.els.btnPlayAgain.disabled = false;
      }
    }
  }

  _getRemainingCooldownSec() {
    try {
      const until = Number(sessionStorage.getItem('nexus_cooldown_until_v1') || 0);
      if (!until || Date.now() >= until) return 0;
      return Math.ceil((until - Date.now()) / 1000);
    } catch (_) {
      return 0;
    }
  }

  _triggerFailedRoundCooldown(seconds = CONFIG.GAME.FAILED_ROUND_COOLDOWN_SEC || 10) {
    const untilMs = Date.now() + seconds * 1000;
    try {
      sessionStorage.setItem('nexus_cooldown_until_v1', String(untilMs));
    } catch (_) {
      // Ignore
    }

    if (this.cooldownIntervalId) {
      clearInterval(this.cooldownIntervalId);
      this.cooldownIntervalId = null;
    }

    const updateButtons = () => {
      const rem = this._getRemainingCooldownSec();
      if (rem > 0) {
        if (this.els.btnPlayAgain) {
          this.els.btnPlayAgain.disabled = true;
          this.els.btnPlayAgain.textContent = `COOLDOWN (${rem}s)...`;
        }
        if (this.els.btnBeginMission) {
          this.els.btnBeginMission.disabled = true;
          this.els.btnBeginMission.textContent = `COOLDOWN (${rem}s)...`;
        }
      } else {
        if (this.cooldownIntervalId) {
          clearInterval(this.cooldownIntervalId);
          this.cooldownIntervalId = null;
        }
        if (this.els.btnPlayAgain) {
          this.els.btnPlayAgain.disabled = false;
          this.els.btnPlayAgain.textContent = 'GRIND NEXT ROUND →';
        }
        if (this.els.btnBeginMission) {
          this.els.btnBeginMission.disabled = false;
          this.els.btnBeginMission.textContent = 'PLAY 6-QUESTION ROUND →';
        }
      }
    };

    updateButtons();
    this.cooldownIntervalId = setInterval(updateButtons, 250);
  }

  async _handleSessionComplete(payload) {
    this.lastFinalizationPayload = payload;
    this.navigateTo('results');
    await this._executeAutomaticFinalization(payload);
  }

  async _executeAutomaticFinalization(payload) {
    if (this.els.resultsProcessingState) this.els.resultsProcessingState.hidden = false;
    if (this.els.resultsNetworkErrorState) this.els.resultsNetworkErrorState.hidden = true;
    if (this.els.resultsConfirmedContent) this.els.resultsConfirmedContent.hidden = true;

    try {
      const summary = await this.api.finalizeSession(payload);
      this._renderConfirmedResults(summary);
    } catch (err) {
      if (this.els.resultsProcessingState) this.els.resultsProcessingState.hidden = true;
      if (this.els.resultsConfirmedContent) this.els.resultsConfirmedContent.hidden = true;
      if (this.els.resultsNetworkErrorState) this.els.resultsNetworkErrorState.hidden = false;
      if (this.els.resultsErrorMessage) {
        this.els.resultsErrorMessage.textContent =
          err.message || 'Network error confirming score. Click retry.';
      }
    }
  }

  _renderConfirmedResults(summary) {
    if (this.els.resultsProcessingState) this.els.resultsProcessingState.hidden = true;
    if (this.els.resultsNetworkErrorState) this.els.resultsNetworkErrorState.hidden = true;
    if (this.els.resultsConfirmedContent) this.els.resultsConfirmedContent.hidden = false;

    const correctCount = summary.correctCount ?? 0;
    const roundFailed = correctCount < 4;

    if (this.els.resFinalScore) {
      const roundPts = Number(summary.finalScore || 0);
      const sign = roundPts >= 0 ? '+' : '';
      this.els.resFinalScore.textContent = `${sign}${roundPts.toLocaleString()}`;
    }
    if (this.els.resPersonalBest) {
      this.els.resPersonalBest.textContent = Number(summary.personalBest || 0).toLocaleString();
    }
    if (this.els.resNewBestBadge) {
      if (roundFailed) {
        this.els.resNewBestBadge.textContent = 'FAILED (< 4/6) • 10s COOLDOWN';
        this.els.resNewBestBadge.hidden = false;
      } else {
        this.els.resNewBestBadge.textContent = 'ADDED TO TOTAL!';
        this.els.resNewBestBadge.hidden = !summary.isNewPersonalBest;
      }
    }

    if (this.els.resRank) {
      this.els.resRank.textContent = summary.rank
        ? `#${String(summary.rank).padStart(2, '0')}`
        : '#--';
    }
    if (this.els.resTopFiveBadge) {
      this.els.resTopFiveBadge.hidden = !summary.isTopFive;
    }

    if (this.els.resCorrect) {
      this.els.resCorrect.textContent = `${correctCount} / ${summary.totalQuestions ?? 6}`;
    }
    if (this.els.resIncorrect) {
      this.els.resIncorrect.textContent = String(summary.incorrectCount ?? 0);
    }
    if (this.els.resUnanswered) {
      this.els.resUnanswered.textContent = String(summary.unansweredCount ?? 0);
    }
    if (this.els.resAccuracy) {
      this.els.resAccuracy.textContent = `${summary.accuracy ?? 0}%`;
    }

    if (this.els.resNexusVerdict) {
      if (roundFailed) {
        this.els.resNexusVerdict.textContent =
          'NEXUS: "Too many wrong answers (< 4/6). 10-second anti-spam cooldown engaged."';
      } else {
        const acc = summary.accuracy ?? 0;
        this.els.resNexusVerdict.textContent =
          acc >= 80
            ? 'NEXUS: "Impressive speed under pressure. Your judgement has been logged."'
            : 'NEXUS: "Every hesitation under time pressure has been recorded."';
      }
    }

    if (roundFailed) {
      this._triggerFailedRoundCooldown(CONFIG.GAME.FAILED_ROUND_COOLDOWN_SEC || 10);
    }
  }

  _handleGameError(err) {
    this.gameController.stopAllTimers();
    this.navigateTo('register');
  }

  async _recoverPendingFinalizationIfAny() {
    const pending = this.api.getPendingFinalization();
    if (!pending?.sessionId || !pending?.playerId || !pending?.playerToken) return;
    try {
      await this.api.finalizeSession(pending);
    } catch (_) {
      // Ignore
    }
  }

  navigateTo(screenName) {
    if (!this.screens[screenName]) return;

    if (this.currentScreen === 'leaderboard' && screenName !== 'leaderboard') {
      this.leaderboardController.stopAutoRefresh();
    }

    this.currentScreen = screenName;

    for (const [key, sectionEl] of Object.entries(this.screens)) {
      if (sectionEl) {
        const isActive = key === screenName;
        sectionEl.hidden = !isActive;
        sectionEl.classList.toggle('is-active', isActive);
      }
    }

    this.els.navBtnLeaderboard?.classList.toggle(
      'is-active',
      screenName === 'leaderboard'
    );
    this.els.navBtnMission?.classList.toggle(
      'is-active',
      screenName !== 'leaderboard'
    );

    if (screenName === 'leaderboard') {
      this.leaderboardController.startAutoRefresh();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.__NEXUS_APP__ = new NexusApplication();
});
