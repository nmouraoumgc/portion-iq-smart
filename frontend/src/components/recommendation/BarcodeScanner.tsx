import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { FoodItem, FoodCategory } from '../../types';
import { searchFoodItems } from '../../api';

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_en?: string;
  categories_tags?: string[];
}

interface Props {
  onFoodSelected: (food: FoodItem, category: FoodCategory) => void;
  onClose: () => void;
}

const FOOD_KEYWORD_MAP: Record<string, string> = {
  chicken: 'chicken',
  turkey: 'turkey',
  beef: 'beef',
  pork: 'pork',
  salmon: 'salmon',
  tuna: 'tuna',
  cod: 'cod',
  shrimp: 'shrimp',
  prawn: 'shrimp',
  pasta: 'pasta',
  rice: 'rice',
  pizza: 'pizza',
  burger: 'burger',
  sandwich: 'sandwich',
  sausage: 'sausages',
  lamb: 'lamb',
  salad: 'salad',
  bread: 'bread',
  cheese: 'cheese',
  ham: 'ham',
};

function extractFoodKeyword(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, mapped] of Object.entries(FOOD_KEYWORD_MAP)) {
    if (lower.includes(keyword)) return mapped;
  }
  return null;
}

export const BarcodeScanner: React.FC<Props> = ({ onFoodSelected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'searching' | 'error'>('idle');
  const [barcode, setBarcode] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<FoodItem & { category_name: string; category_icon: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = () => {
    // Stop only the stream owned by this component instance
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    readerRef.current = null;
    setScanning(false);
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    setStatus('scanning');
    setScanning(true);
    setErrorMsg(null);
    setMatches([]);
    setBarcode(null);
    setProductName(null);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Obtain the stream first so we can stop only this instance later
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
        if (result) {
          const code = result.getText();
          setBarcode(code);
          stopScanner();
          await lookupBarcode(code);
        } else if (err && err.name !== 'NotFoundException') {
          stopScanner();
          setStatus('error');
          setErrorMsg('Camera error. Please check permissions.');
        }
      });
    } catch {
      setStatus('error');
      setErrorMsg('Unable to access camera. Please check permissions.');
      setScanning(false);
    }
  };

  const lookupBarcode = async (code: string) => {
    // Validate barcode format: standard barcodes contain only digits, uppercase letters, and hyphens
    // (EAN-13, UPC-A, Code-128, QR codes, etc.). Rejects anything with special chars that
    // could be dangerous when interpolated into a URL path segment.
    if (!/^[\w-]+$/.test(code)) {
      setStatus('found');
      setProductName(null);
      setMatches([]);
      return;
    }
    setStatus('searching');
    try {
      // Look up product in Open Food Facts (free, open-source database)
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`
      );
      const data = await response.json();

      let name: string | null = null;
      if (data.status === 1 && data.product) {
        const product = data.product as OpenFoodFactsProduct;
        name = product.product_name_en || product.product_name || null;
      }

      if (name) {
        setProductName(name);
        const keyword = extractFoodKeyword(name);
        const searchTerm = keyword ?? name.split(' ')[0];
        const results = await searchFoodItems(searchTerm);
        setMatches(results.slice(0, 5));
        setStatus('found');
      } else {
        // Product not in database — let user search manually
        setStatus('found');
        setProductName(null);
        setMatches([]);
      }
    } catch {
      // Network error — let user search manually
      setStatus('found');
      setProductName(null);
      setMatches([]);
    }
  };

  const handleSelect = (food: FoodItem & { category_name: string; category_icon: string }) => {
    const category: FoodCategory = {
      id: food.category_id,
      name: food.category_name,
      icon: food.category_icon,
      description: null,
    };
    onFoodSelected(food, category);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between safe-top">
        <h2 className="font-bold text-slate-800">Scan Barcode 📷</h2>
        <button
          onClick={() => { stopScanner(); onClose(); }}
          className="text-slate-500 hover:text-slate-800 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ display: scanning ? 'block' : 'none' }}
        />
        {!scanning && status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 p-6">
            <span className="text-6xl">📦</span>
            <p className="text-center text-sm opacity-80">
              Point your camera at a barcode to identify packaged food
            </p>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-2 border-emerald-400 rounded-xl opacity-80">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
            </div>
            <p className="absolute bottom-24 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              Align barcode within the frame
            </p>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="bg-white safe-bottom max-h-80 overflow-y-auto">
        {status === 'idle' && (
          <div className="p-4">
            <button
              onClick={startScanner}
              className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              📷 Start scanning
            </button>
          </div>
        )}

        {status === 'scanning' && (
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500">Scanning…</p>
            <button onClick={stopScanner} className="mt-2 text-sm text-red-500">
              Cancel
            </button>
          </div>
        )}

        {status === 'searching' && (
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500">Looking up barcode {barcode}…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-red-500">{errorMsg}</p>
            <button
              onClick={startScanner}
              className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'found' && (
          <div className="p-4 space-y-3">
            {productName ? (
              <p className="text-sm font-medium text-slate-700">
                Found: <span className="text-emerald-600">{productName}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Product not found for barcode {barcode}. Select the closest match:
              </p>
            )}

            {matches.length > 0 ? (
              <div className="space-y-1">
                {matches.map(food => (
                  <button
                    key={food.id}
                    onClick={() => handleSelect(food)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                  >
                    <span className="text-xl">{food.category_icon ?? '🍽️'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{food.name}</p>
                      <p className="text-xs text-slate-500">{food.category_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">
                No matching foods. Try scanning again or browse manually.
              </p>
            )}

            <button
              onClick={startScanner}
              className="w-full text-sm text-emerald-600 font-medium py-2"
            >
              🔄 Scan another barcode
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
