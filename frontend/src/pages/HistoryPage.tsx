import React, { useState, useEffect } from 'react';
import { MealSession } from '../types';
import { getMealSessions } from '../api';
import { Card, Spinner } from '../components/common/UI';

export const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMealSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const MEAL_EMOJI: Record<string, string> = {
    lunch: '☀️', dinner: '🌙', breakfast: '🌅', snack: '🍎',
    bbq: '🔥', party: '🎉', birthday: '🎂', christmas: '🎄',
    easter: '🐣', picnic: '🧺', office_lunch: '💼', wedding: '💍',
    family_gathering: '👨‍👩‍👧‍👦',
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Meal History 📋</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-6xl mb-3">📭</p>
          <p className="text-slate-600">No meal history yet. Start a calculation to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{MEAL_EMOJI[session.meal_type] ?? '🍽️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {session.practical_recommendation}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {session.meal_type.replace(/_/g, ' ')} ·{' '}
                    {new Date(session.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
                    <span>Confidence: {session.confidence_pct}%</span>
                    {session.guest_count > 0 && <span>+{session.guest_count} guests</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
