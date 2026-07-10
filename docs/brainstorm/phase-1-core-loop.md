# Brainstorm — Phase 1 — Core loop

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
- 2026-07-10 · BLOCKING GATE for Phase 1 done: the 1.1 two-account RLS test must pass BEHAVIORALLY (A cannot read/write B's profile, live, both directions) — audit #3 most-suspicious-area: RLS is verified structurally only until real authenticated users hit the policies. Phase 1 is not done without it → ROADMAP 1.1, phase-0 audit #3
- 2026-07-10 · Phase 1 verification items (audit #3 INFO): exercise the profiles updated_at trigger with a real UPDATE once profile editing exists; enforce lib/llm server-side-only (currently comment-only) when the first API route lands → ROADMAP 1.1/1.2
- 2026-07-09 · GATE at Phase 1 start: deliberate review of the token→shadcn semantic mapping block in app/globals.css (secondary/muted/accent → surface-tint; derived sidebar/chart colors) BEFORE the component build-out — audit #2 most-suspicious-area; every shadcn component inherits these mappings → app/globals.css, phase-0 audit #2
- 2026-07-09 · Email confirmation added to PRD §8 journey and Phase 1 DoD → PRD §8, ROADMAP Phase 1
- 2026-07-09 · Email verification made explicit: confirm-email enabled, branded template + redirect, middleware block + resend screen, manual flow test (built-in sender = dev only) → PRD 3.1, ROADMAP 1.1
- 2026-07-09 · Audit fix: Sentry DSN (app) moved into Phase 1 key inventory → CLAUDE.md secrets
- 2026-07-09 · Sentry (app) added to Phase 1; worker Sentry follows in Phase 2 → ROADMAP 1.1
- 2026-07 · Canada scope: provinces→cities dataset task moved BEFORE the onboarding UI that consumes it → ROADMAP 1.2
- 2026-07 · Registration form PIPEDA-minimized (full name, email, OPTIONAL phone, 16+ confirmation, NO full DOB) → PRD 3.1, ROADMAP 1.1
- 2026-07 · Personality test added as sub-phase 1.5 (RIASEC swipe, 30 items, skippable, retake in Settings); tracker renumbered 1.6 → PRD 3.1a
- 2026-07 · Seed jobs must carry posted_at within the LAST 10 days or the mandatory freshness filter hides them → ROADMAP 1.3
- 2026-07 · CI (typecheck + lint) starts in Phase 1, not Phase 3 → ROADMAP 1.1
- 2026-07 · Estimate revised 2 → 2–3 weeks (test added) → ROADMAP timeline
- 2026-07 · All Phase 1 UI follows Mockup D: top nav, pills, marker semantics (mint/amber/red), offset panels, vibe ring → DESIGN.md

## Open questions
<!-- Unresolved decisions. When answered, log the choice in [[DECISIONS]]. -->
-
