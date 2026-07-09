# DECISIONS.md — Architecture Decision Log

One dated entry per significant choice. Format: **Decision — alternatives considered — why.** Add new entries at the top.

---

## 2026-07 — Verification protocol: golden references + assume-broken auditing
**Decision:** three verification passes of three KINDS (verified edits → automated `scripts/check-docs.sh` in CI → adversarial semantic review with a "defect exists, find it" premise), risk-tiered (full protocol for spec/schema/security/money; pass 1 + script for trivia). Golden references (`tests/golden/`, docs invariants) define perfect; any deviation is a defect. Every checker is proven by a seeded error before being trusted.
**Alternatives rejected:** three identical re-reads (repeats one failure class, misses the rest); instruction-only sweeps (forgettable in long sessions — the script cannot forget); uniform heavy protocol for trivial edits (turns process into theater, which trains skipping).

## 2026-07 — Personality-based dual-signal matching
**Decision:** skippable swipe-style RIASEC test (O*NET Interest Profiler Short Form, 30 items, public domain, self-hosted); PIPEDA-minimized registration (full name, email, optional phone, 16+ confirmation — no full DOB); deterministic weighted dual-signal match score (resume overlap + RIASEC fit vs NOC occupation_category) with mandatory graceful degradation; occupation classifier = AI call point #8, list-validated.
**Alternatives rejected:** MBTI/16personalities (weak validity, not built for job matching, no API); commercial assessment vendors (cost, lock-in, PIPEDA third-party disclosure); LLM-scoring every card (nondeterministic, slow, expensive); mandatory test (conversion killer); collecting full DOB + mandatory phone (PIPEDA data minimization).

## 2026-07 — Two-lane apply + Source Scout
**Decision:** apply is `easy` (official ATS application APIs, native confirm-gated form, post-launch) or `hard` (deep link, v1 default). Four-checkpoint audit keeps the easy badge truthful. Source registry grows via an AI scout whose every proposal is verified by probing real board APIs.
**Alternatives rejected:** automating LinkedIn/Indeed Easy Apply (ToS violation, user-account ban risk); zero-review auto-submit (application-quality collapse); hand-only registry growth (supply bottleneck).

## 2026-07 — Target market: Canada only (v1)
**Decision:** all ingestion, filters (province → city cascade + title search), salary (CAD), and the 0–10 day freshness rule are scoped to Canada.
**Why:** focused supply beats thin global coverage; Canadian tech employers are well represented on Greenhouse/Lever; Adzuna supports country=ca natively.

## 2026-07 — Initial stack decisions (project planning)

**Next.js + TypeScript** over Vue/Nuxt, SvelteKit — one language front+back, largest ecosystem, best fit for swipe-card UI, first-class support from every chosen tool.

**Supabase** over Neon, Firebase, Appwrite — need relational queries (users→swipes→jobs→versions), and Supabase bundles Postgres + Auth + Storage + RLS. Neon is DB-only; Firebase's NoSQL fights relational queries; Appwrite has a smaller ecosystem.

**Supabase Auth** over Clerk, Better Auth, Firebase Auth — already on Supabase, zero extra cost, email + OAuth out of the box. Clerk nicer DX but pricey at scale.

**Vercel** (app) + **Railway** (worker) over Netlify/Render-only — Vercel is Next.js's native home; worker needed separately because ingestion cron + Playwright PDF rendering don't fit serverless time limits.

**Legal job sources (ATS board APIs + aggregators)** over scraping LinkedIn/Indeed — scraping violates ToS, breaks constantly, and can't support a legitimate paid product. Greenhouse/Lever public board APIs + Adzuna instead.

**PyMuPDF parse + HTML/CSS rebuild + Playwright render** over LaTeX or in-place PDF editing — PyMuPDF exposes per-span font/size/color/position (needed for style fidelity); HTML/CSS is easiest to make pixel-faithful and doubles as the editable version. Never edit uploads in place (product rule).

**Deterministic pipelines with LLM calls at defined steps** over agent-per-process — fidelity guarantees (page count, fonts, colors) must be deterministic code; agents add nondeterminism and bug surface. LLM used only for: keyword extraction, rephrasing proposals, gap explanation, assistant chat. True tool-calling agent only in post-launch assistant Tier C, behind user confirmation.

**LLM provider interface (stub | ollama | hosted)** — Ollama (Qwen 2.5) makes local dev free/offline and upgrades the stub path to a real pipeline; hosted frontier model for production rephrasing quality; stub powers fixture tests. Also enables future free/premium tiering.

**Dark & sleek dev-tool design, desktop-first, both themes** — see DESIGN.md. Positioning: "job-hunting command center," keyboard-driven, not a Tinder clone visually.

**Stripe deferred to post-launch** — validate the product first; Stripe over PayPal when the time comes (better dev tooling, subscription primitives).

---

## Template for new entries

## YYYY-MM-DD — Title
**Decision:** …
**Alternatives:** …
**Why:** …
