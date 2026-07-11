import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/top-nav";
import { PersonaForm } from "./persona-form";

export const metadata = { title: "settings — sartor." };

// Persona editing (ROADMAP 1.2): reads the user's OWN row under RLS,
// pre-fills the shared field components, saves via savePersonaAction.
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin"); // middleware already guards; belt+suspenders

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "desired_roles, province, cities, remote_preference, salary_min_cad, salary_max_cad, seniority"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="settings" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            your <span className="marker-mint">persona</span>
          </h1>
          <p className="text-sm text-text-secondary">
            what onboarding captured — edit any time, the deck follows.
          </p>
        </div>
        <PersonaForm
          initial={{
            desired_roles: profile?.desired_roles ?? [],
            province: profile?.province ?? "",
            cities: profile?.cities ?? [],
            remote_preference: profile?.remote_preference ?? "any",
            salary_min_cad: profile?.salary_min_cad ?? null,
            salary_max_cad: profile?.salary_max_cad ?? null,
            seniority: profile?.seniority ?? "",
          }}
        />
      </main>
    </div>
  );
}
