/**
 * Next.js instrumentation hook — Next 15 calls this once at server startup
 * to register OpenTelemetry / Sentry instrumentation.
 *
 * Dispatches to the appropriate Sentry config based on the runtime
 * (server-side Node, edge runtime, or client — though client is loaded
 * via the bundler, not here).
 *
 * Phase 1.1 of docs/UPGRADE-PLAN.md.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Re-export Sentry's request error handler so Next.js can call it on
// uncaught route-handler errors (Next 15 convention).
export { captureRequestError } from '@sentry/nextjs';
