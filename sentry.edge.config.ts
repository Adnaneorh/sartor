import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware) — same DSN, same no-op-without-DSN behavior.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
});
