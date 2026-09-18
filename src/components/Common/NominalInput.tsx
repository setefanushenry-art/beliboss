import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, RotateCcw } from 'lucide-react';

interface NominalInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  prefix?: string;
  showPresets?: boolean;
  presetIncrements?: number[];
  size?: 'sm' | 'md' | 'lg';
  autoSelectOnFocus?: boolean;
  min?: number;
  max?: number;
}

export const NominalInput: React.FC<NominalInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
  prefix = 'Rp',
  showPresets = false,
  presetIncrements = [10000, 50000, 100000],
  size = 'md',
  autoSelectOnFocus = true,
  min = 0,
  max,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize display value with prop value when not actively typing or focused
  useEffect(() => {
    if (!isFocused) {
      if (value === 0 || isNaN(value) || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(Math.round(value).toLocaleString('id-ID'));
      }
    }
  }, [value, isFocused]);

  const parseRawValue = (str: string): number => {
    if (!str) return 0;
    // Support shorthand 'k' or 'rb' for thousand (e.g., "15k" => 15000, "1.5k" => 1500)
    let clean = str.trim().toLowerCase();
    let multiplier = 1;

    if (clean.endsWith('jt') || clean.endsWith('m')) {
      multiplier = 1000000;
      clean = clean.replace(/jt|m/g, '');
    } else if (clean.endsWith('k') || clean.endsWith('rb')) {
      multiplier = 1000;
      clean = clean.replace(/k|rb/g, '');
    }

    // Replace thousand dots and handle comma as decimal if needed
    clean = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * multiplier);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setDisplayValue(rawInput);

    const parsedNum = parseRawValue(rawInput);
    const clampedNum = Math.max(min, max !== undefined ? Math.min(max, parsedNum) : parsedNum);
    onChange(clampedNum);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // When focused, show plain number without dots for effortless editing if preferred, or leave as is
    if (value > 0) {
      setDisplayValue(Math.round(value).toString());
    }
    if (autoSelectOnFocus) {
      setTimeout(() => e.target.select(), 10);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsedNum = parseRawValue(displayValue);
    const clamped = Math.max(min, max !== undefined ? Math.min(max, parsedNum) : parsedNum);
    onChange(clamped);
    if (clamped === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(Math.round(clamped).toLocaleString('id-ID'));
    }
  };

  const handleAddPreset = (inc: number) => {
    const newVal = (value || 0) + inc;
    const clamped = Math.max(min, max !== undefined ? Math.min(max, newVal) : newVal);
    onChange(clamped);
    setDisplayValue(Math.round(clamped).toLocaleString('id-ID'));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0);
    setDisplayValue('');
    inputRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'py-1.5 px-2.5 text-xs',
    md: 'py-2 px-3 text-xs',
    lg: 'py-2.5 px-3.5 text-sm',
  };

  return (
    <div className="w-full space-y-1">
      <div className="relative flex items-center group">
        {prefix && (
          <span className="absolute left-2.5 text-slate-400 font-mono font-medium text-[11px] pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-xl font-mono font-bold text-white transition placeholder-slate-500 focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 focus:ring-1 focus:ring-indigo-400/30 backdrop-blur-md ${
            prefix ? 'pl-8' : ''
          } ${value > 0 ? 'pr-7' : 'pr-3'} text-right ${sizeClasses[size]} ${className}`}
        />
        {value > 0 && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
            title="Reset ke 0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Optional Preset Quick Buttons */}
      {showPresets && !disabled && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {presetIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              tabIndex={-1}
              onClick={() => handleAddPreset(inc)}
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 transition cursor-pointer active:scale-95"
            >
              +{inc >= 1000000 ? `${inc / 1000000}jt` : `${inc / 1000}rb`}
            </button>
          ))}
          {value > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onChange(0)}
              className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition cursor-pointer flex items-center gap-0.5"
              title="Reset"
            >
              <RotateCcw className="w-2.5 h-2.5" /> 0
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface PercentageInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPresets?: boolean;
}

export const PercentageInput: React.FC<PercentageInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
  size = 'md',
  showPresets = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      if (value === 0 || isNaN(value) || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(value.toString());
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const clean = raw.replace(',', '.');
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      onChange(clamped);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const clean = displayValue.replace(',', '.');
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      onChange(clamped);
      setDisplayValue(clamped === 0 ? '' : clamped.toString());
    } else {
      onChange(0);
      setDisplayValue('');
    }
  };

  const sizeClasses = {
    sm: 'py-1.5 px-2 text-xs',
    md: 'py-2 px-2.5 text-xs',
    lg: 'py-2.5 px-3 text-sm',
  };

  return (
    <div className="w-full space-y-1">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            setTimeout(() => e.target.select(), 10);
          }}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-xl font-mono font-bold text-amber-300 text-center transition placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:bg-white/10 focus:ring-1 focus:ring-amber-400/30 backdrop-blur-md pr-6 ${sizeClasses[size]} ${className}`}
        />
        <span className="absolute right-2 text-amber-400/80 font-mono font-bold text-xs pointer-events-none">
          %
        </span>
      </div>

      {showPresets && !disabled && (
        <div className="flex flex-wrap items-center justify-center gap-1 pt-0.5">
          {[0, 2.5, 5, 10, 15].map((pct) => (
            <button
              key={pct}
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange(pct);
                setDisplayValue(pct === 0 ? '' : pct.toString());
              }}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition cursor-pointer ${
                value === pct
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
