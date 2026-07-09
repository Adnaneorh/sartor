# Brainstorm — Phase 3 — Resume pipeline

**Estimated duration:** ~4 weeks · **Tracker:** [[ROADMAP]] · **Status:** not started

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
- 2026-07-09 · Audit fix: Upstash Redis keys moved to Phase 3 inventory (rate limiting starts here, not Phase 5) → CLAUDE.md secrets
- 2026-07 · DOCX→PDF conversion via headless LibreOffice so ONE pipeline handles both formats → PRD 3.4, ROADMAP 3.1
- 2026-07 · Deck match score is dual-signal (resume overlap + RIASEC fit vs occupation_category) with mandatory renormalization on missing signals → PRD 3.1b, ROADMAP 3.3
- 2026-07 · Rate limiting on upload + tailoring endpoints → ROADMAP 3.1, CLAUDE.md rule 12
- 2026-07 · Tests upgraded to golden-file model: `tests/golden/` canonical JSON+PDFs, any deviation = defect; seed-an-error drill proves CI detection → ROADMAP 3.5, AI-LAYER §5

## Open questions
<!-- Unresolved decisions. When answered, log the choice in [[DECISIONS]]. -->
-
