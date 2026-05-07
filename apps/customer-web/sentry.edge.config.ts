/**
 * Sentry edge-runtime init — runs in middleware and edge route handlers.
 *
 * The edge runtime is more restricted than Node, so we only enable basic
 * error capture (no performance/profiling integrations available).
 *
 * Phase 1.1 of docs/UPGRADE-PLAN.md.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

    sendDefaultPii: false,

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
