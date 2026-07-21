import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/portioniq.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT CHECK(gender IN ('male','female','other')),
      height_cm REAL,
      weight_kg REAL,
      activity_level TEXT CHECK(activity_level IN ('sedentary','light','moderate','active','very_active')) DEFAULT 'moderate',
      appetite_level TEXT CHECK(appetite_level IN ('very_small','small','normal','big','very_big')) DEFAULT 'normal',
      dietary_prefs TEXT DEFAULT '[]',
      allergies TEXT DEFAULT '[]',
      medical_restrictions TEXT DEFAULT '[]',
      is_vegetarian INTEGER NOT NULL DEFAULT 0,
      is_vegan INTEGER NOT NULL DEFAULT 0,
      is_pregnant INTEGER NOT NULL DEFAULT 0,
      is_athlete INTEGER NOT NULL DEFAULT 0,
      is_elderly INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES food_categories(id),
      name TEXT NOT NULL,
      unit_type TEXT NOT NULL CHECK(unit_type IN ('weight','pieces','whole','slices')),
      base_serving_g REAL NOT NULL,
      edible_yield_pct REAL NOT NULL DEFAULT 100,
      bone_pct REAL NOT NULL DEFAULT 0,
      shell_pct REAL NOT NULL DEFAULT 0,
      cooking_loss_pct REAL NOT NULL DEFAULT 0,
      waste_pct REAL NOT NULL DEFAULT 0,
      density_g_per_ml REAL,
      avg_whole_weight_g REAL,
      practical_unit TEXT,
      practical_unit_weight_g REAL,
      price_per_100g REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grocery_lists (
      id TEXT PRIMARY KEY,
      household_id TEXT REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Shopping List',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grocery_list_items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
      food_item_id TEXT REFERENCES food_items(id),
      food_name TEXT NOT NULL,
      food_icon TEXT,
      practical_recommendation TEXT NOT NULL,
      purchase_g REAL NOT NULL,
      practical_amount REAL,
      practical_unit TEXT,
      estimated_cost_min REAL,
      estimated_cost_max REAL,
      is_checked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_sessions (
      id TEXT PRIMARY KEY,
      household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch','dinner','snack','breakfast','party','bbq','birthday','christmas','easter','picnic','office_lunch','wedding','family_gathering')),
      food_item_id TEXT NOT NULL REFERENCES food_items(id),
      member_ids TEXT NOT NULL DEFAULT '[]',
      guest_count INTEGER NOT NULL DEFAULT 0,
      recommended_edible_g REAL NOT NULL,
      recommended_purchase_g REAL NOT NULL,
      practical_recommendation TEXT NOT NULL,
      practical_amount REAL,
      practical_unit TEXT,
      confidence_pct REAL NOT NULL DEFAULT 90,
      expected_leftover_g REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_feedback (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES meal_sessions(id) ON DELETE CASCADE,
      satisfaction TEXT CHECK(satisfaction IN ('not_enough','just_right','too_much')),
      leftover_level TEXT CHECK(leftover_level IN ('none','little','moderate','lots')),
      hunger_after TEXT CHECK(hunger_after IN ('still_hungry','satisfied','overfull')),
      actual_consumed_g REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS member_history (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      food_item_id TEXT NOT NULL REFERENCES food_items(id),
      actual_consumed_g REAL NOT NULL,
      session_id TEXT REFERENCES meal_sessions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedFoodData(database);
}

function seedFoodData(database: Database.Database): void {
  const categoryCount = (database.prepare('SELECT COUNT(*) as c FROM food_categories').get() as { c: number }).c;
  if (categoryCount > 0) return;

  const insertCategory = database.prepare(
    'INSERT INTO food_categories (id, name, description, icon) VALUES (?, ?, ?, ?)'
  );
  const insertFood = database.prepare(`
    INSERT INTO food_items
      (id, category_id, name, unit_type, base_serving_g, edible_yield_pct, bone_pct, shell_pct,
       cooking_loss_pct, waste_pct, avg_whole_weight_g, practical_unit, practical_unit_weight_g,
       price_per_100g, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const categories: Array<[string, string, string, string]> = [
    ['cat_poultry',  'Poultry',   'Chicken, turkey, duck and other poultry',           '🍗'],
    ['cat_beef',     'Beef',      'Steak, burgers, roasts and BBQ beef',               '🥩'],
    ['cat_pork',     'Pork',      'Pork chops, ribs, sausages and roasts',             '🐷'],
    ['cat_lamb',     'Lamb',      'Lamb chops, leg of lamb and other lamb cuts',       '🐑'],
    ['cat_fish',     'Fish',      'Salmon, cod, tuna, sea bass and other fish',        '🐟'],
    ['cat_seafood',  'Seafood',   'Shrimp, crab, lobster, mussels and clams',          '🦐'],
    ['cat_pizza',    'Pizza',     'All types of pizza',                                '🍕'],
    ['cat_sushi',    'Sushi',     'Sushi rolls, nigiri and sashimi',                   '🍣'],
    ['cat_pasta',    'Pasta',     'All pasta dishes',                                  '🍝'],
    ['cat_rice',     'Rice',      'All rice dishes',                                   '🍚'],
    ['cat_salad',    'Salads',    'Green salads, grain salads and sides',              '🥗'],
    ['cat_desserts', 'Desserts',  'Cakes, pastries, ice cream and sweet treats',       '🍰'],
    ['cat_bread',    'Bread',     'Bread, rolls and baked goods',                      '🍞'],
    ['cat_cheese',   'Cheese',    'All types of cheese',                               '🧀'],
    ['cat_charcuterie', 'Charcuterie', 'Cured meats, pâtés and cold cuts',            '🥓'],
    ['cat_finger',   'Finger Food', 'Appetisers, canapés and finger foods',           '🧆'],
    ['cat_burgers',  'Burgers',   'Beef, chicken and vegetarian burgers',              '🍔'],
    ['cat_sandwiches','Sandwiches','Sandwiches and wraps',                             '🥪'],
  ];

  for (const cat of categories) {
    insertCategory.run(...cat);
  }

  // [id, category_id, name, unit_type, base_serving_g, edible_yield_pct, bone_pct, shell_pct,
  //  cooking_loss_pct, waste_pct, avg_whole_weight_g, practical_unit, practical_unit_weight_g,
  //  price_per_100g, notes]
  const foods: Array<[string, string, string, string, number, number, number, number, number, number, number | null, string | null, number | null, number | null, string | null]> = [
    // Poultry
    ['food_rotisserie_chicken', 'cat_poultry', 'Rotisserie Chicken', 'whole', 200, 58, 35, 0, 5, 2, 1200, 'medium chicken', 1200, 0.80, 'Average 1.2 kg whole; ~58% edible meat'],
    ['food_fried_chicken',      'cat_poultry', 'Fried Chicken',      'pieces', 180, 65, 30, 0, 5, 0, null, 'piece', 150, 0.90, 'Bone-in pieces; ~65% edible'],
    ['food_turkey_whole',       'cat_poultry', 'Whole Turkey',       'whole',  220, 55, 38, 0, 5, 2, 5000, 'whole turkey', 5000, 0.55, 'Average 5 kg whole; ~55% edible'],
    ['food_duck',               'cat_poultry', 'Duck',               'whole',  180, 50, 40, 0, 8, 2, 2000, 'duck', 2000, 1.20, 'Average 2 kg; ~50% edible meat'],
    ['food_chicken_breast',     'cat_poultry', 'Chicken Breast',     'weight', 180, 95, 0, 0, 15, 0, null, null, null, 0.90, 'Boneless; ~95% edible after trimming'],
    // Beef
    ['food_steak_ribeye',       'cat_beef', 'Ribeye Steak',          'weight', 250, 88, 5, 0, 20, 7, null, 'steak', 350, 2.50, 'Bone-in has 5% bone; cooking loss ~20%'],
    ['food_bbq_ribs',           'cat_beef', 'BBQ Beef Ribs',         'weight', 280, 50, 45, 0, 15, 5, null, 'rack', 1200, 1.20, '45% bone; buy raw weight'],
    ['food_roast_beef',         'cat_beef', 'Roast Beef',            'weight', 200, 85, 0, 0, 25, 0, null, null, null, 1.50, '25% cooking loss'],
    ['food_burger_patty',       'cat_beef', 'Beef Burger Patty',     'pieces', 180, 90, 0, 0, 20, 0, null, 'patty', 180, 0.80, 'Raw weight; cook loss ~20%'],
    ['food_ground_beef',        'cat_beef', 'Ground Beef',           'weight', 200, 92, 0, 0, 15, 0, null, null, null, 0.70, 'After cooking'],
    // Pork
    ['food_pork_ribs',          'cat_pork', 'Pork Ribs',             'weight', 280, 45, 50, 0, 15, 5, null, 'rack', 1000, 0.90, '50% bone weight'],
    ['food_pork_chop',          'cat_pork', 'Pork Chop',             'pieces', 200, 85, 12, 0, 15, 3, null, 'chop', 280, 0.85, 'Bone-in chop'],
    ['food_pork_roast',         'cat_pork', 'Pork Roast',            'weight', 200, 85, 0, 0, 25, 0, null, null, null, 0.75, '25% cooking loss'],
    ['food_sausages',           'cat_pork', 'Sausages',              'pieces', 120, 90, 0, 0, 10, 0, null, 'sausage', 90, 0.65, 'Average 90g sausage'],
    // Lamb
    ['food_lamb_chops',         'cat_lamb', 'Lamb Chops',            'pieces', 200, 65, 30, 0, 10, 5, null, 'chop', 220, 1.80, 'Bone-in chop'],
    ['food_leg_of_lamb',        'cat_lamb', 'Leg of Lamb',           'whole',  220, 70, 25, 0, 15, 5, 2200, 'leg', 2200, 1.30, 'Bone-in; ~70% edible'],
    // Fish
    ['food_salmon_fillet',      'cat_fish', 'Salmon Fillet',         'weight', 200, 95, 0, 0, 10, 5, null, null, null, 1.80, 'Skinless fillet; minimal waste'],
    ['food_salmon_whole',       'cat_fish', 'Whole Salmon',          'whole',  180, 45, 10, 0, 5, 40, 2500, 'whole fish', 2500, 1.00, 'Head, bones, skin ~55% of weight'],
    ['food_cod_fillet',         'cat_fish', 'Cod Fillet',            'weight', 200, 95, 0, 0, 10, 5, null, null, null, 1.40, 'Skinless fillet'],
    ['food_sea_bass_whole',     'cat_fish', 'Whole Sea Bass',        'whole',  170, 45, 10, 0, 5, 40, 600, 'fish', 600, 1.20, '~45% edible; head, bones, skin'],
    ['food_tuna_steak',         'cat_fish', 'Tuna Steak',            'weight', 200, 92, 0, 0, 5, 3, null, null, null, 2.00, 'Trimmed steak'],
    ['food_sardines_whole',     'cat_fish', 'Sardines (whole)',      'pieces', 120, 70, 10, 0, 0, 20, null, 'sardine', 80, 0.60, 'Whole grilled; bones edible when small'],
    // Seafood
    ['food_shrimp_raw',         'cat_seafood', 'Shrimp / Prawns',    'weight', 200, 60, 0, 35, 5, 5, null, null, null, 1.50, '35% shell; buy raw shell-on weight'],
    ['food_crab_whole',         'cat_seafood', 'Whole Crab',         'whole',  200, 25, 0, 70, 0, 5, 700, 'crab', 700, 1.00, '~25% edible meat; 70% shell'],
    ['food_lobster_whole',      'cat_seafood', 'Whole Lobster',      'whole',  250, 30, 0, 65, 0, 5, 500, 'lobster', 500, 3.00, '~30% edible meat'],
    ['food_mussels',            'cat_seafood', 'Mussels',            'weight', 200, 25, 0, 70, 10, 5, null, null, null, 0.50, '~25% edible meat; buy live weight'],
    ['food_clams',              'cat_seafood', 'Clams',              'weight', 150, 20, 0, 75, 10, 5, null, null, null, 0.70, '~20% edible meat'],
    ['food_octopus',            'cat_seafood', 'Octopus',            'weight', 200, 85, 0, 0, 30, 5, null, null, null, 1.20, '30% cooking shrinkage'],
    // Pizza
    ['food_pizza_medium',       'cat_pizza', 'Pizza (Medium 30cm)',  'slices', 120, 100, 0, 0, 0, 0, 550, 'pizza', 550, 0.60, '8 slices per medium pizza; ~70g per slice'],
    ['food_pizza_large',        'cat_pizza', 'Pizza (Large 36cm)',   'slices', 120, 100, 0, 0, 0, 0, 850, 'pizza', 850, 0.55, '10 slices per large pizza'],
    // Sushi
    ['food_sushi_maki',         'cat_sushi', 'Sushi / Maki Rolls',  'pieces', 25, 100, 0, 0, 0, 0, null, 'piece', 25, 0.70, '~25g per piece'],
    ['food_sushi_nigiri',       'cat_sushi', 'Nigiri',              'pieces', 35, 100, 0, 0, 0, 0, null, 'piece', 35, 0.90, '~35g per nigiri'],
    // Pasta
    ['food_pasta_dry',          'cat_pasta', 'Pasta (dry)',          'weight', 90, 100, 0, 0, 0, 0, null, null, null, 0.20, '90g dry ≈ 220g cooked; doubles in weight'],
    ['food_pasta_fresh',        'cat_pasta', 'Pasta (fresh)',        'weight', 130, 100, 0, 0, 20, 0, null, null, null, 0.50, 'Fresh pasta; higher serving weight'],
    // Rice
    ['food_rice_dry',           'cat_rice', 'Rice (dry/uncooked)',   'weight', 75, 100, 0, 0, 0, 0, null, null, null, 0.15, '75g dry ≈ 220g cooked; triples in weight'],
    ['food_rice_cooked',        'cat_rice', 'Rice (cooked)',         'weight', 220, 100, 0, 0, 0, 0, null, null, null, 0.10, 'Cooked weight per serving'],
    // Salads
    ['food_green_salad',        'cat_salad', 'Green Salad',          'weight', 100, 90, 0, 0, 0, 10, null, null, null, 0.40, '10% trim waste'],
    ['food_caesar_salad',       'cat_salad', 'Caesar Salad',         'weight', 180, 95, 0, 0, 0, 5, null, null, null, 0.55, 'Prepared with dressing'],
    ['food_grain_salad',        'cat_salad', 'Grain / Quinoa Salad', 'weight', 200, 100, 0, 0, 0, 0, null, null, null, 0.60, 'Prepared salad weight'],
    // Desserts
    ['food_cake_slice',         'cat_desserts', 'Cake',              'pieces', 120, 100, 0, 0, 0, 0, null, 'slice', 120, 0.80, 'Standard slice ~120g'],
    ['food_ice_cream',          'cat_desserts', 'Ice Cream',         'weight', 100, 100, 0, 0, 0, 0, null, 'scoop', 80, 0.50, '~80g per scoop'],
    ['food_fruit_tart',         'cat_desserts', 'Fruit Tart',        'pieces', 100, 95, 0, 0, 0, 5, null, 'piece', 100, 0.90, null],
    // Bread
    ['food_bread_loaf',         'cat_bread', 'Bread (loaf)',         'weight', 60, 100, 0, 0, 0, 5, 800, 'loaf', 800, 0.20, '~60g (2 slices) per person'],
    ['food_bread_rolls',        'cat_bread', 'Bread Rolls',          'pieces', 60, 100, 0, 0, 0, 0, null, 'roll', 60, 0.30, '1 roll per person for sides; 2 for mains'],
    // Cheese
    ['food_cheese_board',       'cat_cheese', 'Cheese Board',        'weight', 60, 100, 0, 0, 0, 5, null, null, null, 1.80, 'As a starter/side ~60g; as main ~100g'],
    ['food_cheese_melted',      'cat_cheese', 'Melted / Cooking Cheese', 'weight', 40, 100, 0, 0, 0, 0, null, null, null, 0.90, 'For cooking/topping'],
    // Charcuterie
    ['food_charcuterie_board',  'cat_charcuterie', 'Charcuterie Board',   'weight', 80, 95, 0, 0, 0, 5, null, null, null, 2.00, 'Mixed cured meats'],
    ['food_ham_sliced',         'cat_charcuterie', 'Sliced Ham / Prosciutto', 'weight', 60, 100, 0, 0, 0, 0, null, null, null, 2.50, null],
    // Finger Food
    ['food_spring_rolls',       'cat_finger', 'Spring Rolls',        'pieces', 80, 100, 0, 0, 0, 0, null, 'piece', 60, 0.50, '~3 pieces per person'],
    ['food_chicken_wings',      'cat_finger', 'Chicken Wings',       'pieces', 100, 55, 40, 0, 10, 5, null, 'wing', 80, 0.70, '~55% edible; bone heavy'],
    ['food_mini_sandwiches',    'cat_finger', 'Mini Sandwiches',     'pieces', 60, 100, 0, 0, 0, 0, null, 'piece', 60, 0.60, null],
    // Burgers
    ['food_burger_complete',    'cat_burgers', 'Burger (complete)',  'pieces', 0, 100, 0, 0, 0, 0, null, 'burger', 350, 0.50, 'Full burger with bun ~350g'],
    // Sandwiches
    ['food_sandwich',           'cat_sandwiches', 'Sandwich',        'pieces', 0, 100, 0, 0, 0, 0, null, 'sandwich', 200, 0.45, 'Standard sandwich ~200g'],
    ['food_wrap',               'cat_sandwiches', 'Wrap',            'pieces', 0, 100, 0, 0, 0, 0, null, 'wrap', 220, 0.40, 'Large filled wrap ~220g'],
  ];

  for (const food of foods) {
    insertFood.run(...food);
  }
}
