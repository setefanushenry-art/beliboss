import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image,
  Printer,
  RotateCcw,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Edit3,
  Check,
  Plus,
  Trash2,
  Copy,
  Sliders,
  Sparkles,
  RefreshCw,
  Truck,
  Eye,
  FileCode,
  Zap,
  Tag,
  Clock,
  Package,
  PackagePlus,
  X,
  History as HistoryIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppStateData, DrugCalculationRow, DrugCategory, MasterDrugItem, PharmacyProfile, PriceOfferItem, PurchaseHistoryItem, SupplierItem } from '../../types';
import { generateSKU } from '../../utils/db';
import { findBestPriceForDrug, calculateDrugSimilarity, findLastPurchaseInfo, getEffectiveHistoryInfo, LastPurchaseOption } from '../../utils/bestPriceHelper';
import { PbfAutocompleteInput } from '../Common/PbfAutocompleteInput';
import { SatuanAutocompleteInput } from '../Common/SatuanAutocompleteInput';

interface UsulanViewProps {
  category: DrugCategory;
  rows: DrugCalculationRow[];
  diskonCOD: number;
  settings: AppStateData['settings'];
  activePharmacy?: PharmacyProfile;
  suppliers?: SupplierItem[];
  priceList?: PriceOfferItem[];
  history?: PurchaseHistoryItem[];
  masterList?: MasterDrugItem[];
  unitsList?: string[];
  allDistinctUnits?: string[];
  targetPbf?: string;
  onUpdateTargetPbf?: (pbf: string) => void;
  onApplyTargetPbfToAllRows?: (pbf: string) => void;
  onSaveUnit?: (unit: string) => void;
  onAutoRegisterPbf?: (pbfName: string) => void;
  onOpenUnitsManager?: () => void;
  onApplyAllBestPrices?: () => void;
  onUpdateRow?: (id: string, field: keyof DrugCalculationRow, value: any) => void;
  onAddRow?: () => void;
  onRemoveRow?: (id: string) => void;
  onDuplicateRow?: (row: DrugCalculationRow) => void;
  onExportExcel: () => void;
  onExportPDF: (orientation: 'portrait' | 'landscape') => void;
  onExportPNG: (orientation: 'portrait' | 'landscape') => void;
  onPrint: () => void;
  onResetSheet: () => void;
  onCommitHistory: () => void;
  lastSavedTime?: string;
  isAutosaving?: boolean;
  onRecoverSession?: () => void;
  hasSessionDraft?: boolean;
}

export const UsulanView: React.FC<UsulanViewProps> = ({
  category,
  rows,
  diskonCOD,
  settings,
  activePharmacy,
  suppliers = [],
  priceList = [],
  history = [],
  masterList = [],
  unitsList = [],
  allDistinctUnits = [],
  targetPbf = '',
  onUpdateTargetPbf,
  onApplyTargetPbfToAllRows,
  onSaveUnit,
  onAutoRegisterPbf,
  onOpenUnitsManager,
  onApplyAllBestPrices,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onDuplicateRow,
  onExportExcel,
  onExportPDF,
  onExportPNG,
  onPrint,
  onResetSheet,
  onCommitHistory,
  lastSavedTime,
  isAutosaving,
  onRecoverSession,
  hasSessionDraft,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isManualEditMode, setIsManualEditMode] = useState<boolean>(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Modal State for inspecting / choosing / manually editing purchase history (Riwayat, Master, Pricelist, or Manual)
  const [selectedHistoryRow, setSelectedHistoryRow] = useState<DrugCalculationRow | null>(null);
  const [manualHistoryHargaInput, setManualHistoryHargaInput] = useState<string>('');
  const [manualTanggalInput, setManualTanggalInput] = useState<string>('');
  const [manualPbfInput, setManualPbfInput] = useState<string>('');

  // In read mode, filter rows with beli > 0 or minta > 0 or has name; in manual edit mode, show all rows with name or empty editable slots
  const validRows = isManualEditMode
    ? rows
    : rows.filter((r) => r.nama && (r.beli > 0 || r.minta > 0));

  // Inline edit state for PBF Tujuan Order directly on document header card
  const [isEditingHeaderPbf, setIsEditingHeaderPbf] = useState<boolean>(false);

  // Automatically analyze the dominant/most frequent PBF distributor from items in this requisition
  const dominantPbfInfo = useMemo(() => {
    const counts: Record<string, number> = {};
    validRows.forEach((r) => {
      const last = findLastPurchaseInfo(r, history, masterList, priceList);
      const rowPbf = (r.pbfTerakhir && r.pbfTerakhir !== '-' ? r.pbfTerakhir : '') ||
                     (r.pbf && r.pbf !== '-' ? r.pbf : '') ||
                     (last.pbf && last.pbf !== '-' ? last.pbf : '');
      const trimmed = rowPbf.trim();
      if (trimmed && trimmed !== '-') {
        counts[trimmed] = (counts[trimmed] || 0) + 1;
      }
    });
    let topPbf = '';
    let topCount = 0;
    Object.entries(counts).forEach(([pbf, count]) => {
      if (count > topCount) {
        topCount = count;
        topPbf = pbf;
      }
    });
    return {
      pbf: topPbf,
      count: topCount,
      allPbfs: Object.keys(counts),
    };
  }, [validRows, history, masterList, priceList]);

  const handleOpenHistoryModal = (row: DrugCalculationRow) => {
    const eff = getEffectiveHistoryInfo(row, history, masterList, priceList);

    setSelectedHistoryRow(row);
    setManualHistoryHargaInput(eff.isHistHargaEmpty || eff.effectiveHistHarga <= 0 ? '' : String(eff.effectiveHistHarga));
    setManualTanggalInput(eff.isTglEmpty || eff.effectiveTglBeli === '-' ? '' : eff.effectiveTglBeli);
    setManualPbfInput(eff.isPbfEmpty || eff.effectivePbfTerakhir === '-' ? '' : eff.effectivePbfTerakhir);
  };

  // Count available best-price optimizations across rows
  let betterPriceCount = 0;
  if (priceList.length > 0) {
    rows.forEach((r) => {
      if (r.nama && r.nama.trim().length > 1) {
        const best = findBestPriceForDrug(r.nama, priceList, r.hna, r.diskonPct, r.pbf);
        if (best) betterPriceCount++;
      }
    });
  }

  // Helper to format currency with two decimal places (e.g. 147.630,00)
  const formatPrice2Dec = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    return Number(val).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Two-way synchronization helpers:
  // When user edits Harga Jadi directly -> immediately recalculates Subtotal and derives HNA
  const handleHargaJadiChange = (row: DrugCalculationRow, newHargaJadi: number) => {
    const isPpn = row.includePpn !== false;
    const discPct = row.diskonPct || 0;
    const discFactor = (100 - discPct) / 100;
    const divisor = (isPpn ? 1.11 : 1.0) * (discFactor > 0 ? discFactor : 1.0);
    const newHna = divisor > 0 ? newHargaJadi / divisor : newHargaJadi;

    const roundedHJ = Math.round(newHargaJadi * 100) / 100;
    const roundedHna = Math.round(newHna * 100) / 100;
    const roundedHnaPlusPpn = Math.round((isPpn ? newHna * 1.11 : newHna) * 100) / 100;

    (onUpdateRow as any)?.(row.id, {
      hargaJadi: roundedHJ,
      hna: roundedHna,
      hnaPlusPpn: roundedHnaPlusPpn,
    });
  };

  // When user edits Sub Total directly -> immediately recalculates Harga Jadi (Sub Total / Qty) and syncs
  const handleSubtotalChange = (row: DrugCalculationRow, newSubtotal: number) => {
    const qty = row.beli && row.beli > 0 ? row.beli : 1;
    const newHargaJadi = Math.round((newSubtotal / qty) * 100) / 100;
    handleHargaJadiChange(row, newHargaJadi);
  };

  // Toggle PPN 11% vs Non-PPN (Harga Jadi langsung)
  const handleTogglePpn = (row: DrugCalculationRow) => {
    const currentIsPpn = row.includePpn !== false;
    const nextIsPpn = !currentIsPpn;

    // Calculate current effective hargaJadi to keep it rock-solid stable
    const discPct = row.diskonPct || 0;
    const discFactor = (100 - discPct) / 100;
    const diskonRp = (row.hna || 0) * (discPct / 100);
    const nettoHna = (row.hna || 0) - diskonRp;
    const currentHargaJadi = row.hargaJadi && row.hargaJadi > 0 ? row.hargaJadi : (currentIsPpn ? nettoHna * 1.11 : nettoHna);
    const roundedHJ = Math.round(currentHargaJadi * 100) / 100;

    if (!nextIsPpn) {
      // Switched to Non-PPN (Harga Jadi): HNA = currentHargaJadi / discFactor
      const newHna = discFactor > 0 ? Math.round((roundedHJ / discFactor) * 100) / 100 : roundedHJ;
      (onUpdateRow as any)?.(row.id, {
        includePpn: nextIsPpn,
        hargaJadi: roundedHJ,
        hna: newHna,
        hnaPlusPpn: roundedHJ,
      });
    } else {
      // Switched to PPN 11%: HNA = (currentHargaJadi / 1.11) / discFactor
      const divisor = 1.11 * (discFactor > 0 ? discFactor : 1.0);
      const newHna = Math.round((roundedHJ / divisor) * 100) / 100;
      (onUpdateRow as any)?.(row.id, {
        includePpn: nextIsPpn,
        hargaJadi: roundedHJ,
        hna: newHna,
        hnaPlusPpn: Math.round(newHna * 1.11 * 100) / 100,
      });
    }
  };

  let grandTotal = 0;
  validRows.forEach((r) => {
    const isPpn = r.includePpn !== false;
    const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
    const nettoHna = (r.hna || 0) - diskonRp;
    const hargaJadi = r.hargaJadi && r.hargaJadi > 0 ? r.hargaJadi : (isPpn ? nettoHna * 1.11 : nettoHna);
    grandTotal += hargaJadi * (r.beli || 0);
  });

  const codDiscountRp = grandTotal * ((diskonCOD || 0) / 100);
  const finalTotal = grandTotal - codDiscountRp;

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Effective Pharmacy Data
  const effectivePharmacyName = activePharmacy?.namaApotek || settings.namaApotek || 'APOTEK SEHAT SEJAHTERA';
  const effectiveAddress = activePharmacy?.alamatApotek || settings.alamatApotek || 'Jl. Farmasi Raya No. 88';
  const effectiveSipa = activePharmacy?.sipaNo || settings.sipaNo || '19920101/SIPA_32.73/2023/2001';
  const effectivePharmacist = activePharmacy?.namaApoteker || settings.namaApoteker || 'apt. Setefanus Henry, S.Farm.';
  const effectiveSia = activePharmacy?.siaNo || settings.siaNo || '-';
  const effectivePhone = activePharmacy?.telepon || settings.teleponApotek || '-';

  return (
    <div className="space-y-4">
      {/* Dynamic print orientation styles */}
      <style>{`
        @media print {
          @page {
            size: ${orientation};
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          #printable-usulan-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          table {
            width: 100% !important;
          }
        }
      `}</style>

      {/* TOP CONTROL BAR: ORIENTATION TOGGLE & MANUAL EDIT TOGGLE */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 no-print shadow-xl">
        {/* Left: View Orientation Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            Tampilan Dokumen:
          </span>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              id="usulan-orientation-portrait"
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Portrait (Tegak)</span>
            </button>
            <button
              id="usulan-orientation-landscape"
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Landscape (Mendatar)</span>
            </button>
          </div>
        </div>

        {/* Right: Manual Edit Switcher & Row Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onApplyAllBestPrices && (
            <button
              id="usulan-auto-best-price-btn"
              onClick={onApplyAllBestPrices}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 border border-amber-300/30 transition cursor-pointer"
              title="Optimalkan usulan pesanan ke distributor / PBF dengan harga dan diskon termurah"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              <span>Auto Best-Price PBF</span>
              {betterPriceCount > 0 && (
                <span className="bg-amber-300 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {betterPriceCount} Lebih Murah
                </span>
              )}
            </button>
          )}

          {/* Real-time Autosave Indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold select-none"
            title="Autosave Aktif: Setiap kali Anda mengetik di input manual, perubahan langsung tersimpan ke penyimpanan lokal tanpa perlu klik tombol simpan"
          >
            <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isAutosaving ? 'Menyimpan...' : 'Autosave Aktif'}</span>
            {lastSavedTime && (
              <span className="font-mono text-[10px] text-emerald-400/80 font-normal">
                ({lastSavedTime})
              </span>
            )}
          </div>

          {/* Recover Last Session Button */}
          {onRecoverSession && (
            <button
              id="usulan-recover-session-btn"
              onClick={onRecoverSession}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-amber-400/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 cursor-pointer shadow-sm"
              title="Pulihkan draf dokumen harian dari sesi sessionStorage sebelumnya (Recover Last Session)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Recover Last Session</span>
            </button>
          )}

          {/* Kelola Master Satuan Button */}
          {onOpenUnitsManager && (
            <button
              id="usulan-manage-units-btn"
              type="button"
              onClick={onOpenUnitsManager}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-teal-400/30 bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 cursor-pointer shadow-sm"
              title="Buka Manajemen Master Satuan (Kelola, Tambah Satuan Manual, atau Reset)"
            >
              <Tag className="w-3.5 h-3.5 text-teal-400" />
              <span>Kelola Satuan ({unitsList.length})</span>
            </button>
          )}

          {/* Manual Edit Mode Toggle */}
          <button
            id="toggle-manual-edit-btn"
            onClick={() => setIsManualEditMode(!isManualEditMode)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
              isManualEditMode
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isManualEditMode ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Selesai Edit Manual</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-black">
                  AKTIF
                </span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Manual Baris &amp; Kolom</span>
              </>
            )}
          </button>

          {/* If manual mode, show Add Row button */}
          {isManualEditMode && onAddRow && (
            <button
              id="usulan-add-manual-row-btn"
              onClick={() => onAddRow()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
          )}
        </div>
      </div>

      {/* BULK PBF TUJUAN ORDER (MASS INPUT / SELECTOR FOR ENTIRE CATEGORY) */}
      <div className="bg-slate-900/70 backdrop-blur-xl border border-teal-500/30 p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Truck className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-teal-300 uppercase">
                PBF TUJUAN ORDER (DISTRIBUTOR SP)
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-200 border border-teal-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                {category.toUpperCase()}
              </span>
              {(!targetPbf || targetPbf === '-' || targetPbf.trim() === '') ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  Kosong / Sesuai Baris
                </span>
              ) : (
                <span className="text-[10px] bg-teal-500/30 text-teal-100 border border-teal-400/40 px-2 py-0.5 rounded-full font-bold">
                  {targetPbf}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dapat diisi <strong>Otomatis</strong> dari item usulan, diedit <strong>Manual</strong> bebas, atau di-<strong>Kosongkan (-)</strong> untuk pemesanan umum.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Autocomplete / Manual input */}
          <div className="w-full sm:w-64">
            <PbfAutocompleteInput
              value={targetPbf === '-' ? '' : (targetPbf || '')}
              onChange={(val) => onUpdateTargetPbf?.(val.trim() === '' ? '-' : val)}
              onAutoRegisterPbf={onAutoRegisterPbf}
              suppliers={suppliers || []}
              priceList={priceList || []}
              placeholder="Pilih / ketik nama PBF manual..."
              compact={true}
            />
          </div>

          {/* Tombol Otomatis dari Item */}
          {dominantPbfInfo.pbf && (
            <button
              type="button"
              onClick={() => onUpdateTargetPbf?.(dominantPbfInfo.pbf)}
              className="px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              title={`Isi otomatis dengan PBF terbanyak dari baris obat: ${dominantPbfInfo.pbf} (${dominantPbfInfo.count} item)`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Otomatis: {dominantPbfInfo.pbf.length > 15 ? dominantPbfInfo.pbf.slice(0, 14) + '…' : dominantPbfInfo.pbf}</span>
            </button>
          )}

          {/* Tombol Kosongkan (-) */}
          <button
            type="button"
            onClick={() => onUpdateTargetPbf?.('-')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              targetPbf === '-' || !targetPbf || targetPbf.trim() === ''
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border-slate-700 hover:border-rose-500/30'
            }`}
            title="Kosongkan PBF Tujuan Order (tanda strip - / tanpa distributor khusus)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Kosongkan ( - )</span>
          </button>

          {/* Tombol Terapkan ke Semua */}
          <button
            type="button"
            id="apply-pbf-all-rows-btn"
            onClick={() => onApplyTargetPbfToAllRows?.(targetPbf || '-')}
            disabled={validRows.length === 0}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-600/20 shrink-0 cursor-pointer disabled:cursor-not-allowed border border-teal-400/30"
            title="Terapkan nama PBF tujuan ini (atau strip -) ke seluruh baris pemesanan sekaligus"
          >
            <Check className="w-3.5 h-3.5 text-teal-200" />
            <span>Terapkan ke Semua ({validRows.length})</span>
          </button>
        </div>
      </div>

      {/* MANUAL EDIT MODE BANNER */}
      {isManualEditMode && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Edit Manual Aktif:</strong> Anda dapat mengedit langsung nama obat, SKU, pabrik, kemasan, PBF Terakhir, HNA, diskon, stok, dan kuantitas pesan per kolom per baris. Perhitungan total harga dan PPN akan diperbarui secara otomatis.
            </span>
          </div>
          <button
            onClick={() => setIsManualEditMode(false)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 rounded-lg font-bold shrink-0 transition"
          >
            Kunci &amp; Pratinjau
          </button>
        </div>
      )}

      {/* 1. DOCUMENT CONTAINER (PRINTABLE CARD) */}
      <div
        id="printable-usulan-document"
        ref={printRef}
        className={`bg-white text-slate-800 rounded-2xl shadow-2xl p-5 sm:p-7 border border-slate-200 space-y-5 transition-all mx-auto ${
          orientation === 'portrait' ? 'max-w-4xl' : 'w-full'
        }`}
      >
        {/* Document Letterhead / Kop Surat */}
        <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Kolom Kiri: Profil Sarana Apotek */}
          <div className="space-y-1 flex-1 min-w-[220px]">
            <div className="flex items-center gap-2">
              <span className="bg-teal-700 text-white text-[11px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
                USULAN PENGADAAN &bull; {category}
              </span>
              <span className="text-slate-400 text-xs font-mono">DOKUMEN RESMI PENGADAAN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {effectivePharmacyName}
            </h2>
            <p className="text-xs text-slate-600 font-medium">{effectiveAddress}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-mono">
              <span>SIPA: {effectiveSipa}</span>
              <span>&bull;</span>
              <span>Apoteker: {effectivePharmacist}</span>
              {effectivePhone && effectivePhone !== '-' && (
                <>
                  <span>&bull;</span>
                  <span>Telp: {effectivePhone}</span>
                </>
              )}
            </div>
          </div>

          {/* Kolom Tengah: PBF TUJUAN ORDER (BERADA DI TENGAH AGAR LANGSUNG TERLIHAT & MEMANFAATKAN TEMPAT KOSONG) */}
          <div className="flex-1 max-w-sm mx-auto w-full bg-teal-50/95 border-2 border-teal-600/40 rounded-xl p-3 text-center shadow-xs flex flex-col items-center justify-center relative group/pbfbox">
            <div className="flex items-center justify-center gap-1.5 text-teal-800 text-[11px] font-bold uppercase tracking-wider mb-0.5">
              <Truck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>PBF TUJUAN ORDER</span>
              <span className="text-[9px] text-teal-600/80 font-normal no-print">(DISTRIBUTOR)</span>
            </div>

            {isEditingHeaderPbf ? (
              <div className="w-full space-y-2 mt-1 no-print">
                <PbfAutocompleteInput
                  value={targetPbf === '-' ? '' : (targetPbf || '')}
                  onChange={(val) => onUpdateTargetPbf?.(val.trim() === '' ? '-' : val)}
                  onAutoRegisterPbf={onAutoRegisterPbf}
                  suppliers={suppliers || []}
                  priceList={priceList || []}
                  placeholder="Ketik PBF atau kosongkan (-)..."
                  compact={true}
                  autoFocus={true}
                />
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {dominantPbfInfo.pbf && (
                    <button
                      type="button"
                      onClick={() => onUpdateTargetPbf?.(dominantPbfInfo.pbf)}
                      className="px-2 py-0.5 text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-900 rounded font-bold transition border border-teal-300 cursor-pointer"
                      title={`Isi otomatis: ${dominantPbfInfo.pbf}`}
                    >
                      ⚡ Otomatis ({dominantPbfInfo.pbf})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onUpdateTargetPbf?.('-')}
                    className="px-2 py-0.5 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold transition border border-amber-300 cursor-pointer"
                    title="Kosongkan PBF Tujuan (-)"
                  >
                    Kosongkan ( - )
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingHeaderPbf(false)}
                    className="px-2.5 py-0.5 text-[10px] bg-teal-800 hover:bg-teal-900 text-white rounded font-bold transition cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-base sm:text-lg font-black text-teal-950 tracking-tight leading-tight uppercase px-1">
                  {!targetPbf || targetPbf.trim() === '' || targetPbf.trim() === '-' ? '-' : targetPbf.toUpperCase()}
                </div>
                <span className="text-[10px] text-teal-700 font-medium mt-0.5">
                  {!targetPbf || targetPbf.trim() === '' || targetPbf.trim() === '-'
                    ? 'Pemesanan didistribusikan per baris PBF (Tanpa PBF Khusus)'
                    : 'Distributor Resmi Terpilih untuk Pengadaan Ini'}
                </span>

                {/* Quick Interactive Edit Triggers (no-print) */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/pbfbox:opacity-100 transition no-print">
                  <button
                    type="button"
                    onClick={() => setIsEditingHeaderPbf(true)}
                    className="p-1 rounded-md bg-white/90 hover:bg-white text-teal-800 hover:text-teal-900 shadow-xs border border-teal-300 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Edit nama PBF manual"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  {dominantPbfInfo.pbf && targetPbf !== dominantPbfInfo.pbf && (
                    <button
                      type="button"
                      onClick={() => onUpdateTargetPbf?.(dominantPbfInfo.pbf)}
                      className="p-1 rounded-md bg-teal-100/90 hover:bg-teal-200 text-teal-800 shadow-xs border border-teal-300 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      title={`Set otomatis: ${dominantPbfInfo.pbf}`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Otomatis</span>
                    </button>
                  )}
                  {targetPbf && targetPbf !== '-' && (
                    <button
                      type="button"
                      onClick={() => onUpdateTargetPbf?.('-')}
                      className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-xs border border-rose-200 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Kosongkan PBF Tujuan (-)"
                    >
                      <X className="w-3 h-3" />
                      <span>Kosong</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Kolom Kanan: Tanggal Dokumen & Format */}
          <div className="text-right text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0 min-w-[190px]">
            <p className="text-slate-500 font-medium">Tanggal Pembuatan Dokumen:</p>
            <p className="font-bold text-slate-900">{today}</p>
            <p className="text-[11px] text-teal-700 font-bold mt-1 uppercase">Kategori: {category}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Format: {orientation === 'portrait' ? 'Portrait (A4)' : 'Landscape (A4 Lebar)'}
            </p>
          </div>
        </div>

        {/* Table of Requisitions */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-teal-900 text-white font-bold">
              <tr>
                <th className="p-2 text-center w-8 border border-teal-800">NO</th>
                <th className="p-2 min-w-[90px] border border-teal-800">SKU</th>
                <th className="p-2 min-w-[170px] border border-teal-800">NAMA OBAT</th>
                <th className="p-2 min-w-[95px] border border-teal-800">PABRIK</th>
                <th className="p-2 min-w-[105px] border border-teal-800" title="Satuan Kemasan (Box, Strip, Botol, Vial, Ampul, dsb)">
                  SATUAN
                </th>
                <th className="p-2 text-right min-w-[100px] border border-teal-800">HIST. HARGA</th>
                <th className="p-2 text-center min-w-[90px] border border-teal-800">TGL BELI</th>
                <th className="p-2 min-w-[140px] border border-teal-800" title="PBF Terakhir Beli dicari otomatis dari Riwayat Pembelian, Master Obat, atau Pricelist">
                  PBF TERAKHIR BELI
                </th>
                <th className="p-2 text-right min-w-[125px] border border-teal-800">HARGA JADI</th>
                <th className="p-2 text-center min-w-[70px] border border-teal-800">STOK</th>
                <th className="p-2 text-center min-w-[65px] border border-teal-800">PESAN</th>
                <th className="p-2 text-right min-w-[125px] border border-teal-800">SUB TOTAL</th>
                {(isManualEditMode || editingRowId) && (
                  <th className="p-2 text-center w-14 border border-teal-800 no-print">AKSI</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {validRows.length === 0 ? (
                <tr>
                  <td colSpan={isManualEditMode || editingRowId ? 13 : 12} className="p-8 text-center text-slate-400 italic">
                    Belum ada obat dengan kuantitas Pesan &gt; 0 pada kategori {category.toUpperCase()}.
                    <br />
                    <span className="text-xs font-normal text-slate-500">
                      Buka tab Perhitungan Obat atau aktifkan "Edit Manual" untuk menginput data secara langsung.
                    </span>
                  </td>
                </tr>
              ) : (
                validRows.map((r, idx) => {
                  const isPpn = r.includePpn !== false;
                  const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
                  const nettoHna = (r.hna || 0) - diskonRp;
                  const hargaJadi = r.hargaJadi && r.hargaJadi > 0 ? r.hargaJadi : (isPpn ? nettoHna * 1.11 : nettoHna);
                  const subtotal = hargaJadi * (r.beli || 0);
                  const isRowEditing = isManualEditMode || editingRowId === r.id;
                  const {
                    effectiveHistHarga,
                    effectiveTglBeli,
                    effectivePbfTerakhir,
                    isBarangBaru,
                    isHistHargaEmpty,
                    isTglEmpty,
                    isPbfEmpty,
                    lastPurchase,
                  } = getEffectiveHistoryInfo(r, history, masterList, priceList);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      {/* NO */}
                      <td className="p-2 text-center font-bold text-slate-600 border border-slate-200 font-mono">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="p-1.5 font-mono font-bold text-teal-800 text-[11px] border border-slate-200">
                        {isRowEditing ? (
                          <input
                            type="text"
                            value={r.sku || ''}
                            onChange={(e) => onUpdateRow?.(r.id, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px] font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
                          />
                        ) : (
                          r.sku || '-'
                        )}
                      </td>

                      {/* NAMA OBAT */}
                      <td className="p-1.5 font-bold text-slate-900 border border-slate-200">
                        {isRowEditing ? (
                          <input
                            type="text"
                            value={r.nama || ''}
                            onChange={(e) => onUpdateRow?.(r.id, 'nama', e.target.value)}
                            placeholder="Nama Obat"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-bold focus:bg-white focus:border-teal-600 focus:outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{r.nama || '-'}</span>
                            {r.bentukSediaan && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-teal-50 text-teal-800 border border-teal-200 print:border-slate-400 print:text-black">
                                {r.bentukSediaan}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* PABRIK */}
                      <td className="p-1.5 text-slate-600 border border-slate-200">
                        {isRowEditing ? (
                          <input
                            type="text"
                            value={r.pabrik || ''}
                            onChange={(e) => onUpdateRow?.(r.id, 'pabrik', e.target.value)}
                            placeholder="Pabrik"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs focus:bg-white focus:border-teal-600 focus:outline-none"
                          />
                        ) : (
                          r.pabrik || '-'
                        )}
                      </td>

                      {/* SATUAN / KEMASAN (WITH AUTOSEARCH & RECOMMENDATIONS) */}
                      <td className="p-1.5 text-slate-600 border border-slate-200">
                        {isRowEditing ? (
                          <SatuanAutocompleteInput
                            value={r.satuan || r.kemasan || ''}
                            onChange={(val) => {
                              onUpdateRow?.(r.id, 'satuan', val);
                              onUpdateRow?.(r.id, 'kemasan', val);
                            }}
                            onSaveUnit={onSaveUnit}
                            unitsList={unitsList}
                            allDistinctUnits={allDistinctUnits}
                            compact={true}
                            placeholder="Satuan..."
                          />
                        ) : (
                          <div
                            onClick={() => setEditingRowId(r.id)}
                            className="cursor-pointer hover:text-teal-700 font-medium truncate"
                            title="Klik untuk ubah Satuan / Kemasan"
                          >
                            {r.satuan || r.kemasan || '-'}
                          </div>
                        )}
                      </td>

                      {/* HISTORY HARGA */}
                      <td className="p-1.5 text-right font-mono text-slate-600 border border-slate-200">
                        {isRowEditing ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              step="0.01"
                              value={isHistHargaEmpty ? '' : (effectiveHistHarga > 0 ? effectiveHistHarga : '')}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                if (val === '') {
                                  (onUpdateRow as any)?.(r.id, { historyHarga: 0, historyHargaOverride: 0 });
                                } else {
                                  const p = parseFloat(val) || 0;
                                  (onUpdateRow as any)?.(r.id, { historyHarga: p, historyHargaOverride: p === 0 ? 0 : p });
                                }
                              }}
                              placeholder="0,00"
                              className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-right text-xs font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
                            />
                            <div className="flex items-center justify-between gap-1 pt-0.5 no-print">
                              <button
                                type="button"
                                onClick={() => (onUpdateRow as any)?.(r.id, { historyHarga: 0, historyHargaOverride: 0 })}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 border border-slate-200 transition cursor-pointer"
                                title="Set kosong untuk barang baru yang belum punya riwayat harga"
                              >
                                Kosongkan (Barang Baru)
                              </button>
                            </div>
                            {lastPurchase.options && lastPurchase.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end no-print">
                                {lastPurchase.options.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => (onUpdateRow as any)?.(r.id, { historyHarga: opt.historyHarga, historyHargaOverride: opt.historyHarga })}
                                    title={`Gunakan harga dari ${opt.label}: Rp ${formatPrice2Dec(opt.historyHarga)}`}
                                    className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 border border-slate-200 font-mono transition cursor-pointer"
                                  >
                                    {opt.source === 'riwayat' ? '🕒' : opt.source === 'master' ? '📦' : '🏷️'} Rp {formatPrice2Dec(opt.historyHarga)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => handleOpenHistoryModal(r)}
                            className="cursor-pointer group/hist p-1 hover:bg-teal-50/70 rounded transition"
                            title="Otomatis terisi dari Riwayat, Master, atau Pricelist. Klik untuk ubah manual atau pilih sumber."
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span className={`font-bold ${isHistHargaEmpty ? 'text-slate-400 font-normal italic' : 'text-slate-800 group-hover/hist:text-teal-800'}`}>
                                {!isHistHargaEmpty && effectiveHistHarga > 0 ? `Rp ${formatPrice2Dec(effectiveHistHarga)}` : '-'}
                              </span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover/hist:text-teal-600 opacity-0 group-hover/hist:opacity-100 transition shrink-0 no-print" />
                            </div>
                            {isHistHargaEmpty ? (
                              <div className="flex justify-end mt-0.5 no-print">
                                <span className="text-[9px] px-1 py-0.2 rounded font-sans bg-slate-100 text-slate-500 border border-slate-200">
                                  Barang Baru
                                </span>
                              </div>
                            ) : (
                              lastPurchase.priceSource && lastPurchase.priceSource !== 'none' && (
                                <div className="flex justify-end mt-0.5 no-print">
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-mono border ${
                                      lastPurchase.priceSource === 'manual'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : lastPurchase.priceSource === 'riwayat'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : lastPurchase.priceSource === 'master'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                                  >
                                    {lastPurchase.priceSource === 'manual'
                                      ? 'Manual'
                                      : lastPurchase.priceSource === 'riwayat'
                                      ? 'Riwayat'
                                      : lastPurchase.priceSource === 'master'
                                      ? 'Master'
                                      : 'Pricelist'}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </td>

                      {/* TANGGAL */}
                      <td className="p-1.5 text-center font-mono text-[11px] text-slate-500 border border-slate-200">
                        {isRowEditing ? (
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={effectiveTglBeli !== '-' ? effectiveTglBeli : ''}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                onUpdateRow?.(r.id, 'tanggal', val === '' ? '-' : val);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
                            />
                            <div className="flex items-center justify-between gap-1 pt-0.5 no-print">
                              <button
                                type="button"
                                onClick={() => onUpdateRow?.(r.id, 'tanggal', '-')}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 border border-slate-200 transition cursor-pointer"
                                title="Set kosong untuk barang baru yang belum ada tanggal pembelian"
                              >
                                Kosongkan (Barang Baru)
                              </button>
                            </div>
                            {lastPurchase.options && lastPurchase.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-center no-print">
                                {lastPurchase.options
                                  .filter((o) => o.tanggal)
                                  .map((opt, oIdx) => (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => onUpdateRow?.(r.id, 'tanggal', opt.tanggal)}
                                      title={`Gunakan tgl dari ${opt.label}: ${opt.tanggal}`}
                                      className="text-[9px] px-1 py-0.2 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 border border-slate-200 font-mono transition cursor-pointer"
                                    >
                                      {opt.source === 'riwayat' ? '🕒' : opt.source === 'master' ? '📦' : '🏷️'} {opt.tanggal}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => handleOpenHistoryModal(r)}
                            className="cursor-pointer group/tgl p-1 hover:bg-teal-50/70 rounded transition text-center"
                            title="Otomatis terisi dari Riwayat, Master, atau Pricelist. Klik untuk ubah manual atau pilih sumber."
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className={`font-semibold ${isTglEmpty || effectiveTglBeli === '-' ? 'text-slate-400 font-normal italic' : 'text-slate-700 group-hover/tgl:text-teal-800'}`}>
                                {effectiveTglBeli}
                              </span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover/tgl:text-teal-600 opacity-0 group-hover/tgl:opacity-100 transition shrink-0 no-print" />
                            </div>
                            {isTglEmpty || effectiveTglBeli === '-' ? (
                              <div className="mt-0.5 no-print">
                                <span className="text-[9px] px-1 py-0.2 rounded font-sans bg-slate-100 text-slate-500 border border-slate-200">
                                  Barang Baru
                                </span>
                              </div>
                            ) : (
                              lastPurchase.dateSource && lastPurchase.dateSource !== 'none' && (
                                <div className="mt-0.5">
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-mono border no-print ${
                                      lastPurchase.dateSource === 'manual'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : lastPurchase.dateSource === 'riwayat'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : lastPurchase.dateSource === 'master'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                                  >
                                    {lastPurchase.dateSource === 'manual'
                                      ? 'Manual'
                                      : lastPurchase.dateSource === 'riwayat'
                                      ? 'Riwayat'
                                      : lastPurchase.dateSource === 'master'
                                      ? 'Master'
                                      : 'Pricelist'}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </td>

                      {/* PBF TERAKHIR BELI (AUTO-FOUND FROM HISTORY, MASTER, PRICELIST, OR MANUAL OVERRIDE) */}
                      <td className="p-1.5 font-medium text-slate-700 border border-slate-200">
                        {isRowEditing ? (
                          <div className="space-y-1">
                            <PbfAutocompleteInput
                              value={effectivePbfTerakhir === '-' ? '' : (effectivePbfTerakhir || '')}
                              onChange={(val) => {
                                const trimmed = val.trim();
                                const finalVal = trimmed === '' ? '-' : trimmed;
                                onUpdateRow?.(r.id, 'pbfTerakhir', finalVal);
                                if (trimmed && !r.pbf) {
                                  onUpdateRow?.(r.id, 'pbf', trimmed);
                                }
                              }}
                              onAutoRegisterPbf={onAutoRegisterPbf}
                              onSelectOffer={(offer) => {
                                const isCurrentPpn = r.includePpn !== false;
                                const hnaPlusPpn = isCurrentPpn ? Math.round(offer.hna * 1.11) : offer.hna;
                                const discFactor = (100 - offer.diskonPct) / 100;
                                const nettoHna = offer.hna * discFactor;
                                const newHargaJadi = Math.round(isCurrentPpn ? nettoHna * 1.11 : nettoHna);
                                (onUpdateRow as any)?.(r.id, {
                                  pbfTerakhir: offer.pbf,
                                  pbf: offer.pbf,
                                  hna: offer.hna,
                                  diskonPct: offer.diskonPct,
                                  hnaPlusPpn,
                                  hargaJadi: newHargaJadi,
                                });
                              }}
                              suppliers={suppliers || []}
                              priceList={priceList || []}
                              drugName={r.nama}
                              placeholder="Kosong (barang baru)..."
                              compact={true}
                            />
                            <div className="flex items-center justify-between gap-1 pt-0.5 no-print">
                              <button
                                type="button"
                                onClick={() => onUpdateRow?.(r.id, 'pbfTerakhir', '-')}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 border border-slate-200 transition cursor-pointer"
                                title="Set kosong untuk barang baru yang belum punya riwayat PBF"
                              >
                                Kosongkan (Barang Baru)
                              </button>
                            </div>
                            {lastPurchase.options && lastPurchase.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 no-print">
                                {lastPurchase.options
                                  .filter((o) => o.pbf)
                                  .map((opt, oIdx) => (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => {
                                        onUpdateRow?.(r.id, 'pbfTerakhir', opt.pbf);
                                        if (!r.pbf) onUpdateRow?.(r.id, 'pbf', opt.pbf);
                                      }}
                                      title={`Gunakan PBF dari ${opt.label}: ${opt.pbf}`}
                                      className="text-[9px] px-1 py-0.2 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 border border-slate-200 font-mono transition cursor-pointer truncate max-w-[130px]"
                                    >
                                      {opt.source === 'riwayat' ? '🕒' : opt.source === 'master' ? '📦' : '🏷️'} {opt.pbf}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => handleOpenHistoryModal(r)}
                            className="cursor-pointer group/pbf p-1 hover:bg-teal-50/70 rounded transition"
                            title="Otomatis terisi dari Riwayat, Master, atau Pricelist. Klik untuk ubah manual atau kosongkan untuk barang baru."
                          >
                            <div className="flex items-center justify-between">
                              <span className={`truncate ${effectivePbfTerakhir === '-' ? 'text-slate-400 font-normal italic' : 'font-semibold text-slate-800 group-hover/pbf:text-teal-800'}`}>
                                {effectivePbfTerakhir || '-'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {effectivePbfTerakhir === '-' ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-sans bg-slate-100 text-slate-500 border border-slate-200 no-print">
                                    Barang Baru
                                  </span>
                                ) : lastPurchase.pbfSource && lastPurchase.pbfSource !== 'none' && (
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-mono border no-print ${
                                      lastPurchase.pbfSource === 'manual'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : lastPurchase.pbfSource === 'riwayat'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : lastPurchase.pbfSource === 'master'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                                  >
                                    {lastPurchase.pbfSource === 'manual'
                                      ? 'Manual'
                                      : lastPurchase.pbfSource === 'riwayat'
                                      ? 'Riwayat'
                                      : lastPurchase.pbfSource === 'master'
                                      ? 'Master'
                                      : 'Pricelist'}
                                  </span>
                                )}
                                <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover/pbf:text-teal-600 opacity-0 group-hover/pbf:opacity-100 transition shrink-0 no-print" />
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* HARGA JADI (OTOMATIS TERSINKRONISASI DENGAN SUB TOTAL PER OBAT) */}
                      <td className="p-1.5 text-right font-mono font-bold text-teal-800 border border-slate-200">
                        {isRowEditing ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-slate-400 font-sans font-semibold">Rp</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={hargaJadi || ''}
                                onChange={(e) => handleHargaJadiChange(r, parseFloat(e.target.value) || 0)}
                                placeholder="0,00"
                                className="w-28 bg-white border-2 border-teal-600 rounded px-1.5 py-1 text-right text-xs font-black text-teal-950 focus:outline-none shadow-xs"
                                title="Harga Jadi per satuan (otomatis tersinkronisasi dengan Sub Total)"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleTogglePpn(r)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                                  isPpn
                                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                                }`}
                                title={isPpn ? 'PPN 11% Aktif (Klik untuk Non-PPN)' : 'Non-PPN (Klik untuk +PPN 11%)'}
                              >
                                {isPpn ? '+PPN 11%' : 'Non-PPN'}
                              </button>

                              {r.diskonPct && r.diskonPct > 0 ? (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                  Disc {r.diskonPct}%
                                </span>
                              ) : null}

                              {r.hna ? (
                                <span className="text-[9px] text-slate-400 font-sans">
                                  HNA:{formatPrice2Dec(r.hna)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingRowId(r.id)}
                            className="cursor-pointer group/hrg text-right transition"
                            title="Klik untuk ubah Harga Jadi"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-extrabold text-teal-900 group-hover/hrg:text-teal-700">
                                Rp {formatPrice2Dec(hargaJadi)}
                              </span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-300 group-hover/hrg:text-teal-600 opacity-0 group-hover/hrg:opacity-100 transition no-print" />
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-sans">
                              <span>{isPpn ? 'Termasuk PPN' : 'Harga Netto'}</span>
                              {r.diskonPct && r.diskonPct > 0 ? (
                                <span className="text-amber-700 font-semibold">(Disc {r.diskonPct}%)</span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* STOK SISA (BISA DITULISKAN ANGKA DAN HURUF) */}
                      <td className="p-1.5 text-center font-mono font-bold text-slate-700 border border-slate-200">
                        {isRowEditing ? (
                          <input
                            type="text"
                            value={r.stok ?? ''}
                            onChange={(e) => onUpdateRow?.(r.id, 'stok', e.target.value)}
                            placeholder="0 / strip"
                            className="w-16 bg-white border border-slate-300 focus:border-teal-600 rounded px-1.5 py-1 text-center text-xs font-bold text-slate-800 focus:outline-none mx-auto shadow-xs"
                            title="Sisa stok (dapat dituliskan angka maupun huruf, misal: 5 box, kosong, 2 strip, 0)"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingRowId(r.id)}
                            className="cursor-pointer font-mono font-bold text-slate-700 hover:text-teal-700 transition"
                            title="Klik untuk edit stok (bisa angka dan huruf)"
                          >
                            {r.stok !== undefined && r.stok !== '' ? r.stok : 0}
                          </div>
                        )}
                      </td>

                      {/* PESAN / KUANTITAS BELI */}
                      <td className="p-1.5 text-center font-mono font-extrabold text-teal-700 bg-teal-50/60 border border-slate-200">
                        {isRowEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.beli ?? ''}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0;
                              onUpdateRow?.(r.id, 'beli', qty);
                              onUpdateRow?.(r.id, 'minta', qty);
                            }}
                            className="w-14 bg-white border-2 border-teal-600 rounded px-1 py-1 text-center text-xs font-black text-teal-900 focus:outline-none mx-auto shadow-sm"
                            title="Kuantitas pesan (otomatis update Sub Total = Harga Jadi * Pesan)"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingRowId(r.id)}
                            className="cursor-pointer font-extrabold text-teal-800 hover:text-teal-600 transition"
                            title="Klik untuk ubah kuantitas"
                          >
                            {r.beli || 0}
                          </div>
                        )}
                      </td>

                      {/* SUB TOTAL (SINKRONISASI LANGSUNG DENGAN HARGA JADI) */}
                      <td className="p-2 text-right font-mono font-extrabold text-slate-900 border border-slate-200">
                        {isRowEditing ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-slate-400 font-sans">Rp</span>
                              <input
                                type="number"
                                min="0"
                                value={subtotal || ''}
                                onChange={(e) => handleSubtotalChange(r, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-28 bg-white border border-slate-300 focus:border-teal-600 rounded px-1.5 py-1 text-right text-xs font-black text-slate-900 focus:outline-none shadow-xs"
                                title="Ketik Subtotal (otomatis menghitung Harga Jadi = Subtotal / Pesan)"
                              />
                            </div>
                            <div className="text-[9px] text-teal-700 font-sans text-right">
                              {r.beli || 0} &times; Rp {formatPrice2Dec(hargaJadi)}
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingRowId(r.id)}
                            className="cursor-pointer group/subtot transition"
                            title="Klik untuk edit Subtotal / Harga Jadi"
                          >
                            <span className="font-mono font-extrabold text-slate-900 group-hover/subtot:text-teal-800 whitespace-nowrap">
                              Rp {formatPrice2Dec(subtotal)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ROW ACTION */}
                      {(isManualEditMode || editingRowId) && (
                        <td className="p-1.5 text-center border border-slate-200 no-print">
                          <div className="flex items-center justify-center gap-1">
                            {editingRowId === r.id && !isManualEditMode && (
                              <button
                                onClick={() => setEditingRowId(null)}
                                title="Selesai Edit Baris Ini"
                                className="px-1.5 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded transition font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="w-3 h-3 text-teal-700" />
                                <span>OK</span>
                              </button>
                            )}
                            {isManualEditMode && onDuplicateRow && (
                              <button
                                onClick={() => onDuplicateRow(r)}
                                title="Duplikasi Baris"
                                className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isManualEditMode && onRemoveRow && (
                              <button
                                onClick={() => onRemoveRow(r.id)}
                                title="Hapus Baris"
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="pt-3 border-t-2 border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-slate-500 max-w-md">
            <p className="font-semibold text-slate-700">Catatan Pengadaan Farmasi:</p>
            <p>
              Dokumen usulan ini dicetak dalam format <strong>{orientation.toUpperCase()}</strong> dan telah disesuaikan dengan ketentuan Surat Pesanan (SP) sarana kefarmasian resmi.
            </p>
          </div>

          <div className="bg-teal-900 text-white p-4 rounded-xl text-right w-full sm:w-auto min-w-[280px] space-y-1 shadow-md">
            <div className="flex justify-between text-xs text-teal-200">
              <span>Subtotal Usulan ({validRows.length} item):</span>
              <span className="font-mono">Rp {formatPrice2Dec(grandTotal)}</span>
            </div>
            {diskonCOD > 0 && (
              <div className="flex justify-between text-xs text-amber-300">
                <span>Diskon Tunai ({diskonCOD}%):</span>
                <span className="font-mono">- Rp {formatPrice2Dec(codDiscountRp)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-teal-700 text-sm">
              <span className="font-bold text-white uppercase text-[11px]">TOTAL ESTIMASI:</span>
              <span className="font-black text-lg font-mono text-teal-300">
                Rp {formatPrice2Dec(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures Area (Responsive to Orientation) */}
        <div
          className={`pt-8 border-t border-slate-200 text-center text-xs text-slate-700 ${
            orientation === 'portrait' ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-3 gap-8'
          }`}
        >
          <div className="space-y-12">
            <p className="font-medium text-slate-600">Dibuat oleh:</p>
            <div className="border-b border-slate-400 w-32 sm:w-36 mx-auto" />
            <p className="text-[11px] text-slate-500">Staf Pengadaan / Farmasi</p>
          </div>

          <div className="space-y-12">
            <p className="font-medium text-slate-600">Mengetahui (APA):</p>
            <div className="border-b border-slate-400 w-36 sm:w-44 mx-auto" />
            <p className="font-bold text-slate-900 leading-tight">
              {effectivePharmacist}
              <br />
              <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 font-mono">
                SIPA: {effectiveSipa}
              </span>
            </p>
          </div>

          <div className="space-y-12">
            <p className="font-medium text-slate-600">Disetujui oleh:</p>
            <div className="border-b border-slate-400 w-32 sm:w-36 mx-auto" />
            <p className="text-[11px] text-slate-500">Pimpinan / Pemilik Sarana</p>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM ACTIONS TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center gap-2 pt-1 no-print">
        <button
          onClick={onResetSheet}
          className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sheet Usulan</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportExcel}
            className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition cursor-pointer backdrop-blur-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => onExportPDF(orientation)}
            title={`Cetak Dokumen PDF Resmi format ${orientation.toUpperCase()}`}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/10 transition cursor-pointer backdrop-blur-md"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Cetak PDF ({orientation === 'portrait' ? 'Portrait' : 'Landscape'})</span>
          </button>

          <button
            onClick={() => onExportPNG(orientation)}
            title={`Simpan Gambar PNG Utuh format ${orientation.toUpperCase()}`}
            className="px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 transition cursor-pointer backdrop-blur-md"
          >
            <Image className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simpan PNG ({orientation === 'portrait' ? 'Portrait' : 'Landscape'})</span>
          </button>

          <button
            onClick={onPrint}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-md cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print Dokumen</span>
          </button>

          <button
            onClick={onCommitHistory}
            className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition cursor-pointer backdrop-blur-md"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Legalkan ke Riwayat Pembelian</span>
          </button>
        </div>
      </div>

      {/* 3. MODAL KELOLA HISTORY HARGA & PEMBELIAN TERAKHIR (OTOMATIS & MANUAL) */}
      {selectedHistoryRow && (() => {
        const last = findLastPurchaseInfo(selectedHistoryRow, history, masterList, priceList);

        const handleApplyOption = (opt: LastPurchaseOption) => {
          (onUpdateRow as any)?.(selectedHistoryRow.id, {
            historyHarga: opt.historyHarga,
            historyHargaOverride: opt.historyHarga,
            tanggal: opt.tanggal,
            pbfTerakhir: opt.pbf,
            isBarangBaru: false,
          });
          setSelectedHistoryRow(null);
        };

        const handleSaveManual = () => {
          const rawPrice = manualHistoryHargaInput.trim();
          const price = rawPrice === '' ? 0 : parseFloat(rawPrice) || 0;
          const isPriceEmpty = rawPrice === '' || price === 0;

          const rawDate = manualTanggalInput.trim();
          const isDateEmpty = rawDate === '' || rawDate === '-';

          const rawPbf = manualPbfInput.trim();
          const isPbfEmpty = rawPbf === '' || rawPbf === '-';

          const isBarangBaru = isPbfEmpty && isDateEmpty && isPriceEmpty;

          (onUpdateRow as any)?.(selectedHistoryRow.id, {
            historyHarga: price,
            historyHargaOverride: isPriceEmpty ? 0 : price,
            tanggal: isDateEmpty ? '-' : rawDate,
            pbfTerakhir: isPbfEmpty ? '-' : rawPbf,
            isBarangBaru: isBarangBaru ? true : (isPbfEmpty && isPriceEmpty ? true : false),
          });
          setSelectedHistoryRow(null);
        };

        const handleResetToAuto = () => {
          (onUpdateRow as any)?.(selectedHistoryRow.id, {
            historyHarga: 0,
            historyHargaOverride: undefined,
            tanggal: '',
            pbfTerakhir: undefined,
            isBarangBaru: false,
          });
          setSelectedHistoryRow(null);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 no-print">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-teal-900 to-teal-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-700/60 rounded-xl">
                    <HistoryIcon className="w-5 h-5 text-teal-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <span>History Harga & Pembelian Terakhir</span>
                      <span className="text-xs bg-teal-700/80 px-2 py-0.5 rounded-full font-mono font-normal text-teal-100">
                        {category.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-teal-100 mt-0.5">
                      <span className="font-semibold text-white">{selectedHistoryRow.nama}</span>{' '}
                      <span className="font-mono text-[11px] opacity-80">({selectedHistoryRow.sku || 'SKU Auto'})</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryRow(null)}
                  className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Info Note */}
                <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pengisian Otomatis & Fleksibel:</span> History Harga dan Tanggal Beli
                    Terakhir otomatis terisi tanpa harus diminta, diprioritaskan dari Riwayat Pembelian resmi, Master SKU,
                    atau Pricelist PBF. Anda dapat memilih salah satu sumber di bawah atau mengisinya secara manual.
                  </div>
                </div>

                {/* Section A: Opsi Otomatis Terdeteksi */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Sumber Otomatis Terdeteksi ({last.options.length} Ditemukan)</span>
                  </h4>

                  {last.options.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      Belum ditemukan riwayat transaksi sebelumnya atau data master obat yang cocok. Silakan gunakan input
                      manual di bawah.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {last.options.map((opt, idx) => {
                        const isRiwayat = opt.source === 'riwayat';
                        const isMaster = opt.source === 'master';
                        const themeColor = isRiwayat
                          ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 text-blue-900'
                          : isMaster
                          ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80 text-emerald-900'
                          : 'border-purple-200 bg-purple-50/40 hover:bg-purple-50/80 text-purple-900';
                        const badgeColor = isRiwayat
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : isMaster
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200';

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 border rounded-2xl flex flex-col justify-between transition ${themeColor}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {isRiwayat ? '🕒 Riwayat Pembelian' : isMaster ? '📦 Master SKU Obat' : '🏷️ Komparasi Pricelist'}
                                </span>
                                {opt.tanggal && (
                                  <span className="text-[11px] font-mono text-slate-500 font-semibold">{opt.tanggal}</span>
                                )}
                              </div>

                              <div className="space-y-1 my-2">
                                <div className="text-sm font-black font-mono text-slate-900">
                                  {opt.historyHarga > 0
                                    ? `Rp ${formatPrice2Dec(opt.historyHarga)}`
                                    : '-'}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 truncate" title={opt.pbf}>
                                  PBF: {opt.pbf || '-'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplyOption(opt)}
                              className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-teal-700 hover:text-white border border-slate-300 hover:border-teal-700 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Gunakan Data Ini</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section B: Form Input / Penimpaan Manual */}
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Input / Ubah Manual</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Input Harga */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">History Harga (Rp):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualHistoryHargaInput}
                        onChange={(e) => setManualHistoryHargaInput(e.target.value)}
                        placeholder="Contoh: 45000.00 (kosongkan jika baru)"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                      />
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setManualHistoryHargaInput('')}
                          className="text-[10px] text-teal-700 hover:text-teal-900 hover:underline font-semibold block cursor-pointer"
                        >
                          + Kosongkan Harga (Barang Baru / Tanpa Riwayat)
                        </button>
                      </div>
                      {manualHistoryHargaInput.trim() !== '' && parseFloat(manualHistoryHargaInput) > 0 ? (
                        <p className="text-[10px] text-teal-700 font-mono mt-1">
                          Rp {formatPrice2Dec(parseFloat(manualHistoryHargaInput))}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-1">
                          Status: Kosong / Tanpa Riwayat Harga (-)
                        </p>
                      )}
                    </div>

                    {/* Input Tanggal */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Beli Terakhir:</label>
                      <input
                        type="date"
                        value={manualTanggalInput}
                        onChange={(e) => setManualTanggalInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                      />
                      <div className="flex flex-col gap-0.5 mt-1">
                        <button
                          type="button"
                          onClick={() => setManualTanggalInput(new Date().toISOString().split('T')[0])}
                          className="text-[10px] text-teal-700 hover:underline font-semibold text-left cursor-pointer"
                        >
                          + Set Hari Ini ({new Date().toISOString().split('T')[0]})
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualTanggalInput('')}
                          className="text-[10px] text-teal-700 hover:text-teal-900 hover:underline font-semibold text-left cursor-pointer"
                        >
                          + Kosongkan Tanggal (Barang Baru / Tanpa Riwayat)
                        </button>
                      </div>
                      {!manualTanggalInput.trim() && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          Status: Kosong / Tanpa Tanggal Beli (-)
                        </p>
                      )}
                    </div>

                    {/* Input PBF */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">PBF Terakhir Beli:</label>
                      <PbfAutocompleteInput
                        value={manualPbfInput}
                        onChange={(val) => setManualPbfInput(val)}
                        onAutoRegisterPbf={onAutoRegisterPbf}
                        suppliers={suppliers || []}
                        priceList={priceList || []}
                        drugName={selectedHistoryRow.nama}
                        placeholder="Nama supplier PBF (atau kosongkan)..."
                      />
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setManualPbfInput('')}
                          className="text-[10px] text-teal-700 hover:text-teal-900 hover:underline font-semibold block cursor-pointer"
                        >
                          + Kosongkan PBF (Barang Baru / Tanpa Riwayat)
                        </button>
                      </div>
                      {!manualPbfInput.trim() && (
                        <p className="text-[10px] text-slate-400 italic mt-1">
                          Status: Kosong / Barang Baru (-)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetToAuto}
                        className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="Hapus penimpaan manual dan kembalikan ke pencarian otomatis dari Riwayat, Master, atau Pricelist"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Deteksi Otomatis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          (onUpdateRow as any)?.(selectedHistoryRow.id, {
                            historyHarga: 0,
                            historyHargaOverride: 0,
                            tanggal: '-',
                            pbfTerakhir: '-',
                            isBarangBaru: true,
                          });
                          setSelectedHistoryRow(null);
                        }}
                        className="px-3 py-2 text-xs text-amber-800 hover:bg-amber-50 border border-amber-300 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Tandai sebagai obat baru tanpa riwayat transaksi (PBF, Tanggal, dan History Harga kosong)"
                      >
                        <PackagePlus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Set Barang Baru (Kosongkan)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryRow(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveManual}
                        className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan Manual</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
