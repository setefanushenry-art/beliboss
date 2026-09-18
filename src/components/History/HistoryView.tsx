import React, { useState } from 'react';
import {
  History,
  Search,
  FileSpreadsheet,
  Upload,
  Trash2,
  Calendar,
  Building,
  TrendingUp,
  DollarSign,
  Package,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { PurchaseHistoryItem } from '../../types';

interface HistoryViewProps {
  history: PurchaseHistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onClearHistory: () => void;
  onClearCategoryHistory?: (category: 'reguler' | 'prekursor' | 'oot') => void;
  onSaveHistory?: () => void;
  onExportExcel: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNavigateToTransaksi?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onDeleteHistoryItem,
  onDeleteMultipleItems,
  onClearHistory,
  onClearCategoryHistory,
  onSaveHistory,
  onExportExcel,
  onImportExcel,
  onNavigateToTransaksi,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | 'reguler' | 'prekursor' | 'oot'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'all' | 'category' | 'selected';
    title: string;
    message: string;
    count: number;
  }>({
    isOpen: false,
    type: 'all',
    title: '',
    message: '',
    count: 0,
  });
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  const filtered = history.filter((h) => {
    const matchesCat = selectedCat === 'all' || h.kategori === selectedCat;
    const matchesSearch =
      h.nama.toLowerCase().includes(search.toLowerCase()) ||
      (h.sku && h.sku.toLowerCase().includes(search.toLowerCase())) ||
      (h.pbf && h.pbf.toLowerCase().includes(search.toLowerCase())) ||
      (h.noSp && h.noSp.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalPengeluaran = filtered.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalItemsOrdered = filtered.reduce((acc, curr) => acc + (curr.qty || 0), 0);

  // Checkbox handlers
  const isAllSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((item) => item.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open confirmation for Clear All
  const handleOpenClearAllConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'all',
      title: 'Kosongkan Seluruh Riwayat Pembelian',
      message: `Apakah Anda yakin ingin menghapus seluruh ${history.length} data riwayat pembelian secara permanen? Seluruh log audit pengadaan obat akan dikosongkan dan disimpan ke penyimpanan lokal.`,
      count: history.length,
    });
  };

  // Open confirmation for Clear Category
  const handleOpenClearCategoryConfirm = () => {
    if (selectedCat === 'all') return;
    const countInCat = history.filter((h) => h.kategori === selectedCat).length;
    setConfirmModal({
      isOpen: true,
      type: 'category',
      title: `Kosongkan Riwayat Kategori ${selectedCat.toUpperCase()}`,
      message: `Apakah Anda yakin ingin menghapus ${countInCat} riwayat pembelian obat untuk kategori ${selectedCat.toUpperCase()}? Data pada kategori lain tidak akan terpengaruh.`,
      count: countInCat,
    });
  };

  // Open confirmation for Selected items
  const handleOpenDeleteSelectedConfirm = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'selected',
      title: `Hapus ${selectedIds.length} Riwayat Terpilih`,
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} catatan riwayat pembelian yang telah dicentang?`,
      count: selectedIds.length,
    });
  };

  // Execute confirmation
  const handleExecuteConfirm = () => {
    if (confirmModal.type === 'all') {
      onClearHistory();
      setSelectedIds([]);
    } else if (confirmModal.type === 'category' && onClearCategoryHistory && selectedCat !== 'all') {
      onClearCategoryHistory(selectedCat);
      setSelectedIds([]);
    } else if (confirmModal.type === 'selected') {
      if (onDeleteMultipleItems) {
        onDeleteMultipleItems(selectedIds);
      } else {
        selectedIds.forEach((id) => onDeleteHistoryItem(id));
      }
      setSelectedIds([]);
    }
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    triggerSavedFeedback();
  };

  const handleManualSave = () => {
    if (onSaveHistory) {
      onSaveHistory();
    }
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2500);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div id="history-view-container" className="space-y-4">
      {/* 1. METRICS DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md shadow-lg shadow-indigo-500/10">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Total Nilai Pembelian</p>
            <p className="text-lg font-black text-white font-mono">
              Rp {formatCurrency(totalPengeluaran)}
            </p>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-lg shadow-amber-500/10">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Total Kuantitas Obat</p>
            <p className="text-lg font-black text-amber-300 font-mono">{totalItemsOrdered} Box / Unit</p>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="p-3.5 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md shadow-lg shadow-sky-500/10">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Jumlah Transaksi Dicatat</p>
            <p className="text-lg font-black text-sky-300 font-mono">{filtered.length} Entri</p>
          </div>
        </div>
      </div>

      {/* 2. TOP TOOLBAR & ACTIONS */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shadow-2xl">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Cari SKU, riwayat obat, distributor, atau nomor SP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 font-medium backdrop-blur-md transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs backdrop-blur-md shrink-0 overflow-x-auto">
            {(['all', 'reguler', 'prekursor', 'oot'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer whitespace-nowrap ${
                  selectedCat === cat
                    ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls: Kosongkan, Hapus Terpilih, Simpan, Ekspor/Impor */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Selected Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              id="delete-selected-history-btn"
              onClick={handleOpenDeleteSelectedConfirm}
              className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-rose-500/15"
              title={`Hapus ${selectedIds.length} item terpilih`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          {/* Kosongkan Kategori Filter (if active and has items) */}
          {selectedCat !== 'all' && filtered.length > 0 && (
            <button
              id="clear-category-history-btn"
              onClick={handleOpenClearCategoryConfirm}
              className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
              title={`Kosongkan hanya riwayat kategori ${selectedCat.toUpperCase()}`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Kosongkan {selectedCat.toUpperCase()}</span>
            </button>
          )}

          {/* KOSONGKAN SELURUH RIWAYAT BUTTON */}
          {history.length > 0 && (
            <button
              id="clear-all-history-btn"
              onClick={handleOpenClearAllConfirm}
              className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-rose-500/20"
              title="Kosongkan seluruh data riwayat pembelian dan simpan secara permanen"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Kosongkan Riwayat</span>
            </button>
          )}

          {/* SIMPAN RIWAYAT PERMANEN BUTTON */}
          <button
            id="save-history-permanent-btn"
            onClick={handleManualSave}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md border ${
              isSavedFeedback
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105'
                : 'bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-400/40 shadow-md shadow-emerald-600/20'
            }`}
            title="Simpan status riwayat ini secara permanen ke memori lokal & backup"
          >
            {isSavedFeedback ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Tersimpan Permanen!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-200" />
                <span>Simpan Riwayat</span>
              </>
            )}
          </button>

          {/* EKSPOR EXCEL */}
          <button
            id="export-history-excel-btn"
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            title="Ekspor seluruh catatan riwayat ke berkas Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>

          {/* IMPOR RIWAYAT EXCEL */}
          <label
            id="import-history-excel-btn"
            className="px-3.5 py-2 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            title="Impor catatan riwayat dari berkas Excel"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Impor</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={onImportExcel} className="hidden" />
          </label>
        </div>
      </div>

      {/* 3. HISTORY TABLE & EMPTY STATE */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[65vh] scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950/80 backdrop-blur-xl text-slate-200 font-semibold sticky top-0 z-10 border-b border-white/10">
              <tr>
                {/* Select All Checkbox */}
                <th className="p-3 text-center w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={filtered.length === 0}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : isSomeSelected ? (
                      <div className="w-4 h-4 border border-indigo-400 rounded bg-indigo-500/30 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-indigo-300" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-center w-10">NO</th>
                <th className="p-3 min-w-[100px]">TANGGAL</th>
                <th className="p-3 min-w-[95px]">KATEGORI</th>
                <th className="p-3 min-w-[110px]">KODE SKU</th>
                <th className="p-3 min-w-[190px]">NAMA OBAT</th>
                <th className="p-3 min-w-[125px]">DISTRIBUTOR / PBF</th>
                <th className="p-3 text-right min-w-[110px]">HNA</th>
                <th className="p-3 text-center min-w-[75px]">DISKON</th>
                <th className="p-3 text-right min-w-[115px]">HPP (+PPN)</th>
                <th className="p-3 text-center min-w-[70px]">QTY</th>
                <th className="p-3 text-right min-w-[130px]">TOTAL BAYAR</th>
                <th className="p-3 text-center w-12">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-4 py-4">
                      <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400 shadow-xl">
                        <History className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {history.length === 0
                            ? 'Riwayat Pembelian Masih Kosong'
                            : 'Tidak Ada Data Riwayat yang Cocok'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {history.length === 0
                            ? 'Data riwayat pembelian saat ini kosong dan tersimpan bersih. Anda dapat mencatat transaksi dari halaman Beranda (Perhitungan Obat) atau mengimpor riwayat dari file Excel.'
                            : 'Tidak ditemukan transaksi yang cocok dengan kata kunci atau filter kategori yang dipilih.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {onNavigateToTransaksi && (
                          <button
                            onClick={onNavigateToTransaksi}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
                          >
                            <span>Buka Perhitungan Obat</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <label className="px-4 py-2 bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Impor Riwayat Excel</span>
                          <input type="file" accept=".xlsx, .xls, .csv" onChange={onImportExcel} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.05] transition-colors group ${
                        isSelected ? 'bg-indigo-600/10' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(item.id)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{item.tgl}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-md ${
                            item.kategori === 'prekursor'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.kategori === 'oot'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                          }`}
                        >
                          {item.kategori}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-300 text-[11px]">{item.sku || '-'}</td>
                      <td className="p-3 font-bold text-white">
                        <p>{item.nama}</p>
                        {item.noSp && <p className="text-[10px] text-slate-400 font-mono">No. SP: {item.noSp}</p>}
                      </td>
                      <td className="p-3 font-medium text-amber-300">{item.pbf || '-'}</td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        Rp {formatCurrency(item.hna || 0)}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-300">{item.diskon || 0}%</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-300">
                        Rp {formatCurrency(item.hpp || 0)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-xs inline-block backdrop-blur-md">
                          {item.qty || 0}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-white">
                        Rp {formatCurrency(item.total || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onDeleteHistoryItem(item.id)}
                          className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                          title="Hapus baris riwayat ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR CLEARING HISTORY */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{confirmModal.title}</h3>
                <p className="text-[11px] text-rose-300/80">Tindakan ini permanen</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Penyimpanan Aman</span>
              </div>
              <p className="text-[11px]">
                Setelah dikosongkan, perubahan akan otomatis disimpan ke memori penyimpanan lokal sehingga data tidak akan muncul kembali saat dimuat ulang.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Kosongkan Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
