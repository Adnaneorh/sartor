# CLAUDE.md — Project Context for Claude Code

Read this before writing any code. Full details live in `docs/`.

**Reading order for a new session:** this file → `docs/PRD.md` → the current phase in `docs/ROADMAP.md` → `docs/DESIGN.md` before any UI work → `docs/AI-LAYER.md` before any AI, worker, or guard work. Log to `docs/brainstorm/` (issues) and `docs/daily/` (session end).

## What this project is
**Sartor** — a desktop-first web app: swipe through real job offers (accept/decline), track applications, and generate truthful, ATS-optimized tailored resumes that preserve the original resume's exact visual design. See `docs/PRD.md`.

## Stack
- **App:** Next.js (App Router) + TypeScript, deployed on Vercel
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion (swipe deck). Design tokens in `docs/DESIGN.md` — use CSS variables, never hardcode colors.
- **Data:** Supabase — Postgres, Auth, Storage. Local dev via Supabase CLI (Docker).
- **Worker:** Python service on Railway — job ingestion (cron), resume parsing (PyMuPDF), DOCX→PDF conversion (headless LibreOffice), PDF rendering (Playwright HTML→PDF), source probes (apply-mode + validity + scout verification)
- **LLM:** provider interface with three modes via `LLM_PROVIDER` env: `stub` | `ollama` (local dev, Qwen 2.5) | `hosted` (production). All AI calls go through this interface — never call a model API directly from feature code.
- **Payments:** Stripe (post-launch, not yet)

## Golden rules (non-negotiable)
1. **Every table has Row Level Security.** User-owned tables (`profiles`, `personality_profiles`, `swipes`, `applications`, `resumes`, `resume_versions`) are strictly user-scoped. Shared reference tables (`jobs`, `job_sources`) are read-only to authenticated users; only the worker (service-role key) writes them. New table = RLS policy in the same migration.
2. **Resumes are sensitive data.** Private Storage buckets only, per-user access policies. Never a public bucket, never a public URL.
3. **Never edit an uploaded resume file in place.** Originals are read-only. Tailoring = parse → rebuild → render to a NEW versioned file.
4. **Truthful tailoring only.** Keywords must exist in the job description AND match real experience in the resume. Never fabricate skills, titles, dates, employers, or metrics. Gaps get flagged, not filled.
5. **Fidelity guarantees are code, not AI.** Page count, fonts, colors, spacing preservation are enforced by deterministic checks after rendering — never trusted to a model.
6. **Deterministic skeleton, LLM joints.** Pipelines are ordinary code; LLM calls happen only at defined steps (keyword extraction, rephrasing proposals, gap explanation, assistant chat, source-scout discovery, occupation classification) and their output is schema-validated — and for the scout, probe-verified — before use.
7. **No hand-built SQL strings.** Supabase client / parameterized queries only.
8. **Secrets live in `.env` (gitignored).** Only `NEXT_PUBLIC_*` vars may reach the client.
9. **Assistant tools are read-only or require explicit user confirmation.** No silent mutations.
10. **Keep fixture tests green:** keywords-only-from-JD, gap-flagging, page-count preserved, stub path labeled. Never merge a change that breaks them.
11. **Validate all inputs at the boundary with Zod** (API routes, forms, LLM outputs). Never trust the client.
12. **Rate-limit expensive endpoints** (resume upload, tailoring, assistant chat) — Upstash Redis or equivalent.
13. **Flag sensitive code for careful human review.** When a change touches auth, RLS policies, Storage access, file handling, or (later) payments, explicitly tell the user: "this needs line-by-line review — test with two accounts."
14. **Freshness is mandatory (PRD 3.2b).** Only jobs posted 0–10 days ago are ever shown: enforce at ingest (discard old/undated), daily pass (`is_fresh`), query time (hard filter on `posted_at`), and apply-click (source re-probe). Never build a deck query without the freshness filter.
15. **Personality data is sensitive profile data (PRD 3.1a/3.1b).** The RIASEC test is ALWAYS skippable; scores live in `personality_profiles` (user-scoped RLS, included in delete-account, never shared). Matching must degrade gracefully: missing signal → weight 0 + renormalize — never an error, never a misleading score. Registration is PIPEDA-minimized: no full DOB ever, phone optional.
16. **Explicit CORS lockdown.** Next.js API routes stay same-origin (the default — never loosen it with a wildcard). Any HTTP endpoint the Railway worker exposes must restrict allowed origins to the app's domains only; queue/webhook endpoints verify a shared secret or signature instead of relying on CORS alone.

## Workflow rules
- Work on ONE roadmap task at a time (see `docs/ROADMAP.md`). Propose a plan (files to create/modify + why) before writing code for anything non-trivial.
- After completing a task: update the checkbox in `docs/ROADMAP.md` and append a short entry to `docs/daily/`.
- Log significant technical choices in `docs/DECISIONS.md` (date, decision, alternatives, why).
- Small commits, one feature each.
- After each completed feature, the user runs a FRESH review session: audit the diff against these golden rules (see docs/AI-LAYER.md §5). Cooperate as auditor when asked; report issues only.
- **Live brainstorm sync:** an approved plan modification is COMPLETE only when, in the same session: the spec files (PRD/ROADMAP/AI-LAYER/DESIGN) are updated; a DECISIONS entry is logged if the choice is significant; AND a dated line is appended to the "Change log" of every affected phase file in `docs/brainstorm/`. Never implement an approved change without this — the next session's accuracy depends on it.
- **Verification protocol on every update — three passes of three KINDS, risk-tiered:**
  (1) *Verified edits* — every change confirmed landed (exact-match edit scripts for docs; typecheck + tests for code).
  (2) *Automated consistency check* — run `scripts/check-docs.sh` (pointers, wikilinks, schema names, enums, counts, estimate arithmetic, naming consistency). This script is committed and runs in CI on every push, so this pass can never be forgotten.
  (3) *Adversarial semantic review (assume-broken stance)* — the reviewer's premise is "a defect EXISTS in this change; find it." Hunt for contradictions, dependency-order errors, and gaps against the golden references; always name the most suspicious area even when no defect is found — "looks fine" is not an acceptable pass-3 report.
  **Risk tiers:** spec/schema/security/money changes get all three passes, always. Trivial changes (typos, wording) get pass 1 + the automated script. When in doubt → full treatment.
  **Golden references:** fixture inputs with known-perfect outputs (`tests/golden/`: fixture resumes → canonical content/style JSON → canonical rendered PDFs; docs invariants encoded in check-docs.sh). Any deviation from golden IS a defect — no judgment call.
  **Test the tester:** whenever check-docs.sh or a golden fixture is created or changed, seed one deliberate error, prove the check fails on it, then revert. A checker never proven against a real defect is an unverified claim.

## Secrets & API keys (Claude: handle this on the user's behalf)
Maintain a committed `.env.example` listing every variable name with a placeholder and a comment saying where to obtain it — create it in Phase 0 and update it the moment any new env var is introduced. Never write real values into it or into any committed file; real values go only in gitignored `.env` / `.env.local` (local) or the Vercel/Railway dashboards (production). When a task requires a key the user hasn't provided, do NOT invent or hardcode one: add the variable to `.env.example`, then pause and tell the user exactly what to obtain, from where, and where to paste it. Key inventory by phase:
- Phase 0: Supabase local keys (printed by `supabase start` → `.env.local`); Ollama needs no key (localhost:11434); Vercel project link + hosted Supabase FREE-TIER keys (anon + service-role → Vercel env dashboard) for the day-one deployed skeleton
- Phase 1: Sentry DSN for the app (free tier → env vars)
- Phase 2: Adzuna App ID + App Key (free registration → worker `.env`); Greenhouse/Lever board APIs need no key (public, slugs only); O*NET Web Services key (free registration) ONLY IF the NOC crosswalk uses it — self-hosted RIASEC items need no key; Sentry DSN for the worker
- Phase 3: Upstash Redis URL + token (rate limiting on upload/tailoring endpoints starts here, not Phase 5)
- Phase 5: production-grade hosted Supabase config (or upgrade of the Phase 0 free-tier project), hosted LLM key (e.g. Anthropic), SMTP provider API key (Resend/Postmark, for Supabase Auth custom SMTP) → Vercel/Railway env dashboards, never files. Sentry DSNs and Upstash were provisioned in Phases 1–3; Phase 5 only VERIFIES they're set in prod
- Post-launch: Stripe publishable + secret + webhook secret
Only `NEXT_PUBLIC_`-prefixed vars may reach the client; of the above, only the Supabase anon key and the Sentry DSN (`NEXT_PUBLIC_SENTRY_DSN` — DSNs are publishable ingest keys, not secrets; amended 2026-07-10) qualify.

## Where things are
- Product spec: `docs/PRD.md`
- Design system & tokens: `docs/DESIGN.md`
- Phase plan & progress tracking: `docs/ROADMAP.md`
- Decision log: `docs/DECISIONS.md`
- AI layer, agents, tools, audit loop: `docs/AI-LAYER.md`

## Target repo layout (monorepo — one repo, two deploys)
```
sartor/
├── CLAUDE.md              ← this file (read first, every session)
├── BETA-NOTES.md          ← beta-clone provenance & change log
├── .env.example           ← every variable name + where to get it (no real values)
├── .gitignore             ← Node + Python + .env* (before first commit)
├── .github/workflows/     ← CI: typecheck, lint, fixture tests, check-docs.sh
├── scripts/check-docs.sh  ← docs consistency checker (proven by seeded error)
├── docs/                  ← PRD, ROADMAP, DESIGN, DECISIONS, AI-LAYER,
│   ├── brainstorm/           brainstorm phase files, daily session logs
│   └── daily/
├── app/                   ← Next.js App Router pages/routes (created by create-next-app)
├── components/ · lib/     ← UI components; lib/llm/ = provider interface (stub|ollama|hosted)
├── supabase/              ← migrations (every table ships WITH its RLS policy)
├── worker/                ← Python service (Railway root dir): ingestion cron,
│   │                        parse/render jobs, probes; own requirements.txt + .env
│   └── Dockerfile         ← Playwright Chromium + headless LibreOffice
└── tests/golden/          ← fixture resumes → canonical JSON → canonical PDFs
```
Vercel deploys the repo root (Next.js); Railway deploys `worker/`. Docs and code live together so every Claude Code session sees the spec it must obey.
