import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that require a signed-in AND email-verified user. Everything the
// real app adds later (deck, tracker, studio, copilot) belongs here.
const PROTECTED_PREFIXES = ["/home"];

// Session refresh + route protection, run by middleware.ts on every
// matched request. Do not run logic between createServerClient and
// auth.getUser() — the session refresh depends on this exact shape.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed in but email not verified → only the check-inbox screen.
  // (Belt-and-suspenders: with confirm-email ON, unverified users cannot
  // sign in at all; OAuth users arrive pre-verified.)
  if (isProtected && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = "/check-inbox";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
