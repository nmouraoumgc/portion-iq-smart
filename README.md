# PortionIQ 🥗

**Smart Meal Quantity App** — Eliminate food waste and shortages by calculating exactly how much food to buy, personalised to every person in your group.

---

## Product Overview

PortionIQ answers the question: *"How much food should I buy for this meal?"*

Instead of guessing, users get a precise, personalised recommendation in under 20 seconds by following three steps:

1. **Who's eating?** — Select household members or add guests
2. **What food are you buying?** — Choose from 50+ foods across 18 categories
3. **See exactly how much to buy** — Get a practical recommendation with confidence score

---

## Key Differentiators

- **Edible yield calculation** — Accounts for bones (chicken, ribs), shells (shrimp, crab, lobster), cooking loss, and waste. Tells you how much to *purchase*, not just how much is edible.
- **Personalised profiles** — Every recommendation is adjusted for age, weight, gender, appetite level, and activity level using nutritional science.
- **Adaptive learning** — The app learns from feedback ("Too much", "Not enough", "Just right") and improves future predictions automatically.
- **Household management** — Save family profiles and select members per meal with one tap.

---

## Architecture

```
portioniq/
├── backend/          # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── database/     # SQLite schema + food database seed
│   │   ├── models/       # TypeScript types
│   │   ├── routes/       # REST API routes
│   │   └── services/
│   │       ├── portionEngine.ts          # Core portion calculation
│   │       └── recommendationService.ts  # Business logic + history
│   └── package.json
├── frontend/         # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/          # Axios API client
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # CalculatorPage, HouseholdsPage, HistoryPage
│   │   └── types/        # Shared TypeScript types
│   └── package.json
└── package.json      # Root scripts
```

### Tech Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Frontend  | React 19, TypeScript, Tailwind CSS v4     |
| Backend   | Node.js 22, Express 4, TypeScript 5       |
| Database  | SQLite via better-sqlite3                 |
| Testing   | Jest + ts-jest (backend), React Testing Library (frontend) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
# Clone the repo
git clone https://github.com/nmouraoumgc/PortionIQ.git
cd PortionIQ

# Install all dependencies
npm run install:all
```

### Running locally

```bash
# Terminal 1 – start the backend API (port 3001)
npm run start:backend

# Terminal 2 – start the frontend (port 3000)
npm run start:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running tests

```bash
# All tests
npm test

# Backend only (18 unit tests)
npm run test:backend

# Frontend only (3 integration tests)
npm run test:frontend
```

### Building for production

```bash
npm run build
```

---

## API Reference

Base URL: `http://localhost:3001/api`

### Households

| Method | Endpoint                               | Description              |
|--------|----------------------------------------|--------------------------|
| GET    | `/households`                          | List all households      |
| POST   | `/households`                          | Create household         |
| GET    | `/households/:id`                      | Get household + members  |
| PUT    | `/households/:id`                      | Update household name    |
| DELETE | `/households/:id`                      | Delete household         |
| POST   | `/households/:id/members`              | Add member               |
| PUT    | `/households/:id/members/:memberId`    | Update member            |
| DELETE | `/households/:id/members/:memberId`    | Remove member            |

### Foods

| Method | Endpoint                         | Description              |
|--------|----------------------------------|--------------------------|
| GET    | `/foods/categories`              | List food categories     |
| GET    | `/foods/items?category=:id`      | List foods by category   |
| GET    | `/foods/search?q=:query`         | Search foods by name     |

### Recommendations

| Method | Endpoint                                   | Description                       |
|--------|--------------------------------------------|-----------------------------------|
| POST   | `/recommendations`                         | Get recommendation (no save)      |
| POST   | `/recommendations/save`                    | Get + save recommendation         |
| GET    | `/recommendations/sessions`                | List past meal sessions           |
| GET    | `/recommendations/sessions/:id`            | Get session + feedback            |
| POST   | `/recommendations/sessions/:id/feedback`   | Submit meal feedback              |

#### Recommendation Request Body

```json
{
  "household_id": "optional-uuid",
  "member_ids": ["uuid1", "uuid2"],
  "guest_profiles": [
    { "age": 30, "weight_kg": 70, "appetite_level": "normal" }
  ],
  "food_item_id": "food_rotisserie_chicken",
  "meal_type": "dinner"
}
```

#### Recommendation Response

```json
{
  "food_item": { ... },
  "category": { ... },
  "total_edible_g": 736,
  "total_purchase_g": 1289,
  "practical_recommendation": "Buy 2 medium chickens of Rotisserie Chicken",
  "practical_amount": 2,
  "practical_unit": "medium chicken",
  "confidence_pct": 92,
  "expected_leftover_g": 108,
  "per_person_breakdown": [
    { "name": "Father", "edible_g": 331, "purchase_g": 579 },
    ...
  ],
  "context_note": "Calculated for 5 people."
}
```

---

## Portion Calculation Methodology

The engine calculates each person's edible portion using evidence-based factors:

```
edible_g = base_serving × age_factor × weight_factor × gender_factor
           × appetite_multiplier × activity_factor × context_factor
           × history_adjustment × pregnancy_bonus × athlete_bonus
```

| Factor           | Basis                                              |
|------------------|----------------------------------------------------|
| `age_factor`     | Dietary Reference Intakes (DRIs); children < adult |
| `weight_factor`  | Metabolic scaling: `(weight/75)^0.75` (Kleiber's law) |
| `gender_factor`  | USDA guidelines: male 1.08×, female 0.92×         |
| `appetite_multiplier` | Very small: 0.60 → Very big: 1.50             |
| `activity_factor`| WHO/FAO PAL levels: sedentary 0.88 → very active 1.25 |
| `context_factor` | Party: 0.85× (grazing), BBQ: 1.20×, Christmas: 1.10× |

### Edible Yield Conversion

Purchase weight is calculated from edible weight using food-specific yield data:

```
purchase_g = edible_g / (edible_yield_pct / 100)
```

Example — Rotisserie Chicken:
- Edible yield: 58% (bones: 35%, cooking loss: 5%, waste: 2%)
- 200 g edible needed → buy 345 g raw chicken

---

## Food Database

50+ foods across 18 categories with edible yield data:

| Category    | Examples                              |
|-------------|---------------------------------------|
| Poultry     | Rotisserie chicken (58% yield), turkey, duck |
| Beef        | Steak, BBQ ribs (50% yield), burgers  |
| Pork        | Ribs (45% yield), chops, sausages     |
| Lamb        | Chops, leg of lamb                    |
| Fish        | Salmon fillet (95%), whole sea bass (45%) |
| Seafood     | Shrimp (60%), whole crab (25%), lobster (30%), mussels (25%) |
| Pizza       | Medium (8 slices), large (10 slices)  |
| Sushi       | Maki (25 g/piece), nigiri (35 g)      |
| Pasta       | Dry (90 g/person) and fresh           |
| Rice        | Dry (75 g/person) and cooked          |
| + 8 more    | Salads, desserts, bread, cheese, charcuterie, finger food, burgers, sandwiches |

---

## Meal Contexts

The app adjusts recommendations based on the occasion:

| Context          | Adjustment | Reason                              |
|------------------|------------|-------------------------------------|
| Snack            | 0.55×      | Small bite, not a full meal         |
| Breakfast        | 0.70×      | Lighter than main meals             |
| Party            | 0.85×      | Grazing; people eat less per item   |
| Wedding          | 0.80×      | Multi-course; smaller per-item portions |
| Lunch            | 1.00×      | Reference                           |
| Dinner           | 1.05×      | Slightly larger than lunch          |
| Christmas        | 1.10×      | Holiday indulgence                  |
| BBQ              | 1.20×      | Outdoor social; increased appetite  |

---

## Database Schema

```sql
households       id, name, created_at, updated_at
members          id, household_id, name, age, gender, height_cm, weight_kg,
                 activity_level, appetite_level, dietary_prefs, allergies,
                 medical_restrictions, is_vegetarian, is_vegan, is_pregnant,
                 is_athlete, is_elderly
food_categories  id, name, description, icon
food_items       id, category_id, name, unit_type, base_serving_g,
                 edible_yield_pct, bone_pct, shell_pct, cooking_loss_pct,
                 waste_pct, avg_whole_weight_g, practical_unit, practical_unit_weight_g,
                 price_per_100g
meal_sessions    id, household_id, meal_type, food_item_id, member_ids,
                 guest_count, recommended_edible_g, recommended_purchase_g,
                 practical_recommendation, confidence_pct, expected_leftover_g
meal_feedback    id, session_id, satisfaction, leftover_level, hunger_after,
                 actual_consumed_g
member_history   id, member_id, food_item_id, actual_consumed_g, session_id
grocery_lists    id, household_id, name, created_at, updated_at
grocery_list_items id, list_id, food_item_id, food_name, food_icon,
                 practical_recommendation, purchase_g, practical_amount,
                 practical_unit, estimated_cost_min, estimated_cost_max, is_checked
```

---

## Adaptive Learning

After each meal, users rate the outcome. The system stores actual consumption data in `member_history` and adjusts future recommendations:

1. Per-person adjustment ratio = actual_consumed / recommended (last 10 meals)
2. Clamped between 0.7× and 1.5× to prevent extreme adjustments
3. Household-level adjustment blended with individual adjustments

Example: "This family consistently eats 12% more chicken than predicted" → future recommendations are multiplied by ~1.12.

---

## Roadmap

### Phase 1 — Current (MVP)
- [x] Household & member management
- [x] 50+ foods across 18 categories
- [x] Edible yield calculation
- [x] Personalised portion engine
- [x] Meal context adjustments
- [x] Meal history & feedback
- [x] Adaptive learning from feedback

### Phase 2
- [x] Barcode scanning for packaged foods
- [x] Voice input ("Hey PortionIQ, chicken for 6 people")
- [x] Cost estimation & price comparison
- [x] Grocery list generation
- [ ] Apple Health / Google Fit integration

### Phase 3
- [ ] Restaurant mode (order quantities)
- [ ] Catering mode (large groups 20+)
- [ ] Offline mode
- [ ] Smartwatch companion
- [ ] Family sharing & sync

---

## Scientific References

- WHO/FAO/UNU (2004). *Human Energy Requirements*. FAO Food and Nutrition Technical Report Series No. 1.
- USDA Dietary Guidelines for Americans 2020–2025
- Kleiber, M. (1932). *Body size and metabolism*. Hilgardia, 6, 315–353.
- Institute of Medicine (2005). *Dietary Reference Intakes for Energy*. National Academies Press.

---

## Contributing

Pull requests welcome. Please add tests for any new portion calculation logic.

## Licence

MIT
