import axios from 'axios';
import {
  Household,
  Member,
  FoodCategory,
  FoodItem,
  RecommendationRequest,
  PortionResult,
  MealSession,
} from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE_URL });

// ─── Households ───────────────────────────────────────
export const getHouseholds = (): Promise<Household[]> =>
  api.get('/households').then(r => r.data);

export const getHousehold = (id: string): Promise<{ household: Household; members: Member[] }> =>
  api.get(`/households/${id}`).then(r => r.data);

export const createHousehold = (name: string): Promise<Household> =>
  api.post('/households', { name }).then(r => r.data);

export const updateHousehold = (id: string, name: string): Promise<Household> =>
  api.put(`/households/${id}`, { name }).then(r => r.data);

export const deleteHousehold = (id: string): Promise<void> =>
  api.delete(`/households/${id}`);

// ─── Members ──────────────────────────────────────────
export const createMember = (householdId: string, data: Partial<Member>): Promise<Member> =>
  api.post(`/households/${householdId}/members`, data).then(r => r.data);

export const updateMember = (householdId: string, memberId: string, data: Partial<Member>): Promise<Member> =>
  api.put(`/households/${householdId}/members/${memberId}`, data).then(r => r.data);

export const deleteMember = (householdId: string, memberId: string): Promise<void> =>
  api.delete(`/households/${householdId}/members/${memberId}`);

// ─── Foods ────────────────────────────────────────────
export const getFoodCategories = (): Promise<FoodCategory[]> =>
  api.get('/foods/categories').then(r => r.data);

export const getFoodItems = (categoryId?: string): Promise<FoodItem[]> => {
  const params = categoryId ? { category: categoryId } : {};
  return api.get('/foods/items', { params }).then(r => r.data);
};

export const searchFoodItems = (query: string): Promise<(FoodItem & { category_name: string; category_icon: string })[]> =>
  api.get('/foods/search', { params: { q: query } }).then(r => r.data);

// ─── Recommendations ──────────────────────────────────
export const getRecommendation = (req: RecommendationRequest): Promise<PortionResult> =>
  api.post('/recommendations', req).then(r => r.data);

export const saveRecommendation = (req: RecommendationRequest): Promise<{ session: MealSession; recommendation: PortionResult }> =>
  api.post('/recommendations/save', req).then(r => r.data);

export const getMealSessions = (householdId?: string): Promise<MealSession[]> => {
  const params = householdId ? { household_id: householdId } : {};
  return api.get('/recommendations/sessions', { params }).then(r => r.data);
};

export const getMealSession = (id: string): Promise<{ session: MealSession; feedback: unknown }> =>
  api.get(`/recommendations/sessions/${id}`).then(r => r.data);

export const saveFeedback = (sessionId: string, data: {
  satisfaction?: string;
  leftover_level?: string;
  hunger_after?: string;
  actual_consumed_g?: number;
}): Promise<unknown> =>
  api.post(`/recommendations/sessions/${sessionId}/feedback`, data).then(r => r.data);
