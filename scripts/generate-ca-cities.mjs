// Generates lib/data/ca-provinces-cities.json — the static provinces→cities
// dataset (PRD §3.2a, ROADMAP 1.2 step 1). Rerunnable: downloads GeoNames
// cities5000 (CC BY 4.0), filters country=CA, maps admin1 codes → the 13
// province/territory codes, dedupes, sorts by population desc, caps 60
// cities per province (pop ≥5k keeps Whitehorse, Yellowknife, Iqaluit).
//
//   node scripts/generate-ca-cities.mjs
//
// Download failure → do NOT overwrite the committed JSON; fall back to the
// last committed dataset (or hand-curate) and say so in the daily log.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE_URL = "https://download.geonames.org/export/dump/cities5000.zip";
const MIN_POPULATION = 5000; // DECISION 3 (2026-07-11)
const MAX_CITIES_PER_PROVINCE = 60; // DECISION 3 (2026-07-11)

// GeoNames admin1 codes for CA → the 13 postal province/territory codes
// (10 provinces + 3 territories; "06" is unassigned in GeoNames).
const ADMIN1_TO_PROVINCE = {
  "01": { code: "AB", name: "Alberta" },
  "02": { code: "BC", name: "British Columbia" },
  "03": { code: "MB", name: "Manitoba" },
  "04": { code: "NB", name: "New Brunswick" },
  "05": { code: "NL", name: "Newfoundland and Labrador" },
  "07": { code: "NS", name: "Nova Scotia" },
  "08": { code: "ON", name: "Ontario" },
  "09": { code: "PE", name: "Prince Edward Island" },
  "10": { code: "QC", name: "Quebec" },
  "11": { code: "SK", name: "Saskatchewan" },
  "12": { code: "YT", name: "Yukon" },
  "13": { code: "NT", name: "Northwest Territories" },
  "14": { code: "NU", name: "Nunavut" },
};

console.log(`downloading ${SOURCE_URL} …`);
const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(
    `download failed (${res.status} ${res.statusText}) — NOT touching the ` +
      "committed dataset. Retry later or hand-curate (log it in docs/daily/)."
  );
  process.exit(1);
}
const zipBytes = Buffer.from(await res.arrayBuffer());

// cities5000.zip holds one TSV (GeoNames "geoname" table layout):
// 1=name · 8=country code · 10=admin1 code · 14=population
const tmp = mkdtempSync(join(tmpdir(), "geonames-"));
let tsv;
try {
  const zipPath = join(tmp, "cities5000.zip");
  writeFileSync(zipPath, zipBytes);
  tsv = execFileSync("unzip", ["-p", zipPath, "cities5000.txt"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const byProvince = new Map(); // code → Map(cityName → population)
for (const line of tsv.split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  if (f[8] !== "CA") continue;
  const province = ADMIN1_TO_PROVINCE[f[10]];
  if (!province) continue;
  const population = Number(f[14]) || 0;
  if (population < MIN_POPULATION) continue;
  const name = f[1];
  if (!byProvince.has(province.code)) byProvince.set(province.code, new Map());
  const cities = byProvince.get(province.code);
  // dedupe: keep the most-populous entry for a repeated name
  if ((cities.get(name) ?? -1) < population) cities.set(name, population);
}

const provinces = Object.values(ADMIN1_TO_PROVINCE)
  .sort((a, b) => a.name.localeCompare(b.name, "en"))
  .map(({ code, name }) => ({
    code,
    name,
    cities: [...(byProvince.get(code) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
      .slice(0, MAX_CITIES_PER_PROVINCE)
      .map(([city]) => city),
  }));

const empty = provinces.filter((p) => p.cities.length === 0);
if (provinces.length !== 13 || empty.length > 0) {
  console.error(
    `sanity check failed: ${provinces.length}/13 provinces, empty: ` +
      `${empty.map((p) => p.code).join(",") || "none"} — NOT writing.`
  );
  process.exit(1);
}

const dataset = {
  source:
    "GeoNames cities5000 (https://download.geonames.org/export/dump/), " +
    "licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
  version: `cities5000 fetched ${new Date().toISOString().slice(0, 10)}, pop ≥${MIN_POPULATION}, ≤${MAX_CITIES_PER_PROVINCE}/province`,
  provinces,
};

const outPath = new URL("../lib/data/ca-provinces-cities.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
console.log(
  `wrote lib/data/ca-provinces-cities.json — 13 provinces/territories, ` +
    `${provinces.reduce((n, p) => n + p.cities.length, 0)} cities ` +
    `(${provinces.map((p) => `${p.code}:${p.cities.length}`).join(" ")})`
);
