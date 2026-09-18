import React, { useState, useRef, useMemo } from 'react';
import {
  Tag,
  Search,
  Plus,
  Trash2,
  Edit,
  ArrowRight,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  TrendingDown,
  Phone,
  Calendar,
  Building,
  RotateCcw,
  Sparkles,
  FileText,
  Loader2,
  FileUp,
  Boxes,
  Layers,
  Database,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Percent,
  Check,
  Zap,
  Camera,
  X,
} from 'lucide-react';
import { DrugCategory, MasterDrugItem, PriceOfferItem, ScannedMedicineData, SupplierItem } from '../../types';
import { generateSKU } from '../../utils/db';
import { parsePdfPriceOffers, PdfParseResult } from '../../utils/pdfPbfParser';
import { PdfImportModal } from './PdfImportModal';
import {
  groupPriceListByDrug,
  groupPriceListByPbf,
  getMasterPriceSyncSummary,
  findMatchingMasterItem,
  searchDrugSuggestions,
  DrugSuggestion,
  GroupedPriceListDrug,
  GroupedPriceListPbf,
} from '../../utils/masterPriceSync';
import { MedicineVisionScannerModal } from '../Scanner/MedicineVisionScannerModal';
import { PbfAutocompleteInput } from '../Common/PbfAutocompleteInput';

interface PriceListViewProps {
  priceList: PriceOfferItem[];
  masterList: MasterDrugItem[];
  suppliers?: SupplierItem[];
  onAutoRegisterPbf?: (pbfName: string) => void;
  onAddPriceOffer: (offer: PriceOfferItem) => void;
  onAddMultiplePriceOffers?: (offers: PriceOfferItem[], autoApplyBestPrice?: boolean) => void;
  onUpdatePriceOffer: (offer: PriceOfferItem) => void;
  onDeletePriceOffer: (id: string) => void;
  onResetPriceList: () => void;
  onUseInCalculation: (offer: PriceOfferItem) => void;
  onApplyBestPricesToTransactions?: () => void;
  onExportExcel: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
  onFullSync?: () => void;
  onSetDefaultMasterPbf?: (sku: string, pbf: string, hna: number) => void;
}

export const PriceListView: React.FC<PriceListViewProps> = ({
  priceList,
  masterList,
  suppliers = [],
  onAutoRegisterPbf,
  onAddPriceOffer,
  onAddMultiplePriceOffers,
  onUpdatePriceOffer,
  onDeletePriceOffer,
  onResetPriceList,
  onUseInCalculation,
  onApplyBestPricesToTransactions,
  onExportExcel,
  onImportExcel,
  onShowToast,
  onFullSync,
  onSetDefaultMasterPbf,
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grouped-drug' | 'table' | 'grouped-pbf'>('grouped-drug');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DrugCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lowest' | 'in-stock' | 'unlinked'>('all');
  const [expandedDrugs, setExpandedDrugs] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PriceOfferItem | null>(null);

  // PDF Parser State
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfParseResult, setPdfParseResult] = useState<PdfParseResult | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const singlePdfInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [pbf, setPbf] = useState('');
  const [hna, setHna] = useState('');
  const [diskon, setDiskon] = useState('0');
  const [stok, setStok] = useState('0');
  const [kontak, setKontak] = useState('');
  const [catatan, setCatatan] = useState('');

  // Scanner & Auto-Suggestion States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Suggestions for drug name input
  const drugSuggestions = useMemo(
    () => searchDrugSuggestions(nama, masterList, priceList, 6),
    [nama, masterList, priceList]
  );

  // Matched Master item for current input
  const matchedMasterItem = useMemo(() => {
    if (!nama || nama.trim().length < 2) return undefined;
    return findMatchingMasterItem({ nama } as any, masterList);
  }, [nama, masterList]);

  const handleSelectSuggestion = (sug: DrugSuggestion) => {
    setNama(sug.nama);
    if (sug.pbf && sug.pbf !== '-') setPbf(sug.pbf);
    if (sug.hna > 0) setHna(sug.hna.toString());
    if (sug.stok > 0) setStok(sug.stok.toString());
    setShowNameSuggestions(false);
    onShowToast(`Data obat "${sug.nama}" dipilih (terhubung SKU: ${sug.sku})!`, 'success');
  };

  const handleApplyScannedPriceOffer = (scanned: ScannedMedicineData) => {
    setNama(scanned.nama);
    if (scanned.pbf && scanned.pbf !== '-') setPbf(scanned.pbf);
    if (scanned.hna && scanned.hna > 0) setHna(scanned.hna.toString());
    if (scanned.diskon !== undefined) setDiskon(scanned.diskon.toString());
    if (scanned.stok !== undefined) setStok(scanned.stok.toString());
    if (scanned.kontakPbf) setKontak(scanned.kontakPbf);
    if (scanned.catatan) setCatatan(scanned.catatan);

    if (!isModalOpen) {
      setEditingOffer(null);
      setIsModalOpen(true);
    }
    onShowToast(`Data penawaran "${scanned.nama}" hasil pemindaian berhasil diisikan!`, 'success');
  };

  const handleDirectSaveScannedOffer = (scanned: ScannedMedicineData) => {
    const hnaVal = scanned.hna || 0;
    const diskonVal = scanned.diskon || 0;
    const diskonRp = hnaVal * (diskonVal / 100);
    const hppVal = (hnaVal - diskonRp) * 1.11;
    const newOffer: PriceOfferItem = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sku: scanned.sku || generateSKU(scanned.kategori || 'reguler'),
      nama: scanned.nama,
      pbf: scanned.pbf && scanned.pbf !== '-' ? scanned.pbf : 'Distributor Terpilih',
      hna: hnaVal,
      diskon: diskonVal,
      hpp: hppVal,
      stok: scanned.stok || 0,
      tglUpdate: new Date().toISOString().split('T')[0],
      kontakPbf: scanned.kontakPbf || '',
      catatan: scanned.catatan || 'Hasil Scan Kamera / Berkas AI',
    };
    onAddPriceOffer(newOffer);
    onShowToast(`Penawaran "${newOffer.nama}" (${newOffer.pbf}) berhasil disimpan & otomatis disinkronkan ke Master!`, 'success');
  };

  // Synchronization Summary
  const syncSummary = useMemo(
    () => getMasterPriceSyncSummary(masterList, priceList),
    [masterList, priceList]
  );

  // Grouped by drug
  const groupedDrugs = useMemo(
    () => groupPriceListByDrug(priceList, masterList),
    [priceList, masterList]
  );

  // Grouped by PBF
  const groupedPbfs = useMemo(
    () => groupPriceListByPbf(priceList, masterList),
    [priceList, masterList]
  );

  // Toggle drug card accordion
  const toggleDrugExpand = (key: string) => {
    setExpandedDrugs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Expand / Collapse all
  const toggleAllExpand = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    groupedDrugs.forEach((d) => {
      next[d.key] = expand;
    });
    setExpandedDrugs(next);
  };

  // Handle PDF file upload for Price List (Bulk parsing & review modal)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      onShowToast('Harap pilih berkas berekstensi PDF.', 'warning');
      e.target.value = '';
      return;
    }

    setIsPdfLoading(true);
    onShowToast(`Membaca dan memindai dokumen PDF "${file.name}"...`, 'info');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await parsePdfPriceOffers(arrayBuffer, masterList);

      if (result.items.length === 0) {
        onShowToast(
          'Tidak ada data harga obat terstruktur yang terdeteksi otomatis pada PDF ini.',
          'warning'
        );
      } else {
        onShowToast(
          `Berhasil mengekstrak ${result.items.length} data penawaran dari "${result.detectedPbf}"!`,
          'success'
        );
      }

      setPdfParseResult(result);
      setPdfFileName(file.name);
      setIsPdfModalOpen(true);
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      onShowToast(err.message || 'Gagal memproses berkas PDF.', 'error');
    } finally {
      setIsPdfLoading(false);
      e.target.value = '';
    }
  };

  // Handle single PDF file upload inside Add Modal to autofill form inputs
  const handleSinglePdfAutofill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowToast(`Menganalisis dokumen PDF "${file.name}" untuk pengisian otomatis...`, 'info');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await parsePdfPriceOffers(arrayBuffer, masterList);

      if (result.items.length > 0) {
        const first = result.items[0];
        setNama(first.nama);
        setPbf(result.detectedPbf || first.pbf);
        setHna(first.hna.toString());
        setDiskon(first.diskon.toString());
        setStok((first.stok || 0).toString());
        if (result.detectedContact) setKontak(result.detectedContact);
        setCatatan(`Ekstraksi PDF (${file.name})`);
        onShowToast(`Data obat "${first.nama}" berhasil diisi otomatis!`, 'success');
      } else {
        if (result.detectedPbf) setPbf(result.detectedPbf);
        if (result.detectedContact) setKontak(result.detectedContact);
        onShowToast('Informasi PBF terisi otomatis. Silakan lengkapi nama obat dan harga.', 'info');
      }
    } catch (err) {
      onShowToast('Gagal mengekstrak PDF untuk form.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Handle Bulk Import Confirm from PDF Modal
  const handleConfirmPdfBulkImport = (importedOffers: PriceOfferItem[], autoApplyBestPrice?: boolean) => {
    if (onAddMultiplePriceOffers) {
      onAddMultiplePriceOffers(importedOffers, autoApplyBestPrice);
    } else {
      importedOffers.forEach((item) => onAddPriceOffer(item));
      if (autoApplyBestPrice && onApplyBestPricesToTransactions) {
        onApplyBestPricesToTransactions();
      }
    }
  };

  // Filter for Grouped by Drug
  const filteredGroupedDrugs = useMemo(() => {
    return groupedDrugs.filter((d) => {
      // Search
      const matchesSearch =
        d.nama.toLowerCase().includes(search.toLowerCase()) ||
        d.sku.toLowerCase().includes(search.toLowerCase()) ||
        d.offers.some((o) => o.pbf.toLowerCase().includes(search.toLowerCase()));

      // Category
      const matchesCat = categoryFilter === 'all' || d.kategori === categoryFilter;

      // Status Filter
      let matchesStatus = true;
      if (statusFilter === 'lowest') {
        matchesStatus = d.offersCount > 1 && d.priceSpreadRp > 0;
      } else if (statusFilter === 'in-stock') {
        matchesStatus = d.totalPbfStock > 0;
      } else if (statusFilter === 'unlinked') {
        matchesStatus = !d.masterItem;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [groupedDrugs, search, categoryFilter, statusFilter]);

  // Filter for Flat Table
  const filteredFlatOffers = useMemo(() => {
    return priceList.filter((p) => {
      const matchesSearch =
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.pbf.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

      // Matched master
      const matched = findMatchingMasterItem(p, masterList);
      const cat = matched ? matched.kategori : 'reguler';
      const matchesCat = categoryFilter === 'all' || cat === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'lowest') {
        const d = groupedDrugs.find((g) => g.nama.toLowerCase() === p.nama.toLowerCase());
        matchesStatus = d ? d.lowestOffer.id === p.id : true;
      } else if (statusFilter === 'in-stock') {
        matchesStatus = (p.stok ?? 0) > 0;
      } else if (statusFilter === 'unlinked') {
        matchesStatus = !matched;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [priceList, search, categoryFilter, statusFilter, masterList, groupedDrugs]);

  // Filter for Grouped by PBF
  const filteredGroupedPbfs = useMemo(() => {
    return groupedPbfs.filter((p) => {
      const matchesSearch =
        p.pbfName.toLowerCase().includes(search.toLowerCase()) ||
        p.offers.some((o) => o.nama.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [groupedPbfs, search]);

  const handleOpenAddModal = (presetName?: string, presetSku?: string) => {
    setEditingOffer(null);
    setNama(presetName || '');
    setPbf('');
    setHna('');
    setDiskon('0');
    setStok('0');
    setKontak('');
    setCatatan(presetSku ? `SKU: ${presetSku}` : '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PriceOfferItem) => {
    setEditingOffer(item);
    setNama(item.nama);
    setPbf(item.pbf);
    setHna(item.hna.toString());
    setDiskon(item.diskon.toString());
    setStok((item.stok ?? 0).toString());
    setKontak(item.kontakPbf || '');
    setCatatan(item.catatan || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const hnaVal = parseFloat(hna.replace(/\./g, '').replace(',', '.')) || 0;
    const diskonVal = parseFloat(diskon) || 0;
    const diskonRp = hnaVal * (diskonVal / 100);
    const hppVal = (hnaVal - diskonRp) * 1.11;
    const stokVal = parseInt(stok, 10) || 0;

    // Find master SKU match or generate one
    const masterMatch = findMatchingMasterItem({ id: '', sku: '', nama, pbf, hna: hnaVal, diskon: diskonVal, hpp: hppVal, tglUpdate: '' }, masterList);
    const skuVal = masterMatch ? masterMatch.sku : `SKU-REG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    if (editingOffer) {
      onUpdatePriceOffer({
        ...editingOffer,
        nama: nama.trim(),
        pbf: pbf.trim(),
        hna: hnaVal,
        diskon: diskonVal,
        hpp: hppVal,
        stok: stokVal,
        sku: skuVal,
        kontakPbf: kontak.trim(),
        catatan: catatan.trim(),
        tglUpdate: new Date().toISOString().split('T')[0],
      });
      onShowToast('Penawaran PBF berhasil diperbarui & disinkronkan!', 'success');
    } else {
      onAddPriceOffer({
        id: 'pl_' + Date.now(),
        sku: skuVal,
        nama: nama.trim(),
        pbf: pbf.trim(),
        hna: hnaVal,
        diskon: diskonVal,
        hpp: hppVal,
        stok: stokVal,
        kontakPbf: kontak.trim(),
        catatan: catatan.trim(),
        tglUpdate: new Date().toISOString().split('T')[0],
      });
      onShowToast('Penawaran PBF baru berhasil ditambahkan & disinkronkan ke Master!', 'success');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP SYNCHRONIZATION & SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-amber-500 rounded-2xl shadow-lg shadow-indigo-500/30 text-white">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Komparasi Harga PBF &amp; Sinkronisasi Master
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Auto-Sync Aktif
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {syncSummary.syncedMasterCount} / {syncSummary.totalMaster} SKU Terhubung ({syncSummary.syncPercentage}%)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Data penawaran distributor terhubung langsung dengan Master SKU. Penambahan dari PDF/Excel otomatis sinkron dan terorganisir per obat.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {onFullSync && (
              <button
                id="pricelist-full-sync-btn"
                onClick={onFullSync}
                className="px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition cursor-pointer"
                title="Sinkronkan seluruh kode SKU, daftarkan obat baru ke Master, dan perbarui harga terendah secara otomatis"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Sinkronkan Master &amp; Price List</span>
              </button>
            )}

            {onApplyBestPricesToTransactions && (
              <button
                id="pricelist-apply-best-btn"
                onClick={onApplyBestPricesToTransactions}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 border border-amber-300/40 transition cursor-pointer"
                title="Terapkan harga & PBF termurah dari Komparasi ke Lembar Perhitungan & Usulan Pembelian aktif"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Auto Best-Price ke Transaksi</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync & Savings Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Total Penawaran PBF</span>
            <span className="text-white font-mono font-bold text-base">{priceList.length}</span>
            <span className="text-[10px] text-indigo-300 block">dari {groupedPbfs.length} distributor</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Obat Unik Terdaftar</span>
            <span className="text-white font-mono font-bold text-base">{groupedDrugs.length}</span>
            <span className="text-[10px] text-slate-400 block">{groupedDrugs.filter(d => d.offersCount > 1).length} obat punya &gt;1 PBF</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Ada PBF Lebih Murah</span>
            <span className="text-amber-300 font-mono font-bold text-base">{syncSummary.cheaperOfferCount} SKU</span>
            <span className="text-[10px] text-amber-400/80 block">vs HNA Master saat ini</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Potensi Hemat Total</span>
            <span className="text-emerald-400 font-mono font-bold text-base">
              Rp {Math.round(syncSummary.totalSavingsPotentialRp).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-300/80 block">dengan beralih ke PBF termurah</span>
          </div>
        </div>
      </div>

      {/* 2. TOP TOOLBAR & CONTROLS */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
        {/* Row 1: Search & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU barcode, nama obat (misal: AMOXICILLIN 500mg), atau distributor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 font-medium backdrop-blur-md transition-all"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs backdrop-blur-md self-start lg:self-auto">
            <button
              id="view-mode-grouped-drug"
              onClick={() => setViewMode('grouped-drug')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grouped-drug'
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Per Obat ({groupedDrugs.length})</span>
            </button>

            <button
              id="view-mode-table"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Semua Baris ({priceList.length})</span>
            </button>

            <button
              id="view-mode-grouped-pbf"
              onClick={() => setViewMode('grouped-pbf')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grouped-pbf'
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Per Distributor ({groupedPbfs.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter, Status Filter & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
              {(['all', 'reguler', 'prekursor', 'oot'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Semua Kategori' : cat}
                </button>
              ))}
            </div>

            {/* Quick Status Filter */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition ${
                  statusFilter === 'all' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('lowest')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition flex items-center gap-1 ${
                  statusFilter === 'lowest' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Hanya obat yang memiliki lebih dari 1 pilihan penawaran distributor"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Ada Komparasi</span>
              </button>
              <button
                onClick={() => setStatusFilter('in-stock')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition flex items-center gap-1 ${
                  statusFilter === 'in-stock' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3 h-3 text-cyan-400" />
                <span>Ada Stok</span>
              </button>
              <button
                onClick={() => setStatusFilter('unlinked')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition flex items-center gap-1 ${
                  statusFilter === 'unlinked' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-400/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Penawaran yang belum terhubung dengan Master SKU"
              >
                <Database className="w-3 h-3 text-rose-400" />
                <span>Belum di Master</span>
              </button>
            </div>

            {viewMode === 'grouped-drug' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleAllExpand(true)}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                  Buka Semua
                </button>
                <button
                  onClick={() => toggleAllExpand(false)}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                  Tutup Semua
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500/25 to-indigo-500/25 hover:from-amber-500/35 hover:to-indigo-500/35 text-amber-200 border border-amber-400/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-amber-500/10"
              title="Scan faktur PBF atau foto kemasan obat secara otomatis"
            >
              <Camera className="w-4 h-4 text-amber-300" />
              <span>Scan Faktur / Obat</span>
            </button>

            <button
              id="pricelist-add-btn"
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 border border-amber-400/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Penawaran PBF</span>
            </button>

            {/* Upload & Auto-Read PDF PBF Button */}
            <label className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-rose-500/10">
              {isPdfLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isPdfLoading ? 'Membaca PDF...' : 'Unggah & Baca PDF PBF'}</span>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf, application/pdf"
                onChange={handlePdfUpload}
                disabled={isPdfLoading}
                className="hidden"
              />
            </label>

            <button
              onClick={onExportExcel}
              className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor</span>
            </button>

            <label className="px-3 py-2 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Impor Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={onImportExcel} className="hidden" />
            </label>

            <button
              onClick={onResetPriceList}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs transition cursor-pointer"
              title="Reset seluruh daftar penawaran harga"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF RESULT MODAL */}
      <PdfImportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        parseResult={pdfParseResult}
        fileName={pdfFileName}
        masterList={masterList}
        onConfirmImport={handleConfirmPdfBulkImport}
        onShowToast={onShowToast}
      />

      {/* 3. MAIN CONTENT: VIEW MODES */}

      {/* VIEW MODE 1: GROUPED BY DRUG (ORGANIZED KOMPARASI PER OBAT) */}
      {viewMode === 'grouped-drug' && (
        <div className="space-y-3">
          {filteredGroupedDrugs.length === 0 ? (
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center text-slate-400 text-xs">
              Tidak ada data penawaran harga obat yang cocok dengan filter pencarian.
            </div>
          ) : (
            filteredGroupedDrugs.map((drug) => {
              const isExpanded = expandedDrugs[drug.key] ?? (drug.offersCount > 1 || filteredGroupedDrugs.length <= 5);

              return (
                <div
                  key={drug.key}
                  className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl overflow-hidden shadow-xl transition-all"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleDrugExpand(drug.key)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 cursor-pointer hover:bg-white/[0.02] transition select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDrugExpand(drug.key);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5 border border-white/10 mt-0.5 sm:mt-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white tracking-wide">{drug.nama}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              drug.kategori === 'prekursor'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : drug.kategori === 'oot'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                            }`}
                          >
                            {drug.kategori}
                          </span>

                          {/* Master SKU & Sync Badge */}
                          {drug.masterItem ? (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold flex items-center gap-1">
                              <Database className="w-3 h-3 text-emerald-400" />
                              {drug.masterItem.sku}
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(drug.nama, drug.sku);
                              }}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                              title="Belum terdaftar di Master Catalog. Klik untuk daftarkan."
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span>Belum di Master</span>
                            </button>
                          )}

                          <span className="bg-white/10 text-slate-300 border border-white/10 text-[10px] px-2 py-0.5 rounded-lg font-semibold">
                            {drug.offersCount} Penawaran Distributor
                          </span>
                        </div>

                        {/* Sub-info: Master HNA comparison */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {drug.masterItem && drug.masterItem.hna > 0 && (
                            <span>
                              HNA Master: <strong className="text-slate-200 font-mono">Rp {Math.round(drug.masterItem.hna).toLocaleString('id-ID')}</strong> (HPP: Rp {drug.masterHpp.toLocaleString('id-ID')})
                            </span>
                          )}

                          {drug.offersCount > 1 && drug.priceSpreadRp > 0 && (
                            <span className="text-amber-300 font-medium">
                              Rentang Hemat: <strong className="font-mono">Rp {drug.priceSpreadRp.toLocaleString('id-ID')} ({Math.round(drug.priceSpreadPct)}%)</strong>
                            </span>
                          )}

                          {drug.totalPbfStock > 0 && (
                            <span className="text-cyan-300 flex items-center gap-1 font-mono text-[11px]">
                              <Boxes className="w-3 h-3" /> Total Stok PBF: {drug.totalPbfStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Best Price Highlight Block */}
                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-3.5 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end text-[10px] font-bold text-emerald-400">
                          <Sparkles className="w-3 h-3" />
                          <span>PBF TERMURAH: {drug.lowestOffer.pbf}</span>
                        </div>
                        <div className="text-sm font-mono font-extrabold text-white">
                          Rp {drug.lowestHpp.toLocaleString('id-ID')}
                          <span className="text-[10px] font-normal text-emerald-300/80 ml-1">(+PPN)</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          HNA: Rp {Math.round(drug.lowestOffer.hna).toLocaleString('id-ID')} &bull; Disc: {drug.lowestOffer.diskon}%
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUseInCalculation(drug.lowestOffer);
                        }}
                        className="px-3 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer"
                        title="Gunakan penawaran termurah ini langsung di lembar Surat Pesanan"
                      >
                        <span>Pesan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Nested Table: All PBF offers for this drug */}
                  {isExpanded && (
                    <div className="border-t border-white/10 bg-slate-950/40 p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-[11px] text-slate-400 font-semibold">
                              <th className="p-2 min-w-[140px]">DISTRIBUTOR / PBF</th>
                              <th className="p-2 text-right min-w-[100px]">HNA SATUAN</th>
                              <th className="p-2 text-center min-w-[70px]">DISKON</th>
                              <th className="p-2 text-right min-w-[115px]">HPP (+PPN 11%)</th>
                              <th className="p-2 text-center min-w-[75px]">STOK PBF</th>
                              <th className="p-2 text-center min-w-[90px]">STATUS HARGA</th>
                              <th className="p-2 text-center min-w-[90px]">TGL UPDATE</th>
                              <th className="p-2 text-center min-w-[120px]">AKSI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {drug.offers.map((offer) => {
                              const isLowest = offer.isLowest;
                              const hppRounded = Math.round(offer.hpp);

                              return (
                                <tr
                                  key={offer.id}
                                  className={`hover:bg-white/[0.04] transition ${
                                    isLowest ? 'bg-emerald-500/[0.06]' : ''
                                  }`}
                                >
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                      <Building className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{offer.pbf}</span>
                                    </div>
                                    {offer.kontakPbf && (
                                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                        <Phone className="w-2.5 h-2.5" />
                                        {offer.kontakPbf}
                                      </p>
                                    )}
                                    {offer.catatan && (
                                      <p className="text-[10px] text-slate-400 font-normal">{offer.catatan}</p>
                                    )}
                                  </td>

                                  <td className="p-2.5 text-right font-mono text-slate-200">
                                    Rp {Math.round(offer.hna).toLocaleString('id-ID')}
                                  </td>

                                  <td className="p-2.5 text-center font-mono font-bold text-amber-300">
                                    {offer.diskon}%
                                  </td>

                                  <td className="p-2.5 text-right font-mono font-extrabold text-white">
                                    Rp {hppRounded.toLocaleString('id-ID')}
                                  </td>

                                  <td className="p-2.5 text-center">
                                    {(offer.stok ?? 0) > 0 ? (
                                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 font-mono">
                                        <Boxes className="w-2.5 h-2.5 text-cyan-400" /> {offer.stok}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px] font-mono">0 / -</span>
                                    )}
                                  </td>

                                  <td className="p-2.5 text-center">
                                    {isLowest ? (
                                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-emerald-400" /> Termurah
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px] font-mono">
                                        +Rp {offer.savingsRp.toLocaleString('id-ID')}
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-2.5 text-center font-mono text-slate-400 text-[10px]">
                                    {offer.tglUpdate}
                                  </td>

                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => onUseInCalculation(offer)}
                                        className="px-2 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                        title="Gunakan penawaran ini ke Transaksi"
                                      >
                                        <span>Gunakan</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenEditModal(offer)}
                                        className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                                        title="Edit penawaran ini"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>

                                      <button
                                        onClick={() => onDeletePriceOffer(offer.id)}
                                        className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                                        title="Hapus penawaran ini"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Actions inside Card */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-xs">
                        <span className="text-[11px] text-slate-400">
                          Kode SKU: <strong className="text-indigo-300 font-mono">{drug.sku}</strong>
                        </span>

                        <button
                          onClick={() => handleOpenAddModal(drug.nama, drug.sku)}
                          className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tambah Penawaran PBF untuk Obat Ini</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: FLAT TABLE (SEMUA PENAWARAN PBF) */}
      {viewMode === 'table' && (
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto max-h-[65vh] scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-950/80 backdrop-blur-xl text-slate-200 font-semibold sticky top-0 z-10 border-b border-white/10">
                <tr>
                  <th className="p-3 text-center w-10">NO</th>
                  <th className="p-3 min-w-[110px]">KODE SKU</th>
                  <th className="p-3 min-w-[200px]">NAMA OBAT</th>
                  <th className="p-3 min-w-[140px]">DISTRIBUTOR / PBF</th>
                  <th className="p-3 text-center min-w-[90px]">STOK PBF</th>
                  <th className="p-3 text-right min-w-[110px]">HNA SATUAN</th>
                  <th className="p-3 text-center min-w-[80px]">DISKON (%)</th>
                  <th className="p-3 text-right min-w-[125px]">HPP (+PPN 11%)</th>
                  <th className="p-3 text-center min-w-[110px]">STATUS HARGA</th>
                  <th className="p-3 text-center min-w-[95px]">TGL UPDATE</th>
                  <th className="p-3 text-center min-w-[120px]">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFlatOffers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada data penawaran harga PBF yang cocok. Klik "Unggah &amp; Baca PDF PBF" atau "Tambah Penawaran PBF".
                    </td>
                  </tr>
                ) : (
                  filteredFlatOffers.map((item, idx) => {
                    const matched = findMatchingMasterItem(item, masterList);
                    const itemStock = item.stok ?? 0;
                    const drugGroup = groupedDrugs.find((g) => g.nama.toLowerCase() === item.nama.toLowerCase());
                    const isLowest = drugGroup ? drugGroup.lowestOffer.id === item.id : true;

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.05] transition-colors group">
                        <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-indigo-300 text-[11px]">
                          {item.sku || '-'}
                        </td>
                        <td className="p-3 font-bold text-white">
                          <p>{item.nama}</p>
                          {matched ? (
                            <span className="text-[10px] text-emerald-400 font-mono font-normal flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Tersinkron Master ({matched.sku})
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-normal flex items-center gap-1 mt-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Belum di Master
                            </span>
                          )}
                          {item.catatan && <p className="text-[10px] text-slate-400 font-normal">{item.catatan}</p>}
                        </td>
                        <td className="p-3 font-medium text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-amber-400" />
                            <span>{item.pbf}</span>
                          </div>
                          {item.kontakPbf && <p className="text-[10px] text-slate-400 font-mono">{item.kontakPbf}</p>}
                        </td>

                        {/* Stok PBF Column */}
                        <td className="p-3 text-center">
                          {itemStock > 0 ? (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 font-mono shadow-xs shadow-cyan-500/10">
                              <Boxes className="w-3 h-3 text-cyan-400" /> {itemStock}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-mono">0 / -</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono text-slate-200">
                          Rp {Math.round(item.hna).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-300">{item.diskon}%</td>
                        <td className="p-3 text-right font-mono font-extrabold text-white">
                          Rp {Math.round(item.hpp).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          {isLowest ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 backdrop-blur-md shadow-xs shadow-emerald-500/20">
                              <Sparkles className="w-3 h-3 text-emerald-400" /> Termurah
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400 text-[11px]">{item.tglUpdate}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onUseInCalculation(item)}
                              title="Gunakan Obat Ini di Lembar Perhitungan"
                              className="px-2.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-lg shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer backdrop-blur-md"
                            >
                              <span>Gunakan</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                              title="Edit Penawaran"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePriceOffer(item.id)}
                              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                              title="Hapus Penawaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: GROUPED BY PBF (DISTRIBUTOR CARDS) */}
      {viewMode === 'grouped-pbf' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroupedPbfs.length === 0 ? (
            <div className="col-span-full bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center text-slate-400 text-xs">
              Tidak ada data distributor yang cocok dengan pencarian.
            </div>
          ) : (
            filteredGroupedPbfs.map((pbfGroup) => (
              <div
                key={pbfGroup.pbfName}
                className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 hover:border-indigo-500/30 rounded-3xl p-5 shadow-xl transition space-y-3.5"
              >
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>{pbfGroup.pbfName}</span>
                    </h3>
                    {pbfGroup.contact && (
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {pbfGroup.contact}
                      </p>
                    )}
                  </div>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {pbfGroup.offersCount} Obat
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Katalog</span>
                    <span className="font-bold text-white font-mono">{pbfGroup.offersCount} item</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Rata2 Diskon</span>
                    <span className="font-bold text-amber-300 font-mono">{pbfGroup.avgDiscount.toFixed(1)}%</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Harga Termurah</span>
                    <span className="font-bold text-emerald-400 font-mono">{pbfGroup.lowestPriceCount} obat</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Daftar Produk ({pbfGroup.offers.length}):
                  </span>
                  {pbfGroup.offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-semibold text-white truncate text-[11px]">{offer.nama}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          HNA: Rp {Math.round(offer.hna).toLocaleString('id-ID')} &bull; Disc: {offer.diskon}%
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-300 text-xs block">
                          Rp {Math.round(offer.hpp).toLocaleString('id-ID')}
                        </span>
                        <button
                          onClick={() => onUseInCalculation(offer)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                        >
                          Pesan &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. MODAL TAMBAH / EDIT PENAWARAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl shadow-indigo-950/50 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                {editingOffer ? 'Edit Penawaran Harga PBF' : 'Tambah Penawaran Harga PBF'}
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Pindai gambar/faktur obat untuk mengisi form otomatis"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scan Kamera / Berkas</span>
                </button>

                {!editingOffer && (
                  <label className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer">
                    <FileUp className="w-3 h-3 text-rose-400" />
                    <span>Isi dari PDF</span>
                    <input
                      ref={singlePdfInputRef}
                      type="file"
                      accept=".pdf, application/pdf"
                      onChange={handleSinglePdfAutofill}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-200">Nama Obat (Termasuk Dosis &amp; Kemasan) *</label>
                  <span className="text-[10px] text-amber-300 font-medium">Sinkron otomatis ke Master</span>
                </div>
                <input
                  type="text"
                  required
                  value={nama}
                  onFocus={() => setShowNameSuggestions(true)}
                  onChange={(e) => {
                    setNama(e.target.value);
                    setShowNameSuggestions(true);
                  }}
                  placeholder="Contoh: AMOXICILLIN 500mg / Ibuprofen 400mg"
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-amber-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                />

                {/* Auto-suggest dropdown from Master & Price List */}
                {showNameSuggestions && drugSuggestions.length > 0 && nama.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 space-y-1 max-h-56 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center justify-between border-b border-white/10">
                      <span>Saran Obat dari Master &amp; Katalog:</span>
                      <button
                        type="button"
                        onClick={() => setShowNameSuggestions(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {drugSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left p-2 rounded-xl hover:bg-white/10 transition flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate group-hover:text-amber-300">
                            {sug.nama}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {sug.sku ? `SKU: ${sug.sku} • ` : ''}{sug.pabrik && sug.pabrik !== '-' ? `Pabrik: ${sug.pabrik} • ` : ''}Kemasan: {sug.kemasan}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {sug.hna > 0 && (
                            <span className="font-mono font-bold text-emerald-300 text-xs block">
                              Rp {Math.round(sug.hna).toLocaleString('id-ID')}
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-amber-300 uppercase">
                            {sug.source === 'master' ? 'Master SKU' : sug.source === 'both' ? 'Master + PBF' : 'Price List'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Connection badge to Master */}
                {matchedMasterItem && (
                  <div className="mt-1.5 p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">
                        Terhubung Master: <strong>{matchedMasterItem.sku}</strong> (HNA Terakhir: Rp {Math.round(matchedMasterItem.hna).toLocaleString('id-ID')})
                      </span>
                    </div>
                    {(!hna || !pbf) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (matchedMasterItem.pbf && matchedMasterItem.pbf !== '-') setPbf(matchedMasterItem.pbf);
                          if (matchedMasterItem.hna > 0) setHna(matchedMasterItem.hna.toString());
                          onShowToast(`PBF & HNA dari Master berhasil diisikan!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-[10px] shrink-0 transition cursor-pointer"
                      >
                        Salin Data Master
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Distributor / PBF *</label>
                <PbfAutocompleteInput
                  value={pbf}
                  onChange={setPbf}
                  onAutoRegisterPbf={onAutoRegisterPbf}
                  suppliers={suppliers}
                  priceList={priceList}
                  drugName={nama}
                  placeholder="Cari atau ketik nama PBF..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">HNA Satuan *</label>
                  <input
                    type="text"
                    required
                    value={hna}
                    onChange={(e) => setHna(e.target.value)}
                    placeholder="Contoh: 25000"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">Diskon (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={diskon}
                    onChange={(e) => setDiskon(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-mono font-bold focus:border-amber-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">Stok PBF</label>
                  <input
                    type="number"
                    value={stok}
                    onChange={(e) => setStok(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Kontak / Sales PBF</label>
                  <input
                    type="text"
                    value={kontak}
                    onChange={(e) => setKontak(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Catatan Penawaran</label>
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Misal: Promo Akhir Bulan"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Data penawaran ini otomatis tersinkronisasi dengan katalog Master SKU Apotek.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Simpan &amp; Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Vision Scanner Modal (Kamera / Berkas) */}
      <MedicineVisionScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        targetContext="pricelist"
        existingMasterList={masterList}
        existingPriceList={priceList}
        onApplyScannedData={handleApplyScannedPriceOffer}
        onDirectSaveAndSync={handleDirectSaveScannedOffer}
        onShowToast={onShowToast}
      />
    </div>
  );
};
