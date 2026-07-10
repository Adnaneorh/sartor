import * as Sentry from "@sentry/nextjs";

// Server-side error monitoring (ROADMAP 1.1). No-ops when SENTRY_DSN is
// absent, so local dev and CI need no account. Server-side ONLY for now:
// a browser-side DSN would need NEXT_PUBLIC_SENTRY_DSN, which the
// CLAUDE.md key inventory does not (yet) allow client-side — flagged for
// an explicit spec decision.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
});
