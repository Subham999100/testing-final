// ============================================================
// Clyptus Job Portal - Searchable World Currency Select Component
// Allows searching currencies by code, name, or symbol.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { WORLD_CURRENCIES, CurrencyItem, getCurrencyInfo } from './currencies';

interface Props {
  value: string;
  onChange: (currencyCode: string) => void;
  disabled?: boolean;
}

export const CurrencySelect: React.FC<Props> = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = getCurrencyInfo(value);

  const filteredCurrencies = WORLD_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.includes(search)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink hover:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50"
      >
        <div className="flex items-center gap-2 font-mono">
          <span className="font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
            {selectedCurrency.symbol}
          </span>
          <span className="font-bold text-ink">{selectedCurrency.code}</span>
          <span className="text-muted font-sans text-[11px] truncate hidden sm:inline">
            - {selectedCurrency.name}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
      </button>

      {/* Searchable Dropdown Popup Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-line rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-line bg-soft">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                autoFocus
                placeholder="Search currency (code, name, symbol)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink placeholder-muted focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto divide-y divide-line/40">
            {filteredCurrencies.map((item) => {
              const isSelected = item.code === selectedCurrency.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    onChange(item.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-soft ${
                    isSelected ? 'bg-orange-50/60 font-semibold text-orange-700' : 'text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 text-center font-mono font-bold text-slate-600 bg-slate-100 rounded px-1">
                      {item.symbol}
                    </span>
                    <span className="font-bold font-mono">{item.code}</span>
                    <span className="text-muted text-[11px] truncate">{item.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                </button>
              );
            })}

            {filteredCurrencies.length === 0 && (
              <div className="p-4 text-center text-xs text-muted">
                No matching currencies found for "{search}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
