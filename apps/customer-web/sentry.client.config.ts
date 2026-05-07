/**
 * Sentry client-side init — runs in the browser.
 *
 * Phase 1.1 of docs/UPGRADE-PLAN.md. PII-scrubbed by default;
 * session replay disabled (privacy + cost).
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Performance monitoring at 10% sample rate. Tune via env if needed.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

    // Session replay is intentionally OFF. We deal with phone numbers and
    // payment data — recording sessions creates an exfiltration target.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Don't transmit IP addresses, cookies, or user-agent details by default.
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip user PII (we set user.id only — never phone/email)
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      // Strip Authorization header from any captured request
      if (event.request?.headers && typeof event.request.headers === 'object') {
        const headers = event.request.headers as Record<string, string>;
        delete headers.authorization;
        delete headers.Authorization;
        delete headers.cookie;
        delete headers.Cookie;
      }
      // Scrub JWT-like patterns from breadcrumb messages
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.message) {
            crumb.message = crumb.message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]');
          }
        }
      }
      return event;
    },
  });
}
