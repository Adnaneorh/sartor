import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/top-nav";

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
    .select("full_name, age_confirmed, onboarded_at")
    .eq("user_id", user.id)
    .single();

  // Persona first: /home is gated on completed onboarding (ROADMAP 1.2).
  // onboarded_at is an explicit fact — never inferred from empty fields.
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="home" />
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
