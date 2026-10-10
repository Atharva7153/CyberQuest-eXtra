/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Fast 6-Question Timed True/False Mathematics Gameplay Controller
 *
 * Features:
 * - 6 questions per round, 5.0 seconds per question
 * - 0ms instant visual feedback on button press (emerald green ✓ CORRECT vs crimson red ✕ WRONG)
 * - Non-blocking background server answer submission so network latency never lags gameplay
 * - Keyboard support: Left Arrow = FALSE, Right Arrow = TRUE
 */

import { CONFIG } from './config.js';
import { calculateAnswerPoints, evaluateEquationTruth } from './coreEngine.js';

export class NexusGameController {
  constructor({ apiClient, onSessionComplete, onFatalError }) {
    this.api = apiClient;
    this.onSessionComplete = onSessionComplete;
    this.onFatalError = onFatalError;

    this.operator = null;
    this.session = null;
    this.currentIndex = 0;
    this.runningScore = 0;
    this.isQuestionLocked = true;
    this.isRunActive = false;

    this.questionStartPerfMs = 0;
    this.rafId = null;
    this.countdownTimerId = null;
    this.advanceTimeoutId = null;
    this.breachFlashTimers = [];
    this.isMatrixBreachActive = false;
    this.breachSequence = [];
    this.breachStepIndex = 0;

    this.els = {
      screenGame: document.getElementById('screen-game'),
      countdownOverlay: document.getElementById('game-countdown-overlay'),
      countdownNumber: document.getElementById('game-countdown-number'),
      countdownSubtext: document.getElementById('game-countdown-subtext'),

      labelQuestion: document.getElementById('hud-label-question'),
      valueQuestion: document.getElementById('game-question-progress'),

      labelScore: document.getElementById('hud-label-score'),
      valueScore: document.getElementById('game-score'),

      labelTime: document.getElementById('hud-label-time'),
      valueTime: document.getElementById('game-timer-Numeric'),
      timerBarFill: document.getElementById('game-timer-bar-fill'),

      integrityValue: document.getElementById('game-integrity-value'),
      integrityBarFill: document.getElementById('game-integrity-bar-fill'),
      nexusMessageBanner: document.getElementById('game-nexus-message'),
      nexusMessageText: document.getElementById('game-nexus-message-text'),

      equationContainer: document.getElementById('game-equation-box'),
      equationText: document.getElementById('game-equation'),
      difficultyBadge: document.getElementById('game-difficulty-badge'),
      feedbackBadge: document.getElementById('game-feedback-badge'),

      matrixBreachStage: document.getElementById('matrix-breach-stage'),
      matrixBreachStatus: document.getElementById('matrix-breach-status'),
      matrixBreachGrid: document.getElementById('matrix-breach-grid'),
      answerControlsGrid: document.getElementById('answer-controls-grid'),

      btnFalse: document.getElementById('btn-answer-false'),
      btnTrue: document.getElementById('btn-answer-true'),
    };

    this.matrixNodes = this.els.matrixBreachGrid
      ? Array.from(this.els.matrixBreachGrid.querySelectorAll('.matrix-node'))
      : [];

    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._bindEvents();
  }

  _bindEvents() {
    if (this.els.btnFalse) {
      this.els.btnFalse.addEventListener('click', () => {
        if (!this.isMatrixBreachActive) this.commitAnswer(false);
      });
    }
    if (this.els.btnTrue) {
      this.els.btnTrue.addEventListener('click', () => {
        if (!this.isMatrixBreachActive) this.commitAnswer(true);
      });
    }
    this.matrixNodes.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nodeNum = Number(btn.getAttribute('data-node'));
        this._handleMatrixNodeTap(nodeNum, btn);
      });
    });
    window.addEventListener('keydown', this._boundKeyDown);
  }

  _handleKeyDown(e) {
    if (!this.isRunActive || this.isQuestionLocked) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    if (this.isMatrixBreachActive) {
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const nodeNum = Number(e.key);
        const btn = this.matrixNodes.find((b) => Number(b.getAttribute('data-node')) === nodeNum);
        if (btn && !btn.disabled) {
          this._handleMatrixNodeTap(nodeNum, btn);
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.els.btnFalse?.focus();
      this.commitAnswer(false);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.els.btnTrue?.focus();
      this.commitAnswer(true);
    }
  }

  async startNewSession(operator) {
    this.stopAllTimers();
    this.operator = operator;
    this.currentIndex = 0;
    this.runningScore = 0;
    this.isQuestionLocked = true;
    this.isRunActive = true;

    this._resetHudToCleanState();

    const sessionData = await this.api.createSession({
      playerId: operator.playerId,
      playerToken: operator.playerToken,
    });

    this.session = sessionData;
    const countdownSec =
      sessionData.preGameCountdownSec ?? CONFIG.GAME.PRE_GAME_COUNTDOWN_SEC;

    if (countdownSec > 0) {
      this._runPreGameCountdown(countdownSec);
    } else {
      if (this.els.countdownOverlay) this.els.countdownOverlay.hidden = true;
      this._presentQuestion(0);
    }
  }

  _resetHudToCleanState() {
    if (this.els.screenGame) {
      this.els.screenGame.classList.remove(
        'corruption-mild',
        'corruption-elevated',
        'corruption-critical'
      );
    }
    if (this.els.labelQuestion) this.els.labelQuestion.textContent = 'QUESTION';
    if (this.els.labelScore) this.els.labelScore.textContent = 'SCORE';
    if (this.els.labelTime) this.els.labelTime.textContent = 'TIME';

    const total = String(CONFIG.GAME.QUESTIONS_PER_RUN).padStart(2, '0');
    if (this.els.valueQuestion) {
      this.els.valueQuestion.textContent = `01 / ${total}`;
    }
    if (this.els.valueScore) this.els.valueScore.textContent = '0';
    if (this.els.valueTime) this.els.valueTime.textContent = '05.0s';
    if (this.els.timerBarFill) {
      this.els.timerBarFill.style.transform = 'scaleX(1)';
      this.els.timerBarFill.classList.remove('timer-critical');
    }
    this._updateIntegrityDisplay(0);
    this._showNexusMessage(CONFIG.LORE.MESSAGES.START);
    this._clearFeedbackBadge();
    this._setButtonsDisabled(true);
  }

  _runPreGameCountdown(seconds) {
    if (!this.els.countdownOverlay) {
      this._presentQuestion(0);
      return;
    }

    this.els.countdownOverlay.hidden = false;
    let remaining = seconds;
    this.els.countdownNumber.textContent = String(remaining);
    this.els.countdownSubtext.textContent = 'GET READY...';

    const tick = () => {
      remaining -= 1;
      if (remaining > 0) {
        this.els.countdownNumber.textContent = String(remaining);
        this.countdownTimerId = setTimeout(tick, 750);
      } else {
        this.els.countdownOverlay.hidden = true;
        this._presentQuestion(0);
      }
    };

    this.countdownTimerId = setTimeout(tick, 750);
  }

  _clearBreachTimers() {
    if (Array.isArray(this.breachFlashTimers)) {
      this.breachFlashTimers.forEach((id) => clearTimeout(id));
    }
    this.breachFlashTimers = [];
  }

  _parseBreachSequence(equationStr) {
    const match = String(equationStr || '').match(/([1-9](?:-[1-9])+)/);
    if (!match) return [1, 5, 9, 3];
    return match[1].split('-').map((n) => Number(n));
  }

  _presentQuestion(index) {
    if (!this.isRunActive || !this.session) return;
    const questions = this.session.questions || [];

    if (index >= questions.length) {
      this._finishRun();
      return;
    }

    this._clearBreachTimers();
    this.currentIndex = index;
    const currentQ = questions[index];
    const total = questions.length;

    const qNumFormatted = String(index + 1).padStart(2, '0');
    const totalFormatted = String(total).padStart(2, '0');
    if (this.els.valueQuestion) {
      this.els.valueQuestion.textContent = `${qNumFormatted} / ${totalFormatted}`;
    }

    this._applyProgressiveCorruption(index);
    this._updateIntegrityDisplay(index);

    if (this.els.equationContainer) {
      this.els.equationContainer.classList.remove('stage-correct', 'stage-wrong');
    }

    const isBreach =
      String(currentQ.questionId || '').startsWith('mb') ||
      String(currentQ.equation || '').toUpperCase().startsWith('MATRIX BREACH');

    this.isMatrixBreachActive = isBreach;

    if (isBreach) {
      this._presentMatrixBreachQuestion(currentQ, index, total);
      return;
    }

    // Standard True/False Question
    if (this.els.matrixBreachStage) this.els.matrixBreachStage.hidden = true;
    if (this.els.equationText) {
      this.els.equationText.hidden = false;
      this.els.equationText.textContent = currentQ.equation;
    }
    if (this.els.answerControlsGrid) this.els.answerControlsGrid.hidden = false;

    if (this.els.difficultyBadge) {
      this.els.difficultyBadge.textContent = `QUESTION ${index + 1} OF ${total}`;
    }
    this._clearFeedbackBadge();

    this.isQuestionLocked = false;
    this._setButtonsDisabled(true);
    this.els.btnFalse?.classList.remove('btn-selected', 'btn-correct', 'btn-wrong');
    this.els.btnTrue?.classList.remove('btn-selected', 'btn-correct', 'btn-wrong');

    this.questionStartPerfMs = performance.now();
    if (this.unlockTimeoutId) clearTimeout(this.unlockTimeoutId);
    this.unlockTimeoutId = setTimeout(() => {
      if (!this.isQuestionLocked && this.isRunActive) {
        this._setButtonsDisabled(false);
      }
    }, CONFIG.GAME.MIN_HUMAN_REACTION_MS || 350);

    this._startQuestionTimerLoop();
  }

  _presentMatrixBreachQuestion(currentQ, index, total) {
    this.isQuestionLocked = true;
    this.breachSequence = this._parseBreachSequence(currentQ.equation);
    this.breachStepIndex = 0;

    if (this.els.equationText) this.els.equationText.hidden = true;
    if (this.els.answerControlsGrid) this.els.answerControlsGrid.hidden = true;
    if (this.els.matrixBreachStage) this.els.matrixBreachStage.hidden = false;

    if (this.els.difficultyBadge) {
      this.els.difficultyBadge.textContent = `MATRIX BREACH // ${index + 1} OF ${total}`;
    }
    if (this.els.feedbackBadge) {
      this.els.feedbackBadge.textContent = '👁 WATCH SEQUENCE...';
      this.els.feedbackBadge.className = 'game-feedback-badge';
    }
    if (this.els.matrixBreachStatus) {
      this.els.matrixBreachStatus.textContent = 'MEMORIZE THE 4 FLASHING NODES...';
    }

    if (this.els.timerBarFill) {
      this.els.timerBarFill.style.transform = 'scaleX(1)';
      this.els.timerBarFill.classList.remove('timer-critical');
    }
    if (this.els.valueTime) {
      this.els.valueTime.textContent = '05.0s';
    }

    this.matrixNodes.forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove('is-flashing', 'is-correct-step', 'is-wrong-step');
    });

    const stepMs = 420;
    const holdMs = 280;

    this.breachSequence.forEach((nodeNum, stepIdx) => {
      const targetBtn = this.matrixNodes.find(
        (b) => Number(b.getAttribute('data-node')) === nodeNum
      );
      const tOn = setTimeout(() => {
        if (!this.isRunActive) return;
        this.matrixNodes.forEach((b) => b.classList.remove('is-flashing'));
        if (targetBtn) targetBtn.classList.add('is-flashing');
      }, 200 + stepIdx * stepMs);

      const tOff = setTimeout(() => {
        if (!this.isRunActive) return;
        if (targetBtn) targetBtn.classList.remove('is-flashing');
      }, 200 + stepIdx * stepMs + holdMs);

      this.breachFlashTimers.push(tOn, tOff);
    });

    const unlockDelay = 250 + this.breachSequence.length * stepMs;
    const tStartInput = setTimeout(() => {
      if (!this.isRunActive) return;
      this.isQuestionLocked = false;
      this.matrixNodes.forEach((btn) => {
        btn.disabled = false;
        btn.classList.remove('is-flashing');
      });
      if (this.els.matrixBreachStatus) {
        this.els.matrixBreachStatus.textContent = `REPEAT SEQUENCE (0 / ${this.breachSequence.length})`;
      }
      if (this.els.feedbackBadge) {
        this.els.feedbackBadge.textContent = `TAP NODES IN ORDER (0/${this.breachSequence.length})`;
      }
      this.questionStartPerfMs = performance.now();
      this._startQuestionTimerLoop();
    }, unlockDelay);

    this.breachFlashTimers.push(tStartInput);
  }

  _handleMatrixNodeTap(nodeNum, btnEl) {
    if (!this.isRunActive || this.isQuestionLocked || !this.isMatrixBreachActive) return;

    const expectedNode = this.breachSequence[this.breachStepIndex];
    if (nodeNum === expectedNode) {
      btnEl.classList.add('is-correct-step');
      this.breachStepIndex += 1;
      const totalSteps = this.breachSequence.length;

      if (this.els.matrixBreachStatus) {
        this.els.matrixBreachStatus.textContent = `REPEAT SEQUENCE (${this.breachStepIndex} / ${totalSteps})`;
      }
      if (this.els.feedbackBadge) {
        this.els.feedbackBadge.textContent = `TAP NODES IN ORDER (${this.breachStepIndex}/${totalSteps})`;
      }

      if (this.breachStepIndex >= totalSteps) {
        this.matrixNodes.forEach((b) => (b.disabled = true));
        this.commitAnswer(true);
      }
    } else {
      btnEl.classList.add('is-wrong-step');
      this.matrixNodes.forEach((b) => (b.disabled = true));
      this.commitAnswer(false);
    }
  }

  _startQuestionTimerLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const durationMs = this.session?.questionDurationMs || CONFIG.GAME.QUESTION_DURATION_MS;

    const updateFrame = (nowPerf) => {
      if (this.isQuestionLocked || !this.isRunActive) return;

      const elapsed = Math.max(0, nowPerf - this.questionStartPerfMs);
      const remaining = Math.max(0, durationMs - elapsed);
      const ratio = remaining / durationMs;

      if (this.els.timerBarFill) {
        this.els.timerBarFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
        if (remaining <= 1500) {
          this.els.timerBarFill.classList.add('timer-critical');
        } else {
          this.els.timerBarFill.classList.remove('timer-critical');
        }
      }

      if (this.els.valueTime) {
        const secs = (remaining / 1000).toFixed(1).padStart(4, '0');
        this.els.valueTime.textContent = `${secs}s`;
      }

      if (remaining <= 0) {
        this.commitAnswer(null);
        return;
      }

      this.rafId = requestAnimationFrame(updateFrame);
    };

    this.rafId = requestAnimationFrame(updateFrame);
  }

  /**
   * 0ms Instant Answer Verdict + Anti-Bot Reaction Check (< 350ms) + Non-Blocking Server Sync
   */
  commitAnswer(answerValue) {
    if (!this.isRunActive || this.isQuestionLocked || !this.session) return;

    const durationMs = this.session.questionDurationMs || CONFIG.GAME.QUESTION_DURATION_MS;
    const rawElapsedMs = Math.round(
      Math.min(durationMs, Math.max(0, performance.now() - this.questionStartPerfMs))
    );
    const minReactionMs = CONFIG.GAME.MIN_HUMAN_REACTION_MS || 350;

    this.isQuestionLocked = true;
    this._clearBreachTimers();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.unlockTimeoutId) {
      clearTimeout(this.unlockTimeoutId);
      this.unlockTimeoutId = null;
    }

    this._setButtonsDisabled(true);
    this.matrixNodes.forEach((b) => (b.disabled = true));

    const activeQuestion = this.session.questions[this.currentIndex];
    const timedOut = answerValue === null;
    const isBotSpeedSpam =
      !timedOut && !this.isMatrixBreachActive && rawElapsedMs < minReactionMs;
    const expectedTruth = evaluateEquationTruth(activeQuestion.equation);
    const isCorrect = !timedOut && !isBotSpeedSpam && answerValue === expectedTruth;

    const pointsAwarded = calculateAnswerPoints({
      isCorrect,
      timedOut,
      elapsedMs: timedOut ? durationMs : rawElapsedMs,
      questionDurationMs: durationMs,
      basePoints: CONFIG.GAME.BASE_POINTS_CORRECT,
      maxSpeedBonus: CONFIG.GAME.MAX_SPEED_BONUS,
      incorrectPenalty: CONFIG.GAME.POINTS_INCORRECT,
    });

    this.runningScore += pointsAwarded;
    if (this.els.valueScore) {
      this.els.valueScore.textContent = String(this.runningScore);
    }

    // Immediate unmistakable visual feedback on button & equation card
    const selectedBtn =
      answerValue === false
        ? this.els.btnFalse
        : answerValue === true
          ? this.els.btnTrue
          : null;

    if (selectedBtn) {
      selectedBtn.classList.add('btn-selected');
      selectedBtn.classList.add(isCorrect ? 'btn-correct' : 'btn-wrong');
    }

    if (this.els.equationContainer) {
      this.els.equationContainer.classList.remove('stage-correct', 'stage-wrong');
      void this.els.equationContainer.offsetWidth;
      this.els.equationContainer.classList.add(
        isCorrect ? 'stage-correct' : 'stage-wrong'
      );
    }

    if (timedOut) {
      this._showFeedbackBadge('⏱ TIME UP! (0 PTS)', 'feedback-timeout');
      this._showNexusMessage('TIME EXPIRED.');
    } else if (isBotSpeedSpam) {
      this._showFeedbackBadge('✕ TOO FAST / SPAM! (-100 PTS)', 'feedback-wrong');
      this._showNexusMessage('AUTOCLICKER / BOT INPUT REJECTED.');
    } else if (isCorrect) {
      this._showFeedbackBadge(`✓ CORRECT! +${pointsAwarded} PTS`, 'feedback-correct');
      this._showNexusMessage('UNEXPECTED.');
    } else {
      this._showFeedbackBadge(`✕ WRONG! (${pointsAwarded} PTS)`, 'feedback-wrong');
      this._showNexusMessage('PREDICTABLE.');
    }

    // Fire server submission in background so UI never freezes waiting on network
    const submittedIndex = this.currentIndex;
    this.api
      .submitAnswer({
        sessionId: this.session.sessionId,
        playerId: this.operator.playerId,
        playerToken: this.operator.playerToken,
        questionId: activeQuestion.questionId,
        questionIndex: submittedIndex,
        answer: answerValue,
        clientElapsedMs: timedOut ? durationMs : rawElapsedMs,
      })
      .then((serverVerdict) => {
        if (this.isRunActive && typeof serverVerdict?.runningScore === 'number') {
          this.runningScore = serverVerdict.runningScore;
          if (this.els.valueScore) {
            this.els.valueScore.textContent = String(this.runningScore);
          }
        }
      })
      .catch(() => {
        // Handled during finalization
      });

    // Advance after crisp 550ms visual confirmation
    const nextIdx = this.currentIndex + 1;
    const totalQuestions = this.session.questions.length;

    this.advanceTimeoutId = setTimeout(() => {
      if (!this.isRunActive) return;
      if (nextIdx >= totalQuestions) {
        this._finishRun();
      } else {
        this._presentQuestion(nextIdx);
      }
    }, CONFIG.GAME.FEEDBACK_HOLD_MS);
  }

  _applyProgressiveCorruption(index) {
    if (!this.els.screenGame) return;
    this.els.screenGame.classList.remove(
      'corruption-mild',
      'corruption-elevated',
      'corruption-critical'
    );

    if (index >= 4) {
      this.els.screenGame.classList.add('corruption-critical');
      if (this.els.labelQuestion) this.els.labelQuestion.textContent = 'QU3ST!ON';
      if (this.els.labelTime) this.els.labelTime.textContent = 'T1ME';
    } else if (index >= 2) {
      this.els.screenGame.classList.add('corruption-elevated');
    }
  }

  _updateIntegrityDisplay(questionIndex) {
    const table = CONFIG.LORE.INTEGRITY_BY_QUESTION;
    const integrity =
      table[Math.min(questionIndex, table.length - 1)] ?? CONFIG.LORE.INITIAL_INTEGRITY;

    if (this.els.integrityValue) {
      this.els.integrityValue.textContent = `SYSTEM INTEGRITY: ${integrity}%`;
    }
    if (this.els.integrityBarFill) {
      this.els.integrityBarFill.style.width = `${integrity}%`;
    }
  }

  _showNexusMessage(message) {
    if (!this.els.nexusMessageText || !this.els.nexusMessageBanner) return;
    this.els.nexusMessageText.textContent = message;
  }

  _showFeedbackBadge(text, stateClass) {
    if (!this.els.feedbackBadge) return;
    this.els.feedbackBadge.textContent = text;
    this.els.feedbackBadge.className = `game-feedback-badge ${stateClass} is-visible`;
  }

  _clearFeedbackBadge() {
    if (!this.els.feedbackBadge) return;
    this.els.feedbackBadge.textContent = 'CHOOSE TRUE OR FALSE';
    this.els.feedbackBadge.className = 'game-feedback-badge';
  }

  _setButtonsDisabled(disabled) {
    if (this.els.btnFalse) this.els.btnFalse.disabled = disabled;
    if (this.els.btnTrue) this.els.btnTrue.disabled = disabled;
  }

  _finishRun() {
    this.isRunActive = false;
    this.isQuestionLocked = true;
    this.stopAllTimers();

    if (typeof this.onSessionComplete === 'function' && this.session) {
      this.onSessionComplete({
        sessionId: this.session.sessionId,
        playerId: this.operator.playerId,
        playerToken: this.operator.playerToken,
      });
    }
  }

  stopAllTimers() {
    this._clearBreachTimers();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.countdownTimerId) {
      clearTimeout(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    if (this.advanceTimeoutId) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
    if (this.unlockTimeoutId) {
      clearTimeout(this.unlockTimeoutId);
      this.unlockTimeoutId = null;
    }
  }
}
