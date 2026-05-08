import { Router } from 'express';
import { getCatalog, getProductDetail } from '../db/catalogRepo.js';
import { getProductStock } from '../db/productStockRepo.js';
import { adminOffers } from '../db/offersStore.js';
import { match, type Language } from '../services/concierge.js';
import { recordSuggestion } from '../services/conciergeMetrics.js';
import { isFeatured } from '../db/featuredProductsStore.js';
import { defaultsForProduct } from '../db/productPairsStore.js';

export function catalogRouter(): Router {
  const router = Router();

  router.get('/catalog', async (req, res, next) => {
    try {
      const catalog = await getCatalog();
      // Merge admin-managed offers, filtering out expired ones
      const now = new Date().toISOString();
      const activeAdmin = adminOffers.filter(
        (o) => o.starts_at <= now && o.ends_at >= now,
      );
      catalog.offers = [...catalog.offers, ...activeAdmin];

      const q = (req.query.q as string | undefined)?.trim().toLowerCase();
      if (q) {
        catalog.products = catalog.products.filter(
          (p) =>
            p.name_en.toLowerCase().includes(q) ||
            p.name_ar.includes(q) ||
            (p.description_en?.toLowerCase().includes(q) ?? false),
        );
      }

      // Phase 3.2: merge stock state onto each product so the customer-web
      // catalog can render an out-of-stock pill without a second roundtrip.
      // Phase K4.7: also merge the admin's "feature today" flag so the
      // kiosk can render a hero card without a second request.
      catalog.products = catalog.products.map((p) => {
        const stock = getProductStock(p.id);
        return {
          ...p,
          is_out_of_stock: stock.is_out_of_stock,
          out_of_stock_until: stock.out_of_stock_until,
          is_featured_today: isFeatured(p.id),
        };
      });

      // Phase K4.9: layer "complete the combo" pairings. Computed AFTER
      // the stock/feature merge so the candidate list passed to
      // defaultsForProduct already reflects today's availability — pairs
      // never reference an out-of-stock or unavailable product.
      const candidates = catalog.products.map((p) => ({
        id: p.id,
        name_en: p.name_en,
        is_available: p.is_available && !p.is_out_of_stock,
      }));
      const categoryById = new Map(catalog.categories.map((c) => [c.id, c.slug]));
      catalog.products = catalog.products.map((p) => ({
        ...p,
        pairs_well_with: defaultsForProduct(
          p.id,
          categoryById.get(p.category_id) ?? null,
          candidates,
        ),
      }));

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
      // Phase 3.2: surface stock state.
      const stock = getProductStock(detail.product.id);
      detail.product = {
        ...detail.product,
        is_out_of_stock: stock.is_out_of_stock,
        out_of_stock_until: stock.out_of_stock_until,
      };
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

      // Record the call for the admin analytics tile. Synchronous and free —
      // just appends to an in-memory ring buffer.
      recordSuggestion({ query, language, result });

      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}
