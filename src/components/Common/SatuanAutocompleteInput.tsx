import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Package, Search, X, Check, Plus, Settings, Sparkles } from 'lucide-react';
import { DEFAULT_UNITS_LIST, normalizeUnit } from '../../utils/db';

interface SatuanAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSaveUnit?: (newUnit: string) => void;
  unitsList?: string[];
  allDistinctUnits?: string[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onOpenUnitsManager?: () => void;
}

export const SatuanAutocompleteInput: React.FC<SatuanAutocompleteInputProps> = ({
  id,
  value,
  onChange,
  onSaveUnit,
  unitsList = [],
  allDistinctUnits = [],
  placeholder = 'Satuan (Box, Strip, Botol...)',
  className = '',
  compact = false,
  disabled = false,
  autoFocus = false,
  onOpenUnitsManager,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge available units (priority: allDistinctUnits > unitsList > DEFAULT_UNITS_LIST)
  const combinedUnits = useMemo(() => {
    const set = new Set<string>();
    
    // Add distinct units
    allDistinctUnits.forEach((u) => {
      const n = normalizeUnit(u);
      if (n) set.add(n);
    });

    // Add configured unitsList
    unitsList.forEach((u) => {
      const n = normalizeUnit(u);
      if (n) set.add(n);
    });

    // Fallback to default units
    DEFAULT_UNITS_LIST.forEach((u) => {
      const n = normalizeUnit(u);
      if (n) set.add(n);
    });

    return Array.from(set);
  }, [unitsList, allDistinctUnits]);

  // Frequent quick-select units for immediate click
  const quickUnits = useMemo(() => {
    const top = ['Box', 'Botol', 'Strip', 'Tablet', 'Tube', 'Kapsul'];
    return top.filter((t) => combinedUnits.includes(t));
  }, [combinedUnits]);

  // Filtered list based on search term
  const filteredUnits = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return combinedUnits;
    }
    return combinedUnits.filter((u) => u.toLowerCase().includes(q));
  }, [combinedUnits, searchTerm]);

  // Check if current search matches an existing unit exactly
  const exactMatchExists = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return q ? combinedUnits.some((u) => u.toLowerCase() === q) : false;
  }, [combinedUnits, searchTerm]);

  const handleSelect = (unit: string) => {
    const normalized = normalizeUnit(unit);
    onChange(normalized);
    setSearchTerm(normalized);
    setIsOpen(false);

    // Save unit if callback provided
    if (normalized && onSaveUnit) {
      onSaveUnit(normalized);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const hasCustomOption = !exactMatchExists && searchTerm.trim().length > 0;
    const totalOptions = filteredUnits.length + (hasCustomOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredUnits.length) {
        handleSelect(filteredUnits[highlightedIndex]);
      } else if (hasCustomOption && highlightedIndex === filteredUnits.length) {
        handleSelect(searchTerm.trim());
      } else if (searchTerm.trim()) {
        handleSelect(searchTerm.trim());
      } else if (filteredUnits.length > 0) {
        handleSelect(filteredUnits[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Package
          className={`absolute left-2.5 shrink-0 pointer-events-none transition-colors ${
            compact ? 'w-3 h-3 text-indigo-400' : 'w-3.5 h-3.5 text-slate-400'
          }`}
        />
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={searchTerm}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setSearchTerm(nextVal);
            onChange(nextVal);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onBlur={() => {
            // Auto-save and format on blur if changed
            const trimmed = searchTerm.trim();
            if (trimmed && trimmed !== value) {
              handleSelect(trimmed);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full font-semibold transition focus:outline-hidden ${
            compact
              ? 'bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-600 rounded px-2 pl-7 py-1 text-xs text-slate-800 placeholder-slate-400'
              : 'bg-white/5 hover:bg-white/10 focus:bg-white/15 border border-white/15 focus:border-indigo-400 rounded-xl px-3 pl-8 py-2 text-xs text-white placeholder-slate-400'
          }`}
        />
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Hapus Satuan"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Autosearch Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl bg-slate-900 border border-indigo-500/40 shadow-2xl backdrop-blur-xl text-left text-xs text-slate-200">
          {/* Quick Frequent Chips Bar */}
          <div className="p-2 border-b border-white/10 bg-slate-950/90 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Search className="w-3 h-3 text-indigo-400" />
                <span>Rekomendasi Satuan</span>
              </span>
              <span className="font-mono text-indigo-300">
                {filteredUnits.length} Satuan
              </span>
            </div>
            {quickUnits.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {quickUnits.map((qu) => (
                  <button
                    key={qu}
                    type="button"
                    onClick={() => handleSelect(qu)}
                    className="px-2 py-0.5 bg-white/10 hover:bg-indigo-600/60 text-slate-200 hover:text-white rounded-md text-[10px] font-bold transition cursor-pointer border border-white/10 hover:border-indigo-400/40"
                  >
                    {qu}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ul ref={listRef} className="py-1 divide-y divide-white/5">
            {filteredUnits.map((unit, idx) => {
              const isSelected = value && unit.toLowerCase() === value.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={unit}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(unit)}
                  className={`px-3 py-1.5 cursor-pointer transition flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-indigo-600/30 text-white'
                      : isSelected
                      ? 'bg-indigo-500/15 text-indigo-200 font-bold'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="font-bold text-xs">{unit}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  )}
                </li>
              );
            })}

            {/* Custom Unit Option: auto-save & use */}
            {!exactMatchExists && searchTerm.trim().length > 0 && (
              <li
                onMouseEnter={() => setHighlightedIndex(filteredUnits.length)}
                onClick={() => handleSelect(searchTerm.trim())}
                className={`px-3 py-2 cursor-pointer transition flex items-center justify-between gap-2 font-bold text-xs ${
                  highlightedIndex === filteredUnits.length
                    ? 'bg-amber-600/30 text-amber-200'
                    : 'hover:bg-white/5 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Simpan &amp; Gunakan: <strong>"{normalizeUnit(searchTerm.trim())}"</strong>
                  </span>
                </div>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 uppercase shrink-0">
                  Simpan Baru
                </span>
              </li>
            )}
          </ul>

          {/* Footer with settings link */}
          {onOpenUnitsManager && (
            <div className="p-1.5 border-t border-white/10 bg-slate-950/90 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onOpenUnitsManager();
                }}
                className="w-full py-1 text-[11px] text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-1 transition cursor-pointer font-medium"
              >
                <Settings className="w-3 h-3" />
                <span>Kelola Daftar Satuan Farmasi...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
