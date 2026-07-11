# DECISIONS.md — Architecture Decision Log

One dated entry per significant choice. Format: **Decision — alternatives considered — why.** Add new entries at the top.

---

## 2026-07-11 — Persona (1.2): GeoNames dataset, province codes, fixed enums, explicit onboarded_at
**Decision:** (1) the provinces→cities dataset is generated from **GeoNames cities5000** (CC BY 4.0, attribution kept in the committed JSON) by rerunnable `scripts/generate-ca-cities.mjs` — population ≥5k, capped 60 cities/province, 13 provinces/territories (471 cities); (2) `profiles.province` is **stored as the 2-letter code** (e.g. "ON") — Phase 2 matching joins on codes, display names live in the dataset; (3) `remote_preference` is fixed to `remote|hybrid|onsite|any` and `seniority` to `intern|junior|mid|senior|lead`, defined ONCE in `lib/validation/persona.ts` and feeding both the UI pills and the Zod schema (closes the free-text gap the profiles migration comment left open); (4) onboarding completion is the **explicit nullable column `profiles.onboarded_at`**, stamped once by `savePersonaAction` — never inferred from empty persona fields; (5) the salary step is skippable — roles, location, seniority required.
**Alternatives rejected:** Statistics Canada / manual city lists (heavier licensing or maintenance than GeoNames' one rerunnable script); storing province display names (breaks code-keyed matching and bloats rows); free-text remote/seniority (unmatchable in Phase 2 scoring); inferring onboarding from non-empty roles (a user clearing their roles in Settings would be bounced back into onboarding); pop ≥10k or uncapped lists (≥10k drops territorial capitals; uncapped ON/QC lists overwhelm the pill UI).
**Why:** one legal, attribution-clean, rerunnable source of geographic truth consumed by BOTH the UI and server-side validation (a city must belong to its selected province — enforced by schema, proven by `scripts/persona-probe.mts`); enums and codes make Phase 2 deck filtering and dual-signal matching deterministic instead of string-fuzzy.

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
