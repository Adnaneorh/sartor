#!/usr/bin/env bash
# check-docs.sh — automated docs consistency check.
#
# Pass 2 of the CLAUDE.md verification protocol; runs locally and in CI on
# every push (.github/workflows/check-docs.yml). Seven invariant categories:
#   1. pointers            files/dirs named by CLAUDE.md actually exist
#   2. wikilinks           every [[target]] in docs/ resolves to a file
#   3. schema names        table lists agree across CLAUDE.md / PRD / ROADMAP
#   4. enums               status, apply_mode, LLM_PROVIDER, persona lists
#   5. counts              AI call points, RIASEC items, CA dataset cities/codes
#   6. estimate arithmetic ROADMAP per-phase estimates sum to the stated total
#   7. naming              product name present, working names retired
#
# Any FAIL exits 1. Bash 3.2 compatible (macOS default); BSD & GNU tools only.
# Test-the-tester rule (CLAUDE.md): whenever this script changes, seed a
# deliberate error, prove it fails, revert, prove it passes.

set -u
cd "$(dirname "$0")/.." || exit 2

FAIL=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAIL=1; }

echo "== 1. Pointers =="
for f in CLAUDE.md BETA-NOTES.md docs/PRD.md docs/DESIGN.md docs/ROADMAP.md \
         docs/DECISIONS.md docs/AI-LAYER.md .env.example scripts/check-docs.sh; do
  if [ -f "$f" ]; then pass "pointer: $f exists"; else fail "pointer: $f MISSING"; fi
done
for d in docs/brainstorm docs/daily docs/learning; do
  if [ -d "$d" ]; then pass "pointer: $d/ exists"; else fail "pointer: $d/ MISSING"; fi
done
if grep -q '^\*\*Progress: Phase [0-5]' docs/ROADMAP.md; then
  pass "pointer: ROADMAP progress line present"
else
  fail "pointer: ROADMAP progress line missing or malformed"
fi

echo "== 2. Wikilinks =="
WIKI_BAD=0
WIKI_N=0
while IFS= read -r link; do
  [ -z "$link" ] && continue
  WIKI_N=$((WIKI_N + 1))
  base=${link##*/}
  hit=$(find docs -name "$base.md" -type f | head -n 1)
  if [ -z "$hit" ]; then
    fail "wikilink: [[$link]] does not resolve to any docs/**/$base.md"
    WIKI_BAD=1
  fi
done < <(grep -rho '\[\[[^]]*\]\]' docs --include='*.md' \
         | sed -e 's/^\[\[//' -e 's/\]\]$//' -e 's/[|#].*$//' | sort -u)
[ "$WIKI_BAD" -eq 0 ] && pass "wikilinks: all $WIKI_N distinct targets resolve"

echo "== 3. Schema names =="
# The parentheticals after "user-owned tables (...)" / "shared reference
# tables (...)" in CLAUDE.md golden rule 1 and the PRD §5 RLS model must name
# the same sets of tables.
paren_tables() { # $1=file  $2=marker preceding the parenthetical
  grep "$2" "$1" | head -n 1 \
    | sed -E "s/.*$2 \(([^)]*)\).*/\1/" \
    | grep -oE '[a-z_]+' | sort
}
CL_USER=$(paren_tables CLAUDE.md 'ser-owned tables')
PRD_USER=$(paren_tables docs/PRD.md 'ser-owned tables')
CL_SHARED=$(paren_tables CLAUDE.md 'hared reference tables')
PRD_SHARED=$(paren_tables docs/PRD.md 'hared reference tables')

if [ -n "$CL_USER" ] && [ "$CL_USER" = "$PRD_USER" ]; then
  pass "schema: user-owned table lists match CLAUDE.md rule 1 <-> PRD §5 ($(echo $CL_USER))"
else
  fail "schema: user-owned lists differ — CLAUDE.md rule 1: [$(echo $CL_USER)] vs PRD §5 RLS model: [$(echo $PRD_USER)]"
fi
if [ -n "$CL_SHARED" ] && [ "$CL_SHARED" = "$PRD_SHARED" ]; then
  pass "schema: shared table lists match CLAUDE.md rule 1 <-> PRD §5 ($(echo $CL_SHARED))"
else
  fail "schema: shared lists differ — CLAUDE.md: [$(echo $CL_SHARED)] vs PRD: [$(echo $PRD_SHARED)]"
fi

# Every table in the PRD §5 bullet list must be RLS-classified and referenced
# by a ROADMAP task, and vice versa.
PRD_TABLES=$(grep -E '^- `[a-z_]+` —' docs/PRD.md | sed -E 's/^- `([a-z_]+)`.*/\1/' | sort)
RLS_UNION=$(printf '%s\n%s\n' "$PRD_USER" "$PRD_SHARED" | grep -v '^$' | sort)
if [ "$PRD_TABLES" = "$RLS_UNION" ]; then
  pass "schema: PRD §5 table list == RLS-classified union ($(echo "$PRD_TABLES" | wc -l | tr -d ' ') tables)"
else
  fail "schema: PRD §5 bullets [$(echo $PRD_TABLES)] != RLS user-owned+shared union [$(echo $RLS_UNION)]"
fi
for t in $PRD_TABLES; do
  if grep -q "\`$t\`" docs/ROADMAP.md; then
    pass "schema: \`$t\` has a ROADMAP task"
  else
    fail "schema: \`$t\` (PRD §5) never appears in ROADMAP.md"
  fi
done

echo "== 4. Enums =="
# applications.status — canonical form from the `applications` bullet in
# PRD §5 (anchored there: `job_sources` has its own status enum); ordered
# variants in PRD 3.3 (arrows) and ROADMAP 1.6 (slashes) must match exactly.
STATUS_CANON=$(grep '^- `applications`' docs/PRD.md | grep -oE 'status [a-z]+(\|[a-z]+)+' | head -n 1 | sed 's/^status //')
if [ -n "$STATUS_CANON" ]; then
  pass "enum: applications.status canon found in PRD §5 ($STATUS_CANON)"
else
  fail "enum: applications.status canon not found in PRD §5"
fi
PRD_COLS=$(grep 'Columns:' docs/PRD.md | tr 'A-Z' 'a-z' | sed 's/ → /|/g')
case "$PRD_COLS" in
  *"$STATUS_CANON"*) pass "enum: PRD 3.3 tracker columns match status enum" ;;
  *) fail "enum: PRD 3.3 tracker columns don't match status enum ($STATUS_CANON)" ;;
esac
# (normalize ROADMAP's "Saved / Applied / ..." to the canon's pipe form)
RM_COLS=$(grep 'Tracker page:' docs/ROADMAP.md | tr 'A-Z' 'a-z' | sed 's| / |\||g')
case "$RM_COLS" in
  *"$STATUS_CANON"*) pass "enum: ROADMAP 1.6 tracker columns match status enum" ;;
  *) fail "enum: ROADMAP 1.6 tracker columns don't match status enum ($STATUS_CANON)" ;;
esac

# apply_mode: easy|hard
if grep -q 'apply_mode easy|hard' docs/PRD.md && grep -q 'apply_mode: easy | hard' docs/PRD.md; then
  pass "enum: apply_mode easy|hard consistent within PRD (§5 and 3.2c)"
else
  fail "enum: apply_mode easy|hard mismatch within PRD (§5 vs 3.2c)"
fi
if grep -q 'easy/hard' docs/ROADMAP.md && grep -q 'easy/hard' docs/AI-LAYER.md; then
  pass "enum: apply_mode easy/hard present in ROADMAP 2.3 and AI-LAYER"
else
  fail "enum: apply_mode easy/hard missing from ROADMAP or AI-LAYER"
fi

# LLM_PROVIDER: stub | ollama | hosted — same three modes, same order, everywhere
for f in CLAUDE.md docs/PRD.md docs/AI-LAYER.md docs/ROADMAP.md .env.example; do
  if grep -Eq 'stub.*ollama.*hosted' "$f"; then
    pass "enum: LLM_PROVIDER stub|ollama|hosted present in $f"
  else
    fail "enum: LLM_PROVIDER modes (stub/ollama/hosted) missing or reordered in $f"
  fi
done

# Persona enums (AUDIT #5 finding 5): the canonical arrays in
# lib/validation/persona.ts, pipe-joined, must appear verbatim in
# DECISIONS.md and the phase-1 change log — docs drift fails here.
REMOTE_CODE=$(grep 'REMOTE_PREFERENCES = \[' lib/validation/persona.ts \
  | grep -oE '"[a-z]+"' | tr -d '"' | paste -s -d '|' -)
SENIOR_CODE=$(grep 'SENIORITY_LEVELS = \[' lib/validation/persona.ts \
  | grep -oE '"[a-z]+"' | tr -d '"' | paste -s -d '|' -)
for pair in "remote_preference=$REMOTE_CODE" "seniority=$SENIOR_CODE"; do
  nm=${pair%%=*}; val=${pair#*=}
  if [ -z "$val" ]; then
    fail "enum: persona $nm list not parsed from lib/validation/persona.ts"
    continue
  fi
  for f in docs/DECISIONS.md docs/brainstorm/phase-1-core-loop.md; do
    if grep -qF "\`$val\`" "$f"; then
      pass "enum: persona $nm ($val) matches $f"
    else
      fail "enum: persona $nm is '$val' in persona.ts but not in $f"
    fi
  done
done

echo "== 5. Counts =="
# AI-LAYER §2 numbered call points: contiguous 1..N, and every cross-doc
# "call point #k" reference stays in range.
CP_NUMS=$(grep -E '^\| [0-9]+ \|' docs/AI-LAYER.md | sed -E 's/^\| ([0-9]+) \|.*/\1/')
CP_N=$(echo "$CP_NUMS" | grep -c .)
if [ "$(echo "$CP_NUMS" | tr '\n' ' ')" = "$(seq 1 "$CP_N" | tr '\n' ' ')" ]; then
  pass "count: AI-LAYER call points numbered contiguously 1..$CP_N"
else
  fail "count: AI-LAYER call point numbering has gaps/disorder: $(echo $CP_NUMS)"
fi
REF_BAD=0
while IFS= read -r k; do
  [ -z "$k" ] && continue
  if [ "$k" -lt 1 ] || [ "$k" -gt "$CP_N" ]; then
    fail "count: 'call point #$k' referenced but AI-LAYER defines only 1..$CP_N"
    REF_BAD=1
  fi
done < <(grep -rhoE '[Cc]all point #?[0-9]+' docs CLAUDE.md | grep -oE '[0-9]+' | sort -u)
[ "$REF_BAD" -eq 0 ] && pass "count: all cross-doc call-point references within 1..$CP_N"

# RIASEC: the Interest Profiler line in PRD / ROADMAP / DECISIONS must agree
# on 30 items; the six letters R/I/A/S/E/C must appear in PRD §5 and ROADMAP.
for f in docs/PRD.md docs/ROADMAP.md docs/DECISIONS.md; do
  if grep 'Interest Profiler' "$f" | grep -q '30'; then
    pass "count: RIASEC instrument is 30 items in $f"
  else
    fail "count: Interest Profiler line in $f missing the 30-item count"
  fi
done
for f in docs/PRD.md docs/ROADMAP.md; do
  if grep -q 'R/I/A/S/E/C' "$f"; then
    pass "count: six RIASEC letters (R/I/A/S/E/C) present in $f"
  else
    fail "count: R/I/A/S/E/C letters missing from $f"
  fi
done

# CA dataset (AUDIT #5 finding 5): the committed JSON is the source of
# truth. Its city TOTAL must equal every "N cities" claim in the living
# docs (the "60 cities/province" cap phrasing is excluded), and its codes
# must equal canada.ts PROVINCE_CODES — the `as ProvinceCode` cast rests
# on that agreement. Regenerating the dataset without syncing docs fails.
CITY_ACTUAL=$(node -e 'const d=require("./lib/data/ca-provinces-cities.json");console.log(d.provinces.reduce((n,p)=>n+p.cities.length,0))' 2>/dev/null)
if [ -z "$CITY_ACTUAL" ]; then
  fail "count: could not read lib/data/ca-provinces-cities.json"
else
  CITY_BAD=0
  for f in docs/DECISIONS.md docs/ROADMAP.md; do
    CLAIMS=$(grep -oE '[0-9]+ cities([^/]|$)' "$f" | grep -oE '^[0-9]+' | sort -u)
    if [ -z "$CLAIMS" ]; then
      fail "count: no dataset-total 'N cities' claim found in $f"
      CITY_BAD=1
      continue
    fi
    for c in $CLAIMS; do
      if [ "$c" != "$CITY_ACTUAL" ]; then
        fail "count: $f claims $c cities but the dataset has $CITY_ACTUAL"
        CITY_BAD=1
      fi
    done
  done
  [ "$CITY_BAD" -eq 0 ] && pass "count: dataset city total ($CITY_ACTUAL) matches DECISIONS + ROADMAP claims"
fi
JSON_CODES=$(node -e 'const d=require("./lib/data/ca-provinces-cities.json");console.log(d.provinces.map(p=>p.code).sort().join(" "))' 2>/dev/null)
TS_CODES=$(sed -n '/PROVINCE_CODES = \[/,/^\] as const/p' lib/data/canada.ts \
  | grep -oE '"[A-Z]{2}"' | tr -d '"' | sort | tr '\n' ' ' | sed 's/ $//')
if [ -n "$JSON_CODES" ] && [ "$JSON_CODES" = "$TS_CODES" ]; then
  pass "count: dataset codes == canada.ts PROVINCE_CODES ($(echo "$JSON_CODES" | wc -w | tr -d ' ') codes)"
else
  fail "count: dataset codes [$JSON_CODES] != canada.ts PROVINCE_CODES [$TS_CODES]"
fi

# Seed jobs (1.3): the committed JSON is the source of truth. Its length
# must equal BOTH ROADMAP claims — the 1.3 seed bullet ("N realistic
# hand-written") and the Phase 1 DoD ("swipe N seeded jobs").
SEED_N=$(node -e 'console.log(require("./scripts/seed-jobs.json").length)' 2>/dev/null)
BULLET_N=$(grep -oE '[0-9]+ realistic hand-written' docs/ROADMAP.md | grep -oE '[0-9]+' | head -n 1)
DOD_N=$(grep -oE 'swipe [0-9]+ seeded jobs' docs/ROADMAP.md | grep -oE '[0-9]+' | head -n 1)
if [ -z "$SEED_N" ]; then
  fail "count: could not read scripts/seed-jobs.json"
elif [ -z "$BULLET_N" ] || [ -z "$DOD_N" ]; then
  fail "count: ROADMAP seed-job claims not found (1.3 bullet: '${BULLET_N:-missing}', DoD: '${DOD_N:-missing}')"
elif [ "$SEED_N" = "$BULLET_N" ] && [ "$SEED_N" = "$DOD_N" ]; then
  pass "count: seed-jobs.json holds $SEED_N jobs == ROADMAP 1.3 bullet == Phase 1 DoD"
else
  fail "count: seed-jobs.json has $SEED_N jobs but ROADMAP claims 1.3 bullet=$BULLET_N, DoD=$DOD_N"
fi

echo "== 6. Estimate arithmetic =="
# Per-phase estimates in the ROADMAP timeline table must sum to the stated
# total: stated max covers the summed max (buffer <= 2 wk); stated min is
# between summed min and summed max.
EST=$(grep -E '^\| [0-5] \|' docs/ROADMAP.md | awk -F'|' '{print $4}' | sed -e 's/–/-/g' -e 's/~//g')
TOTAL=$(grep '^\*\*Total:' docs/ROADMAP.md | sed 's/–/-/g' | grep -oE '[0-9]+-[0-9]+ weeks' | head -n 1)
if [ -z "$TOTAL" ]; then
  fail "estimate: ROADMAP total line not found/parsable"
else
  DETAIL=$(printf '%s\n' "$EST" | awk -v total="$TOTAL" '
    {
      unit = ($0 ~ /day/) ? 7 : 1
      if (match($0, /[0-9]+-[0-9]+/)) {
        split(substr($0, RSTART, RLENGTH), r, "-"); lo = r[1]; hi = r[2]
      } else if (match($0, /[0-9]+/)) {
        lo = substr($0, RSTART, RLENGTH); hi = lo
      } else next
      smin += lo / unit; smax += hi / unit; n++
    }
    END {
      split(total, t, "-"); tmin = t[1] + 0; tmax = t[2] + 0
      fmin = int(smin)
      cmax = (smax == int(smax)) ? smax : int(smax) + 1
      printf "phases=%d sum=%.1f-%.1f weeks, stated total=%d-%d\n", n, smin, smax, tmin, tmax
      bad = 0
      if (n != 6)          { print "ERR: expected 6 phase rows, found " n; bad = 1 }
      if (tmin < fmin)     { print "ERR: stated min " tmin " below summed min " fmin; bad = 1 }
      if (tmin > cmax)     { print "ERR: stated min " tmin " above summed max " cmax; bad = 1 }
      if (tmax < cmax)     { print "ERR: stated max " tmax " below summed max " cmax; bad = 1 }
      if (tmax > cmax + 2) { print "ERR: stated max " tmax " exceeds summed max " cmax " + 2wk buffer"; bad = 1 }
      exit bad
    }')
  if [ $? -eq 0 ]; then
    pass "estimate: $DETAIL"
  else
    fail "estimate: $(echo "$DETAIL" | tr '\n' ' ')"
  fi
fi

echo "== 7. Naming =="
# The product name must appear in the three core spec docs.
for f in CLAUDE.md docs/PRD.md docs/DESIGN.md; do
  if grep -q 'Sartor' "$f"; then
    pass "naming: product name 'Sartor' present in $f"
  else
    fail "naming: product name 'Sartor' missing from $f"
  fi
done
# Superseded working names may appear ONLY in docs/DECISIONS.md, where the
# naming decision legitimately records them as runners-up. Case-sensitive and
# word-bounded: the PRD's lowercase working pitch ("Tinder for jobs, with a
# tailor built in") is part of the spec and must NOT be flagged.
NAME_BAD=0
for n in 'Tinder for Jobs' 'Boreal' 'Chinook' 'Riffle' 'Portage'; do
  HITS=$(grep -rnw "$n" CLAUDE.md BETA-NOTES.md docs --include='*.md' 2>/dev/null | grep -v '^docs/DECISIONS.md:')
  if [ -n "$HITS" ]; then
    fail "naming: superseded name '$n' outside DECISIONS.md → $(echo "$HITS" | head -n 3 | tr '\n' ' ')"
    NAME_BAD=1
  fi
done
[ "$NAME_BAD" -eq 0 ] && pass "naming: no superseded working names outside DECISIONS.md"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "check-docs: ALL CHECKS PASSED"
  exit 0
else
  echo "check-docs: FAILURES FOUND — fix before merging (CLAUDE.md verification protocol, pass 2)"
  exit 1
fi
