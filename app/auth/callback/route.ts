import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth code exchange (Google lands in the 1.1 follow-up; route is ready).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/signin?error=oauth_failed", request.url));
}
