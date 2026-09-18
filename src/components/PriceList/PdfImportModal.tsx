import React, { useState } from 'react';
import {
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Percent,
  Calendar,
  Phone,
  Layers,
  ArrowRight,
  X,
  Plus,
  Coins,
  Calculator,
  Boxes,
  Zap,
  Minimize2,
  Maximize2,
  ChevronDown,
  Search,
} from 'lucide-react';
import { ExtractedPdfOffer, PdfParseResult } from '../../utils/pdfPbfParser';
import { MasterDrugItem, PriceOfferItem } from '../../types';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: PdfParseResult | null;
  fileName: string;
  masterList: MasterDrugItem[];
  onConfirmImport: (items: PriceOfferItem[], autoApplyBestPrice?: boolean) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  parseResult,
  fileName,
  masterList,
  onConfirmImport,
  onShowToast,
}) => {
  if (!isOpen || !parseResult) return null;

  const [items, setItems] = useState<ExtractedPdfOffer[]>(parseResult.items);
  const [pbfName, setPbfName] = useState(parseResult.detectedPbf);
  const [docDate, setDocDate] = useState(parseResult.detectedDate);
  const [contact, setContact] = useState(parseResult.detectedContact);
  const [globalDiscount, setGlobalDiscount] = useState<string>('');
  const [globalStock, setGlobalStock] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [autoApplyBestPrice, setAutoApplyBestPrice] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof ExtractedPdfOffer, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate HPP if hna or diskon changed
          if (field === 'hna' || field === 'diskon') {
            const hnaNum = field === 'hna' ? parseFloat(value) || 0 : item.hna;
            const discNum = field === 'diskon' ? parseFloat(value) || 0 : item.diskon;
            const diskonRp = hnaNum * (discNum / 100);
            updated.hpp = Math.round((hnaNum - diskonRp) * 1.11);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Quick Multiplier / Unit Converter for all selected items (e.g. x1.000 for Ribuan, x1.000.000 for Jutaan)
  const handleMultiplyPrices = (factor: number, label: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item;
        const newHna = Math.round(item.hna * factor);
        const diskonRp = newHna * (item.diskon / 100);
        return {
          ...item,
          hna: newHna,
          hpp: Math.round((newHna - diskonRp) * 1.11),
        };
      })
    );
    onShowToast(`Harga obat yang dipilih berhasil dikonversi (${label})!`, 'info');
  };

  // Quick fix for OCR anomaly where leading '1' was prepended (e.g. 114.000 -> 14.000)
  const handleStripLeadingOne = () => {
    let correctedCount = 0;
    setItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item;
        const strHna = Math.round(item.hna).toString();
        // If starts with 1 and has at least 5 digits (e.g. 114000 -> 14000, 115000 -> 15000)
        if (strHna.startsWith('1') && strHna.length >= 5) {
          const stripped = parseFloat(strHna.substring(1)) || item.hna;
          if (stripped > 0) {
            correctedCount++;
            const diskonRp = stripped * (item.diskon / 100);
            return {
              ...item,
              hna: stripped,
              hpp: Math.round((stripped - diskonRp) * 1.11),
            };
          }
        }
        return item;
      })
    );
    onShowToast(`Berhasil mengoreksi ${correctedCount} item dari kesalahan awalan angka "1" OCR!`, 'success');
  };

  // Delete item from list
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Apply global discount to all selected
  const handleApplyGlobalDiscount = () => {
    const discNum = parseFloat(globalDiscount);
    if (isNaN(discNum) || discNum < 0 || discNum > 100) {
      onShowToast('Masukkan nilai diskon valid (0 - 100%)', 'warning');
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item;
        const diskonRp = item.hna * (discNum / 100);
        return {
          ...item,
          diskon: discNum,
          hpp: Math.round((item.hna - diskonRp) * 1.11),
        };
      })
    );
    onShowToast(`Diskon ${discNum}% diterapkan ke semua item yang dipilih!`, 'info');
  };

  // Apply global stock to all selected
  const handleApplyGlobalStock = () => {
    const stockNum = parseInt(globalStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      onShowToast('Masukkan jumlah stok valid (>= 0)', 'warning');
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.selected ? { ...item, stok: stockNum } : item))
    );
    onShowToast(`Stok PBF ${stockNum} diterapkan ke semua item yang dipilih!`, 'info');
  };

  // Apply PBF Name to all selected
  const handleApplyPbfToAll = () => {
    if (!pbfName.trim()) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        pbf: pbfName.trim(),
        kontakPbf: contact.trim(),
      }))
    );
    onShowToast(`Nama PBF "${pbfName}" diperbarui ke semua item!`, 'info');
  };

  // Final confirmation
  const handleSaveToPriceList = (applyBestPriceNow: boolean) => {
    const selectedItems = items.filter((item) => item.selected && item.nama.trim() && item.hna > 0);
    if (selectedItems.length === 0) {
      onShowToast('Pilih setidaknya satu obat dengan harga valid untuk diimpor.', 'warning');
      return;
    }

    const finalOffers: PriceOfferItem[] = selectedItems.map((item) => {
      const matchedMaster = masterList.find(
        (m) => m.nama.toLowerCase().trim() === item.nama.toLowerCase().trim()
      );
      const skuVal = matchedMaster
        ? matchedMaster.sku
        : item.sku || `SKU-PDF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      return {
        id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sku: skuVal,
        nama: item.nama.trim(),
        pbf: pbfName.trim() || item.pbf || 'Distributor PBF',
        hna: item.hna,
        diskon: item.diskon,
        hpp: item.hpp,
        stok: item.stok || 0,
        tglUpdate: docDate || new Date().toISOString().split('T')[0],
        kontakPbf: contact.trim() || item.kontakPbf,
        catatan: item.catatan || `Impor Dokumen PDF (${fileName})`,
      };
    });

    onConfirmImport(finalOffers, applyBestPriceNow);
    onShowToast(
      `Berhasil mengimpor ${finalOffers.length} penawaran harga & stok dari PDF! ${
        applyBestPriceNow ? 'Auto Best-Price diterapkan ke lembar transaksi aktif.' : ''
      }`,
      'success'
    );
    onClose();
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const filteredItems = items.filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.nama.toLowerCase().includes(q) ||
      it.sku.toLowerCase().includes(q) ||
      (it.catatan && it.catatan.toLowerCase().includes(q))
    );
  });

  // MINIMIZED FLOATING PILL / BAR
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-400/60 rounded-2xl shadow-2xl p-3 sm:p-4 text-white flex items-center gap-3 sm:gap-4 animate-slide-up max-w-[95vw] sm:max-w-md">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white truncate">{pbfName || fileName}</h4>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0">
              {items.length} item
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {selectedCount} dipilih &bull; Rp {items.filter(i => i.selected).reduce((a, b) => a + b.hpp, 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-md cursor-pointer transition"
            title="Buka / Maksimalkan kembali jendela impor"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Tutup impor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in overflow-hidden">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl max-w-6xl w-full h-[95vh] sm:max-h-[92vh] flex flex-col text-white shadow-2xl shadow-indigo-950/60 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">Hasil Ekstraksi Dokumen PDF PBF</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Akurasi Tinggi
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full hidden md:flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Auto Best-Price
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                Berkas: <span className="text-indigo-300 font-mono font-bold">{fileName}</span> &bull; Terbaca{' '}
                <span className="text-amber-300 font-bold">{items.length} baris obat</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-amber-300 hover:bg-white/10 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Minimize / Perkecil jendela ini"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Minimize</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* METADATA & QUICK BATCH BAR */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3 text-xs shrink-0">
          {/* PBF Name */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Nama Distributor / PBF</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={pbfName}
                onChange={(e) => setPbfName(e.target.value)}
                placeholder="Contoh: PT. Enseval / PT. APL"
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white font-semibold focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleApplyPbfToAll}
                title="Terapkan nama PBF ini ke semua item"
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-xl font-bold transition text-[10px] cursor-pointer shrink-0"
              >
                Set
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tanggal Penawaran</span>
            </label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kontak / Sales PBF</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="No. Telp / Sales WA"
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-emerald-400 focus:bg-white/10 focus:outline-hidden"
            />
          </div>

          {/* Bulk Discount */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>Diskon Massal (%)</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(e.target.value)}
                placeholder="Misal: 5"
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-bold font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleApplyGlobalDiscount}
                className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl font-bold transition text-[10px] cursor-pointer shrink-0"
              >
                Set
              </button>
            </div>
          </div>

          {/* Bulk Stock */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span>Stok PBF Massal</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                step="1"
                value={globalStock}
                onChange={(e) => setGlobalStock(e.target.value)}
                placeholder="Misal: 50"
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-cyan-300 font-bold font-mono focus:border-cyan-400 focus:bg-white/10 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleApplyGlobalStock}
                className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 rounded-xl font-bold transition text-[10px] cursor-pointer shrink-0"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* TOOLBAR CONTROLS & CONVERSION HELPER & SEARCH */}
        <div className="px-3 sm:px-5 py-2.5 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white font-medium transition cursor-pointer"
            >
              Pilih Semua ({items.length})
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Batal Pilih
            </button>
            <span className="text-slate-400 text-[11px] ml-1">
              <strong className="text-amber-300">{selectedCount}</strong> dipilih
            </span>

            {/* Quick Multiplier Buttons for Unit Scaling & OCR Fix */}
            <div className="flex flex-wrap items-center gap-1 ml-0 sm:ml-2 sm:pl-2 sm:border-l border-white/10">
              <button
                type="button"
                onClick={handleStripLeadingOne}
                title="Koreksi angka yang diawali angka '1' ekstra dari OCR/kolom No (contoh: 114.000 menjadi 14.000)"
                className="px-2 py-0.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/40 rounded-md font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Koreksi &quot;1&quot; Awalan</span>
              </button>
              <button
                type="button"
                onClick={() => handleMultiplyPrices(1000, '×1.000 Ribuan')}
                title="Kalikan harga yang dipilih dengan 1.000 (Jika di PDF tertulis dalam ribuan)"
                className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-md font-bold text-[10px] transition cursor-pointer"
              >
                &times; 1.000
              </button>
              <button
                type="button"
                onClick={() => handleMultiplyPrices(0.001, '÷1.000')}
                title="Bagi harga yang dipilih dengan 1.000"
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-md font-bold text-[10px] transition cursor-pointer"
              >
                &divide; 1.000
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari obat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-hidden w-36 sm:w-48"
              />
            </div>

            <label className="flex items-center gap-1.5 text-indigo-300 text-[11px] sm:text-xs font-semibold cursor-pointer bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-400/20">
              <input
                type="checkbox"
                checked={autoApplyBestPrice}
                onChange={(e) => setAutoApplyBestPrice(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
              />
              <span>Auto Best-Price</span>
            </label>

            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 transition underline cursor-pointer"
            >
              {showRawText ? 'Tutup Teks' : 'Teks PDF'}
            </button>
          </div>
        </div>

        {/* RAW TEXT DRAWER (IF TOGGLED) */}
        {showRawText && (
          <div className="p-3 bg-slate-950 border-b border-white/10 max-h-32 overflow-y-auto text-[11px] font-mono text-slate-300 whitespace-pre-wrap shrink-0">
            {parseResult.rawText}
          </div>
        )}

        {/* TABLE LIST OF EXTRACTED ITEMS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950/90 sticky top-0 z-10 text-slate-300 font-semibold border-b border-white/10 backdrop-blur-md">
              <tr>
                <th className="p-2.5 sm:p-3 text-center w-10">PILIH</th>
                <th className="p-2.5 sm:p-3 text-center w-10">NO</th>
                <th className="p-2.5 sm:p-3 min-w-[180px]">NAMA OBAT & DOSIS</th>
                <th className="p-2.5 sm:p-3 min-w-[90px]">KODE SKU</th>
                <th className="p-2.5 sm:p-3 min-w-[80px] text-center">STOK PBF</th>
                <th className="p-2.5 sm:p-3 min-w-[120px] text-right">HNA SATUAN</th>
                <th className="p-2.5 sm:p-3 min-w-[75px] text-center">DISKON %</th>
                <th className="p-2.5 sm:p-3 min-w-[120px] text-right">HPP (+PPN)</th>
                <th className="p-2.5 sm:p-3 min-w-[80px] text-center">STATUS</th>
                <th className="p-2.5 sm:p-3 text-center w-10">HAPUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Tidak ada baris obat yang cocok.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        item.selected ? 'bg-indigo-500/[0.03]' : 'opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 sm:p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="p-2.5 sm:p-3 text-center text-slate-400 font-mono font-bold text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Nama Obat */}
                      <td className="p-2.5 sm:p-3">
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(e) => handleUpdateItem(item.id, 'nama', e.target.value)}
                          placeholder="Misal: AMOXICILLIN 500mg"
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-bold focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden text-xs"
                        />
                      </td>

                      {/* SKU */}
                      <td className="p-2.5 sm:p-3 font-mono">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-indigo-300 font-mono text-[11px] focus:border-indigo-400 focus:outline-hidden"
                        />
                      </td>

                      {/* Stok PBF */}
                      <td className="p-2.5 sm:p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.stok}
                          onChange={(e) => handleUpdateItem(item.id, 'stok', parseInt(e.target.value, 10) || 0)}
                          className="w-16 mx-auto px-1.5 py-1 bg-white/5 border border-white/10 rounded-lg text-cyan-300 font-mono font-bold text-center focus:border-cyan-400 focus:outline-hidden text-xs"
                        />
                      </td>

                      {/* HNA */}
                      <td className="p-2.5 sm:p-3 text-right">
                        <div className="relative">
                          <input
                            type="number"
                            value={item.hna}
                            onChange={(e) => handleUpdateItem(item.id, 'hna', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-100 font-mono font-bold text-right focus:border-amber-400 focus:outline-hidden text-xs"
                          />
                          <div className="text-[10px] text-amber-300/80 font-mono text-right mt-0.5">
                            Rp {Math.round(item.hna).toLocaleString('id-ID')}
                          </div>
                          {Math.round(item.hna).toString().startsWith('1') && Math.round(item.hna).toString().length >= 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                const strHna = Math.round(item.hna).toString();
                                const stripped = parseFloat(strHna.substring(1)) || item.hna;
                                handleUpdateItem(item.id, 'hna', stripped);
                              }}
                              title="Hapus angka 1 di awal jika kesalahan scan OCR"
                              className="mt-1 px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-400/30 rounded text-[9px] font-bold inline-block cursor-pointer"
                            >
                              &rarr; Rp {Math.round(parseFloat(Math.round(item.hna).toString().substring(1)) || item.hna).toLocaleString('id-ID')}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Diskon */}
                      <td className="p-2.5 sm:p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={item.diskon}
                          onChange={(e) => handleUpdateItem(item.id, 'diskon', parseFloat(e.target.value) || 0)}
                          className="w-14 mx-auto px-1.5 py-1 bg-white/5 border border-white/10 rounded-lg text-amber-300 font-mono font-bold text-center focus:border-amber-400 focus:outline-hidden text-xs"
                        />
                      </td>

                      {/* HPP (+PPN 11%) */}
                      <td className="p-2.5 sm:p-3 text-right font-mono font-extrabold text-white text-xs">
                        Rp {Math.round(item.hpp).toLocaleString('id-ID')}
                      </td>

                      {/* AI Confidence / Status */}
                      <td className="p-2.5 sm:p-3 text-center">
                        {item.confidence === 'high' ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Master SKU
                          </span>
                        ) : (
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] px-2 py-0.5 rounded-full font-medium inline-block">
                            PDF Auto
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-2.5 sm:p-3 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
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

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-300">
            <span>
              Total Nilai Estimasi ({selectedCount} item):{' '}
              <strong className="text-amber-300 font-mono">
                Rp{' '}
                {items
                  .filter((i) => i.selected)
                  .reduce((acc, cur) => acc + cur.hpp, 0)
                  .toLocaleString('id-ID')}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => handleSaveToPriceList(false)}
              disabled={selectedCount === 0}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold rounded-xl border border-white/15 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Impor ke Komparasi Saja</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveToPriceList(autoApplyBestPrice)}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 border border-amber-300/40 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Simpan & Terapkan Best-Price</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
