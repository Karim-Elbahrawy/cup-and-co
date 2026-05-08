import { Router } from 'express';
import { getCatalog, getProductDetail } from '../db/catalogRepo.js';
import { adminOffers } from '../db/offersStore.js';
import { match, type Language } from '../services/concierge.js';

export function catalogRouter(): Router {
  const router = Router();

  router.get('/catalog', async (_req, res, next) => {
    try {
      const catalog = await getCatalog();
      // Merge admin-managed offers, filtering out expired ones
      const now = new Date().toISOString();
      const activeAdmin = adminOffers.filter(
        (o) => o.starts_at <= now && o.ends_at >= now,
      );
      catalog.offers = [...catalog.offers, ...activeAdmin];
      res.json(catalog);
    } catch (e) { next(e); }
  });

  router.get('/products/:id', async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const detail = await getProductDetail(req.params.id, userId);
      if (!detail) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json(detail);
    } catch (e) { next(e); }
  });

  /**
   * Cup AI Concierge — "describe what you want" endpoint.
   * Public (no auth) so guests can experiment before signing in.
   * Pure rule-based matching against the live catalogue; zero external calls.
   */
  router.post('/catalog/suggest', async (req, res, next) => {
    try {
      const body = req.body as { query?: unknown; language?: unknown; limit?: unknown };
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const language: Language = body.language === 'ar' ? 'ar' : 'en';
      const limit = typeof body.limit === 'number' && body.limit > 0 && body.limit <= 10
        ? Math.floor(body.limit)
        : 3;

      if (query.length < 2) {
        res.status(400).json({ error: 'Query is too short.' });
        return;
      }
      if (query.length > 500) {
        res.status(400).json({ error: 'Query is too long.' });
        return;
      }

      const catalog = await getCatalog();
      const categorySlugById: Record<string, string> = {};
      for (const cat of catalog.categories) categorySlugById[cat.id] = cat.slug;

      const result = match(
        { text: query, language },
        { products: catalog.products, categorySlugById, limit },
      );

      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}
