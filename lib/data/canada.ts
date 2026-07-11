import dataset from "./ca-provinces-cities.json";

// Typed accessors over the static provinces→cities dataset (PRD §3.2a).
// Consumed by BOTH the onboarding/settings UI and server-side validation
// (lib/validation/persona.ts) — one source of truth for what counts as a
// valid Canadian province code or city. Regenerate the JSON with
// scripts/generate-ca-cities.mjs; never hand-edit it.

// The 13 postal codes: 10 provinces + 3 territories (PRD §3.2a).
export const PROVINCE_CODES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT",
  "NU", "ON", "PE", "QC", "SK", "YT",
] as const;

export type ProvinceCode = (typeof PROVINCE_CODES)[number];

export const PROVINCES: ReadonlyArray<{ code: ProvinceCode; name: string }> =
  dataset.provinces.map(({ code, name }) => ({
    code: code as ProvinceCode,
    name,
  }));

const citiesByProvince = new Map<string, string[]>(
  dataset.provinces.map((p) => [p.code, p.cities])
);

export function isProvinceCode(value: string): value is ProvinceCode {
  return (PROVINCE_CODES as readonly string[]).includes(value);
}

export function citiesForProvince(code: string): string[] {
  return citiesByProvince.get(code) ?? [];
}

export function isCityInProvince(city: string, code: string): boolean {
  return citiesForProvince(code).includes(city);
}
