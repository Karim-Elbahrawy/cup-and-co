// Sentry instrumentation MUST load before any other module so it can patch
// Node's require graph for auto-instrumentation. Do not move this import.
import './instrument.js';

import { createApp } from './app.js';
import { config } from './config.js';
import { shutdownAnalytics } from './services/analytics.js';

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[cup-and-co api] listening on http://0.0.0.0:${config.port}`);
  console.log(`[cup-and-co api] env: ${config.nodeEnv}`);
});

// Graceful shutdown — flush in-flight analytics events before the process
// exits. Hosts (Render, Railway) send SIGTERM with ~30s grace; that's plenty.
async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[cup-and-co api] received ${signal}, shutting down`);
  await shutdownAnalytics();
  server.close(() => {
    process.exit(0);
  });
  // Force-exit if close() hangs more than 10s.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
