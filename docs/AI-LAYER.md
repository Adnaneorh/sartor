# AI-LAYER.md — Agents, Tools, Tasks & Audit Loop

Architecture principle: **deterministic skeleton, LLM joints.** AI runs only at defined call points; every AI output passes a deterministic gate before touching anything real. AI proposes, code disposes.

## 1. The four layers

| Layer | Contents | Color in diagrams |
|---|---|---|
| App | Swipe deck, tracker, copilot chat UI, before/after review (Next.js, Framer Motion, shadcn) | teal |
| AI | Keyword extractor, rephrasing proposer, gap explainer, copilot (chat + Tier C agent) — via `LLM_PROVIDER: stub \| ollama \| hosted` | amber |
| Deterministic guards | PyMuPDF parser, Playwright renderer, fidelity + page-count guards, diff + match scorer, ingest worker + dedup, JD-membership + anti-stuffing checks | purple |
| Data | Postgres + RLS, private Storage buckets (Supabase) | gray |

Flow is always app → (AI when language is needed) → guards → data. AI never touches data directly. Vercel AI SDK bridges app→AI; Upstash rate limiting sits on that boundary.

## 2. AI call points ("agents")

Seven are LLM call points (model called at a fixed step, output validated by code). Only #6 is a true agent (model chooses a tool).

| # | Call point | Task | Tools | Trigger | Output (validated) |
|---|---|---|---|---|---|
| 1 | Keyword extractor | Pull key terms & required skills from a JD | LLM, JSON mode | User starts tailoring | `{keywords[], required_skills[]}` — schema-checked, then string-checked against JD text; invented terms discarded |
| 2 | Rephrasing proposer | Rewrite real bullets into the job's wording, truthfully | LLM + content JSON | After keyword match | Proposals, each traced to a source bullet; unmatched → rejected |
| 3 | Gap explainer | Plain-language list of required skills the resume lacks | LLM | After matching | Gap list shown to user, never injected |
| 4 | Career Copilot (chat) | Answer questions about the user's own data | LLM + server-side context under RLS, Vercel AI SDK | User opens chat (Phase 4) | Streamed answer grounded in their rows only |
| 5 | Embedding ranker (v2) | Semantic resume↔job deck ranking | Ollama nomic-embed-text + pgvector | Deck load | Similarity scores |
| 6 | Copilot agent (Tier C, post-launch) | Act on request ("tailor for this one") | Tool-calling: `search_jobs`, `get_resume_gaps`, `get_application_status`, `start_tailoring` | User asks in chat | Tools are read-only or require explicit confirmation |
| 7 | Source Scout (v1.5) | Discover Canadian companies whose career sections live on ATS boards | Hosted LLM + web search, weekly cron | Cron / on demand | Candidate slugs — every one verified by a deterministic board-API probe before entering `job_sources`; failures discarded |
| 8 | Occupation classifier | Assign a NOC family to job titles the deterministic mapping can't resolve | LLM, JSON mode, fixed category list in prompt | Ingest, ambiguous titles only | One value from the fixed NOC-family list — anything else → `uncategorized` (personality term zeroed for that job) |

## 3. Deterministic tools and the guarantees they protect

| Tool | Task | Guarantee |
|---|---|---|
| Ingest worker (Python cron, hourly) | Poll Greenhouse/Lever/Adzuna; normalize; `dedup_hash` upsert; `last_seen` refresh; stale >48h → inactive; per-source failure isolation | Real jobs, no duplicates, no dead links |
| PyMuPDF parser (once per upload) | Span walk → content JSON (sections/bullets/order) + style JSON (fonts, sizes, colors, margins, spacing, bullet glyphs, section order) | Style-fidelity source of truth |
| HTML template + Playwright | style JSON → CSS vars; render approved content to PDF | Same design as original |
| Fidelity checker | Post-render assertions: page count, fonts, sizes, colors, spacing | Visual-fidelity rules |
| Page-count guard | Fail → tighten within tolerance or drop lowest-priority change → re-render | "Never adds pages" |
| JD-membership + stuffing checks | Keyword must exist in JD; frequency caps; no hidden text by construction | No fabrication, no stuffing |
| Diff engine + match scorer | Before/after JSON patch; "8 of 10 terms" score | User approves every change |
| Supabase RLS + private buckets | `user_id = auth.uid()` on every table; signed URLs | Agents #4/#6 can never touch another user's data |
| Slug probe verifier | Resolve scout candidates against real board APIs; slug-variation retries; Canadian-jobs check | Scout hallucinations never enter the registry |
| Apply-mode classifier + audits | Classify easy/hard at ingest (full question-schema validation); daily re-verify of easy jobs; click-time live re-fetch + diff; outcome log with auto-demotion after N failures | The easy badge is never a lie; failure always downgrades to a working link |
| Click-time validity check | Re-probe source before any apply action | User never lands on a dead posting |
| Occupation-category validator | Deterministic title→NOC mapping first; LLM fallback output must be in the fixed list, else `uncategorized` (writes `jobs.occupation_category`) | Match scores are never built on invented categories |
| Dual-signal match scorer | Weighted resume overlap + RIASEC fit (reads `personality_profiles` + `jobs.occupation_category`); missing signal → weight 0 + renormalize | Score is deterministic, transparent, and never misleading when a signal is absent |

## 4. The two processes, step by step

**Background path (runs forever, no AI):**
1. Job sources — boards-api public JSON, `job_sources` registry, Adzuna REST
2. Worker: ingest — hourly cron, normalize, occupation classify (deterministic → LLM fallback, list-validated), dedup upsert, staleness
3. Supabase — RLS, Auth JWT, buckets
4. App — deck query (active ∩ fresh ≤10d ∩ province/city/search filters − swipes), optimistic swipe writes, right-swipe → Saved, apply = lane-dependent (deep link in v1; click-time validity probe always)

**Per-user path (fires on action):**
5. Upload — signed URL straight to private bucket, original read-only forever, parse job queued
6. Parse — PyMuPDF, once per file, content + style JSON stored on `resumes` row
7. Tailor (LLM) — extraction → schema + JD string-check → proposals traced to bullets → gaps flagged → stuffing cap → score; nothing applied without approval
8. Render + check — approved diff → template → Playwright → assertions → re-render loop on failure → `resume_versions` row

Bridge between paths: a right-swipe hands the job's description from step 4 into step 7.

## 5. The audit loop (three layers, one AI reviewer — not agent-per-step)

Runtime guards are already per-execution auditors; adding LLM auditors at runtime would add cost and nondeterminism to steps that must be guaranteed. Development audit uses ONE reviewer with full context:

1. **Every commit — CI (deterministic):** GitHub Actions runs typecheck, lint, fixture tests (keywords-only-from-JD, gap-flagging, page-count preserved, stub labeled). Red = don't merge.
2. **Every feature — AI reviewer (assume-broken stance):** after a feature is built, run a FRESH Claude Code session with the premise "a defect EXISTS in this diff — find it. Audit against CLAUDE.md golden rules: RLS coverage, input validation (Zod), secrets, sensitive-code flags, golden-file deviations. Name the most suspicious area even if you find nothing." Fresh session avoids builder bias; the guilty-until-proven premise avoids rubber-stamping. Findings → fix, or log to the phase's brainstorm Issues section.
2b. **Golden references anchor both layers:** `tests/golden/` (fixture resumes → canonical JSON → canonical PDFs) and `scripts/check-docs.sh` (docs invariants) define "perfect"; CI diffs reality against them on every push. Whenever a checker or golden file changes, seed a deliberate error, prove detection, revert.
3. **Every production run — guards + Sentry:** purple-layer assertions on each execution; Sentry captures what escapes.

## 6. Infrastructure note — Docker
- Local: Docker Desktop required in Phase 0 (`supabase start` runs Postgres/Auth/Storage in containers; CLI manages them).
- Deploy: one Dockerfile for the Python worker (Playwright headless Chromium + headless LibreOffice for DOCX conversion) for Railway. Next.js on Vercel needs no Docker.
