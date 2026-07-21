/**
 * PortionIQ Smart Portion Calculation Engine
 *
 * Methodology:
 * 1. Calculate each person's recommended edible portion in grams
 * 2. Sum all edible portions
 * 3. Apply edible yield factor to get purchase weight
 * 4. Generate practical shopping recommendation
 *
 * Scientific basis:
 * - Metabolic scaling: weight^0.75 (Kleiber's law approximation for energy needs)
 * - Age-based adjustments from dietary reference intakes (DRIs)
 * - Activity multipliers from WHO/FAO physical activity levels
 * - Gender differences from USDA dietary guidelines
 */

import {
  Member,
  FoodItem,
  FoodCategory,
  GuestProfile,
  PortionResult,
  PerPersonPortion,
  PortionFactors,
  MealType,
  AppetiteLevel,
  ActivityLevel,
} from '../models/types';

// ─────────────────────────────────────────────
// Factor tables
// ─────────────────────────────────────────────

/** Age-based multiplier relative to a healthy adult (18-50) */
function ageFactor(age: number | null): number {
  if (age === null) return 1.0;
  if (age < 2)  return 0.25;
  if (age < 5)  return 0.35;
  if (age < 8)  return 0.45;
  if (age < 11) return 0.55;
  if (age < 14) return 0.70;
  if (age < 18) return 0.85;
  if (age < 65) return 1.00;
  if (age < 75) return 0.90;
  return 0.80;
}

/** Weight-based metabolic scaling relative to reference adult (75 kg) */
function weightFactor(weight_kg: number | null): number {
  if (weight_kg === null) return 1.0;
  const REFERENCE_WEIGHT = 75;
  return Math.pow(weight_kg / REFERENCE_WEIGHT, 0.75);
}

/** Gender factor */
function genderFactor(gender: string | null): number {
  if (gender === 'male')   return 1.08;
  if (gender === 'female') return 0.92;
  return 1.0;
}

/** Appetite multiplier */
const APPETITE_MULTIPLIER: Record<AppetiteLevel, number> = {
  very_small: 0.60,
  small:      0.80,
  normal:     1.00,
  big:        1.25,
  very_big:   1.50,
};

/** Activity factor */
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary:   0.88,
  light:       0.94,
  moderate:    1.00,
  active:      1.12,
  very_active: 1.25,
};

/** Context modifier — parties mean smaller portions; BBQ means bigger */
const CONTEXT_FACTOR: Record<MealType, number> = {
  lunch:             1.00,
  dinner:            1.05,
  snack:             0.55,
  breakfast:         0.70,
  party:             0.85,
  bbq:               1.20,
  birthday:          0.90,
  christmas:         1.10,
  easter:            1.05,
  picnic:            0.90,
  office_lunch:      0.85,
  wedding:           0.80,
  family_gathering:  1.00,
};

// ─────────────────────────────────────────────
// Base serving sizes per food category (edible grams)
// These are the reference adult portion sizes
// ─────────────────────────────────────────────
const CATEGORY_BASE_SERVING: Record<string, number> = {
  cat_poultry:      200,
  cat_beef:         220,
  cat_pork:         200,
  cat_lamb:         200,
  cat_fish:         180,
  cat_seafood:      180,
  cat_pizza:        300,   // ~2.5 slices
  cat_sushi:        300,   // ~10–12 pieces
  cat_pasta:        150,   // dry weight
  cat_rice:         80,    // dry weight
  cat_salad:        120,
  cat_desserts:     120,
  cat_bread:        80,
  cat_cheese:       60,
  cat_charcuterie:  80,
  cat_finger:       200,
  cat_burgers:      1,     // whole burger — unit-based
  cat_sandwiches:   1,     // whole item — unit-based
};

// ─────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────

export interface PersonInput {
  id: string | null;
  name: string;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  appetite_level: AppetiteLevel;
  activity_level: ActivityLevel;
  is_pregnant: boolean;
  is_athlete: boolean;
  history_adjustment: number; // 1.0 = no historical adjustment
}

export function buildPersonInput(member: Member): PersonInput {
  return {
    id: member.id,
    name: member.name,
    age: member.age,
    gender: member.gender,
    weight_kg: member.weight_kg,
    appetite_level: member.appetite_level,
    activity_level: member.activity_level,
    is_pregnant: member.is_pregnant,
    is_athlete: member.is_athlete,
    history_adjustment: 1.0,
  };
}

export function buildPersonInputFromGuest(guest: GuestProfile, index: number): PersonInput {
  return {
    id: null,
    name: guest.name ?? `Guest ${index + 1}`,
    age: guest.age ?? null,
    gender: guest.gender ?? null,
    weight_kg: guest.weight_kg ?? null,
    appetite_level: guest.appetite_level ?? 'normal',
    activity_level: guest.activity_level ?? 'moderate',
    is_pregnant: false,
    is_athlete: false,
    history_adjustment: 1.0,
  };
}

/**
 * Calculate edible portion (grams) for a single person.
 */
export function calcPersonEdiblePortion(
  person: PersonInput,
  food: FoodItem,
  mealType: MealType,
): { edible_g: number; factors: PortionFactors } {
  // Use food-level base serving if set, else fall back to category default
  const base = food.base_serving_g > 0
    ? food.base_serving_g
    : (CATEGORY_BASE_SERVING[food.category_id] ?? 200);

  const af  = ageFactor(person.age);
  const wf  = weightFactor(person.weight_kg);
  const gf  = genderFactor(person.gender);
  const am  = APPETITE_MULTIPLIER[person.appetite_level] ?? 1.0;
  const acf = ACTIVITY_FACTOR[person.activity_level] ?? 1.0;
  const cf  = CONTEXT_FACTOR[mealType] ?? 1.0;
  const ha  = person.history_adjustment ?? 1.0;

  // Pregnancy increases needs ~10%
  const pregnancyBonus = person.is_pregnant ? 1.10 : 1.0;
  // Athlete bonus ~15%
  const athleteBonus = person.is_athlete ? 1.15 : 1.0;

  const edible_g =
    base * af * wf * gf * am * acf * cf * ha * pregnancyBonus * athleteBonus;

  return {
    edible_g: Math.round(edible_g),
    factors: {
      base_serving_g: base,
      age_factor: af,
      weight_factor: wf,
      gender_factor: gf,
      appetite_multiplier: am,
      activity_factor: acf,
      context_factor: cf,
      history_adjustment: ha,
    },
  };
}

/**
 * Convert edible grams to purchase weight accounting for
 * bones, shells, cooking loss, and general waste.
 */
export function edibleToPurchaseWeight(edible_g: number, food: FoodItem): number {
  // Total non-edible fraction: bone + shell + cooking loss + waste
  const non_edible_factor =
    (food.bone_pct + food.shell_pct + food.cooking_loss_pct + food.waste_pct) / 100;

  // Edible yield after cooking losses: edible_yield_pct already accounts for structural waste
  const yield_fraction = food.edible_yield_pct / 100;

  // Purchase weight = edible_g / (edible_yield_pct/100)
  // This converts "how much edible meat I need" → "how much raw product to buy"
  if (yield_fraction <= 0) return edible_g;
  const purchase_g = edible_g / yield_fraction;

  // Add a small buffer for the waste_pct that isn't captured in yield
  return purchase_g * (1 + food.waste_pct / 100);
}

/**
 * Generate a human-friendly practical recommendation string.
 */
export function generatePracticalRecommendation(
  total_purchase_g: number,
  food: FoodItem,
): { text: string; amount: number | null; unit: string | null } {
  const unitType = food.unit_type;

  if (unitType === 'weight') {
    // Round to nearest 50g for values < 1kg, nearest 100g for larger
    const rounded = total_purchase_g < 1000
      ? Math.ceil(total_purchase_g / 50) * 50
      : Math.ceil(total_purchase_g / 100) * 100;
    const display = rounded >= 1000
      ? `${(rounded / 1000).toFixed(1).replace(/\.0$/, '')} kg`
      : `${rounded} g`;
    return {
      text: `Buy about ${display} of ${food.name}`,
      amount: rounded,
      unit: rounded >= 1000 ? 'kg' : 'g',
    };
  }

  if (unitType === 'pieces' && food.practical_unit_weight_g) {
    const pieces = Math.ceil(total_purchase_g / food.practical_unit_weight_g);
    const unit = food.practical_unit ?? 'piece';
    const plural = pieces !== 1 ? `${unit}s` : unit;
    return {
      text: `Buy ${pieces} ${plural} of ${food.name}`,
      amount: pieces,
      unit: unit,
    };
  }

  if (unitType === 'slices' && food.practical_unit_weight_g) {
    // For pizza: calculate number of whole pizzas
    const sliceWeight = food.practical_unit_weight_g / 8; // assume 8 slices
    const slices = Math.ceil(total_purchase_g / sliceWeight);
    const pizzas = Math.ceil(slices / 8);
    return {
      text: `Buy ${pizzas} ${pizzas === 1 ? 'pizza' : 'pizzas'} (≈${slices} slices)`,
      amount: pizzas,
      unit: food.practical_unit ?? 'pizza',
    };
  }

  if (unitType === 'whole' && food.practical_unit_weight_g) {
    const count = Math.ceil(total_purchase_g / food.practical_unit_weight_g);
    const unit = food.practical_unit ?? 'unit';
    const plural = count !== 1 ? `${unit}s` : unit;
    // Handle non-integer suggestions
    const exact = total_purchase_g / food.practical_unit_weight_g;
    if (exact <= count - 0.15) {
      // Fractional recommendation — suggest mixed sizes if available
      return {
        text: `Buy ${count - 1} large + 1 small ${unit} of ${food.name}`,
        amount: count,
        unit: unit,
      };
    }
    return {
      text: `Buy ${count} ${plural} of ${food.name}`,
      amount: count,
      unit: unit,
    };
  }

  // Fallback
  const kg = (total_purchase_g / 1000).toFixed(2);
  return {
    text: `Buy about ${kg} kg of ${food.name}`,
    amount: parseFloat(kg),
    unit: 'kg',
  };
}

/**
 * Calculate confidence score based on how much profile data we have.
 */
export function calcConfidence(persons: PersonInput[], hasHistory: boolean): number {
  if (persons.length === 0) return 70;

  let totalScore = 0;
  for (const p of persons) {
    let score = 70; // base
    if (p.age !== null)      score += 6;
    if (p.weight_kg !== null) score += 8;
    if (p.gender !== null)   score += 4;
    if (p.appetite_level !== 'normal') score += 4;
    if (score > 94) score = 94;
    totalScore += score;
  }

  let confidence = totalScore / persons.length;
  if (hasHistory) confidence = Math.min(confidence + 4, 98);

  return Math.round(confidence);
}

// ─────────────────────────────────────────────
// Main recommendation function
// ─────────────────────────────────────────────

export function calculatePortion(
  persons: PersonInput[],
  food: FoodItem,
  category: FoodCategory,
  mealType: MealType,
  hasHistory: boolean,
): PortionResult {
  const breakdown: PerPersonPortion[] = [];
  let totalEdible = 0;

  for (const person of persons) {
    const { edible_g, factors } = calcPersonEdiblePortion(person, food, mealType);
    const purchase_g = edibleToPurchaseWeight(edible_g, food);
    totalEdible += edible_g;
    breakdown.push({
      member_id: person.id,
      name: person.name,
      edible_g,
      purchase_g,
      factors,
    });
  }

  const totalPurchase = edibleToPurchaseWeight(totalEdible, food);
  const { text, amount, unit } = generatePracticalRecommendation(totalPurchase, food);
  const confidence = calcConfidence(persons, hasHistory);

  // Estimate cost based on purchase weight and price_per_100g (±COST_VARIANCE_PCT range)
  const COST_VARIANCE_LOW  = 0.80; // -20%
  const COST_VARIANCE_HIGH = 1.20; // +20%
  let estimatedCostMin: number | null = null;
  let estimatedCostMax: number | null = null;
  if (food.price_per_100g !== null && food.price_per_100g > 0) {
    const baseCost = (totalPurchase / 100) * food.price_per_100g;
    estimatedCostMin = Math.round(baseCost * COST_VARIANCE_LOW  * 100) / 100;
    estimatedCostMax = Math.round(baseCost * COST_VARIANCE_HIGH * 100) / 100;
  }

  // Expected leftover: difference between what was practically recommended and what's needed
  const practicalPurchaseG = amount !== null && food.practical_unit_weight_g !== null
    ? (food.unit_type === 'whole' || food.unit_type === 'pieces' || food.unit_type === 'slices'
      ? amount * (food.practical_unit_weight_g) * (food.edible_yield_pct / 100)
      : amount)
    : totalPurchase * (food.edible_yield_pct / 100);

  const expectedLeftover = Math.max(0, practicalPurchaseG - totalEdible);

  const contextNote = buildContextNote(mealType, persons.length);

  return {
    food_item: food,
    category,
    total_edible_g: Math.round(totalEdible),
    total_purchase_g: Math.round(totalPurchase),
    practical_recommendation: text,
    practical_amount: amount,
    practical_unit: unit,
    confidence_pct: confidence,
    expected_leftover_g: Math.round(expectedLeftover),
    estimated_cost_min: estimatedCostMin,
    estimated_cost_max: estimatedCostMax,
    per_person_breakdown: breakdown,
    context_note: contextNote,
  };
}

function buildContextNote(mealType: MealType, personCount: number): string {
  const notes: Partial<Record<MealType, string>> = {
    party:   'Party portions are slightly smaller — people graze and eat less per item.',
    bbq:     'BBQ portions are larger — outdoor eating and social atmosphere increase appetite.',
    wedding: 'Wedding catering uses slightly smaller portions — multiple courses are served.',
    snack:   'Snack-sized portions — not a full meal.',
    christmas: 'Holiday portions are larger — multiple courses and festive indulgence.',
  };
  const base = notes[mealType] ?? '';
  return base
    ? `${base} Based on ${personCount} ${personCount === 1 ? 'person' : 'people'}.`
    : `Calculated for ${personCount} ${personCount === 1 ? 'person' : 'people'}.`;
}
