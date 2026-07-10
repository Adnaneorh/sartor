import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata = { title: "home — sartor." };

// Protected placeholder until the deck lands (Phase 1.4). Reads the
// user's OWN profile under RLS — the positive control the two-account
// test pairs with.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin"); // middleware already guards; belt+suspenders

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, age_confirmed")
    .eq("user_id", user.id)
    .single();

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
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          you&apos;re <span className="marker-mint">in</span>
          {profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-text-secondary">
          Signed in as <span className="font-mono">{user.email}</span> — email
          verified, profile row live under RLS. The deck arrives in Phase 1.4.
        </p>
      </main>
    </div>
  );
}
