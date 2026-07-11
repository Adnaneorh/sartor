// Client-supplied redirect targets (?next=) must never leave our origin.
// Every handler that redirects to a query-param destination routes it
// through here — including the OAuth callback when Google lands (the
// ROADMAP 1.1 follow-up is gated on exactly that).
//
// Only a same-origin absolute path survives:
//   - must start with exactly ONE "/" — "//host" is protocol-relative
//   - no "\" and no C0 control chars: the WHATWG URL parser maps "\" to
//     "/" and strips tab/CR/LF before parsing, so a backslash or an
//     embedded tab could re-open the "//host" hole after the
//     single-slash check passed
// Anything else (absolute URLs, junk, empty) falls back.
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/home"
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  for (let i = 0; i < next.length; i++) {
    if (next.charCodeAt(i) < 0x20) return fallback;
  }
  return next;
}
