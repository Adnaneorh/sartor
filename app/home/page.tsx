import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/top-nav";
import { Deck } from "@/components/deck/deck";
import { FilterRail } from "@/components/deck/filter-rail";
import {
  filtersFromPersona,
  hasFilterParams,
  parseDeckFilters,
  type SearchParams,
} from "@/lib/validation/deck-filters";
import { fetchDeck, fetchSwipedJobIds } from "@/lib/jobs/deck-query";

export const metadata = { title: "deck — sartor." };

// The swipe deck (ROADMAP 1.4). Server owns the query: it parses the URL
// filters (or seeds them from the persona on a bare /home, PRD 3.2a),
// reads the caller's swiped ids, and runs THE canonical deck query
// (freshness triplet baked in, rule 14). The client Deck only animates
// the batch and records swipes via server actions.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin"); // middleware already guards; belt+suspenders

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, onboarded_at, province, cities, remote_preference, salary_min_cad"
    )
    .eq("user_id", user.id)
    .single();

  // Persona first: /home is gated on completed onboarding (ROADMAP 1.2).
  if (!profile?.onboarded_at) redirect("/onboarding");

  const params = await searchParams;
  // bare /home → persona defaults; any filter key (incl. the `f` marker)
  // → parse the URL, so a deliberately-cleared rail stays cleared
  const filters = hasFilterParams(params)
    ? parseDeckFilters(params)
    : filtersFromPersona(profile);

  const { ids: swipedJobIds } = await fetchSwipedJobIds(supabase, user.id);
  const { jobs, error } = await fetchDeck(supabase, filters, swipedJobIds);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="home" />
      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-10 px-6 py-10">
        <FilterRail filters={filters} />
        <section className="flex flex-1 flex-col items-center gap-6">
          <h1 className="self-start text-2xl font-medium tracking-tight text-ink">
            fresh <span className="marker-mint">this week</span>
          </h1>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              couldn&apos;t load the deck — refresh to try again.
            </p>
          ) : (
            <Deck initialJobs={jobs} />
          )}
        </section>
        {/* right match panel is Phase 1.5/3.x — column slot intentionally
            left for it (approved 1.4 decision 7) */}
      </main>
    </div>
  );
}
