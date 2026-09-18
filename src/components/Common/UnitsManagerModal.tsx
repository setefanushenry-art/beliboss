import React, { useState, useMemo } from 'react';
import { Package, Plus, Trash2, X, Search, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { DEFAULT_UNITS_LIST, normalizeUnit } from '../../utils/db';
import { AppStateData } from '../../types';

interface UnitsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitsList: string[];
  allDistinctUnits: string[];
  appState?: AppStateData;
  onAddUnit: (unit: string) => void;
  onDeleteUnit: (unit: string) => void;
  onResetUnits: () => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
}

export const UnitsManagerModal: React.FC<UnitsManagerModalProps> = ({
  isOpen,
  onClose,
  unitsList,
  allDistinctUnits,
  appState,
  onAddUnit,
  onDeleteUnit,
  onResetUnits,
  showToast,
}) => {
  const [newUnitInput, setNewUnitInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate usage counts across system
  const usageCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!appState) return map;

    // 1. From master list
    appState.masterList?.forEach((m) => {
      if (m.satuan) {
        const norm = normalizeUnit(m.satuan).toLowerCase();
        map.set(norm, (map.get(norm) || 0) + 1);
      }
    });

    // 2. From rows
    if (appState.rows) {
      Object.values(appState.rows).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((r) => {
            if (r.satuan) {
              const norm = normalizeUnit(r.satuan).toLowerCase();
              map.set(norm, (map.get(norm) || 0) + 1);
            }
          });
        }
      });
    }

    // 3. From usulan obat
    appState.usulanObatList?.forEach((u) => {
      if (u.satuan) {
        const norm = normalizeUnit(u.satuan).toLowerCase();
        map.set(norm, (map.get(norm) || 0) + 1);
      }
    });

    // 4. From defekta
    appState.defektaList?.forEach((d) => {
      if (d.satuan) {
        const norm = normalizeUnit(d.satuan).toLowerCase();
        map.set(norm, (map.get(norm) || 0) + 1);
      }
    });

    return map;
  }, [appState]);

  // Combined list sorted alphabetically
  const mergedUnits = useMemo(() => {
    const set = new Set<string>();
    (unitsList || []).forEach((u) => {
      const n = normalizeUnit(u);
      if (n) set.add(n);
    });
    (allDistinctUnits || []).forEach((u) => {
      const n = normalizeUnit(u);
      if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [unitsList, allDistinctUnits]);

  // Filtered by search query
  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mergedUnits;
    return mergedUnits.filter((u) => u.toLowerCase().includes(q));
  }, [mergedUnits, searchQuery]);

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUnitInput.trim();
    if (!trimmed) return;

    const normalized = normalizeUnit(trimmed);
    if (mergedUnits.some((u) => u.toLowerCase() === normalized.toLowerCase())) {
      showToast(`Satuan "${normalized}" sudah terdaftar di sistem!`, 'info');
      setNewUnitInput('');
      return;
    }

    onAddUnit(normalized);
    setNewUnitInput('');
    showToast(`Satuan "${normalized}" berhasil disimpan dan siap direkomendasikan!`, 'success');
  };

  const handleDelete = (unit: string) => {
    const count = usageCounts.get(unit.toLowerCase()) || 0;
    if (count > 0) {
      if (!window.confirm(`Satuan "${unit}" sedang digunakan oleh ${count} obat / transaksi. Apakah Anda yakin ingin menghapusnya dari daftar master satuan?`)) {
        return;
      }
    }
    onDeleteUnit(unit);
    showToast(`Satuan "${unit}" dihapus dari daftar master satuan.`, 'info');
  };

  const handleReset = () => {
    if (window.confirm('Pulihkan daftar satuan ke standar farmasi Indonesia (Box, Botol, Strip, Tablet, dll)? Satuan kustom akan direset.')) {
      onResetUnits();
      showToast('Daftar satuan berhasil dipulihkan ke standar farmasi!', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Master &amp; Rekomendasi Satuan Obat</h3>
              <p className="text-xs text-slate-400">
                Kelola daftar satuan untuk pengisian otomatis di Usulan SP, Perhitungan, dan Master.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Unit Form */}
        <div className="p-4 sm:p-5 bg-white/5 border-b border-white/10">
          <form onSubmit={handleAddNew} className="flex gap-2">
            <div className="relative flex-1">
              <Package className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={newUnitInput}
                onChange={(e) => setNewUnitInput(e.target.value)}
                placeholder="Ketik nama satuan baru (misal: Vial, Flacon, Supp)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Satuan</span>
            </button>
          </form>
        </div>

        {/* Filter & Stats Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari satuan..."
              className="w-full pl-8 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Total: <strong className="text-indigo-300 font-mono">{mergedUnits.length}</strong> Satuan
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer"
              title="Kembalikan ke 22 satuan standar farmasi"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Units Grid / List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {filteredUnits.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              Tidak ada satuan yang cocok dengan pencarian "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredUnits.map((unit) => {
                const count = usageCounts.get(unit.toLowerCase()) || 0;
                const isDefault = DEFAULT_UNITS_LIST.some(
                  (def) => def.toLowerCase() === unit.toLowerCase()
                );

                return (
                  <div
                    key={unit}
                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/30 transition flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">{unit}</span>
                        {isDefault && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                            Std
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {count > 0 ? `Digunakan di ${count} item` : 'Belum digunakan'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(unit)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title={`Hapus satuan "${unit}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Satuan otomatis disimpan saat Anda mengetik satuan baru di tabel Usulan SP.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
