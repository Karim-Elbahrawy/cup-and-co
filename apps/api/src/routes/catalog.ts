import { Router } from 'express';
import { getCatalog, getProductDetail } from '../db/catalogRepo.js';
import { adminOffers } from '../db/offersStore.js';

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

  return router;
}
