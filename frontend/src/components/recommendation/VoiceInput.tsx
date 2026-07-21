import React, { useState, useRef } from 'react';
import { FoodItem, FoodCategory } from '../../types';
import { searchFoodItems } from '../../api';

interface VoiceMatch {
  food: FoodItem & { category_name: string; category_icon: string };
}

interface Props {
  onFoodSelected: (food: FoodItem, category: FoodCategory) => void;
}

// Extend window type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export const VoiceInput: React.FC<Props> = ({ onFoodSelected }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matches, setMatches] = useState<VoiceMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const SpeechRecognitionCtor = getSpeechRecognition();
  const isSupported = SpeechRecognitionCtor !== null;

  const handleVoiceStart = () => {
    if (!SpeechRecognitionCtor) return;
    setError(null);
    setMatches([]);
    setTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      await handleSearch(text);
    };

    recognition.onerror = () => {
      setListening(false);
      setError('Microphone error. Please check permissions and try again.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const handleVoiceStop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleSearch = async (text: string) => {
    // Extract food keyword — strip words like "for", "people", numbers
    const cleaned = text
      .replace(/\b(for|people|person|persons|of|some|buy|get|need|want)\b/gi, '')
      .replace(/\b\d+\b/g, '')
      .trim();

    if (!cleaned) return;
    setSearching(true);
    try {
      const results = await searchFoodItems(cleaned);
      setMatches(results.slice(0, 5).map(food => ({ food })));
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (match: VoiceMatch) => {
    const category: FoodCategory = {
      id: match.food.category_id,
      name: match.food.category_name,
      icon: match.food.category_icon,
      description: null,
    };
    onFoodSelected(match.food, category);
    setMatches([]);
    setTranscript('');
  };

  if (!isSupported) return null;

  return (
    <div className="space-y-2">
      {/* Voice button */}
      <div className="flex items-center gap-3">
        <button
          onClick={listening ? handleVoiceStop : handleVoiceStart}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all',
            listening
              ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700',
          ].join(' ')}
        >
          <span className="text-lg">{listening ? '🔴' : '🎙️'}</span>
          {listening ? 'Listening…' : 'Search by voice'}
        </button>
        {transcript && (
          <p className="text-sm text-slate-500 italic">"{transcript}"</p>
        )}
      </div>

      {/* Search results */}
      {searching && (
        <p className="text-sm text-slate-400 pl-1">Searching…</p>
      )}
      {error && (
        <p className="text-sm text-red-500 pl-1">{error}</p>
      )}
      {matches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 px-4 py-2 border-b border-slate-100">
            Did you mean…
          </p>
          {matches.map(match => (
            <button
              key={match.food.id}
              onClick={() => handleSelect(match)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left border-b border-slate-50 last:border-0"
            >
              <span className="text-xl">{match.food.category_icon ?? '🍽️'}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{match.food.name}</p>
                <p className="text-xs text-slate-500">{match.food.category_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
