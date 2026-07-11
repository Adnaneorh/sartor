"use client";

import { useState } from "react";
import { citiesForProvince, PROVINCES } from "@/lib/data/canada";
import { Input } from "@/components/ui/input";

const MAX_CITIES = 20;

// Province native select, pill-styled (PRD §3.2a: single select, 13 codes).
// Changing province is the parent's cue to reset the cascading cities.
export function ProvinceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="province or territory"
        className="h-9 w-full appearance-none rounded-pill hairline bg-surface px-4 pr-9 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="" disabled>
          pick a province or territory
        </option>
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
  );
}

// Cascading city multi-select: pill toggles fed by the static dataset for
// the selected province, with a filter box. Enter in the filter toggles the
// first match (and never submits the form).
export function CityMultiSelect({
  provinceCode,
  value,
  onChange,
}: {
  provinceCode: string;
  value: string[];
  onChange: (cities: string[]) => void;
}) {
  const [filter, setFilter] = useState("");

  if (!provinceCode) {
    return (
      <p className="text-sm text-text-muted">
        pick a province first — its cities appear here
      </p>
    );
  }

  const query = filter.trim().toLowerCase();
  const shown = citiesForProvince(provinceCode).filter(
    (c) => !query || c.toLowerCase().includes(query)
  );

  const toggle = (city: string) => {
    if (value.includes(city)) onChange(value.filter((c) => c !== city));
    else if (value.length < MAX_CITIES) onChange([...value, city]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (shown.length > 0) {
                toggle(shown[0]);
                setFilter("");
              }
            }
          }}
          placeholder="filter cities…"
          aria-label="filter cities"
        />
        <span className="shrink-0 font-mono text-xs text-text-muted">
          {value.length}/{MAX_CITIES}
        </span>
      </div>
      <div className="flex max-h-44 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
        {shown.map((city) => {
          const selected = value.includes(city);
          return (
            <button
              key={city}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(city)}
              className={
                selected
                  ? "rounded-pill bg-mint-tint px-3 py-1 text-sm font-medium text-mint-text"
                  : "rounded-pill hairline bg-surface px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-surface-tint"
              }
            >
              {city}
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="text-sm text-text-muted">no city matches “{filter.trim()}”</p>
        )}
      </div>
      <p className="text-xs text-text-muted">
        optional — leave empty for anywhere in the province
      </p>
    </div>
  );
}
