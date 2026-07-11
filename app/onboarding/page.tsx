import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "get set up — sartor." };

// First-run persona capture. Deliberately NOT the TopNav: during
// onboarding /home just bounces back here, so tabs would mislead. One
// card on the offset MINT tint panel (DESIGN signature element 3).
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin"); // middleware already guards; belt+suspenders

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("user_id", user.id)
    .single();
  if (profile?.onboarded_at) redirect("/home"); // already onboarded → edits live in settings

  return (
    <div className="flex min-h-screen flex-col">
      <header className="hairline-b bg-surface">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-medium tracking-tight text-ink">
            sartor<span className="text-primary">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="h-8 rounded-pill bg-secondary px-4 text-sm text-secondary-foreground hover:bg-surface-tint"
              >
                sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="relative w-full max-w-[480px]">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-card bg-mint-tint"
          />
          <div className="relative rounded-card hairline bg-surface p-8">
            <OnboardingForm />
          </div>
        </div>
      </main>
    </div>
  );
}
