import { GroceryListItem, PortionResult } from '../types';

const STORAGE_KEY = 'portioniq_grocery_list';

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadGroceryList(): GroceryListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroceryList(items: GroceryListItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToGroceryList(result: PortionResult): GroceryListItem {
  const items = loadGroceryList();
  const item: GroceryListItem = {
    id: generateId(),
    food_name: result.food_item.name,
    food_icon: result.category.icon ?? '🍽️',
    practical_recommendation: result.practical_recommendation,
    purchase_g: result.total_purchase_g,
    practical_amount: result.practical_amount,
    practical_unit: result.practical_unit,
    estimated_cost_min: result.estimated_cost_min,
    estimated_cost_max: result.estimated_cost_max,
    is_checked: false,
    added_at: new Date().toISOString(),
  };
  saveGroceryList([...items, item]);
  return item;
}

export function toggleGroceryItem(id: string): GroceryListItem[] {
  const items = loadGroceryList().map(item =>
    item.id === id ? { ...item, is_checked: !item.is_checked } : item
  );
  saveGroceryList(items);
  return items;
}

export function removeGroceryItem(id: string): GroceryListItem[] {
  const items = loadGroceryList().filter(item => item.id !== id);
  saveGroceryList(items);
  return items;
}

export function clearGroceryList(): void {
  saveGroceryList([]);
}

export function clearCheckedItems(): GroceryListItem[] {
  const items = loadGroceryList().filter(item => !item.is_checked);
  saveGroceryList(items);
  return items;
}

export function formatGroceryListAsText(items: GroceryListItem[]): string {
  const lines = ['🛒 PortionIQ Grocery List', ''];
  const pending = items.filter(i => !i.is_checked);
  const done = items.filter(i => i.is_checked);

  for (const item of pending) {
    lines.push(`☐ ${item.practical_recommendation}`);
  }
  if (done.length > 0) {
    lines.push('');
    lines.push('Already bought:');
    for (const item of done) {
      lines.push(`☑ ${item.practical_recommendation}`);
    }
  }
  return lines.join('\n');
}
