import React, { useState, useEffect, useCallback } from 'react';
import { Household, Member, FoodCategory, FoodItem, MealType, PortionResult, GuestProfile, AppetiteLevel } from '../types';
import {
  getHouseholds,
  getHousehold,
  getFoodCategories,
  getFoodItems,
  saveRecommendation,
} from '../api';
import { Button, Card, Spinner, Select, Input } from '../components/common/UI';
import { MemberCard } from '../components/households/MemberCard';
import { RecommendationResult } from '../components/recommendation/RecommendationResult';
import { VoiceInput } from '../components/recommendation/VoiceInput';
import { BarcodeScanner } from '../components/recommendation/BarcodeScanner';

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: 'lunch',            label: 'Lunch',            emoji: '☀️' },
  { value: 'dinner',           label: 'Dinner',           emoji: '🌙' },
  { value: 'breakfast',        label: 'Breakfast',        emoji: '🌅' },
  { value: 'snack',            label: 'Snack',            emoji: '🍎' },
  { value: 'bbq',              label: 'BBQ',              emoji: '🔥' },
  { value: 'party',            label: 'Party',            emoji: '🎉' },
  { value: 'birthday',         label: 'Birthday',         emoji: '🎂' },
  { value: 'christmas',        label: 'Christmas',        emoji: '🎄' },
  { value: 'easter',           label: 'Easter',           emoji: '🐣' },
  { value: 'picnic',           label: 'Picnic',           emoji: '🧺' },
  { value: 'office_lunch',     label: 'Office Lunch',     emoji: '💼' },
  { value: 'wedding',          label: 'Wedding',          emoji: '💍' },
  { value: 'family_gathering', label: 'Family Gathering', emoji: '👨‍👩‍👧‍👦' },
];

type Step = 1 | 2 | 3;

export const CalculatorPage: React.FC = () => {
  const [step, setStep] = useState<Step>(1);

  // Step 1: Who is eating
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [householdMembers, setHouseholdMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [guestCount, setGuestCount] = useState(0);
  const [guestAppetite, setGuestAppetite] = useState<AppetiteLevel>('normal');
  const [loadingHousehold, setLoadingHousehold] = useState(false);

  // Step 2: What food
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Step 3: Results
  const [result, setResult] = useState<PortionResult | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHouseholds().then(setHouseholds).catch(() => {});
    getFoodCategories().then(setCategories).catch(() => {});
  }, []);

  const loadHousehold = useCallback(async (id: string) => {
    if (!id) {
      setHouseholdMembers([]);
      setSelectedMemberIds([]);
      return;
    }
    setLoadingHousehold(true);
    try {
      const { members } = await getHousehold(id);
      setHouseholdMembers(members);
      setSelectedMemberIds(members.map(m => m.id));
    } catch {
      setHouseholdMembers([]);
    } finally {
      setLoadingHousehold(false);
    }
  }, []);

  const loadFoodItems = useCallback(async (catId: string) => {
    setLoadingFoods(true);
    try {
      const items = await getFoodItems(catId);
      setFoodItems(items);
    } catch {
      setFoodItems([]);
    } finally {
      setLoadingFoods(false);
    }
  }, []);

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleFoodFromVoiceOrBarcode = useCallback((food: FoodItem, category: FoodCategory) => {
    setSelectedCategory(category);
    setFoodItems([food]);
    setSelectedFood(food);
  }, []);

  const handleGetRecommendation = async () => {
    if (!selectedFood) return;
    setLoadingResult(true);
    setError(null);
    try {
      const guests: GuestProfile[] = guestCount > 0
        ? Array.from({ length: guestCount }, () => ({ appetite_level: guestAppetite }))
        : [];

      const { session, recommendation } = await saveRecommendation({
        household_id: selectedHouseholdId || undefined,
        member_ids: selectedMemberIds,
        guest_profiles: guests.length > 0 ? guests : undefined,
        food_item_id: selectedFood.id,
        meal_type: mealType,
      });
      setResult(recommendation);
      setSessionId(session.id);
      setStep(3);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to calculate recommendation');
    } finally {
      setLoadingResult(false);
    }
  };

  const totalPeople = selectedMemberIds.length + guestCount;

  // ─── Step indicators ──────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as Step[]).map(s => (
        <React.Fragment key={s}>
          <div className={[
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
            step === s ? 'bg-emerald-500 text-white' :
            step > s ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400',
          ].join(' ')}>
            {step > s ? '✓' : s}
          </div>
          {s < 3 && (
            <div className={`h-0.5 w-8 ${step > s ? 'bg-emerald-300' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Step 1: Who is eating ─────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-4">
        <StepIndicator />
        <h1 className="text-2xl font-bold text-slate-800 text-center">Who's eating? 👥</h1>

        {/* Household selector */}
        {households.length > 0 && (
          <Card className="p-4">
            <Select
              label="Select household (optional)"
              value={selectedHouseholdId}
              onChange={e => {
                setSelectedHouseholdId(e.target.value);
                loadHousehold(e.target.value);
              }}
            >
              <option value="">No household — add people manually</option>
              {households.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </Select>
          </Card>
        )}

        {/* Member selection */}
        {loadingHousehold ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : householdMembers.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Select who is eating:</p>
            <div className="space-y-2">
              {householdMembers.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  selected={selectedMemberIds.includes(member.id)}
                  onSelect={() => toggleMember(member.id)}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-slate-500 text-sm">
              No household selected. You can add guests below or{' '}
              <a href="/households" className="text-emerald-600 font-medium">manage households</a>.
            </p>
          </div>
        )}

        {/* Guest count */}
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Add extra guests:</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Number of guests"
              type="number"
              min={0}
              max={500}
              value={guestCount}
              onChange={e => setGuestCount(parseInt(e.target.value) || 0)}
            />
            <Select
              label="Guest appetite"
              value={guestAppetite}
              onChange={e => setGuestAppetite(e.target.value as AppetiteLevel)}
            >
              <option value="very_small">Very small eater</option>
              <option value="small">Small eater</option>
              <option value="normal">Normal</option>
              <option value="big">Big eater</option>
              <option value="very_big">Very big eater</option>
            </Select>
          </div>
        </Card>

        {/* Meal type */}
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Meal type:</p>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMealType(opt.value)}
                className={[
                  'flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium transition-all',
                  mealType === opt.value
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                <span className="text-xl mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Button
          fullWidth
          size="lg"
          disabled={totalPeople === 0}
          onClick={() => setStep(2)}
        >
          Next: Select food →
        </Button>

        {totalPeople > 0 && (
          <p className="text-center text-sm text-slate-500">
            {totalPeople} {totalPeople === 1 ? 'person' : 'people'} selected
          </p>
        )}
      </div>
    );
  }

  // ─── Step 2: What food ────────────────────────────────────
  if (step === 2) {
    return (
      <div className="space-y-4">
        {showBarcodeScanner && (
          <BarcodeScanner
            onFoodSelected={handleFoodFromVoiceOrBarcode}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}

        <StepIndicator />
        <h1 className="text-2xl font-bold text-slate-800 text-center">What are you buying? 🛒</h1>

        {/* Voice + Barcode input row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <VoiceInput onFoodSelected={handleFoodFromVoiceOrBarcode} />
          </div>
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:border-emerald-300 hover:text-emerald-700 transition-all bg-white"
            title="Scan barcode"
          >
            <span className="text-lg">📷</span>
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Selected food from voice/barcode */}
        {selectedFood && selectedCategory && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedCategory.icon ?? '🍽️'}</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">{selectedFood.name}</p>
                <p className="text-xs text-emerald-600">{selectedCategory.name}</p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedFood(null); setSelectedCategory(null); setFoodItems([]); }}
              className="text-emerald-400 hover:text-emerald-600 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Category grid */}
        {!selectedCategory ? (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Or browse by category:</p>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    loadFoodItems(cat.id);
                  }}
                  className="flex flex-col items-center p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <span className="text-3xl mb-1">{cat.icon ?? '🍽️'}</span>
                  <span className="text-xs font-medium text-slate-700 text-center leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setSelectedCategory(null); setSelectedFood(null); setFoodItems([]); }}
              className="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-3"
            >
              ← {selectedCategory.icon} {selectedCategory.name}
            </button>

            {loadingFoods ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="space-y-2">
                {foodItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedFood(item)}
                    className={[
                      'w-full text-left p-4 rounded-xl border transition-all',
                      selectedFood?.id === item.id
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-white hover:border-emerald-300',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      {selectedFood?.id === item.id && (
                        <span className="text-emerald-500">✓</span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {item.bone_pct > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          🦴 {item.bone_pct}% bone
                        </span>
                      )}
                      {item.shell_pct > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          🦀 {item.shell_pct}% shell
                        </span>
                      )}
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        ✓ {item.edible_yield_pct}% edible
                      </span>
                      {item.price_per_100g && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          ~£{item.price_per_100g.toFixed(2)}/100g
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
          <Button
            fullWidth
            loading={loadingResult}
            disabled={!selectedFood}
            onClick={handleGetRecommendation}
          >
            Calculate! 🧮
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Step 3: Results ──────────────────────────────────────
  return (
    <div className="space-y-4">
      <StepIndicator />
      <h1 className="text-2xl font-bold text-slate-800 text-center">Here's how much to buy 📊</h1>
      {result && (
        <RecommendationResult
          result={result}
          sessionId={sessionId}
          onNewCalculation={() => {
            setStep(1);
            setResult(null);
            setSessionId(undefined);
            setSelectedFood(null);
            setSelectedCategory(null);
            setSelectedMemberIds(householdMembers.map(m => m.id));
          }}
        />
      )}
    </div>
  );
};
