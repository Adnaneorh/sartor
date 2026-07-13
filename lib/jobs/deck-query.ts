import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckFilters } from "@/lib/validation/deck-filters";

// THE canonical deck query (golden rule 14 / PRD 3.2b#3) — the ONLY
// permitted entry point for deck reads. Every query built here starts
// with the mandatory freshness triplet:
//
//   is_active = true AND is_fresh = true
//   AND posted_at >= now() - interval '10 days'
//
// BEFORE any user filter is applied — the exact shape jobs_deck_idx
// (partial on is_active, posted_at desc) is built for. Never query jobs
// for the deck anywhere else; never add a code path that can skip the
// triplet.
//
// Rule 7 note: everything below is parameterized PostgREST, no SQL
// strings. The .or() filter strings interpolate ONLY values we already
// validated against our own static dataset or coerced to integers
// (deck-filters.ts) — raw search text goes exclusively through the
// parameterized .ilike(), with LIKE wildcards escaped here.

export const DECK_BATCH_SIZE = 40;
export const FRESHNESS_WINDOW_DAYS = 10;

export const DECK_JOB_COLUMNS =
  "id, company, title, province, city, is_remote, logo_url, salary_min_cad, salary_max_cad, description, tags, posted_at" as const;

export type DeckJob = {
  id: string;
  company: string;
  title: string;
  province: string | null;
  city: string | null;
  is_remote: boolean;
  logo_url: string | null;
  salary_min_cad: number | null;
  salary_max_cad: number | null;
  description: string;
  tags: string[];
  posted_at: string;
};

// % and _ are LIKE wildcards, \ the escape char — a searcher typing them
// means the literal character (rule 11: URL text is untrusted).
const escapeLike = (raw: string) =>
  raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);

export async function fetchSwipedJobIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ids: string[]; error: string | null }> {
  // RLS already scopes swipes to the caller; the .eq is belt+suspenders
  const { data, error } = await supabase
    .from("swipes")
    .select("job_id")
    .eq("user_id", userId);
  if (error) return { ids: [], error: error.message };
  return { ids: data.map((row) => row.job_id), error: null };
}

export async function fetchDeck(
  supabase: SupabaseClient,
  filters: DeckFilters,
  swipedJobIds: string[]
): Promise<{ jobs: DeckJob[]; error: string | null }> {
  let query = supabase
    .from("jobs")
    .select(DECK_JOB_COLUMNS)
    // ---- mandatory freshness triplet (rule 14) — never conditional ----
    .eq("is_active", true)
    .eq("is_fresh", true)
    .gte(
      "posted_at",
      new Date(Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 3_600_000).toISOString()
    );
  // -------------------------------------------------------------------

  // a job never reappears once swiped (PRD 3.2); ids come from our own
  // swipes read (uuids), not user input
  if (swipedJobIds.length > 0) {
    query = query.not("id", "in", `(${swipedJobIds.join(",")})`);
  }

  // title search: parameterized ilike, trgm-indexed (1.4 decision 4)
  if (filters.q !== null) {
    query = query.ilike("title", `%${escapeLike(filters.q)}%`);
  }

  // location (1.4 decision 5): remote-only ignores location (a remote job
  // is workable from anywhere); on-site narrows strictly; "all" with a
  // province shows that province PLUS Canada-wide remote postings.
  // province is a validated code, cities validated dataset names — the
  // only values interpolated into .or() strings.
  const cityList =
    filters.cities.length > 0
      ? `,city.in.(${filters.cities.map((c) => `"${c}"`).join(",")})`
      : "";
  if (filters.remote === "remote") {
    query = query.eq("is_remote", true);
  } else if (filters.remote === "onsite") {
    query = query.eq("is_remote", false);
    if (filters.province !== null) {
      query = query.eq("province", filters.province);
      if (filters.cities.length > 0) query = query.in("city", filters.cities);
    }
  } else if (filters.province !== null) {
    query = query.or(
      `and(province.eq.${filters.province}${cityList}),and(is_remote.eq.true,province.is.null)`
    );
  }

  // min salary (1.4 decision 6): jobs that can't be proven under the bar
  // (no salary data) stay visible; salaryMin is a bounded integer
  if (filters.salaryMin !== null) {
    query = query.or(
      `salary_max_cad.gte.${filters.salaryMin},salary_max_cad.is.null`
    );
  }

  const { data, error } = await query
    .order("posted_at", { ascending: false }) // freshest first (decision 8)
    .limit(DECK_BATCH_SIZE);

  if (error) return { jobs: [], error: error.message };
  return { jobs: (data ?? []) as DeckJob[], error: null };
}
