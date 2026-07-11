# PRD — Sartor
Swipe-based job hunting for Canada with truthful resume tailoring. (Working pitch: "Tinder for jobs, with a tailor built in." Name from the Latin root of *sartorial* — the tailor.)

## 1. Vision
A job-hunting command center: swipe through real job offers, track applications, and generate tailored resumes that are truthful, ATS-optimized, and visually identical to the user's original resume. Desktop-first and keyboard-driven, with a light, warm, creative-professional identity ("Mockup D" — see DESIGN.md): white canvas, highlighter motif, pill shapes, top navigation; dark "pulse" theme via toggle.

## 2. Target user & market
Active job seekers **in Canada** (v1 is Canada-only). All ingestion, filters, and location data are scoped to Canadian jobs. Users apply to many positions and want speed (swipe + keyboard), organization (tracker), and better response rates (tailored resumes) without lying on their CV.

## 3. Core features

### 3.1 Persona / Profile
- **Registration form (PIPEDA-minimized):** full name, email, phone (OPTIONAL), 16+ age confirmation — no full date of birth is ever collected. Country fixed to Canada in v1. Collect nothing without a stated purpose.
- Onboarding captures: desired roles, **province + cities (see 3.2a)**, remote preference, salary range (CAD), seniority.
- **Email verification required:** after signup, the user must confirm their email (Supabase Auth "confirm email" enabled) before accessing the app; unverified sessions see only a "check your inbox / resend" screen. Verification emails are Sartor-branded and redirect back to the app.
- Master resume upload (PDF/DOCX) stored read-only in a private bucket.

### 3.1a Personality assessment (skippable, swipe-style)
- Instrument: **O*NET Interest Profiler Short Form (RIASEC, 30 items, public domain, self-hosted)** — RIASEC is the instrument built for occupation matching; no vendor, no per-test cost, works offline. (Big Five via public-domain mini-IPIP is a possible v2 addition for work-style insight, NOT v1 matching.)
- UX: rendered as a swipe deck — right = "sounds like me", left = "not me" — with a progress ring, ~2–3 minutes total. It doubles as a tutorial for the app's core gesture.
- A prominent **Skip** is available at every point; the test can be taken or retaken any time from Settings. On completion, a results screen shows the top interest codes in friendly language.
- Scores (R, I, A, S, E, C) live in `personality_profiles`: strictly user-scoped RLS, included in account deletion, never shared with employers or any third party.

### 3.1b Dual-signal matching
- Match score = weighted blend of the **resume signal** (keyword overlap vs the parsed resume) and the **personality signal** (RIASEC fit vs the job's `occupation_category`).
- **Graceful degradation is mandatory:** a missing signal gets weight 0 and remaining weights renormalize — test skipped → resume-only; no resume yet → personality-only; neither → cards show tags only. The formula must never error or display a misleading score when a signal is absent.
- The breakdown is always transparent on the card / right panel (e.g. "skills 7/10 · style fit: high").
- Jobs receive `occupation_category` (Canadian NOC family) at ingest: deterministic title/keyword mapping first; ambiguous titles fall back to an LLM classifier (**AI call point #8**) whose output MUST be one of the fixed category list — anything else → `uncategorized`, which zeroes the personality term for that job only.
- v2 evolution: pgvector embedding similarity replaces keyword overlap as the resume signal; personality becomes a re-ranker (already in backlog).

### 3.2 Job discovery (swipe deck)
- Card stack showing real job postings: logo, title, company, location, salary (if available), 3–4 highlight tags. **Match score (see 3.1b)** appears when at least one signal exists (parsed resume and/or personality profile); with neither, cards show tags only.
- Full description opens on demand (keyboard `↑`/`Space`, or click) — description text comes from the real posting.
- Actions: decline (`←`), save/apply (`→`), undo (`Z`). Mouse drag also works (Framer Motion).
- Every swipe is recorded; a job never reappears once swiped (unless undone).
- Job sources — Canada-scoped, legal, no adversarial scraping:
  - ATS board APIs: Greenhouse, Lever (later Ashby, Workable) via a slug registry **seeded with Canadian companies** (e.g. Shopify, Wealthsimple, 1Password, Faire, Clio — verify each company's ATS when seeding). These ARE the "career sections" of Canadian company websites, consumed via their official board APIs.
  - Aggregator APIs: **Adzuna with country=ca** first; optionally Jooble/JSearch (both cover Canada) later.
  - **Job Bank Canada** (Government of Canada): feed-based access — verify current terms of use during Phase 2 before integrating.
  - schema.org JobPosting JSON-LD from Canadian career pages (v2)
  - **Source Scout (v1.5, AI call point #7):** weekly LLM pass proposes Canadian companies + probable ATS slugs; the worker VERIFIES each by probing the real board API (resolves + lists Canadian jobs → inserted into `job_sources` tagged `discovered_by: scout`; else discarded/watched). AI proposes, probe disposes — hallucinated slugs simply 404. Read-only and legal, so no approval gate needed. Companies with fully custom career pages stay out of scope until the JSON-LD parser (scraping them is forbidden).

### 3.2a Location & search filters (Canada)
- **Province selector:** all 10 provinces + 3 territories, single select.
- **City selector:** cascading multi-select populated from a static provinces→cities JSON dataset shipped with the app (derived from GeoNames; no API). Selecting a province filters the deck to it; selecting cities narrows further. "Remote (Canada)" is a first-class option.
- **Position search bar:** free-text search on job title (Postgres full-text search / pg_trgm via Supabase). Applies to the deck together with the location filters.
- These filters live in the left rail (desktop) and drive the deck query; persona defaults pre-fill them.

### 3.2b Freshness condition (MANDATORY — Claude Code must enforce at every layer)
The app shows only **fresh, accurate, real** postings, defined as **posted 0–10 days ago**:
1. **At ingestion:** the worker discards any posting whose `posted_at` is older than 10 days at fetch time. Postings with no reliable `posted_at` from the source are excluded — a job with an unknown age cannot be proven fresh.
2. **Continuously:** a daily worker pass sets `is_fresh = false` on any job whose `posted_at` has aged past 10 days. (Independent of `is_active`, which tracks whether the source still lists it — a job must be BOTH active and fresh to be shown.)
3. **At query time (defense in depth):** the deck query always includes `WHERE is_active AND posted_at >= now() - interval '10 days'` — even if the worker pass lags, stale jobs can never reach the deck.
4. **In the UI:** every card shows relative age ("posted 3 days ago") so freshness is visible, not just enforced.
5. **At apply-click (validity moment of truth):** before opening or rendering anything, re-verify the job still exists at its source (board API probe for ATS jobs; for easy-lane jobs also re-fetch the live form and diff it against the validated schema). Gone or changed → mark inactive / downgrade to hard on the spot, tell the user, never send them to a dead or mismatched posting.

### 3.2c Ingestion & two-lane apply
- **Ingestion:** worker polls hourly, deduplicates (hash of company+title+location), normalizes, refreshes `last_seen_at`, marks postings unseen for >48h `is_active = false`.
- **Two-lane apply.** At ingest, each job is classified `apply_mode: easy | hard`. `easy` = the ATS officially accepts API submissions AND every application question type is in our supported set (guilty until proven easy; exotic forms → hard). `hard` = deep link to the real posting; all aggregator jobs are hard. The card shows the lane badge; the deck can filter by lane. The easy-lane engine (post-launch): fetch the live form from the ATS, render it natively, pre-fill from persona, attach the tailored PDF, and require a MANDATORY review/confirm screen — machine prepares, human presses send; never zero-review submission. Any failure at any point downgrades instantly to hard, so the user is never stuck. Automating LinkedIn/Indeed/ZipRecruiter Easy Apply is forbidden permanently (ToS violation + user-account ban risk). No auto-apply in v1.

### 3.3 Application tracker
- Columns: Saved → Applied → Interviewing → Offer → Closed (matches the `applications.status` enum exactly).
- Each entry links to the job, its tailored resume version (if any), and notes.

### 3.4 Resume tailoring pipeline
Rules (non-negotiable, see also CLAUDE.md):
- Never edit the uploaded file. Parse → rebuild → tailor → render to a NEW PDF.
- **Parse:** PDF via PyMuPDF; DOCX is first converted to PDF (headless LibreOffice on the worker) so ONE pipeline handles both. PyMuPDF extracts structured content JSON (sections, bullets, order) + style profile JSON (font families/sizes, text & accent colors, margins, line/word spacing, bullet glyphs, section order).
- **Rebuild:** HTML/CSS template driven by the style profile (CSS variables). Rendered to PDF with Playwright. The HTML/structured content doubles as the editable version.
- **Tailor (truthful ATS optimization):**
  - Keywords only from the target job description.
  - A keyword is applied only when it truthfully matches real experience — rephrase genuine skills into the job's wording (e.g. "customer support" → "customer success").
  - Never fabricate titles, dates, employers, metrics, achievements.
  - No keyword stuffing, no hidden text, no unnatural repetition.
  - Required skills the user lacks → flagged as gaps, never injected.
- **Fidelity guarantees (deterministic post-render checks):** same design/template, same fonts & sizes, same colors, same spacing, same page count. Page-count guard: if tailoring adds a page, auto-tighten within tolerance or drop lowest-priority change and re-render.
- **Review:** before/after diff view; user approves every change before finalizing.
- **Score:** ATS/match score, e.g. "covers 8 of 10 key terms."
- **Output:** tailored PDF (primary) + editable version.
- **Versioning:** each tailored resume is a new versioned document tied to its job; the master resume is never overwritten.
- **Offline stub path:** `LLM_PROVIDER=stub` returns fixture results, clearly labeled "stub" in the UI. Keeps local dev working without keys and powers automated tests.

### 3.5 In-app assistant ("Career Copilot")
- **Tier A (v1):** contextual help — tooltips, empty states, FAQ. No AI.
- **Tier B (Phase 4):** RAG chat over the user's own data (profile, swipes, resume versions, gaps, scores). Next.js API route gathers context server-side under RLS, streams answer via Vercel AI SDK. Uses the LLM provider interface.
- **Tier C (post-launch):** tool-calling assistant (`search_jobs`, `get_resume_gaps`, `start_tailoring`, `get_application_status`). All tools read-only or behind explicit user confirmation.

## 4. Architecture
Modular monolith + one worker:

- **Next.js app (Vercel):** UI, auth, API routes (assistant, tailoring orchestration).
- **Supabase:** Postgres (RLS everywhere), Auth (email + Google OAuth), Storage (private resume buckets).
- **Worker (Railway):** cron job ingestion; resume parse/render jobs (queue: pg-boss or Inngest).
- **LLM provider interface:** `stub | ollama | hosted`. Ollama (Qwen 2.5 / Llama 3.1 8B, JSON mode) for free local dev; hosted frontier model for production rephrasing quality. Possible future tiering: free = local pipeline, premium = frontier tailoring.
- **Embeddings (v2):** nomic-embed-text via Ollama + Supabase pgvector for semantic job↔resume ranking.

## 5. Data model (core tables)
- `profiles` — user persona (full name, optional phone, age-confirmed flag, desired roles, province, cities[], remote pref, salary range CAD, seniority, onboarded_at — NULL until onboarding completes; an explicit fact, never inferred from empty fields). Email lives in `auth.users` only — never duplicated into profiles.
- `personality_profiles` — user_id, scores R/I/A/S/E/C, instrument version, completed_at (absent = skipped)
- `jobs` — normalized postings (source, external_id, company, title, province, city, salary CAD, description, apply_url, apply_mode easy|hard, occupation_category NOC-family|uncategorized, posted_at, last_seen_at, is_active, is_fresh, dedup_hash)
- `job_sources` — source registry (type, company slug / API config, last_polled, discovered_by manual|scout, status active|watch)
- `swipes` — user_id, job_id, direction, created_at (unique on user+job)
- `applications` — user_id, job_id, status saved|applied|interviewing|offer|closed, resume_version_id, notes
- `resumes` — master resume per user (storage path, parsed content JSON, style JSON)
- `resume_versions` — tailored outputs: resume_id, job_id, content diff, score, gaps, storage path, approved_at

**RLS model (precise):** user-owned tables (`profiles`, `personality_profiles`, `swipes`, `applications`, `resumes`, `resume_versions`) are strictly user-scoped (`user_id = auth.uid()`). Shared reference tables (`jobs`, `job_sources`) are read-only for authenticated users and writable only by the worker via the service-role key — never by client code.

## 6. Non-goals (v1)
- No third-party personality-test vendors and no MBTI-style instruments — self-hosted public-domain RIASEC only (mini-IPIP later at most). No auto-apply. No automating any platform's Easy Apply (LinkedIn/Indeed/ZipRecruiter) — ever. No mobile app (responsive web only). No scraping LinkedIn/Indeed/Glassdoor. No payments until post-launch. No agent-per-process architecture — deterministic pipelines with LLM calls at defined steps only.

## 7. Legal / trust
- Privacy policy + "delete my account and all data" button before real users.
- Canada privacy law: PIPEDA-conscious defaults (consent, purpose limitation, right to deletion). Resumes are personal information under PIPEDA.
- Every job card shows source + posting date and links to the original. Stale jobs marked inactive aggressively.

## 8. Success criteria for launch
- A user can: sign up → confirm email → build persona → complete OR skip the personality test → upload resume → swipe real jobs (dual-signal match scores shown) → apply via deep link → generate an approved tailored PDF that passes all fidelity checks → ask the assistant about their own data.
