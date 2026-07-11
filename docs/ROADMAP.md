# ROADMAP.md — Phases & Progress Tracker

Check boxes as tasks complete (Obsidian renders these). One Claude Code session ≈ one sub-phase or less. Each phase ends with a **Definition of Done** — don't start the next phase until it's true.

**Progress: Phase 0 — DoD met 2026-07-10 (all four clauses verified); one task open: 0.1's Obsidian vault step. Phase 1 next.**

## Timeline at a glance

| Phase | Focus | Estimate | Brainstorm |
|---|---|---|---|
| 0 | Foundations | 2–3 days | [[brainstorm/phase-0-foundations]] |
| 1 | Core loop (auth + swipe + test) | 2–3 weeks | [[brainstorm/phase-1-core-loop]] |
| 2 | Real jobs (ingestion) | 2–3 weeks | [[brainstorm/phase-2-real-jobs]] |
| 3 | Resume pipeline ⚠ hardest | ~4 weeks | [[brainstorm/phase-3-resume-pipeline]] |
| 4 | Assistant (RAG chat) | ~2 weeks | [[brainstorm/phase-4-assistant]] |
| 5 | Ship (deploy + domain) | 1–2 weeks | [[brainstorm/phase-5-ship]] |
| — | Post-launch backlog | ongoing | [[brainstorm/post-launch]] |

**Total: ~12–15 weeks part-time (upper bound includes buffer).** Estimates assume evenings/weekends; roughly halve for full-time. If a phase runs >50% over its estimate, stop and review its brainstorm file's Issues section before pushing on — overruns usually mean a wrong assumption, not slow typing.

---

## Phase 0 — Foundations (est. 2–3 days) · notes: [[brainstorm/phase-0-foundations]]

### 0.1 Repo & docs
- [x] Create Git repo; add `.gitignore` (Node + Python + `.env*`) BEFORE first commit
- [x] Drop in `CLAUDE.md` + `docs/` (this folder); first commit
- [x] Create `.env.example` (all variable names + where to get each; no real values)
- [x] `scripts/check-docs.sh`: automated docs consistency check (pointers, wikilinks, schema names, enums, counts, estimate arithmetic, naming consistency) wired into CI (workflow committed; activates on first GitHub push) — then PROVE it by seeding one deliberate error, confirming it fails, and reverting
- [x] Enable Dependabot (or Renovate) on the repo — automated update PRs for Next.js, Supabase client, worker deps, and later the Stripe SDK (config committed; activates on first GitHub push)
- [ ] Open `docs/` as Obsidian vault (or add to existing vault)

### 0.2 App scaffold
- [x] `create-next-app` (TypeScript, App Router, Tailwind)
- [x] Install shadcn/ui; init theme with CSS variables from DESIGN.md (light default + dark "pulse")
- [x] `next-themes` toggle working; LIGHT default; no flash on load
- [x] Inter + JetBrains Mono via `next/font`
- [x] Deploy the skeleton to Vercel on day one (free `.vercel.app` URL, preview deploys per PR). Local dev stays Supabase CLI + Ollama; the deployed shell points at a hosted Supabase FREE-TIER project (created now, seed data only — this becomes the prod project in Phase 5). Catching deploy-only bugs starts NOW, not in Phase 5

### 0.3 Local backend
- [x] Docker Desktop installed (required for Supabase local stack)
- [x] Supabase CLI installed; `supabase init` + `supabase start` (Docker)
- [x] `.env.local` with local keys; stack + keys + `profiles` reachability proven via standalone supabase-js smoke script (the app itself gains its Supabase client in Phase 1.1)
- [x] First migration: `profiles` table + RLS policy

### 0.4 Local AI
- [x] Install Ollama; pull Qwen 2.5 (7B or 14B per RAM)
- [x] Create `lib/llm/` provider interface: `stub | ollama | hosted` via `LLM_PROVIDER`
- [x] Smoke test: JSON-mode call to Ollama returns valid structured output

**DoD:** repo committed, app runs locally with theme toggle, Supabase local up with one RLS'd table, Ollama answers a JSON-mode call through the provider interface.

---

## Phase 1 — Core loop on fake data (est. 2–3 weeks) · notes: [[brainstorm/phase-1-core-loop]]

### 1.1 Auth
- [ ] Supabase Auth: email/password + Google OAuth (email/password DONE + proven; Google OAuth deferred to a 1.1 follow-up per Adnane 2026-07-10)
- [x] Auth pages (sign in/up/out) + protected routes middleware
- [x] Email verification: enable "confirm email" in Supabase Auth; customize the email template (Sartor branding, correct redirect URL); unverified users blocked by middleware and shown a "check your inbox" screen with a resend button (branding proven LOCALLY; hosted keeps the default template until Phase 5 — the platform requires custom SMTP to edit templates; /auth/confirm handles both link styles)
- [x] Manual test of the verification flow: sign up → receive email → confirm → access granted; unconfirmed account stays blocked. NOTE: Supabase's built-in sender is rate-limited (dev only) — production SMTP is a Phase 5 task
- [x] `profiles` row auto-created on signup (trigger)
- [x] Manual RLS test with two accounts: A cannot read B's profile (GATE 2 passed 2026-07-10: 8 behavioral checks green, both directions)
- [x] Zod schemas for all API route inputs and forms (pattern established here, reused everywhere)
- [x] CI from day one: GitHub Actions runs typecheck + lint on every push (fixture tests join in Phase 3)
- [x] Sentry (app) from Phase 1 — free tier, DSN in env vars; worker Sentry joins in Phase 2 when the worker exists (server+edge+client wired; DSN in .env.local + Vercel all environments; delivery verified 2026-07-10: deliberate error captured, flush confirmed)
- [x] Registration form: full name, email, OPTIONAL phone, 16+ age confirmation — PIPEDA-minimized, NO full DOB — Zod-validated

### 1.2 Onboarding / persona
- [ ] Static provinces→cities JSON dataset (10 provinces + 3 territories, GeoNames-derived) — BEFORE the onboarding UI that consumes it
- [ ] Multi-step onboarding: desired roles, province + cities (static CA dataset), remote pref, salary range (CAD), seniority
- [ ] Persona editable later in Settings

### 1.3 Seed jobs
- [ ] `jobs` table migration (schema per PRD §5) + RLS: read-only for authenticated users; writes only via service-role (worker)
- [ ] Seed script: ~50 realistic hand-picked Canadian jobs with real-style descriptions, `posted_at` spread across the LAST 10 DAYS (older seeds would be hidden by the mandatory freshness filter) and refreshable via re-run

### 1.4 Swipe deck
- [ ] Card component (logo, title, company, location, salary, tags) per DESIGN.md
- [ ] Deck: Framer Motion drag/flick + next-card peek
- [ ] Keyboard: ← → ↑/Space, Z undo; buttons under deck; `?` shortcuts overlay
- [ ] Full-description panel/sheet
- [ ] `swipes` table + RLS; record swipe; swiped jobs excluded from deck; undo works
- [ ] Left filter rail: province select → cascading city multi-select → remote (Canada) → salary
- [ ] Position search bar (Postgres full-text / pg_trgm on title) combined with filters

### 1.5 Personality test (RIASEC swipe, skippable)
- [ ] Bundle O*NET Interest Profiler Short Form items (30, public domain) as static data with instrument version
- [ ] Swipe-test UI reusing deck mechanics: right = "sounds like me", left = "not me", progress ring, ~2–3 min
- [ ] Prominent Skip at every point; take/retake entry in Settings
- [ ] `personality_profiles` table + user-scoped RLS; compute and store R/I/A/S/E/C on completion
- [ ] Results screen: top-2 interest codes in friendly language

### 1.6 Tracker skeleton + help
- [ ] `applications` table + RLS; right-swipe creates Saved entry
- [ ] Tracker page: Saved / Applied / Interviewing / Offer / Closed columns (matches status enum)
- [ ] Tier-A help: tooltips, empty states, FAQ page

**DoD:** two test users can sign up, confirm their email (unconfirmed = blocked), onboard, complete OR skip the personality test (scores stored when completed), swipe 50 seeded jobs with keyboard and mouse, see saved jobs in tracker — and cannot see each other's data.

---

## Phase 2 — Real jobs (est. 2–3 weeks) · notes: [[brainstorm/phase-2-real-jobs]]

### 2.1 Worker service
- [ ] Python worker in `worker/` (monorepo — one repo, Railway deploys the subfolder via root-directory setting); runs locally; deployable to Railway
- [ ] Worker Dockerfile (Python + Playwright/Chromium deps) for Railway
- [ ] `job_sources` table + registry of initial company slugs
- [ ] Sentry SDK on the worker (DSN via env) — completes the app+worker coverage started in Phase 1

### 2.2 Ingestion
- [ ] Greenhouse board API connector (normalize → `jobs`)
- [ ] Lever board API connector
- [ ] Adzuna API connector with country=ca (Canada only)
- [ ] Seed slug registry with Canadian companies (verify ATS per company)
- [ ] Job Bank Canada: verify terms of use; integrate feed if permitted
- [ ] Dedup via `dedup_hash` (company+title+location); upsert logic
- [ ] Hourly cron; stale postings marked `is_active=false`
- [ ] Freshness condition (PRD 3.2b): discard >10-day-old or undated postings at ingest; daily `is_fresh` pass; deck query hard-filters `posted_at >= now() - 10 days`
- [ ] `occupation_category` at ingest (PRD 3.1b): deterministic title→NOC-family mapping; LLM fallback classifier list-validated (AI call point #8); unmatched → `uncategorized`
- [ ] Verify O*NET↔NOC crosswalk source (ESDC mapping) — required before Phase 3 personality matching
- [ ] Every card shows source + relative posting age ("Greenhouse · posted 3 days ago"), linking to the original

### 2.3 Apply flow
- [ ] `apply_mode` column: classify easy/hard at ingest (question-schema validation; aggregators always hard); lane badge on cards; deck filter by lane; log the REASON a job is classified hard (e.g. which unsupported question type) — this data drives the future easy-lane spec
- [ ] "Apply" deep-links to real apply_url and moves entry Saved→Applied
- [ ] Click-time validity check: re-probe source before opening; dead → mark inactive + inform user
- [ ] Tracker entries link back to live posting; dead postings visually flagged

**DoD:** deck shows real Canadian postings refreshed hourly from ≥3 sources, no duplicates, every one posted ≤10 days ago and alive at click time; applying opens the real posting and updates the tracker.

---

## Phase 3 — Resume pipeline (est. ~4 weeks, the hard one) · notes: [[brainstorm/phase-3-resume-pipeline]]

### 3.1 Upload & parse
- [ ] Private Storage bucket + per-user policies; upload PDF/DOCX
- [ ] Manual test: user A cannot fetch user B's resume file
- [ ] Rate limiting on upload + tailoring endpoints (Upstash Redis free tier)
- [ ] DOCX→PDF conversion (headless LibreOffice in worker Docker image) so one pipeline handles both formats
- [ ] PyMuPDF parse → content JSON (sections/bullets/order)
- [ ] Style profile JSON (fonts, sizes, text+accent colors, margins, spacing, bullet glyphs, section order)
- [ ] `resumes` table stores paths + both JSONs; original file treated read-only forever

### 3.2 Rebuild & render
- [ ] HTML/CSS template driven by style profile (CSS variables)
- [ ] Playwright HTML→PDF render on worker
- [ ] Fidelity check vs original: page count, fonts, sizes, colors, spacing (deterministic assertions)
- [ ] Visual side-by-side comparison page for manual QA

### 3.3 Tailoring engine
- [ ] Keyword extraction from job description (LLM via provider, JSON schema validated)
- [ ] Match keywords ↔ parsed resume content; compute score ("8 of 10 key terms")
- [ ] Deck match score (PRD 3.1b, dual-signal): weighted resume overlap + RIASEC fit vs `occupation_category`; missing signal → weight 0 + renormalize; card + right-panel breakdown ("skills 7/10 · style fit: high")
- [ ] Rephrasing proposals: truthful only, each traced to a real source bullet
- [ ] Gap list: required skills absent from resume → flagged, never injected
- [ ] Stuffing guard: keyword frequency cap; no hidden/white text possible by construction
- [ ] Page-count guard: auto-tighten within tolerance or drop lowest-priority change, re-render

### 3.4 Review & versioning
- [ ] Before/after diff view (JSON patch, highlighted); explicit approval required
- [ ] `resume_versions` table: one version per job, master never overwritten
- [ ] Output: tailored PDF + editable version; version attached to tracker entry

### 3.5 Tests (golden-file + fixture cases as automated tests)
- [ ] `tests/golden/`: fixture resumes with canonical parse JSON + canonical rendered PDFs; CI diffs actual vs golden — ANY deviation is a defect (assume-broken principle)
- [ ] Seed-an-error drill: deliberately corrupt one golden comparison, prove CI fails, revert (test the tester)
- [ ] Stub provider returns fixtures; stub path labeled in UI
- [ ] Vitest: keywords only from JD (injection attempt fails)
- [ ] Vitest: gap-flagging when required skill absent
- [ ] Playwright test: page count preserved after tailoring
- [ ] CI runs tests on every push (GitHub Actions)

**DoD:** upload resume → pick a job → approve a tailored PDF that passes every fidelity assertion and all fixture tests are green in CI.

---

## Phase 4 — Assistant (est. ~2 weeks) · notes: [[brainstorm/phase-4-assistant]]

- [ ] Chat UI panel (Vercel AI SDK `useChat`, streaming)
- [ ] API route: gather user context server-side under RLS (profile, recent swipes, versions, gaps, scores)
- [ ] Answers grounded in the user's own data ("why is this job 6/10 for me?")
- [ ] Works on `stub`, `ollama`, and `hosted` providers
- [ ] Refuses/deflects questions outside its scope gracefully
- [ ] Rate limiting on the chat endpoint

**DoD:** assistant correctly answers questions about the user's own data and never leaks another user's.

---

## Phase 5 — Ship (est. 1–2 weeks) · notes: [[brainstorm/phase-5-ship]]

- [ ] Hosted Supabase project (live since Phase 0): run all migrations to current; verify env split (local/prod); upgrade tier if needed
- [ ] Promote the Vercel deployment (live since Phase 0) to production config; deploy worker to Railway; cron verified in prod
- [ ] `LLM_PROVIDER=hosted` in prod; key set
- [ ] Verify Sentry (live on app since Phase 1, worker since Phase 2) has prod DSNs and alerting configured
- [ ] Production email sending: configure custom SMTP in Supabase Auth (e.g. Resend or Postmark free tier) — the built-in sender's rate limits are not launch-safe; re-test the verification flow on the prod domain. THEN paste the branded confirmation template (supabase/templates/confirmation.html) into the hosted dashboard — template editing is locked behind custom SMTP (discovered 2026-07-10)
- [ ] Verify Supabase backups/PITR enabled on the hosted project; repo pushed to GitHub
- [ ] Privacy policy (PIPEDA-conscious) + "delete my account and all data" button (actually deletes files + rows)
- [ ] Full manual test pass on free `.vercel.app` URL
- [ ] Verify "Sartor" availability FIRST (domain .ca/.com/.app, CIPO + USPTO trademark, App Store / Play / web search, social handles, French sanity check) — then buy domain; point at Vercel; SSL green

**DoD:** a stranger can complete the full journey (PRD §8) on your domain without your help.

---

## Post-launch backlog (not before Phase 5 ships) · notes: [[brainstorm/post-launch]]
- [ ] Stripe: free vs premium tailoring tier — Stripe Checkout only (never touch raw card data); verify webhook signatures on every subscription event; store only customer ID + subscription status, never card details
- [ ] Assistant Tier C: tool-calling (read-only / confirm-to-act)
- [ ] pgvector semantic matching (Ollama embeddings) for deck ranking
- [ ] ⌘K command palette
- [ ] More sources: Ashby, Workable, SmartRecruiters, JSON-LD career pages
- [ ] Source Scout: weekly AI discovery of Canadian company boards + deterministic probe verification (AI-LAYER call point 7)
- [ ] Easy-apply engine: native dynamic form (supported question types), persona prefill, tailored PDF attach, mandatory confirm screen; audit checkpoints 2–4 (daily re-verify, click-time diff, outcome log + auto-demotion)
- [ ] Streak feature: daily-visit streak (count + last_active on profiles, reset logic, header flame pill per DESIGN) — pill stays hidden until this ships
- [ ] Mobile polish pass
