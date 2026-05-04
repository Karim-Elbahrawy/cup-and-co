import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
app.listen(config.port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[cup-and-co api] listening on http://0.0.0.0:${config.port}`);
  console.log(`[cup-and-co api] env: ${config.nodeEnv}`);
});
