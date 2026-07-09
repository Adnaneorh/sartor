# DESIGN.md — Design System

Personality: **dark & sleek, modern dev-tool** (references: Linear, Vercel dashboard, Raycast — NOT Tinder/LinkedIn). Desktop-first, keyboard-driven. Light/dark themes with toggle, dark is default.

## Rules for all UI code
- All colors via CSS variables (shadcn/ui convention). Never hardcode a hex in a component.
- Theme switching via `next-themes`; respect system preference on first visit; default dark.
- 90% grayscale; accent color only on primary actions and active states.
- Elevation via 1px borders, not drop shadows. Border radius 8–10px (no pills).
- Transitions ~150ms, subtle. Skeleton loaders, never spinners.
- Every interactive surface has a keyboard path. Show keycap hints; `?` opens a shortcuts overlay.

## Color tokens

### Dark (default)
| Token | Value |
|---|---|
| --background | #0A0A0B |
| --surface (cards) | #141416 |
| --surface-elevated | #1C1C1F |
| --border | #26262A |
| --text-primary | #EDEDEF |
| --text-secondary | #8B8B93 |
| --accent (apply/go) | #00D48A |
| --destructive (decline) | #F4526A |
| --warning (gap flagged) | amber |

### Light
| Token | Value |
|---|---|
| --background | #FAFAFA |
| --surface | #FFFFFF |
| --border | #E4E4E7 |
| --accent | #00B478 |
Text/destructive/warning: darkened equivalents with AA contrast.

## Typography
- UI: **Inter** via `next/font` (self-hosted). Base 14px, secondary 13px, card titles 20–24px. Tight scale — big type reads consumer, tight type reads pro-tool.
- Data (salary, scores, dates, keyword tags): **JetBrains Mono** (or Geist Mono). This is the signature dev-tool move.

## Layout
- Desktop: three columns — left rail (filters: role, location, remote, salary), center swipe deck (~480px card, next card peeking behind), right panel (match breakdown for current card: score + matched/missing terms, plus style fit when a personality profile exists — appears once at least one signal exists; before that, an upload/take-the-test prompt).
- Mobile: collapses to deck only (Tailwind responsive).
- Match score: small radial or segmented bar in accent color on each card.

## Keyboard map
| Key | Action |
|---|---|
| ← | Decline |
| → | Save / apply |
| ↑ or Space | Open full description (bottom sheet/panel) |
| Z | Undo last swipe |
| ? | Shortcuts overlay |
| ⌘K | Command palette (v1.5, shadcn Command) |

Mouse drag on cards also works (Framer Motion: drag, rotate on drag, spring-back, fly-off on release). Buttons under the deck for discoverability.

## Components
shadcn/ui for dialogs, dropdowns, tabs, toasts, command palette. Custom: swipe card, deck, match ring, before/after diff view, gaps list.
