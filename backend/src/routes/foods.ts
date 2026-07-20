import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import {
  getFoodCategories,
  getFoodItems,
} from '../services/recommendationService';

const router = Router();

// GET /foods/categories
router.get('/categories', (_req: Request, res: Response) => {
  try {
    res.json(getFoodCategories());
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /foods/items?category=cat_poultry
router.get(
  '/items',
  query('category').optional().isString(),
  (req: Request, res: Response) => {
    try {
      const categoryId = typeof req.query.category === 'string' ? req.query.category : undefined;
      res.json(getFoodItems(categoryId));
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

export default router;
