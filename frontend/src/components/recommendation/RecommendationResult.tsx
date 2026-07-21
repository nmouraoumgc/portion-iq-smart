import React, { useState } from 'react';
import { PortionResult } from '../../types';
import { Card, Badge, Button } from '../common/UI';
import { saveFeedback } from '../../api';
import { addToGroceryList } from '../../utils/groceryList';

interface Props {
  result: PortionResult;
  sessionId?: string;
  onNewCalculation?: () => void;
}

function confidenceStars(pct: number): string {
  if (pct >= 95) return '★★★★★';
  if (pct >= 85) return '★★★★☆';
  if (pct >= 75) return '★★★☆☆';
  if (pct >= 65) return '★★☆☆☆';
  return '★☆☆☆☆';
}

function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace(/\.0$/, '')} kg`;
  return `${Math.round(g)} g`;
}

export const RecommendationResult: React.FC<Props> = ({ result, sessionId, onNewCalculation }) => {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  const handleFeedback = async (satisfaction: string) => {
    if (!sessionId || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      await saveFeedback(sessionId, { satisfaction });
      setFeedbackSubmitted(true);
    } catch {
      // silently fail
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAddToGroceryList = () => {
    addToGroceryList(result);
    setAddedToList(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Main recommendation card */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="text-center mb-4">
          <p className="text-4xl mb-1">{result.category.icon ?? '🍽️'}</p>
          <h2 className="text-xl font-bold text-slate-800">{result.food_item.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{result.context_note}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            👉 Practical Recommendation
          </p>
          <p className="text-2xl font-bold text-emerald-600">{result.practical_recommendation}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Edible needed</p>
            <p className="font-bold text-slate-800">{formatGrams(result.total_edible_g)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Purchase weight</p>
            <p className="font-bold text-slate-800">{formatGrams(result.total_purchase_g)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Expected leftover</p>
            <p className="font-bold text-slate-800">
              {result.expected_leftover_g > 50
                ? formatGrams(result.expected_leftover_g)
                : 'Very little'}
            </p>
          </div>
        </div>

        {/* Cost estimate */}
        {result.estimated_cost_min !== null && result.estimated_cost_max !== null && (
          <div className="mt-3 bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">💰 Estimated cost</p>
              <p className="font-bold text-slate-800">
                £{result.estimated_cost_min.toFixed(2)}–£{result.estimated_cost_max.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Approximate supermarket price</p>
          </div>
        )}

        {/* Add to grocery list */}
        <div className="mt-3">
          <button
            onClick={handleAddToGroceryList}
            disabled={addedToList}
            className={[
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all',
              addedToList
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50',
            ].join(' ')}
          >
            {addedToList ? '✅ Added to Grocery List' : '🛒 Add to Grocery List'}
          </button>
        </div>
      </Card>

      {/* Confidence meter */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Confidence</p>
            <p className="text-2xl text-yellow-400">{confidenceStars(result.confidence_pct)}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{result.confidence_pct}%</p>
            <p className="text-xs text-slate-500">
              {result.confidence_pct >= 90 ? 'Very confident' :
               result.confidence_pct >= 80 ? 'Confident' :
               result.confidence_pct >= 70 ? 'Fairly confident' : 'Low confidence'}
            </p>
          </div>
        </div>
        <div className="mt-2 bg-slate-100 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${result.confidence_pct}%` }}
          />
        </div>
        {result.confidence_pct < 80 && (
          <p className="text-xs text-slate-500 mt-2">
            💡 Add weight, age, and appetite data to improve accuracy.
          </p>
        )}
      </Card>

      {/* Per-person breakdown */}
      {result.per_person_breakdown.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-semibold text-slate-800">Per-person breakdown</span>
            <span className="text-slate-400 text-lg">{showBreakdown ? '▲' : '▼'}</span>
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2">
              {result.per_person_breakdown.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatGrams(p.edible_g)}</p>
                    <p className="text-xs text-slate-400">edible portion</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Food info note */}
      {result.food_item.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-700">ℹ️ {result.food_item.notes}</p>
        </div>
      )}

      {/* Edible yield info */}
      {(result.food_item.bone_pct > 0 || result.food_item.shell_pct > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">🦴 Edible yield calculation</p>
          <div className="space-y-1">
            {result.food_item.bone_pct > 0 && (
              <p className="text-xs text-amber-700">Bone/non-edible: ~{result.food_item.bone_pct}%</p>
            )}
            {result.food_item.shell_pct > 0 && (
              <p className="text-xs text-amber-700">Shell/waste: ~{result.food_item.shell_pct}%</p>
            )}
            {result.food_item.cooking_loss_pct > 0 && (
              <p className="text-xs text-amber-700">Cooking loss: ~{result.food_item.cooking_loss_pct}%</p>
            )}
            <p className="text-xs font-medium text-amber-800">
              Net edible yield: ~{result.food_item.edible_yield_pct}%
            </p>
          </div>
        </div>
      )}

      {/* Feedback section */}
      {sessionId && !feedbackSubmitted && (
        <Card className="p-4">
          <p className="font-semibold text-slate-800 mb-3">After the meal, how did it go?</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['not_enough', '😕', 'Not enough'],
              ['just_right', '😊', 'Just right!'],
              ['too_much', '😅', 'Too much'],
            ] as [string, string, string][]).map(([val, emoji, label]) => (
              <button
                key={val}
                onClick={() => handleFeedback(val)}
                disabled={feedbackLoading}
                className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs text-slate-600 mt-1">{label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {feedbackSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-sm font-medium text-emerald-700">
            ✅ Thanks! Your feedback helps improve future recommendations.
          </p>
        </div>
      )}

      {onNewCalculation && (
        <Button variant="secondary" fullWidth onClick={onNewCalculation}>
          ← New calculation
        </Button>
      )}
    </div>
  );
};
