import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[cup-and-co api] listening on http://localhost:${config.port}`);
  console.log(`[cup-and-co api] env: ${config.nodeEnv}`);
});
