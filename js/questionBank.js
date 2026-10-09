/**
 * CYBER QUEST — NEXUS: THE LAST CHANCE
 * Verified Mathematics Question Bank (60 Balanced Equations)
 *
 * Used to seed the PostgreSQL `question_bank` table (`supabase/migrations/20261009000002_seed_questions.sql`)
 * and by the Local Verification Engine when previewing without a live Supabase instance.
 *
 * NOTE: In production cloud mode, the browser NEVER receives `correctAnswer`
 * when a session starts; the Edge Function strips `correctAnswer` and validates
 * responses exclusively on the server.
 */

export const QUESTION_BANK = Object.freeze([
  // =========================================================================
  // TIER 1 — INITIAL FIREWALL (Addition, Subtraction, Core Multiplication/Division)
  // =========================================================================
  { id: 'q001', equation: '17 + 28 = 45', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q002', equation: '9 × 7 = 65', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q003', equation: '144 ÷ 12 = 12', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q004', equation: '83 − 29 = 57', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q005', equation: '36 + 47 = 83', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q006', equation: '72 − 18 = 56', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q007', equation: '8 × 9 = 72', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q008', equation: '96 ÷ 8 = 14', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q009', equation: '29 + 54 = 83', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q010', equation: '64 − 27 = 39', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q011', equation: '11 × 8 = 88', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q012', equation: '108 ÷ 9 = 13', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q013', equation: '45 + 38 = 83', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q014', equation: '91 − 34 = 59', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q015', equation: '6 × 13 = 78', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q016', equation: '84 ÷ 7 = 11', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q017', equation: '53 + 29 = 82', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q018', equation: '75 − 28 = 49', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q019', equation: '7 × 12 = 84', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q020', equation: '132 ÷ 11 = 12', correctAnswer: true, difficulty: 1, points: 100 },

  // =========================================================================
  // TIER 2 — ADAPTIVE PRESSURE (Larger 2-Digit / 3-Digit & Rapid Mental Math)
  // =========================================================================
  { id: 'q021', equation: '68 + 57 = 125', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q022', equation: '134 − 58 = 74', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q023', equation: '14 × 6 = 84', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q024', equation: '156 ÷ 12 = 14', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q025', equation: '79 + 64 = 143', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q026', equation: '115 − 47 = 66', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q027', equation: '15 × 7 = 105', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q028', equation: '168 ÷ 14 = 12', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q029', equation: '87 + 56 = 145', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q030', equation: '142 − 65 = 77', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q031', equation: '16 × 6 = 98', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q032', equation: '135 ÷ 9 = 15', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q033', equation: '94 + 49 = 143', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q034', equation: '123 − 56 = 69', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q035', equation: '13 × 9 = 117', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q036', equation: '144 ÷ 16 = 8', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q037', equation: '76 + 88 = 164', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q038', equation: '151 − 64 = 89', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q039', equation: '18 × 5 = 90', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q040', equation: '126 ÷ 7 = 16', correctAnswer: false, difficulty: 2, points: 100 },

  // =========================================================================
  // TIER 3 — CORE PROXIMITY (High-Pressure Arithmetic & Parenthesized Ops)
  // =========================================================================
  { id: 'q041', equation: '17 × 8 = 136', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q042', equation: '19 × 6 = 112', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q043', equation: '225 ÷ 15 = 15', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q044', equation: '196 ÷ 14 = 16', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q045', equation: '(12 × 4) + 19 = 67', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q046', equation: '(15 × 3) + 28 = 75', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q047', equation: '(90 ÷ 6) + 27 = 42', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q048', equation: '(14 × 5) − 18 = 54', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q049', equation: '138 + 75 = 213', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q050', equation: '214 − 87 = 129', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q051', equation: '24 × 6 = 144', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q052', equation: '23 × 7 = 163', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q053', equation: '216 ÷ 18 = 12', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q054', equation: '204 ÷ 12 = 19', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q055', equation: '(8 × 11) − 29 = 59', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q056', equation: '(9 × 12) − 35 = 71', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q057', equation: '165 + 78 = 243', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q058', equation: '230 − 94 = 138', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q059', equation: '16 × 9 = 144', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q060', equation: '180 ÷ 15 = 14', correctAnswer: false, difficulty: 3, points: 100 },
]);
