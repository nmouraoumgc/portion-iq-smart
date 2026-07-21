import { getDb } from '../database/db';
import {
  Member,
  MemberRow,
  FoodItem,
  FoodCategory,
  MealSession,
  MealFeedback,
  RecommendationRequest,
  PortionResult,
  GuestProfile,
  MealType,
} from '../models/types';
import {
  PersonInput,
  buildPersonInput,
  buildPersonInputFromGuest,
  calculatePortion,
} from './portionEngine';
import { v4 as uuidv4 } from 'uuid';

function rowToMember(row: MemberRow): Member {
  return {
    ...row,
    dietary_prefs:       JSON.parse(row.dietary_prefs || '[]'),
    allergies:           JSON.parse(row.allergies || '[]'),
    medical_restrictions: JSON.parse(row.medical_restrictions || '[]'),
    is_vegetarian: !!row.is_vegetarian,
    is_vegan:      !!row.is_vegan,
    is_pregnant:   !!row.is_pregnant,
    is_athlete:    !!row.is_athlete,
    is_elderly:    !!row.is_elderly,
  };
}

/** Load per-member history adjustment factor from past feedback */
function getHistoryAdjustment(memberId: string, foodItemId: string): number {
  const db = getDb();
  // Get the last 10 sessions for this member + food and their feedback
  const rows = db.prepare(`
    SELECT ms.recommended_edible_g, mf.actual_consumed_g
    FROM meal_sessions ms
    JOIN meal_feedback mf ON mf.session_id = ms.id
    JOIN member_history mh ON mh.session_id = ms.id
    WHERE mh.member_id = ? AND ms.food_item_id = ?
      AND mf.actual_consumed_g IS NOT NULL
    ORDER BY ms.created_at DESC
    LIMIT 10
  `).all(memberId, foodItemId) as Array<{ recommended_edible_g: number; actual_consumed_g: number }>;

  if (rows.length < 2) return 1.0;

  // Calculate average ratio of actual vs recommended per person
  // (actual_consumed / persons)
  const ratios = rows
    .filter(r => r.recommended_edible_g > 0 && r.actual_consumed_g > 0)
    .map(r => r.actual_consumed_g / r.recommended_edible_g);

  if (ratios.length === 0) return 1.0;

  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // Clamp between 0.7 and 1.5 to avoid extreme adjustments
  return Math.min(1.5, Math.max(0.7, avg));
}

/** Get household-level adjustment factor */
function getHouseholdHistoryAdjustment(householdId: string, foodItemId: string): number {
  const db = getDb();
  const rows = db.prepare(`
    SELECT ms.recommended_edible_g, mf.actual_consumed_g
    FROM meal_sessions ms
    JOIN meal_feedback mf ON mf.session_id = ms.id
    WHERE ms.household_id = ? AND ms.food_item_id = ?
      AND mf.actual_consumed_g IS NOT NULL
    ORDER BY ms.created_at DESC
    LIMIT 10
  `).all(householdId, foodItemId) as Array<{ recommended_edible_g: number; actual_consumed_g: number }>;

  if (rows.length < 2) return 1.0;

  const ratios = rows
    .filter(r => r.recommended_edible_g > 0 && r.actual_consumed_g > 0)
    .map(r => r.actual_consumed_g / r.recommended_edible_g);

  if (ratios.length === 0) return 1.0;

  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.min(1.5, Math.max(0.7, avg));
}

export function getRecommendation(req: RecommendationRequest): PortionResult {
  const db = getDb();

  // Load food item and category
  const food = db.prepare('SELECT * FROM food_items WHERE id = ?').get(req.food_item_id) as FoodItem | undefined;
  if (!food) throw new Error(`Food item not found: ${req.food_item_id}`);

  const category = db.prepare('SELECT * FROM food_categories WHERE id = ?').get(food.category_id) as FoodCategory | undefined;
  if (!category) throw new Error(`Category not found: ${food.category_id}`);

  // Build person inputs
  const persons: PersonInput[] = [];
  let hasHistory = false;

  // Household members
  for (const memberId of req.member_ids) {
    const row = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as MemberRow | undefined;
    if (!row) continue;
    const member = rowToMember(row);
    const input = buildPersonInput(member);

    // Apply history-based adjustment
    const adj = getHistoryAdjustment(memberId, req.food_item_id);
    if (adj !== 1.0) hasHistory = true;
    input.history_adjustment = adj;

    persons.push(input);
  }

  // Apply household-level adjustment if available
  if (req.household_id && req.member_ids.length > 0) {
    const householdAdj = getHouseholdHistoryAdjustment(req.household_id, req.food_item_id);
    if (householdAdj !== 1.0) {
      hasHistory = true;
      // Blend household adjustment with any per-member adjustments
      for (const p of persons) {
        p.history_adjustment = (p.history_adjustment + householdAdj) / 2;
      }
    }
  }

  // Guest profiles (anonymous eaters added for this meal)
  if (req.guest_profiles) {
    for (let i = 0; i < req.guest_profiles.length; i++) {
      persons.push(buildPersonInputFromGuest(req.guest_profiles[i], i));
    }
  }

  if (persons.length === 0) {
    throw new Error('At least one person must be provided for a recommendation.');
  }

  return calculatePortion(persons, food, category, req.meal_type, hasHistory);
}

export function saveMealSession(
  req: RecommendationRequest,
  result: PortionResult,
): MealSession {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO meal_sessions
      (id, household_id, meal_type, food_item_id, member_ids, guest_count,
       recommended_edible_g, recommended_purchase_g, practical_recommendation,
       practical_amount, practical_unit, confidence_pct, expected_leftover_g, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.household_id ?? null,
    req.meal_type,
    req.food_item_id,
    JSON.stringify(req.member_ids),
    req.guest_profiles?.length ?? 0,
    result.total_edible_g,
    result.total_purchase_g,
    result.practical_recommendation,
    result.practical_amount,
    result.practical_unit,
    result.confidence_pct,
    result.expected_leftover_g,
    now,
  );

  // Record individual member history
  for (const p of result.per_person_breakdown) {
    if (p.member_id) {
      db.prepare(`
        INSERT INTO member_history (id, member_id, food_item_id, actual_consumed_g, session_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), p.member_id, req.food_item_id, p.edible_g, id, now);
    }
  }

  return db.prepare('SELECT * FROM meal_sessions WHERE id = ?').get(id) as MealSession;
}

export function saveFeedback(
  sessionId: string,
  data: {
    satisfaction?: string;
    leftover_level?: string;
    hunger_after?: string;
    actual_consumed_g?: number;
  },
): MealFeedback {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Check session exists
  const session = db.prepare('SELECT * FROM meal_sessions WHERE id = ?').get(sessionId) as MealSession | undefined;
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  db.prepare(`
    INSERT INTO meal_feedback (id, session_id, satisfaction, leftover_level, hunger_after, actual_consumed_g, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessionId,
    data.satisfaction ?? null,
    data.leftover_level ?? null,
    data.hunger_after ?? null,
    data.actual_consumed_g ?? null,
    now,
  );

  // Update member history with actual consumed data if provided
  if (data.actual_consumed_g && session.member_ids) {
    const memberIds: string[] = typeof session.member_ids === 'string'
      ? JSON.parse(session.member_ids)
      : session.member_ids;

    if (memberIds.length > 0) {
      const perPersonConsumed = data.actual_consumed_g / memberIds.length;
      for (const memberId of memberIds) {
        db.prepare(`
          UPDATE member_history SET actual_consumed_g = ?
          WHERE member_id = ? AND session_id = ?
        `).run(perPersonConsumed, memberId, sessionId);
      }
    }
  }

  return db.prepare('SELECT * FROM meal_feedback WHERE id = ?').get(id) as MealFeedback;
}

export function getHouseholds() {
  const db = getDb();
  return db.prepare('SELECT * FROM households ORDER BY created_at DESC').all();
}

export function getHousehold(id: string) {
  const db = getDb();
  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(id);
  if (!household) throw new Error(`Household not found: ${id}`);
  const members = db.prepare('SELECT * FROM members WHERE household_id = ? ORDER BY name').all(id) as MemberRow[];
  return { household, members: members.map(rowToMember) };
}

export function createHousehold(name: string) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO households (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
  return db.prepare('SELECT * FROM households WHERE id = ?').get(id);
}

export function updateHousehold(id: string, name: string) {
  const db = getDb();
  db.prepare('UPDATE households SET name = ?, updated_at = ? WHERE id = ?').run(name, new Date().toISOString(), id);
  return db.prepare('SELECT * FROM households WHERE id = ?').get(id);
}

export function deleteHousehold(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM households WHERE id = ?').run(id);
}

export function createMember(householdId: string, data: Partial<Member>) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO members
      (id, household_id, name, age, gender, height_cm, weight_kg, activity_level, appetite_level,
       dietary_prefs, allergies, medical_restrictions, is_vegetarian, is_vegan,
       is_pregnant, is_athlete, is_elderly, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, householdId, data.name ?? 'Unknown',
    data.age ?? null, data.gender ?? null,
    data.height_cm ?? null, data.weight_kg ?? null,
    data.activity_level ?? 'moderate',
    data.appetite_level ?? 'normal',
    JSON.stringify(data.dietary_prefs ?? []),
    JSON.stringify(data.allergies ?? []),
    JSON.stringify(data.medical_restrictions ?? []),
    data.is_vegetarian ? 1 : 0,
    data.is_vegan ? 1 : 0,
    data.is_pregnant ? 1 : 0,
    data.is_athlete ? 1 : 0,
    data.is_elderly ? 1 : 0,
    now, now,
  );
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow;
  return rowToMember(row);
}

export function updateMember(id: string, data: Partial<Member>) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE members SET
      name = COALESCE(?, name),
      age = ?,
      gender = ?,
      height_cm = ?,
      weight_kg = ?,
      activity_level = COALESCE(?, activity_level),
      appetite_level = COALESCE(?, appetite_level),
      dietary_prefs = COALESCE(?, dietary_prefs),
      allergies = COALESCE(?, allergies),
      medical_restrictions = COALESCE(?, medical_restrictions),
      is_vegetarian = COALESCE(?, is_vegetarian),
      is_vegan = COALESCE(?, is_vegan),
      is_pregnant = COALESCE(?, is_pregnant),
      is_athlete = COALESCE(?, is_athlete),
      is_elderly = COALESCE(?, is_elderly),
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? null,
    data.age ?? null,
    data.gender ?? null,
    data.height_cm ?? null,
    data.weight_kg ?? null,
    data.activity_level ?? null,
    data.appetite_level ?? null,
    data.dietary_prefs ? JSON.stringify(data.dietary_prefs) : null,
    data.allergies ? JSON.stringify(data.allergies) : null,
    data.medical_restrictions ? JSON.stringify(data.medical_restrictions) : null,
    data.is_vegetarian !== undefined ? (data.is_vegetarian ? 1 : 0) : null,
    data.is_vegan !== undefined ? (data.is_vegan ? 1 : 0) : null,
    data.is_pregnant !== undefined ? (data.is_pregnant ? 1 : 0) : null,
    data.is_athlete !== undefined ? (data.is_athlete ? 1 : 0) : null,
    data.is_elderly !== undefined ? (data.is_elderly ? 1 : 0) : null,
    now, id,
  );
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow;
  return rowToMember(row);
}

export function deleteMember(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
}

export function getFoodCategories() {
  const db = getDb();
  return db.prepare('SELECT * FROM food_categories ORDER BY name').all();
}

export function getFoodItems(categoryId?: string) {
  const db = getDb();
  if (categoryId) {
    return db.prepare('SELECT * FROM food_items WHERE category_id = ? ORDER BY name').all(categoryId);
  }
  return db.prepare('SELECT * FROM food_items ORDER BY name').all();
}

export function searchFoodItems(query: string) {
  const db = getDb();
  const pattern = `%${query.toLowerCase()}%`;
  return db.prepare(
    'SELECT fi.*, fc.name as category_name, fc.icon as category_icon FROM food_items fi ' +
    'JOIN food_categories fc ON fc.id = fi.category_id ' +
    'WHERE LOWER(fi.name) LIKE ? ORDER BY fi.name LIMIT 20'
  ).all(pattern);
}

export function getMealSessions(householdId?: string, limit = 20) {
  const db = getDb();
  if (householdId) {
    return db.prepare(
      'SELECT * FROM meal_sessions WHERE household_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(householdId, limit);
  }
  return db.prepare('SELECT * FROM meal_sessions ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function getMealSession(id: string) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM meal_sessions WHERE id = ?').get(id);
  if (!session) throw new Error(`Session not found: ${id}`);
  const feedback = db.prepare('SELECT * FROM meal_feedback WHERE session_id = ?').get(id);
  return { session, feedback };
}
