import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  getHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
  deleteHousehold,
  createMember,
  updateMember,
  deleteMember,
} from '../services/recommendationService';

const router = Router();

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// GET /households
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(getHouseholds());
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /households/:id
router.get('/:id', param('id').isString(), (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    res.json(getHousehold(req.params.id));
  } catch (e: unknown) {
    res.status(404).json({ error: (e as Error).message });
  }
});

// POST /households
router.post(
  '/',
  body('name').isString().trim().notEmpty(),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      res.status(201).json(createHousehold(req.body.name));
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

// PUT /households/:id
router.put(
  '/:id',
  param('id').isString(),
  body('name').isString().trim().notEmpty(),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      res.json(updateHousehold(req.params.id, req.body.name));
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

// DELETE /households/:id
router.delete('/:id', param('id').isString(), (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    deleteHousehold(req.params.id);
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /households/:id/members
router.post(
  '/:id/members',
  param('id').isString(),
  body('name').isString().trim().notEmpty(),
  body('age').optional().isInt({ min: 0, max: 120 }),
  body('weight_kg').optional().isFloat({ min: 1, max: 500 }),
  body('height_cm').optional().isFloat({ min: 30, max: 300 }),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      res.status(201).json(createMember(req.params.id, req.body));
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

// PUT /households/:householdId/members/:memberId
router.put(
  '/:householdId/members/:memberId',
  param('memberId').isString(),
  body('age').optional().isInt({ min: 0, max: 120 }),
  body('weight_kg').optional().isFloat({ min: 1, max: 500 }),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      res.json(updateMember(req.params.memberId, req.body));
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

// DELETE /households/:householdId/members/:memberId
router.delete(
  '/:householdId/members/:memberId',
  param('memberId').isString(),
  (req: Request, res: Response) => {
    if (!handleValidation(req, res)) return;
    try {
      deleteMember(req.params.memberId);
      res.status(204).send();
    } catch (e: unknown) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

export default router;
