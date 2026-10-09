/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Frontend DOM Wiring, Relative Asset Path & Security Audit Test Suite
 *
 * Run with:
 *   node --test tests/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

test('1. DOM Integrity — Every element ID referenced in JS modules exists in index.html', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const htmlIds = new Set(
    Array.from(html.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1])
  );

  const jsFiles = ['js/app.js', 'js/game.js', 'js/leaderboard.js'];
  for (const relFile of jsFiles) {
    const jsCode = fs.readFileSync(path.join(ROOT_DIR, relFile), 'utf8');
    const referencedIds = Array.from(
      jsCode.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)
    ).map((m) => m[1]);

    for (const id of referencedIds) {
      assert.ok(
        htmlIds.has(id),
        `Missing #${id} in index.html (referenced in ${relFile})`
      );
    }
  }
});

test('2. GitHub Pages Subpath Compatibility — All local assets use relative ./ paths and exist on disk', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Ensure no root-relative href="/..." or src="/..." that would break on https://user.github.io/repo/
  const rootRelativeMatches = Array.from(
    html.matchAll(/\b(?:src|href)="\/([^"]+)"/g)
  );
  assert.equal(
    rootRelativeMatches.length,
    0,
    `Found root-relative asset paths in index.html that would break on GitHub Pages subpath: ${JSON.stringify(
      rootRelativeMatches.map((m) => m[0])
    )}`
  );

  // Verify every ./ asset exists and is non-empty
  const localRefs = Array.from(
    html.matchAll(/\b(?:src|href)="(\.\/[^"]+)"/g)
  ).map((m) => m[1]);

  assert.ok(localRefs.length >= 3, 'Expected local CSS, JS, and hero image asset references');

  for (const ref of localRefs) {
    const absPath = path.resolve(ROOT_DIR, ref);
    assert.ok(fs.existsSync(absPath), `Referenced asset does not exist: ${ref}`);
    const stat = fs.statSync(absPath);
    assert.ok(stat.size > 100, `Referenced asset is unexpectedly empty: ${ref}`);
  }
});

test('3. Frontend Secret Audit — No service_role keys or privileged secrets in frontend code', () => {
  const frontendFiles = [
    'index.html',
    'css/styles.css',
    'js/config.js',
    'js/questionBank.js',
    'js/coreEngine.js',
    'js/api.js',
    'js/game.js',
    'js/leaderboard.js',
  ];

  for (const relFile of frontendFiles) {
    const content = fs.readFileSync(path.join(ROOT_DIR, relFile), 'utf8');
    // Check that no JWT service_role token or SUPABASE_SERVICE_ROLE_KEY assignment is present
    assert.ok(
      !content.includes('SUPABASE_SERVICE_ROLE_KEY') && !content.includes('sb_secret_'),
      `Frontend file ${relFile} must not reference SUPABASE_SERVICE_ROLE_KEY or sb_secret_`
    );
    const jwtMatches = content.match(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g) || [];
    for (const token of jwtMatches) {
      const payloadJson = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
      assert.ok(
        !payloadJson.includes('"service_role"'),
        `Frontend file ${relFile} must never contain a service_role JWT`
      );
    }
  }
});

test('4. Automatic Score Submission — No manual Submit/Update Score button exists in index.html', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.ok(
    !/submit\s+score|update\s+score/i.test(html),
    'index.html must not contain a manual Submit Score or Update Score button'
  );
});

test('5. Backend Deliverables — Migrations, RLS policies, atomic RPC, and all 5 Edge Functions exist', () => {
  const requiredBackendFiles = [
    'supabase/migrations/20261009000001_nexus_schema.sql',
    'supabase/migrations/20261009000002_seed_questions.sql',
    'supabase/functions/_shared/security.ts',
    'supabase/functions/register-player/index.ts',
    'supabase/functions/create-session/index.ts',
    'supabase/functions/submit-answer/index.ts',
    'supabase/functions/finalize-session/index.ts',
    'supabase/functions/get-leaderboard/index.ts',
  ];

  for (const relPath of requiredBackendFiles) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing backend file: ${relPath}`);
  }

  const schemaSql = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261009000001_nexus_schema.sql'),
    'utf8'
  );
  assert.ok(
    schemaSql.includes('ENABLE ROW LEVEL SECURITY'),
    'Schema migration must enable Row Level Security'
  );
  assert.ok(
    schemaSql.includes('GREATEST(public.player_scores.best_score, EXCLUDED.best_score)'),
    'Schema migration must use atomic GREATEST() for highest-score preservation'
  );
  assert.ok(
    schemaSql.includes('FOR UPDATE'),
    'finalize_game_session RPC must lock session row with FOR UPDATE'
  );
});
