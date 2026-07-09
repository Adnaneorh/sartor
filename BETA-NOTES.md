# BETA-NOTES.md — Sartor Beta Working Copy

This is the **beta clone** of the Sartor project docs, created 2026-07-09.
The original files are untouched; all edits happen here.

## Structure
- `CLAUDE.md` — repo root (as its own instructions require)
- `docs/` — PRD, ROADMAP, DESIGN, DECISIONS, AI-LAYER
- `docs/brainstorm/` — phase files + post-launch backlog
- `docs/daily/` — session logs

## Patches (agreed 2026-07-09 — APPLIED 2026-07-09)
1. Move "deploy skeleton to Vercel" into Phase 0/1 (keep local-first dev)
2. Add Sentry in Phase 1 instead of Phase 5
3. New golden rule: explicit CORS lockdown on the Railway worker endpoints
4. Phase 0.1: enable Dependabot/Renovate
5. Append Stripe security rules to post-launch.md (Checkout only, verify
   webhook signatures, store only customer ID + subscription status)

## Change log
- 2026-07-09 — Synced into the Sartor git repo, replacing the outdated committed docs (fingerprint-verified first; session artifacts preserved: ROADMAP 0.1 progress, phase-0 change-log line, daily 2026-07-09). This file now lives at the repo root per the target layout.
- 2026-07-09 — Superset verification vs originals: PASS (zero lost content). Coherence fixes: email confirm in PRD §8 + Phase 1 DoD; monorepo `worker/` decision; target repo layout added to CLAUDE.md.
- 2026-07-09 — Gap fix (user-caught): signup email verification specified end-to-end (PRD 3.1, ROADMAP 1.1 + Phase 5 SMTP, key inventory).
- 2026-07-09 — Beta clone created from originals. No content changes yet.
- 2026-07-09 — Adversarial audit (pass 3) completed: 4 integration defects + 2 pre-existing defects found and fixed (see DECISIONS audit addendum). Zero known open issues after re-verification.
- 2026-07-09 — All five patches applied: ROADMAP (0.1 Dependabot, 0.2 day-one Vercel deploy, 1.1 Sentry, Phase 5 adjusted, Stripe backlog security rules), CLAUDE.md golden rule 16 (CORS), DECISIONS entry, change-log lines in phase-0/1/5 + post-launch brainstorm files.
