import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key only (the ONLY key allowed client-side,
// CLAUDE.md golden rule 8). RLS is the security boundary.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
