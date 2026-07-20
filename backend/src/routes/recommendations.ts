import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  getRecommendation,
  saveMealSession,
  getMealSessions,
  getMealSession,
  saveFeedback,
} from '../services/recommendationService';
import { RecommendationRequest } from '../models/types';

const router = Router();

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

const VALID_MEAL_TYPES = [
  'lunch','dinner','snack','breakfast','party','bbq','birthday',
  'christmas','easter','picnic','office_lunch','wedding','family_gathering',
];

// POST /recommendations
// Body: { household_id?, member_ids, guest_profiles?, food_item_id, meal_type }
router.post(
  '/',
  body('food_item_id').isString().notEmpty(),
  body('meal_type').isIn(VALID_MEAL_TYPES),
  body('member_ids').isArray(),
  body('member_ids.*').isString(),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      const reqData: RecommendationRequest = {
        household_id: req.body.household_id,
        member_ids: req.body.member_ids ?? [],
        guest_profiles: req.body.guest_profiles,
        food_item_id: req.body.food_item_id,
        meal_type: req.body.meal_type,
      };
      const result = getRecommendation(reqData);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

// POST /recommendations/save
// Save a meal session after getting a recommendation
router.post(
  '/save',
  body('food_item_id').isString().notEmpty(),
  body('meal_type').isIn(VALID_MEAL_TYPES),
  body('member_ids').isArray(),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      const reqData: RecommendationRequest = {
        household_id: req.body.household_id,
        member_ids: req.body.member_ids ?? [],
        guest_profiles: req.body.guest_profiles,
        food_item_id: req.body.food_item_id,
        meal_type: req.body.meal_type,
      };
      const result = getRecommendation(reqData);
      const session = saveMealSession(reqData, result);
      res.status(201).json({ session, recommendation: result });
    } catch (e: unknown) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

// GET /recommendations/sessions?household_id=...
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const householdId = typeof req.query.household_id === 'string' ? req.query.household_id : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20;
    res.json(getMealSessions(householdId, limit));
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /recommendations/sessions/:id
router.get('/sessions/:id', param('id').isString(), (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    res.json(getMealSession(req.params.id));
  } catch (e: unknown) {
    res.status(404).json({ error: (e as Error).message });
  }
});

// POST /recommendations/sessions/:id/feedback
router.post(
  '/sessions/:id/feedback',
  param('id').isString(),
  body('satisfaction').optional().isIn(['not_enough','just_right','too_much']),
  body('leftover_level').optional().isIn(['none','little','moderate','lots']),
  body('hunger_after').optional().isIn(['still_hungry','satisfied','overfull']),
  body('actual_consumed_g').optional().isFloat({ min: 0 }),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      const feedback = saveFeedback(req.params.id, req.body);
      res.status(201).json(feedback);
    } catch (e: unknown) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

export default router;
