import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, Search, X, Check, Building2, Sparkles, MapPin, Tag } from 'lucide-react';
import { SupplierItem, PriceOfferItem } from '../../types';
import { calculateDrugSimilarity, normalizeDrugName } from '../../utils/bestPriceHelper';

interface PbfAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectSupplier?: (supplier: SupplierItem) => void;
  onSelectOffer?: (offer: { pbf: string; hna: number; diskonPct: number; hpp: number; hargaJadi?: number }) => void;
  onAutoRegisterPbf?: (pbfName: string) => void;
  suppliers: SupplierItem[];
  priceList?: PriceOfferItem[];
  drugName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
}

export const PbfAutocompleteInput: React.FC<PbfAutocompleteInputProps> = ({
  id,
  value,
  onChange,
  onSelectSupplier,
  onSelectOffer,
  onAutoRegisterPbf,
  suppliers = [],
  priceList = [],
  drugName = '',
  placeholder = 'Cari / ketik nama PBF...',
  className = '',
  disabled = false,
  compact = false,
  autoFocus = false,
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

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find offers in priceList for this drug if drugName is provided
  const drugOffersByPbf = useMemo(() => {
    const map = new Map<string, PriceOfferItem>();
    if (!drugName || !priceList || priceList.length === 0) return map;

    const cleanDrug = drugName.trim().toLowerCase();
    const cleanNorm = normalizeDrugName(cleanDrug);

    priceList.forEach((offer) => {
      const offerDrugName = (offer.nama || (offer as any).namaObat || '').trim();
      if (!offerDrugName || offer.hna <= 0) return;

      const offerDrugLower = offerDrugName.toLowerCase();
      const offerNorm = normalizeDrugName(offerDrugLower);

      const isMatch =
        offerDrugLower === cleanDrug ||
        (cleanNorm && offerNorm && cleanNorm === offerNorm) ||
        offerDrugLower.includes(cleanDrug) ||
        cleanDrug.includes(offerDrugLower) ||
        calculateDrugSimilarity(cleanDrug, offerDrugLower) >= 0.65;

      if (isMatch) {
        const pbfKey = (offer.pbf || '').trim().toLowerCase();
        if (pbfKey) {
          const existing = map.get(pbfKey);
          if (!existing || (offer.hpp && existing.hpp && offer.hpp < existing.hpp)) {
            map.set(pbfKey, offer);
          }
        }
      }
    });
    return map;
  }, [drugName, priceList]);

  // Combine known suppliers with any unique PBFs found in priceList
  const combinedSuppliers = useMemo(() => {
    const list: Array<{
      key: string;
      nama: string;
      kode?: string;
      kota?: string;
      item?: SupplierItem;
      hasOffer?: boolean;
      offer?: PriceOfferItem;
    }> = [];

    const seenNames = new Set<string>();

    // 1. Add from suppliers master
    suppliers.forEach((sup) => {
      const nameKey = (sup.nama || '').trim().toLowerCase();
      if (nameKey && !seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        const offer = drugOffersByPbf.get(nameKey) || drugOffersByPbf.get((sup.kode || '').trim().toLowerCase());
        list.push({
          key: sup.id || sup.nama,
          nama: sup.nama,
          kode: sup.kode,
          kota: (sup as any).kota || 'Master',
          item: sup,
          hasOffer: !!offer,
          offer,
        });
      }
    });

    // 2. Add extra PBFs from priceList if not already in suppliers
    priceList.forEach((offer) => {
      const pbfName = (offer.pbf || '').trim();
      const pbfKey = pbfName.toLowerCase();
      if (pbfKey && !seenNames.has(pbfKey)) {
        seenNames.add(pbfKey);
        const drugOffer = drugOffersByPbf.get(pbfKey);
        list.push({
          key: `pricelist-${pbfName}`,
          nama: pbfName,
          kode: (offer as any).pbfKode || pbfName.substring(0, 4).toUpperCase(),
          kota: (offer as any).kota || 'Pricelist',
          hasOffer: !!drugOffer,
          offer: drugOffer,
        });
      }
    });

    return list;
  }, [suppliers, priceList, drugOffersByPbf]);

  // Filtered list based on search term
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      // Sort so suppliers with offers for this drug come first
      return [...combinedSuppliers].sort((a, b) => {
        if (a.hasOffer && !b.hasOffer) return -1;
        if (!a.hasOffer && b.hasOffer) return 1;
        return a.nama.localeCompare(b.nama);
      });
    }

    return combinedSuppliers
      .filter((s) => {
        const matchName = s.nama.toLowerCase().includes(q);
        const matchKode = s.kode ? s.kode.toLowerCase().includes(q) : false;
        const matchKota = s.kota ? s.kota.toLowerCase().includes(q) : false;
        return matchName || matchKode || matchKota;
      })
      .sort((a, b) => {
        if (a.hasOffer && !b.hasOffer) return -1;
        if (!a.hasOffer && b.hasOffer) return 1;
        return 0;
      });
  }, [combinedSuppliers, searchTerm]);

  // Check if current search term is an exact match for one of the suppliers
  const exactMatchExists = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return q ? combinedSuppliers.some((s) => s.nama.toLowerCase() === q) : false;
  }, [combinedSuppliers, searchTerm]);

  const handleSelect = (pbfName: string, supplierItem?: SupplierItem, offer?: PriceOfferItem) => {
    const trimmed = pbfName.trim();
    onChange(trimmed);
    setSearchTerm(trimmed);
    setIsOpen(false);

    // Automatically register new custom PBF to master suppliers if not existing
    if (trimmed && trimmed !== '-' && trimmed.toLowerCase() !== 'n/a' && onAutoRegisterPbf) {
      const isAlreadyInSuppliers = suppliers.some(
        (s) =>
          s.nama.toLowerCase() === trimmed.toLowerCase() ||
          (s.kode && s.kode.toLowerCase() === trimmed.toLowerCase())
      );
      if (!isAlreadyInSuppliers) {
        onAutoRegisterPbf(trimmed);
      }
    }

    if (supplierItem && onSelectSupplier) {
      onSelectSupplier(supplierItem);
    }

    const matchedOffer = offer || drugOffersByPbf.get(trimmed.toLowerCase());
    if (matchedOffer && onSelectOffer) {
      const disc = (matchedOffer as any).diskonPct ?? matchedOffer.diskon ?? 0;
      const hna = matchedOffer.hna;
      const nettoHna = hna - (hna * disc) / 100;
      const hpp = matchedOffer.hpp || Math.round(nettoHna * 1.11);
      onSelectOffer({
        pbf: trimmed,
        hna,
        diskonPct: disc,
        hpp,
        hargaJadi: hpp,
      });
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

    const totalOptions = filteredList.length + (!exactMatchExists && searchTerm.trim() ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredList.length) {
        const chosen = filteredList[highlightedIndex];
        handleSelect(chosen.nama, chosen.item, chosen.offer);
      } else if (!exactMatchExists && searchTerm.trim()) {
        handleSelect(searchTerm.trim());
      } else if (filteredList.length > 0) {
        const chosen = filteredList[0];
        handleSelect(chosen.nama, chosen.item, chosen.offer);
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
        <Truck
          className={`absolute left-2.5 shrink-0 text-slate-400 pointer-events-none ${
            compact ? 'w-3 h-3 text-teal-700' : 'w-3.5 h-3.5 text-slate-400'
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
            const trimmed = searchTerm.trim();
            if (trimmed && trimmed !== value) {
              handleSelect(trimmed);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full font-semibold transition focus:outline-none ${
            compact
              ? 'bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded px-2 pl-7 py-1 text-xs text-slate-800'
              : 'bg-white/5 hover:bg-white/10 focus:bg-white/15 border border-white/15 focus:border-indigo-400 rounded-xl px-3 pl-8 py-2 text-xs text-white'
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
            className="absolute right-2 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            title="Hapus PBF"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Autosearch Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl bg-slate-900 border border-teal-500/40 shadow-2xl backdrop-blur-xl text-left text-xs text-slate-200">
          <div className="p-2 border-b border-white/10 bg-slate-950/80 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-teal-400" />
              <span>Pilih Distributor / PBF</span>
            </span>
            <span className="font-mono text-teal-300">
              {filteredList.length} Ditemukan
            </span>
          </div>

          <ul ref={listRef} className="py-1 divide-y divide-white/5">
            {filteredList.map((item, idx) => {
              const isSelected = value && item.nama.toLowerCase() === value.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={item.key}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(item.nama, item.item, item.offer)}
                  className={`px-3 py-2 cursor-pointer transition flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-teal-600/30 text-white'
                      : isSelected
                      ? 'bg-teal-500/15 text-teal-200'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">
                        {item.nama}
                      </span>
                      {item.kode && (
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 shrink-0">
                          {item.kode}
                        </span>
                      )}
                      {item.kota && item.kota !== '-' && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate shrink-0">
                          <MapPin className="w-2.5 h-2.5 text-slate-500" />
                          {item.kota}
                        </span>
                      )}
                    </div>

                    {/* If this PBF has a price offer for this specific drug in pricelist */}
                    {item.offer && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Penawaran Obat: HNA Rp {Math.round(item.offer.hna).toLocaleString('id-ID')}
                          {((item.offer as any).diskonPct ?? item.offer.diskon) ? ` (Disc ${(item.offer as any).diskonPct ?? item.offer.diskon}%)` : ''}
                          {' -> '}
                          <strong>Jadi: Rp {Math.round(item.offer.hpp).toLocaleString('id-ID')}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-teal-400 shrink-0 ml-1" />
                  )}
                </li>
              );
            })}

            {/* Custom PBF Option if user typed something not matching */}
            {!exactMatchExists && searchTerm.trim() && (
              <li
                onMouseEnter={() => setHighlightedIndex(filteredList.length)}
                onClick={() => handleSelect(searchTerm.trim())}
                className={`px-3 py-2 cursor-pointer transition flex items-center justify-between gap-2 font-bold text-xs ${
                  highlightedIndex === filteredList.length
                    ? 'bg-amber-600/30 text-amber-200'
                    : 'hover:bg-white/5 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Daftarkan &amp; Gunakan PBF: <strong>"{searchTerm.trim()}"</strong>
                  </span>
                </div>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 uppercase shrink-0 font-mono">
                  Auto-Register
                </span>
              </li>
            )}

            {filteredList.length === 0 && !searchTerm.trim() && (
              <li className="px-3 py-4 text-center text-slate-500 italic text-xs">
                Belum ada data PBF terdaftar. Ketik nama PBF baru langsung di sini.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
