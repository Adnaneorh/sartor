import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// Phase 0.2 skeleton shell: proves the token system end-to-end (top nav,
// highlighter headline, offset tint panel, mono data) — no features yet.
// Streak pill deliberately absent: post-launch (DESIGN.md signature #4).

const TABS = [
  { label: "deck", active: true },
  { label: "tracker", active: false },
  { label: "studio", active: false },
  { label: "copilot", active: false },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="hairline-b bg-surface">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-8 px-6">
          <span className="text-lg font-medium tracking-tight text-ink">
            sartor<span className="text-primary">.</span>
          </span>
          <ul className="flex flex-1 items-center gap-6">
            {TABS.map((tab) => (
              <li key={tab.label}>
                <a
                  href="#"
                  aria-current={tab.active ? "page" : undefined}
                  className={
                    tab.active
                      ? "border-b-2 border-primary pb-1 text-ink"
                      : "pb-1 text-text-secondary hover:text-ink"
                  }
                >
                  {tab.label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          fresh roles, <span className="marker-mint">this week</span>
        </h1>

        {/* Offset tint panel: solid mint block peeking behind the hero card */}
        <div className="relative max-w-md">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-card bg-mint-tint"
          />
          <div className="hairline relative rounded-card bg-card p-6">
            <p className="text-base font-medium text-ink">Frontend Developer</p>
            <p className="mt-1 text-text-secondary">
              Example Co · Toronto, ON ·{" "}
              <span className="font-mono text-mint-text">$95–120k</span>
            </p>
            <p className="mt-3 font-mono text-text-muted">
              dropped 2 days ago
            </p>
            <div className="mt-4 flex gap-2">
              <Button>save role</Button>
              <Button variant="secondary">full role ↗</Button>
            </div>
          </div>
        </div>

        <p className="max-w-md text-text-secondary">
          Phase 0.2 skeleton — design tokens, light default with dark{" "}
          <span className="marker-amber">pulse</span> toggle, Inter +{" "}
          <span className="font-mono">JetBrains Mono</span> wired. The deck
          arrives in Phase 1.
        </p>
      </main>
    </div>
  );
}
