# Brainstorm — Phase 2 — Real jobs

**Estimated duration:** 2–3 weeks · **Tracker:** [[ROADMAP]] · **Status:** not started

## Ideas
<!-- Anything that could make this phase better. No filtering — capture first, judge later. -->
-

## Issues encountered
<!-- What broke, when, and the error/symptom. Date each entry. -->
-

## Solutions & lessons
<!-- How each issue was fixed, and what to remember next time. Reference related notes in docs/learning/ by wikilink once they exist. -->
-

## Improvements for later
<!-- Good ideas that would derail this phase — park them here instead of building them now. -->
-

## Change log (approved modifications)
<!-- One dated line per approved change affecting this phase; full spec lives where the pointer says. Claude Code appends here IN THE SAME SESSION as any approved change (CLAUDE.md workflow rule). -->
- 2026-07-11 · 1.3 hands Phase 2 three ingestion obligations: (a) populate `is_remote`, 3–4 highlight `tags`, and `logo_url` when the source provides one — tag mechanism TBD, see Open questions (new ROADMAP 2.2 task); (b) reproduce the dedup recipe byte-for-byte: sha256 hex of `lower(company)|lower(title)|coalesce(province,'')|lower(coalesce(city,''))`; (c) OWN the dedup conflict/merge policy — `dedup_hash` is a NON-unique index by 1.3 design (two unique constraints would 23505 the first cross-source duplicate), so upserting on (source, external_id) alone will NOT dedup across sources → ROADMAP 2.2, migration 20260711201511, DECISIONS 2026-07-11 (jobs)
- 2026-07-09 · Worker structure decided: monorepo `worker/` subfolder (Railway root-dir deploy) — removes repo-vs-folder ambiguity → ROADMAP 2.1, CLAUDE.md layout
- 2026-07-09 · Audit fix: worker Sentry task added to 2.1; worker Sentry DSN added to Phase 2 key inventory → ROADMAP 2.1, CLAUDE.md secrets
- 2026-07 · Canada-only sources: Adzuna country=ca, Canadian slug seeding, Job Bank terms verification → PRD 3.2
- 2026-07 · Freshness 0–10 days MANDATORY at four layers (+ undated postings excluded) → PRD 3.2b, CLAUDE.md rule 14
- 2026-07 · Two-lane apply: `apply_mode easy|hard` classified at ingest, lane badge, deck filter → PRD 3.2c
- 2026-07 · Click-time validity re-probe before any apply action → PRD 3.2b item 5
- 2026-07 · `occupation_category` (NOC family) at ingest: deterministic map + list-validated LLM fallback (AI call point #8); verify O*NET↔NOC crosswalk (ESDC) → PRD 3.1b
- 2026-07 · Worker Dockerfile (Playwright Chromium + LibreOffice) → ROADMAP 2.1
- 2026-07 · Estimate revised 2 → 2–3 weeks → ROADMAP timeline

## Open questions
<!-- Unresolved decisions. When answered, log the choice in [[DECISIONS]]. -->
- Tag mechanism for real postings (1.3 hand-off): Greenhouse/Lever/Adzuna payloads don't ship the PRD 3.2 "3–4 highlight tags" (Lever has a recruiter-set tags field, but it's unreliable). Deterministic extraction from title/description, or a new list-validated AI call point (which would need an AI-LAYER §2 entry)? Decide at 2.2; until then real jobs would default to `tags = {}` and cards would show no tag row — which PRD 3.1b makes the no-signal fallback, so this must be answered before 2.2 ships.
- Dedup conflict policy (1.3 hand-off): on a dedup_hash match from a DIFFERENT source, skip/merge/refresh-last_seen_at? Owns whether the non-unique index gains a constraint later.
