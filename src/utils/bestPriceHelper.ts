import { DrugCalculationRow, MasterDrugItem, PriceOfferItem, PurchaseHistoryItem } from '../types';

export interface BestPriceMatchResult {
  hasMatch: boolean;
  bestOffer?: PriceOfferItem;
  allOffers: PriceOfferItem[];
  currentHpp: number;
  bestHpp: number;
  savingsRp: number;
  savingsPct: number;
  isCurrentBest: boolean;
  bestPbfName: string;
  bestHna: number;
  bestDiskon: number;
  bestStock: number;
}

export interface DrugSuggestionItem {
  id: string;
  nama: string;
  cleanNama?: string;
  dosageForm?: string;
  sku: string;
  kategori?: string;
  pabrik?: string;
  satuan?: string;
  source: 'master' | 'pricelist' | 'both';
  // Best HPP offer calculation
  bestHpp: number;
  bestHna: number;
  bestDiskon: number;
  bestNettoHna?: number;
  bestHnaPlusPpn?: number;
  bestDiskonRp?: number;
  bestPbf: string;
  bestStock?: number;
  // All available PBF price offers for this drug
  offers: {
    pbf: string;
    hna: number;
    diskon: number;
    hpp: number;
    stok?: number;
    kontak?: string;
    catatan?: string;
    isBestHpp: boolean;
  }[];
  // Price variance note
  savingsRpComparedToMax?: number;
}

export interface ParsedDrugName {
  original: string;
  cleanNama: string;
  dosageForm: string;
}

// Canonical dosage form dictionary mapping keyword to standardized name
export const DOSAGE_FORM_DICT: Record<string, string> = {
  // Tablet & Kaplet
  tablet: 'Tablet',
  tab: 'Tablet',
  tabs: 'Tablet',
  tbl: 'Tablet',
  kaptab: 'Kaptab',
  kaplet: 'Kaplet',
  kpl: 'Kaplet',
  caplet: 'Kaplet',
  // Kapsul
  kapsul: 'Kapsul',
  capsul: 'Kapsul',
  capsule: 'Kapsul',
  cap: 'Kapsul',
  caps: 'Kapsul',
  // Sirup & Cairan
  sirup: 'Sirup',
  syrup: 'Sirup',
  syr: 'Sirup',
  sir: 'Sirup',
  'dry syrup': 'Dry Syrup',
  'sirup kering': 'Dry Syrup',
  suspensi: 'Suspensi',
  susp: 'Suspensi',
  larutan: 'Larutan',
  solutio: 'Larutan',
  sol: 'Larutan',
  emulsi: 'Emulsi',
  emuls: 'Emulsi',
  // Salep & Topikal
  salep: 'Salep',
  ointment: 'Salep',
  oint: 'Salep',
  zalf: 'Salep',
  salf: 'Salep',
  krim: 'Krim',
  cream: 'Krim',
  crm: 'Krim',
  gel: 'Gel',
  lotion: 'Lotion',
  pasta: 'Pasta',
  // Tetes (Drop)
  tetes: 'Tetes',
  drop: 'Drop',
  drops: 'Drop',
  gtt: 'Drop',
  'tetes mata': 'Tetes Mata',
  'tetes telinga': 'Tetes Telinga',
  'tetes hidung': 'Tetes Hidung',
  // Injeksi & Parenteral
  injeksi: 'Injeksi',
  inj: 'Injeksi',
  ampul: 'Ampul',
  amp: 'Ampul',
  vial: 'Vial',
  infus: 'Infus',
  inf: 'Infus',
  // Suppositoria & Ovula
  suppositoria: 'Suppositoria',
  supp: 'Suppositoria',
  sup: 'Suppositoria',
  ovula: 'Ovula',
  enema: 'Enema',
  // Serbuk & Sachet
  serbuk: 'Serbuk',
  pulvis: 'Serbuk',
  puyer: 'Puyer',
  sachet: 'Sachet',
  sach: 'Sachet',
  // Inhaler & Respirasi
  inhaler: 'Inhaler',
  respule: 'Respule',
  resp: 'Respule',
  nebule: 'Nebule',
  nebu: 'Nebule',
  // Plester & Patch
  plester: 'Plester',
  patch: 'Patch',
};

const MULTI_WORD_FORMS = ['dry syrup', 'sirup kering', 'tetes mata', 'tetes telinga', 'tetes hidung'];
const SINGLE_WORD_FORMS = Object.keys(DOSAGE_FORM_DICT).filter((k) => !k.includes(' '));

/**
 * Separates core drug name from physical dosage form (bentuk sediaan fisik)
 * E.g.:
 * "Calcifar Tablet" -> cleanNama: "Calcifar", dosageForm: "Tablet"
 * "Grantusif tablet" -> cleanNama: "Grantusif", dosageForm: "Tablet"
 * "Amoxicillin 500mg Kapsul" -> cleanNama: "Amoxicillin 500mg", dosageForm: "Kapsul"
 * "Sanmol Sirup 60ml" -> cleanNama: "Sanmol 60ml", dosageForm: "Sirup"
 */
export function parseDrugNameAndDosage(rawName: string): ParsedDrugName {
  if (!rawName || !rawName.trim()) {
    return { original: '', cleanNama: '', dosageForm: '' };
  }
  const original = rawName.trim();
  let working = original;
  let detectedDosage = '';

  // 1. Multi-word forms first
  for (const mw of MULTI_WORD_FORMS) {
    const re = new RegExp(`\\b${mw}\\b`, 'gi');
    if (re.test(working)) {
      detectedDosage = DOSAGE_FORM_DICT[mw];
      working = working.replace(re, ' ');
      break;
    }
  }

  // 2. Single-word dosage forms
  if (!detectedDosage) {
    const pattern = new RegExp(`\\b(${SINGLE_WORD_FORMS.join('|')})\\b`, 'gi');
    const matches = Array.from(working.matchAll(pattern));
    if (matches && matches.length > 0) {
      // Pick the last matched word (most commonly at the end, e.g. "Grantusif tablet")
      const lastMatch = matches[matches.length - 1];
      const matchedWord = lastMatch[0].toLowerCase();
      if (DOSAGE_FORM_DICT[matchedWord]) {
        detectedDosage = DOSAGE_FORM_DICT[matchedWord];
        const matchIdx = lastMatch.index ?? -1;
        if (matchIdx >= 0) {
          working =
            working.slice(0, matchIdx) + ' ' + working.slice(matchIdx + matchedWord.length);
        }
      }
    }
  }

  // Clean trailing/leading symbols and collapse spaces
  const cleanNama = working
    .replace(/[\/\-_,]+$/g, '')
    .replace(/^[\/\-_,]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    original,
    cleanNama: cleanNama || original,
    dosageForm: detectedDosage,
  };
}

/**
 * Get intelligent drug suggestions with exact HPP calculations and best-price PBF highlights.
 * Filters out false matches caused by physical dosage form keywords (e.g. "tablet").
 */
export function getDrugSuggestionsWithBestPrice(
  searchTerm: string,
  masterList: MasterDrugItem[],
  priceList: PriceOfferItem[],
  history: PurchaseHistoryItem[] = []
): DrugSuggestionItem[] {
  const parsedSearch = parseDrugNameAndDosage(searchTerm);
  const searchCore = parsedSearch.cleanNama.trim().toLowerCase();
  const searchDosage = parsedSearch.dosageForm.toLowerCase();
  const rawTerm = searchTerm.trim().toLowerCase();

  if (!searchCore && !rawTerm) return [];

  const matchedDrugsMap = new Map<string, DrugSuggestionItem>();

  // Check if candidate matches search query
  const checkIsMatch = (candRawName: string, sku: string = '', pabrik: string = ''): { match: boolean; score: number } => {
    const parsedCand = parseDrugNameAndDosage(candRawName);
    const candCore = parsedCand.cleanNama.toLowerCase();
    const skuLower = (sku || '').toLowerCase();
    const pabrikLower = (pabrik || '').toLowerCase();

    // 1. SKU or Pabrik search
    if (skuLower && skuLower.includes(rawTerm)) return { match: true, score: 0.9 };
    if (pabrikLower && pabrikLower.includes(rawTerm)) return { match: true, score: 0.8 };

    // 2. Core name search (e.g. "Relaxon" from "Relaxon Tablet")
    if (searchCore && searchCore.length >= 2) {
      if (candCore.includes(searchCore) || searchCore.includes(candCore)) {
        let score = 0.85;
        if (searchDosage && parsedCand.dosageForm.toLowerCase() === searchDosage) {
          score += 0.1;
        }
        return { match: true, score };
      }
      const sim = calculateDrugSimilarity(searchCore, candCore);
      if (sim >= 0.6) {
        return { match: true, score: sim };
      }
      return { match: false, score: 0 };
    }

    // 3. User typed only dosage form (e.g. "Tablet" or "Sirup")
    if (searchDosage) {
      if (parsedCand.dosageForm.toLowerCase() === searchDosage) {
        return { match: true, score: 0.7 };
      }
    }

    if (candRawName.toLowerCase().includes(rawTerm)) {
      return { match: true, score: 0.6 };
    }

    return { match: false, score: 0 };
  };

  // 1. Check Master Drug List & integrate purchase history (Riwayat Pembelian & Riwayat Diskon)
  masterList.forEach((m) => {
    const res = checkIsMatch(m.nama, m.sku, m.pabrik);
    if (res.match) {
      const parsedCand = parseDrugNameAndDosage(m.nama);
      const key = normalizeDrugName(parsedCand.cleanNama) || parsedCand.cleanNama.toLowerCase();

      // Find any real transaction from Riwayat Pembelian (Purchase History) to extract true HPP and discount history
      let histDiskon = 0;
      let histHpp = 0;
      let histPbf = (m.pbf || '').trim();
      let histHna = m.hna || 0;

      if (history && history.length > 0) {
        const cleanDrug = parsedCand.cleanNama.toLowerCase();
        const matchedHist = history.filter((h) => {
          if (m.sku && h.sku && h.sku.trim().toLowerCase() === m.sku.trim().toLowerCase()) return true;
          if (h.nama) {
            const hClean = parseDrugNameAndDosage(h.nama).cleanNama.toLowerCase();
            return hClean === cleanDrug || calculateDrugSimilarity(hClean, cleanDrug) >= 0.65;
          }
          return false;
        });

        if (matchedHist.length > 0) {
          matchedHist.sort((a, b) => {
            const timeA = a.tgl ? new Date(a.tgl).getTime() : 0;
            const timeB = b.tgl ? new Date(b.tgl).getTime() : 0;
            return timeB - timeA;
          });
          const latest = matchedHist[0];
          histDiskon = latest.diskon ?? 0;
          if (latest.hna && latest.hna > 0) histHna = latest.hna;
          if (latest.pbf) histPbf = latest.pbf.trim();
          histHpp = latest.hpp > 0
            ? latest.hpp
            : Math.round(histHna * ((100 - histDiskon) / 100) * 1.11);
        }
      }

      // If no riwayat transaksi but master has historyHarga recorded
      if (histHpp <= 0 && m.historyHarga && m.historyHarga > 0) {
        histHpp = m.historyHarga;
        if (m.hna > 0 && m.historyHarga < m.hna * 1.11) {
          // Implied discount from previous purchase price
          histDiskon = Math.max(0, Math.round(((m.hna * 1.11 - m.historyHarga) / (m.hna * 1.11)) * 1000) / 10);
        }
      }

      // True HPP: if discount exists, HPP = HNA * (1 - disc) * 1.11; otherwise HNA * 1.11
      const trueMasterHpp = histHpp > 0
        ? histHpp
        : Math.round(m.hna * ((100 - histDiskon) / 100) * 1.11);

      matchedDrugsMap.set(key, {
        id: m.id,
        nama: m.nama, // Full raw name retained intact for master integrity
        cleanNama: parsedCand.cleanNama, // Clean name for display without dosage noise
        dosageForm: parsedCand.dosageForm || m.satuan || '',
        sku: m.sku,
        kategori: m.kategori,
        pabrik: m.pabrik,
        satuan: m.satuan || parsedCand.dosageForm,
        source: 'master',
        bestHpp: trueMasterHpp,
        bestHna: histHna,
        bestDiskon: histDiskon,
        bestPbf: histPbf || m.pbf || 'Distributor Utama',
        bestStock: m.stok,
        offers: [
          {
            pbf: histPbf || m.pbf || 'Distributor Utama',
            hna: histHna,
            diskon: histDiskon,
            hpp: trueMasterHpp,
            stok: m.stok,
            isBestHpp: true,
          },
        ],
      });
    }
  });

  // 2. Check Price List (PBF Offers) & merge with Master
  priceList.forEach((pl) => {
    if (!pl.nama || pl.hna <= 0) return;
    const res = checkIsMatch(pl.nama, pl.sku, pl.pbf);
    if (res.match) {
      const parsedPl = parseDrugNameAndDosage(pl.nama);
      const key = normalizeDrugName(parsedPl.cleanNama) || parsedPl.cleanNama.toLowerCase();

      const diskonRp = pl.hna * ((pl.diskon || 0) / 100);
      const offerHpp = Math.round((pl.hna - diskonRp) * 1.11);

      const offerObj = {
        pbf: pl.pbf,
        hna: pl.hna,
        diskon: pl.diskon || 0,
        hpp: offerHpp,
        stok: pl.stok,
        kontak: pl.kontakPbf,
        catatan: pl.catatan,
        isBestHpp: false,
      };

      if (matchedDrugsMap.has(key)) {
        const existing = matchedDrugsMap.get(key)!;
        existing.source = 'both';
        const existingOfferIdx = existing.offers.findIndex(
          (o) => o.pbf.toLowerCase() === pl.pbf.toLowerCase()
        );
        if (existingOfferIdx >= 0) {
          existing.offers[existingOfferIdx] = offerObj;
        } else {
          existing.offers.push(offerObj);
        }
      } else {
        matchedDrugsMap.set(key, {
          id: pl.id,
          nama: pl.nama, // Full raw name retained intact for pricelist integrity
          cleanNama: parsedPl.cleanNama,
          dosageForm: parsedPl.dosageForm || '',
          sku: pl.sku || `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          source: 'pricelist',
          bestHpp: offerHpp,
          bestHna: pl.hna,
          bestDiskon: pl.diskon || 0,
          bestPbf: pl.pbf,
          bestStock: pl.stok,
          satuan: parsedPl.dosageForm || 'Box',
          offers: [offerObj],
        });
      }
    }
  });

  // 3. Finalize best HPP determination for each drug suggestion
  const suggestions: DrugSuggestionItem[] = [];

  matchedDrugsMap.forEach((item) => {
    if (item.offers.length > 0) {
      item.offers.sort((a, b) => a.hpp - b.hpp);
      item.offers[0].isBestHpp = true;
      item.bestHpp = item.offers[0].hpp;
      item.bestHna = item.offers[0].hna;
      item.bestDiskon = item.offers[0].diskon;
      const discRp = item.bestHna * (item.bestDiskon / 100);
      item.bestDiskonRp = Math.round(discRp);
      item.bestNettoHna = Math.round(item.bestHna - discRp);
      item.bestHnaPlusPpn = Math.round(item.bestHna * 1.11);
      item.bestPbf = item.offers[0].pbf;
      item.bestStock = item.offers[0].stok;

      if (item.offers.length > 1) {
        const maxHpp = Math.max(...item.offers.map((o) => o.hpp));
        item.savingsRpComparedToMax = Math.max(0, maxHpp - item.bestHpp);
      }
    }
    suggestions.push(item);
  });

  // Sort suggestions: dosage match first if requested, then similarity, then lowest HPP
  suggestions.sort((a, b) => {
    if (searchDosage) {
      const aMatches = (a.dosageForm || '').toLowerCase() === searchDosage;
      const bMatches = (b.dosageForm || '').toLowerCase() === searchDosage;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    const simA = calculateDrugSimilarity(searchCore || rawTerm, a.cleanNama || a.nama);
    const simB = calculateDrugSimilarity(searchCore || rawTerm, b.cleanNama || b.nama);
    if (Math.abs(simA - simB) > 0.15) {
      return simB - simA;
    }
    return a.bestHpp - b.bestHpp;
  });

  return suggestions.slice(0, 8);
}


/**
 * Normalize drug name for reliable matching
 * E.g. "AMOXICILLIN 500 MG CAPSUL" -> "amoxicillin 500mg"
 */
export function normalizeDrugName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Normalize dosage spacing: "500 mg" -> "500mg", "0.5 mg" -> "0.5mg"
    .replace(/(\d+(?:\.\d+)?)\s*(mg|g|gr|ml|iu|mcg|ug)/gi, '$1$2')
    // Remove punctuation
    .replace(/[^a-z0-9\s]/gi, '')
    .trim();
}

/**
 * Score drug name similarity (0 - 1)
 * Strips dosage form noise keywords so "Relaxon Tablet" and "Calcifar Tablet" do not match.
 */
export function calculateDrugSimilarity(nameA: string, nameB: string): number {
  if (!nameA || !nameB) return 0;

  const parsedA = parseDrugNameAndDosage(nameA);
  const parsedB = parseDrugNameAndDosage(nameB);

  const normA = normalizeDrugName(parsedA.cleanNama);
  const normB = normalizeDrugName(parsedB.cleanNama);

  if (!normA || !normB) return 0;

  // Exact clean name match
  if (normA === normB) {
    if (parsedA.dosageForm && parsedB.dosageForm) {
      return parsedA.dosageForm.toLowerCase() === parsedB.dosageForm.toLowerCase() ? 1.0 : 0.88;
    }
    return 1.0;
  }

  // Substring prefix match on clean name
  if (normA.startsWith(normB) || normB.startsWith(normA)) {
    const dosageBonus =
      parsedA.dosageForm &&
      parsedB.dosageForm &&
      parsedA.dosageForm.toLowerCase() === parsedB.dosageForm.toLowerCase()
        ? 0.08
        : 0;
    return Math.min(0.95, 0.82 + dosageBonus);
  }

  // Token-based matching on clean drug names ONLY (so dosage words don't fake-match)
  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);

  let matchCount = 0;
  for (const tA of tokensA) {
    if (tokensB.includes(tA)) {
      matchCount++;
    }
  }

  // If no tokens in the clean drug name match, similarity is zero!
  if (matchCount === 0) {
    return 0;
  }

  // Check if dosage numbers match (e.g. 500mg vs 250mg)
  const numbersA: string[] = normA.match(/\d+[a-z]*/g) || [];
  const numbersB: string[] = normB.match(/\d+[a-z]*/g) || [];
  const numbersMatch =
    numbersA.length === 0 ||
    numbersB.length === 0 ||
    numbersA.every((num: string) => numbersB.includes(num));

  if (!numbersMatch) {
    return 0.2; // Penalize mismatching dosages (e.g. 500mg vs 250mg)
  }

  return matchCount / Math.max(tokensA.length, tokensB.length);
}

/**
 * Find the best price offer from PriceList database for a given drug
 */
export function findBestPriceForDrug(
  drugName: string,
  priceList: PriceOfferItem[],
  currentHna: number = 0,
  currentDiskon: number = 0,
  currentPbf: string = ''
): BestPriceMatchResult {
  if (!drugName.trim() || priceList.length === 0) {
    return {
      hasMatch: false,
      allOffers: [],
      currentHpp: 0,
      bestHpp: 0,
      savingsRp: 0,
      savingsPct: 0,
      isCurrentBest: false,
      bestPbfName: '',
      bestHna: 0,
      bestDiskon: 0,
      bestStock: 0,
    };
  }

  const currentDiskonRp = currentHna * (currentDiskon / 100);
  const currentHpp = Math.round((currentHna - currentDiskonRp) * 1.11);

  // Filter matching offers from price list
  const matchingOffers: { offer: PriceOfferItem; score: number }[] = [];

  priceList.forEach((offer) => {
    if (!offer.nama || offer.hna <= 0) return;
    const score = calculateDrugSimilarity(drugName, offer.nama);
    if (score >= 0.6) {
      matchingOffers.push({ offer, score });
    }
  });

  if (matchingOffers.length === 0) {
    return {
      hasMatch: false,
      allOffers: [],
      currentHpp,
      bestHpp: currentHpp,
      savingsRp: 0,
      savingsPct: 0,
      isCurrentBest: true,
      bestPbfName: currentPbf || '',
      bestHna: currentHna,
      bestDiskon: currentDiskon,
      bestStock: 0,
    };
  }

  // Sort by lowest HPP first, then by highest similarity score
  matchingOffers.sort((a, b) => {
    if (a.offer.hpp !== b.offer.hpp) {
      return a.offer.hpp - b.offer.hpp;
    }
    return b.score - a.score;
  });

  const bestOffer = matchingOffers[0].offer;
  const bestHpp = Math.round(bestOffer.hpp);
  const savingsRp = currentHpp > 0 ? Math.max(0, currentHpp - bestHpp) : 0;
  const savingsPct = currentHpp > 0 ? (savingsRp / currentHpp) * 100 : 0;
  const isCurrentBest = currentHpp > 0 && currentHpp <= bestHpp;

  return {
    hasMatch: true,
    bestOffer,
    allOffers: matchingOffers.map((m) => m.offer),
    currentHpp,
    bestHpp,
    savingsRp,
    savingsPct,
    isCurrentBest,
    bestPbfName: bestOffer.pbf,
    bestHna: bestOffer.hna,
    bestDiskon: bestOffer.diskon,
    bestStock: bestOffer.stok || 0,
  };
}

/**
 * Apply Best Price to a single calculation row
 */
export function applyBestPriceToRow(
  row: DrugCalculationRow,
  bestOffer: PriceOfferItem
): DrugCalculationRow {
  const hna = bestOffer.hna;
  const diskon = bestOffer.diskon;
  const isPpn = row.includePpn !== false;
  const hnaPlusPpn = isPpn ? Math.round(hna * 1.11) : hna;
  const discFactor = (100 - diskon) / 100;
  const nettoHna = hna * discFactor;
  const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

  return {
    ...row,
    pbf: bestOffer.pbf,
    hna,
    hnaPlusPpn,
    diskonPct: diskon,
    hargaJadi,
    historyHarga: row.historyHarga || hna,
    catatan: bestOffer.catatan
      ? `${row.catatan ? row.catatan + ' | ' : ''}Best Price (${bestOffer.pbf})`
      : row.catatan,
  };
}

/**
 * Apply Best Price across all calculation rows in bulk
 */
export function applyBestPriceToAllRows(
  rows: DrugCalculationRow[],
  priceList: PriceOfferItem[]
): {
  updatedRows: DrugCalculationRow[];
  optimizedCount: number;
  totalSavingsRp: number;
  optimizedDetails: { nama: string; pbf: string; savingsRp: number }[];
} {
  let optimizedCount = 0;
  let totalSavingsRp = 0;
  const optimizedDetails: { nama: string; pbf: string; savingsRp: number }[] = [];

  const updatedRows = rows.map((row) => {
    if (!row.nama || !row.nama.trim()) return row;

    const result = findBestPriceForDrug(row.nama, priceList, row.hna, row.diskonPct, row.pbf);
    if (result.hasMatch && result.bestOffer && (!result.isCurrentBest || !row.pbf || row.hna === 0)) {
      const oldSubtotal = result.currentHpp * (row.beli || 1);
      const newSubtotal = result.bestHpp * (row.beli || 1);
      if (oldSubtotal > newSubtotal || row.hna === 0) {
        const diff = Math.max(0, oldSubtotal - newSubtotal);
        totalSavingsRp += diff;
        optimizedCount++;
        optimizedDetails.push({
          nama: row.nama,
          pbf: result.bestOffer.pbf,
          savingsRp: diff,
        });
        return applyBestPriceToRow(row, result.bestOffer);
      }
    }
    return row;
  });

  return {
    updatedRows,
    optimizedCount,
    totalSavingsRp,
    optimizedDetails,
  };
}

export interface LastPurchaseOption {
  source: 'riwayat' | 'master' | 'pricelist';
  pbf: string;
  tanggal: string;
  historyHarga: number;
  label: string;
  detail?: string;
  diskon?: number;
  hna?: number;
}

export interface LastPurchaseInfo {
  pbf: string;
  tanggal: string;
  historyHarga: number;
  diskon?: number;
  hna?: number;
  source: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none';
  pbfSource?: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none';
  priceSource?: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none';
  dateSource?: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none';
  options: LastPurchaseOption[];
}

/**
 * Cari otomatis History Harga, Tanggal Beli Terakhir, dan PBF Terakhir Beli untuk baris usulan.
 * Mendukung pengisian otomatis "tanpa dimintakan" dari:
 * 1. Riwayat Pembelian (Purchase History) - transaksi terbaru
 * 2. Master Obat (MasterList)
 * 3. Pricelist Penawaran PBF
 * Serta mendukung penimpaan (override) / input manual oleh pengguna.
 */
export function findLastPurchaseInfo(
  row: {
    sku?: string;
    nama?: string;
    pbfTerakhir?: string;
    tanggal?: string;
    historyHarga?: number;
    historyHargaOverride?: number | null;
    isBarangBaru?: boolean;
  },
  history: PurchaseHistoryItem[] = [],
  masterList: MasterDrugItem[] = [],
  priceList: PriceOfferItem[] = []
): LastPurchaseInfo {
  const options: LastPurchaseOption[] = [];

  const isExplicitBarangBaru = row.isBarangBaru === true;
  const isHistoryHargaOverridden = row.historyHargaOverride !== undefined;
  const rawDrug = (row.nama || '').trim();
  if (!rawDrug) {
    const rawPrice = isHistoryHargaOverridden
      ? (row.historyHargaOverride || 0)
      : (row.historyHarga || 0);
    const effPrice = isExplicitBarangBaru ? 0 : rawPrice;
    return {
      pbf: isExplicitBarangBaru ? '-' : (row.pbfTerakhir || '').trim(),
      tanggal: isExplicitBarangBaru ? '-' : (row.tanggal || '').trim(),
      historyHarga: effPrice,
      source: row.pbfTerakhir || row.tanggal || effPrice > 0 || isExplicitBarangBaru ? 'manual' : 'none',
      pbfSource: row.pbfTerakhir || isExplicitBarangBaru ? 'manual' : 'none',
      dateSource: row.tanggal || isExplicitBarangBaru ? 'manual' : 'none',
      priceSource: effPrice > 0 || isExplicitBarangBaru || isHistoryHargaOverridden ? 'manual' : 'none',
      options: [],
    };
  }

  const parsed = parseDrugNameAndDosage(rawDrug);
  const cleanDrug = parsed.cleanNama.toLowerCase();
  const rawLower = rawDrug.toLowerCase();
  const cleanSku = (row.sku || '').trim().toLowerCase();

  // Helper matcher: SKU exact match OR drug name similarity / normalized containment
  const isMatch = (itemSku?: string, itemNama?: string) => {
    if (cleanSku && itemSku && itemSku.trim().toLowerCase() === cleanSku) return true;
    if (itemNama) {
      const itemParsed = parseDrugNameAndDosage(itemNama);
      const itemClean = itemParsed.cleanNama.toLowerCase();
      const itemLower = itemNama.trim().toLowerCase();
      if (itemLower === rawLower || itemClean === cleanDrug) return true;
      if (cleanDrug.length > 3 && itemClean.includes(cleanDrug)) return true;
      if (itemClean.length > 3 && cleanDrug.includes(itemClean)) return true;
      if (calculateDrugSimilarity(cleanDrug, itemClean) >= 0.65) return true;
      if (calculateDrugSimilarity(rawLower, itemLower) >= 0.65) return true;
    }
    return false;
  };

  // A. Candidate from Riwayat Transaksi (History) - transaksi paling baru
  let riwayatCandidate: LastPurchaseOption | null = null;
  if (history && history.length > 0) {
    const matchedHistory = history.filter((h) => isMatch(h.sku, h.nama));
    if (matchedHistory.length > 0) {
      matchedHistory.sort((a, b) => {
        const timeA = a.tgl ? new Date(a.tgl).getTime() : 0;
        const timeB = b.tgl ? new Date(b.tgl).getTime() : 0;
        return timeB - timeA;
      });
      const latest = matchedHistory[0];
      const price =
        latest.hpp > 0
          ? latest.hpp
          : latest.hna > 0
          ? latest.hna
          : latest.total && latest.qty && latest.qty > 0
          ? Math.round(latest.total / latest.qty)
          : 0;

      riwayatCandidate = {
        source: 'riwayat',
        pbf: (latest.pbf || '').trim(),
        tanggal: latest.tgl || '',
        historyHarga: price,
        diskon: latest.diskon ?? 0,
        hna: latest.hna ?? 0,
        label: 'Riwayat Pembelian',
        detail: `${latest.tgl || '-'} • ${latest.pbf || '-'} • Rp ${Number(price).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${latest.diskon ? ` (Disc ${latest.diskon}%)` : ''}`,
      };
      options.push(riwayatCandidate);
    }
  }

  // B. Candidate from Master Obat (Master SKU)
  let masterCandidate: LastPurchaseOption | null = null;
  if (masterList && masterList.length > 0) {
    const matchedMaster = masterList.find((m) => isMatch(m.sku, m.nama));
    if (matchedMaster) {
      const price =
        matchedMaster.historyHarga > 0
          ? matchedMaster.historyHarga
          : matchedMaster.hna > 0
          ? matchedMaster.hna
          : (matchedMaster as any).hpp > 0
          ? (matchedMaster as any).hpp
          : 0;

      let masterDiskon = 0;
      if (matchedMaster.historyHarga > 0 && matchedMaster.hna > 0 && matchedMaster.historyHarga < matchedMaster.hna * 1.11) {
        masterDiskon = Math.max(0, Math.round(((matchedMaster.hna * 1.11 - matchedMaster.historyHarga) / (matchedMaster.hna * 1.11)) * 1000) / 10);
      }

      masterCandidate = {
        source: 'master',
        pbf: (matchedMaster.pbf || '').trim(),
        tanggal: matchedMaster.tanggal || '',
        historyHarga: price,
        diskon: masterDiskon,
        hna: matchedMaster.hna,
        label: 'Master SKU Obat',
        detail: `${matchedMaster.tanggal || '-'} • ${matchedMaster.pbf || '-'} • Rp ${Number(price).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${masterDiskon > 0 ? ` (Disc ${masterDiskon}%)` : ''}`,
      };
      options.push(masterCandidate);
    }
  }

  // C. Candidate from Komparasi Pricelist (PriceOfferItem)
  let pricelistCandidate: LastPurchaseOption | null = null;
  if (priceList && priceList.length > 0) {
    const matchedPrices = priceList.filter((pl) => isMatch(pl.sku, pl.nama));
    if (matchedPrices.length > 0) {
      matchedPrices.sort((a, b) => {
        const hppA = a.hpp || a.hna || 0;
        const hppB = b.hpp || b.hna || 0;
        return hppA - hppB;
      });
      const bestOffer = matchedPrices[0];
      const price = bestOffer.hpp > 0 ? bestOffer.hpp : bestOffer.hna > 0 ? bestOffer.hna : 0;

      pricelistCandidate = {
        source: 'pricelist',
        pbf: (bestOffer.pbf || '').trim(),
        tanggal: bestOffer.tglUpdate || '',
        historyHarga: price,
        diskon: bestOffer.diskon || 0,
        hna: bestOffer.hna,
        label: 'Pricelist PBF',
        detail: `${bestOffer.tglUpdate || '-'} • ${bestOffer.pbf || '-'} • Rp ${Number(price).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${bestOffer.diskon ? ` (Disc ${bestOffer.diskon}%)` : ''}`,
      };
      options.push(pricelistCandidate);
    }
  }

  // Resolve Effective Values:
  // 1. Manual values check (highest priority if user explicitly provided/overrode)
  const isPbfExplicitDash = row.pbfTerakhir === '-' || isExplicitBarangBaru;
  const isPbfExplicitValue = Boolean(row.pbfTerakhir && row.pbfTerakhir.trim() !== '' && row.pbfTerakhir !== '-');
  let pbf = (row.pbfTerakhir || '').trim();
  let pbfSource: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none' = 'none';

  const isTanggalExplicitDash = row.tanggal === '-' || isExplicitBarangBaru;
  const isTanggalExplicitValue = Boolean(row.tanggal && row.tanggal.trim() !== '' && row.tanggal !== '-');
  let tanggal = (row.tanggal || '').trim();
  let dateSource: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none' = 'none';

  let historyHarga = isHistoryHargaOverridden
    ? (row.historyHargaOverride || 0)
    : (row.historyHarga || 0);
  let priceSource: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none' =
    isHistoryHargaOverridden || isExplicitBarangBaru
      ? 'manual'
      : (historyHarga > 0 ? 'manual' : 'none');

  if (isPbfExplicitDash) {
    pbf = '-';
    pbfSource = 'manual';
  } else if (isPbfExplicitValue) {
    pbf = row.pbfTerakhir!.trim();
    pbfSource = 'manual';
  } else {
    // 2. Fallback for PBF Terakhir only when not explicitly set/dash
    if (riwayatCandidate?.pbf) {
      pbf = riwayatCandidate.pbf;
      pbfSource = 'riwayat';
    } else if (masterCandidate?.pbf) {
      pbf = masterCandidate.pbf;
      pbfSource = 'master';
    } else if (pricelistCandidate?.pbf) {
      pbf = pricelistCandidate.pbf;
      pbfSource = 'pricelist';
    } else {
      pbf = '-';
      pbfSource = 'none';
    }
  }

  // 3. Fallback for Tanggal Beli Terakhir
  if (isTanggalExplicitDash) {
    tanggal = '-';
    dateSource = 'manual';
  } else if (isTanggalExplicitValue) {
    tanggal = row.tanggal!.trim();
    dateSource = 'manual';
  } else {
    if (riwayatCandidate?.tanggal) {
      tanggal = riwayatCandidate.tanggal;
      dateSource = 'riwayat';
    } else if (masterCandidate?.tanggal) {
      tanggal = masterCandidate.tanggal;
      dateSource = 'master';
    } else if (pricelistCandidate?.tanggal) {
      tanggal = pricelistCandidate.tanggal;
      dateSource = 'pricelist';
    } else {
      tanggal = '-';
      dateSource = 'none';
    }
  }

  // 4. Fallback for History Harga
  if (isExplicitBarangBaru || isHistoryHargaOverridden) {
    // Explicitly overridden or marked barang baru: do NOT fallback to historical records
    if (isExplicitBarangBaru || row.historyHargaOverride === 0 || row.historyHargaOverride === null) {
      historyHarga = 0;
      priceSource = 'manual';
    } else {
      historyHarga = row.historyHargaOverride!;
      priceSource = 'manual';
    }
  } else if (historyHarga <= 0) {
    if (riwayatCandidate && riwayatCandidate.historyHarga > 0) {
      historyHarga = riwayatCandidate.historyHarga;
      priceSource = 'riwayat';
    } else if (masterCandidate && masterCandidate.historyHarga > 0) {
      historyHarga = masterCandidate.historyHarga;
      priceSource = 'master';
    } else if (pricelistCandidate && pricelistCandidate.historyHarga > 0) {
      historyHarga = pricelistCandidate.historyHarga;
      priceSource = 'pricelist';
    }
  }

  // 5. Disc & HNA determination from chosen price source
  let diskon = 0;
  let hna = 0;
  if (priceSource === 'riwayat' && riwayatCandidate) {
    diskon = riwayatCandidate.diskon || 0;
    hna = riwayatCandidate.hna || 0;
  } else if (priceSource === 'master' && masterCandidate) {
    diskon = masterCandidate.diskon || 0;
    hna = masterCandidate.hna || 0;
  } else if (priceSource === 'pricelist' && pricelistCandidate) {
    diskon = pricelistCandidate.diskon || 0;
    hna = pricelistCandidate.hna || 0;
  } else if (riwayatCandidate?.diskon) {
    diskon = riwayatCandidate.diskon;
    hna = riwayatCandidate.hna || 0;
  }

  // Overall primary source
  let overallSource: 'manual' | 'riwayat' | 'master' | 'pricelist' | 'none' = 'none';
  if (pbfSource === 'manual' || priceSource === 'manual' || dateSource === 'manual') {
    overallSource = 'manual';
  } else if (pbfSource !== 'none') {
    overallSource = pbfSource;
  } else if (priceSource !== 'none') {
    overallSource = priceSource;
  } else if (dateSource !== 'none') {
    overallSource = dateSource;
  }

  return {
    pbf,
    tanggal,
    historyHarga,
    diskon,
    hna,
    source: overallSource,
    pbfSource,
    priceSource,
    dateSource,
    options,
  };
}

export interface EffectiveHistoryInfo {
  effectiveHistHarga: number;
  effectiveTglBeli: string;
  effectivePbfTerakhir: string;
  isBarangBaru: boolean;
  isHistHargaEmpty: boolean;
  isTglEmpty: boolean;
  isPbfEmpty: boolean;
  lastPurchase: LastPurchaseInfo;
}

/**
 * Single source of truth helper untuk mendapatkan riwayat harga, tanggal beli,
 * dan PBF terakhir yang efektif pada Usulan Obat, Export Excel/PDF, dan Cetak.
 */
export function getEffectiveHistoryInfo(
  row: {
    sku?: string;
    nama?: string;
    pbfTerakhir?: string;
    tanggal?: string;
    historyHarga?: number;
    historyHargaOverride?: number | null;
    isBarangBaru?: boolean;
  },
  history: PurchaseHistoryItem[] = [],
  masterList: MasterDrugItem[] = [],
  priceList: PriceOfferItem[] = []
): EffectiveHistoryInfo {
  const lastPurchase = findLastPurchaseInfo(row, history, masterList, priceList);

  const isExplicitBarangBaru = row.isBarangBaru === true;

  // 1. PBF Terakhir Beli
  const isPbfExplicitDash = row.pbfTerakhir === '-' || isExplicitBarangBaru;
  const isPbfExplicitValue = Boolean(row.pbfTerakhir && row.pbfTerakhir.trim() !== '' && row.pbfTerakhir !== '-');
  const effectivePbfTerakhir = isPbfExplicitDash
    ? '-'
    : (isPbfExplicitValue ? row.pbfTerakhir!.trim() : (lastPurchase.pbf || '-'));
  const isPbfEmpty = effectivePbfTerakhir === '-' || effectivePbfTerakhir === '';

  // 2. Tanggal Beli Terakhir
  const isTglExplicitDash = row.tanggal === '-' || isExplicitBarangBaru;
  const isTglExplicitValue = Boolean(row.tanggal && row.tanggal.trim() !== '' && row.tanggal !== '-');
  const effectiveTglBeli = isTglExplicitDash
    ? '-'
    : (isTglExplicitValue ? row.tanggal!.trim() : (lastPurchase.tanggal || '-'));
  const isTglEmpty = effectiveTglBeli === '-' || effectiveTglBeli === '';

  // 3. History Harga
  const isPriceExplicitZero = row.historyHargaOverride === 0 || row.historyHargaOverride === null;
  const isPriceExplicitValue = row.historyHargaOverride !== undefined && row.historyHargaOverride !== null && row.historyHargaOverride > 0;

  let effectiveHistHarga = 0;
  let isHistHargaEmpty = false;

  if (isExplicitBarangBaru || isPriceExplicitZero) {
    effectiveHistHarga = 0;
    isHistHargaEmpty = true;
  } else if (isPriceExplicitValue) {
    effectiveHistHarga = row.historyHargaOverride!;
    isHistHargaEmpty = false;
  } else if (row.historyHarga && row.historyHarga > 0) {
    effectiveHistHarga = row.historyHarga;
    isHistHargaEmpty = false;
  } else if (lastPurchase.historyHarga && lastPurchase.historyHarga > 0) {
    effectiveHistHarga = lastPurchase.historyHarga;
    isHistHargaEmpty = false;
  } else {
    effectiveHistHarga = 0;
    isHistHargaEmpty = true;
  }

  const isBarangBaru = isExplicitBarangBaru || (isPbfEmpty && isTglEmpty && isHistHargaEmpty);

  return {
    effectiveHistHarga,
    effectiveTglBeli,
    effectivePbfTerakhir,
    isBarangBaru,
    isHistHargaEmpty,
    isTglEmpty,
    isPbfEmpty,
    lastPurchase,
  };
}

