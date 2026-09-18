import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import {
  AppStateData,
  DefektaItem,
  DrugCalculationRow,
  DrugCategory,
  MasterDrugItem,
  PharmacyProfile,
  PriceOfferItem,
  PurchaseHistoryItem,
} from '../types';
import { findLastPurchaseInfo, getEffectiveHistoryInfo } from './bestPriceHelper';

// In-memory reference to user-selected directory handle (File System Access API)
let connectedDirectoryHandle: any = null;

export const FileSystemManager = {
  isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  },

  getConnectedDirectory(): any {
    return connectedDirectoryHandle;
  },

  async pickAndConnectDirectory(): Promise<{ success: boolean; name: string; message: string }> {
    if (!this.isFileSystemAccessSupported()) {
      return {
        success: false,
        name: '',
        message: 'Peramban ini tidak mendukung File System Access API secara langsung. Gunakan dialog simpan biasa.',
      };
    }

    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'apotek_internal_folder',
        startIn: 'documents',
      });

      // Verify permission
      // @ts-ignore
      const permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        connectedDirectoryHandle = handle;
        return {
          success: true,
          name: handle.name,
          message: `Berhasil terhubung ke folder internal perangkat: "${handle.name}"`,
        };
      } else {
        return {
          success: false,
          name: '',
          message: 'Izin akses folder ditolak oleh pengguna.',
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, name: '', message: 'Pemilihan folder dibatalkan.' };
      }
      return { success: false, name: '', message: err.message || 'Gagal menghubungkan folder.' };
    }
  },

  disconnectDirectory(): void {
    connectedDirectoryHandle = null;
  },

  async listFilesInConnectedDirectory(): Promise<Array<{ name: string; kind: string; size?: number; lastModified?: number }>> {
    if (!connectedDirectoryHandle) return [];
    const files: Array<{ name: string; kind: string; size?: number; lastModified?: number }> = [];

    try {
      // @ts-ignore
      for await (const entry of connectedDirectoryHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          files.push({
            name: entry.name,
            kind: 'file',
            size: file.size,
            lastModified: file.lastModified,
          });
        } else {
          files.push({
            name: entry.name,
            kind: 'directory',
          });
        }
      }
      return files.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    } catch (err) {
      console.error('Error listing directory files:', err);
      return [];
    }
  },

  // Direct trigger download helper (safe for all iframes & browsers)
  triggerDirectDownload(blobOrUrl: Blob | string, filename: string): boolean {
    try {
      const isString = typeof blobOrUrl === 'string';
      const url = isString ? blobOrUrl : window.URL.createObjectURL(blobOrUrl);
      const a = document.createElement('a');
      a.style.position = 'fixed';
      a.style.top = '-9999px';
      a.style.left = '-9999px';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          if (!isString) {
            window.URL.revokeObjectURL(url);
          }
        } catch {
          // ignore cleanup errors
        }
      }, 500);
      return true;
    } catch (e) {
      console.error('triggerDirectDownload failed:', e);
      return false;
    }
  },

  async saveBlobToInternalStorage(
    blob: Blob,
    suggestedName: string,
    fileTypeDesc: string,
    extension: string
  ): Promise<{ success: boolean; savedPath: string }> {
    // 1. If user linked a folder handle directly, write straight into it!
    if (connectedDirectoryHandle) {
      try {
        // @ts-ignore
        const fileHandle = await connectedDirectoryHandle.getFileHandle(suggestedName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return {
          success: true,
          savedPath: `${connectedDirectoryHandle.name}/${suggestedName}`,
        };
      } catch (err) {
        console.warn('Gagal menulis langsung ke handle folder tersambung, beralih ke unduhan langsung...', err);
      }
    }

    // 2. Try showSaveFilePicker ONLY if outside iframe and supported
    const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isInsideIframe && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: fileTypeDesc,
              accept: { [blob.type || 'application/octet-stream']: [extension] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return {
          success: true,
          savedPath: handle.name,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, savedPath: '' };
        }
        console.warn('showSaveFilePicker error, falling back to download...', err);
      }
    }

    // 3. Fallback standard direct download
    const ok = this.triggerDirectDownload(blob, suggestedName);
    if (ok) {
      return {
        success: true,
        savedPath: `Unduhan Lokal (${suggestedName})`,
      };
    }
    return { success: false, savedPath: '' };
  },

  // Export Perhitungan / Usulan to Excel
  async exportPerhitunganToExcel(
    rows: DrugCalculationRow[],
    category: DrugCategory,
    codDiscountPct: number,
    apotekName = 'Apotek'
  ): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = rows
      .filter((r) => r.nama && r.nama.trim())
      .map((r, idx) => {
        const isPpn = r.includePpn !== false;
        const diskonRp = r.hna * (r.diskonPct / 100);
        const hnaStlhDiskon = r.hna - diskonRp;
        const hpp = isPpn ? hnaStlhDiskon * 1.11 : hnaStlhDiskon;
        const subtotal = hpp * (r.beli || 0);

        return {
          No: idx + 1,
          'Kode SKU': r.sku || '-',
          'Nama Obat': r.nama,
          'Status PPN': isPpn ? 'Kena PPN 11%' : 'Harga Jadi (Non-PPN)',
          'HNA + PPN (Rp)': Math.round(r.hnaPlusPpn || (isPpn ? r.hna * 1.11 : r.hna)),
          'HNA Satuan (Rp)': Math.round(r.hna || 0),
          'Diskon (%)': r.diskonPct || 0,
          'Jumlah Diskon (Rp)': Math.round(diskonRp),
          'HNA Stlh Diskon (Rp)': Math.round(hnaStlhDiskon),
          'HPP / Unit (Rp)': Math.round(hpp),
          'Kuantitas Beli': r.beli || 0,
          'Subtotal (Rp)': Math.round(subtotal),
          'Pabrik / Produsen': r.pabrik || '-',
          'PBF Rekomendasi': r.pbf || '-',
        };
      });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Perhitungan ${category.toUpperCase()}`);

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Perhitungan_${category.toUpperCase()}_${apotekName.replace(/\s+/g, '_')}_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Usulan Pembelian to Excel
  async exportUsulanToExcel(
    rows: DrugCalculationRow[],
    category: DrugCategory,
    codDiscountPct: number,
    apotekName = 'Apotek',
    targetPbf?: string,
    history?: PurchaseHistoryItem[],
    masterList?: MasterDrugItem[],
    priceList?: PriceOfferItem[]
  ): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const validRows = rows.filter((r) => r.nama && (r.beli > 0 || r.minta > 0));

    const formatPrice2Dec = (val: number | undefined | null): string => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    let grandTotal = 0;
    const data = validRows.map((r, idx) => {
      const isPpn = r.includePpn !== false;
      const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
      const nettoHna = (r.hna || 0) - diskonRp;
      const hargaJadi = r.hargaJadi && r.hargaJadi > 0 ? r.hargaJadi : (isPpn ? nettoHna * 1.11 : nettoHna);
      const subtotal = hargaJadi * (r.beli || 0);
      grandTotal += subtotal;

      const {
        effectiveHistHarga,
        effectiveTglBeli,
        effectivePbfTerakhir,
        isHistHargaEmpty,
      } = getEffectiveHistoryInfo(r, history, masterList, priceList);

      return {
        No: idx + 1,
        'Kode SKU': r.sku || '-',
        'Nama Obat': r.nama,
        Pabrik: r.pabrik || '-',
        Kemasan: r.kemasan || '-',
        'History Harga (Rp)': isHistHargaEmpty || effectiveHistHarga <= 0 ? '-' : Math.round(effectiveHistHarga * 100) / 100,
        'Tgl Beli Terakhir': effectiveTglBeli,
        'PBF Terakhir Beli': effectivePbfTerakhir,
        'PBF Tujuan Order': targetPbf || r.pbf || '-',
        'Status PPN': isPpn ? 'PPN 11%' : 'Harga Jadi (Non-PPN)',
        'Harga Jadi (Rp)': Math.round(hargaJadi * 100) / 100,
        'Sisa Stok': r.stok !== undefined && r.stok !== '' ? r.stok : 0,
        'Kuantitas Pesan': r.beli || 0,
        'Total Harga (Rp)': Math.round(subtotal * 100) / 100,
      };
    });

    const codDiscountRp = grandTotal * (codDiscountPct / 100);
    const finalTotal = grandTotal - codDiscountRp;

    // Append summary rows
    data.push({
      No: '' as any,
      'Kode SKU': '',
      'Nama Obat': 'SUBTOTAL USULAN',
      Pabrik: '',
      Kemasan: '',
      'History Harga (Rp)': '' as any,
      'Tgl Beli Terakhir': '',
      'PBF Terakhir Beli': '',
      'PBF Tujuan Order': targetPbf || '-',
      'Status PPN': '',
      'Harga Jadi (Rp)': '' as any,
      'Sisa Stok': '' as any,
      'Kuantitas Pesan': '' as any,
      'Total Harga (Rp)': Math.round(grandTotal),
    });

    if (codDiscountPct > 0) {
      data.push({
        No: '' as any,
        'Kode SKU': '',
        'Nama Obat': `DISKON TUNAI / COD (${codDiscountPct}%)`,
        Pabrik: '',
        Kemasan: '',
        'History Harga (Rp)': '' as any,
        'Tgl Beli Terakhir': '',
        'PBF Terakhir Beli': '',
        'PBF Tujuan Order': '',
        'Status PPN': '',
        'Harga Jadi (Rp)': '' as any,
        'Sisa Stok': '' as any,
        'Kuantitas Pesan': '' as any,
        'Total Harga (Rp)': -Math.round(codDiscountRp),
      });
    }

    data.push({
      No: '' as any,
      'Kode SKU': '',
      'Nama Obat': 'TOTAL AKHIR ESTIMASI (SETELAH DISKON)',
      Pabrik: '',
      Kemasan: '',
      'History Harga (Rp)': '' as any,
      'Tgl Beli Terakhir': '',
      'PBF Terakhir Beli': '',
      'PBF Tujuan Order': targetPbf || '-',
      'Status PPN': '',
      'Harga Jadi (Rp)': '' as any,
      'Sisa Stok': '' as any,
      'Kuantitas Pesan': '' as any,
      'Total Harga (Rp)': Math.round(finalTotal),
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Usulan ${category.toUpperCase()}`);

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Usulan_Pembelian_${category.toUpperCase()}_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Usulan to PDF with Portrait / Landscape support
  async exportUsulanToPDF(
    rows: DrugCalculationRow[],
    category: DrugCategory,
    codDiscountPct: number,
    settings: AppStateData['settings'],
    orientation: 'portrait' | 'landscape' = 'portrait',
    targetPbf?: string,
    history?: PurchaseHistoryItem[],
    masterList?: MasterDrugItem[],
    priceList?: PriceOfferItem[]
  ): Promise<{ success: boolean; path: string }> {
    const isLandscape = orientation === 'landscape';
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = isLandscape ? 297 : 210;
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Header Branding Banner
    doc.setFillColor(15, 118, 110); // Teal 700
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Left info
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(isLandscape ? 11.5 : 10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`USULAN PENGADAAN OBAT (${category.toUpperCase()})`, isLandscape ? 12 : 8, 8);

    doc.setFontSize(isLandscape ? 7.5 : 6.8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.namaApotek} | SIPA: ${settings.sipaNo || '-'}`, isLandscape ? 12 : 8, 14.5);
    doc.text(`Apoteker: ${settings.namaApoteker || '-'} | Tanggal: ${today}`, isLandscape ? 12 : 8, 20.5);

    // Center PBF Tujuan Order Box (BERADA DI TENGAH AGAR LANGSUNG TERLIHAT & MEMANFAATKAN TEMPAT KOSONG)
    const isPbfExplicitEmpty = !targetPbf || targetPbf.trim() === '' || targetPbf.trim() === '-';
    const targetPbfDisplay = isPbfExplicitEmpty ? '-' : targetPbf.trim().toUpperCase();
    const boxW = isLandscape ? 96 : 82;
    const boxH = 14;
    const boxX = (pageWidth - boxW) / 2;
    const boxY = 6;

    doc.setFillColor(19, 78, 74); // Dark Teal 800
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'F');
    doc.setDrawColor(94, 234, 212); // Teal 300 border
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'D');

    doc.setTextColor(204, 251, 241); // Teal 100
    doc.setFontSize(isLandscape ? 6.5 : 5.8);
    doc.setFont('helvetica', 'bold');
    doc.text('PBF TUJUAN ORDER (DISTRIBUTOR):', pageWidth / 2, boxY + 4.5, { align: 'center' });

    const pbfFontSize = targetPbfDisplay.length > 28
      ? (isLandscape ? 7 : 6.2)
      : targetPbfDisplay.length > 20
      ? (isLandscape ? 8 : 7)
      : (isLandscape ? 8.5 : 7.5);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(pbfFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(targetPbfDisplay, pageWidth / 2, boxY + 10.5, { align: 'center' });

    // Right meta info
    doc.setTextColor(204, 251, 241);
    doc.setFontSize(isLandscape ? 7 : 6.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Orientasi: ${orientation.toUpperCase()}`, pageWidth - (isLandscape ? 12 : 8), 11, { align: 'right' });
    doc.text(`A4 Standar Farmasi`, pageWidth - (isLandscape ? 12 : 8), 18, { align: 'right' });

    const validRows = rows.filter((r) => r.nama && (r.beli > 0 || r.minta > 0));
    let grandTotal = 0;

    const formatPrice2Dec = (val: number | undefined | null): string => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const tableData = validRows.map((r, i) => {
      const isPpn = r.includePpn !== false;
      const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
      const nettoHna = (r.hna || 0) - diskonRp;
      // Do not add 1.11 if includePpn is false (Harga Jadi / Non-PPN)
      const hargaJadi = r.hargaJadi && r.hargaJadi > 0 ? r.hargaJadi : (isPpn ? nettoHna * 1.11 : nettoHna);
      const subtotal = hargaJadi * (r.beli || 0);
      grandTotal += subtotal;

      const {
        effectiveHistHarga,
        effectiveTglBeli,
        effectivePbfTerakhir,
        isHistHargaEmpty,
      } = getEffectiveHistoryInfo(r, history, masterList, priceList);

      return [
        (i + 1).toString(),
        r.sku || '-',
        r.nama,
        r.pabrik || '-',
        r.kemasan || '-',
        !isHistHargaEmpty && effectiveHistHarga > 0 ? `Rp ${formatPrice2Dec(effectiveHistHarga)}` : '-',
        effectiveTglBeli,
        effectivePbfTerakhir,
        `${isPpn ? '' : '[HJ] '}Rp ${formatPrice2Dec(hargaJadi)}`,
        (r.stok !== undefined && r.stok !== '' ? r.stok : 0).toString(),
        (r.beli || 0).toString(),
        `Rp ${formatPrice2Dec(subtotal)}`,
      ];
    });

    if (isLandscape) {
      // Landscape table: 277mm width across 297mm page (margin left/right: 10mm)
      autoTable(doc, {
        head: [
          [
            'NO',
            'SKU',
            'NAMA OBAT',
            'PABRIK',
            'KEMASAN',
            'HIST. HARGA',
            'TGL BELI',
            'PBF TERAKHIR',
            'HARGA JADI',
            'STOK',
            'PESAN',
            'TOTAL HARGA',
          ],
        ],
        body: tableData,
        startY: 28,
        theme: 'grid',
        margin: { left: 10, right: 10, top: 28, bottom: 12 },
        headStyles: {
          fillColor: [19, 78, 74],
          textColor: 255,
          fontSize: 7.8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 1.8,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 22 },
          2: { cellWidth: 48, fontStyle: 'bold' },
          3: { cellWidth: 24 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 20 },
          7: { cellWidth: 26 },
          8: { halign: 'right', cellWidth: 24 },
          9: { halign: 'center', cellWidth: 14 },
          10: { halign: 'center', fontStyle: 'bold', cellWidth: 17 },
          11: { halign: 'right', fontStyle: 'bold', cellWidth: 34 },
        },
      });
    } else {
      // Portrait table: 194mm width across 210mm page (margin left/right: 8mm)
      autoTable(doc, {
        head: [
          [
            'NO',
            'SKU',
            'NAMA OBAT',
            'PABRIK',
            'KEMASAN',
            'HIST. HARGA',
            'TGL',
            'PBF TERAKHIR',
            'HARGA JADI',
            'STK',
            'ORD',
            'TOTAL',
          ],
        ],
        body: tableData,
        startY: 28,
        theme: 'grid',
        margin: { left: 8, right: 8, top: 28, bottom: 12 },
        headStyles: {
          fillColor: [19, 78, 74],
          textColor: 255,
          fontSize: 6.8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 6.2,
          cellPadding: 1.4,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 6 },
          1: { halign: 'center', cellWidth: 16 },
          2: { cellWidth: 33, fontStyle: 'bold' },
          3: { cellWidth: 16 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'right', cellWidth: 16 },
          6: { halign: 'center', cellWidth: 13 },
          7: { cellWidth: 18 },
          8: { halign: 'right', cellWidth: 17 },
          9: { halign: 'center', cellWidth: 8 },
          10: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
          11: { halign: 'right', fontStyle: 'bold', cellWidth: 29 },
        },
      });
    }

    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY || 140;
    const pageHeight = isLandscape ? 210 : 297;
    const requiredSpace = isLandscape ? 50 : 54;
    if (finalY + requiredSpace > pageHeight - 12) {
      doc.addPage();
      finalY = 16;
    }

    const codDiscountRp = grandTotal * (codDiscountPct / 100);
    const finalTotal = grandTotal - codDiscountRp;

    // Totals Box
    if (isLandscape) {
      doc.setFillColor(240, 253, 250); // Teal 50
      doc.roundedRect(174, finalY + 4, 113, 24, 2, 2, 'FD');

      doc.setTextColor(19, 78, 74);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal: Rp ${formatPrice2Dec(grandTotal)}`, 179, finalY + 10);
      doc.text(
        `Diskon COD (${codDiscountPct}%): -Rp ${formatPrice2Dec(codDiscountRp)}`,
        179,
        finalY + 16
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`TOTAL ESTIMASI: Rp ${formatPrice2Dec(finalTotal)}`, 179, finalY + 23);

      // Signatures
      const sigY = finalY + 33;
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.8);
      doc.setFont('helvetica', 'normal');

      doc.text('Dibuat oleh (Petugas Farmasi):', 20, sigY);
      doc.text('_______________________', 20, sigY + 16);

      doc.text('Mengetahui (Apoteker Penanggung Jawab):', 110, sigY);
      doc.text(`${settings.namaApoteker || 'apt. ........................'}`, 110, sigY + 16);
      doc.text(`SIPA: ${settings.sipaNo || '........................'}`, 110, sigY + 20);

      doc.text('Disetujui oleh (Pimpinan / Owner):', 205, sigY);
      doc.text('_______________________', 205, sigY + 16);
    } else {
      // Portrait Totals & Signatures
      doc.setFillColor(240, 253, 250); // Teal 50
      doc.roundedRect(107, finalY + 4, 95, 23, 2, 2, 'FD');

      doc.setTextColor(19, 78, 74);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal: Rp ${formatPrice2Dec(grandTotal)}`, 111, finalY + 9.5);
      doc.text(
        `Diskon COD (${codDiscountPct}%): -Rp ${formatPrice2Dec(codDiscountRp)}`,
        111,
        finalY + 15
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.text(`TOTAL: Rp ${formatPrice2Dec(finalTotal)}`, 111, finalY + 21.5);

      // Portrait Signatures
      const sigY = finalY + 31;
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');

      doc.text('Dibuat oleh:', 10, sigY);
      doc.text('___________________', 10, sigY + 15);
      doc.text('Petugas Pengadaan', 10, sigY + 19);

      doc.text('Mengetahui (APA):', 78, sigY);
      doc.text(`${settings.namaApoteker || 'apt. ........................'}`, 78, sigY + 15);
      doc.text(`SIPA: ${settings.sipaNo || '........................'}`, 78, sigY + 19);

      doc.text('Disetujui oleh:', 148, sigY);
      doc.text('___________________', 148, sigY + 15);
      doc.text('Pimpinan / Owner', 148, sigY + 19);
    }

    // Professional Page Numbering and Footer across all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = pageHeight - 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(isLandscape ? 10 : 8, footerY - 2.5, pageWidth - (isLandscape ? 10 : 8), footerY - 2.5);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${settings.namaApotek || 'Sarana Apotek'} • Dokumen Resmi Usulan Pengadaan (${category.toUpperCase()})`,
        isLandscape ? 10 : 8,
        footerY
      );
      doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - (isLandscape ? 10 : 8), footerY, { align: 'right' });
    }

    const pdfBlob = doc.output('blob');
    const fileName = `Dokumen_Usulan_${category.toUpperCase()}_${orientation}_${new Date().toISOString().split('T')[0]}.pdf`;
    const res = await this.saveBlobToInternalStorage(pdfBlob, fileName, 'Dokumen PDF (.pdf)', '.pdf');
    return { success: res.success, path: res.savedPath };
  },

  // Direct 2D Canvas Generator for Usulan Pembelian (100% Guaranteed Sharp, Full Width, Never Blank, Never Truncated)
  drawUsulanDocumentToCanvas(
    rows: DrugCalculationRow[],
    category: DrugCategory,
    settings: AppStateData['settings'],
    diskonCODPct: number,
    orientation: 'portrait' | 'landscape',
    targetPbf?: string,
    history?: PurchaseHistoryItem[],
    masterList?: MasterDrugItem[],
    priceList?: PriceOfferItem[]
  ): HTMLCanvasElement {
    const isLandscape = orientation === 'landscape';
    const canvas = document.createElement('canvas');
    const width = isLandscape ? 1600 : 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const rowHeight = 36;
    const headerHeight = 235;
    const totalsAndSigHeight = 240;
    const totalHeight = headerHeight + Math.max(rows.length, 1) * rowHeight + totalsAndSigHeight + 100;

    canvas.width = width;
    canvas.height = totalHeight;

    // 1. Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Padding
    const margin = 40;
    let y = 50;

    // 2. Pill Badge
    ctx.fillStyle = '#0f766e'; // Teal 700
    ctx.beginPath();
    ctx.roundRect(margin, y, 260, 32, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`USULAN PENGADAAN • ${category.toUpperCase()}`, margin + 16, y + 20);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DOKUMEN RESMI PENGADAAN', margin + 280, y + 20);

    y += 50;

    // 3. Kop Apotek
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(settings.namaApotek || 'APOTEK SEHAT SEJAHTERA', margin, y);

    y += 24;
    ctx.fillStyle = '#334155';
    ctx.font = '14px sans-serif';
    ctx.fillText(settings.alamatApotek || 'Jl. Farmasi Raya No. 88, Kota Farmasi', margin, y);

    y += 20;
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      `SIPA: ${settings.sipaNo || '-'}   •   Apoteker: ${settings.namaApoteker || '-'}   •   Telp: ${settings.teleponApotek || '-'}`,
      margin,
      y
    );

    y += 30;

    // 4. Meta Card
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(margin, y, width - margin * 2, 78, 8);
    ctx.fill();
    ctx.stroke();

    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Left info in Meta Card
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Tanggal Dokumen: ${todayStr}`, margin + 20, y + 25);
    ctx.fillText(`Kategori: ${category.toUpperCase()}   •   Format: ${isLandscape ? 'Landscape (A4 Lebar)' : 'Portrait (A4 Standar)'}`, margin + 20, y + 46);
    ctx.fillStyle = '#64748b';
    ctx.font = '11.5px sans-serif';
    ctx.fillText('Status: Dokumen Resmi Pengadaan', margin + 20, y + 65);

    // Center Card for PBF TUJUAN ORDER (BERADA DI TENGAH AGAR LANGSUNG TERLIHAT & MEMANFAATKAN TEMPAT KOSONG)
    const isPbfExplicitEmpty = !targetPbf || targetPbf.trim() === '' || targetPbf.trim() === '-';
    const targetPbfDisplay = isPbfExplicitEmpty ? '-' : targetPbf.trim().toUpperCase();
    const centerCardW = isLandscape ? 500 : 430;
    const centerCardH = 62;
    const centerCardX = margin + ((width - margin * 2) - centerCardW) / 2;
    const centerCardY = y + 8;

    ctx.fillStyle = '#f0fdfa'; // Teal 50
    ctx.strokeStyle = '#0d9488'; // Teal 600
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(centerCardX, centerCardY, centerCardW, centerCardH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f766e'; // Teal 700
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚚 PBF TUJUAN ORDER (DISTRIBUTOR)', centerCardX + centerCardW / 2, centerCardY + 19);

    let pbfFontSize = 14;
    ctx.font = `bold ${pbfFontSize}px sans-serif`;
    while (ctx.measureText(targetPbfDisplay).width > centerCardW - 24 && pbfFontSize > 9.5) {
      pbfFontSize -= 0.5;
      ctx.font = `bold ${pbfFontSize}px sans-serif`;
    }
    ctx.fillStyle = '#042f2e'; // Teal 950
    ctx.fillText(targetPbfDisplay, centerCardX + centerCardW / 2, centerCardY + 39);

    ctx.fillStyle = '#0d9488';
    ctx.font = '10px sans-serif';
    ctx.fillText(
      !isPbfExplicitEmpty ? 'Distributor Resmi Terpilih untuk Pengadaan Ini' : 'Pemesanan didistribusikan per baris PBF (Tanpa PBF Khusus)',
      centerCardX + centerCardW / 2,
      centerCardY + 53
    );

    // Right info in Meta Card
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Total Usulan: ${rows.length} Item`, width - margin - 20, y + 33);
    ctx.fillStyle = '#64748b';
    ctx.font = '11.5px sans-serif';
    ctx.fillText('Telah Diverifikasi Apoteker', width - margin - 20, y + 54);
    ctx.textAlign = 'left';

    y += 94;

    // 5. Table Layout (All 12 Columns explicitly defined)
    interface ColDef {
      name: string;
      w: number;
      align?: 'left' | 'center' | 'right';
    }

    const availableWidth = width - margin * 2;
    const cols: ColDef[] = isLandscape
      ? [
          { name: 'NO', w: 45, align: 'center' },
          { name: 'SKU', w: 105, align: 'left' },
          { name: 'NAMA OBAT', w: 260, align: 'left' },
          { name: 'PABRIK', w: 140, align: 'left' },
          { name: 'KEMASAN', w: 110, align: 'left' },
          { name: 'HIST. HARGA', w: 110, align: 'right' },
          { name: 'TGL BELI', w: 95, align: 'center' },
          { name: 'PBF TERAKHIR', w: 170, align: 'left' },
          { name: 'HARGA JADI', w: 120, align: 'right' },
          { name: 'STOK', w: 70, align: 'center' },
          { name: 'PESAN', w: 70, align: 'center' },
          { name: 'TOTAL HARGA', w: availableWidth - (45 + 105 + 260 + 140 + 110 + 110 + 95 + 170 + 120 + 70 + 70), align: 'right' },
        ]
      : [
          { name: 'NO', w: 35, align: 'center' },
          { name: 'SKU', w: 92, align: 'left' },
          { name: 'NAMA OBAT', w: 200, align: 'left' },
          { name: 'PABRIK', w: 95, align: 'left' },
          { name: 'KEMASAN', w: 78, align: 'left' },
          { name: 'HIST. HARGA', w: 88, align: 'right' },
          { name: 'TGL BELI', w: 72, align: 'center' },
          { name: 'PBF TERAKHIR', w: 92, align: 'left' },
          { name: 'HARGA JADI', w: 88, align: 'right' },
          { name: 'STOK', w: 45, align: 'center' },
          { name: 'PESAN', w: 45, align: 'center' },
          { name: 'TOTAL', w: availableWidth - (35 + 92 + 200 + 95 + 78 + 88 + 72 + 92 + 88 + 45 + 45), align: 'right' },
        ];

    // Table Header Background
    ctx.fillStyle = '#0f766e'; // Teal 700
    ctx.fillRect(margin, y, availableWidth, 34);

    let curX = margin;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';

    cols.forEach((col) => {
      let textX = curX + 8;
      if (col.align === 'center') textX = curX + col.w / 2;
      if (col.align === 'right') textX = curX + col.w - 8;
      ctx.textAlign = col.align || 'left';
      ctx.fillText(col.name, textX, y + 21);
      curX += col.w;
    });

    y += 34;

    // Table Rows
    let grandTotal = 0;
    ctx.font = '12px sans-serif';

    rows.forEach((row, idx) => {
      const isEven = idx % 2 === 0;
      ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
      ctx.fillRect(margin, y, availableWidth, rowHeight);

      // Border bottom
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, y + rowHeight);
      ctx.lineTo(margin + availableWidth, y + rowHeight);
      ctx.stroke();

      const isPpn = row.includePpn !== false;
      const diskonRp = (row.hna || 0) * ((row.diskonPct || 0) / 100);
      const nettoHna = (row.hna || 0) - diskonRp;
      const hargaJadi = row.hargaJadi && row.hargaJadi > 0 ? row.hargaJadi : (isPpn ? nettoHna * 1.11 : nettoHna);
      const subtotal = hargaJadi * (row.beli || 0);
      grandTotal += subtotal;

      const {
        effectiveHistHarga,
        effectiveTglBeli,
        effectivePbfTerakhir,
        isHistHargaEmpty,
      } = getEffectiveHistoryInfo(row, history, masterList, priceList);

      const pbfDisplay = effectivePbfTerakhir;
      const histHarga = effectiveHistHarga;
      const tglBeli = effectiveTglBeli;

      const formatPrice2Dec = (val: number | undefined | null): string => {
        if (val === undefined || val === null || isNaN(val)) return '0,00';
        return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      let cellX = margin;

      const cells = isLandscape
        ? [
            { text: String(idx + 1), align: 'center' },
            { text: row.sku || '-', align: 'left', color: '#0f766e', bold: true },
            { text: row.nama || '-', align: 'left', bold: true },
            { text: row.pabrik || '-', align: 'left' },
            { text: row.kemasan || '-', align: 'left' },
            { text: !isHistHargaEmpty && histHarga > 0 ? `Rp ${formatPrice2Dec(histHarga)}` : '-', align: 'right' },
            { text: tglBeli, align: 'center' },
            { text: pbfDisplay, align: 'left', color: '#0284c7' },
            { text: `${isPpn ? '' : '[HJ] '}Rp ${formatPrice2Dec(hargaJadi)}`, align: 'right' },
            { text: String(row.stok !== undefined && row.stok !== '' ? row.stok : 0), align: 'center' },
            { text: String(row.beli || 0), align: 'center', bold: true, color: '#0f766e' },
            { text: `Rp ${formatPrice2Dec(subtotal)}`, align: 'right', bold: true },
          ]
        : [
            { text: String(idx + 1), align: 'center' },
            { text: row.sku || '-', align: 'left', color: '#0f766e' },
            { text: row.nama || '-', align: 'left', bold: true },
            { text: row.pabrik || '-', align: 'left' },
            { text: row.kemasan || '-', align: 'left' },
            { text: histHarga > 0 ? `Rp ${formatPrice2Dec(histHarga)}` : '-', align: 'right' },
            { text: tglBeli, align: 'center' },
            { text: pbfDisplay, align: 'left' },
            { text: `${isPpn ? '' : '[HJ] '}Rp ${formatPrice2Dec(hargaJadi)}`, align: 'right' },
            { text: String(row.stok !== undefined && row.stok !== '' ? row.stok : 0), align: 'center' },
            { text: String(row.beli || 0), align: 'center', bold: true, color: '#0f766e' },
            { text: `Rp ${formatPrice2Dec(subtotal)}`, align: 'right', bold: true },
          ];

      cells.forEach((cell, cIdx) => {
        const colDef = cols[cIdx];
        ctx.fillStyle = cell.color || '#1e293b';
        ctx.textAlign = (cell.align as CanvasTextAlign) || 'left';

        let textX = cellX + 8;
        if (cell.align === 'center') textX = cellX + colDef.w / 2;
        if (cell.align === 'right') textX = cellX + colDef.w - 8;

        let displayText = cell.text;
        const maxTextWidth = colDef.w - 10;

        // CRITICAL: NEVER truncate numbers, totals, or prices with ellipsis ('…')!
        const isNumeric =
          colDef.name === 'TOTAL' ||
          colDef.name === 'TOTAL HARGA' ||
          colDef.name === 'HARGA JADI' ||
          colDef.name === 'HIST. HARGA' ||
          colDef.name === 'STOK' ||
          colDef.name === 'PESAN' ||
          colDef.name === 'NO' ||
          displayText.startsWith('Rp ');

        if (isNumeric) {
          let fontSize = cell.bold ? 12 : 11.5;
          ctx.font = `${cell.bold ? 'bold ' : ''}${fontSize}px sans-serif`;
          while (ctx.measureText(displayText).width > maxTextWidth && fontSize > 8.5) {
            fontSize -= 0.5;
            ctx.font = `${cell.bold ? 'bold ' : ''}${fontSize}px sans-serif`;
          }
        } else {
          ctx.font = cell.bold ? 'bold 12px sans-serif' : '12px sans-serif';
          // Truncate long descriptive text gracefully (nama obat, pabrik, etc.)
          if (ctx.measureText(displayText).width > maxTextWidth) {
            while (displayText.length > 3 && ctx.measureText(displayText + '…').width > maxTextWidth) {
              displayText = displayText.slice(0, -1);
            }
            displayText += '…';
          }
        }

        ctx.fillText(displayText, textX, y + 23);
        cellX += colDef.w;
      });

      y += rowHeight;
    });

    // Outer table border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, y - (rows.length * rowHeight + 34), availableWidth, rows.length * rowHeight + 34);

    y += 24;

    // 6. Totals Box
    const codDiscountRp = (grandTotal * diskonCODPct) / 100;
    const finalTotal = grandTotal - codDiscountRp;
    const boxWidth = isLandscape ? 400 : 360;
    const boxX = width - margin - boxWidth;

    ctx.fillStyle = '#f0fdfa';
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, y, boxWidth, 90, 8);
    ctx.fill();
    ctx.stroke();

    const formatPrice2Dec = (val: number | undefined | null): string => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    ctx.fillStyle = '#134e4a';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Subtotal (${rows.length} item):`, boxX + 16, y + 26);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatPrice2Dec(grandTotal)}`, boxX + boxWidth - 16, y + 26);

    ctx.fillStyle = '#0f766e';
    ctx.textAlign = 'left';
    ctx.fillText(`Diskon Tunai / COD (${diskonCODPct}%):`, boxX + 16, y + 48);
    ctx.textAlign = 'right';
    ctx.fillText(`- Rp ${formatPrice2Dec(codDiscountRp)}`, boxX + boxWidth - 16, y + 48);

    ctx.strokeStyle = '#ccfbf1';
    ctx.beginPath();
    ctx.moveTo(boxX + 16, y + 56);
    ctx.lineTo(boxX + boxWidth - 16, y + 56);
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL ESTIMASI:', boxX + 16, y + 78);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatPrice2Dec(finalTotal)}`, boxX + boxWidth - 16, y + 78);

    // 7. Signatures
    const sigY = y + 15;
    const sigColWidth = (boxX - margin - 40) / 2;

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    // Petugas Farmasi
    ctx.fillText('Dibuat oleh (Petugas Farmasi):', margin, sigY);
    ctx.fillText('_______________________________', margin, sigY + 50);

    // APA
    ctx.fillText('Mengetahui (APA):', margin + sigColWidth + 20, sigY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(settings.namaApoteker || 'apt. ........................', margin + sigColWidth + 20, sigY + 48);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`SIPA: ${settings.sipaNo || '........................'}`, margin + sigColWidth + 20, sigY + 64);

    return canvas;
  },

  // Export Usulan to PNG Image (with High-Precision Direct Canvas 2D Generator)
  async exportUsulanToPNG(
    element: HTMLElement | null,
    rows: DrugCalculationRow[],
    category: DrugCategory,
    settings: AppStateData['settings'],
    diskonCODPct: number,
    orientation: 'portrait' | 'landscape',
    suggestedName: string,
    targetPbf?: string,
    history?: PurchaseHistoryItem[],
    masterList?: MasterDrugItem[],
    priceList?: PriceOfferItem[]
  ): Promise<{ success: boolean; path: string }> {
    // 1. Guaranteed Canvas 2D Direct Generator (100% Reliable, Centered PBF, No Truncated Numbers, High DPI)
    try {
      const canvas = this.drawUsulanDocumentToCanvas(
        rows,
        category,
        settings,
        diskonCODPct,
        orientation,
        targetPbf,
        history,
        masterList,
        priceList
      );
      if (canvas && canvas.width > 200 && canvas.height > 200) {
        const dataUrl = canvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return await this.saveBlobToInternalStorage(blob, suggestedName, 'Gambar PNG (.png)', '.png');
      }
    } catch (canvasErr) {
      console.warn('Direct Canvas PNG export failed, falling back to DOM capture:', canvasErr);
    }

    // 2. Fallback: In-Place Expanded html2canvas on live DOM element if canvas fails
    if (element) {
      const originalWidth = element.style.width;
      const originalMinWidth = element.style.minWidth;
      const originalMaxWidth = element.style.maxWidth;
      const originalOverflow = element.style.overflow;

      const scrollContainers = Array.from(
        element.querySelectorAll<HTMLElement>('.overflow-x-auto, [class*="overflow-x-auto"]')
      );
      const originalScrollStyles = scrollContainers.map((sc) => ({
        el: sc,
        overflow: sc.style.overflow,
        overflowX: sc.style.overflowX,
        maxWidth: sc.style.maxWidth,
        width: sc.style.width,
      }));

      try {
        const table = element.querySelector('table');
        const targetWidth = Math.max(table ? table.scrollWidth + 60 : 0, orientation === 'landscape' ? 1300 : 1050);

        element.style.width = `${targetWidth}px`;
        element.style.minWidth = `${targetWidth}px`;
        element.style.maxWidth = 'none';
        element.style.overflow = 'visible';

        scrollContainers.forEach((sc) => {
          sc.style.overflow = 'visible';
          sc.style.overflowX = 'visible';
          sc.style.maxWidth = 'none';
          sc.style.width = '100%';
        });

        await new Promise((resolve) => setTimeout(resolve, 60));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (node) => node.classList?.contains('no-print'),
        });

        // Verify canvas has meaningful content
        if (canvas && canvas.width > 200 && canvas.height > 200) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const sample = ctx.getImageData(50, 50, 50, 50).data;
            const hasColor = Array.from(sample).some((val, idx) => idx % 4 !== 3 && val < 250); // Not purely white
            if (hasColor) {
              const dataUrl = canvas.toDataURL('image/png');
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              return await this.saveBlobToInternalStorage(blob, suggestedName, 'Gambar PNG (.png)', '.png');
            }
          }
        }
      } catch (domErr) {
        console.error('DOM html2canvas fallback also failed:', domErr);
      } finally {
        element.style.width = originalWidth;
        element.style.minWidth = originalMinWidth;
        element.style.maxWidth = originalMaxWidth;
        element.style.overflow = originalOverflow;
        originalScrollStyles.forEach((item) => {
          item.el.style.overflow = item.overflow;
          item.el.style.overflowX = item.overflowX;
          item.el.style.maxWidth = item.maxWidth;
          item.el.style.width = item.width;
        });
      }
    }

    return { success: false, path: '' };
  },

  // Export Generic HTML Element to PNG image (Resilient)
  async exportElementToPNG(element: HTMLElement, suggestedName: string): Promise<{ success: boolean; path: string }> {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (node) => node.classList?.contains('no-print'),
      });
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return await this.saveBlobToInternalStorage(blob, suggestedName, 'Gambar PNG (.png)', '.png');
    } catch (err) {
      console.error('exportElementToPNG failed:', err);
      return { success: false, path: '' };
    }
  },

  // Export Full JSON State Backup
  async exportAppStateToJSON(state: AppStateData): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `Backup_Apotek_Full_${today}.json`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Berkas Cadangan JSON (.json)', '.json');
    return { success: res.success, path: res.savedPath };
  },

  // Export Master List to Excel
  async exportMasterListToExcel(masterList: MasterDrugItem[]): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = masterList.map((m, i) => ({
      No: i + 1,
      'Kode SKU': m.sku || '-',
      'Nama Obat': m.nama,
      Kategori: m.kategori.toUpperCase(),
      Pabrik: m.pabrik || '-',
      Kemasan: m.kemasan || '-',
      'PBF Rekomendasi': m.pbf || '-',
      'HNA Terakhir (Rp)': Math.round(m.hna || 0),
      'HPP (+PPN 11%)': Math.round((m.hna || 0) * 1.11),
      'History Harga Terakhir': Math.round(m.historyHarga || 0),
      'Tanggal Pembelian': m.tanggal || '-',
      'Sisa Stok': m.stok || 0,
      'Stok Minimum': m.minStok || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Obat');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Master_Obat_SKU_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Price List to Excel
  async exportPriceListToExcel(priceList: PriceOfferItem[]): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = priceList.map((p, i) => ({
      No: i + 1,
      'Kode SKU': p.sku || '-',
      'Nama Obat': p.nama,
      'PBF / Supplier': p.pbf,
      'Stok PBF': p.stok || 0,
      'HNA Satuan (Rp)': Math.round(p.hna || 0),
      'Diskon (%)': p.diskon || 0,
      'HPP (+PPN 11%) (Rp)': Math.round(p.hpp || 0),
      'Tanggal Update': p.tglUpdate,
      Kontak: p.kontakPbf || '-',
      Catatan: p.catatan || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Harga PBF');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `List_Harga_PBF_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Purchase History to Excel
  async exportHistoryToExcel(history: PurchaseHistoryItem[]): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = history.map((h, i) => ({
      No: i + 1,
      'Tanggal Transaksi': h.tgl,
      'No. SP / Faktur': h.noSp || '-',
      Kategori: h.kategori.toUpperCase(),
      'Kode SKU': h.sku || '-',
      'Nama Obat': h.nama,
      'PBF / Supplier': h.pbf,
      'HNA Satuan (Rp)': Math.round(h.hna || 0),
      'Diskon (%)': h.diskon || 0,
      'HPP (+PPN 11%) (Rp)': Math.round(h.hpp || 0),
      'Jumlah Pesanan': h.qty || 0,
      'Total Pembayaran (Rp)': Math.round(h.total || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Pembelian');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Riwayat_Pembelian_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Defekta List to Excel
  async exportDefektaToExcel(defektaList: DefektaItem[]): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = defektaList.map((d, i) => ({
      No: i + 1,
      'Kode SKU': d.sku || '-',
      'Nama Obat': d.nama,
      Kategori: d.kategori.toUpperCase(),
      'Stok Saat Ini': d.stok,
      'Stok Minimum': d.minStok,
      Satuan: d.satuan || 'Box',
      'Pabrik / Produsen': d.pabrik || '-',
      'PBF Rekomendasi': d.pbf || '-',
      'Estimasi HNA (Rp)': Math.round(d.hna || 0),
      'Diskon (%)': d.diskon || 0,
      'Estimasi HPP (Rp)': Math.round(d.hpp || 0),
      'Jumlah Usulan Beli': d.jumlahUsul || (d.minStok > d.stok ? d.minStok * 2 - d.stok : 1),
      'Prioritas Order': d.prioritas.toUpperCase(),
      Status: d.stok <= 0 ? 'HABIS' : d.stok <= d.minStok ? 'MENIPIS' : 'AMAN',
      'Tanggal Dicatat': d.tglDicatat || today,
      Catatan: d.catatan || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Defekta Apotek');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Buku_Defekta_Apotek_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Export Defekta List to PDF
  async exportDefektaToPDF(
    defektaList: DefektaItem[],
    pharmacyInfo?: { namaApotek: string; alamatApotek: string; namaApoteker?: string; sipaNo?: string }
  ): Promise<{ success: boolean; path: string }> {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const todayFile = new Date().toISOString().split('T')[0];

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header Apotek
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(pharmacyInfo?.namaApotek || 'APOTEK SISTEM', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(pharmacyInfo?.alamatApotek || 'Aplikasi Manajemen Farmasi & Pengadaan Obat', 14, 20);

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose color
    doc.text('BUKU DEFEKTA / DAFTAR OBAT HABIS & MENIPIS', 14, 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Cetak: ${today}  |  Total Item: ${defektaList.length}`, 14, 33);

    // Table Data
    const tableData = defektaList.map((item, idx) => {
      const statusText = item.stok <= 0 ? 'HABIS' : item.stok <= item.minStok ? 'MENIPIS' : 'AMAN';
      const orderQty = item.jumlahUsul || (item.minStok > item.stok ? item.minStok * 2 - item.stok : 1);
      return [
        (idx + 1).toString(),
        item.nama,
        item.satuan || 'Box',
        item.stok.toString(),
        item.minStok.toString(),
        orderQty.toString(),
        item.pbf || '-',
        item.prioritas.toUpperCase(),
        statusText,
        item.catatan || '-',
      ];
    });

    autoTable(doc, {
      startY: 37,
      head: [['NO', 'NAMA OBAT', 'SATUAN', 'STOK', 'MIN', 'USUL BELI', 'PBF', 'PRIORITAS', 'STATUS', 'CATATAN']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 15, fontStyle: 'bold', textColor: [225, 29, 72] },
        6: { cellWidth: 26 },
        7: { halign: 'center', cellWidth: 16 },
        8: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        9: { cellWidth: 25 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = data.cell.raw;
          if (val === 'HABIS') {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'MENIPIS') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 180;
    if (finalY < 260) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text('Petugas Farmasi / Apoteker,', 140, finalY);
      doc.text('( _______________________ )', 140, finalY + 18);
      if (pharmacyInfo?.namaApoteker) {
        doc.setFont('helvetica', 'bold');
        doc.text(pharmacyInfo.namaApoteker, 140, finalY + 18);
      }
    }

    const pdfBlob = doc.output('blob');
    const fileName = `Buku_Defekta_Apotek_${todayFile}.pdf`;
    const res = await this.saveBlobToInternalStorage(pdfBlob, fileName, 'Dokumen PDF (.pdf)', '.pdf');
    return { success: res.success, path: res.savedPath };
  },

  // Export Data Profil Apotek to Excel
  async exportPharmacyProfilesToExcel(
    profiles: PharmacyProfile[],
    activeId: string
  ): Promise<{ success: boolean; path: string }> {
    const today = new Date().toISOString().split('T')[0];
    const data = profiles.map((p, i) => ({
      No: i + 1,
      'Status Profil': p.id === activeId ? 'SEDANG AKTIF' : 'Cadangan',
      'Nama Sarana Apotek': p.namaApotek,
      'Alamat Lengkap': p.alamatApotek || '-',
      'Kota / Wilayah': p.kota || '-',
      'Apoteker Pengelola (APA)': p.namaApoteker || '-',
      'Nomor SIPA': p.sipaNo || '-',
      'Nomor SIA (Izin)': p.siaNo || '-',
      'Telepon / WhatsApp': p.telepon || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 30 },
      { wch: 45 },
      { wch: 18 },
      { wch: 30 },
      { wch: 32 },
      { wch: 25 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Profil Apotek');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Data_Profil_Apotek_${today}.xlsx`;
    const res = await this.saveBlobToInternalStorage(blob, fileName, 'Lembar Kerja Excel (.xlsx)', '.xlsx');
    return { success: res.success, path: res.savedPath };
  },

  // Download Sample Template for Importing Pharmacy Profiles
  async downloadPharmacyTemplateExcel(): Promise<{ success: boolean; path: string }> {
    const templateData = [
      {
        'Nama Sarana Apotek': 'Apotek MERPATI MEDIKA',
        'Alamat Lengkap': 'Ruko Jalan Merpati, no 22 , Madiun',
        'Apoteker Pengelola (APA)': 'apt. Andany Oktamianingtyas Hartoyo S.Farm',
        'Nomor SIPA': 'NR35772605015742',
        'Nomor SIA (Izin)': '503/SIA/001/2023',
        'Telepon / WhatsApp': '0812-3456-7890',
        'Kota / Wilayah': 'Madiun',
      },
      {
        'Nama Sarana Apotek': 'Apotek Sami Sehat',
        'Alamat Lengkap': 'Jalan Gajahmada no 116c , Madiun',
        'Apoteker Pengelola (APA)': 'apt. Rosy Elok Chintiasari, S.Farm',
        'Nomor SIPA': '503.18/SIPA.1/0074/401.106/2022',
        'Nomor SIA (Izin)': '503/SIA/002/2022',
        'Telepon / WhatsApp': '0351-456789',
        'Kota / Wilayah': 'Madiun',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 40 },
      { wch: 36 },
      { wch: 32 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Profil Apotek');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const res = await this.saveBlobToInternalStorage(
      blob,
      'Template_Impor_Profil_Apotek.xlsx',
      'Lembar Kerja Excel (.xlsx)',
      '.xlsx'
    );
    return { success: res.success, path: res.savedPath };
  },

  // Export All Pharmacy Profiles to PDF
  async exportPharmacyProfilesToPDF(
    profiles: PharmacyProfile[],
    activeId: string
  ): Promise<{ success: boolean; path: string }> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 297;
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const todayFile = new Date().toISOString().split('T')[0];

    // Header Background Banner
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Accent line
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 23, pageWidth, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR LEGALITAS & PROFIL SARANA APOTEK', 14, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text(
      `Sistem Administrasi Farmasi • Tanggal Cetak: ${today} • Total Profil: ${profiles.length} Sarana Apotek`,
      14,
      18
    );

    const tableData = profiles.map((p, i) => {
      const isActive = p.id === activeId;
      return [
        (i + 1).toString(),
        isActive ? 'SEDANG AKTIF' : 'Cadangan',
        p.namaApotek,
        p.alamatApotek || '-',
        p.namaApoteker || '-',
        p.sipaNo || '-',
        p.siaNo || '-',
        p.telepon || '-',
      ];
    });

    autoTable(doc, {
      head: [
        [
          'NO',
          'STATUS',
          'NAMA SARANA APOTEK',
          'ALAMAT LENGKAP',
          'APOTEKER PENGELOLA (APA)',
          'NOMOR SIPA',
          'NOMOR SIA',
          'TELEPON / WA',
        ],
      ],
      body: tableData,
      startY: 29,
      theme: 'grid',
      headStyles: {
        fillColor: [67, 56, 202], // Indigo 700
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 60 },
        4: { cellWidth: 42 },
        5: { cellWidth: 38, fontStyle: 'bold' },
        6: { cellWidth: 30 },
        7: { cellWidth: 26 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = data.cell.raw;
          if (typeof val === 'string' && val.includes('AKTIF')) {
            data.cell.styles.textColor = [5, 150, 105]; // Emerald
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 165;
    if (finalY < 185) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`Dicetak pada: ${today}`, 14, finalY);
      doc.text('Apoteker Penanggung Jawab,', 220, finalY);
      doc.text('( ____________________________ )', 220, finalY + 18);
    }

    const pdfBlob = doc.output('blob');
    const fileName = `Daftar_Profil_Apotek_${todayFile}.pdf`;
    const res = await this.saveBlobToInternalStorage(pdfBlob, fileName, 'Dokumen PDF (.pdf)', '.pdf');
    return { success: res.success, path: res.savedPath };
  },

  // Export Single Pharmacy Identity Card / Surat Keterangan to PDF
  async exportSinglePharmacyToPDF(
    profile: PharmacyProfile,
    isCurrentActive: boolean
  ): Promise<{ success: boolean; path: string }> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const todayFile = new Date().toISOString().split('T')[0];

    // Official Letterhead / Kop Apotek
    doc.setFillColor(67, 56, 202); // Indigo 700
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.namaApotek.toUpperCase(), 15, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.alamatApotek || '-', 15, 21);
    doc.text(
      `Telp: ${profile.telepon || '-'}   •   SIA: ${profile.siaNo || '-'}`,
      15,
      27
    );

    // Subheader Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 38, 180, 22, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('KARTU IDENTITAS & LEGALITAS SARANA APOTEK', 20, 46);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Status: ${isCurrentActive ? 'PROFIL AKTIF UTAMA' : 'PROFIL CADANGAN'}  |  Dokumen Resmi Administrasi Farmasi`,
      20,
      54
    );

    // Detail Table
    const details = [
      ['Nama Sarana Apotek', profile.namaApotek],
      ['Alamat Lengkap', profile.alamatApotek || '-'],
      ['Kota / Wilayah', profile.kota || '-'],
      ['Apoteker Pengelola Apotek (APA)', profile.namaApoteker || '-'],
      ['Nomor SIPA', profile.sipaNo || '-'],
      ['Nomor Izin Apotek (SIA)', profile.siaNo || '-'],
      ['Kontak Telepon / WhatsApp', profile.telepon || '-'],
      ['Status Penggunaan', isCurrentActive ? 'Aktif digunakan pada Kop Surat Pesanan (SP) & Perhitungan' : 'Tersimpan'],
      ['Tanggal Cetak Dokumen', today],
    ];

    autoTable(doc, {
      body: details,
      startY: 66,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: 'bold', textColor: [51, 65, 85] },
        1: { cellWidth: 115, textColor: [15, 23, 42] },
      },
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 22 : 170;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text('Mengetahui,', 130, finalY);
    doc.text('Apoteker Pengelola Apotek (APA)', 130, finalY + 5);
    doc.text(`( ${profile.namaApoteker || '________________________'} )`, 130, finalY + 28);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`SIPA: ${profile.sipaNo || '-'}`, 130, finalY + 33);

    const pdfBlob = doc.output('blob');
    const safeName = profile.namaApotek.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Identitas_${safeName}_${todayFile}.pdf`;
    const res = await this.saveBlobToInternalStorage(pdfBlob, fileName, 'Dokumen PDF (.pdf)', '.pdf');
    return { success: res.success, path: res.savedPath };
  },
};
