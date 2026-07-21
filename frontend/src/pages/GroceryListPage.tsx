import React, { useState, useEffect } from 'react';
import { GroceryListItem } from '../types';
import {
  loadGroceryList,
  toggleGroceryItem,
  removeGroceryItem,
  clearGroceryList,
  clearCheckedItems,
  formatGroceryListAsText,
} from '../utils/groceryList';
import { Button, Card } from '../components/common/UI';

function formatCost(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  if (min === max) return `~£${min.toFixed(2)}`;
  return `£${min.toFixed(2)}–£${max.toFixed(2)}`;
}

export const GroceryListPage: React.FC = () => {
  const [items, setItems] = useState<GroceryListItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setItems(loadGroceryList());
  }, []);

  const handleToggle = (id: string) => {
    setItems(toggleGroceryItem(id));
  };

  const handleRemove = (id: string) => {
    setItems(removeGroceryItem(id));
  };

  const handleClearChecked = () => {
    setItems(clearCheckedItems());
  };

  const handleClearAll = () => {
    if (window.confirm('Clear the entire grocery list?')) {
      clearGroceryList();
      setItems([]);
    }
  };

  const handleCopy = async () => {
    const text = formatGroceryListAsText(items);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: show alert
      window.alert(text);
    }
  };

  const pendingItems = items.filter(i => !i.is_checked);
  const checkedItems = items.filter(i => i.is_checked);

  const totalCostMin = items.reduce((sum, i) => sum + (i.estimated_cost_min ?? 0), 0);
  const totalCostMax = items.reduce((sum, i) => sum + (i.estimated_cost_max ?? 0), 0);
  const hasCostData = items.some(i => i.estimated_cost_min !== null);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Grocery List 🛒</h1>
        <div className="text-center py-16">
          <p className="text-6xl mb-3">🛒</p>
          <p className="text-slate-600 font-medium mb-1">Your grocery list is empty</p>
          <p className="text-slate-400 text-sm">
            Calculate a portion and tap "Add to Grocery List" to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Grocery List 🛒</h1>
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? '✅ Copied!' : '📋 Copy'}
        </Button>
      </div>

      {/* Cost estimate banner */}
      {hasCostData && (
        <Card className="p-3 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-700">Estimated total</p>
            <p className="text-lg font-bold text-emerald-700">
              £{totalCostMin.toFixed(2)}–£{totalCostMax.toFixed(2)}
            </p>
          </div>
          <p className="text-xs text-emerald-600 mt-0.5">Based on typical supermarket prices</p>
        </Card>
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <div className="space-y-2">
          {pendingItems.map(item => (
            <GroceryItemRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Checked items */}
      {checkedItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              In basket ({checkedItems.length})
            </p>
            <button
              onClick={handleClearChecked}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove ticked
            </button>
          </div>
          <div className="space-y-2 opacity-60">
            {checkedItems.map(item => (
              <GroceryItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" size="sm" fullWidth onClick={handleCopy}>
          {copied ? '✅ Copied!' : '📋 Copy list'}
        </Button>
        <Button variant="danger" size="sm" onClick={handleClearAll}>
          🗑️ Clear all
        </Button>
      </div>
    </div>
  );
};

interface GroceryItemRowProps {
  item: GroceryListItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const GroceryItemRow: React.FC<GroceryItemRowProps> = ({ item, onToggle, onRemove }) => {
  const cost = formatCost(item.estimated_cost_min, item.estimated_cost_max);

  return (
    <Card className={`p-3 ${item.is_checked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id)}
          className={[
            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
            item.is_checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-400',
          ].join(' ')}
        >
          {item.is_checked && <span className="text-xs">✓</span>}
        </button>

        {/* Food icon + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{item.food_icon}</span>
            <p className={`text-sm font-medium ${item.is_checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {item.practical_recommendation}
            </p>
          </div>
          {cost && (
            <p className="text-xs text-slate-500 mt-0.5">est. {cost}</p>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Remove item"
        >
          ✕
        </button>
      </div>
    </Card>
  );
};
