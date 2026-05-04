import { Router } from 'express';
import { getCatalog, getProductDetail } from '../db/catalogRepo.js';
import { adminOffers } from '../db/offersStore.js';

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

  return router;
}
