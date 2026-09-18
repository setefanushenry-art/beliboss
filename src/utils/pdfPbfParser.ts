import * as pdfjsLib from 'pdfjs-dist';
import { MasterDrugItem } from '../types';

// Set up PDF worker using cdnjs fallback
try {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
} catch (err) {
  console.warn('PDF Worker setup warning:', err);
}

export type PriceTaxMode = 'exc_ppn' | 'inc_ppn';

export interface ExtractedPdfOffer {
  id: string;
  sku: string;
  nama: string;
  pbf: string;
  hna: number;
  diskon: number;
  hpp: number;
  rawPrice?: number;
  priceType?: PriceTaxMode;
  stok: number; // Stok PBF
  tglUpdate: string;
  kontakPbf?: string;
  catatan?: string;
  confidence: 'high' | 'medium' | 'low';
  selected: boolean;
}

export interface PdfParseResult {
  detectedPbf: string;
  detectedDate: string;
  detectedContact: string;
  detectedPriceType?: PriceTaxMode;
  items: ExtractedPdfOffer[];
  rawText: string;
  totalPages: number;
  isThousandsUnitDetected?: boolean;
}

// Known common Indonesian Pharmaceutical Distributors / PBFs
const KNOWN_PBFS = [
  'Enseval Putera Megatrading',
  'Anugrah Argon Medica (AAM)',
  'Mensa Bina Sukses (MBS)',
  'Tempo Scan Pacific (TSP)',
  'Kimia Farma Trading & Distribution',
  'Dos Ni Roha (DNR)',
  'Parit Padang Global (PPG)',
  'Tri Sapta Jaya (TSJ)',
  'Sumber Mandiri Abadi (SMA)',
  'Penta Valent',
  'Kebayoran Pharma',
  'Millenium Pharmacon International (MPI)',
  'Antar Mitra Sembada (AMS)',
  'Rajawali Nusindo',
  'Bina San Prima (BSP)',
  'United Dico Citas (UDC)',
  'Bio Farma',
  'Phapros',
  'Kalbe Farma',
  'Sanbe Farma',
  'Combiphar',
  'Dexa Medica',
  'Novell Pharmaceutical',
  'Bernofarm',
  'Interbat',
  'Soho Industri Pharmasi',
  'Sanofi Aventis',
  'Taisho Pharmaceutical',
  'Darya-Varia Laboratoria',
];

interface RawPdfItem {
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

/**
 * Universal Indonesian & International Price Parser
 * Accurately parses:
 * - 81,000 / 81.000 / 81,000.00 / 81.000,00 / 81000 / 81,000,-
 * - 1,500,000 / 1.500.000 / 1.5jt / 1.5 juta / 1.5M / 1500000
 * - 150.000 / 150,000 / 150k / 150rb
 * - 500 / 750 / 900
 */
export function parsePrice(str: string): number {
  if (!str) return 0;
  let cleaned = str.toString().toLowerCase().replace(/rp\.?|idr/gi, '').trim();

  // Multipliers: JUTAAN (jt, juta, m)
  if (/\b(?:jt|juta|m)\b/i.test(cleaned) || cleaned.endsWith('jt') || cleaned.endsWith('m')) {
    const numPart = cleaned.replace(/[^0-9.,]/g, '').replace(',', '.');
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1000000);
  }

  // Multipliers: RIBUAN (k, rb, ribu)
  if (/\b(?:k|rb|ribu)\b/i.test(cleaned) || cleaned.endsWith('k') || cleaned.endsWith('rb')) {
    const numPart = cleaned.replace(/[^0-9.,]/g, '').replace(',', '.');
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }

  // Remove trailing currency notation e.g. "81.000,-" or "81,000.-" or "81,000,-"
  cleaned = cleaned.replace(/[,.]\s*[-–—]$/g, '').trim();

  // Remove interior spaces in numbers e.g. "81 000" or "1 500 000"
  if (/^\d{1,3}(\s+\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\s+/g, ''), 10) || 0;
  }

  // Check dots and commas
  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (hasDot && hasComma) {
    const lastDotIdx = cleaned.lastIndexOf('.');
    const lastCommaIdx = cleaned.lastIndexOf(',');
    if (lastCommaIdx > lastDotIdx) {
      // Indonesian format: e.g. 81.000,00 or 1.500.000,00
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: e.g. 81,000.00 or 1,500,000.00
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
      // Multiple dots: e.g. 1.500.000 or 81.000.000 -> remove dots
      cleaned = cleaned.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      // Single dot: e.g. 81.000 (Ribuan) vs 81.5 (Decimal)
      if (dotParts[1].length === 3) {
        // 3 digits after dot -> Thousands separator (e.g. 81.000)
        cleaned = cleaned.replace(/\./g, '');
      } else if (dotParts[1].length === 2 && parseInt(dotParts[1], 10) === 0) {
        // e.g. 81000.00 -> 81000
        cleaned = dotParts[0];
      }
    }
  } else if (hasComma) {
    const commaParts = cleaned.split(',');
    if (commaParts.length > 2) {
      // Multiple commas: e.g. 1,500,000 -> remove commas
      cleaned = cleaned.replace(/,/g, '');
    } else if (commaParts.length === 2) {
      // Single comma: e.g. 81,000 (Ribuan) vs 81,5 (Decimal)
      if (commaParts[1].length === 3) {
        // 3 digits after comma -> Thousands separator (e.g. 81,000)
        cleaned = cleaned.replace(/,/g, '');
      } else if (commaParts[1].length === 2 && parseInt(commaParts[1], 10) === 0) {
        // e.g. 81000,00 -> 81000
        cleaned = commaParts[0];
      } else {
        // Decimal e.g. 81,5 -> 81.5
        cleaned = cleaned.replace(',', '.');
      }
    }
  }

  const val = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(val) ? 0 : val;
}

/**
 * Extract full text and structured lines from a PDF file ArrayBuffer
 * Uses dynamic baseline clustering to prevent line fragmentation between bold/normal fonts
 */
export async function extractTextFromPDF(
  arrayBuffer: ArrayBuffer
): Promise<{ fullText: string; lines: string[]; totalPages: number }> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const allLines: string[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const rawItems: RawPdfItem[] = [];
      textContent.items.forEach((item: any) => {
        if ('str' in item && item.str.trim()) {
          rawItems.push({
            x: item.transform[4],
            y: item.transform[5],
            text: item.str,
            width: item.width || item.str.length * 6,
            height: item.height || 10,
          });
        }
      });

      // Sort all items by Y descending (top to bottom)
      rawItems.sort((a, b) => b.y - a.y);

      // Cluster items into lines within vertical delta <= 3.8px
      const lineClusters: RawPdfItem[][] = [];
      for (const item of rawItems) {
        let placed = false;
        for (const cluster of lineClusters) {
          const avgY = cluster.reduce((sum, it) => sum + it.y, 0) / cluster.length;
          if (Math.abs(item.y - avgY) <= 3.8) {
            cluster.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lineClusters.push([item]);
        }
      }

      // Process each line cluster
      lineClusters.forEach((cluster) => {
        // Sort items in line from left to right (X ascending)
        cluster.sort((a, b) => a.x - b.x);

        let lineBuffer = '';
        for (let j = 0; j < cluster.length; j++) {
          const current = cluster[j];
          const prev = cluster[j - 1];

          if (!prev) {
            lineBuffer += current.text.trim();
          } else {
            const gap = current.x - (prev.x + prev.width);
            const curText = current.text.trim();
            const prevText = prev.text.trim();

            // Seamless stitching for genuine intra-number or intra-word fragments
            const curStartsWithPunct = /^[.,]\s*\d+/.test(curText);
            const prevEndsWithPunct = /[.,]$/.test(prevText);
            const isCurFullPrice = /^\d{1,3}[.,]\d{3}/.test(curText);
            const isPrevRowIndex = /^\d{1,3}\.?$/.test(prevText) && isCurFullPrice;
            
            // True decimal / thousands continuation (e.g. "14" + ".000", "14." + "000", "14" + ",000")
            const isDecimalOrThousandsContinuation =
              (curStartsWithPunct && /^\d+$/.test(prevText)) ||
              (prevEndsWithPunct && /^\d+$/.test(curText)) ||
              (/^\d{1,3}$/.test(prevText) && /^\d{3}$/.test(curText) && gap < 8);

            const isUnitOrSuffix =
              (/^[.,\-%/]/.test(curText)) ||
              (/[.,\-%/]$/.test(prevText)) ||
              (/^\d+$/.test(prevText) && /^(?:mg|g|gr|ml|iu|mcg|tab|box|cap|btl|strip|pcs|s\b|'s\b)/i.test(curText));

            if (isDecimalOrThousandsContinuation) {
              // Direct stitch for split numbers (e.g. 14 + .000 -> 14.000, 14. + 000 -> 14.000)
              lineBuffer += (prevEndsWithPunct || curStartsWithPunct ? '' : '.') + curText;
            } else if (gap < 3 && isUnitOrSuffix && !isPrevRowIndex) {
              lineBuffer += curText;
            } else if (gap < 8 && !isPrevRowIndex) {
              lineBuffer += ' ' + curText;
            } else {
              // Distinct spacing between columns (e.g. Row No "1" and Price "14.000")
              lineBuffer += '   ' + curText;
            }
          }
        }

        // Multi-pass normalization to fix any whitespace around number separators:
        // "14 . 000" -> "14.000" | "14 , 000" -> "14,000" | "14   000" -> "14.000"
        let cleanedLine = lineBuffer
          .replace(/^[|!lI\/\\]\s*/g, '')
          .replace(/\s+[|!lI\/\\]\s+/g, '   ')
          .replace(/(\d+)\s*,\s*(\d{3})\s*,\s*(\d{3})/g, '$1,$2,$3')
          .replace(/(\d+)\s*\.\s*(\d{3})\s*\.\s*(\d{3})/g, '$1.$2.$3')
          .replace(/(\d+)\s*,\s*(\d{3})\s*([.,])\s*(\d{2})/g, '$1,$2$3$4')
          .replace(/(\d+)\s*\.\s*(\d{3})\s*([.,])\s*(\d{2})/g, '$1.$2$3$4')
          .replace(/(\d+)\s*,\s*(\d{3})/g, '$1,$2')
          .replace(/(\d+)\s*\.\s*(\d{3})/g, '$1.$2')
          .replace(/\b(\d{1,3})\s+(\d{3})\s+(\d{3})\b/g, '$1.$2.$3')
          .replace(/\b(\d{1,3})\s+(\d{3})\b/g, '$1.$2')
          .replace(/(\d+)\s*,\s*(\d{2})\b/g, '$1,$2')
          .replace(/(\d+)\s*\.\s*(\d{2})\b/g, '$1.$2')
          .replace(/Rp\s*\.?\s*/gi, 'Rp ')
          .trim();

        if (cleanedLine) {
          allLines.push(cleanedLine);
          fullText += cleanedLine + '\n';
        }
      });
    }

    return { fullText, lines: allLines, totalPages };
  } catch (err) {
    console.error('Error extracting text from PDF:', err);
    throw new Error(
      'Gagal membaca struktur berkas PDF. Pastikan berkas PDF bukan scan gambar murni tanpa lapisan teks.'
    );
  }
}

/**
 * Detect PBF / Distributor Name, Date, and Contact from text
 */
function detectDocumentMetadata(
  fullText: string,
  lines: string[]
): {
  pbf: string;
  date: string;
  contact: string;
  isThousandsUnit: boolean;
  detectedPriceType: PriceTaxMode;
} {
  let pbf = 'Distributor PBF';
  let date = new Date().toISOString().split('T')[0];
  let contact = '';

  // 1. Check known PBF names
  const lowerFull = fullText.toLowerCase();
  for (const known of KNOWN_PBFS) {
    const cleanKnown = known.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDoc = lowerFull.replace(/[^a-z0-9]/g, '');
    if (cleanDoc.includes(cleanKnown) || lowerFull.includes(known.toLowerCase())) {
      pbf = known;
      break;
    }
  }

  // 2. Check PT / CV / PBF regex in top lines if not matched
  if (pbf === 'Distributor PBF') {
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      const match = line.match(/(?:PT\.?|CV\.?|PBF\.?)\s+([A-Z0-9\s.,&-]{3,40})/i);
      if (match && match[0]) {
        pbf = match[0].trim();
        break;
      }
    }
  }

  // 3. Detect Phone / Contact
  const phoneMatch =
    fullText.match(/(?:telp|hp|wa|whatsapp|phone|kontak|hubungi)\s*[:.]?\s*([0-9\-\s+]{8,18})/i) ||
    fullText.match(/(?:08[1-9][0-9]{7,11}|\+62[0-9\s-]{9,15})/);
  if (phoneMatch) {
    contact = phoneMatch[1] ? phoneMatch[1].trim() : phoneMatch[0].trim();
  }

  // 4. Detect Date
  const dateMatch = fullText.match(/(\d{1,2})[\s/-]([A-Za-z]+|\d{1,2})[\s/-](\d{2,4})/);
  if (dateMatch) {
    const d = parseInt(dateMatch[1]);
    const m = dateMatch[2];
    const y = parseInt(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]);
    if (!isNaN(d) && !isNaN(y)) {
      const monthsIndo: Record<string, string> = {
        jan: '01',
        januari: '01',
        feb: '02',
        februari: '02',
        mar: '03',
        maret: '03',
        apr: '04',
        april: '04',
        mei: '05',
        jun: '06',
        juni: '06',
        jul: '07',
        juli: '07',
        ags: '08',
        agustus: '08',
        sep: '09',
        september: '09',
        okt: '10',
        oktober: '10',
        nov: '11',
        november: '11',
        des: '12',
        desember: '12',
      };
      const monthNum =
        monthsIndo[m.toLowerCase()] || (parseInt(m) ? String(m).padStart(2, '0') : '01');
      date = `${y}-${monthNum}-${String(d).padStart(2, '0')}`;
    }
  }

  // 5. Detect if entire table states prices in thousands
  const isThousandsUnit =
    /\b(dalam ribuan|dlm ribuan|in thousands?|ribuan rupiah|\(000\)|\(dlm rb\)|x1000|x 1000)\b/i.test(
      lowerFull
    );

  // 6. Detect if document prices are inclusive of PPN (HNA+PPN / Inc. PPN / Harga Jual)
  const isIncPpn =
    /\b(inc\.?\s*ppn|include\s*ppn|termasuk\s*ppn|hna\s*\+\s*ppn|harga\s*jual|harga\s*netto\s*inc|inc\s*tax|dengan\s*ppn|sdh\s*ppn|sudah\s*ppn)\b/i.test(
      lowerFull
    );
  const isExcPpn =
    /\b(exc\.?\s*ppn|exclude\s*ppn|belum\s*ppn|tanpa\s*ppn|hna\s*murni|belum\s*termasuk\s*ppn|non\s*ppn)\b/i.test(
      lowerFull
    );

  const detectedPriceType: PriceTaxMode = isIncPpn && !isExcPpn ? 'inc_ppn' : 'exc_ppn';

  return { pbf, date, contact, isThousandsUnit, detectedPriceType };
}

/**
 * Check if a number token is part of dosage or packaging (e.g. 500mg, Box 100, 10 Strip, 10x10)
 */
function isDosageOrPackagingToken(token: string, fullLine: string, matchIndex: number): boolean {
  const textAfter = fullLine.substring(matchIndex + token.length, matchIndex + token.length + 20).trim();
  const textBefore = fullLine.substring(Math.max(0, matchIndex - 20), matchIndex).trim();

  // Unit regex for dosage, strength, packaging forms
  const unitAfterRegex =
    /^(?:mg|g|gr|gram|mcg|ug|ml|l|liter|iu|ui|ui\/ml|mg\/ml|mg\/5ml|mcg\/puff|tab|tablet|kap|kapsul|kaplet|amp|ampul|vial|fls|flakon|btl|botol|strip|box|ktk|kotak|blister|sachet|supp|suppositoria|tube|pot|dos|pen|cartridge|pcs|s\b|'s\b|x\d+)/i;
  if (unitAfterRegex.test(textAfter)) {
    return true;
  }

  // Preceding packaging labels: e.g. "Box 100", "Btl 60", "Strip 10", "Ampul 5", "Isi 50"
  const prefixBeforeRegex =
    /(?:box|btl|botol|strip|fls|amp|ampul|vial|ktk|tube|pot|isi|kemasan|isi\s*:?|pack|dos|blister|sachet)\s*$/i;
  if (prefixBeforeRegex.test(textBefore)) {
    return true;
  }

  // Dimension / Multiplier formats e.g. "10x10", "5x2"
  if (/^[xX]\s*\d+/i.test(textAfter) || /\d+\s*[xX]$/i.test(textBefore)) {
    return true;
  }

  // Percentage within drug name e.g. "Betadine 10%", "Alkohol 70%"
  if (/^%/.test(textAfter) && !/\b(?:disc|diskon|potongan)\b/i.test(textBefore)) {
    const num = parseFloat(token);
    if (num <= 100 && /\b(?:sol|salep|tetes|drop|alkohol|cream|krim|gel|infus|syrup|sirup|dextrose|nacl)\b/i.test(textBefore)) {
      return true;
    }
  }

  return false;
}

/**
 * Main PDF Price List Parser with High-Precision Multi-Column Disambiguation
 */
export async function parsePdfPriceOffers(
  arrayBuffer: ArrayBuffer,
  masterList: MasterDrugItem[] = []
): Promise<PdfParseResult> {
  const { fullText, lines, totalPages } = await extractTextFromPDF(arrayBuffer);
  const {
    pbf: detectedPbf,
    date: detectedDate,
    contact: detectedContact,
    isThousandsUnit,
    detectedPriceType,
  } = detectDocumentMetadata(fullText, lines);

  const extractedItems: ExtractedPdfOffer[] = [];
  const today = detectedDate || new Date().toISOString().split('T')[0];

  // Regex to detect number candidates (supports formatted 81,000, 81.000, Rp 81,000, integers, percentages)
  const candidateNumRegex =
    /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3}){2,}(?:[.,]\d{1,2})?|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{1,3}(?:\s+\d{3}){1,3}|\d+(?:[.,]\d+)?\s*(?:jt|juta|m|k|rb|ribu)|\d+(?:[.,]\d+)?%?|\d+)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip non-tabular lines
    if (
      /^(halaman|page|total|subtotal|grand total|catatan|syarat|ttd|hormat kami|penerima|apoteker|hal\s*\d+|no\s+nama\s+obat|kode\s+barang|no\.\s+nama|daftar\s+harga|faktur\s+penjualan|surat\s+pesanan)/i.test(
        line
      ) ||
      line.length < 4
    ) {
      continue;
    }

    // Explicit Stock check: e.g. "Stok: 50", "Qty: 100", "Stock 25", "Ready 50"
    let explicitStock = 0;
    const stockTagMatch = line.match(/(?:stok|stock|qty|sisa|ready|avail|kuantitas)\s*[:=]?\s*(\d+)/i);
    if (stockTagMatch) {
      explicitStock = parseInt(stockTagMatch[1], 10) || 0;
    }

    // Extract all numeric clusters in the line
    const numbersWithPos: {
      raw: string;
      val: number;
      index: number;
      isDosage: boolean;
      isPercent: boolean;
      isFormattedPrice: boolean;
    }[] = [];

    let match;
    candidateNumRegex.lastIndex = 0;
    while ((match = candidateNumRegex.exec(line)) !== null) {
      const raw = match[0].trim();
      const matchIndex = match.index;
      const isPercent = raw.includes('%');
      const isDosage = isDosageOrPackagingToken(raw, line, matchIndex);
      let parsedVal = parsePrice(raw);

      if (isThousandsUnit && parsedVal > 0 && parsedVal < 5000 && !isPercent && !isDosage) {
        parsedVal = parsedVal * 1000;
      }

      // Check if explicitly formatted as price: e.g. "81,000", "81.000", "Rp 81,000", "81k"
      const isFormattedPrice =
        /^(?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?$/i.test(raw) ||
        raw.toLowerCase().includes('rp') ||
        raw.toLowerCase().includes('k') ||
        raw.toLowerCase().includes('rb') ||
        raw.toLowerCase().includes('jt');

      numbersWithPos.push({
        raw,
        val: parsedVal,
        index: matchIndex,
        isDosage,
        isPercent,
        isFormattedPrice,
      });
    }

    // Non-dosage tokens
    const nonDosage = numbersWithPos.filter((n) => !n.isDosage);

    // Candidates for HNA / Price:
    // Prioritize numbers that look like prices (>= 500 or formatted with comma/dot) and are not percentage
    const priceCandidates = nonDosage.filter((n) => {
      if (n.isPercent) return false;
      if (n.isFormattedPrice) return true;
      if (n.val >= 500) return true;
      // Allow >= 100 if raw has dot/comma
      if (n.val >= 100 && (n.raw.includes('.') || n.raw.includes(','))) return true;
      return false;
    });

    // Discount candidates
    const discountCandidates = nonDosage.filter(
      (n) => n.isPercent || (n.val >= 0 && n.val <= 90 && !n.isFormattedPrice && n.val < 100)
    );

    if (priceCandidates.length > 0) {
      // Pick the primary Price candidate:
      // In Indonesian pharmaceutical invoices/lists, the unit price (HNA) is:
      // 1. First formatted price (e.g. 81,000)
      // 2. Or first price candidate >= 1000
      let chosenPriceObj = priceCandidates.find((p) => p.isFormattedPrice) || priceCandidates[0];

      // If multiple formatted prices (e.g. HNA 81,000 and HPP 89,910), the earlier one is HNA Satuan
      const formattedPrices = priceCandidates.filter((p) => p.isFormattedPrice || p.val >= 1000);
      if (formattedPrices.length > 0) {
        chosenPriceObj = formattedPrices[0];
      }

      const firstPriceIndex = chosenPriceObj.index;
      let rawNamePart = line.substring(0, firstPriceIndex).trim();
      let detectedTrailingQty = 0;

      // Clean leading row index bullets e.g. "1.", "01.", "[1]", "A-01", "1  ", "| 1"
      rawNamePart = rawNamePart
        .replace(/^[|!lI\/\\]\s*/g, '')
        .replace(/^(\d+[\.\)\-\]\s]+|[A-Z]{1,4}-\d+[\s]+|\d+\s{2,})/i, '')
        .trim();

      // Clean trailing quantity column between name and price (e.g. "Amoxicillin 500mg 1" -> "Amoxicillin 500mg")
      // Check if ends with standalone integer that is not a dosage unit
      const trailingQtyMatch = rawNamePart.match(/\s+(\d{1,4})$/);
      if (trailingQtyMatch) {
        const potentialQty = parseInt(trailingQtyMatch[1], 10);
        const nameWithoutQty = rawNamePart.substring(0, rawNamePart.length - trailingQtyMatch[0].length).trim();
        // If the preceding text ends with valid medicine name or dosage (mg/ml/etc)
        if (nameWithoutQty.length >= 3 && /[a-zA-Z]/.test(nameWithoutQty)) {
          rawNamePart = nameWithoutQty;
          if (potentialQty > 0 && potentialQty < 5000) {
            detectedTrailingQty = potentialQty;
          }
        }
      }

      // Ensure name contains meaningful letters and length
      if (rawNamePart.length >= 3 && /[a-zA-Z]/.test(rawNamePart)) {
        let hna = chosenPriceObj.val;
        let diskon = 0;
        let stok = explicitStock || detectedTrailingQty;

        // Check for discount percentage after the price
        const matchingDisc = discountCandidates.find((d) => d.index > chosenPriceObj.index);
        if (matchingDisc) {
          diskon = matchingDisc.val;
        }

        // If stock wasn't explicitly tagged, check if there is an unassigned integer column
        if (stok === 0) {
          const possibleStockToken = nonDosage.find(
            (n) =>
              n !== chosenPriceObj &&
              n !== matchingDisc &&
              !n.isPercent &&
              !n.isFormattedPrice &&
              n.val > 0 &&
              n.val < 10000 &&
              !n.raw.includes('.') &&
              !n.raw.includes(',')
          );
          if (possibleStockToken) {
            stok = Math.round(possibleStockToken.val);
          }
        }

        const rawPrice = chosenPriceObj.val;
        const itemPriceType = detectedPriceType || 'exc_ppn';
        let finalHna = rawPrice;
        let finalHpp = 0;

        if (itemPriceType === 'inc_ppn') {
          // Document already includes PPN 11%
          const diskonRp = rawPrice * (diskon / 100);
          finalHpp = Math.round(rawPrice - diskonRp);
          finalHna = Math.round(finalHpp / 1.11);
        } else {
          // Document is standard HNA (before PPN)
          const diskonRp = rawPrice * (diskon / 100);
          finalHna = rawPrice;
          finalHpp = Math.round((rawPrice - diskonRp) * 1.11);
        }

        // Try to match with Master Drug SKU
        const matchedMaster = masterList.find((m) => {
          const cleanM = m.nama.toLowerCase().trim();
          const cleanExt = rawNamePart.toLowerCase().trim();
          return cleanM === cleanExt || cleanExt.includes(cleanM) || cleanM.includes(cleanExt);
        });

        const skuVal = matchedMaster
          ? matchedMaster.sku
          : `SKU-PDF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const finalNama = matchedMaster ? matchedMaster.nama : rawNamePart;

        extractedItems.push({
          id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sku: skuVal,
          nama: finalNama,
          pbf: detectedPbf,
          rawPrice: Math.round(rawPrice),
          priceType: itemPriceType,
          hna: Math.round(finalHna),
          diskon,
          hpp: Math.round(finalHpp),
          stok,
          tglUpdate: today,
          kontakPbf: detectedContact,
          catatan: `Diimpor dari PDF (${detectedPbf})${itemPriceType === 'inc_ppn' ? ' [Inc. PPN]' : ''}`,
          confidence: matchedMaster ? 'high' : 'medium',
          selected: true,
        });
      }
    }
  }

  // Fallback scan: relaxed multi-line regex scan for unformatted PDFs
  if (extractedItems.length === 0) {
    const fallbackRegex =
      /([A-Za-z0-9\s\-+/().,%]{4,60})\s+(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3}){1,3}|\d{4,9})/g;
    let fallbackMatch;
    while ((fallbackMatch = fallbackRegex.exec(fullText)) !== null) {
      let candidateName = fallbackMatch[1].trim();
      let candidatePrice = parsePrice(fallbackMatch[2]);

      // Clean leading row index
      candidateName = candidateName.replace(/^(\d+[\.\)\-\]\s]+)/i, '').trim();

      if (isThousandsUnit && candidatePrice < 5000) {
        candidatePrice *= 1000;
      }

      if (
        candidatePrice >= 100 &&
        candidateName.length >= 3 &&
        !/^(total|subtotal|pembayaran|faktur|apotek|alamat|tanggal|nomor|telepon|halaman)/i.test(
          candidateName
        )
      ) {
        const itemPriceType = detectedPriceType || 'exc_ppn';
        const rawPrice = candidatePrice;
        let finalHna = rawPrice;
        let finalHpp = Math.round(rawPrice * 1.11);

        if (itemPriceType === 'inc_ppn') {
          finalHpp = Math.round(rawPrice);
          finalHna = Math.round(rawPrice / 1.11);
        }

        extractedItems.push({
          id: 'pdf_fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sku: `SKU-PDF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          nama: candidateName,
          pbf: detectedPbf,
          rawPrice: Math.round(rawPrice),
          priceType: itemPriceType,
          hna: Math.round(finalHna),
          diskon: 0,
          hpp: Math.round(finalHpp),
          stok: 0,
          tglUpdate: today,
          kontakPbf: detectedContact,
          catatan: `Diimpor dari PDF (${detectedPbf})${itemPriceType === 'inc_ppn' ? ' [Inc. PPN]' : ''}`,
          confidence: 'low',
          selected: true,
        });
      }
    }
  }

  return {
    detectedPbf,
    detectedDate,
    detectedContact,
    detectedPriceType,
    items: extractedItems,
    rawText: fullText,
    totalPages,
    isThousandsUnitDetected: isThousandsUnit,
  };
}
