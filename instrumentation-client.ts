import * as Sentry from "@sentry/nextjs";

// Browser-side error capture — approved spec amendment 2026-07-10:
// NEXT_PUBLIC_SENTRY_DSN joins the Supabase anon key as the only
// client-exposed vars (DSNs are publishable ingest keys, not secrets).
// No-ops when the DSN is absent.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
