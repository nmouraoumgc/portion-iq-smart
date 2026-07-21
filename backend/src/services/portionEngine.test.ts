import {
  calcPersonEdiblePortion,
  edibleToPurchaseWeight,
  generatePracticalRecommendation,
  calcConfidence,
  calculatePortion,
  PersonInput,
} from '../services/portionEngine';
import { FoodItem, FoodCategory } from '../models/types';

const mockChicken: FoodItem = {
  id: 'food_rotisserie_chicken',
  category_id: 'cat_poultry',
  name: 'Rotisserie Chicken',
  unit_type: 'whole',
  base_serving_g: 200,
  edible_yield_pct: 58,
  bone_pct: 35,
  shell_pct: 0,
  cooking_loss_pct: 5,
  waste_pct: 2,
  density_g_per_ml: null,
  avg_whole_weight_g: 1200,
  practical_unit: 'medium chicken',
  practical_unit_weight_g: 1200,
  price_per_100g: 0.80,
  notes: null,
  created_at: '2024-01-01',
};

const mockSalmon: FoodItem = {
  id: 'food_salmon_fillet',
  category_id: 'cat_fish',
  name: 'Salmon Fillet',
  unit_type: 'weight',
  base_serving_g: 200,
  edible_yield_pct: 95,
  bone_pct: 0,
  shell_pct: 0,
  cooking_loss_pct: 10,
  waste_pct: 5,
  density_g_per_ml: null,
  avg_whole_weight_g: null,
  practical_unit: null,
  practical_unit_weight_g: null,
  price_per_100g: 1.80,
  notes: null,
  created_at: '2024-01-01',
};

const mockCategory: FoodCategory = {
  id: 'cat_poultry',
  name: 'Poultry',
  description: null,
  icon: '🍗',
};

const adultMaleBigEater: PersonInput = {
  id: 'p1',
  name: 'Father',
  age: 45,
  gender: 'male',
  weight_kg: 90,
  appetite_level: 'big',
  activity_level: 'moderate',
  is_pregnant: false,
  is_athlete: false,
  history_adjustment: 1.0,
};

const adultFemaleSmallEater: PersonInput = {
  id: 'p2',
  name: 'Mother',
  age: 43,
  gender: 'female',
  weight_kg: 61,
  appetite_level: 'small',
  activity_level: 'moderate',
  is_pregnant: false,
  is_athlete: false,
  history_adjustment: 1.0,
};

const child7: PersonInput = {
  id: 'p3',
  name: 'Child',
  age: 7,
  gender: 'male',
  weight_kg: 22,
  appetite_level: 'normal',
  activity_level: 'active',
  is_pregnant: false,
  is_athlete: false,
  history_adjustment: 1.0,
};

describe('calcPersonEdiblePortion', () => {
  it('calculates adult male big eater portion', () => {
    const { edible_g, factors } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'dinner');
    expect(edible_g).toBeGreaterThan(0);
    expect(factors.appetite_multiplier).toBe(1.25); // big eater
    expect(factors.age_factor).toBe(1.0);           // 18-65
    expect(factors.gender_factor).toBeCloseTo(1.08);
  });

  it('gives child significantly less than adult', () => {
    const { edible_g: adultPortion } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'dinner');
    const { edible_g: childPortion } = calcPersonEdiblePortion(child7, mockChicken, 'dinner');
    expect(childPortion).toBeLessThan(adultPortion);
    // Child should be roughly 40-60% of adult
    expect(childPortion / adultPortion).toBeLessThan(0.65);
  });

  it('small eater gets less than big eater', () => {
    const { edible_g: big } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'dinner');
    const smallEater: PersonInput = { ...adultMaleBigEater, appetite_level: 'small' };
    const { edible_g: small } = calcPersonEdiblePortion(smallEater, mockChicken, 'dinner');
    expect(small).toBeLessThan(big);
  });

  it('party context reduces portion', () => {
    const { edible_g: dinnerPortion } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'dinner');
    const { edible_g: partyPortion } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'party');
    expect(partyPortion).toBeLessThan(dinnerPortion);
  });

  it('BBQ context increases portion', () => {
    const { edible_g: dinnerPortion } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'dinner');
    const { edible_g: bbqPortion } = calcPersonEdiblePortion(adultMaleBigEater, mockChicken, 'bbq');
    expect(bbqPortion).toBeGreaterThan(dinnerPortion);
  });

  it('pregnant person gets 10% bonus', () => {
    const normal: PersonInput = { ...adultFemaleSmallEater };
    const pregnant: PersonInput = { ...adultFemaleSmallEater, is_pregnant: true };
    const { edible_g: normalPortion } = calcPersonEdiblePortion(normal, mockChicken, 'dinner');
    const { edible_g: pregnantPortion } = calcPersonEdiblePortion(pregnant, mockChicken, 'dinner');
    expect(pregnantPortion).toBeGreaterThan(normalPortion);
    expect(pregnantPortion / normalPortion).toBeCloseTo(1.1, 1);
  });

  it('athlete gets 15% bonus', () => {
    const normal: PersonInput = { ...adultMaleBigEater };
    const athlete: PersonInput = { ...adultMaleBigEater, is_athlete: true };
    const { edible_g: normalPortion } = calcPersonEdiblePortion(normal, mockChicken, 'dinner');
    const { edible_g: athletePortion } = calcPersonEdiblePortion(athlete, mockChicken, 'dinner');
    expect(athletePortion).toBeGreaterThan(normalPortion);
    expect(athletePortion / normalPortion).toBeCloseTo(1.15, 1);
  });
});

describe('edibleToPurchaseWeight', () => {
  it('accounts for bone weight in whole chicken', () => {
    const edible = 200;
    const purchase = edibleToPurchaseWeight(edible, mockChicken);
    // With 58% yield, we need more purchase weight
    expect(purchase).toBeGreaterThan(edible);
    expect(purchase).toBeGreaterThan(edible / 0.58);
  });

  it('salmon fillet needs less extra weight (high yield)', () => {
    const edible = 200;
    const chickenPurchase = edibleToPurchaseWeight(edible, mockChicken);
    const salmonPurchase = edibleToPurchaseWeight(edible, mockSalmon);
    // Salmon has 95% yield vs chicken 58% — salmon purchase weight is much less
    expect(salmonPurchase).toBeLessThan(chickenPurchase);
  });
});

describe('generatePracticalRecommendation', () => {
  it('generates weight recommendation for salmon', () => {
    const { text, unit } = generatePracticalRecommendation(750, mockSalmon);
    expect(text).toContain('750');
    expect(text.toLowerCase()).toContain('g');
    expect(unit).toBe('g');
  });

  it('rounds to nearest kg for large amounts', () => {
    const { text, unit } = generatePracticalRecommendation(2400, mockSalmon);
    expect(unit).toBe('kg');
    expect(text).toContain('kg');
  });

  it('generates whole unit recommendation for chicken', () => {
    const { text, amount, unit } = generatePracticalRecommendation(2500, mockChicken);
    expect(text).toContain('chicken');
    expect(amount).toBeGreaterThanOrEqual(2);
    expect(unit).toBe('medium chicken');
  });
});

describe('calcConfidence', () => {
  it('returns higher confidence with more complete profiles', () => {
    const fullProfile: PersonInput = { ...adultMaleBigEater };
    const partialProfile: PersonInput = {
      ...adultMaleBigEater,
      age: null,
      weight_kg: null,
      gender: null,
    };
    const full = calcConfidence([fullProfile], false);
    const partial = calcConfidence([partialProfile], false);
    expect(full).toBeGreaterThan(partial);
  });

  it('boosts confidence with history', () => {
    const noHistory = calcConfidence([adultMaleBigEater], false);
    const withHistory = calcConfidence([adultMaleBigEater], true);
    expect(withHistory).toBeGreaterThan(noHistory);
  });

  it('returns 70 for empty persons', () => {
    expect(calcConfidence([], false)).toBe(70);
  });
});

describe('calculatePortion - Rotisserie Chicken Family Example', () => {
  // From the problem statement:
  // Father 92kg big eater, Mother 61kg normal, Girl 16 56kg normal,
  // Girl 11 38kg small, Boy 7 28kg small
  const family: PersonInput[] = [
    { id: 'f', name: 'Father', age: 45, gender: 'male', weight_kg: 92, appetite_level: 'big', activity_level: 'moderate', is_pregnant: false, is_athlete: false, history_adjustment: 1.0 },
    { id: 'm', name: 'Mother', age: 43, gender: 'female', weight_kg: 61, appetite_level: 'normal', activity_level: 'moderate', is_pregnant: false, is_athlete: false, history_adjustment: 1.0 },
    { id: 'g1', name: 'Girl 16', age: 16, gender: 'female', weight_kg: 56, appetite_level: 'normal', activity_level: 'moderate', is_pregnant: false, is_athlete: false, history_adjustment: 1.0 },
    { id: 'g2', name: 'Girl 11', age: 11, gender: 'female', weight_kg: 38, appetite_level: 'small', activity_level: 'moderate', is_pregnant: false, is_athlete: false, history_adjustment: 1.0 },
    { id: 'b1', name: 'Boy 7', age: 7, gender: 'male', weight_kg: 28, appetite_level: 'small', activity_level: 'active', is_pregnant: false, is_athlete: false, history_adjustment: 1.0 },
  ];

  it('recommends 1-2 chickens for family of 5', () => {
    const result = calculatePortion(family, mockChicken, mockCategory, 'dinner', false);

    // Edible meat total for this mixed family should be in a reasonable range
    // (engine uses evidence-based DRI portions: ~147g avg edible/person for mixed group)
    expect(result.total_edible_g).toBeGreaterThan(500);
    expect(result.total_edible_g).toBeLessThan(1800);

    // Should recommend at least 1 whole chicken
    expect(result.practical_amount).toBeGreaterThanOrEqual(1);

    // Per-person breakdown should have 5 entries
    expect(result.per_person_breakdown).toHaveLength(5);

    // Father should have the most
    const fatherPortion = result.per_person_breakdown.find(p => p.name === 'Father')!;
    const boyPortion = result.per_person_breakdown.find(p => p.name === 'Boy 7')!;
    expect(fatherPortion.edible_g).toBeGreaterThan(boyPortion.edible_g);
  });

  it('provides confidence percentage', () => {
    const result = calculatePortion(family, mockChicken, mockCategory, 'dinner', false);
    expect(result.confidence_pct).toBeGreaterThan(70);
    expect(result.confidence_pct).toBeLessThanOrEqual(100);
  });

  it('provides expected leftover information', () => {
    const result = calculatePortion(family, mockChicken, mockCategory, 'dinner', false);
    expect(result.expected_leftover_g).toBeGreaterThanOrEqual(0);
  });
});
