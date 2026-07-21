import React, { useState } from 'react';
import { CalculatorPage } from './pages/CalculatorPage';
import { HouseholdsPage } from './pages/HouseholdsPage';
import { HistoryPage } from './pages/HistoryPage';
import { GroceryListPage } from './pages/GroceryListPage';
import './App.css';

type Page = 'calculator' | 'households' | 'history' | 'grocery';

function App() {
  const [page, setPage] = useState<Page>('calculator');

  const navItems: { id: Page; emoji: string; label: string }[] = [
    { id: 'calculator', emoji: '🧮', label: 'Calculate' },
    { id: 'households', emoji: '🏠', label: 'Households' },
    { id: 'grocery',    emoji: '🛒', label: 'Grocery' },
    { id: 'history',    emoji: '📋', label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-bold text-emerald-600">PortionIQ</span>
          </div>
          <p className="text-xs text-slate-500">Smart Food Quantities</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {page === 'calculator'  && <CalculatorPage />}
        {page === 'households'  && <HouseholdsPage />}
        {page === 'grocery'     && <GroceryListPage />}
        {page === 'history'     && <HistoryPage />}
      </main>

      {/* Bottom navigation */}
      <nav className="bg-white border-t border-slate-200 sticky bottom-0 safe-bottom">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={[
                'flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors',
                page === item.id
                  ? 'text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              <span className="text-xl mb-0.5">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
