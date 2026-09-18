import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Edit,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  Barcode,
  Layers,
  Sparkles,
  Building2,
  Calendar,
  CheckCircle,
  Tag,
  Zap,
  TrendingDown,
  Phone,
  Boxes,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  Camera,
} from 'lucide-react';
import { DrugCategory, MasterDrugItem, PriceOfferItem, ScannedMedicineData, SupplierItem } from '../../types';
import { generateSKU } from '../../utils/db';
import {
  findMatchingPriceOffers,
  getMasterPriceSyncSummary,
  searchDrugSuggestions,
  DrugSuggestion,
} from '../../utils/masterPriceSync';
import { normalizeDrugName } from '../../utils/bestPriceHelper';
import { MedicineVisionScannerModal } from '../Scanner/MedicineVisionScannerModal';
import { PbfAutocompleteInput } from '../Common/PbfAutocompleteInput';
import { SatuanAutocompleteInput } from '../Common/SatuanAutocompleteInput';

interface MasterViewProps {
  masterList: MasterDrugItem[];
  priceList?: PriceOfferItem[];
  suppliers?: SupplierItem[];
  unitsList?: string[];
  allDistinctUnits?: string[];
  onSaveUnit?: (unit: string) => void;
  onAutoRegisterPbf?: (pbfName: string) => void;
  onOpenUnitsManager?: () => void;
  onAddMasterItem: (item: MasterDrugItem) => void;
  onUpdateMasterItem: (item: MasterDrugItem) => void;
  onDeleteMasterItem: (id: string) => void;
  onExportExcel: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
  onFullSync?: () => void;
  onApplyCheapestPricesToMaster?: () => void;
  onAddPriceOffer?: (offer: PriceOfferItem) => void;
}

export const MasterView: React.FC<MasterViewProps> = ({
  masterList,
  priceList = [],
  suppliers = [],
  unitsList = [],
  allDistinctUnits = [],
  onSaveUnit,
  onAutoRegisterPbf,
  onOpenUnitsManager,
  onAddMasterItem,
  onUpdateMasterItem,
  onDeleteMasterItem,
  onExportExcel,
  onImportExcel,
  onShowToast,
  onFullSync,
  onApplyCheapestPricesToMaster,
  onAddPriceOffer,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DrugCategory>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<'all' | 'has-offers' | 'cheaper-available' | 'no-offers'>('all');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDrugItem | null>(null);

  // Offers viewing & quick adding modal
  const [selectedMasterForOffers, setSelectedMasterForOffers] = useState<MasterDrugItem | null>(null);
  const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);
  const [newOfferPbf, setNewOfferPbf] = useState('');
  const [newOfferHna, setNewOfferHna] = useState('');
  const [newOfferDiskon, setNewOfferDiskon] = useState('0');
  const [newOfferStok, setNewOfferStok] = useState('0');
  const [newOfferKontak, setNewOfferKontak] = useState('');

  // Form states for Master Item
  const [sku, setSku] = useState('');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<DrugCategory>('reguler');
  const [pabrik, setPabrik] = useState('');
  const [kemasan, setKemasan] = useState('');
  const [pbf, setPbf] = useState('');
  const [hna, setHna] = useState('');
  const [historyHarga, setHistoryHarga] = useState('');
  const [stok, setStok] = useState('0');
  const [minStok, setMinStok] = useState('5');
  const [satuan, setSatuan] = useState('Box');

  // Scanner & Auto-Suggestion States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Intelligent Suggestions across Master and Price List
  const drugSuggestions = useMemo(
    () => searchDrugSuggestions(nama, masterList, priceList, 6),
    [nama, masterList, priceList]
  );

  // Matching Price List offer for current drug name
  const matchingPriceOffer = useMemo(() => {
    if (!nama || nama.trim().length < 2) return undefined;
    const norm = normalizeDrugName(nama);
    return priceList.find(
      (p) => normalizeDrugName(p.nama) === norm || (sku && p.sku === sku)
    );
  }, [nama, sku, priceList]);

  const handleSelectSuggestion = (sug: DrugSuggestion) => {
    setNama(sug.nama);
    if (!editingItem && sug.sku) setSku(sug.sku);
    setKategori(sug.kategori);
    if (sug.pabrik && sug.pabrik !== '-') setPabrik(sug.pabrik);
    if (sug.kemasan) setKemasan(sug.kemasan);
    if (sug.satuan) setSatuan(sug.satuan);
    if (sug.pbf && sug.pbf !== '-') setPbf(sug.pbf);
    if (sug.hna > 0) {
      setHna(sug.hna.toString());
      if (!historyHarga) setHistoryHarga(sug.hna.toString());
    }
    if (sug.stok > 0) setStok(sug.stok.toString());
    setShowNameSuggestions(false);
    onShowToast(`Data obat "${sug.nama}" terisi otomatis dari katalog & PBF!`, 'success');
  };

  const handleApplyScannedMedicine = (scanned: ScannedMedicineData) => {
    setNama(scanned.nama);
    if (scanned.sku && !editingItem) {
      setSku(scanned.sku);
    } else if (!editingItem) {
      setSku(generateSKU(scanned.kategori || 'reguler'));
    }
    if (scanned.kategori) setKategori(scanned.kategori);
    if (scanned.pabrik && scanned.pabrik !== '-') setPabrik(scanned.pabrik);
    if (scanned.kemasan) setKemasan(scanned.kemasan);
    if (scanned.satuan) setSatuan(scanned.satuan);
    if (scanned.pbf && scanned.pbf !== '-') setPbf(scanned.pbf);
    if (scanned.hna && scanned.hna > 0) {
      setHna(scanned.hna.toString());
      setHistoryHarga(scanned.hna.toString());
    }
    if (scanned.stok !== undefined) setStok(scanned.stok.toString());
    if (!isModalOpen) {
      setEditingItem(null);
      setIsModalOpen(true);
    }
    onShowToast(`Data obat "${scanned.nama}" hasil pemindaian berhasil diisikan ke form!`, 'success');
  };

  const handleDirectSaveAndSyncScanned = (scanned: ScannedMedicineData) => {
    const finalCat = scanned.kategori || 'reguler';
    const finalSku = scanned.sku || generateSKU(finalCat);
    const finalHna = scanned.hna || 0;
    const newItem: MasterDrugItem = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sku: finalSku,
      nama: scanned.nama,
      kategori: finalCat,
      pabrik: scanned.pabrik || '-',
      kemasan: scanned.kemasan || 'Box',
      pbf: scanned.pbf || '-',
      hna: finalHna,
      historyHarga: finalHna,
      tanggal: new Date().toISOString().split('T')[0],
      stok: scanned.stok || 0,
      minStok: 5,
      satuan: scanned.satuan || 'Box',
    };
    onAddMasterItem(newItem);
    onShowToast(`Obat "${newItem.nama}" langsung disimpan & otomatis disinkronkan ke Master & Price List!`, 'success');
  };

  // Summary of Sync
  const syncSummary = useMemo(
    () => getMasterPriceSyncSummary(masterList, priceList),
    [masterList, priceList]
  );

  // Map of Master ID -> enriched offers info
  const masterSyncMap = useMemo(() => {
    const map = new Map<string, {
      offers: PriceOfferItem[];
      offersCount: number;
      lowestHpp: number;
      bestPbf: string;
      bestOffer?: PriceOfferItem;
      hasCheaper: boolean;
      savingsRp: number;
      savingsPct: number;
    }>();

    masterList.forEach((m) => {
      const offers = findMatchingPriceOffers(m, priceList);
      if (offers.length > 0) {
        const sorted = [...offers].sort((a, b) => a.hpp - b.hpp);
        const best = sorted[0];
        const masterHpp = Math.round((m.hna || 0) * 1.11);
        const lowestHpp = Math.round(best.hpp);
        const hasCheaper = lowestHpp < masterHpp;
        const savingsRp = hasCheaper ? masterHpp - lowestHpp : 0;
        const savingsPct = masterHpp > 0 ? (savingsRp / masterHpp) * 100 : 0;

        map.set(m.id, {
          offers,
          offersCount: offers.length,
          lowestHpp,
          bestPbf: best.pbf,
          bestOffer: best,
          hasCheaper,
          savingsRp,
          savingsPct,
        });
      }
    });

    return map;
  }, [masterList, priceList]);

  // Filtered master list
  const filtered = useMemo(() => {
    return masterList.filter((item) => {
      const matchesCat = categoryFilter === 'all' || item.kategori === categoryFilter;
      const matchesSearch =
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
        (item.pabrik && item.pabrik.toLowerCase().includes(search.toLowerCase())) ||
        (item.pbf && item.pbf.toLowerCase().includes(search.toLowerCase()));

      const syncInfo = masterSyncMap.get(item.id);
      let matchesStatus = true;
      if (syncStatusFilter === 'has-offers') {
        matchesStatus = !!syncInfo && syncInfo.offersCount > 0;
      } else if (syncStatusFilter === 'cheaper-available') {
        matchesStatus = !!syncInfo && syncInfo.hasCheaper;
      } else if (syncStatusFilter === 'no-offers') {
        matchesStatus = !syncInfo || syncInfo.offersCount === 0;
      }

      return matchesCat && matchesSearch && matchesStatus;
    });
  }, [masterList, search, categoryFilter, syncStatusFilter, masterSyncMap]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setKategori('reguler');
    setSku(generateSKU('reguler'));
    setNama('');
    setPabrik('');
    setKemasan('Box');
    setPbf('');
    setHna('');
    setHistoryHarga('');
    setStok('0');
    setMinStok('5');
    setSatuan('Box');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MasterDrugItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setNama(item.nama);
    setKategori(item.kategori || 'reguler');
    setPabrik(item.pabrik || '');
    setKemasan(item.kemasan || '');
    setPbf(item.pbf || '');
    setHna(item.hna ? item.hna.toString() : '');
    setHistoryHarga(item.historyHarga ? item.historyHarga.toString() : '');
    setStok((item.stok ?? 0).toString());
    setMinStok((item.minStok ?? 5).toString());
    setSatuan(item.satuan || 'Box');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const hnaVal = parseFloat(hna.replace(/\./g, '').replace(',', '.')) || 0;
    const histVal = parseFloat(historyHarga.replace(/\./g, '').replace(',', '.')) || hnaVal;
    const stokVal = parseInt(stok) || 0;
    const minStokVal = parseInt(minStok) || 0;

    if (editingItem) {
      onUpdateMasterItem({
        ...editingItem,
        sku: sku.trim() || generateSKU(kategori),
        nama: nama.trim(),
        kategori,
        pabrik: pabrik.trim() || '-',
        kemasan: kemasan.trim() || '-',
        pbf: pbf.trim() || '-',
        hna: hnaVal,
        historyHarga: histVal,
        stok: stokVal,
        minStok: minStokVal,
        satuan: satuan.trim() || 'Box',
      });
      onShowToast(`Master obat "${nama}" berhasil diperbarui & disinkronkan!`, 'success');
    } else {
      onAddMasterItem({
        id: 'm_' + Date.now(),
        sku: sku.trim() || generateSKU(kategori),
        nama: nama.trim(),
        kategori,
        pabrik: pabrik.trim() || '-',
        kemasan: kemasan.trim() || '-',
        pbf: pbf.trim() || '-',
        hna: hnaVal,
        historyHarga: histVal,
        tanggal: new Date().toISOString().split('T')[0],
        stok: stokVal,
        minStok: minStokVal,
        satuan: satuan.trim() || 'Box',
      });
      onShowToast(`Obat baru "${nama}" dengan SKU ${sku} berhasil didaftarkan & disinkronkan ke Price List!`, 'success');
    }
    setIsModalOpen(false);
  };

  // 1-Click apply lowest PBF price directly to this master row
  const handleApplyLowestPriceToRow = (item: MasterDrugItem) => {
    const syncInfo = masterSyncMap.get(item.id);
    if (!syncInfo || !syncInfo.bestOffer) return;

    const best = syncInfo.bestOffer;
    onUpdateMasterItem({
      ...item,
      historyHarga: item.hna > 0 ? item.hna : best.hna,
      hna: best.hna,
      pbf: best.pbf,
      tanggal: best.tglUpdate || new Date().toISOString().split('T')[0],
    });
    onShowToast(
      `HNA Master "${item.nama}" diperbarui ke Rp ${Math.round(best.hna).toLocaleString('id-ID')} (${best.pbf})!`,
      'success'
    );
  };

  // Quick Open Add Offer modal for this specific master item
  const handleOpenAddOfferModal = (item: MasterDrugItem) => {
    setSelectedMasterForOffers(item);
    setNewOfferPbf('');
    setNewOfferHna(item.hna > 0 ? item.hna.toString() : '');
    setNewOfferDiskon('0');
    setNewOfferStok('0');
    setNewOfferKontak('');
    setIsAddOfferModalOpen(true);
  };

  // Save new offer for this master item
  const handleSaveNewOfferForMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterForOffers || !onAddPriceOffer) return;

    const hnaVal = parseFloat(newOfferHna.replace(/\./g, '').replace(',', '.')) || 0;
    const diskonVal = parseFloat(newOfferDiskon) || 0;
    const diskonRp = hnaVal * (diskonVal / 100);
    const hppVal = (hnaVal - diskonRp) * 1.11;
    const stokVal = parseInt(newOfferStok, 10) || 0;

    const newOffer: PriceOfferItem = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sku: selectedMasterForOffers.sku,
      nama: selectedMasterForOffers.nama,
      pbf: newOfferPbf.trim(),
      hna: hnaVal,
      diskon: diskonVal,
      hpp: hppVal,
      stok: stokVal,
      kontakPbf: newOfferKontak.trim(),
      tglUpdate: new Date().toISOString().split('T')[0],
      catatan: `Penawaran dari Master SKU ${selectedMasterForOffers.sku}`,
    };

    onAddPriceOffer(newOffer);
    onShowToast(
      `Penawaran PBF (${newOfferPbf}) untuk "${selectedMasterForOffers.nama}" berhasil ditambahkan & disinkronkan!`,
      'success'
    );
    setIsAddOfferModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP SYNCHRONIZATION & SUMMARY CARD */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-2xl shadow-lg shadow-indigo-500/30 text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Master Data Obat &amp; SKU Apotek
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Tersinkron Otomatis dengan Price List
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {syncSummary.syncedMasterCount} / {masterList.length} SKU Memiliki Penawaran PBF ({syncSummary.syncPercentage}%)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Katalog resmi master SKU apotek. Terhubung otomatis dua arah dengan data komparasi harga distributor / PBF.
              </p>
            </div>
          </div>

          {/* Action Buttons in Banner */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {onApplyCheapestPricesToMaster && syncSummary.cheaperOfferCount > 0 && (
              <button
                id="master-apply-cheapest-btn"
                onClick={onApplyCheapestPricesToMaster}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 border border-emerald-400/40 transition cursor-pointer"
                title="Perbarui seluruh HNA Master dengan harga PBF terendah yang aktif saat ini"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Terapkan Harga Termurah PBF ke Master ({syncSummary.cheaperOfferCount})</span>
              </button>
            )}

            {onFullSync && (
              <button
                id="master-full-sync-btn"
                onClick={onFullSync}
                className="px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition cursor-pointer"
                title="Sinkronkan seluruh data SKU, daftarkan obat yang ada di Price List ke Master, dan satukan kode SKU"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Sinkronkan Master &amp; Price List</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Total SKU Master</span>
            <span className="text-white font-mono font-bold text-base">{masterList.length}</span>
            <span className="text-[10px] text-slate-400 block">Katalog Obat Resmi</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Tersinkron PBF</span>
            <span className="text-emerald-400 font-mono font-bold text-base">{syncSummary.syncedMasterCount} SKU</span>
            <span className="text-[10px] text-emerald-300/80 block">dari {priceList.length} penawaran PBF</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Ada PBF Lebih Murah</span>
            <span className="text-amber-300 font-mono font-bold text-base">{syncSummary.cheaperOfferCount} SKU</span>
            <span className="text-[10px] text-amber-400/80 block">siap dioptimalkan</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Potensi Efisiensi Biaya</span>
            <span className="text-emerald-300 font-mono font-bold text-base">
              Rp {Math.round(syncSummary.totalSavingsPotentialRp).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-400 block">dibanding HNA saat ini</span>
          </div>
        </div>
      </div>

      {/* 2. TOP TOOLBAR & FILTERS */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-2xl">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full lg:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU barcode, nama obat, pabrik, atau distributor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 font-medium backdrop-blur-md transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs backdrop-blur-md">
            {(['all', 'reguler', 'prekursor', 'oot'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>

          {/* Sync Status Filter */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setSyncStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition ${
                syncStatusFilter === 'all' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSyncStatusFilter('has-offers')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition flex items-center gap-1 ${
                syncStatusFilter === 'has-offers' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3 h-3 text-emerald-400" />
              <span>Ada PBF</span>
            </button>
            <button
              onClick={() => setSyncStatusFilter('cheaper-available')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition flex items-center gap-1 ${
                syncStatusFilter === 'cheaper-available' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Obat yang memiliki harga distributor lebih murah dari HNA Master"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>PBF Lebih Murah</span>
            </button>
            <button
              onClick={() => setSyncStatusFilter('no-offers')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition ${
                syncStatusFilter === 'no-offers' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-400/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Belum Ada PBF
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {onOpenUnitsManager && (
            <button
              id="master-manage-units-btn"
              type="button"
              onClick={onOpenUnitsManager}
              className="px-3.5 py-2.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-teal-500/10"
              title="Kelola Daftar Master Satuan Apotek"
            >
              <Tag className="w-3.5 h-3.5 text-teal-300" />
              <span>Kelola Satuan ({unitsList.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500/25 to-indigo-500/25 hover:from-amber-500/35 hover:to-indigo-500/35 text-amber-200 border border-amber-400/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-amber-500/10"
            title="Scan kemasan obat atau faktur PBF menggunakan kamera / berkas gambar"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>Scan Kamera / Berkas</span>
          </button>

          <button
            id="master-add-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition cursor-pointer backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master SKU</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-emerald-500/10"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <label className="px-4 py-2.5 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Impor Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={onImportExcel} className="hidden" />
          </label>
        </div>
      </div>

      {/* 3. MASTER DRUGS TABLE WITH PBF COMPARISON */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[65vh] scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950/80 backdrop-blur-xl text-slate-200 font-semibold sticky top-0 z-10 border-b border-white/10">
              <tr>
                <th className="p-3 text-center w-10">NO</th>
                <th className="p-3 min-w-[120px]">KODE SKU</th>
                <th className="p-3 min-w-[200px]">NAMA OBAT</th>
                <th className="p-3 min-w-[95px]">KATEGORI</th>
                <th className="p-3 min-w-[110px]">PABRIK</th>
                <th className="p-3 min-w-[85px]">KEMASAN</th>
                <th className="p-3 min-w-[180px]">PBF &amp; KOMPARASI PENAWARAN</th>
                <th className="p-3 text-right min-w-[105px]">HNA MASTER</th>
                <th className="p-3 text-right min-w-[115px]">HPP (+PPN 11%)</th>
                <th className="p-3 text-center min-w-[70px]">STOK</th>
                <th className="p-3 text-center min-w-[95px]">TGL BELI</th>
                <th className="p-3 text-center min-w-[110px]">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada obat dalam Master Data yang sesuai filter. Klik "Tambah Master SKU" atau ubah filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const hppPpn = Math.round((item.hna || 0) * 1.11);
                  const isLowStock = (item.stok ?? 0) <= (item.minStok ?? 5);
                  const syncInfo = masterSyncMap.get(item.id);

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.05] transition-colors group">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-300 text-[11px] select-all">
                        {item.sku}
                      </td>
                      <td className="p-3 font-bold text-white">
                        <p>{item.nama}</p>
                      </td>
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
                      <td className="p-3 text-slate-400">{item.pabrik || '-'}</td>
                      <td className="p-3 text-slate-400">{item.kemasan || '-'}</td>

                      {/* PBF & Price List Comparison Info */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-amber-300">
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{item.pbf || '-'}</span>
                          </div>

                          {syncInfo && syncInfo.offersCount > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                onClick={() => setSelectedMasterForOffers(item)}
                                className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-lg font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                title="Lihat semua penawaran harga distributor untuk obat ini"
                              >
                                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                                <span>{syncInfo.offersCount} Penawaran PBF</span>
                              </button>

                              {syncInfo.hasCheaper && (
                                <button
                                  onClick={() => handleApplyLowestPriceToRow(item)}
                                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-lg font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                  title={`Klik untuk update HNA ke penawaran terendah: ${syncInfo.bestPbf} Rp ${syncInfo.lowestHpp.toLocaleString('id-ID')} (-Rp ${syncInfo.savingsRp.toLocaleString('id-ID')})`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{syncInfo.bestPbf} Rp {syncInfo.lowestHpp.toLocaleString('id-ID')} (-{Math.round(syncInfo.savingsPct)}%)</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAddOfferModal(item)}
                              className="text-[10px] text-slate-500 hover:text-amber-300 flex items-center gap-1 transition"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Tambah Tawaran PBF</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono text-slate-200">
                        Rp {Math.round(item.hna || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-indigo-300 bg-indigo-500/10 rounded-xl">
                        Rp {hppPpn.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-lg text-xs backdrop-blur-md ${
                            isLowStock
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-white/10 text-slate-200 border border-white/10'
                          }`}
                        >
                          {item.stok ?? 0}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                        {item.tanggal || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAddOfferModal(item)}
                            className="p-1.5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 rounded-lg transition cursor-pointer"
                            title="Tambah penawaran PBF baru untuk obat ini"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                            title="Edit Master SKU"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMasterItem(item.id)}
                            className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Hapus Master SKU"
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

      {/* 4. MODAL DETAIL PENAWARAN PBF UNTUK SUATU OBAT */}
      {selectedMasterForOffers && !isAddOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl shadow-indigo-950/50 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>Komparasi Distributor PBF: {selectedMasterForOffers.nama}</span>
                </h3>
                <p className="text-xs text-indigo-300 font-mono mt-0.5">
                  Kode SKU: {selectedMasterForOffers.sku} &bull; HNA Master Saat Ini: Rp {Math.round(selectedMasterForOffers.hna).toLocaleString('id-ID')}
                </p>
              </div>

              <button
                onClick={() => setSelectedMasterForOffers(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Offers */}
            {(() => {
              const syncInfo = masterSyncMap.get(selectedMasterForOffers.id);
              const offers = syncInfo?.offers || [];

              if (offers.length === 0) {
                return (
                  <div className="p-6 text-center text-slate-400 text-xs bg-white/5 rounded-2xl border border-white/10">
                    Belum ada penawaran distributor yang terdaftar untuk obat ini.
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {offers.map((offer) => {
                    const isLowest = offer.id === syncInfo?.bestOffer?.id;
                    const hppVal = Math.round(offer.hpp);

                    return (
                      <div
                        key={offer.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                          isLowest
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              {offer.pbf}
                            </span>
                            {isLowest && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                Termurah
                              </span>
                            )}
                            {(offer.stok ?? 0) > 0 && (
                              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                                Stok: {offer.stok}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            HNA: Rp {Math.round(offer.hna).toLocaleString('id-ID')} &bull; Diskon: {offer.diskon}% &bull; Tgl: {offer.tglUpdate}
                          </div>
                          {offer.kontakPbf && (
                            <p className="text-[10px] text-slate-400 font-mono">Kontak: {offer.kontakPbf}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">HPP (+PPN 11%)</span>
                            <span className="text-sm font-extrabold text-white font-mono">
                              Rp {hppVal.toLocaleString('id-ID')}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              onUpdateMasterItem({
                                ...selectedMasterForOffers,
                                hna: offer.hna,
                                pbf: offer.pbf,
                                historyHarga: selectedMasterForOffers.hna,
                                tanggal: offer.tglUpdate,
                              });
                              onShowToast(`HNA Master disesuaikan dengan penawaran ${offer.pbf}!`, 'success');
                              setSelectedMasterForOffers(null);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
                          >
                            Jadikan Master
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  handleOpenAddOfferModal(selectedMasterForOffers);
                }}
                className="px-3.5 py-2 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Penawaran PBF untuk Obat Ini</span>
              </button>

              <button
                onClick={() => setSelectedMasterForOffers(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs rounded-xl font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL TAMBAH PENAWARAN PBF UNTUK MASTER OBAT */}
      {isAddOfferModalOpen && selectedMasterForOffers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl shadow-indigo-950/50 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Tambah Tawaran PBF untuk: {selectedMasterForOffers.nama}</span>
              </h3>
              <button
                onClick={() => setIsAddOfferModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewOfferForMaster} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Distributor / PBF *</label>
                <PbfAutocompleteInput
                  value={newOfferPbf}
                  onChange={setNewOfferPbf}
                  onAutoRegisterPbf={onAutoRegisterPbf}
                  suppliers={suppliers}
                  priceList={priceList}
                  drugName={selectedMasterForOffers?.nama}
                  placeholder="Cari atau ketik nama PBF baru..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">HNA Satuan *</label>
                  <input
                    type="text"
                    required
                    value={newOfferHna}
                    onChange={(e) => setNewOfferHna(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">Diskon (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOfferDiskon}
                    onChange={(e) => setNewOfferDiskon(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-mono font-bold focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1.5">Stok PBF</label>
                  <input
                    type="number"
                    value={newOfferStok}
                    onChange={(e) => setNewOfferStok(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Kontak / Sales Distributor</label>
                <input
                  type="text"
                  value={newOfferKontak}
                  onChange={(e) => setNewOfferKontak(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOfferModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Simpan &amp; Sinkronkan ke Price List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL FORM MASTER OBAT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl shadow-indigo-950/50 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                {editingItem ? 'Edit Master Obat & SKU' : 'Tambah Master Obat & SKU Baru'}
              </h3>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Pindai gambar kemasan atau faktur PBF untuk mengisi form otomatis"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan Kamera / Berkas</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-indigo-300 font-mono font-bold focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
                <div className="col-span-2 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-200">Nama Obat Lengkap *</label>
                    <span className="text-[10px] text-indigo-300 font-medium">Sinkron ke Price List</span>
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
                    placeholder="Contoh: Paracetamol Tab 500mg"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />

                  {/* Auto-suggest dropdown from Master & Price List */}
                  {showNameSuggestions && drugSuggestions.length > 0 && nama.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 space-y-1 max-h-56 overflow-y-auto">
                      <div className="px-2 py-1 text-[10px] text-indigo-300 font-bold uppercase tracking-wider flex items-center justify-between border-b border-white/10">
                        <span>Saran Data dari Katalog &amp; PBF:</span>
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
                            <p className="font-bold text-white text-xs truncate group-hover:text-indigo-300">
                              {sug.nama}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {sug.pbf !== '-' ? `PBF: ${sug.pbf}` : ''} • Kemasan: {sug.kemasan} • Satuan: {sug.satuan}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {sug.hna > 0 && (
                              <span className="font-mono font-bold text-emerald-300 text-xs block">
                                Rp {Math.round(sug.hna).toLocaleString('id-ID')}
                              </span>
                            )}
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 uppercase">
                              {sug.source === 'both' ? 'Master + PBF' : sug.source === 'pricelist' ? 'Price List' : 'Master'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Banner if matching Price List offer is found */}
                  {matchingPriceOffer && !editingItem && (!hna || !pbf) && (
                    <div className="mt-1.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          Ditemukan di Price List: <strong>{matchingPriceOffer.pbf}</strong> (HNA Rp {Math.round(matchingPriceOffer.hna).toLocaleString('id-ID')})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPbf(matchingPriceOffer.pbf);
                          setHna(matchingPriceOffer.hna.toString());
                          if (!historyHarga) setHistoryHarga(matchingPriceOffer.hna.toString());
                          onShowToast(`PBF & HNA terisi dari data Price List!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-[10px] shrink-0 transition cursor-pointer"
                      >
                        Isi Otomatis
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Kategori Obat</label>
                  <select
                    value={kategori}
                    onChange={(e) => {
                      const newCat = e.target.value as DrugCategory;
                      setKategori(newCat);
                      if (!editingItem) setSku(generateSKU(newCat));
                    }}
                    className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-slate-850 focus:outline-hidden"
                  >
                    <option value="reguler">Reguler</option>
                    <option value="prekursor">Prekursor</option>
                    <option value="oot">Obat-Obat Tertentu (OOT)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Produsen / Pabrik</label>
                  <input
                    type="text"
                    value={pabrik}
                    onChange={(e) => setPabrik(e.target.value)}
                    placeholder="Contoh: Kimia Farma, Kalbe, Sanbe"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Kemasan</label>
                  <input
                    type="text"
                    value={kemasan}
                    onChange={(e) => setKemasan(e.target.value)}
                    placeholder="Contoh: Box 10 Strip @ 10 Tab"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Distributor / PBF Rekomendasi</label>
                  <PbfAutocompleteInput
                    value={pbf}
                    onChange={setPbf}
                    onAutoRegisterPbf={onAutoRegisterPbf}
                    suppliers={suppliers}
                    priceList={priceList}
                    drugName={nama}
                    placeholder="Cari / ketik PBF..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">HNA Terakhir (Rp) *</label>
                  <input
                    type="text"
                    required
                    value={hna}
                    onChange={(e) => setHna(e.target.value)}
                    placeholder="Contoh: 15.000"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">History Harga Beli Terakhir (Rp)</label>
                  <input
                    type="text"
                    value={historyHarga}
                    onChange={(e) => setHistoryHarga(e.target.value)}
                    placeholder="Jika kosong akan sama dengan HNA"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Sisa Stok Fisik</label>
                  <input
                    type="number"
                    value={stok}
                    onChange={(e) => setStok(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Batas Min Stok</label>
                  <input
                    type="number"
                    value={minStok}
                    onChange={(e) => setMinStok(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-rose-300 font-mono focus:border-rose-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1.5">Satuan</label>
                  <SatuanAutocompleteInput
                    value={satuan}
                    onChange={setSatuan}
                    onSaveUnit={onSaveUnit}
                    unitsList={unitsList}
                    allDistinctUnits={allDistinctUnits}
                    placeholder="Cari / ketik satuan..."
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Data obat dan distributor ini otomatis tersinkronisasi dengan Komparasi Price List PBF.</span>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 cursor-pointer"
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
        targetContext="master"
        existingMasterList={masterList}
        existingPriceList={priceList}
        onApplyScannedData={handleApplyScannedMedicine}
        onDirectSaveAndSync={handleDirectSaveAndSyncScanned}
        onShowToast={onShowToast}
      />
    </div>
  );
};
