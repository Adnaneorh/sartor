import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Auth screens: centered card on an offset mint tint panel (Mockup D).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="hairline-b bg-surface">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-medium tracking-tight text-ink">
            sartor<span className="text-primary">.</span>
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-card bg-mint-tint"
          />
          <div className="hairline relative rounded-card bg-card p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
