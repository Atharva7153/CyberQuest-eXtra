/**
 * CYBER QUEST EXTRA — NEXUS: THE LAST CHANCE
 * Expanded 180-Question Bank:
 * - Fast Mental Math & Parenthesized Equations
 * - Cyber Logic Gates & Binary
 * - Number Sequences & Patterns
 * - Brain-Reflex & Comparison Traps
 * - Tech & Cyber Rapid-Fire Facts
 * - Word & Observation Reflex Checks
 */

export const QUESTION_BANK = Object.freeze([
  // =========================================================================
  // TIER 1 — INITIAL FIREWALL (Fast Math, Binary, Tech Facts & Word Reflexes)
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
  // TIER 2 — ADAPTIVE PRESSURE (2-Digit / 3-Digit & Rapid Mental Math)
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

  // =========================================================================
  // CATEGORY A — LOGIC GATES & BINARY (q061 - q084)
  // =========================================================================
  { id: 'q061', equation: '1 AND 0 = 1', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q062', equation: '1 OR 0 = 1', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q063', equation: '1 AND 1 = 1', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q064', equation: '0 OR 0 = 1', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q065', equation: 'NOT 1 = 0', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q066', equation: 'NOT 0 = 0', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q067', equation: '1 XOR 1 = 0', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q068', equation: '1 XOR 0 = 0', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q069', equation: 'NOT (1 AND 0) = 1', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q070', equation: 'NOT (1 OR 0) = 1', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q071', equation: 'BINARY 101 = 5', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q072', equation: 'BINARY 110 = 7', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q073', equation: 'BINARY 111 = 7', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q074', equation: 'BINARY 100 = 2', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q075', equation: 'BINARY 1010 = 10', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q076', equation: 'BINARY 1001 = 8', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q077', equation: 'BINARY 1100 = 12', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q078', equation: 'BINARY 1111 = 16', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q079', equation: 'BINARY 1000 = 8', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q080', equation: 'BINARY 0011 = 4', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q081', equation: '(1 AND 1) OR 0 = 1', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q082', equation: '(1 OR 0) AND 0 = 1', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q083', equation: 'BINARY 1011 = 11', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q084', equation: 'BINARY 1101 = 14', correctAnswer: false, difficulty: 3, points: 100 },

  // =========================================================================
  // CATEGORY B — NUMBER SEQUENCES & PATTERNS (q085 - q108)
  // =========================================================================
  { id: 'q085', equation: '2, 4, 8, 16 → NEXT IS 32', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q086', equation: '3, 6, 9, 12 → NEXT IS 16', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q087', equation: '1, 1, 2, 3, 5 → NEXT IS 8', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q088', equation: '1, 1, 2, 3, 5 → NEXT IS 9', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q089', equation: '5, 10, 20, 40 → NEXT IS 80', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q090', equation: '2, 6, 18, 54 → NEXT IS 108', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q091', equation: '1, 4, 9, 16 → NEXT IS 25', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q092', equation: '1, 4, 9, 16 → NEXT IS 24', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q093', equation: '100, 90, 81, 73 → NEXT IS 66', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q094', equation: '50, 45, 40, 35 → NEXT IS 25', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q095', equation: '3, 6, 12, 24 → NEXT IS 48', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q096', equation: '4, 8, 16, 32 → NEXT IS 60', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q097', equation: '7, 14, 21, 28 → NEXT IS 35', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q098', equation: '9, 18, 27, 36 → NEXT IS 44', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q099', equation: '2, 3, 5, 7, 11 → NEXT PRIME IS 13', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q100', equation: '2, 3, 5, 7, 11 → NEXT PRIME IS 15', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q101', equation: '10, 20, 40, 80 → NEXT IS 160', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q102', equation: '81, 27, 9, 3 → NEXT IS 0', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q103', equation: '64, 32, 16, 8 → NEXT IS 4', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q104', equation: '1, 3, 6, 10 → NEXT IS 15', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q105', equation: '1, 3, 6, 10 → NEXT IS 14', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q106', equation: '11, 22, 33, 44 → NEXT IS 55', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q107', equation: '12, 24, 36, 48 → NEXT IS 62', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q108', equation: '100, 95, 85, 70 → NEXT IS 50', correctAnswer: true, difficulty: 3, points: 100 },

  // =========================================================================
  // CATEGORY C — BRAIN-REFLEX & COMPARISON TRAPS (q109 - q132)
  // =========================================================================
  { id: 'q109', equation: '-12 > -5', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q110', equation: '-3 > -10', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q111', equation: '5² > 2⁵', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q112', equation: '2⁵ > 5²', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q113', equation: '0.4 > 0.39', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q114', equation: '0.09 > 0.1', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q115', equation: '50% OF 80 = 40', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q116', equation: '50% OF 60 = 35', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q117', equation: '25% OF 200 = 50', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q118', equation: '25% OF 120 = 40', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q119', equation: '3³ = 27', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q120', equation: '4³ = 48', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q121', equation: '2⁴ = 16', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q122', equation: '3⁴ = 64', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q123', equation: '√144 = 12', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q124', equation: '√169 = 14', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q125', equation: '√81 = 9', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q126', equation: '√121 = 12', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q127', equation: '10% OF 450 = 45', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q128', equation: '20% OF 150 = 25', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q129', equation: '-1 > -100', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q130', equation: '-50 > -20', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q131', equation: '7² = 49', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q132', equation: '8² = 68', correctAnswer: false, difficulty: 1, points: 100 },

  // =========================================================================
  // CATEGORY D — TECH & CYBER RAPID-FIRE FACTS (q133 - q156)
  // =========================================================================
  { id: 'q133', equation: '1 BYTE = 8 BITS', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q134', equation: '1 BYTE = 10 BITS', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q135', equation: 'HTTPS USES PORT 443', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q136', equation: 'HTTP USES PORT 443', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q137', equation: 'RAM IS PERMANENT STORAGE', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q138', equation: 'RAM IS VOLATILE MEMORY', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q139', equation: 'IPv4 HAS 32 BITS', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q140', equation: 'IPv4 HAS 64 BITS', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q141', equation: 'IPv6 HAS 128 BITS', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q142', equation: 'HTML IS A PROGRAMMING LANGUAGE', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q143', equation: 'CPU = CENTRAL PROCESSING UNIT', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q144', equation: '1 KILOBYTE = 100 BYTES', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q145', equation: 'SSH USES PORT 22', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q146', equation: 'DNS USES PORT 53', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q147', equation: 'FTP USES PORT 80', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q148', equation: 'LINUX IS AN OS KERNEL', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q149', equation: 'URL = UNIFORM RESOURCE LOCATOR', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q150', equation: 'SQL MANAGES RELATIONAL DATABASES', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q151', equation: 'FIREWALLS FILTER NETWORK TRAFFIC', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q152', equation: 'PHISHING IS HARDWARE COOLING', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q153', equation: '2FA = TWO-FACTOR AUTHENTICATION', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q154', equation: 'DDoS OVERLOADS TARGET SERVERS', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q155', equation: 'MAC ADDRESS HAS 128 BITS', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q156', equation: 'LOCALHOST IP IS 127.0.0.1', correctAnswer: true, difficulty: 2, points: 100 },

  // =========================================================================
  // CATEGORY E — WORD / OBSERVATION REFLEXES & EXTRA MATH (q157 - q180)
  // =========================================================================
  { id: 'q157', equation: '"NEXUS" HAS 5 LETTERS', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q158', equation: '"NEXUS" HAS 6 LETTERS', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q159', equation: '"CYBER" REVERSED IS "REBYC"', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q160', equation: '"CYBER" REVERSED IS "RBYEC"', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q161', equation: '"QUEST" ENDS WITH THE LETTER T', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q162', equation: '"SYSTEM" HAS 3 VOWELS', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q163', equation: '"RESISTANCE" HAS 10 LETTERS', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q164', equation: '"RESISTANCE" HAS 9 LETTERS', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q165', equation: '"BINARY" HAS 2 VOWELS (I, A)', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q166', equation: '"LOGIC" REVERSED IS "CIGOL"', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q167', equation: '"MATRIX" REVERSED IS "XIRTAM"', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q168', equation: '"SERVER" HAS 7 LETTERS', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q169', equation: '15 + 15 + 15 = 45', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q170', equation: '25 × 4 = 100', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q171', equation: '12 × 12 = 142', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q172', equation: '1000 ÷ 8 = 125', correctAnswer: true, difficulty: 3, points: 100 },
  { id: 'q173', equation: '360 ÷ 6 = 50', correctAnswer: false, difficulty: 2, points: 100 },
  { id: 'q174', equation: '19 + 21 + 30 = 70', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q175', equation: '50 − 17 = 37', correctAnswer: false, difficulty: 1, points: 100 },
  { id: 'q176', equation: '75 + 45 = 120', correctAnswer: true, difficulty: 1, points: 100 },
  { id: 'q177', equation: '13 × 7 = 91', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q178', equation: '14 × 8 = 114', correctAnswer: false, difficulty: 3, points: 100 },
  { id: 'q179', equation: '200 − 67 = 133', correctAnswer: true, difficulty: 2, points: 100 },
  { id: 'q180', equation: '99 ÷ 9 = 12', correctAnswer: false, difficulty: 1, points: 100 },
]);
