# Brainstorm — Phase 1 — Core loop

**Estimated duration:** 2–3 weeks · **Tracker:** [[ROADMAP]] · **Status:** not started

## Ideas
<!-- Anything that could make this phase better. No filtering — capture first, judge later. -->
-

## Issues encountered
<!-- What broke, when, and the error/symptom. Date each entry. -->
- 2026-07-11 · AUDIT #4 (1.1 build, 09e2406..3426a69, assume-broken): 1 MED (open redirect in both /auth/* handlers) + 2 LOW (signup-trigger boolean-cast aborts insert on junk metadata; signInAction ignored the middleware-set `?next=`) + INFO (`_opts` lint) — RESOLVED same session, details in Solutions & lessons below. Full original ranked findings, the clean-sweep, and the "most suspicious area" note (the two app/auth/*/route.ts handlers as the security-critical surface of Phase 1) are preserved verbatim in commit f391e41.
- 2026-07-10 · Next 16 dev server (Turbopack) crashed after ~7h uptime: "FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of memory" (SWC native module in the trace) following a day of hot reloads incl. the proxy rename. Restarted clean (Ready 214ms, /signup 200). WATCH: if it recurs on shorter uptimes, add NODE_OPTIONS=--max-old-space-size=8192 to the dev script and/or check for a Turbopack HMR leak on Next 16.2.

## Solutions & lessons
<!-- How each issue was fixed, and what to remember next time. Reference related notes in docs/learning/ by wikilink once they exist. -->
- 2026-07-11 · AUDIT #4 resolved (all four findings, same session):
  (1) MED open redirect — centralized the validation in a new `lib/auth/redirect.ts` `safeRedirectPath()`: a client-supplied `?next=` survives only if it is a same-origin absolute path (single leading `/`, rejecting `//host`, any `\` — which the WHATWG URL parser rewrites to `/` — and C0 control chars like an embedded tab that the parser strips before parsing); everything else falls back to `/home`. Both `/auth/confirm` and `/auth/callback` route through it, so the future Google OAuth callback inherits the check for free. PROVEN behaviorally, not just by types: `scripts/open-redirect-probe.mjs` mints real single-use token_hashes via the admin API and drives the live route — the audit's own two exploit probes (`next=https://evil.example`, `next=//evil.example`) now land on `/home`, and a legit `next=/check-inbox` still works (3/3 PASS).
  (2) LOW trigger fragility — migration `20260711032148_tolerant_age_confirmed_parse.sql` replaces the hard `::boolean` cast (which aborted the ENTIRE auth.users insert on any unparseable value like "maybe") with a tolerant membership test: truthy spellings → true, everything else → false. Approved by Adnane as auth+RLS SQL (rule 13) before apply. PROVEN: a 5-case admin-API trigger test — junk "maybe" now inserts with age_confirmed=false instead of aborting, real boolean true still yields true, absent key → false (5/5 PASS).
  (3) LOW signInAction — now honors the middleware-stashed `?next=` (hidden form field → validated through the SAME safeRedirectPath()) instead of hardcoding `redirect("/home")`; correct destination once more routes than /home are protected, and no new redirect hole because it reuses the one validator.
  (4) INFO — dropped the unused `_opts` param in `lib/llm/hosted.ts`, clearing the eslint warning.
  LESSON: one shared redirect validator beats per-handler checks — the OAuth callback would otherwise re-grow the same hole the moment it ships; the ROADMAP 1.1 OAuth follow-up is now gated on using safeRedirectPath() + re-running the probe. And a SECURITY DEFINER trigger fires on EVERY insert path (admin API, future OAuth), not just the Zod-guarded form, so it must tolerate junk rather than trust an upstream validator it can't see.

## Improvements for later
<!-- Good ideas that would derail this phase — park them here instead of building them now. -->
-

## Change log (approved modifications)
<!-- One dated line per approved change affecting this phase; full spec lives where the pointer says. Claude Code appends here IN THE SAME SESSION as any approved change (CLAUDE.md workflow rule). -->
- 2026-07-11 · Audit #4 fixes (approved): new `lib/auth/redirect.ts` `safeRedirectPath()` is the MANDATORY same-origin redirect validator for every `?next=` handler — the Google OAuth follow-up must use it + re-run scripts/open-redirect-probe.mjs (gate added to ROADMAP 1.1); signup trigger switched to a tolerant age_confirmed parse (Adnane-approved SQL, migration 20260711032148) → ROADMAP 1.1, app/auth/*/route.ts, app/(auth)/{actions.ts,signin/page.tsx}, lib/llm/hosted.ts
- 2026-07-10 · Hosted auth config: confirm-email ON + URL config done by Adnane; branded template BLOCKED on hosted (requires custom SMTP → deferred to Phase 5, default template acceptable); /auth/confirm gained a ?code= exchange fallback so default-template confirmations complete with a session → ROADMAP 1.1 + Phase 5, app/auth/confirm/route.ts
- 2026-07-10 · GATE 2 PASSED — behavioral two-account RLS test green (8 checks + paranoia, both directions: own-row reads 1, cross SELECT 0 rows, cross UPDATE 0 affected, cross INSERT 42501). Phase 1's blocking gate satisfied for profiles; re-run against every new user-owned table → scripts/rls-two-account-test.mjs
- 2026-07-10 · Client-side Sentry approved: NEXT_PUBLIC_SENTRY_DSN joins the anon key as a client-exposed var (DSNs are publishable); CLAUDE.md secrets rule amended → CLAUDE.md, .env.example, instrumentation-client.ts
- 2026-07-10 · Google OAuth deferred to a follow-up INSIDE 1.1 (email/password proven first, per Adnane); OAuth callback route already in place → ROADMAP 1.1
- 2026-07-10 · GATE 1 CLOSED — token→shadcn mapping review (evidence: enumerated every semantic var consumed by button/page/toggle): all mappings resolve to DESIGN tokens correctly; destructive /10-opacity tints acceptable inside shadcn internals, Sartor surfaces use explicit tint tokens; REQUIRED at component-add time: Input → rounded-pill (DESIGN: inputs are 20px pills), Card → rounded-card (shadcn's rounded-xl 22.4px exceeds the 14–18px range); charts/sidebar mappings unreviewed until consumers exist → app/globals.css, audit #2 gate
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
