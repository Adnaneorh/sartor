"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema, resendSchema } from "@/lib/validation/auth";

// Server actions = the trust boundary: every input Zod-parsed before any
// Supabase call (rule 11). Never trust the client.

export type AuthFormState = { error: string | null };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") ?? "",
    age_confirmed: formData.get("age_confirmed") === "on" ? true : false,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? "",
        age_confirmed: parsed.data.age_confirmed,
      },
    },
  });
  if (error) return { error: error.message };

  redirect(`/check-inbox?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Unconfirmed accounts are blocked server-side by Supabase; route the
    // user to the screen that can actually help them.
    if (error.code === "email_not_confirmed") {
      redirect(`/check-inbox?email=${encodeURIComponent(parsed.data.email)}`);
    }
    return { error: "email or password is incorrect" };
  }

  redirect("/home");
}

export async function resendConfirmationAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "invalid email" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  });
  // Same message either way — don't leak whether an address is registered.
  if (error && error.status !== 429) {
    return { error: "could not resend right now — try again in a minute" };
  }
  return { error: null };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/signin");
}
