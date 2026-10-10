/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Automated Verification & Security Test Suite (6-Question Round)
 *
 * Run with:
 *   node --test tests/nexus.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { QUESTION_BANK } from '../js/questionBank.js';
import {
  NexusAuthoritativeEngine,
  evaluateEquationTruth,
  normalizeIndianPhone,
  validateRegistrationInput,
} from '../js/coreEngine.js';

const QUESTION_MAP = new Map(QUESTION_BANK.map((q) => [q.id, q]));

test('1. Question Bank — All 180 questions are verified and unambiguous', () => {
  assert.equal(QUESTION_BANK.length, 180, 'Expected 180 questions in QUESTION_BANK');

  let trueCount = 0;
  let falseCount = 0;

  for (const q of QUESTION_BANK) {
    const actualTruth = evaluateEquationTruth(q.equation);
    assert.equal(
      actualTruth,
      q.correctAnswer,
      `Question mismatch on ${q.id} ("${q.equation}"): expected ${actualTruth}, marked as ${q.correctAnswer}`
    );
    if (q.correctAnswer) trueCount += 1;
    else falseCount += 1;
  }

  assert.ok(trueCount >= 80 && falseCount >= 80, 'Question bank must be balanced between TRUE and FALSE');
});

test('2. Registration & Phone Normalization — Enforces Indian mobile format and uniqueness', () => {
  assert.equal(normalizeIndianPhone('9876543210'), '+919876543210');
  assert.equal(normalizeIndianPhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalizeIndianPhone('09876543210'), '+919876543210');
  assert.equal(normalizeIndianPhone('919876543210'), '+919876543210');

  assert.equal(normalizeIndianPhone('5876543210'), null, 'Must reject starting digit < 6');
  assert.equal(normalizeIndianPhone('9999999999'), null, 'Must reject repeating dummy digits');
  assert.equal(normalizeIndianPhone('12345'), null, 'Must reject short numbers');

  const xssCheck = validateRegistrationInput({
    name: '<script>alert(1)</script>Arjun',
    phone: '9876543210',
  });
  assert.equal(xssCheck.valid, false, 'Must reject unsafe characters in operator name');

  const engine = new NexusAuthoritativeEngine();
  const reg1 = engine.registerPlayer({ name: 'Arjun Verma', phone: '9876543210' });
  const reg2 = engine.registerPlayer({ name: 'Arjun V.', phone: '+91 98765 43210' });

  assert.equal(reg1.playerId, reg2.playerId);
  assert.equal(reg2.isReturning, true);
});

test('3. Scoring & 6-Question Session — Strips correct answers and calculates points server-side', async () => {
  const engine = new NexusAuthoritativeEngine();
  const player = engine.registerPlayer({ name: 'Riya Sharma', phone: '9812345678' });
  const startMs = 1_700_000_000_000;

  const session = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: startMs,
  });

  assert.equal(session.questions.length, 6, 'Expected 6 questions per round');
  for (const q of session.questions) {
    assert.equal(
      typeof q.correctAnswer,
      'undefined',
      'createSession response must NEVER expose correctAnswer to the browser'
    );
  }

  // Answer first 4 questions correctly at 1000ms elapsed, next 2 incorrectly
  let now = startMs;
  for (let i = 0; i < 6; i++) {
    const q = session.questions[i];
    const authoritative = QUESTION_MAP.get(q.questionId);
    const submittedAnswer = i < 4 ? authoritative.correctAnswer : !authoritative.correctAnswer;

    now += 1000;
    const verdict = engine.submitAnswer({
      sessionId: session.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      questionId: q.questionId,
      questionIndex: i,
      answer: submittedAnswer,
      clientElapsedMs: 1000,
      nowMs: now,
    });

    if (i < 4) {
      assert.equal(verdict.isCorrect, true);
      assert.equal(verdict.pointsAwarded, 140);
    } else {
      assert.equal(verdict.isCorrect, false);
      assert.equal(verdict.pointsAwarded, 0);
    }
  }

  const summary = await engine.finalizeSession({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: now + 100,
  });

  assert.equal(summary.finalScore, 560);
  assert.equal(summary.correctCount, 4);
  assert.equal(summary.incorrectCount, 2);
  assert.equal(summary.unansweredCount, 0);
  assert.equal(summary.accuracy, 67);
});

test('4. Timeouts — Enforces server-side 5s deadline + grace window and counts expired as unanswered', async () => {
  const engine = new NexusAuthoritativeEngine();
  const player = engine.registerPlayer({ name: 'Kabir Nair', phone: '9765432109' });
  const t0 = 1_700_000_000_000;

  const session = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: t0,
  });

  const q0 = session.questions[0];
  const authQ0 = QUESTION_MAP.get(q0.questionId);

  // Submit correct boolean AFTER server deadline + grace (7500ms > 6500ms)
  const lateVerdict = engine.submitAnswer({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    questionId: q0.questionId,
    questionIndex: 0,
    answer: authQ0.correctAnswer,
    clientElapsedMs: 1200,
    nowMs: t0 + 7500,
  });

  assert.equal(lateVerdict.timedOut, true);
  assert.equal(lateVerdict.isCorrect, false);
  assert.equal(lateVerdict.pointsAwarded, 0);

  const summary = await engine.finalizeSession({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: t0 + 20000,
  });

  assert.equal(summary.finalScore, 0);
  assert.equal(summary.unansweredCount, 6);
});

test('5. Duplicate Submissions & Order — Rejects duplicate answers and out-of-order indices', () => {
  const engine = new NexusAuthoritativeEngine();
  const player = engine.registerPlayer({ name: 'Meera Iyer', phone: '9123456780' });
  const t0 = 1_700_000_000_000;

  const session = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: t0,
  });

  const q0 = session.questions[0];
  const q1 = session.questions[1];

  assert.throws(
    () =>
      engine.submitAnswer({
        sessionId: session.sessionId,
        playerId: player.playerId,
        playerToken: player.playerToken,
        questionId: q1.questionId,
        questionIndex: 1,
        answer: true,
        nowMs: t0 + 500,
      }),
    (err) => err.code === 'OUT_OF_ORDER'
  );

  engine.submitAnswer({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    questionId: q0.questionId,
    questionIndex: 0,
    answer: true,
    nowMs: t0 + 500,
  });

  assert.throws(
    () =>
      engine.submitAnswer({
        sessionId: session.sessionId,
        playerId: player.playerId,
        playerToken: player.playerToken,
        questionId: q0.questionId,
        questionIndex: 0,
        answer: true,
        nowMs: t0 + 600,
      }),
    (err) => err.code === 'DUPLICATE_ANSWER'
  );
});

test('6. Retries & Score Injection — Rejects raw browser score payloads and handles retries idempotently', async () => {
  const engine = new NexusAuthoritativeEngine();
  const player = engine.registerPlayer({ name: 'Dev Patel', phone: '9823456712' });
  const t0 = 1_700_000_000_000;

  await assert.rejects(
    () =>
      engine.finalizeSession({
        playerId: player.playerId,
        playerToken: player.playerToken,
        score: 999999,
      }),
    (err) => err.code === 'UNTRUSTED_SCORE_REJECTED' && err.status === 403
  );

  const session = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: t0,
  });

  let now = t0;
  for (let i = 0; i < 5; i++) {
    const q = session.questions[i];
    const authQ = QUESTION_MAP.get(q.questionId);
    now += 1000;
    engine.submitAnswer({
      sessionId: session.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      questionId: q.questionId,
      questionIndex: i,
      answer: authQ.correctAnswer,
      clientElapsedMs: 1000,
      nowMs: now,
    });
  }

  const firstFinalize = await engine.finalizeSession({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: now + 500,
  });

  const retryFinalize1 = await engine.finalizeSession({
    sessionId: session.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: now + 1500,
  });

  assert.equal(firstFinalize.finalScore, 700);
  assert.equal(retryFinalize1.finalScore, 700);
  assert.equal(retryFinalize1.idempotentReplay, true);
});

test('7. Highest-Score Preservation & Concurrency — Lower scores never overwrite higher personal best', async () => {
  const engine = new NexusAuthoritativeEngine();
  const player = engine.registerPlayer({ name: 'Ananya Rao', phone: '9845012345' });
  const t0 = 1_700_000_000_000;

  // Run 1: High score (6 correct = 840 pts)
  const sessionHigh = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: t0,
  });
  let now = t0;
  for (let i = 0; i < 6; i++) {
    const q = sessionHigh.questions[i];
    now += 1000;
    engine.submitAnswer({
      sessionId: sessionHigh.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      questionId: q.questionId,
      questionIndex: i,
      answer: QUESTION_MAP.get(q.questionId).correctAnswer,
      clientElapsedMs: 1000,
      nowMs: now,
    });
  }

  // Run 2: Low score (2 correct = 280 pts)
  const sessionLow = engine.createSession({
    playerId: player.playerId,
    playerToken: player.playerToken,
    nowMs: now + 5000,
  });
  let now2 = now + 5000;
  for (let i = 0; i < 2; i++) {
    const q = sessionLow.questions[i];
    now2 += 1000;
    engine.submitAnswer({
      sessionId: sessionLow.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      questionId: q.questionId,
      questionIndex: i,
      answer: QUESTION_MAP.get(q.questionId).correctAnswer,
      clientElapsedMs: 1000,
      nowMs: now2,
    });
  }

  const [resHigh, resLow] = await Promise.all([
    engine.finalizeSession({
      sessionId: sessionHigh.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      nowMs: now2 + 100,
    }),
    engine.finalizeSession({
      sessionId: sessionLow.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      nowMs: now2 + 100,
    }),
  ]);

  assert.equal(resHigh.finalScore, 840);
  assert.equal(resLow.finalScore, 280);
  assert.equal(resLow.personalBest, 1120);
});

test('8. Privacy & Leaderboard Sorting — Never exposes phone numbers or tokens and highlights Top 5', async () => {
  const engine = new NexusAuthoritativeEngine();
  const baseTime = 1_700_000_000_000;

  for (let p = 1; p <= 6; p++) {
    const phone = `987654320${p}`;
    const reg = engine.registerPlayer({
      name: `Operator 0${p}`,
      phone,
      nowMs: baseTime + p * 100,
    });

    const sess = engine.createSession({
      playerId: reg.playerId,
      playerToken: reg.playerToken,
      nowMs: baseTime + p * 1000,
    });

    let now = baseTime + p * 1000;
    for (let i = 0; i < p; i++) {
      const q = sess.questions[i];
      now += 1000;
      engine.submitAnswer({
        sessionId: sess.sessionId,
        playerId: reg.playerId,
        playerToken: reg.playerToken,
        questionId: q.questionId,
        questionIndex: i,
        answer: QUESTION_MAP.get(q.questionId).correctAnswer,
        clientElapsedMs: 1000,
        nowMs: now,
      });
    }

    await engine.finalizeSession({
      sessionId: sess.sessionId,
      playerId: reg.playerId,
      playerToken: reg.playerToken,
      nowMs: now + 500,
    });
  }

  const leaderboard = engine.getLeaderboard({ limit: 50 });
  const serialized = JSON.stringify(leaderboard);

  assert.equal(leaderboard.entries.length, 6);
  assert.equal(leaderboard.entries[0].displayName, 'Operator 06');
  assert.equal(leaderboard.entries[0].rank, 1);
  assert.equal(leaderboard.entries[0].isTopFive, true);
  assert.equal(leaderboard.entries[5].rank, 6);
  assert.equal(leaderboard.entries[5].isTopFive, false);

  assert.ok(!serialized.includes('987654320'), 'Phone numbers must NEVER appear in leaderboard');
  assert.ok(!serialized.includes('+91'), 'Phone prefix must NEVER appear in leaderboard');
  assert.ok(!serialized.includes('tok_'), 'Player tokens must NEVER appear in leaderboard');
  assert.ok(!serialized.includes('ses_'), 'Session IDs must NEVER appear in leaderboard');
});
