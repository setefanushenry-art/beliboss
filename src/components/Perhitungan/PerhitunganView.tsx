import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ArrowUpDown,
  Calculator,
  Percent,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Tag,
  Search,
  Zap,
  Building,
  Check,
  Smartphone,
  Table,
  Minus,
  ChevronRight,
  Info,
  Truck,
  Pill,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { DrugCalculationRow, DrugCategory, MasterDrugItem, PriceOfferItem, PurchaseHistoryItem, SupplierItem } from '../../types';
import {
  findBestPriceForDrug,
  getDrugSuggestionsWithBestPrice,
  calculateDrugSimilarity,
  parseDrugNameAndDosage,
  findLastPurchaseInfo,
  DrugSuggestionItem,
} from '../../utils/bestPriceHelper';
import { NominalInput, PercentageInput } from '../Common/NominalInput';
import { PbfAutocompleteInput } from '../Common/PbfAutocompleteInput';
import { SatuanAutocompleteInput } from '../Common/SatuanAutocompleteInput';
import { BentukSediaanInput } from '../Common/BentukSediaanInput';

interface PerhitunganViewProps {
  category: DrugCategory;
  rows: DrugCalculationRow[];
  diskonCOD: number;
  masterList: MasterDrugItem[];
  priceList: PriceOfferItem[];
  history?: PurchaseHistoryItem[];
  suppliers?: SupplierItem[];
  unitsList?: string[];
  allDistinctUnits?: string[];
  targetPbf?: string;
  onUpdateTargetPbf?: (pbfName: string) => void;
  onApplyTargetPbfToAllRows?: (pbfName: string) => void;
  onSaveUnit?: (unit: string) => void;
  onAutoRegisterPbf?: (pbfName: string) => void;
  onOpenUnitsManager?: () => void;
  onUpdateRow: (id: string, field: keyof DrugCalculationRow, value: any) => void;
  onAddRow: (presetPbf?: string) => void;
  onRemoveRow: (id: string) => void;
  onDuplicateRow: (row: DrugCalculationRow) => void;
  onUpdateDiskonCOD: (val: number) => void;
  onSelectMasterDrug: (rowId: string, master: MasterDrugItem) => void;
  onApplyAllBestPrices?: () => void;
  onSwitchToUsulan: () => void;
  onCommitHistory: () => void;
}

export const PerhitunganView: React.FC<PerhitunganViewProps> = ({
  category,
  rows,
  diskonCOD,
  masterList,
  priceList,
  history = [],
  suppliers = [],
  unitsList = [],
  allDistinctUnits = [],
  targetPbf = '',
  onUpdateTargetPbf,
  onApplyTargetPbfToAllRows,
  onSaveUnit,
  onAutoRegisterPbf,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onDuplicateRow,
  onUpdateDiskonCOD,
  onSelectMasterDrug,
  onApplyAllBestPrices,
  onSwitchToUsulan,
  onCommitHistory,
}) => {
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'card'>('auto');
  const [bulkPbfInput, setBulkPbfInput] = useState(targetPbf || '');

  // Keep bulkPbfInput in sync if targetPbf changes from outside
  React.useEffect(() => {
    if (targetPbf) {
      setBulkPbfInput(targetPbf);
    }
  }, [targetPbf]);

  // Bulk set PBF across all rows and auto-sync priceList
  const handleApplyBulkPbf = (pbfToApply?: string) => {
    const selectedPbf = (pbfToApply !== undefined ? pbfToApply : bulkPbfInput).trim();
    if (!selectedPbf) return;

    if (onApplyTargetPbfToAllRows) {
      onApplyTargetPbfToAllRows(selectedPbf);
    } else {
      // Direct local update across ALL rows (including empty ones!)
      const targetLower = selectedPbf.toLowerCase();
      rows.forEach((row) => {
        const updates: Partial<DrugCalculationRow> = {
          pbf: selectedPbf,
          pbfTerakhir: selectedPbf,
        };
        // Auto-sync with priceList if available
        if (row.nama && row.nama.trim().length > 0) {
          const cleanDrug = (row.nama || '').trim().toLowerCase();
          const matchedOffer = priceList?.find(
            (pl) =>
              (pl.pbf || '').trim().toLowerCase() === targetLower &&
              ((pl.nama || '').trim().toLowerCase() === cleanDrug ||
                cleanDrug.includes((pl.nama || '').trim().toLowerCase()) ||
                (pl.nama || '').trim().toLowerCase().includes(cleanDrug) ||
                calculateDrugSimilarity(cleanDrug, (pl.nama || '').trim().toLowerCase()) >= 0.65)
          );
          if (matchedOffer) {
            const disc = (matchedOffer as any).diskonPct ?? matchedOffer.diskon ?? 0;
            const isPpn = row.includePpn !== false;
            const hnaPlusPpn = isPpn ? Math.round(matchedOffer.hna * 1.11) : matchedOffer.hna;
            const discFactor = (100 - disc) / 100;
            const nettoHna = matchedOffer.hna * discFactor;
            const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
            updates.hna = matchedOffer.hna;
            updates.diskonPct = disc;
            updates.hnaPlusPpn = hnaPlusPpn;
            updates.hargaJadi = newHargaJadi;
            if (matchedOffer.sku && !row.sku) updates.sku = matchedOffer.sku;
          }
        }
        (onUpdateRow as any)(row.id, updates);
      });
    }

    if (onUpdateTargetPbf) {
      onUpdateTargetPbf(selectedPbf);
    }
    setBulkPbfInput(selectedPbf);
  };

  const handleClearBulkPbf = () => {
    if (onApplyTargetPbfToAllRows) {
      onApplyTargetPbfToAllRows('-');
    } else {
      rows.forEach((row) => {
        onUpdateRow(row.id, 'pbf', '');
        onUpdateRow(row.id, 'pbfTerakhir', '');
      });
    }
    if (onUpdateTargetPbf) {
      onUpdateTargetPbf('');
    }
    setBulkPbfInput('');
  };

  // Top distinct registered PBF names for quick 1-click pills
  const availablePbfList = React.useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.nama && s.nama.trim()) set.add(s.nama.trim());
    });
    priceList.forEach((p) => {
      if (p.pbf && p.pbf.trim()) set.add(p.pbf.trim());
    });
    rows.forEach((r) => {
      if (r.pbf && r.pbf.trim()) set.add(r.pbf.trim());
    });
    return Array.from(set).filter(Boolean).slice(0, 8);
  }, [suppliers, priceList, rows]);

  // Handle HNA + PPN Input (calculates HNA = hnaPlusPpn / 1.11 if PPN is active)
  const handleHnaPlusPpnChange = (id: string, val: number, isPpn: boolean = true) => {
    const rawNum = typeof val === 'number' && !isNaN(val) ? val : 0;
    const hna = isPpn ? Math.round(rawNum / 1.11) : rawNum;
    onUpdateRow(id, 'hnaPlusPpn', rawNum);
    onUpdateRow(id, 'hna', hna);
  };

  // Handle HNA Input (calculates HNA + PPN = hna * 1.11 if PPN is active)
  const handleHnaChange = (id: string, val: number, isPpn: boolean = true) => {
    const rawNum = typeof val === 'number' && !isNaN(val) ? val : 0;
    const hnaPlusPpn = isPpn ? Math.round(rawNum * 1.11) : rawNum;
    onUpdateRow(id, 'hna', rawNum);
    onUpdateRow(id, 'hnaPlusPpn', hnaPlusPpn);
  };

  // Toggle PPN 11% vs Harga Jadi (Tanpa PPN)
  const handleTogglePpn = (row: DrugCalculationRow) => {
    const currentIsPpn = row.includePpn !== false;
    const nextIsPpn = !currentIsPpn;
    onUpdateRow(row.id, 'includePpn', nextIsPpn);
    if (!nextIsPpn) {
      // Switched to Tanpa PPN (Harga Jadi): HNA + PPN equals HNA
      onUpdateRow(row.id, 'hnaPlusPpn', row.hna || 0);
    } else {
      // Switched to Kena PPN 11%: HNA + PPN = HNA * 1.11
      onUpdateRow(row.id, 'hnaPlusPpn', Math.round((row.hna || 0) * 1.11));
    }
  };

  // Calculate totals
  let totalHna = 0;
  let totalPpn = 0;
  let totalSubtotal = 0;
  let nonPpnItemCount = 0;

  rows.forEach((r) => {
    const isPpn = r.includePpn !== false;
    const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
    const hnaStlhDiskon = (r.hna || 0) - diskonRp;
    const hpp = isPpn ? hnaStlhDiskon * 1.11 : hnaStlhDiskon;
    const subtotal = hpp * (r.beli || 0);

    const rowHnaTotal = hnaStlhDiskon * (r.beli || 0);
    totalHna += rowHnaTotal;
    if (isPpn) {
      totalPpn += rowHnaTotal * 0.11;
    } else {
      nonPpnItemCount++;
    }
    totalSubtotal += subtotal;
  });

  const totalPlusPpn = totalHna + totalPpn;
  const codDiscountRp = totalPlusPpn * ((diskonCOD || 0) / 100);
  const grandTotalEstimasi = totalPlusPpn - codDiscountRp;

  // Count available best-price optimizations across rows
  let betterPriceCount = 0;
  rows.forEach((r) => {
    if (r.nama && r.nama.trim().length > 1) {
      const best = findBestPriceForDrug(r.nama, priceList, r.hna, r.diskonPct, r.pbf);
      if (best && best.hasMatch && !best.isCurrentBest) betterPriceCount++;
    }
  });

  // Autocomplete Suggestions with calculated HPP & real purchase history
  const currentSuggestions: DrugSuggestionItem[] =
    activeSearchRowId && searchTerm.trim().length > 0
      ? getDrugSuggestionsWithBestPrice(searchTerm, masterList, priceList, history)
      : [];

  const handleSelectSuggestion = (
    rowId: string,
    suggestion: DrugSuggestionItem,
    selectedOfferIdx: number = 0
  ) => {
    const currentRow = rows.find((r) => r.id === rowId);
    const effectiveTargetPbf = (currentRow?.pbf || targetPbf || bulkPbfInput || '').trim();
    const hasActivePbf = effectiveTargetPbf && effectiveTargetPbf !== '-';

    // If an active PBF is specified, check if this suggestion has an offer from that specific PBF!
    let offer = suggestion.offers[selectedOfferIdx];
    if (hasActivePbf && suggestion.offers && suggestion.offers.length > 0) {
      const pbfOffer = suggestion.offers.find(
        (o) => (o.pbf || '').trim().toLowerCase() === effectiveTargetPbf.toLowerCase()
      );
      if (pbfOffer) {
        offer = pbfOffer;
      }
    }

    const cleanName = suggestion.cleanNama || suggestion.nama;
    const sediaanOrSatuan = suggestion.dosageForm || suggestion.satuan || '';

    // Obtain last purchase information from history and master to extract riwayat diskon, previous price, and last date
    const lastPurchase = findLastPurchaseInfo(
      {
        nama: cleanName,
        sku: suggestion.sku,
        pbfTerakhir: currentRow?.pbfTerakhir,
      },
      history,
      masterList,
      priceList
    );

    const hna = offer && offer.hna > 0 ? offer.hna : (suggestion.bestHna > 0 ? suggestion.bestHna : (lastPurchase.hna || 0));
    // Discount hierarchy: specific PBF offer diskon -> suggestion bestDiskon -> last purchase history diskon
    let diskon = offer ? offer.diskon : suggestion.bestDiskon;
    if ((diskon === undefined || diskon === 0) && lastPurchase.diskon && lastPurchase.diskon > 0) {
      diskon = lastPurchase.diskon;
    }

    const pbf = hasActivePbf ? effectiveTargetPbf : (offer ? offer.pbf : (suggestion.bestPbf || lastPurchase.pbf || 'Distributor Utama'));

    const isPpn = currentRow ? currentRow.includePpn !== false : true;
    const discFactor = (100 - (diskon || 0)) / 100;
    const nettoHna = hna * discFactor;
    const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
    const hnaPlusPpn = isPpn ? Math.round(hna * 1.11) : hna;

    const pbfNote = `PBF: ${pbf} (HNA Rp ${Math.round(hna).toLocaleString('id-ID')}${diskon > 0 ? ` Disc ${diskon}%` : ''})`;
    const catatan =
      !currentRow?.catatan || currentRow.catatan.includes('PBF Termurah:') || currentRow.catatan.includes('Saran PBF:') || currentRow.catatan.includes('PBF:')
        ? pbfNote
        : currentRow.catatan;

    // Find master record if available for additional details like manufacturer and stock
    const matchedMaster = masterList.find((m) =>
      (suggestion.sku && m.sku && m.sku.toLowerCase() === suggestion.sku.toLowerCase()) ||
      m.nama.toLowerCase() === cleanName.toLowerCase()
    );

    const updates: Partial<DrugCalculationRow> = {
      nama: cleanName,
      sku: suggestion.sku || matchedMaster?.sku || currentRow?.sku || '',
      bentukSediaan: sediaanOrSatuan || matchedMaster?.satuan || 'Tablet',
      kemasan: sediaanOrSatuan || matchedMaster?.kemasan || 'Box',
      satuan: sediaanOrSatuan || matchedMaster?.satuan || 'Box',
      pabrik: suggestion.pabrik || matchedMaster?.pabrik || '-',
      hna,
      hnaPlusPpn,
      diskonPct: diskon,
      hargaJadi,
      pbf,
      pbfTerakhir: lastPurchase.pbf || matchedMaster?.pbf || '',
      tanggal: lastPurchase.tanggal || matchedMaster?.tanggal || currentRow?.tanggal || '',
      historyHarga: lastPurchase.historyHarga > 0 ? lastPurchase.historyHarga : (matchedMaster?.historyHarga || hargaJadi),
      catatan,
      stok: offer?.stok ?? suggestion.bestStock ?? (matchedMaster?.stok ?? 0),
      minta: currentRow?.minta && currentRow.minta > 0 ? currentRow.minta : 1,
      beli: currentRow?.beli && currentRow.beli > 0 ? currentRow.beli : 1,
    };

    (onUpdateRow as any)(rowId, updates);
    setActiveSearchRowId(null);
  };

  const handleDrugNameBlur = (row: DrugCalculationRow) => {
    // Autosearch and sync all drug columns & discount history on blur/enter
    if (!row.nama || row.nama.trim().length < 2) return;

    // Detect physical dosage form without destroying the user's drug name
    const parsed = parseDrugNameAndDosage(row.nama);
    const effectiveName = parsed.cleanNama || row.nama;
    const cleanDrug = effectiveName.trim().toLowerCase();
    const rawDrug = row.nama.trim().toLowerCase();

    const updates: Partial<DrugCalculationRow> = {};

    // Auto-populate bentukSediaan and satuan/kemasan
    const sediaan = parsed.dosageForm || '';
    if (sediaan) {
      if (!row.bentukSediaan) updates.bentukSediaan = sediaan;
      if (!row.satuan) updates.satuan = sediaan;
      if (!row.kemasan) updates.kemasan = sediaan;
    }

    const effectivePbf = (row.pbf || targetPbf || bulkPbfInput || '').trim();
    const hasActivePbf = effectivePbf && effectivePbf !== '-';

    if (hasActivePbf && (!row.pbf || row.pbf === '-')) {
      updates.pbf = effectivePbf;
      updates.pbfTerakhir = effectivePbf;
    }

    // Check last purchase info to get true purchase history & discount
    const lastPurchase = findLastPurchaseInfo(
      {
        ...row,
        nama: effectiveName,
      },
      history,
      masterList,
      priceList
    );

    // Check Master List for SKU, pabrik, hna, stok
    const matchedMaster = masterList.find(
      (m) =>
        (row.sku && m.sku && m.sku.toLowerCase() === row.sku.toLowerCase()) ||
        m.nama.toLowerCase() === cleanDrug ||
        m.nama.toLowerCase() === rawDrug ||
        calculateDrugSimilarity(cleanDrug, m.nama.toLowerCase()) >= 0.7
    );

    if (matchedMaster) {
      if (!row.sku && matchedMaster.sku) updates.sku = matchedMaster.sku;
      if (!row.pabrik && matchedMaster.pabrik) updates.pabrik = matchedMaster.pabrik;
      if (!row.bentukSediaan && matchedMaster.satuan) updates.bentukSediaan = matchedMaster.satuan;
      if (!row.kemasan && matchedMaster.kemasan) updates.kemasan = matchedMaster.kemasan;
      if (!row.satuan && matchedMaster.satuan) updates.satuan = matchedMaster.satuan;
      if (row.stok === undefined && matchedMaster.stok !== undefined) updates.stok = matchedMaster.stok;
    }

    // Auto-populate last purchase date and history price if available
    if (lastPurchase.tanggal && !row.tanggal) updates.tanggal = lastPurchase.tanggal;
    if (lastPurchase.historyHarga > 0 && (!row.historyHarga || row.historyHarga <= 0)) {
      updates.historyHarga = lastPurchase.historyHarga;
    }
    if (lastPurchase.pbf && (!row.pbfTerakhir || row.pbfTerakhir === '-')) {
      updates.pbfTerakhir = lastPurchase.pbf;
    }

    // 1. If an active PBF is set, prioritize finding an offer from this specific PBF!
    let matchedOfferFromActivePbf: PriceOfferItem | undefined;
    if (hasActivePbf && priceList && priceList.length > 0) {
      const pbfKey = effectivePbf.toLowerCase();
      matchedOfferFromActivePbf = priceList.find((pl) => {
        const plPbf = (pl.pbf || '').trim().toLowerCase();
        if (plPbf !== pbfKey) return false;
        const plName = (pl.nama || (pl as any).namaObat || '').trim().toLowerCase();
        return (
          plName === cleanDrug ||
          plName === rawDrug ||
          cleanDrug.includes(plName) ||
          plName.includes(cleanDrug) ||
          calculateDrugSimilarity(cleanDrug, plName) >= 0.65
        );
      });
    }

    if (matchedOfferFromActivePbf) {
      const isPpn = row.includePpn !== false;
      const disc = (matchedOfferFromActivePbf as any).diskonPct ?? matchedOfferFromActivePbf.diskon ?? 0;
      const hnaPlusPpn = isPpn ? Math.round(matchedOfferFromActivePbf.hna * 1.11) : matchedOfferFromActivePbf.hna;
      const discFactor = (100 - disc) / 100;
      const nettoHna = matchedOfferFromActivePbf.hna * discFactor;
      const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

      updates.pbf = effectivePbf;
      updates.pbfTerakhir = effectivePbf;
      updates.hna = matchedOfferFromActivePbf.hna;
      updates.diskonPct = disc;
      updates.hnaPlusPpn = hnaPlusPpn;
      updates.hargaJadi = hargaJadi;
      if (matchedOfferFromActivePbf.sku && !row.sku) {
        updates.sku = matchedOfferFromActivePbf.sku;
      }
      if (!row.catatan) {
        updates.catatan = `PBF: ${effectivePbf} (HNA Rp ${Math.round(matchedOfferFromActivePbf.hna).toLocaleString('id-ID')}${disc > 0 ? ` Disc ${disc}%` : ''})`;
      }
    } else {
      // 2. Check best price across all PBFs or from purchase history / master
      const bestResult =
        findBestPriceForDrug(row.nama, priceList, row.hna, row.diskonPct, effectivePbf || row.pbf) ||
        findBestPriceForDrug(effectiveName, priceList, row.hna, row.diskonPct, effectivePbf || row.pbf);

      if (bestResult && bestResult.hasMatch) {
        const isPpn = row.includePpn !== false;
        let effectiveDisc = bestResult.bestDiskon;
        if (effectiveDisc === 0 && lastPurchase.diskon && lastPurchase.diskon > 0) {
          effectiveDisc = lastPurchase.diskon;
        }
        const discFactor = (100 - effectiveDisc) / 100;
        const nettoHna = bestResult.bestHna * discFactor;
        const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

        if (!hasActivePbf) {
          if (!row.pbf || !row.hna || row.hna === 0) {
            updates.hna = bestResult.bestHna;
            updates.hnaPlusPpn = isPpn ? Math.round(bestResult.bestHna * 1.11) : bestResult.bestHna;
            updates.diskonPct = effectiveDisc;
            updates.hargaJadi = hargaJadi;
            updates.pbf = bestResult.bestPbfName;
            updates.pbfTerakhir = bestResult.bestPbfName;
            if (bestResult.bestOffer?.sku && !row.sku) updates.sku = bestResult.bestOffer.sku;
            if (!row.catatan) {
              updates.catatan = `Saran PBF: ${bestResult.bestPbfName} (Termurah di Pricelist)`;
            }
          }
        } else {
          updates.pbf = effectivePbf;
          updates.pbfTerakhir = effectivePbf;
          if (!row.hna || row.hna === 0) {
            updates.hna = bestResult.bestHna;
            updates.hnaPlusPpn = isPpn ? Math.round(bestResult.bestHna * 1.11) : bestResult.bestHna;
            updates.diskonPct = effectiveDisc;
            updates.hargaJadi = hargaJadi;
            if (!row.catatan) {
              updates.catatan = `PBF: ${effectivePbf} (Estimasi pricelist: ${bestResult.bestPbfName})`;
            }
          }
        }
      } else if (matchedMaster && (!row.hna || row.hna === 0)) {
        // Adopt master prices and riwayat diskon
        const isPpn = row.includePpn !== false;
        let disc = lastPurchase.diskon || 0;
        if (disc === 0 && matchedMaster.historyHarga > 0 && matchedMaster.hna > 0 && matchedMaster.historyHarga < matchedMaster.hna * 1.11) {
          disc = Math.max(0, Math.round(((matchedMaster.hna * 1.11 - matchedMaster.historyHarga) / (matchedMaster.hna * 1.11)) * 1000) / 10);
        }
        const discFactor = (100 - disc) / 100;
        const nettoHna = matchedMaster.hna * discFactor;
        const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

        updates.hna = matchedMaster.hna;
        updates.hnaPlusPpn = isPpn ? Math.round(matchedMaster.hna * 1.11) : matchedMaster.hna;
        updates.diskonPct = disc;
        updates.hargaJadi = hargaJadi;
        if (!row.pbf) {
          updates.pbf = hasActivePbf ? effectivePbf : (matchedMaster.pbf || 'Distributor Utama');
        }
        if (!row.pbfTerakhir && matchedMaster.pbf) {
          updates.pbfTerakhir = matchedMaster.pbf;
        }
      } else if (hasActivePbf && !row.pbf) {
        updates.pbf = effectivePbf;
      }
    }

    if (Object.keys(updates).length > 0) {
      (onUpdateRow as any)(row.id, updates);
    }
  };

  const activeNamedRowsCount = rows.filter((r) => r.nama && r.nama.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* FITUR PENYETELAN PBF KOLEKTIF SERENTAK (OTOMATIS 1 KALI INPUT UNTUK SEMUA BARIS) */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-indigo-950/70 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 backdrop-blur-2xl shadow-2xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Truck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Setel Distributor (PBF) Serentak untuk Semua Baris</span>
                </h3>
                <span className="text-[10px] bg-indigo-500/25 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-indigo-300" /> 1x Input Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ketik atau pilih PBF sekali saja, seluruh {activeNamedRowsCount > 0 ? `${activeNamedRowsCount} baris obat aktif` : 'baris obat pada lembar ini'} langsung otomatis disetel dan disinkronkan dengan penawaran harga.
              </p>
            </div>
          </div>

          {targetPbf && targetPbf !== '-' && (
            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-xl shadow-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold truncate max-w-[220px]">PBF Aktif: {targetPbf}</span>
            </div>
          )}
        </div>

        {/* Control Bar: PBF Search + Apply Button + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 min-w-[260px]">
            <PbfAutocompleteInput
              value={bulkPbfInput}
              onChange={(val) => setBulkPbfInput(val)}
              onSelectSupplier={(s) => {
                setBulkPbfInput(s.nama);
                handleApplyBulkPbf(s.nama);
              }}
              onAutoRegisterPbf={onAutoRegisterPbf}
              suppliers={suppliers}
              priceList={priceList}
              placeholder="Ketik / cari nama PBF (contoh: PT. Kimia Farma, Enseval, Mensa, APL)..."
              compact={false}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyBulkPbf()}
              disabled={!bulkPbfInput.trim()}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg cursor-pointer min-h-[40px] ${
                bulkPbfInput.trim()
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-500/25 border border-indigo-400/40 active:scale-95'
                  : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
              }`}
              title="Terapkan nama PBF ini ke semua baris obat dalam sheet perhitungan ini"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Terapkan ke Semua Baris</span>
            </button>

            {targetPbf && targetPbf !== '-' && (
              <button
                type="button"
                onClick={handleClearBulkPbf}
                className="px-3 py-2.5 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px] flex items-center gap-1.5"
                title="Kosongkan PBF pada seluruh baris obat"
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset PBF</span>
              </button>
            )}
          </div>
        </div>

        {targetPbf && targetPbf !== '-' && (
          <p className="text-[11px] text-emerald-300/90 flex items-center gap-1.5 pt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>PBF <strong>"{targetPbf}"</strong> aktif &amp; otomatis diterapkan ke setiap baris baru yang ditambahkan.</span>
          </p>
        )}

        {/* Quick Chips of Registered PBFs */}
        {availablePbfList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Pilihan Cepat PBF:
            </span>
            {availablePbfList.map((pbfName) => {
              const currentPbfStr = (typeof targetPbf === 'string' ? targetPbf : '') || (typeof bulkPbfInput === 'string' ? bulkPbfInput : '');
              const isCurrent = currentPbfStr.trim().toLowerCase() === pbfName.toLowerCase();
              return (
                <button
                  key={pbfName}
                  type="button"
                  onClick={() => {
                    setBulkPbfInput(pbfName);
                    handleApplyBulkPbf(pbfName);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{pbfName}</span>
                  {isCurrent && <Check className="w-3 h-3 text-white" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. INTERACTIVE MATRIX / CARD SPREADSHEET */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header info bar */}
        <div className="bg-white/[0.06] backdrop-blur-md px-4 py-3 border-b border-white/10 flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] backdrop-blur-md ${
                category === 'prekursor'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : category === 'oot'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
              }`}
            >
              Kategori: {category}
            </span>
            <span className="text-slate-300 font-medium">
              Sheet Perhitungan &bull; {rows.length} Baris Obat
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
            {/* View Mode Switcher (Mobile Card vs Table) */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'card' || (viewMode === 'auto' && typeof window !== 'undefined' && window.innerWidth < 640)
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Kartu Ramah Layar Smartphone (Touch-Friendly)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Kartu HP</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'table' || (viewMode === 'auto' && typeof window !== 'undefined' && window.innerWidth >= 640)
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Tabel Spreadsheet Lengkap"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tabel</span>
              </button>
            </div>

            {/* Auto Best Price Button */}
            {onApplyAllBestPrices && (
              <button
                type="button"
                onClick={onApplyAllBestPrices}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold border border-amber-300/30 shadow-md shadow-indigo-500/20 transition cursor-pointer backdrop-blur-md"
                title="Terapkan harga dan distributor termurah dari data Komparasi PBF ke seluruh obat di lembar ini"
              >
                <Zap className="w-3.5 h-3.5 text-amber-200" />
                <span>Auto Best-Price</span>
                {betterPriceCount > 0 && (
                  <span className="bg-amber-300 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {betterPriceCount} Lebih Murah
                  </span>
                )}
              </button>
            )}

            <span className="hidden md:flex items-center gap-1.5 text-[11px] bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto SKU &amp; Sync Master
            </span>
          </div>
        </div>

        {/* 2. CARD VIEW (FOR MOBILE OR WHEN USER SELECTS CARD MODE) */}
        {(viewMode === 'card' || (viewMode === 'auto' && typeof window !== 'undefined' && window.innerWidth < 640)) && (
          <div className="p-3 sm:p-4 space-y-3.5 sm:hidden">
            {rows.map((row, idx) => {
              const isPpn = row.includePpn !== false;
              const diskonRp = (row.hna || 0) * ((row.diskonPct || 0) / 100);
              const hnaStlhDiskon = (row.hna || 0) - diskonRp;
              const hpp = isPpn ? hnaStlhDiskon * 1.11 : hnaStlhDiskon;
              const subtotal = hpp * (row.beli || 0);

              const bestResult = row.nama && row.nama.trim().length > 1
                ? findBestPriceForDrug(row.nama, priceList, row.hna, row.diskonPct, row.pbf)
                : null;
              const hasBetterOffer = bestResult && bestResult.hasMatch && !bestResult.isCurrentBest && bestResult.bestOffer;

              return (
                <div
                  key={row.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3 backdrop-blur-xl shadow-lg relative"
                >
                  {/* Top card header */}
                  <div className="flex justify-between items-center gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs flex items-center justify-center border border-indigo-400/30">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={row.sku || ''}
                        onChange={(e) => onUpdateRow(row.id, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="p-1 bg-white/5 border border-white/10 rounded-lg text-indigo-300 font-mono font-bold text-[10px] max-w-[120px]"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicateRow(row)}
                        title="Duplikasi Baris"
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveRow(row.id)}
                        title="Hapus Baris"
                        className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Drug Name Input with Smart HPP Autocomplete */}
                  <div className="relative">
                    <label className="block text-[10px] text-slate-400 font-medium mb-1">
                      NAMA OBAT &amp; SPESIFIKASI:
                    </label>
                    <input
                      type="text"
                      value={row.nama || ''}
                      onChange={(e) => {
                        onUpdateRow(row.id, 'nama', e.target.value);
                        setSearchTerm(e.target.value);
                        setActiveSearchRowId(row.id);
                      }}
                      onFocus={() => {
                        setActiveSearchRowId(row.id);
                        setSearchTerm(row.nama || '');
                      }}
                      onBlur={() => handleDrugNameBlur(row)}
                      placeholder="Ketik nama obat / dosis..."
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-sm focus:outline-hidden focus:border-indigo-400 focus:bg-white/10"
                    />

                    {/* Best Price Available Banner on Card */}
                    {hasBetterOffer && bestResult.bestOffer && (
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-2 text-emerald-300 backdrop-blur-md">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[11px] leading-tight">
                            <strong>{bestResult.bestPbfName}</strong> HPP: Rp {Math.round(bestResult.bestHpp).toLocaleString('id-ID')} &bull; Hemat Rp {Math.round(bestResult.savingsRp).toLocaleString('id-ID')}/u
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const isRowPpn = row.includePpn !== false;
                            onUpdateRow(row.id, 'hna', bestResult.bestHna);
                            onUpdateRow(row.id, 'hnaPlusPpn', isRowPpn ? Math.round(bestResult.bestHna * 1.11) : bestResult.bestHna);
                            onUpdateRow(row.id, 'diskonPct', bestResult.bestDiskon);
                            onUpdateRow(row.id, 'pbf', bestResult.bestPbfName);
                            if (bestResult.bestOffer?.sku) onUpdateRow(row.id, 'sku', bestResult.bestOffer.sku);
                            onUpdateRow(
                              row.id,
                              'catatan',
                              `PBF Termurah: ${bestResult.bestPbfName} (HNA Rp ${Math.round(bestResult.bestHna).toLocaleString('id-ID')}${bestResult.bestDiskon > 0 ? ` Disc ${bestResult.bestDiskon}%` : ''})`
                            );
                          }}
                          className="px-2.5 py-1 bg-emerald-500/40 hover:bg-emerald-500/60 text-white rounded-lg font-bold text-xs shrink-0"
                        >
                          Pakai
                        </button>
                      </div>
                    )}

                    {/* Autocomplete Dropdown Popup */}
                    {activeSearchRowId === row.id && currentSuggestions.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-30 w-full bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <div className="p-2 bg-white/5 border-b border-white/10 text-[11px] font-bold text-indigo-300 flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> SARAN OBAT &amp; HPP TERMURAH
                            <span className="text-[9px] font-normal text-indigo-200/70 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-400/20">
                              Bentuk fisik dipisah otomatis
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSearchRowId(null)}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            &times;
                          </button>
                        </div>
                        {currentSuggestions.map((sug) => (
                          <div
                            key={sug.id}
                            className="border-b border-white/5 p-2.5 hover:bg-white/5 transition"
                          >
                            <div
                              onClick={() => handleSelectSuggestion(row.id, sug, 0)}
                              className="cursor-pointer"
                            >
                              <div className="flex justify-between items-start gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs">
                                    {sug.cleanNama || sug.nama}
                                  </span>
                                  {sug.dosageForm && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 shadow-xs">
                                      {sug.dosageForm}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-indigo-300 font-mono shrink-0">
                                  {sug.sku}
                                </span>
                              </div>

                              {/* Accurate HPP & Diskon Breakdown in Card View */}
                              <div className="mt-1.5 flex flex-col gap-1 text-[11px] bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-2.5 text-emerald-200">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1 font-bold text-emerald-300">
                                    <span>✨ HPP:</span>
                                    <span className="font-mono text-white text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/40">
                                      Rp {Number(sug.bestHpp).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] text-emerald-400 font-normal">
                                      {sug.bestDiskon > 0 ? '(HNA Netto + PPN 11%)' : '(HNA + PPN 11%)'}
                                    </span>
                                  </div>
                                  <span className="font-bold text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/30">
                                    {sug.bestPbf}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300 pt-1 border-t border-emerald-500/25 font-mono">
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">HNA KATALOG:</span>
                                    <span className="text-white font-semibold">Rp {Number(sug.bestHna).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">RIWAYAT DISKON:</span>
                                    <span className={sug.bestDiskon > 0 ? "text-amber-300 font-bold" : "text-slate-400"}>
                                      {sug.bestDiskon > 0 ? `${sug.bestDiskon}% (-Rp ${Number(sug.bestDiskonRp || 0).toLocaleString('id-ID')})` : '0%'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">HNA NETTO (STLH DISK):</span>
                                    <span className="text-emerald-300 font-semibold">Rp {Number(sug.bestNettoHna || sug.bestHna).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">BRUTO HNA+PPN (11%):</span>
                                    <span className="text-slate-300">Rp {Number(sug.bestHnaPlusPpn || (sug.bestHna * 1.11)).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                                <div className="text-[9px] text-emerald-400/90 pt-0.5 flex items-center justify-between">
                                  <span>💡 Klik untuk mengisi otomatis seluruh kolom baris obat</span>
                                </div>
                              </div>
                            </div>

                            {/* Multiple PBF offers selector */}
                            {sug.offers.length > 1 && (
                              <div className="mt-2 pt-1 border-t border-white/5">
                                <span className="text-[9px] text-slate-400 block mb-1">
                                  PILIH DISTRIBUTOR / PBF LAIN:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {sug.offers.map((off, oIdx) => (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => handleSelectSuggestion(row.id, sug, oIdx)}
                                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition ${
                                        off.isBestHpp
                                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                      }`}
                                    >
                                      {off.pbf}: Rp {Math.round(off.hpp).toLocaleString('id-ID')}
                                      {off.diskon > 0 ? ` (-${off.diskon}%)` : ''}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual Bentuk Sediaan Selector (Sirup, Tablet, Drop, dll.) */}
                  <div className="pt-0.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Pill className="w-3 h-3 text-indigo-400" />
                        <span>BENTUK SEDIAAN (SIRUP / TABLET / DLL):</span>
                      </label>
                      <span className="text-[9px] text-indigo-300/80 font-mono">
                        Bebas Ketik / Pilih
                      </span>
                    </div>
                    <BentukSediaanInput
                      value={row.bentukSediaan || ''}
                      onChange={(val) => {
                        onUpdateRow(row.id, 'bentukSediaan' as any, val);
                        if (!row.satuan && !row.kemasan) {
                          onUpdateRow(row.id, 'satuan' as any, val);
                          onUpdateRow(row.id, 'kemasan', val);
                        }
                      }}
                      onApplyToName={(sediaan) => {
                        if (!row.nama.toLowerCase().includes(sediaan.toLowerCase())) {
                          onUpdateRow(row.id, 'nama', `${row.nama.trim()} (${sediaan})`);
                        }
                      }}
                      placeholder="Ketik atau pilih sediaan (Sirup, Tablet, Drop, dll)..."
                      compact={false}
                      showQuickChips={true}
                    />
                  </div>

                  {/* Quantity Stepper, Satuan & PBF Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-medium mb-1">
                        JUMLAH BELI (QTY):
                      </label>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(0, (row.beli || 0) - 1);
                            onUpdateRow(row.id, 'beli', newQty);
                            onUpdateRow(row.id, 'minta', newQty);
                          }}
                          className="px-3 py-2.5 text-slate-300 hover:bg-white/10 active:bg-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-base cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={row.beli ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            onUpdateRow(row.id, 'beli', val);
                            onUpdateRow(row.id, 'minta', val);
                          }}
                          className="w-full text-center font-mono font-extrabold text-indigo-200 text-sm bg-transparent focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = (row.beli || 0) + 1;
                            onUpdateRow(row.id, 'beli', newQty);
                            onUpdateRow(row.id, 'minta', newQty);
                          }}
                          className="px-3 py-2.5 text-slate-300 hover:bg-white/10 active:bg-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-base cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-medium mb-1">
                        SATUAN KEMASAN:
                      </label>
                      <SatuanAutocompleteInput
                        value={row.kemasan || (row as any).satuan || ''}
                        onChange={(val) => {
                          onUpdateRow(row.id, 'kemasan', val);
                          onUpdateRow(row.id, 'satuan' as any, val);
                        }}
                        onSaveUnit={onSaveUnit}
                        unitsList={unitsList}
                        allDistinctUnits={allDistinctUnits}
                        placeholder="Box/Strip/Btl..."
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] text-slate-400 font-medium">
                          DISTRIBUTOR (PBF):
                        </label>
                        {row.pbf && (
                          <button
                            type="button"
                            onClick={() => handleApplyBulkPbf(row.pbf)}
                            className="text-[9px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-600 px-1.5 py-0.2 rounded border border-indigo-400/30 transition flex items-center gap-0.5 font-semibold cursor-pointer"
                            title={`Terapkan "${row.pbf}" ke semua baris obat`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-300" />
                            <span>Setel ke Semua Baris</span>
                          </button>
                        )}
                      </div>
                      <PbfAutocompleteInput
                        value={row.pbf || ''}
                        onChange={(val) => {
                          const trimmed = val.trim();
                          if (!trimmed) {
                            onUpdateRow(row.id, 'pbf', '');
                            return;
                          }
                          const pbfKey = trimmed.toLowerCase();
                          const cleanDrug = (row.nama || '').trim().toLowerCase();
                          const offer = priceList?.find(
                            (pl) =>
                              (pl.pbf || '').trim().toLowerCase() === pbfKey &&
                              (((pl.nama || (pl as any).namaObat || '').trim().toLowerCase() === cleanDrug) ||
                                calculateDrugSimilarity(cleanDrug, (pl.nama || (pl as any).namaObat || '').trim().toLowerCase()) >= 0.65)
                          );

                          if (offer) {
                            const disc = (offer as any).diskonPct ?? offer.diskon ?? 0;
                            const isPpn = row.includePpn !== false;
                            const hnaPlusPpn = isPpn ? Math.round(offer.hna * 1.11) : offer.hna;
                            const discFactor = (100 - disc) / 100;
                            const nettoHna = offer.hna * discFactor;
                            const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
                            (onUpdateRow as any)(row.id, {
                              pbf: trimmed,
                              hna: offer.hna,
                              diskonPct: disc,
                              hnaPlusPpn,
                              hargaJadi: newHargaJadi,
                            });
                          } else {
                            onUpdateRow(row.id, 'pbf', trimmed);
                          }
                        }}
                        onAutoRegisterPbf={onAutoRegisterPbf}
                        onSelectOffer={(offer) => {
                          const isPpn = row.includePpn !== false;
                          const hnaPlusPpn = isPpn ? Math.round(offer.hna * 1.11) : offer.hna;
                          const discFactor = (100 - offer.diskonPct) / 100;
                          const nettoHna = offer.hna * discFactor;
                          const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
                          (onUpdateRow as any)(row.id, {
                            pbf: offer.pbf,
                            hna: offer.hna,
                            diskonPct: offer.diskonPct,
                            hnaPlusPpn,
                            hargaJadi: newHargaJadi,
                          });
                        }}
                        suppliers={suppliers}
                        priceList={priceList}
                        drugName={row.nama}
                        placeholder="Cari / pilih distributor PBF..."
                      />
                    </div>
                  </div>

                  {/* Keterangan / Catatan SP (Disinkronkan dengan Rekomendasi PBF) */}
                  <div className="pt-1">
                    <label className="block text-[10px] text-slate-400 font-medium mb-1">
                      KETERANGAN / CATATAN SP:
                    </label>
                    <input
                      type="text"
                      value={row.catatan || ''}
                      onChange={(e) => onUpdateRow(row.id, 'catatan', e.target.value)}
                      placeholder="Contoh: Saran PBF termurah / Kebutuhan cito..."
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs min-h-[40px] focus:outline-hidden focus:border-indigo-400 focus:bg-white/10"
                    />
                  </div>

                  {/* PPN 11% vs HARGA JADI (NON-PPN) TOGGLE BAR */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Kalkulasi HPP &amp; PPN:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePpn(row)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 border shadow-sm transition cursor-pointer active:scale-95 ${
                        isPpn
                          ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400/50 hover:bg-indigo-600/40'
                          : 'bg-amber-500/25 text-amber-200 border-amber-400/50 hover:bg-amber-500/35'
                      }`}
                      title={
                        isPpn
                          ? 'Item ini dikenakan PPN 11%. Klik jika distributor memberikan Harga Jadi / Tanpa PPN'
                          : 'Item ini menggunakan Harga Jadi (Tanpa PPN). Klik untuk mengaktifkan perhitungan PPN 11%'
                      }
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPpn ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-amber-400 shadow-xs shadow-amber-400'
                        }`}
                      />
                      <span>{isPpn ? '✓ Kena PPN 11%' : '✕ Harga Jadi (Non-PPN)'}</span>
                    </button>
                  </div>

                  {/* Price inputs: HNA+PPN, HNA Satuan, Diskon, and HPP Final */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
                    {/* HNA + PPN */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] text-indigo-300 font-bold">
                          HNA + PPN {isPpn ? '(11%)' : ''}
                        </label>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {isPpn ? 'Auto &rarr; HNA' : 'Harga Jadi'}
                        </span>
                      </div>
                      <NominalInput
                        value={
                          row.hnaPlusPpn !== undefined && row.hnaPlusPpn > 0
                            ? row.hnaPlusPpn
                            : (isPpn ? Math.round((row.hna || 0) * 1.11) : (row.hna || 0))
                        }
                        onChange={(val) => handleHnaPlusPpnChange(row.id, val, isPpn)}
                        placeholder="0"
                        size="sm"
                        prefix="Rp"
                      />
                    </div>

                    {/* HNA SATUAN */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] text-slate-300 font-bold">
                          HNA SATUAN {isPpn ? '(DPP)' : ''}
                        </label>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {isPpn ? 'Auto &rarr; +11%' : 'Sama Netto'}
                        </span>
                      </div>
                      <NominalInput
                        value={row.hna || 0}
                        onChange={(val) => handleHnaChange(row.id, val, isPpn)}
                        placeholder="0"
                        size="sm"
                        prefix="Rp"
                      />
                    </div>

                    {/* DISKON (%) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] text-slate-300 font-bold">DISKON (%)</label>
                        {diskonRp > 0 && (
                          <span className="text-[8px] text-rose-300 font-mono">
                            -Rp {Math.round(diskonRp).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                      <PercentageInput
                        value={row.diskonPct ?? 0}
                        onChange={(val) => onUpdateRow(row.id, 'diskonPct', val)}
                        placeholder="0"
                        size="sm"
                      />
                    </div>

                    {/* HPP (HASIL AKHIR) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] text-slate-300 font-bold">
                          {isPpn ? 'HPP (+PPN 11%)' : 'HPP (Harga Jadi)'}
                        </label>
                        <span
                          className={`text-[8px] font-bold font-mono px-1 rounded ${
                            isPpn ? 'text-indigo-300 bg-indigo-500/20' : 'text-amber-300 bg-amber-500/20'
                          }`}
                        >
                          {isPpn ? '+11%' : '0% PPN'}
                        </span>
                      </div>
                      <div
                        className={`w-full py-1.5 px-2 rounded-xl text-right font-mono font-extrabold text-xs truncate flex items-center justify-end min-h-[34px] border ${
                          isPpn
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        Rp {Math.round(hpp).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Subtotal bar at bottom of card */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-xs text-slate-300 font-medium">
                      Subtotal {isPpn ? '(+PPN)' : '(Harga Jadi)'}:
                    </span>
                    <span className="text-base font-mono font-extrabold text-white">
                      Rp {Math.round(subtotal).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. SPREADSHEET MATRIX TABLE (DESKTOP & WHEN USER CHOOSES TABLE VIEW) */}
        {(viewMode === 'table' || (viewMode === 'auto' && (typeof window === 'undefined' || window.innerWidth >= 640))) && (
          <div className="overflow-x-auto max-h-[58vh] scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-950/80 backdrop-blur-xl text-slate-200 font-semibold sticky top-0 z-10 border-b border-white/10">
                <tr>
                  <th className="p-3 text-center w-10">NO</th>
                  <th className="p-3 min-w-[115px]">KODE SKU</th>
                  <th className="p-3 min-w-[290px]">NAMA OBAT &amp; BENTUK SEDIAAN</th>
                  <th className="p-3 text-right min-w-[120px]">HNA + PPN (Rp)</th>
                  <th className="p-3 text-right min-w-[120px]">HNA SATUAN (Rp)</th>
                  <th className="p-3 text-center min-w-[85px]">DISKON (%)</th>
                  <th className="p-3 text-right min-w-[105px]">POTONGAN (Rp)</th>
                  <th className="p-3 text-right min-w-[115px]">HNA STLH DISK</th>
                  <th className="p-3 text-right min-w-[140px]">HPP &amp; PPN</th>
                  <th className="p-3 text-center min-w-[90px]">MINTA / BELI</th>
                  <th className="p-3 text-right min-w-[130px]">SUBTOTAL (Rp)</th>
                  <th className="p-3 min-w-[210px]">DISTRIBUTOR (PBF)</th>
                  <th className="p-3 min-w-[150px]">KETERANGAN SP</th>
                  <th className="p-3 text-center w-16">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, idx) => {
                  const isPpn = row.includePpn !== false;
                  const diskonRp = (row.hna || 0) * ((row.diskonPct || 0) / 100);
                  const hnaStlhDiskon = (row.hna || 0) - diskonRp;
                  const hpp = isPpn ? hnaStlhDiskon * 1.11 : hnaStlhDiskon;
                  const subtotal = hpp * (row.beli || 0);

                  const bestResult = row.nama && row.nama.trim().length > 1
                    ? findBestPriceForDrug(row.nama, priceList, row.hna, row.diskonPct, row.pbf)
                    : null;
                  const hasBetterOffer = bestResult && bestResult.hasMatch && !bestResult.isCurrentBest && bestResult.bestOffer;

                  return (
                    <tr key={row.id} className="hover:bg-white/[0.05] transition-colors group">
                      {/* Index */}
                      <td className="p-2.5 text-center font-bold text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={row.sku || ''}
                          onChange={(e) => onUpdateRow(row.id, 'sku', e.target.value)}
                          placeholder="SKU-..."
                          className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-indigo-300 font-mono font-bold text-[11px] focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 backdrop-blur-md"
                        />
                      </td>

                      {/* Nama Obat & Smart Autocomplete */}
                      <td className="p-2.5 relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.nama || ''}
                            onChange={(e) => {
                              onUpdateRow(row.id, 'nama', e.target.value);
                              setSearchTerm(e.target.value);
                              setActiveSearchRowId(row.id);
                            }}
                            onFocus={() => {
                              setActiveSearchRowId(row.id);
                              setSearchTerm(row.nama || '');
                            }}
                            onBlur={() => handleDrugNameBlur(row)}
                            placeholder="Ketik nama obat..."
                            className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 backdrop-blur-md"
                          />

                          {/* Best Price Available Mini Badge */}
                          {hasBetterOffer && bestResult.bestOffer && (
                            <div className="mt-1 flex items-center justify-between gap-1 text-[10px] bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-0.5 text-emerald-300 backdrop-blur-md">
                              <div className="flex items-center gap-1 truncate">
                                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">
                                  <strong>{bestResult.bestPbfName}</strong>: Rp {Math.round(bestResult.bestHna).toLocaleString('id-ID')}
                                  {bestResult.bestDiskon > 0 ? ` (${bestResult.bestDiskon}%)` : ''} &bull; Hemat Rp {Math.round(bestResult.savingsRp).toLocaleString('id-ID')}/u
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const isRowPpn = row.includePpn !== false;
                                  onUpdateRow(row.id, 'hna', bestResult.bestHna);
                                  onUpdateRow(row.id, 'hnaPlusPpn', isRowPpn ? Math.round(bestResult.bestHna * 1.11) : bestResult.bestHna);
                                  onUpdateRow(row.id, 'diskonPct', bestResult.bestDiskon);
                                  onUpdateRow(row.id, 'pbf', bestResult.bestPbfName);
                                  if (bestResult.bestOffer?.sku) onUpdateRow(row.id, 'sku', bestResult.bestOffer.sku);
                                  onUpdateRow(
                                    row.id,
                                    'catatan',
                                    `PBF Termurah: ${bestResult.bestPbfName} (HNA Rp ${Math.round(bestResult.bestHna).toLocaleString('id-ID')}${bestResult.bestDiskon > 0 ? ` Disc ${bestResult.bestDiskon}%` : ''})`
                                  );
                                }}
                                title="Terapkan harga termurah dari PBF ini"
                                className="px-1.5 py-0.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-white rounded font-bold transition cursor-pointer text-[9px] shrink-0"
                              >
                                Pakai
                              </button>
                            </div>
                          )}

                          {/* Autocomplete Dropdown Popup */}
                          {activeSearchRowId === row.id && currentSuggestions.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 z-30 w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                              <div className="p-2 bg-white/5 border-b border-white/10 text-[10px] font-bold text-indigo-300 flex justify-between items-center">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> SARAN OBAT &amp; HPP TERMURAH
                                  <span className="text-[8px] font-normal text-indigo-200/70 bg-indigo-500/20 px-1 py-0.2 rounded border border-indigo-400/20">
                                    Bentuk fisik terpisah
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveSearchRowId(null)}
                                  className="text-slate-400 hover:text-white p-0.5"
                                >
                                  &times;
                                </button>
                              </div>
                              {currentSuggestions.map((sug) => (
                                <div
                                  key={sug.id}
                                  className="p-2.5 border-b border-white/5 hover:bg-white/5 transition"
                                >
                                  <div
                                    onClick={() => handleSelectSuggestion(row.id, sug, 0)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-indigo-200 text-xs">
                                          {sug.cleanNama || sug.nama}
                                        </span>
                                        {sug.dosageForm && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 shadow-xs">
                                            {sug.dosageForm}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-300 shrink-0">
                                        {sug.sku}
                                      </span>
                                    </div>

                                    {/* Accurate HPP & Diskon Breakdown in Table View */}
                                    <div className="mt-1 flex flex-col gap-1 text-[10px] bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-2 text-emerald-200">
                                      <div className="flex items-center justify-between gap-1 flex-wrap">
                                        <div className="flex items-center gap-1 font-bold text-emerald-300">
                                          <span>✨ HPP:</span>
                                          <span className="font-mono text-white text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/40">
                                            Rp {Number(sug.bestHpp).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                          </span>
                                          <span className="text-[9px] text-emerald-400 font-normal">
                                            {sug.bestDiskon > 0 ? '(HNA Netto + PPN 11%)' : '(HNA + PPN 11%)'}
                                          </span>
                                        </div>
                                        <span className="font-bold text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-400/30">
                                          {sug.bestPbf}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-300 pt-1 border-t border-emerald-500/25 font-mono">
                                        <div>
                                          <span className="text-slate-400 block text-[8px]">HNA KATALOG:</span>
                                          <span className="text-white font-semibold">Rp {Number(sug.bestHna).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[8px]">RIWAYAT DISKON:</span>
                                          <span className={sug.bestDiskon > 0 ? "text-amber-300 font-bold" : "text-slate-400"}>
                                            {sug.bestDiskon > 0 ? `${sug.bestDiskon}% (-Rp ${Number(sug.bestDiskonRp || 0).toLocaleString('id-ID')})` : '0%'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[8px]">HNA NETTO:</span>
                                          <span className="text-emerald-300 font-semibold">Rp {Number(sug.bestNettoHna || sug.bestHna).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[8px]">BRUTO HNA+PPN:</span>
                                          <span className="text-slate-300">Rp {Number(sug.bestHnaPlusPpn || (sug.bestHna * 1.11)).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>
                                      <div className="text-[8px] text-emerald-400/90 pt-0.5 flex items-center justify-between">
                                        <span>💡 Klik untuk mengisi otomatis seluruh kolom</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Multi PBF choices */}
                                  {sug.offers.length > 1 && (
                                    <div className="mt-1.5 pt-1 border-t border-white/5">
                                      <span className="text-[9px] text-slate-400 block mb-1">
                                        Opsi Distributor Lain:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {sug.offers.map((off, oIdx) => (
                                          <button
                                            key={oIdx}
                                            type="button"
                                            onClick={() => handleSelectSuggestion(row.id, sug, oIdx)}
                                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono border transition ${
                                              off.isBestHpp
                                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                            }`}
                                          >
                                            {off.pbf}: Rp {Math.round(off.hpp).toLocaleString('id-ID')}
                                            {off.diskon > 0 ? ` (-${off.diskon}%)` : ''}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Manual Bentuk Sediaan (Sirup, Tablet, Drop, dll) */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 min-w-[140px]">
                              <BentukSediaanInput
                                value={row.bentukSediaan || ''}
                                onChange={(val) => {
                                  onUpdateRow(row.id, 'bentukSediaan' as any, val);
                                  if (!row.satuan && !row.kemasan) {
                                    onUpdateRow(row.id, 'satuan' as any, val);
                                    onUpdateRow(row.id, 'kemasan', val);
                                  }
                                }}
                                onApplyToName={(sediaan) => {
                                  if (!row.nama.toLowerCase().includes(sediaan.toLowerCase())) {
                                    onUpdateRow(row.id, 'nama', `${row.nama.trim()} (${sediaan})`);
                                  }
                                }}
                                placeholder="Bentuk sediaan (Tab/Sirup/dll)..."
                                compact={true}
                                showQuickChips={false}
                              />
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {['Tab', 'Sirup', 'Cap'].map((short) => {
                                const full = short === 'Tab' ? 'Tablet' : short === 'Sirup' ? 'Sirup' : 'Kapsul';
                                const isSel = (row.bentukSediaan || '').toLowerCase() === full.toLowerCase();
                                return (
                                  <button
                                    key={short}
                                    type="button"
                                    onClick={() => {
                                      onUpdateRow(row.id, 'bentukSediaan' as any, full);
                                      if (!row.satuan && !row.kemasan) {
                                        onUpdateRow(row.id, 'satuan' as any, full);
                                        onUpdateRow(row.id, 'kemasan', full);
                                      }
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${
                                      isSel
                                        ? 'bg-indigo-600 text-white border-indigo-400'
                                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                    title={`Pilih cepat ${full}`}
                                  >
                                    {short}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* HNA + PPN */}
                      <td className="p-2 text-right">
                        <NominalInput
                          value={
                            row.hnaPlusPpn !== undefined && row.hnaPlusPpn > 0
                              ? row.hnaPlusPpn
                              : (isPpn ? Math.round((row.hna || 0) * 1.11) : (row.hna || 0))
                          }
                          onChange={(val) => handleHnaPlusPpnChange(row.id, val, isPpn)}
                          placeholder="0"
                          size="sm"
                          prefix="Rp"
                        />
                      </td>

                      {/* HNA Satuan */}
                      <td className="p-2 text-right">
                        <NominalInput
                          value={row.hna || 0}
                          onChange={(val) => handleHnaChange(row.id, val, isPpn)}
                          placeholder="0"
                          size="sm"
                          prefix="Rp"
                        />
                      </td>

                      {/* Diskon % */}
                      <td className="p-2 text-center">
                        <PercentageInput
                          value={row.diskonPct ?? 0}
                          onChange={(val) => onUpdateRow(row.id, 'diskonPct', val)}
                          placeholder="0"
                          size="sm"
                          className="w-16"
                        />
                      </td>

                      {/* Potongan Rp */}
                      <td className="p-2.5 text-right font-mono text-slate-400">
                        Rp {Math.round(diskonRp).toLocaleString('id-ID')}
                      </td>

                      {/* HNA Setelah Diskon */}
                      <td className="p-2.5 text-right font-mono text-slate-200 font-medium">
                        Rp {Math.round(hnaStlhDiskon).toLocaleString('id-ID')}
                      </td>

                      {/* HPP (+PPN 11% / Harga Jadi) with PPN Toggle Button */}
                      <td className={`p-2.5 text-right font-mono font-bold border rounded-xl ${
                        isPpn
                          ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
                          : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePpn(row)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                              isPpn
                                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40 hover:bg-indigo-500/40'
                                : 'bg-amber-500/25 text-amber-200 border-amber-400/40 hover:bg-amber-500/40'
                            }`}
                            title={
                              isPpn
                                ? 'Kena PPN 11%. Klik untuk mengubah ke Harga Jadi (Tanpa PPN)'
                                : 'Harga Jadi (Tanpa PPN). Klik untuk mengaktifkan perhitungan PPN 11%'
                            }
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPpn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span>{isPpn ? 'PPN 11%' : 'Harga Jadi'}</span>
                          </button>
                          <span>
                            Rp {Math.round(hpp).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </td>

                      {/* Minta / Beli Qty */}
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.beli ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            onUpdateRow(row.id, 'beli', val);
                            onUpdateRow(row.id, 'minta', val);
                          }}
                          className="w-16 p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-center font-mono font-extrabold text-indigo-200 focus:outline-hidden focus:border-indigo-300 backdrop-blur-md"
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="p-2.5 text-right font-mono font-extrabold text-white">
                        Rp {Math.round(subtotal).toLocaleString('id-ID')}
                      </td>

                      {/* Distributor (PBF) dedicated column */}
                      <td className="p-2.5">
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex items-center gap-1">
                            <div className="flex-1">
                              <PbfAutocompleteInput
                                value={row.pbf || ''}
                                onChange={(val) => {
                                  const trimmed = val.trim();
                                  if (!trimmed) {
                                    onUpdateRow(row.id, 'pbf', '');
                                    return;
                                  }
                                  const pbfKey = trimmed.toLowerCase();
                                  const cleanDrug = (row.nama || '').trim().toLowerCase();
                                  const offer = priceList?.find(
                                    (pl) =>
                                      (pl.pbf || '').trim().toLowerCase() === pbfKey &&
                                      (((pl.nama || (pl as any).namaObat || '').trim().toLowerCase() === cleanDrug) ||
                                        calculateDrugSimilarity(cleanDrug, (pl.nama || (pl as any).namaObat || '').trim().toLowerCase()) >= 0.65)
                                  );

                                  if (offer) {
                                    const disc = (offer as any).diskonPct ?? offer.diskon ?? 0;
                                    const isPpn = row.includePpn !== false;
                                    const hnaPlusPpn = isPpn ? Math.round(offer.hna * 1.11) : offer.hna;
                                    const discFactor = (100 - disc) / 100;
                                    const nettoHna = offer.hna * discFactor;
                                    const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
                                    (onUpdateRow as any)(row.id, {
                                      pbf: trimmed,
                                      pbfTerakhir: trimmed,
                                      hna: offer.hna,
                                      diskonPct: disc,
                                      hnaPlusPpn,
                                      hargaJadi: newHargaJadi,
                                    });
                                  } else {
                                    (onUpdateRow as any)(row.id, {
                                      pbf: trimmed,
                                      pbfTerakhir: trimmed,
                                    });
                                  }
                                }}
                                onAutoRegisterPbf={onAutoRegisterPbf}
                                onSelectOffer={(offer) => {
                                  const isPpn = row.includePpn !== false;
                                  const hnaPlusPpn = isPpn ? Math.round(offer.hna * 1.11) : offer.hna;
                                  const discFactor = (100 - offer.diskonPct) / 100;
                                  const nettoHna = offer.hna * discFactor;
                                  const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
                                  (onUpdateRow as any)(row.id, {
                                    pbf: offer.pbf,
                                    pbfTerakhir: offer.pbf,
                                    hna: offer.hna,
                                    diskonPct: offer.diskonPct,
                                    hnaPlusPpn,
                                    hargaJadi: newHargaJadi,
                                  });
                                }}
                                suppliers={suppliers}
                                priceList={priceList}
                                drugName={row.nama}
                                compact={true}
                                placeholder="Pilih PBF..."
                              />
                            </div>
                            {row.pbf && (
                              <button
                                type="button"
                                onClick={() => handleApplyBulkPbf(row.pbf)}
                                title={`Terapkan "${row.pbf}" ke semua baris obat`}
                                className="p-1.5 bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-400/30 transition cursor-pointer shrink-0"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300" />
                              </button>
                            )}
                          </div>
                          {row.pbf && (
                            <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                              <span className="truncate max-w-[120px] text-indigo-300 font-medium">{row.pbf}</span>
                              <button
                                type="button"
                                onClick={() => handleApplyBulkPbf(row.pbf)}
                                className="text-indigo-400 hover:text-indigo-200 underline font-semibold cursor-pointer"
                              >
                                Setel Semua
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Keterangan SP */}
                      <td className="p-2.5">
                        <div className="min-w-[140px]">
                          <input
                            type="text"
                            value={row.catatan || ''}
                            onChange={(e) => onUpdateRow(row.id, 'catatan', e.target.value)}
                            placeholder="Catatan SP..."
                            className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-hidden focus:border-indigo-400 focus:bg-white/10 backdrop-blur-md"
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onDuplicateRow(row)}
                            title="Duplikasi Baris"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveRow(row.id)}
                            title="Hapus Baris"
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Add Row footer */}
        <div className="p-3.5 bg-white/[0.03] backdrop-blur-md border-t border-white/10 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              const pbfStr = (typeof bulkPbfInput === 'string' && bulkPbfInput.trim()) || (typeof targetPbf === 'string' && targetPbf.trim()) || '';
              onAddRow(pbfStr);
            }}
            className="px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer backdrop-blur-md min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Baris Baru</span>
            {(() => {
              const activePbfBadge = (typeof bulkPbfInput === 'string' && bulkPbfInput.trim()) || (typeof targetPbf === 'string' && targetPbf.trim()) || '';
              if (activePbfBadge && activePbfBadge !== '-') {
                return (
                  <span className="text-[10px] bg-indigo-900/70 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/40">
                    PBF: {activePbfBadge}
                  </span>
                );
              }
              return null;
            })()}
          </button>

          <span className="text-slate-400 text-xs hidden sm:inline">
            Tekan Tab untuk berpindah antar kolom input
          </span>
        </div>
      </div>

      {/* 2. AUTOMATION GUIDE & TOTALS DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-16 sm:pb-0">
        {/* Left Card: Tips & Formula Info */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-3.5 text-xs shadow-2xl">
          <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2.5 text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Otomatisasi &amp; Saran HPP Farmasi
          </h3>
          <ul className="space-y-2.5 text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-xs shadow-emerald-400" />
              <span>
                <strong>Saran HPP Termurah Otomatis:</strong> Saat mengetik nama obat, sistem secara cerdas menghitung <code>(HNA - Diskon) &times; 1.11</code> dari seluruh data penawaran PBF dan mengutamakan distributor dengan HPP terendah.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-xs shadow-indigo-400" />
              <span>
                <strong>Sinkronisasi 2 Arah HNA &amp; PPN:</strong> Pada mode HP maupun Tabel, input <em>HNA+PPN</em> otomatis menghitung <em>HNA Satuan (/ 1.11)</em>, dan sebaliknya input <em>HNA</em> otomatis menghitung <em>HNA+PPN (* 1.11)</em>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-xs shadow-amber-400" />
              <span>
                <strong>Opsi PPN 11% vs Harga Jadi:</strong> Distributor tertentu menyediakan harga jadi (sudah netto tanpa PPN). Anda cukup mengklik tombol <em>PPN 11% / Harga Jadi</em> pada baris obat untuk memilih kalkulasi dengan atau tanpa PPN.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-xs shadow-emerald-400" />
              <span>
                <strong>Mode Tampilan Fleksibel:</strong> Tersedia pilihan <em>Mode Kartu HP</em> untuk pengisian nyaman di smartphone dan <em>Mode Tabel</em> untuk layar laptop/PC.
              </span>
            </li>
          </ul>
        </div>

        {/* Right Card: Totals & Calculation Summary */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-3.5 text-xs shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-400" />
              Ringkasan Estimasi Biaya Pengadaan
            </h3>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold backdrop-blur-md border ${
              nonPpnItemCount > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
            }`}>
              {nonPpnItemCount > 0 ? `${nonPpnItemCount} Item Harga Jadi` : 'PPN 11% Aktif'}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total HNA (Setelah Diskon Item):</span>
              <span className="font-mono font-semibold text-white">
                Rp {Math.round(totalHna).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total PPN Masukan:</span>
              <span className="font-mono font-semibold text-indigo-300">
                Rp {Math.round(totalPpn).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-2 font-semibold">
              <span className="text-white">Subtotal Pembelian:</span>
              <span className="font-mono text-white">
                Rp {Math.round(totalPlusPpn).toLocaleString('id-ID')}
              </span>
            </div>

            {/* Diskon COD / Tunai */}
            <div className="flex justify-between items-center pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Diskon Pembayaran Tunai (COD):</span>
                <div className="flex items-center w-20">
                  <PercentageInput
                    value={diskonCOD ?? 0}
                    onChange={onUpdateDiskonCOD}
                    placeholder="0"
                    size="sm"
                  />
                </div>
              </div>
              <span className="font-mono font-semibold text-rose-400">
                - Rp {Math.round(codDiscountRp).toLocaleString('id-ID')}
              </span>
            </div>

            {/* Grand Total Highlight */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 border border-indigo-400/30 rounded-2xl mt-2 backdrop-blur-xl shadow-lg shadow-indigo-500/10">
              <div>
                <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-bold block">
                  TOTAL ESTIMASI BELANJA AKHIR:
                </span>
                <span className="text-xs text-slate-300">Sudah Termasuk PPN &amp; Diskon COD</span>
              </div>
              <span className="text-xl font-black text-white font-mono drop-shadow-md">
                Rp {Math.round(grandTotalEstimasi).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onSwitchToUsulan}
              className="flex-1 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition cursor-pointer backdrop-blur-md min-h-[44px]"
            >
              <span>Lihat Usulan Pembelian &rarr;</span>
            </button>
            <button
              onClick={onCommitHistory}
              className="py-2.5 px-4 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-white/10 backdrop-blur-md cursor-pointer min-h-[44px]"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simpan Riwayat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
