import React, { useState, useRef, useEffect } from 'react';
import { Pill, ChevronDown, Check, X, Sparkles } from 'lucide-react';

export const COMMON_SEDIAAN_LIST = [
  'Tablet',
  'Sirup',
  'Kapsul',
  'Drop',
  'Kaplet',
  'Salep',
  'Krim',
  'Gel',
  'Injeksi',
  'Suspensi',
  'Dry Syrup',
  'Infus',
  'Suppositoria',
  'Tetes Mata',
  'Tetes Telinga',
  'Larutan',
  'Puyer',
  'Emulsi',
  'Lotion',
  'Sachet',
];

interface BentukSediaanInputProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  onApplyToName?: (sediaan: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showQuickChips?: boolean;
}

export const BentukSediaanInput: React.FC<BentukSediaanInputProps> = ({
  id,
  value = '',
  onChange,
  onApplyToName,
  placeholder = 'Bentuk Sediaan...',
  className = '',
  compact = false,
  showQuickChips = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (sediaan: string) => {
    setInputValue(sediaan);
    onChange(sediaan);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
  };

  // Top 6 most commonly used sediaan for fast 1-click chips
  const quickChips = ['Tablet', 'Sirup', 'Kapsul', 'Drop', 'Salep', 'Krim', 'Injeksi'];

  const getSediaanBadgeColor = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower.includes('sirup') || lower.includes('syrup') || lower.includes('susp')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
    }
    if (lower.includes('tablet') || lower.includes('tab') || lower.includes('kaplet')) {
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40';
    }
    if (lower.includes('kapsul') || lower.includes('cap')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
    }
    if (lower.includes('drop') || lower.includes('tetes')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
    }
    if (lower.includes('salep') || lower.includes('krim') || lower.includes('gel')) {
      return 'bg-pink-500/20 text-pink-300 border-pink-400/40';
    }
    if (lower.includes('inj') || lower.includes('infus')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-400/40';
    }
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input / Trigger Field */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 text-indigo-300/70 pointer-events-none">
          <Pill className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </div>

        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-8 pr-12 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 backdrop-blur-md transition-all ${
            compact ? 'py-1 text-[11px] min-h-[32px]' : 'py-2 text-xs min-h-[38px]'
          } ${inputValue ? 'font-semibold' : ''}`}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded-md transition"
              title="Hapus bentuk sediaan"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-indigo-300 rounded-md transition"
            title="Daftar bentuk sediaan"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick 1-click Chips (if enabled and space allows) */}
      {showQuickChips && (
        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
          <span className="text-[9px] text-slate-400 font-medium mr-0.5 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Cepat:
          </span>
          {quickChips.map((chip) => {
            const isSelected = inputValue.trim().toLowerCase() === chip.toLowerCase();
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleSelect(chip)}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown Options Popup */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-40 w-56 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          <div className="p-2 bg-white/5 border-b border-white/10 text-[10px] font-bold text-indigo-300 flex justify-between items-center">
            <span className="flex items-center gap-1">
              <Pill className="w-3 h-3 text-indigo-400" /> BENTUK SEDIAAN OBAT
            </span>
            <span className="text-[9px] text-slate-400">Bisa ketik manual</span>
          </div>

          <div className="p-1 divide-y divide-white/5">
            {COMMON_SEDIAAN_LIST.map((s) => {
              const isSelected = inputValue.trim().toLowerCase() === s.toLowerCase();
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-200 font-bold'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full border ${getSediaanBadgeColor(s)}`} />
                    <span>{s}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                </button>
              );
            })}
          </div>

          {onApplyToName && inputValue.trim() && (
            <div className="p-2 bg-white/5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onApplyToName(inputValue.trim());
                  setIsOpen(false);
                }}
                className="w-full py-1 px-2 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
              >
                <span>Tambahkan ke Nama Obat: &ldquo;({inputValue.trim()})&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
