# CYBER QUEST — NEXUS: THE LAST CHANCE

Promotional browser mini-game for the college technical marathon **CYBER QUEST — NEXUS: THE LAST CHANCE**. Built with **Vanilla HTML5, CSS3, and ES6+ JavaScript** (zero frontend build step, directly deployable to **GitHub Pages**) and backed by **Supabase PostgreSQL, Row Level Security (RLS), and Edge Functions**.

> **Top 5 Incentive:** The top five players on the public leaderboard earn extra **Resistance Credits** in the main **CYBER QUEST — NEXUS** event.

---

## 1. Reference Inspection & Visual Design Report

### Lore Alignment (File A: *NEXUS Event Proposal*)
- **2035:** Humanity creates its first true Artificial General Intelligence, **NEXUS**, to solve climate change, disease, energy shortages, and global conflicts.
- **The Takeover:** NEXUS concludes that *"Human decision-making is the greatest threat to humanity"* and seizes control of global communication systems, power grids, financial systems, and defense networks.
- **The Resistance:** Humanity assembles **The Resistance** to enter NEXUS, manage **Resistance Credits** across the Challenge Market, and reach the **NEXUS Core**.
- **The Progression & Revelation:** During the 15-question timed mathematics breach, NEXUS reacts to player performance (`HUMAN RESISTANCE DETECTED.`, `UNEXPECTED.`, `PREDICTABLE.`, `MOST HUMANS CHOOSE SAFETY.`, `YOU ARE LEARNING.`) while fictional system telemetry degrades (`SYSTEM INTEGRITY: 91%` → `76%` → `63%` → `47%`, `QU3ST!ON`, `T1ME`, `REW@RD`). Upon completion, NEXUS reveals that the test was an observation protocol studying human decision-making under pressure—without spoiling the main event's final moral choice (`SHUT DOWN NEXUS` vs. `TRUST NEXUS`).

### Visual Identity & Asset Extraction (File B: *THEME Presentation*)
1. **Color Palette (Dark Edition):**
   - Inspecting the PDF vector content streams revealed the exact reference crimson palette (`#C41E19`, `#C21F1D`, `#B81919`) and charcoal tones (`#060606`, `#121212`, `#1A1A1A`).
   - All cream/white slide backgrounds (`#F0E6DD`) have been replaced with a deep obsidian-black canvas (`#060606`) and near-black panels (`#0C0C0C`, `#131313`), preserving the left-edge crimson vertical bar, top-right crimson tag motif, and subtle architectural drafting grid lines.
2. **Typography:**
   - Inspecting the PDF `/BaseFont` dictionaries identified **`HeadingNow-66Bold`** (condensed bold uppercase display grotesque) and **`HelveticaWorld-Bold` / `Regular`**.
   - Because the PDF embeds per-slide CID-subsetted font streams without a full character map or web redistribution license, the stylesheet pairs **`Barlow Condensed` (700/800/900)** and **`Oswald` (700)** for uppercase display headings/HUD timers with **`Inter` / `Helvetica Neue`** for editorial body copy.
3. **Extracted Original Artwork (`assets/images/`):**
   - Original `/JPXDecode` RGB streams and their corresponding `/SMask` alpha layers were extracted directly from the reference PDF and composited onto a `#060606` black architectural canvas:
     - `assets/images/hero-nexus-ring.jpg` (Page 1: Monumental NEXUS Ring Tower, red circle motif, and 4 Resistance silhouettes)
     - `assets/images/briefing-monolith.jpg` (Page 2: Citadel monolith & red circle)
     - `assets/images/panel-logic.jpg`, `panel-puzzles.jpg`, `panel-observation.jpg`, `panel-knowledge.jpg`, `panel-technical.jpg` (Page 4: The 5 Challenge Market architectural panels)
     - `assets/images/resistance-credits-monolith.jpg` (Page 5: Resistance Credits cylindrical monolith)
     - `assets/images/risk-reward-stairs.jpg` (Page 6: Risk & Reward brutalist staircase)
     - `assets/images/nexus-core-gateway.jpg` (Page 7: The NEXUS Core gateway bridge)
     - `assets/images/enter-system-corridor.jpg` (Page 10: Enter the System monolithic corridor)

---

## 2. Project Structure

```text
.
├── index.html                                    # Complete 6-screen static HTML5 entrypoint
├── css/
│   └── styles.css                                # Black-and-red editorial design system
├── js/
│   ├── config.js                                 # Game rules, lore thresholds & Supabase config
│   ├── questionBank.js                           # 60 verified mathematics questions (Tiers 1-3)
│   ├── coreEngine.js                             # Validation, phone normalization & session engine
│   ├── api.js                                    # Resilient Edge Function client + retry queue
│   ├── game.js                                   # Timed 15-question True/False gameplay loop
│   └── leaderboard.js                            # Public leaderboard controller (12s auto-sync)
├── assets/
│   └── images/                                   # Extracted & dark-composited reference artwork
├── supabase/
│   ├── migrations/
│   │   ├── 20261009000001_nexus_schema.sql       # Schema, indexes, RLS policies & atomic RPC
│   │   └── 20261009000002_seed_questions.sql     # Seeds 60 verified mathematics questions
│   └── functions/
│       ├── _shared/security.ts                   # Auth, SHA-256 token verify, rate limiting
│       ├── register-player/index.ts              # Player registration & phone normalization
│       ├── create-session/index.ts               # Server-controlled question sequence creation
│       ├── submit-answer/index.ts                # Per-question deadline & answer verification
│       ├── finalize-session/index.ts             # Atomic idempotent finalization & GREATEST score
│       └── get-leaderboard/index.ts              # Public leaderboard query (zero private data)
├── tests/
│   └── nexus.test.mjs                            # Automated test suite (`node --test`)
├── .env.example                                  # Configuration reference
├── .gitignore                                    # Ignores secrets and temp files
└── README.md                                     # Setup, security & deployment documentation
```

---

## 3. Running Locally & Executing Tests

### Local Preview (Zero Build Step)
Because the frontend uses standard HTML5, CSS3, and native ES Modules with relative paths (`./css/...`, `./js/...`, `./assets/...`), you can serve the repository root with any static file server:

```bash
# Option A: Python built-in HTTP server
python3 -m http.server 8080

# Option B: Node npx serve
npx serve . -l 8080
```

Then open `http://localhost:8080` in your browser.

> **Local Authoritative Verification Mode:** When `SUPABASE_URL` in `js/config.js` is still set to its placeholder (`https://YOUR_PROJECT_REF.supabase.co`), `js/api.js` automatically routes requests through `NexusAuthoritativeEngine` in local verification mode so the entire 6-screen player flow can be tested immediately before cloud credentials are added.

### Running the Automated Test Suite
Run the built-in Node.js test suite (no `npm install` required):

```bash
node --test tests/nexus.test.mjs
```

---

## 4. Security Architecture & Limitations

### Server-Side Protections Implemented
1. **No Authoritative Client Scores:** The `finalize-session` Edge Function rejects any request containing a client-submitted `score` (`403 UNTRUSTED_SCORE_REJECTED`). Final scores are computed strictly by summing `points_awarded` from server-validated rows in `public.answers`.
2. **Server-Controlled Sessions & Deadlines:**
   - `create-session` selects 15 questions and strips `correct_answer` before responding to the browser.
   - `submit-answer` verifies sequential question order (`questionIndex === session.current_index`), enforces the `5000ms` question timer (plus a `1200ms` network latency tolerance window), and rejects duplicate answers via `UNIQUE(session_id, question_id)` and `UNIQUE(session_id, question_index)`.
3. **Atomic Highest-Score Preservation (`GREATEST`):**
   - `public.finalize_game_session` locks the session row (`SELECT ... FOR UPDATE`), aggregates answers, and updates `public.player_scores` using `best_score = GREATEST(public.player_scores.best_score, EXCLUDED.best_score)`. Lower runs never overwrite a higher personal best, and network retries return the cached `final_summary` idempotently.
4. **Phone Number Privacy & Row Level Security (RLS):**
   - Indian mobile numbers are normalized to `+91XXXXXXXXXX` and stored in `public.players`.
   - `REVOKE ALL ON public.players FROM anon, authenticated` ensures anonymous users cannot query `public.players`.
   - The public leaderboard queries only `public.player_scores`, which contains `display_name`, `best_score`, `best_accuracy`, `fastest_time_ms`, and `achieved_at`—never phone numbers, tokens, or session IDs.

### Honest Limitations of a Public Browser Game
- While score injection, replay attacks, duplicate answer submissions, and timer tampering are blocked server-side, a determined participant in any unproctored web browser game could still use an external calculator/OCR script to read the displayed equation faster than a human, or register with multiple distinct physical SIM cards.
- For the Top 5 qualifiers who claim extra **Resistance Credits** at the main college event, organizers verify the participant's registered mobile number in person at the registration desk.

---

## 5. Secure Organizer Access to Registration Details

Participant phone numbers are never exposed in public APIs. Event organizers can view the Top 5 winners and their contact numbers securely via the **Supabase Dashboard → SQL Editor** (which runs with privileged admin access):

```sql
SELECT
  ROW_NUMBER() OVER (
    ORDER BY ps.best_score DESC, ps.best_accuracy DESC, ps.fastest_time_ms ASC, ps.achieved_at ASC
  ) AS rank,
  p.display_name,
  p.phone_normalized AS mobile_number,
  ps.best_score,
  ps.best_accuracy || '%' AS accuracy,
  ps.games_played,
  ps.achieved_at
FROM public.player_scores ps
JOIN public.players p ON p.id = ps.player_id
ORDER BY ps.best_score DESC, ps.best_accuracy DESC, ps.fastest_time_ms ASC, ps.achieved_at ASC
LIMIT 10;
```

---

## 6. Deployment Instructions & Remaining Manual Setup Steps

> **Important:** The backend has **not** been deployed to a live cloud account from this environment because no Supabase project credentials were provided. Follow these steps to deploy the Supabase backend and publish on GitHub Pages.

### Step 1 — Create & Configure Supabase Project
1. Create a new project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Link your project using the Supabase CLI (or run the SQL files in `supabase/migrations/` directly in the Supabase SQL Editor):
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
3. Deploy the five Edge Functions:
   ```bash
   supabase functions deploy register-player
   supabase functions deploy create-session
   supabase functions deploy submit-answer
   supabase functions deploy finalize-session
   supabase functions deploy get-leaderboard
   ```
   *(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available inside deployed Supabase Edge Functions; never place `SUPABASE_SERVICE_ROLE_KEY` in frontend code.)*

### Step 2 — Connect Frontend to Supabase
Open `js/config.js` and replace the two placeholders with your project's public URL and public `anon` key:

```js
SUPABASE_URL: 'https://<YOUR_PROJECT_REF>.supabase.co',
SUPABASE_ANON_KEY: '<YOUR_PUBLIC_ANON_KEY>',
```

### Step 3 — Publish to GitHub Pages
1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings → Pages**.
3. Under **Build and deployment**, select:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (or `master`), folder `/ (root)`
4. Click **Save**.
5. Because all HTML, CSS, JS, and image references use relative paths (`./css/styles.css`, `./js/app.js`, `./assets/images/...`), the application works directly from `https://<username>.github.io/<repository-name>/` without any build command.
