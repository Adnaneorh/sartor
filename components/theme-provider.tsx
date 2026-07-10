"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// DESIGN.md: light is the DEFAULT theme (not system-following); dark
// "pulse" is available by toggle. class attribute + next-themes' inline
// script = no flash on load.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
