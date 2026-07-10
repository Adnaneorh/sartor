import { z } from "zod";

// Boundary validation for auth forms (golden rule 11) — the pattern every
// API route / form reuses from here on. PIPEDA minimization (rule 15):
// full name, email, OPTIONAL phone, a 16+ confirmation — and NO date of
// birth, ever.

export const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "your name is required").max(200),
  email: z.email("that email doesn't look right"),
  password: z.string().min(8, "password needs at least 8 characters").max(72),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  age_confirmed: z.literal(true, {
    error: "you must confirm you are 16 or older",
  }),
});

export const signInSchema = z.object({
  email: z.email("that email doesn't look right"),
  password: z.string().min(1, "password is required"),
});

export const resendSchema = z.object({
  email: z.email(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
