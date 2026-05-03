import { Router } from 'express';
import { getCatalog, getProductDetail } from '../db/catalogRepo.js';

export function catalogRouter(): Router {
  const router = Router();

  router.get('/catalog', async (_req, res, next) => {
    try {
      const catalog = await getCatalog();
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
