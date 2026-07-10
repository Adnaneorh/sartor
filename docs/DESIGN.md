# DESIGN.md — Design System ("Mockup D")

Personality: **light, warm, creative-professional — youthful but mature.** White-canvas confidence with one strong green and a signature highlighter motif. References: Notion, Stripe, Linear-light. NOT neo-brutalist stickers, NOT corporate job-board blue. **Light is the DEFAULT theme; the dark toggle uses the "pulse" dark palette below.** Chosen from four candidate mockups (see DECISIONS "Visual identity: Mockup D").

## Rules for all UI code
- All colors via CSS variables (shadcn/ui convention). Never hardcode a hex in a component.
- Theme via `next-themes`; **light default**; dark available by toggle; no flash on load.
- One saturated object per screen: the primary action (filled green). Everything else is tints and hairlines.
- Elevation via 0.5px hairline borders + the **offset tint panel** (a solid tinted block peeking behind hero cards) — never drop shadows.
- Shape language: **pills.** Buttons/tags/inputs radius 20px; cards 14–18px.
- Top navigation on ALL breakpoints (lowercase labels, active tab = 2px green underline). No bottom tab bar.
- Every interactive surface keeps a keyboard path; keycap hints in muted ink; `?` opens the shortcuts overlay.

## Signature elements (what makes it Sartor)
1. **Highlighter headline:** every page opens with a 22–25px display headline where ONE key phrase sits on a mint marker (e.g. fresh «this week», your «pipeline», quick «vibe check»).
2. **Marker semantics, app-wide:** mint marker = matched/positive · amber marker = gap/attention · red tint = dead/closed. Applied inline in job descriptions (requirements annotated ✓/△ in place), in studio diffs (changed words mint-marked in the AFTER), and in copilot answers (terms highlighted in-bubble).
3. **Offset tint panel:** hero cards float on a solid tinted block (mint behind job cards, violet behind the test card) offset a few px — depth without shadows.
4. **Vibe language:** the match score is the "vibe match" ring; microcopy is casual-clean ("dropped 2 days ago", "full role ↗") — energy without slang. The streak pill (quiet flame+number in the header) is a POST-LAUNCH feature — do not render it until the streak feature ships (see ROADMAP backlog).
5. **Mono for data:** salary, scores, counts, keycaps in JetBrains Mono, accent-colored when positive.
6. **Ink/paper chat:** user bubbles solid ink `--ink` on the right; Sartor bubbles white with mint `s.` avatar on the left.

## Color tokens

### Light (DEFAULT)
| Token | Value |
|---|---|
| --background | #FDFDFB |
| --surface (cards) | #FFFFFF |
| --surface-tint (pills, quiet fills) | #F3F3EE |
| --border | #E7E7E2 |
| --border-strong | #DADAD4 |
| --text-primary / --ink | #17171A |
| --text-secondary | #8A8A88 |
| --text-muted | #B3B3AD |
| --accent (primary action) | #00B478 · on-accent #FFFFFF |
| --mint-tint / --mint-text | #D9F5E7 / #0A6E4C |
| --violet / --violet-tint | #5B48D6 / #EEEBFC |
| --amber-tint / --amber-text (gaps) | #FBF0D9 / #8A5A0B |
| --red-tint / --red-text (dead/destructive) | #FBE3E3 / #9B2C2C |

### Dark ("pulse", via toggle)
| Token | Value |
|---|---|
| --background | #0B0B0D |
| --surface | #16161A |
| --surface-tint (pills, quiet fills) | rgba(255,255,255,0.04) |
| --border / --border-strong | #232328 / #2E2E34 |
| --text-primary / secondary / muted | #F2F2F4 / #8A8A93 / #5C5C64 |
| --accent | #00D48A · on-accent #04342C |
| --violet / --violet-tint | #8B7CFF / rgba(139,124,255,0.12) |
| --mint-tint | rgba(0,212,138,0.08) · text #00D48A |
| --amber (gaps) | #EF9F27 on rgba tint |
| --red (dead/destructive) | #F4526A on rgba tint |

## Typography
- UI: **Inter** via `next/font`. Display headlines 22–25px, weight 500, letter-spacing −0.5 to −0.9px, lowercase-friendly. In-app base 12–13px, card titles 18–21px. Two weights only (400/500).
- Data: **JetBrains Mono** — salary, match numbers, dates, counts, keycaps.

## Layout
- Desktop: top nav bar (wordmark `sartor.` left, lowercase tabs center, streak pill + avatar right) → three columns: left filter rail (search, province → city cascade, remote, salary, lane filter), center deck (~480px card + offset panel + next-card peek), right match panel (vibe ring, matched/missing terms as mint/amber pills, style fit — appears once at least one signal exists; before that, an upload/take-the-test prompt).
- Mobile: same top nav condensed; single column; filters collapse to a pill strip; action buttons thumb-sized (54px circles).

## Keyboard map (unchanged)
← decline · → save/apply · ↑/Space full role · Z undo · ? shortcuts · ⌘K palette (v1.5)

## Components
shadcn/ui base restyled to pill radii. Custom: swipe card + offset panel, vibe ring, marker/highlight spans, diff panel, gap banner, streak pill, tracker status pills, chat bubbles.
