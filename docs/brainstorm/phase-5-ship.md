# Brainstorm — Phase 5 — Ship

**Estimated duration:** 1–2 weeks · **Tracker:** [[ROADMAP]] · **Status:** not started

## Ideas
<!-- Anything that could make this phase better. No filtering — capture first, judge later. -->
- 2026-07-09 · Phase 5 hardening TODO: Vercel Deployment Protection is fully OFF (Hobby plan lacks "Only Preview Deployments", so preview URLs are public too — accepted for now, per Adnane). Revisit at ship: protect previews (plan upgrade or password protection) before real user data flows.

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
- 2026-07-10 · Branded confirmation-email template DEFERRED to the Phase 5 SMTP task: hosted dashboard locks template editing behind custom SMTP ("Set up custom SMTP to edit templates"); local template committed + proven via Mailpit; hosted uses the default template meanwhile → ROADMAP Phase 5 SMTP box, supabase/templates/confirmation.html
- 2026-07-09 · Production SMTP for auth emails (Resend/Postmark) added to Phase 5; SMTP key added to inventory → ROADMAP Phase 5, CLAUDE.md secrets
- 2026-07-09 · Audit fix: Phase 5 Supabase task reworded to migrate/verify/upgrade the Phase-0 project; Phase 5 key list now verification-only → ROADMAP Phase 5, CLAUDE.md secrets
- 2026-07-09 · Phase 5 deploy/Sentry tasks reduced to promotion + verification (both live since Phases 0–2) → ROADMAP Phase 5
- 2026-07 · Privacy policy is PIPEDA-conscious (Canada, not GDPR); resumes + personality scores are personal information; delete-account removes ALL rows + files → PRD §7, CLAUDE.md rule 15
- 2026-07 · Verify Supabase backups/PITR on the hosted project → ROADMAP Phase 5
- 2026-07 · App named **Sartor**; availability verification (domain/trademark/stores/French) is a Phase 5 gate before domain purchase → DECISIONS

## Open questions
<!-- Unresolved decisions. When answered, log the choice in [[DECISIONS]]. -->
-
