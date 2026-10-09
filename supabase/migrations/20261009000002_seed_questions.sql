-- ============================================================================
-- CYBER QUEST — NEXUS: THE LAST CHANCE
-- Migration 02: Seed Verified Mathematics Question Bank (60 Balanced Equations)
-- ============================================================================

INSERT INTO public.question_bank (id, equation, correct_answer, difficulty, points, is_active)
VALUES
  -- TIER 1 (Questions 1 - 20)
  ('q001', '17 + 28 = 45', true, 1, 100, true),
  ('q002', '9 × 7 = 65', false, 1, 100, true),
  ('q003', '144 ÷ 12 = 12', true, 1, 100, true),
  ('q004', '83 − 29 = 57', false, 1, 100, true),
  ('q005', '36 + 47 = 83', true, 1, 100, true),
  ('q006', '72 − 18 = 56', false, 1, 100, true),
  ('q007', '8 × 9 = 72', true, 1, 100, true),
  ('q008', '96 ÷ 8 = 14', false, 1, 100, true),
  ('q009', '29 + 54 = 83', true, 1, 100, true),
  ('q010', '64 − 27 = 39', false, 1, 100, true),
  ('q011', '11 × 8 = 88', true, 1, 100, true),
  ('q012', '108 ÷ 9 = 13', false, 1, 100, true),
  ('q013', '45 + 38 = 83', true, 1, 100, true),
  ('q014', '91 − 34 = 59', false, 1, 100, true),
  ('q015', '6 × 13 = 78', true, 1, 100, true),
  ('q016', '84 ÷ 7 = 11', false, 1, 100, true),
  ('q017', '53 + 29 = 82', true, 1, 100, true),
  ('q018', '75 − 28 = 49', false, 1, 100, true),
  ('q019', '7 × 12 = 84', true, 1, 100, true),
  ('q020', '132 ÷ 11 = 12', true, 1, 100, true),

  -- TIER 2 (Questions 21 - 40)
  ('q021', '68 + 57 = 125', true, 2, 100, true),
  ('q022', '134 − 58 = 74', false, 2, 100, true),
  ('q023', '14 × 6 = 84', true, 2, 100, true),
  ('q024', '156 ÷ 12 = 14', false, 2, 100, true),
  ('q025', '79 + 64 = 143', true, 2, 100, true),
  ('q026', '115 − 47 = 66', false, 2, 100, true),
  ('q027', '15 × 7 = 105', true, 2, 100, true),
  ('q028', '168 ÷ 14 = 12', true, 2, 100, true),
  ('q029', '87 + 56 = 145', false, 2, 100, true),
  ('q030', '142 − 65 = 77', true, 2, 100, true),
  ('q031', '16 × 6 = 98', false, 2, 100, true),
  ('q032', '135 ÷ 9 = 15', true, 2, 100, true),
  ('q033', '94 + 49 = 143', true, 2, 100, true),
  ('q034', '123 − 56 = 69', false, 2, 100, true),
  ('q035', '13 × 9 = 117', true, 2, 100, true),
  ('q036', '144 ÷ 16 = 8', false, 2, 100, true),
  ('q037', '76 + 88 = 164', true, 2, 100, true),
  ('q038', '151 − 64 = 89', false, 2, 100, true),
  ('q039', '18 × 5 = 90', true, 2, 100, true),
  ('q040', '126 ÷ 7 = 16', false, 2, 100, true),

  -- TIER 3 (Questions 41 - 60)
  ('q041', '17 × 8 = 136', true, 3, 100, true),
  ('q042', '19 × 6 = 112', false, 3, 100, true),
  ('q043', '225 ÷ 15 = 15', true, 3, 100, true),
  ('q044', '196 ÷ 14 = 16', false, 3, 100, true),
  ('q045', '(12 × 4) + 19 = 67', true, 3, 100, true),
  ('q046', '(15 × 3) + 28 = 75', false, 3, 100, true),
  ('q047', '(90 ÷ 6) + 27 = 42', true, 3, 100, true),
  ('q048', '(14 × 5) − 18 = 54', false, 3, 100, true),
  ('q049', '138 + 75 = 213', true, 3, 100, true),
  ('q050', '214 − 87 = 129', false, 3, 100, true),
  ('q051', '24 × 6 = 144', true, 3, 100, true),
  ('q052', '23 × 7 = 163', false, 3, 100, true),
  ('q053', '216 ÷ 18 = 12', true, 3, 100, true),
  ('q054', '204 ÷ 12 = 19', false, 3, 100, true),
  ('q055', '(8 × 11) − 29 = 59', true, 3, 100, true),
  ('q056', '(9 × 12) − 35 = 71', false, 3, 100, true),
  ('q057', '165 + 78 = 243', true, 3, 100, true),
  ('q058', '230 − 94 = 138', false, 3, 100, true),
  ('q059', '16 × 9 = 144', true, 3, 100, true),
  ('q060', '180 ÷ 15 = 14', false, 3, 100, true)
ON CONFLICT (id) DO UPDATE
SET
  equation = EXCLUDED.equation,
  correct_answer = EXCLUDED.correct_answer,
  difficulty = EXCLUDED.difficulty,
  points = EXCLUDED.points,
  is_active = EXCLUDED.is_active;
