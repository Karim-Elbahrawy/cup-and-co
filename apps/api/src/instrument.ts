/**
 * Sentry instrumentation — MUST be imported as the FIRST line of server.ts,
 * before any other module (including express).
 *
 * In Sentry SDK v8, the auto-instrumentation hook installs by patching
 * Node's `require` graph at init time. Anything imported before
 * `Sentry.init()` will not be traced. Keep this file's import position
 * sacred — do not "tidy" it into the import block at the top of server.ts.
 *
 * If `SENTRY_DSN` is unset (local dev without an account), Sentry becomes a
 * no-op and the rest of the app runs normally. No-op is the intended default
 * for development; production deployments should always provide a DSN.
 *
 * Configured for Phase 1.1 of docs/UPGRADE-PLAN.md.
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV ?? 'development';
const release = process.env.GIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring: 10% of transactions are sampled. Tune via
    // SENTRY_TRACES_SAMPLE_RATE env var when load increases or shrinks.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

    // PII scrubbing: strip phone, email, and Authorization headers from
    // every event before it leaves the process. The defaults are safer
    // than relying on Sentry's server-side scrubbers because we never
    // transmit the data in the first place.
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip user PII (we set user.id only — never phone/email)
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      // Strip Authorization header
      if (event.request?.headers && typeof event.request.headers === 'object') {
        const headers = event.request.headers as Record<string, string>;
        delete headers.authorization;
        delete headers.Authorization;
        delete headers.cookie;
        delete headers.Cookie;
      }
      // Strip JWT-like patterns from breadcrumbs
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
