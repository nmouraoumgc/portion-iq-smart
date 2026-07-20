export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type AppetiteLevel = 'very_small' | 'small' | 'normal' | 'big' | 'very_big';
export type UnitType = 'weight' | 'pieces' | 'whole' | 'slices';
export type MealType =
  | 'lunch' | 'dinner' | 'snack' | 'breakfast'
  | 'party' | 'bbq' | 'birthday' | 'christmas' | 'easter'
  | 'picnic' | 'office_lunch' | 'wedding' | 'family_gathering';
export type Satisfaction = 'not_enough' | 'just_right' | 'too_much';
export type LeftoverLevel = 'none' | 'little' | 'moderate' | 'lots';
export type HungerAfter = 'still_hungry' | 'satisfied' | 'overfull';

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  household_id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel;
  appetite_level: AppetiteLevel;
  dietary_prefs: string[];
  allergies: string[];
  medical_restrictions: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_pregnant: boolean;
  is_athlete: boolean;
  is_elderly: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface FoodItem {
  id: string;
  category_id: string;
  name: string;
  unit_type: UnitType;
  base_serving_g: number;
  edible_yield_pct: number;
  bone_pct: number;
  shell_pct: number;
  cooking_loss_pct: number;
  waste_pct: number;
  avg_whole_weight_g: number | null;
  practical_unit: string | null;
  practical_unit_weight_g: number | null;
  notes: string | null;
}

export interface GuestProfile {
  name?: string;
  age?: number;
  gender?: Gender;
  weight_kg?: number;
  appetite_level?: AppetiteLevel;
  is_child?: boolean;
  is_elderly?: boolean;
}

export interface RecommendationRequest {
  household_id?: string;
  member_ids: string[];
  guest_profiles?: GuestProfile[];
  food_item_id: string;
  meal_type: MealType;
}

export interface PerPersonPortion {
  member_id: string | null;
  name: string;
  edible_g: number;
  purchase_g: number;
  factors: {
    base_serving_g: number;
    age_factor: number;
    weight_factor: number;
    gender_factor: number;
    appetite_multiplier: number;
    activity_factor: number;
    context_factor: number;
    history_adjustment: number;
  };
}

export interface PortionResult {
  food_item: FoodItem;
  category: FoodCategory;
  total_edible_g: number;
  total_purchase_g: number;
  practical_recommendation: string;
  practical_amount: number | null;
  practical_unit: string | null;
  confidence_pct: number;
  expected_leftover_g: number;
  per_person_breakdown: PerPersonPortion[];
  context_note: string;
}

export interface MealSession {
  id: string;
  household_id: string | null;
  meal_type: MealType;
  food_item_id: string;
  member_ids: string | string[];
  guest_count: number;
  recommended_edible_g: number;
  recommended_purchase_g: number;
  practical_recommendation: string;
  practical_amount: number | null;
  practical_unit: string | null;
  confidence_pct: number;
  expected_leftover_g: number | null;
  created_at: string;
}
