# Brainstorm — Phase 0 — Foundations

**Estimated duration:** 2–3 days · **Tracker:** [[ROADMAP]] · **Status:** DoD met 2026-07-10 — repo ✓, app + toggle ✓, RLS'd table on local Supabase ✓, Ollama JSON-mode through provider interface ✓. Open: 0.1 Obsidian vault step (not a DoD clause).

## Ideas
<!-- Anything that could make this phase better. No filtering — capture first, judge later. -->
-

## Issues encountered
<!-- What broke, when, and the error/symptom. Date each entry. -->
- 2026-07-09 · AUDIT #2 (Phase 0.2 diff, 363e7f2..5d063ae, assume-broken): 2 MED-LOW + 1 LOW + INFO cluster found — RESOLVED same day, details moved to Solutions & lessons below.
- 2026-07-09 · AUDIT (first full-history audit, assume-broken) — findings, ranked:
  1. MEDIUM · Checker-coverage claims understate reality: CLAUDE.md:45 lists six check categories, ROADMAP.md:29 lists five; scripts/check-docs.sh implements seven (naming added in f134d52 without updating the spec text in the same session — a live-brainstorm-sync rule violation).
  2. LOW-MED · Activation-pending items marked done: ROADMAP.md:30 "[x] Enable Dependabot" and :29 "wired into CI" are config-committed but inactive until the GitHub push (daily log states this honestly; the boxes alone overstate).
  3. LOW · Progress-line self-contradiction: ROADMAP.md:5 says "0.1 done" while the Obsidian vault box (ROADMAP.md:31) is an unchecked 0.1 item.
  4. LOW · .gitignore lacks `.vercel/` — needed before Phase 0.2's day-one Vercel deploy (`vercel link` writes .vercel/project.json).
  5. INFO · Dependabot npm ("/") and pip ("/worker") manifests don't exist until 0.2/2.1 — expect Dependabot errors on those entries after push (github-actions entry works immediately).
  6. INFO · BETA-NOTES.md:4 "The original files are untouched; all edits happen here" is stale now that the clone IS the repo docs (change-log line added at sync partially mitigates).
  7. INFO · Naming-check residual gaps (by design, documented): lowercase old-name usage outside the exact PRD pitch would pass; Sartor presence enforced only in CLAUDE/PRD/DESIGN.
  Clean: .gitignore in root commit; only .env.example tracked; no secret-shaped strings in any commit; all 4 sync fingerprints present; checker green via `bash` (CI parity); dependabot.yml 3 ecosystems/weekly/correct dirs; workflow on push+PR; .env.example covers the full CLAUDE.md key inventory (17 vars + hosted-Supabase/worker-Sentry comments); daily log claims match the built reality.
  Most suspicious area: the doc sync's hand-merged artifact re-application — `_docs-final/` was deleted, so byte-level fidelity vs the final spec can no longer be independently re-verified; check-docs.sh validates internal consistency, not equality to an external golden copy. Any silent divergence introduced during replace+re-apply would be invisible to every current checker.

## Solutions & lessons
<!-- How each issue was fixed, and what to remember next time. Reference related notes in docs/learning/ by wikilink once they exist. -->
- 2026-07-10 · Newer Supabase local images do NOT auto-grant table privileges to anon/authenticated on new tables (smoke test hit 42501 before RLS was ever evaluated). LESSON for every future migration: explicit GRANTs alongside the RLS policies, per table, in the same file — authenticated gets DML (RLS-filtered), service_role gets worker access, anon gets only what it genuinely needs (nothing, for user-owned tables). Grants gate the table; policies filter the rows.
- 2026-07-09 · Audit findings 1–4 and 6 fixed in one session: check-category lists in CLAUDE.md pass-2 text + ROADMAP 0.1 now name all seven categories; ROADMAP progress line and the CI/Dependabot boxes reworded for honesty ("activates on first GitHub push"); `.vercel/` added to .gitignore; BETA-NOTES.md framing updated. Findings 5 and 7 remain documented INFO (accepted). Lesson: when a checker gains a category, update the spec text that enumerates its categories IN THE SAME COMMIT — the live-brainstorm-sync rule applies to the verification protocol itself.
- 2026-07-09 · AUDIT #2 findings all resolved (fix session, commits 6c1479a..376e1c2): (1) undocumented dark tints → DESIGN.md dark table completed with --surface-tint + --violet-tint rows (approved), globals.css comment corrected — zero undocumented interpolations remain; (2) hairline cascade defect → side-specific hairline-t/b/l/r utilities, header/card use them INSTEAD of border utilities, verified in built CSS + source sweep (no hairline+border combos); (3) pill drift risk → 20px pill radius baked into Button base and small-size variants, call-site overrides removed; (4) toggle icon now CSS-driven via the dark: variant (correct from first paint) + aria-current="page" on the active tab. Preview-PR box left as-is per Adnane. Most-suspicious-area (token→shadcn mapping block) logged as a review GATE at Phase 1 start in [[brainstorm/phase-1-core-loop]]. Lessons: a custom utility sharing a CSS property with framework utilities must be side-specific and used exclusively — cascade order is not a contract; and every "only one exception" comment is itself an invariant a later audit will test.
- 2026-07-09 · Audit "most suspicious area" (doc-sync fidelity unverifiable after `_docs-final/` deletion) CLOSED: a full external byte-level diff of all repo docs against the authoritative golden copy was performed by the spec's origin assistant — all files identical except the intentionally preserved session artifacts. `_docs-final/` does not need restoring.

## Improvements for later
<!-- Good ideas that would derail this phase — park them here instead of building them now. -->
-

## Change log (approved modifications)
<!-- One dated line per approved change affecting this phase; full spec lives where the pointer says. Claude Code appends here IN THE SAME SESSION as any approved change (CLAUDE.md workflow rule). -->
- 2026-07-09 · Audit fix: hosted Supabase free-tier project is created in Phase 0 for the deployed skeleton (no ambiguity vs Phase 5); key inventory updated → ROADMAP 0.2, CLAUDE.md secrets
- 2026-07-09 · Vercel skeleton deploy moved to day one (preview URLs; dev stays local-first) → ROADMAP 0.2
- 2026-07-09 · Dependabot/Renovate enabled at repo creation → ROADMAP 0.1
- 2026-07-09 · Dependabot config (weekly npm + pip + github-actions) added to Phase 0.1 scope, approved by Adnane → ROADMAP 0.1
- 2026-07-09 · check-docs.sh category list corrected to seven (naming consistency added) in CLAUDE.md verification protocol + ROADMAP 0.1 — spec-text update that should have shipped with the naming-check commit → CLAUDE.md pass 2, ROADMAP 0.1
- 2026-07-09 · DESIGN.md dark table completed: --surface-tint rgba(255,255,255,0.04) + --violet-tint rgba(139,124,255,0.12) rows added (approved; closes audit #2 finding 1 — all four dark-tint values now documented, globals.css comment corrected) → DESIGN.md dark table
- 2026-07 · Docker Desktop required for Supabase local stack → ROADMAP 0.3
- 2026-07 · `.env.example` created day one; secrets protocol → CLAUDE.md 'Secrets & API keys'
- 2026-07 · `scripts/check-docs.sh` created in Phase 0, wired to CI, proven by a seeded error → CLAUDE.md verification protocol, ROADMAP 0.1
- 2026-07 · Visual identity replaced: Mockup D (light DEFAULT, white creative, highlighter motif); dark "pulse" via toggle → DESIGN.md rewritten, ROADMAP 0.2

## Open questions
<!-- Unresolved decisions. When answered, log the choice in [[DECISIONS]]. -->
-
