import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";

const TABS = [
  { href: "/home", label: "home" },
  { href: "/settings", label: "settings" },
] as const;

type Tab = (typeof TABS)[number]["label"];

// DESIGN top navigation: wordmark left, lowercase tabs center (active =
// 2px green underline), theme toggle + sign out right. NO streak pill —
// that's post-launch (DESIGN signature element 4). Server component; the
// page passes which tab it is.
export function TopNav({ active }: { active: Tab }) {
  return (
    <header className="hairline-b bg-surface">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center px-6">
        <div className="flex flex-1 items-center">
          <Link href="/home" className="text-lg font-medium tracking-tight text-ink">
            sartor<span className="text-primary">.</span>
          </Link>
        </div>
        <div className="flex h-full items-center gap-6">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.label === active ? "page" : undefined}
              className={`flex h-full items-center border-b-2 text-sm transition-colors ${
                tab.label === active
                  ? "border-primary font-medium text-ink"
                  : "border-transparent text-text-secondary hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
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
  );
}
