"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { citiesForProvince, PROVINCES } from "@/lib/data/canada";
import {
  REMOTE_FILTERS,
  type DeckFilters,
  type RemoteFilter,
} from "@/lib/validation/deck-filters";
import { Input } from "@/components/ui/input";

// Left filter rail (ROADMAP 1.4, DESIGN layout): title search → province
// → cascading cities → remote → min salary. Filters live in the URL
// (approved 1.4 decision 1); this component only translates UI state into
// searchParams and pushes — the server component re-runs the canonical
// deck query. Every push writes the `f` marker so a fully-cleared rail is
// /home?f=1 ("cleared"), distinct from a bare /home (persona defaults).

const REMOTE_LABELS: Record<RemoteFilter, string> = {
  all: "all",
  remote: "remote",
  onsite: "on-site",
};

const SEARCH_DEBOUNCE_MS = 300;

export function FilterRail({ filters }: { filters: DeckFilters }) {
  const router = useRouter();

  // local mirror so typing/toggling is instant; the URL is the source of
  // truth the server reads, so we push a fresh query on every change
  const [q, setQ] = useState(filters.q ?? "");
  const [province, setProvince] = useState<string>(filters.province ?? "");
  const [cities, setCities] = useState<string[]>(filters.cities);
  const [remote, setRemote] = useState<RemoteFilter>(filters.remote);
  const [salaryMin, setSalaryMin] = useState<string>(
    filters.salaryMin !== null ? String(filters.salaryMin) : ""
  );
  const [cityFilter, setCityFilter] = useState("");

  const push = (next: {
    q?: string;
    province?: string;
    cities?: string[];
    remote?: RemoteFilter;
    salaryMin?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("f", "1"); // marker: these are chosen filters, not persona defaults
    const query = (next.q ?? q).trim();
    if (query) params.set("q", query);
    const prov = next.province ?? province;
    if (prov) params.set("province", prov);
    const cityList = next.cities ?? cities;
    // cities only make sense under their province
    if (prov) for (const c of cityList) params.append("city", c);
    const rem = next.remote ?? remote;
    if (rem !== "all") params.set("remote", rem);
    const sal = (next.salaryMin ?? salaryMin).trim();
    if (sal && Number(sal) > 0) params.set("salary_min", sal);
    router.push(`/home?${params.toString()}`);
  };

  // debounce only the free-text search; selects/toggles push immediately
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (value: string) => {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push({ q: value }), SEARCH_DEBOUNCE_MS);
  };
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const onProvince = (code: string) => {
    setProvince(code);
    setCities([]); // province change resets the cascade
    setCityFilter("");
    push({ province: code, cities: [] });
  };

  const toggleCity = (city: string) => {
    const next = cities.includes(city)
      ? cities.filter((c) => c !== city)
      : [...cities, city];
    setCities(next);
    push({ cities: next });
  };

  const onRemote = (value: RemoteFilter) => {
    setRemote(value);
    push({ remote: value });
  };

  const onSalary = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 7);
    setSalaryMin(digits);
    push({ salaryMin: digits });
  };

  const anyActive =
    q !== "" ||
    province !== "" ||
    cities.length > 0 ||
    remote !== "all" ||
    salaryMin !== "";

  const shownCities = province
    ? citiesForProvince(province).filter(
        (c) => !cityFilter.trim() || c.toLowerCase().includes(cityFilter.trim().toLowerCase())
      )
    : [];

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">filters</h2>
        {anyActive && (
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-xs text-text-secondary transition-colors hover:text-ink"
          >
            reset to my defaults
          </button>
        )}
      </div>

      {/* title search */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="deck-search" className="text-xs text-text-secondary">
          search titles
        </label>
        <Input
          id="deck-search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="developer, designer…"
        />
      </div>

      {/* province */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="deck-province" className="text-xs text-text-secondary">
          province
        </label>
        <div className="relative">
          <select
            id="deck-province"
            value={province}
            onChange={(e) => onProvince(e.target.value)}
            className="h-9 w-full appearance-none rounded-pill hairline bg-surface px-4 pr-9 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">anywhere in Canada</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted"
          >
            ▾
          </span>
        </div>
      </div>

      {/* cascading cities */}
      {province && (
        <div className="flex flex-col gap-2">
          <label htmlFor="deck-city-filter" className="text-xs text-text-secondary">
            cities <span className="font-mono text-text-muted">{cities.length}</span>
          </label>
          <Input
            id="deck-city-filter"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="filter cities…"
          />
          <div className="flex max-h-40 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
            {shownCities.map((city) => {
              const selected = cities.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleCity(city)}
                  className={
                    selected
                      ? "rounded-pill bg-mint-tint px-3 py-1 text-xs font-medium text-mint-text"
                      : "rounded-pill hairline bg-surface px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-tint"
                  }
                >
                  {city}
                </button>
              );
            })}
            {shownCities.length === 0 && (
              <p className="text-xs text-text-muted">no city matches</p>
            )}
          </div>
        </div>
      )}

      {/* remote */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-text-secondary">work style</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="work style">
          {REMOTE_FILTERS.map((value) => {
            const selected = remote === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onRemote(value)}
                className={
                  selected
                    ? "h-8 rounded-pill bg-mint-tint px-4 text-xs font-medium text-mint-text"
                    : "h-8 rounded-pill hairline bg-surface px-4 text-xs text-text-secondary transition-colors hover:bg-surface-tint"
                }
              >
                {REMOTE_LABELS[value]}
              </button>
            );
          })}
        </div>
      </div>

      {/* min salary */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="deck-salary" className="text-xs text-text-secondary">
          min salary <span className="font-mono text-text-muted">CAD/yr</span>
        </label>
        <Input
          id="deck-salary"
          value={salaryMin}
          onChange={(e) => onSalary(e.target.value)}
          inputMode="numeric"
          placeholder="55000"
          className="font-mono"
        />
      </div>
    </aside>
  );
}
