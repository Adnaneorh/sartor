import { z } from "zod";
import { isCityInProvince, PROVINCE_CODES } from "@/lib/data/canada";

// Boundary validation for the persona (onboarding + settings), on the
// lib/validation/auth.ts pattern (golden rule 11). Enum option lists are
// defined HERE once and feed both the UI pills and the schema — this fixes
// the free-text remote_preference/seniority the profiles migration left
// open (DECISION 2, 2026-07-11). Province is STORED AS CODE (e.g. "ON");
// Phase 2 matching joins on codes, not display names.

export const REMOTE_PREFERENCES = ["remote", "hybrid", "onsite", "any"] as const;
export const SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead"] as const;

export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];
export type Seniority = (typeof SENIORITY_LEVELS)[number];

// Shared with the salary UI so the input clamps to the same ceiling the
// boundary enforces (AUDIT #5 finding 6) — one constant, two layers.
export const SALARY_MAX_CAD = 1_000_000;

const salaryCad = z
  .number("salary must be a number")
  .int("salary must be a whole number")
  .min(0, "salary can't be negative")
  .max(SALARY_MAX_CAD, "salary must be 1,000,000 or less")
  .optional();

export const personaSchema = z
  .object({
    desired_roles: z
      .array(
        z
          .string()
          .trim()
          .min(2, "each role needs at least 2 characters")
          .max(80, "each role must be 80 characters or less")
      )
      .min(1, "add at least one role")
      .max(10, "up to 10 roles")
      // the UI dedupes case-insensitively; don't trust the client (rule 11)
      .transform((roles) => {
        const seen = new Set<string>();
        return roles.filter((role) => {
          const key = role.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }),
    province: z.enum(PROVINCE_CODES, {
      error: "pick a province or territory",
    }),
    cities: z
      .array(z.string().trim().min(1).max(100))
      .max(20, "up to 20 cities"),
    remote_preference: z.enum(REMOTE_PREFERENCES, {
      error: "pick a remote preference",
    }),
    seniority: z.enum(SENIORITY_LEVELS, {
      error: "pick a seniority level",
    }),
    // salary range is skippable (DECISION 4) — both fields optional
    salary_min_cad: salaryCad,
    salary_max_cad: salaryCad,
  })
  .superRefine((persona, ctx) => {
    // cities must belong to the SELECTED province — verified server-side
    // against the static dataset, never trusted from the client (rule 11)
    for (const city of persona.cities) {
      if (!isCityInProvince(city, persona.province)) {
        ctx.addIssue({
          code: "custom",
          path: ["cities"],
          message: `"${city}" isn't in the selected province`,
        });
      }
    }
    // mirrors the profiles salary_range_valid DB check constraint
    if (
      persona.salary_min_cad !== undefined &&
      persona.salary_max_cad !== undefined &&
      persona.salary_min_cad > persona.salary_max_cad
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_max_cad"],
        message: "max salary must be at least the min",
      });
    }
  });

export type PersonaInput = z.infer<typeof personaSchema>;
