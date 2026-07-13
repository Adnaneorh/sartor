import { z } from "zod";
import {
  isCityInProvince,
  isProvinceCode,
  type ProvinceCode,
} from "@/lib/data/canada";
import {
  SALARY_MAX_CAD,
  type RemotePreference,
} from "@/lib/validation/persona";

// Boundary validation for the deck's URL searchParams (golden rule 11):
// filters live in the URL (approved 1.4 decision 1), so the URL is a
// trust boundary — anyone can type one. Parsing is LENIENT by design:
// an invalid piece is dropped to its default, never an error page.
//
// Pre-fill contract (PRD 3.2a "persona defaults pre-fill them"): a bare
// /home carries no filter keys → the server pre-fills from the persona.
// The rail always writes the `f` marker key, so clearing every filter
// yields /home?f=1 — recognizably "cleared", NOT a re-trigger of the
// persona defaults. "reset to my defaults" links back to bare /home.

export const REMOTE_FILTERS = ["all", "remote", "onsite"] as const;
export type RemoteFilter = (typeof REMOTE_FILTERS)[number];

export const MAX_SEARCH_LENGTH = 80;

export type DeckFilters = {
  q: string | null;
  province: ProvinceCode | null;
  cities: string[];
  remote: RemoteFilter;
  salaryMin: number | null;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const FILTER_KEYS = ["q", "province", "city", "remote", "salary_min", "f"] as const;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const many = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

// Lenient piece-wise schemas: .catch() drops junk to the default.
const qSchema = z
  .string()
  .trim()
  .max(MAX_SEARCH_LENGTH)
  .catch("");
const remoteSchema = z.enum(REMOTE_FILTERS).catch("all");
const salarySchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(SALARY_MAX_CAD)
  .catch(NaN);

export function hasFilterParams(searchParams: SearchParams): boolean {
  return FILTER_KEYS.some((key) => searchParams[key] !== undefined);
}

export function parseDeckFilters(searchParams: SearchParams): DeckFilters {
  const q = qSchema.parse(first(searchParams.q) ?? "");

  const provinceRaw = first(searchParams.province) ?? "";
  const province = isProvinceCode(provinceRaw) ? provinceRaw : null;

  // cities only mean something under their province, and only when they
  // exist in the committed CA dataset (rule 11 — never trusted from the URL)
  const cities =
    province === null
      ? []
      : many(searchParams.city)
          .filter((city) => isCityInProvince(city, province))
          .slice(0, 20);

  const salaryParsed = salarySchema.parse(first(searchParams.salary_min) ?? "");

  return {
    q: q === "" ? null : q,
    province,
    cities,
    remote: remoteSchema.parse(first(searchParams.remote) ?? ""),
    salaryMin: Number.isNaN(salaryParsed) || salaryParsed === 0 ? null : salaryParsed,
  };
}

// Bare /home: seed the rail from the persona (PRD 3.2a). remote_preference
// maps conservatively — "hybrid" and "any" mean the user is open to both,
// so the deck shows everything ("all").
export function filtersFromPersona(profile: {
  province: string | null;
  cities: string[] | null;
  remote_preference: string | null;
  salary_min_cad: number | null;
}): DeckFilters {
  const province =
    profile.province !== null && isProvinceCode(profile.province)
      ? profile.province
      : null;
  const remoteMap: Partial<Record<RemotePreference, RemoteFilter>> = {
    remote: "remote",
    onsite: "onsite",
  };
  return {
    q: null,
    province,
    cities:
      province === null
        ? []
        : (profile.cities ?? []).filter((city) => isCityInProvince(city, province)),
    remote: remoteMap[profile.remote_preference as RemotePreference] ?? "all",
    salaryMin: profile.salary_min_cad ?? null,
  };
}
