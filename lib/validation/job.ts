import { z } from "zod";
import { isCityInProvince, isProvinceCode } from "@/lib/data/canada";
import { SALARY_MAX_CAD } from "@/lib/validation/persona";

// Boundary validation for job rows (golden rule 11), on the persona.ts
// pattern: enum constants defined HERE once. Consumed today by the seed
// script (scripts/seed-jobs.mts); the 1.4 deck and later TS boundaries
// reuse the enums/types. The Phase 2 worker is Python — it re-implements
// the same rules against the same DB constraints.

export const APPLY_MODES = ["easy", "hard"] as const;
export type ApplyMode = (typeof APPLY_MODES)[number];

// Fixed NOC-family category list arrives with Phase 2's crosswalk work
// (AI call point #8); until then this is the only valid value (PRD 3.1b).
export const UNCATEGORIZED = "uncategorized";

// Freshness (rule 14): seeds may only claim ages inside the 10-day window,
// with ≥12h of slack so a fresh seed run never starts already at the edge.
const MAX_POSTED_HOURS_AGO = 228; // 9.5 days

const salaryCad = z
  .number("salary must be a number")
  .int("salary must be a whole number")
  .min(0, "salary can't be negative")
  .max(SALARY_MAX_CAD, "salary must be 1,000,000 or less")
  .nullable();

export const seedJobSchema = z
  .object({
    external_id: z
      .string()
      .regex(/^seed-\d{3}$/, "external_id must look like seed-001"),
    company: z.string().trim().min(2).max(120),
    title: z.string().trim().min(2).max(120),
    // null province = Canada-wide remote posting (jobs migration comment)
    province: z.string().nullable(),
    city: z.string().trim().min(1).max(100).nullable(),
    is_remote: z.boolean(),
    salary_min_cad: salaryCad,
    salary_max_cad: salaryCad,
    description: z.string().min(400).max(3000),
    apply_url: z.string().startsWith("https://"),
    tags: z.array(z.string().trim().min(2).max(30)).min(3).max(4),
    posted_hours_ago: z.number().int().min(0).max(MAX_POSTED_HOURS_AGO),
  })
  .superRefine((job, ctx) => {
    // province/city validated against the committed CA dataset, exactly
    // like persona.ts — never trusted from the data file (rule 11)
    if (job.province !== null && !isProvinceCode(job.province)) {
      ctx.addIssue({
        code: "custom",
        path: ["province"],
        message: `"${job.province}" is not a province/territory code`,
      });
    }
    if (job.city !== null) {
      if (job.province === null) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: "a city requires a province",
        });
      } else if (!isCityInProvince(job.city, job.province)) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: `"${job.city}" isn't in ${job.province}`,
        });
      }
    }
    // only a remote posting may float free of a location
    if (!job.is_remote && (job.province === null || job.city === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["is_remote"],
        message: "non-remote postings need a province and a city",
      });
    }
    // salary: both-or-neither, min ≤ max (mirrors jobs_salary_range_valid)
    if ((job.salary_min_cad === null) !== (job.salary_max_cad === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_max_cad"],
        message: "salary must be a full range or absent",
      });
    }
    if (
      job.salary_min_cad !== null &&
      job.salary_max_cad !== null &&
      job.salary_min_cad > job.salary_max_cad
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_max_cad"],
        message: "max salary must be at least the min",
      });
    }
    // seeds deep-link to guaranteed-dead .example hosts — a user can never
    // be sent to a real (and therefore mismatched) posting (PRD 3.2b#5)
    try {
      const host = new URL(job.apply_url).hostname;
      if (!host.endsWith(".example")) {
        ctx.addIssue({
          code: "custom",
          path: ["apply_url"],
          message: "seed apply_url hosts must end in .example",
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["apply_url"],
        message: "apply_url is not a valid URL",
      });
    }
  });

export type SeedJob = z.infer<typeof seedJobSchema>;
