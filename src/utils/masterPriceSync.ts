import { DrugCategory, MasterDrugItem, PriceOfferItem } from '../types';
import { generateSKU } from './db';
import { normalizeDrugName, calculateDrugSimilarity } from './bestPriceHelper';

/**
 * Infer drug category from drug name keywords
 */
export function inferDrugCategory(name: string): DrugCategory {
  const norm = (name || '').toLowerCase();

  // Prekursor keywords (BPOM regulations)
  const prekursorKeywords = [
    'pseudoephedrine',
    'pseudoefedrin',
    'ephedrine',
    'efedrin',
    'phenylpropanolamine',
    'fenilpropanolamin',
    'ppa',
    'norephedrine',
    'ergotamine',
    'ergometrine',
    'permanganat',
  ];
  if (prekursorKeywords.some((k) => norm.includes(k))) {
    return 'prekursor';
  }

  // Obat-Obat Tertentu (OOT) keywords (BPOM regulations)
  const ootKeywords = [
    'tramadol',
    'trihexyphenidyl',
    'triheksifenidil',
    'thp',
    'dextromethorphan',
    'dekstrometorfan',
    'dmp',
    'haloperidol',
    'chlorpromazine',
    'klorpromazin',
    'amitriptyline',
    'amitriptilin',
  ];
  if (ootKeywords.some((k) => norm.includes(k))) {
    return 'oot';
  }

  return 'reguler';
}

/**
 * Find matching Master Drug for a Price Offer
 */
export function findMatchingMasterItem(
  offer: PriceOfferItem,
  masterList: MasterDrugItem[]
): MasterDrugItem | undefined {
  if (!offer.nama) return undefined;

  // 1. Direct SKU match if offer has valid SKU
  if (offer.sku && offer.sku.startsWith('SKU-')) {
    const skuMatch = masterList.find((m) => m.sku.toLowerCase() === offer.sku.toLowerCase());
    if (skuMatch) return skuMatch;
  }

  // 2. Exact or normalized name match
  const offerNorm = normalizeDrugName(offer.nama);
  const exactNormMatch = masterList.find((m) => normalizeDrugName(m.nama) === offerNorm);
  if (exactNormMatch) return exactNormMatch;

  // 3. High similarity match (>= 0.75)
  let bestMatch: MasterDrugItem | undefined = undefined;
  let bestScore = 0;
  for (const m of masterList) {
    const score = calculateDrugSimilarity(offer.nama, m.nama);
    if (score >= 0.75 && score > bestScore) {
      bestScore = score;
      bestMatch = m;
    }
  }

  return bestMatch;
}

/**
 * Find matching Price Offer for a Master Item & PBF
 */
export function findMatchingPriceOffers(
  master: MasterDrugItem,
  priceList: PriceOfferItem[]
): PriceOfferItem[] {
  if (!master.nama) return [];

  const masterNorm = normalizeDrugName(master.nama);
  return priceList.filter((pl) => {
    if (master.sku && pl.sku && master.sku.toLowerCase() === pl.sku.toLowerCase()) {
      return true;
    }
    const plNorm = normalizeDrugName(pl.nama);
    if (plNorm === masterNorm) return true;
    return calculateDrugSimilarity(master.nama, pl.nama) >= 0.75;
  });
}

/**
 * Synchronize a single Price Offer into Master List
 * If drug exists in Master: updates SKU, and updates HNA/PBF if better price
 * If drug doesn't exist: automatically registers it in Master List
 */
export function syncOfferToMaster(
  offer: PriceOfferItem,
  currentMasterList: MasterDrugItem[],
  options: { autoCreateMaster?: boolean; updateHnaIfCheaper?: boolean } = {}
): {
  updatedMasterList: MasterDrugItem[];
  matchedMasterItem?: MasterDrugItem;
  createdNewMaster: boolean;
  syncedOffer: PriceOfferItem;
} {
  const { autoCreateMaster = true, updateHnaIfCheaper = true } = options;
  const masterListCopy = [...currentMasterList];
  const matched = findMatchingMasterItem(offer, masterListCopy);
  const today = new Date().toISOString().split('T')[0];

  let createdNewMaster = false;
  let syncedOffer = { ...offer };
  let targetMaster: MasterDrugItem | undefined = matched;

  if (matched) {
    // Keep SKU synced
    syncedOffer.sku = matched.sku;

    const matchedIdx = masterListCopy.findIndex((m) => m.id === matched.id);
    if (matchedIdx !== -1) {
      const existing = masterListCopy[matchedIdx];
      const offerHpp = offer.hpp || (offer.hna - offer.hna * (offer.diskon / 100)) * 1.11;
      const currentMasterHpp = (existing.hna || 0) * 1.11;

      // Update master price if this offer is cheaper or if master had no HNA/PBF
      const shouldUpdatePrice =
        updateHnaIfCheaper && (existing.hna <= 0 || offerHpp < currentMasterHpp || !existing.pbf || existing.pbf === '-');

      if (shouldUpdatePrice) {
        masterListCopy[matchedIdx] = {
          ...existing,
          historyHarga: existing.hna > 0 ? existing.hna : offer.hna,
          hna: offer.hna,
          pbf: offer.pbf || existing.pbf,
          tanggal: offer.tglUpdate || today,
        };
        targetMaster = masterListCopy[matchedIdx];
      }
    }
  } else if (autoCreateMaster && offer.nama.trim().length > 1) {
    // Auto-create new Master item
    const inferredCategory = inferDrugCategory(offer.nama);
    const newSku = offer.sku && offer.sku.startsWith('SKU-') ? offer.sku : generateSKU(inferredCategory);
    syncedOffer.sku = newSku;

    const newMasterItem: MasterDrugItem = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sku: newSku,
      nama: offer.nama.trim(),
      kategori: inferredCategory,
      pabrik: '-',
      kemasan: 'Box',
      pbf: offer.pbf || '-',
      hna: offer.hna,
      historyHarga: offer.hna,
      tanggal: offer.tglUpdate || today,
      stok: offer.stok || 0,
      minStok: 5,
      satuan: 'Box',
    };

    masterListCopy.unshift(newMasterItem);
    targetMaster = newMasterItem;
    createdNewMaster = true;
  }

  return {
    updatedMasterList: masterListCopy,
    matchedMasterItem: targetMaster,
    createdNewMaster,
    syncedOffer,
  };
}

/**
 * Synchronize a Master Item into Price List
 * If Master has PBF and HNA, ensures Price List has this distributor quotation
 */
export function syncMasterToPriceList(
  master: MasterDrugItem,
  currentPriceList: PriceOfferItem[]
): {
  updatedPriceList: PriceOfferItem[];
  createdOffer: boolean;
  updatedOffer: boolean;
} {
  const priceListCopy = [...currentPriceList];
  const today = new Date().toISOString().split('T')[0];

  // Also update SKU & name for all matching price offers
  const matchingOffers = findMatchingPriceOffers(master, priceListCopy);
  let updatedOffer = false;

  matchingOffers.forEach((offer) => {
    const idx = priceListCopy.findIndex((p) => p.id === offer.id);
    if (idx !== -1) {
      priceListCopy[idx] = {
        ...priceListCopy[idx],
        sku: master.sku,
        nama: master.nama,
      };
      updatedOffer = true;
    }
  });

  // If Master has a valid HNA > 0, ensure Price List has a quotation
  let createdOffer = false;
  if (master.hna > 0) {
    const effectivePbf = master.pbf && master.pbf !== '-' && master.pbf.trim().length > 0
      ? master.pbf.trim()
      : 'PBF Rekomendasi';

    const existingPbfOffer = priceListCopy.find(
      (p) =>
        (p.sku === master.sku || normalizeDrugName(p.nama) === normalizeDrugName(master.nama)) &&
        p.pbf.toLowerCase().trim() === effectivePbf.toLowerCase().trim()
    );

    if (existingPbfOffer) {
      // Update existing PBF quotation
      const idx = priceListCopy.findIndex((p) => p.id === existingPbfOffer.id);
      if (idx !== -1) {
        const diskon = priceListCopy[idx].diskon || 0;
        const diskonRp = master.hna * (diskon / 100);
        const hpp = (master.hna - diskonRp) * 1.11;

        priceListCopy[idx] = {
          ...priceListCopy[idx],
          sku: master.sku,
          nama: master.nama,
          hna: master.hna,
          hpp,
          tglUpdate: master.tanggal || today,
        };
        updatedOffer = true;
      }
    } else {
      // Create new PBF quotation
      const hpp = master.hna * 1.11;
      priceListCopy.unshift({
        id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sku: master.sku,
        nama: master.nama,
        pbf: effectivePbf,
        hna: master.hna,
        diskon: 0,
        hpp,
        stok: master.stok || 0,
        tglUpdate: master.tanggal || today,
        catatan: 'Sinkronisasi Otomatis dari Master SKU',
      });
      createdOffer = true;
    }
  }

  return {
    updatedPriceList: priceListCopy,
    createdOffer,
    updatedOffer,
  };
}

/**
 * Full Bidirectional Synchronization
 * - Matches all SKUs
 * - Creates missing Master items from Price List
 * - Creates/updates Price List entries from Master
 * - Updates Master HNA to lowest active PBF price
 */
export function performFullMasterPriceSync(
  masterList: MasterDrugItem[],
  priceList: PriceOfferItem[]
): {
  syncedMasterList: MasterDrugItem[];
  syncedPriceList: PriceOfferItem[];
  stats: {
    totalMaster: number;
    totalOffers: number;
    newlyAddedToMaster: number;
    newlyAddedToPriceList: number;
    masterPricesOptimized: number;
    skusUnified: number;
  };
} {
  let currentMaster = [...masterList];
  let currentPrice = [...priceList];
  let newlyAddedToMaster = 0;
  let newlyAddedToPriceList = 0;
  let masterPricesOptimized = 0;
  let skusUnified = 0;
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Process each Price Offer -> match to Master or create Master item
  currentPrice = currentPrice.map((offer) => {
    const matched = findMatchingMasterItem(offer, currentMaster);
    if (matched) {
      if (offer.sku !== matched.sku) {
        skusUnified++;
      }
      return { ...offer, sku: matched.sku };
    } else if (offer.nama.trim().length > 1) {
      // Create in Master
      const cat = inferDrugCategory(offer.nama);
      const sku = offer.sku && offer.sku.startsWith('SKU-') ? offer.sku : generateSKU(cat);
      const newMaster: MasterDrugItem = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sku,
        nama: offer.nama.trim(),
        kategori: cat,
        pabrik: '-',
        kemasan: 'Box',
        pbf: offer.pbf || '-',
        hna: offer.hna,
        historyHarga: offer.hna,
        tanggal: offer.tglUpdate || today,
        stok: offer.stok || 0,
        minStok: 5,
        satuan: 'Box',
      };
      currentMaster.push(newMaster);
      newlyAddedToMaster++;
      return { ...offer, sku };
    }
    return offer;
  });

  // Step 2: Process each Master Item -> sync to Price List and find best PBF price
  currentMaster = currentMaster.map((master) => {
    // Find all price offers for this drug
    const offers = findMatchingPriceOffers(master, currentPrice);

    if (offers.length > 0) {
      // Find lowest HPP offer
      const sortedOffers = [...offers].sort((a, b) => a.hpp - b.hpp);
      const bestOffer = sortedOffers[0];
      const masterHpp = (master.hna || 0) * 1.11;

      // If best PBF offer is cheaper than current master HNA or master has no PBF
      if (bestOffer.hpp < masterHpp || !master.pbf || master.pbf === '-') {
        masterPricesOptimized++;
        return {
          ...master,
          pbf: bestOffer.pbf,
          historyHarga: master.hna > 0 ? master.hna : bestOffer.hna,
          hna: bestOffer.hna,
          tanggal: bestOffer.tglUpdate || today,
        };
      }
    } else if (master.pbf && master.pbf !== '-' && master.hna > 0) {
      // Ensure master has at least one offer in price list
      currentPrice.push({
        id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sku: master.sku,
        nama: master.nama,
        pbf: master.pbf,
        hna: master.hna,
        diskon: 0,
        hpp: master.hna * 1.11,
        stok: master.stok || 0,
        tglUpdate: master.tanggal || today,
        catatan: 'Sinkronisasi dari Master Obat',
      });
      newlyAddedToPriceList++;
    }

    return master;
  });

  return {
    syncedMasterList: currentMaster,
    syncedPriceList: currentPrice,
    stats: {
      totalMaster: currentMaster.length,
      totalOffers: currentPrice.length,
      newlyAddedToMaster,
      newlyAddedToPriceList,
      masterPricesOptimized,
      skusUnified,
    },
  };
}

/**
 * Grouped Drug Model for organized Price List presentation
 */
export interface GroupedPriceListDrug {
  key: string;
  nama: string;
  sku: string;
  kategori: DrugCategory;
  masterItem?: MasterDrugItem;
  offersCount: number;
  offers: (PriceOfferItem & { isLowest: boolean; savingsRp: number })[];
  lowestOffer: PriceOfferItem;
  highestOffer: PriceOfferItem;
  lowestHpp: number;
  highestHpp: number;
  priceSpreadRp: number;
  priceSpreadPct: number;
  masterHpp: number;
  savingsVsMasterRp: number;
  savingsVsMasterPct: number;
  isMasterCheaper: boolean;
  totalPbfStock: number;
}

/**
 * Group Price List by Drug / Master SKU
 */
export function groupPriceListByDrug(
  priceList: PriceOfferItem[],
  masterList: MasterDrugItem[]
): GroupedPriceListDrug[] {
  const map = new Map<string, PriceOfferItem[]>();

  // Group price list items by drug
  priceList.forEach((offer) => {
    if (!offer.nama) return;
    const key = offer.sku && offer.sku.startsWith('SKU-') ? offer.sku : normalizeDrugName(offer.nama);
    const list = map.get(key) || [];
    list.push(offer);
    map.set(key, list);
  });

  const result: GroupedPriceListDrug[] = [];

  map.forEach((offers, key) => {
    if (offers.length === 0) return;

    // Find master drug
    const firstOffer = offers[0];
    const master =
      masterList.find((m) => m.sku === firstOffer.sku) ||
      masterList.find((m) => normalizeDrugName(m.nama) === normalizeDrugName(firstOffer.nama)) ||
      findMatchingMasterItem(firstOffer, masterList);

    const nama = master ? master.nama : firstOffer.nama;
    const sku = master ? master.sku : firstOffer.sku || 'SKU-BELUM-TERDAFTAR';
    const kategori: DrugCategory = master ? master.kategori : inferDrugCategory(nama);
    const masterHpp = master ? Math.round((master.hna || 0) * 1.11) : 0;

    // Sort offers ascending by HPP
    const sorted = [...offers].sort((a, b) => a.hpp - b.hpp);
    const lowestOffer = sorted[0];
    const highestOffer = sorted[sorted.length - 1];
    const lowestHpp = Math.round(lowestOffer.hpp);
    const highestHpp = Math.round(highestOffer.hpp);
    const priceSpreadRp = Math.max(0, highestHpp - lowestHpp);
    const priceSpreadPct = highestHpp > 0 ? (priceSpreadRp / highestHpp) * 100 : 0;

    const savingsVsMasterRp = masterHpp > 0 ? Math.max(0, masterHpp - lowestHpp) : 0;
    const savingsVsMasterPct = masterHpp > 0 ? (savingsVsMasterRp / masterHpp) * 100 : 0;
    const isMasterCheaper = masterHpp > 0 && masterHpp <= lowestHpp;

    const totalPbfStock = offers.reduce((acc, curr) => acc + (curr.stok || 0), 0);

    const enrichedOffers = sorted.map((o) => ({
      ...o,
      isLowest: o.id === lowestOffer.id,
      savingsRp: Math.max(0, highestHpp - Math.round(o.hpp)),
    }));

    result.push({
      key,
      nama,
      sku,
      kategori,
      masterItem: master,
      offersCount: offers.length,
      offers: enrichedOffers,
      lowestOffer,
      highestOffer,
      lowestHpp,
      highestHpp,
      priceSpreadRp,
      priceSpreadPct,
      masterHpp,
      savingsVsMasterRp,
      savingsVsMasterPct,
      isMasterCheaper,
      totalPbfStock,
    });
  });

  // Sort by drug name
  result.sort((a, b) => a.nama.localeCompare(b.nama));
  return result;
}

/**
 * Group Price List by Distributor / PBF
 */
export interface GroupedPriceListPbf {
  pbfName: string;
  contact?: string;
  offersCount: number;
  offers: PriceOfferItem[];
  avgDiscount: number;
  totalStock: number;
  lowestPriceCount: number;
}

export function groupPriceListByPbf(
  priceList: PriceOfferItem[],
  masterList: MasterDrugItem[]
): GroupedPriceListPbf[] {
  const pbfMap = new Map<string, PriceOfferItem[]>();
  const lowestHppByDrug = new Map<string, number>();

  // Determine lowest HPP per drug
  priceList.forEach((p) => {
    const key = normalizeDrugName(p.nama);
    const currentMin = lowestHppByDrug.get(key) ?? Infinity;
    if (p.hpp < currentMin) {
      lowestHppByDrug.set(key, p.hpp);
    }
  });

  // Group by PBF
  priceList.forEach((offer) => {
    const pbf = (offer.pbf || 'Lainnya').trim();
    const list = pbfMap.get(pbf) || [];
    list.push(offer);
    pbfMap.set(pbf, list);
  });

  const result: GroupedPriceListPbf[] = [];

  pbfMap.forEach((offers, pbfName) => {
    const contact = offers.find((o) => o.kontakPbf)?.kontakPbf;
    const totalDiscount = offers.reduce((sum, o) => sum + (o.diskon || 0), 0);
    const avgDiscount = offers.length > 0 ? totalDiscount / offers.length : 0;
    const totalStock = offers.reduce((sum, o) => sum + (o.stok || 0), 0);

    let lowestPriceCount = 0;
    offers.forEach((o) => {
      const key = normalizeDrugName(o.nama);
      const lowest = lowestHppByDrug.get(key);
      if (lowest !== undefined && Math.abs(o.hpp - lowest) < 1) {
        lowestPriceCount++;
      }
    });

    result.push({
      pbfName,
      contact,
      offersCount: offers.length,
      offers: offers.sort((a, b) => a.nama.localeCompare(b.nama)),
      avgDiscount,
      totalStock,
      lowestPriceCount,
    });
  });

  // Sort by count descending
  result.sort((a, b) => b.offersCount - a.offersCount);
  return result;
}

/**
 * Summary stats for Master and Price List sync
 */
export function getMasterPriceSyncSummary(
  masterList: MasterDrugItem[],
  priceList: PriceOfferItem[]
) {
  let syncedMasterCount = 0;
  let cheaperOfferCount = 0;
  let totalSavingsPotentialRp = 0;

  const masterDetails = masterList.map((m) => {
    const offers = findMatchingPriceOffers(m, priceList);
    const hasOffers = offers.length > 0;
    if (hasOffers) syncedMasterCount++;

    let lowestHpp = (m.hna || 0) * 1.11;
    let bestPbf = m.pbf;
    let savingsRp = 0;
    let savingsPct = 0;
    let hasCheaperOffer = false;

    if (hasOffers) {
      const sorted = [...offers].sort((a, b) => a.hpp - b.hpp);
      const best = sorted[0];
      lowestHpp = Math.round(best.hpp);
      bestPbf = best.pbf;

      const currentMasterHpp = Math.round((m.hna || 0) * 1.11);
      if (lowestHpp < currentMasterHpp) {
        hasCheaperOffer = true;
        cheaperOfferCount++;
        savingsRp = currentMasterHpp - lowestHpp;
        savingsPct = (savingsRp / currentMasterHpp) * 100;
        totalSavingsPotentialRp += savingsRp;
      }
    }

    return {
      masterItem: m,
      offersCount: offers.length,
      offers,
      lowestHpp,
      bestPbf,
      hasOffers,
      hasCheaperOffer,
      savingsRp,
      savingsPct,
    };
  });

  const syncPercentage = masterList.length > 0 ? Math.round((syncedMasterCount / masterList.length) * 100) : 0;

  return {
    totalMaster: masterList.length,
    totalPriceOffers: priceList.length,
    syncedMasterCount,
    syncPercentage,
    cheaperOfferCount,
    totalSavingsPotentialRp,
    masterDetails,
  };
}

export interface DrugSuggestion {
  nama: string;
  sku: string;
  kategori: DrugCategory;
  pabrik: string;
  kemasan: string;
  satuan: string;
  pbf: string;
  hna: number;
  diskon: number;
  stok: number;
  source: 'master' | 'pricelist' | 'both';
  offersCount: number;
  matchedMaster?: MasterDrugItem;
  matchedOffer?: PriceOfferItem;
}

/**
 * Quick search across both Master Data and Price List to provide instant
 * cross-filling recommendations when adding or editing medicines.
 */
export function searchDrugSuggestions(
  query: string,
  masterList: MasterDrugItem[],
  priceList: PriceOfferItem[],
  limit = 8
): DrugSuggestion[] {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  const suggestions: DrugSuggestion[] = [];
  const seenKeys = new Set<string>();

  // 1. Search Master Items
  masterList.forEach((m) => {
    const matchName = m.nama.toLowerCase().includes(q);
    const matchSku = m.sku && m.sku.toLowerCase().includes(q);
    const matchPabrik = m.pabrik && m.pabrik.toLowerCase().includes(q);
    const matchPbf = m.pbf && m.pbf.toLowerCase().includes(q);

    if (matchName || matchSku || matchPabrik || matchPbf) {
      const matchingOffers = findMatchingPriceOffers(m, priceList);
      const sortedOffers = [...matchingOffers].sort((a, b) => a.hpp - b.hpp);
      const bestOffer = sortedOffers[0];

      const norm = normalizeDrugName(m.nama);
      seenKeys.add(norm);

      suggestions.push({
        nama: m.nama,
        sku: m.sku,
        kategori: m.kategori || 'reguler',
        pabrik: m.pabrik || '-',
        kemasan: m.kemasan || 'Box',
        satuan: m.satuan || 'Box',
        pbf: bestOffer ? bestOffer.pbf : m.pbf || '-',
        hna: bestOffer ? bestOffer.hna : m.hna || 0,
        diskon: bestOffer ? bestOffer.diskon : 0,
        stok: m.stok || (bestOffer?.stok ?? 0),
        source: matchingOffers.length > 0 ? 'both' : 'master',
        offersCount: matchingOffers.length,
        matchedMaster: m,
        matchedOffer: bestOffer,
      });
    }
  });

  // 2. Search Price List Items not yet included
  priceList.forEach((p) => {
    const norm = normalizeDrugName(p.nama);
    if (!seenKeys.has(norm)) {
      const matchName = p.nama.toLowerCase().includes(q);
      const matchPbf = p.pbf && p.pbf.toLowerCase().includes(q);
      const matchSku = p.sku && p.sku.toLowerCase().includes(q);

      if (matchName || matchPbf || matchSku) {
        const matched = findMatchingMasterItem(p, masterList);
        seenKeys.add(norm);

        suggestions.push({
          nama: p.nama,
          sku: p.sku || (matched ? matched.sku : generateSKU(inferDrugCategory(p.nama))),
          kategori: matched ? matched.kategori : inferDrugCategory(p.nama),
          pabrik: matched ? matched.pabrik : '-',
          kemasan: matched ? matched.kemasan : 'Box',
          satuan: matched ? matched.satuan : 'Box',
          pbf: p.pbf,
          hna: p.hna,
          diskon: p.diskon || 0,
          stok: p.stok || (matched?.stok ?? 0),
          source: matched ? 'both' : 'pricelist',
          offersCount: 1,
          matchedMaster: matched,
          matchedOffer: p,
        });
      }
    }
  });

  return suggestions.slice(0, limit);
}

