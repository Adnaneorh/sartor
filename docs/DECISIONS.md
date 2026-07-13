# DECISIONS.md — Architecture Decision Log

One dated entry per significant choice. Format: **Decision — alternatives considered — why.** Add new entries at the top.

---

## 2026-07-12 — Swipe deck (1.4): swipes table shape, filters-in-URL, search + filter semantics
**Decision:** (1) **`swipes` has no update path.** Undo is a DELETE of the user's own row (re-swipe = a fresh INSERT); the table ships select/insert/delete RLS policies and grants only — no update policy, no UPDATE grant — so any UPDATE dies at the privilege layer (42501). `unique(user_id, job_id)` is the "a job never reappears once swiped" invariant (PRD 3.2); a duplicate INSERT (23505) is treated as idempotent success by `recordSwipeAction`. Same revoke-then-grant hardening as 1.3 (anon nothing). (2) **Title search is a parameterized `.ilike('%q%')`** accelerated by a pg_trgm trigram GIN index on `jobs.title`, chosen over Postgres tsvector full-text: job titles are short strings where substring matching ("develop" → "Developer") beats stemmed word search, and PRD 3.2a names pg_trgm. `%`/`_`/`\` are escaped before the term reaches the filter (rule 7/11). The extension lives in the `extensions` schema (no RLS/privilege change). (3) **Filters live in the URL.** The server component owns THE canonical deck query (`lib/jobs/deck-query.ts`) — the only permitted deck read path, with the mandatory freshness triplet (`is_active AND is_fresh AND posted_at >= now()-10d`, rule 14) baked in before any filter. URL parsing is lenient (junk drops to its default, never an error page); a bare `/home` seeds the rail from the persona (PRD 3.2a), while the rail always writes an `f=1` marker so a deliberately-cleared rail stays cleared instead of re-triggering the defaults. (4) **Remote filter = all / remote / on-site:** under "all" with a province selected, Canada-wide remote postings (`province is null`) still appear alongside that province's jobs — a remote job is workable from anywhere; "remote" ignores location entirely; "on-site" narrows strictly by province/city. (5) **Min-salary keeps undisclosed-salary jobs:** the filter shows jobs with `salary_max_cad >= bar` OR `salary_max_cad is null` — a real fresh job with no salary data can't be proven under the bar, and hiding it is worse than showing it.
**Alternatives rejected:** an update policy on swipes (undo-as-delete needs none; fewer privileges on sensitive career data); tsvector full-text (stemming loses substring hits on short titles); filters in client state / a POST (URL filters are shareable, back-button-correct, and let the server keep the one freshness-guaranteed query path); strict province-only under "all" (would hide relevant Canada-wide remote roles); hiding undisclosed-salary jobs under a min-salary bar (suppresses real fresh postings on missing data).
**Why:** the smallest privilege surface on a user-owned table (rule 1); one server-owned query where rule 14 can never be bypassed; filter semantics that never hide a real, fresh, matching job.

---

## 2026-07-11 — Jobs table (1.3): schema concretization, non-unique dedup_hash, revoke-then-grant, local-only seeds
**Decision:** (1) `jobs` concretizes PRD §5 with `is_remote` (the 3.2a "Remote (Canada)" filter needs a column), `logo_url` (nullable; null → company-initial monogram on the card), `tags text[]` (the 3–4 card highlights nothing else can feed before Phase 3), and a `salary_min_cad`/`salary_max_cad` pair mirroring profiles' check constraint. (2) `dedup_hash` is **deliberately NOT unique** — a plain index. The single upsert identity is `(source, external_id)`; two unique constraints are two ON CONFLICT arbiters, and the first cross-source duplicate (or an edited seed row) would abort a whole batch with 23505. Dedup stays ingest-side logic (PRD 3.2c); ROADMAP 2.2's upsert-logic task owns the final conflict/merge policy. Recipe (worker must reproduce byte-for-byte): sha256 hex of `lower(company)|lower(title)|coalesce(province,'')|lower(coalesce(city,''))`. (3) **Revoke-then-grant** on every new table: live inspection of `pg_default_acl` shows anon/authenticated get latent `Dxtm` (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) on every postgres-created public table — and RLS never polices TRUNCATE. This refines the 2026-07-10 privileges entry: defaults grant no DML (hence that day's 42501) but are NOT empty. `profiles` retro-hardened in the same session (migration 20260711201512; authenticated back to exactly select/insert/update/delete, anon nothing; persona probes re-run green). (4) Seeds: 50 fictional-company hand-written jobs with `.example` apply hosts (guaranteed-dead TLD — no user ever lands on a real, mismatched posting), all `apply_mode=hard`, all `occupation_category=uncategorized`, `posted_at` computed at RUN TIME from per-row hour offsets ≤228h, prune-then-upsert re-runs; the seed script refuses non-local Supabase hosts unless `--remote` plus typed hostname confirmation. (5) The hosted free-tier project stays **EMPTY until Phase 5** (option B) — ROADMAP 0.2 amended; no re-seed chore, no fake data in production.
**Alternatives rejected:** unique `dedup_hash` (dual upsert identities crash Phase 2 ingest or force a re-migration); real company names in seeds (fake postings attributed to real employers on a public-ish project); seeding hosted now (run-time freshness means a ≥every-10-days re-seed chore with no worker to do it); omitting the logo entirely (PRD 3.2 cards spec one; a nullable column now is churn-free); relying on RLS alone for write denial (RLS can't block TRUNCATE, and grant-broad is exactly what 2026-07-10 rejected).
**Why:** 1.4's deck consumes every added column; fail-closed privileges must be true at the privilege layer, not just asserted in comments; freshness (rule 14) makes run-time `posted_at` the only re-runnable seed design.

---

## 2026-07-11 — Persona save hardening (audit #5): DB-guarded stamp, recover-don't-loop
**Decision:** (1) `onboarded_at` is stamped by a dedicated UPDATE guarded `.is('onboarded_at', null)` — the stamp-once invariant lives in the query, not in app logic; 0 matched rows means someone already stamped and is success, never an overwrite. (2) A persona save that finds no profiles row (PGRST116 despite the signup trigger) RECOVERS by inserting the row under `profiles_insert_own` with a Sentry warning — not a hard failure, never a silent retry loop. (3) Every Postgrest error that ends in a generic user message is Sentry-captured first.
**Alternatives rejected:** read-then-write with an error check (still racy between the two statements); stamping via DB trigger or column default (hides the rule in schema where a one-clause query guard is inspectable at the call site); failing hard on a missing row (turns a recoverable inconsistency into a dead end the user can't escape).
**Why:** an invariant the database enforces can't regress through an app-code refactor; the probe proves the guard behaviorally (re-stamp matches 0 rows, first timestamp survives) and a seeded guard-drop makes it fail — enforcement and its test both live below the comment layer.

---

## 2026-07-11 — Persona (1.2): GeoNames dataset, province codes, fixed enums, explicit onboarded_at
**Decision:** (1) the provinces→cities dataset is generated from **GeoNames cities5000** (CC BY 4.0, attribution kept in the committed JSON) by rerunnable `scripts/generate-ca-cities.mjs` — population ≥5k, capped 60 cities/province, 13 provinces/territories (471 cities); (2) `profiles.province` is **stored as the 2-letter code** (e.g. "ON") — Phase 2 matching joins on codes, display names live in the dataset; (3) `remote_preference` is fixed to `remote|hybrid|onsite|any` and `seniority` to `intern|junior|mid|senior|lead`, defined ONCE in `lib/validation/persona.ts` and feeding both the UI pills and the Zod schema (closes the free-text gap the profiles migration comment left open); (4) onboarding completion is the **explicit nullable column `profiles.onboarded_at`**, stamped once by `savePersonaAction` — never inferred from empty persona fields; (5) the salary step is skippable — roles, location, seniority required.
**Alternatives rejected:** Statistics Canada / manual city lists (heavier licensing or maintenance than GeoNames' one rerunnable script); storing province display names (breaks code-keyed matching and bloats rows); free-text remote/seniority (unmatchable in Phase 2 scoring); inferring onboarding from non-empty roles (a user clearing their roles in Settings would be bounced back into onboarding); pop ≥10k or uncapped lists (≥10k drops territorial capitals; uncapped ON/QC lists overwhelm the pill UI).
**Why:** one legal, attribution-clean, rerunnable source of geographic truth consumed by BOTH the UI and server-side validation (a city must belong to its selected province — enforced by schema, proven by `scripts/persona-probe.mts`); enums and codes make Phase 2 deck filtering and dual-signal matching deterministic instead of string-fuzzy.
**Numbering note (2026-07-11, audit #5 finding 3):** the clause numbers (1)–(5) above are CANONICAL — code and migration comments cite them as `DECISIONS 2026-07-11 §n`. The phase-1 change-log plan lines and the session-2 daily log predate this entry and use the plan's own DECISION 1–4 numbering; read those historical lines with the map plan-1→§4 (onboarded_at), plan-2→§3 (enums), plan-3→§1 (dataset), plan-4→§5 (salary).

---

## 2026-07-10 — Table privileges: explicit GRANTs, anon denied at the privilege layer
**Decision:** every migration that creates a table also writes its GRANTs explicitly, in the same file as its RLS policies: `authenticated` gets exactly the DML it needs (rows still filtered by RLS), `service_role` gets worker access, and `anon` gets NOTHING on user-owned tables — logged-out clients are rejected by Postgres privileges before RLS is ever evaluated. Grants gate the table; policies filter the rows.
**Alternatives rejected:** Supabase's grant-broad/RLS-filter convention (grant to anon+authenticated, rely on policies alone) — one missing policy would expose rows to anonymous clients instead of failing closed; relying on environment default privileges — newer local images don't auto-grant at all (discovered when the 0.3 smoke test hit 42501), and hosted/local defaults differing is exactly the class of surprise explicit SQL eliminates.
**Why:** defense in depth with fail-closed behavior, and migrations that carry their whole security story in one reviewable file. Governs every future table (jobs, swipes, applications, resumes, resume_versions, personality_profiles, job_sources).

---

## 2026-07-09 — Monorepo with `worker/` subfolder
**Decision:** one repository; Next.js at the root (Vercel), Python worker in `worker/` (Railway deploys the subfolder via its root-directory setting). Target layout documented in CLAUDE.md "Where things are".
**Alternatives:** two repos (app + worker).
**Why:** a beginner maintaining two repos doubles CI, secrets, and doc-sync surface; the worker imports nothing from the app so a subfolder is clean; Railway supports subfolder deploys natively; every Claude Code session sees spec + all code together.

---

## 2026-07-09 — Beta hardening: early deploy, early Sentry, CORS rule, Dependabot, Stripe security captured
**Decision:** (1) skeleton deployed to Vercel in Phase 0 (preview URLs from day one) while dev stays local-first; (2) Sentry on the app from Phase 1, worker from Phase 2; (3) new golden rule 16 — explicit CORS lockdown on worker endpoints, API routes stay same-origin; (4) Dependabot/Renovate enabled in Phase 0.1; (5) Stripe security rules (Checkout only, webhook signature verification, store only customer ID + subscription status) written into the post-launch backlog now.
**Alternatives:** keep deploy + Sentry in Phase 5 (rejected: months of deploy-only and silent-error blind spots); leave CORS/deps/Stripe rules implicit (rejected: implicit rules get forgotten by the time they matter).
**Why:** absorbed from an external beginner-SaaS security checklist during a plan audit; each patch is near-zero cost and removes a real risk class. Applied on the beta clone only — original docs untouched.
**Audit addendum (same day, pass-3 review):** integration defects found and fixed — key inventory realigned to the new phase placements (Sentry app→P1, Sentry worker→P2, Upstash→P3 [wrong even pre-patch: rate limiting starts in Phase 3], hosted Supabase free tier→P0); worker Sentry task added to ROADMAP 2.1; Phase 0/Phase 5 hosted-Supabase ambiguity resolved (created P0, hardened P5). Also fixed a pre-existing defect: golden rule 1's user-owned table list was missing `personality_profiles` (PRD §5 had it; rule 15 covered intent but the list was wrong).

---

## 2026-07 — Visual identity: Mockup D (light creative), dark "pulse" via toggle
**Decision:** the shipped identity is **Mockup D** — warm white canvas, top nav, highlighter motif (mint = matched, amber = gap, red tint = dead), pill shapes, offset tint panels, "vibe match" ring, quiet streak, mono data. Light is the DEFAULT theme; the dark toggle uses Mockup C's "pulse" palette. Supersedes the earlier "dark & sleek dev-tool" identity decision below.
**Alternatives rejected:** A (pure dark command-center — kept as the dark toggle's ancestor but too austere as the face for the target generation); B (neo-brutalist Gen Z — user verdict: childish; trend-dated, would force a repositioning); C (dark pulse — strong, retained as the dark theme rather than the default).

## 2026-07 — Name: Sartor
**Decision:** the app is named **Sartor** (Latin root of *sartorial* — the tailor), owning the truthful-tailoring differentiator; reads dev-tool, short, bilingual-safe.
**Runners-up:** Boreal (Canada identity), Chinook (fresh-opportunity story), Riffle (swipe mechanic), Portage (career metaphor; Portage Ventures conflict risk).
**Open obligation:** availability NOT yet verified — domain, CIPO/USPTO, app stores, handles, French check are a Phase 5 gate before the domain purchase (ROADMAP Phase 5).

## 2026-07 — Verification protocol: golden references + assume-broken auditing
**Decision:** three verification passes of three KINDS (verified edits → automated `scripts/check-docs.sh` in CI → adversarial semantic review with a "defect exists, find it" premise), risk-tiered (full protocol for spec/schema/security/money; pass 1 + script for trivia). Golden references (`tests/golden/`, docs invariants) define perfect; any deviation is a defect. Every checker is proven by a seeded error before being trusted.
**Alternatives rejected:** three identical re-reads (repeats one failure class, misses the rest); instruction-only sweeps (forgettable in long sessions — the script cannot forget); uniform heavy protocol for trivial edits (turns process into theater, which trains skipping).

## 2026-07 — Personality-based dual-signal matching
**Decision:** skippable swipe-style RIASEC test (O*NET Interest Profiler Short Form, 30 items, public domain, self-hosted); PIPEDA-minimized registration (full name, email, optional phone, 16+ confirmation — no full DOB); deterministic weighted dual-signal match score (resume overlap + RIASEC fit vs NOC occupation_category) with mandatory graceful degradation; occupation classifier = AI call point #8, list-validated.
**Alternatives rejected:** MBTI/16personalities (weak validity, not built for job matching, no API); commercial assessment vendors (cost, lock-in, PIPEDA third-party disclosure); LLM-scoring every card (nondeterministic, slow, expensive); mandatory test (conversion killer); collecting full DOB + mandatory phone (PIPEDA data minimization).

## 2026-07 — Two-lane apply + Source Scout
**Decision:** apply is `easy` (official ATS application APIs, native confirm-gated form, post-launch) or `hard` (deep link, v1 default). Four-checkpoint audit keeps the easy badge truthful. Source registry grows via an AI scout whose every proposal is verified by probing real board APIs.
**Alternatives rejected:** automating LinkedIn/Indeed Easy Apply (ToS violation, user-account ban risk); zero-review auto-submit (application-quality collapse); hand-only registry growth (supply bottleneck).

## 2026-07 — Target market: Canada only (v1)
**Decision:** all ingestion, filters (province → city cascade + title search), salary (CAD), and the 0–10 day freshness rule are scoped to Canada.
**Why:** focused supply beats thin global coverage; Canadian tech employers are well represented on Greenhouse/Lever; Adzuna supports country=ca natively.

## 2026-07 — Initial stack decisions (project planning)

**Next.js + TypeScript** over Vue/Nuxt, SvelteKit — one language front+back, largest ecosystem, best fit for swipe-card UI, first-class support from every chosen tool.

**Supabase** over Neon, Firebase, Appwrite — need relational queries (users→swipes→jobs→versions), and Supabase bundles Postgres + Auth + Storage + RLS. Neon is DB-only; Firebase's NoSQL fights relational queries; Appwrite has a smaller ecosystem.

**Supabase Auth** over Clerk, Better Auth, Firebase Auth — already on Supabase, zero extra cost, email + OAuth out of the box. Clerk nicer DX but pricey at scale.

**Vercel** (app) + **Railway** (worker) over Netlify/Render-only — Vercel is Next.js's native home; worker needed separately because ingestion cron + Playwright PDF rendering don't fit serverless time limits.

**Legal job sources (ATS board APIs + aggregators)** over scraping LinkedIn/Indeed — scraping violates ToS, breaks constantly, and can't support a legitimate paid product. Greenhouse/Lever public board APIs + Adzuna instead.

**PyMuPDF parse + HTML/CSS rebuild + Playwright render** over LaTeX or in-place PDF editing — PyMuPDF exposes per-span font/size/color/position (needed for style fidelity); HTML/CSS is easiest to make pixel-faithful and doubles as the editable version. Never edit uploads in place (product rule).

**Deterministic pipelines with LLM calls at defined steps** over agent-per-process — fidelity guarantees (page count, fonts, colors) must be deterministic code; agents add nondeterminism and bug surface. LLM used only for: keyword extraction, rephrasing proposals, gap explanation, assistant chat. True tool-calling agent only in post-launch assistant Tier C, behind user confirmation.

**LLM provider interface (stub | ollama | hosted)** — Ollama (Qwen 2.5) makes local dev free/offline and upgrades the stub path to a real pipeline; hosted frontier model for production rephrasing quality; stub powers fixture tests. Also enables future free/premium tiering.

**Dark & sleek dev-tool design, desktop-first, both themes** — (SUPERSEDED by "Visual identity: Mockup D" above; keyboard-driven command-center positioning retained, dark palette lives on as the toggle theme.)

**Stripe deferred to post-launch** — validate the product first; Stripe over PayPal when the time comes (better dev tooling, subscription primitives).

---

## Template for new entries

## YYYY-MM-DD — Title
**Decision:** …
**Alternatives:** …
**Why:** …
