import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Download,
  Upload,
  FileText,
  Trash2,
  Edit2,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Filter,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  Building,
  Calendar,
  Zap,
  Info,
} from 'lucide-react';
import { DefektaItem, DrugCategory, MasterDrugItem, PharmacyProfile, SupplierItem } from '../../types';
import { FileSystemManager } from '../../utils/fileSystem';
import { generateSKU } from '../../utils/db';

interface DefektaViewProps {
  defektaList: DefektaItem[];
  masterList: MasterDrugItem[];
  suppliers: SupplierItem[];
  pharmacyProfile?: PharmacyProfile;
  onAddDefektaItem: (item: DefektaItem) => void;
  onAddMultipleDefektaItems: (items: DefektaItem[]) => void;
  onUpdateDefektaItem: (item: DefektaItem) => void;
  onDeleteDefektaItem: (id: string) => void;
  onResetDefektaList: () => void;
  onTransferToTransaction: (items: DefektaItem[]) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
}

export const DefektaView: React.FC<DefektaViewProps> = ({
  defektaList,
  masterList,
  suppliers,
  pharmacyProfile,
  onAddDefektaItem,
  onAddMultipleDefektaItems,
  onUpdateDefektaItem,
  onDeleteDefektaItem,
  onResetDefektaList,
  onTransferToTransaction,
  showToast,
  openConfirmDialog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'habis' | 'menipis' | 'aman'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DefektaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form inputs
  const [formNama, setFormNama] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formKategori, setFormKategori] = useState<DrugCategory>('reguler');
  const [formStok, setFormStok] = useState<number>(0);
  const [formMinStok, setFormMinStok] = useState<number>(5);
  const [formSatuan, setFormSatuan] = useState('Box');
  const [formPabrik, setFormPabrik] = useState('');
  const [formPbf, setFormPbf] = useState('');
  const [formHna, setFormHna] = useState<number>(0);
  const [formDiskon, setFormDiskon] = useState<number>(0);
  const [formJumlahUsul, setFormJumlahUsul] = useState<number>(10);
  const [formPrioritas, setFormPrioritas] = useState<'cito' | 'urgent' | 'rutin'>('urgent');
  const [formCatatan, setFormCatatan] = useState('');

  // Summary Metrics
  const habisCount = defektaList.filter((d) => d.stok <= 0).length;
  const menipisCount = defektaList.filter((d) => d.stok > 0 && d.stok <= d.minStok).length;
  const totalEstimasiOrder = defektaList.reduce((acc, cur) => {
    const diskonRp = (cur.hna || 0) * ((cur.diskon || 0) / 100);
    const hpp = ((cur.hna || 0) - diskonRp) * 1.11;
    const qty = cur.jumlahUsul || (cur.minStok > cur.stok ? cur.minStok * 2 - cur.stok : 1);
    return acc + hpp * qty;
  }, 0);

  // Filtered List
  const filteredList = defektaList.filter((item) => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.nama.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.pbf && item.pbf.toLowerCase().includes(q)) ||
      (item.pabrik && item.pabrik.toLowerCase().includes(q));

    if (!matchSearch) return false;

    // Status filter
    if (filterStatus === 'habis' && item.stok > 0) return false;
    if (filterStatus === 'menipis' && (item.stok <= 0 || item.stok > item.minStok)) return false;
    if (filterStatus === 'aman' && item.stok <= item.minStok) return false;

    // Category filter
    if (filterCategory !== 'all' && item.kategori !== filterCategory) return false;

    // Priority filter
    if (filterPriority !== 'all' && item.prioritas !== filterPriority) return false;

    return true;
  });

  // Open Modal Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormNama('');
    setFormSku(generateSKU('reguler', ''));
    setFormKategori('reguler');
    setFormStok(0);
    setFormMinStok(5);
    setFormSatuan('Box');
    setFormPabrik('');
    setFormPbf('');
    setFormHna(0);
    setFormDiskon(0);
    setFormJumlahUsul(10);
    setFormPrioritas('urgent');
    setFormCatatan('');
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (item: DefektaItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormSku(item.sku);
    setFormKategori(item.kategori);
    setFormStok(item.stok);
    setFormMinStok(item.minStok);
    setFormSatuan(item.satuan || 'Box');
    setFormPabrik(item.pabrik || '');
    setFormPbf(item.pbf || '');
    setFormHna(item.hna || 0);
    setFormDiskon(item.diskon || 0);
    setFormJumlahUsul(item.jumlahUsul || 10);
    setFormPrioritas(item.prioritas);
    setFormCatatan(item.catatan || '');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      showToast('Nama obat tidak boleh kosong', 'warning');
      return;
    }

    const diskonRp = formHna * (formDiskon / 100);
    const calculatedHpp = Math.round((formHna - diskonRp) * 1.11);

    const itemData: DefektaItem = {
      id: editingItem ? editingItem.id : `defekta_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sku: formSku.trim() || generateSKU(formKategori, formNama),
      nama: formNama.trim(),
      kategori: formKategori,
      stok: Number(formStok),
      minStok: Number(formMinStok),
      satuan: formSatuan.trim() || 'Box',
      pabrik: formPabrik.trim(),
      pbf: formPbf.trim(),
      hna: Number(formHna),
      diskon: Number(formDiskon),
      hpp: calculatedHpp,
      jumlahUsul: Number(formJumlahUsul) || (Number(formMinStok) > Number(formStok) ? Number(formMinStok) * 2 - Number(formStok) : 1),
      prioritas: formPrioritas,
      status: Number(formStok) <= 0 ? 'habis' : Number(formStok) <= Number(formMinStok) ? 'menipis' : 'aman',
      catatan: formCatatan.trim(),
      tglDicatat: editingItem ? editingItem.tglDicatat : new Date().toISOString().split('T')[0],
    };

    if (editingItem) {
      onUpdateDefektaItem(itemData);
      showToast(`Obat ${itemData.nama} berhasil diperbarui di Defekta.`, 'success');
    } else {
      onAddDefektaItem(itemData);
      showToast(`Obat ${itemData.nama} berhasil ditambahkan ke Defekta.`, 'success');
    }

    setIsModalOpen(false);
  };

  // Sync from Master Drugs
  const handleSyncFromMaster = () => {
    const lowStockFromMaster = masterList.filter((m) => {
      const min = m.minStok !== undefined && m.minStok !== null ? m.minStok : 5;
      return (m.stok || 0) <= min;
    });

    if (lowStockFromMaster.length === 0) {
      showToast('Tidak ada obat di Master Obat dengan stok menipis / habis.', 'info');
      return;
    }

    let addedCount = 0;
    const newItems: DefektaItem[] = [];

    lowStockFromMaster.forEach((m) => {
      const exists = defektaList.some((d) => d.sku === m.sku || d.nama.toLowerCase() === m.nama.toLowerCase());
      if (!exists) {
        const minStok = m.minStok || 5;
        const currentStok = m.stok || 0;
        const usulBeli = minStok > currentStok ? minStok * 2 - currentStok : 5;
        const hna = m.hna || 0;
        const hpp = Math.round(hna * 1.11);

        newItems.push({
          id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sku: m.sku || generateSKU(m.kategori, m.nama),
          nama: m.nama,
          kategori: m.kategori,
          stok: currentStok,
          minStok: minStok,
          satuan: m.kemasan || m.satuan || 'Box',
          pabrik: m.pabrik || '',
          pbf: m.pbf || '',
          hna: hna,
          diskon: 0,
          hpp: hpp,
          jumlahUsul: usulBeli,
          prioritas: currentStok <= 0 ? 'cito' : 'urgent',
          status: currentStok <= 0 ? 'habis' : 'menipis',
          catatan: 'Sinkronisasi Otomatis dari Master Obat',
          tglDicatat: new Date().toISOString().split('T')[0],
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      onAddMultipleDefektaItems(newItems);
      showToast(`Berhasil menambahkan ${addedCount} obat stok habis/menipis dari Master Obat ke Defekta.`, 'success');
    } else {
      showToast('Semua obat stok menipis di Master Obat sudah ada di buku Defekta.', 'info');
    }
  };

  // Toggle Selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(filteredList.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const targetItems = selectedIds.length > 0 ? defektaList.filter((d) => selectedIds.includes(d.id)) : defektaList;
    if (targetItems.length === 0) {
      showToast('Tidak ada data defekta untuk diekspor.', 'warning');
      return;
    }
    const res = await FileSystemManager.exportDefektaToExcel(targetItems);
    if (res.success) {
      showToast(`Buku Defekta (${targetItems.length} item) berhasil diekspor ke Excel.`, 'success');
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    const targetItems = selectedIds.length > 0 ? defektaList.filter((d) => selectedIds.includes(d.id)) : defektaList;
    if (targetItems.length === 0) {
      showToast('Tidak ada data defekta untuk dicetak PDF.', 'warning');
      return;
    }
    const res = await FileSystemManager.exportDefektaToPDF(targetItems, pharmacyProfile);
    if (res.success) {
      showToast(`Buku Defekta (${targetItems.length} item) berhasil diekspor ke PDF siap cetak.`, 'success');
    }
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          showToast('Berkas Excel kosong atau format tidak sesuai.', 'warning');
          return;
        }

        const importedItems: DefektaItem[] = [];
        rawData.forEach((row) => {
          const nama = row['Nama Obat'] || row['nama'] || row['NAMA OBAT'] || row['Nama'] || '';
          if (!nama) return;

          const stok = parseInt(row['Stok Saat Ini'] || row['stok'] || row['STOK'] || '0', 10) || 0;
          const minStok = parseInt(row['Stok Minimum'] || row['minStok'] || row['MIN STOK'] || '5', 10) || 5;
          const satuan = row['Satuan'] || row['satuan'] || 'Box';
          const pabrik = row['Pabrik / Produsen'] || row['pabrik'] || '';
          const pbf = row['PBF Rekomendasi'] || row['pbf'] || row['PBF'] || '';
          const hna = parseFloat(row['Estimasi HNA (Rp)'] || row['hna'] || '0') || 0;
          const diskon = parseFloat(row['Diskon (%)'] || row['diskon'] || '0') || 0;
          const jumlahUsul = parseInt(row['Jumlah Usulan Beli'] || row['jumlahUsul'] || '0', 10) || (minStok > stok ? minStok * 2 - stok : 5);
          const rawCat = (row['Kategori'] || row['kategori'] || 'reguler').toLowerCase();
          const kategori: DrugCategory = ['reguler', 'oot', 'prekursor', 'psikotropika', 'narkotika'].includes(rawCat)
            ? (rawCat as DrugCategory)
            : 'reguler';

          const diskonRp = hna * (diskon / 100);
          const hpp = Math.round((hna - diskonRp) * 1.11);

          importedItems.push({
            id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sku: row['Kode SKU'] || row['sku'] || generateSKU(kategori, nama),
            nama,
            kategori,
            stok,
            minStok,
            satuan,
            pabrik,
            pbf,
            hna,
            diskon,
            hpp,
            jumlahUsul,
            prioritas: stok <= 0 ? 'cito' : 'urgent',
            status: stok <= 0 ? 'habis' : stok <= minStok ? 'menipis' : 'aman',
            catatan: row['Catatan'] || 'Impor Excel Defekta',
            tglDicatat: new Date().toISOString().split('T')[0],
          });
        });

        if (importedItems.length > 0) {
          onAddMultipleDefektaItems(importedItems);
          showToast(`Berhasil mengimpor ${importedItems.length} item obat ke buku Defekta!`, 'success');
        } else {
          showToast('Tidak ada kolom obat yang dikenali dalam berkas Excel.', 'warning');
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Gagal memproses berkas Excel.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Transfer selected items to calculation sheet
  const handleTransferSelected = () => {
    const itemsToTransfer = selectedIds.length > 0
      ? defektaList.filter((d) => selectedIds.includes(d.id))
      : filteredList;

    if (itemsToTransfer.length === 0) {
      showToast('Pilih setidaknya 1 item defekta untuk dimasukkan ke rencana belanja/transaksi.', 'warning');
      return;
    }

    onTransferToTransaction(itemsToTransfer);
    showToast(
      `Berhasil memasukkan ${itemsToTransfer.length} obat defekta ke lembar perhitungan transaksi!`,
      'success',
      'Silakan cek tab Transaksi untuk memfinalisasi pesanan SP.'
    );
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. TOP STATS CARDS & NOTIFICATION BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Defekta */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Item Defekta</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{defektaList.length}</h3>
            <span className="text-[11px] text-indigo-300">Daftar obat yang perlu order</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Stok Habis (Red/Rose Alert) */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-900/80 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-rose-950/20">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-rose-300 font-semibold">Stok Habis (0)</p>
              {habisCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <h3 className="text-2xl font-black text-rose-400 mt-0.5">{habisCount}</h3>
            <span className="text-[11px] text-rose-300/80 font-medium">Prioritas CITO / Segera Order</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Stok Menipis (Amber/Yellow Alert) */}
        <div className="bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-950/20">
          <div>
            <p className="text-xs text-amber-300 font-semibold">Stok Menipis (&le; Min)</p>
            <h3 className="text-2xl font-black text-amber-400 mt-0.5">{menipisCount}</h3>
            <span className="text-[11px] text-amber-300/80 font-medium">Mendekati batas buffer</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Estimasi Kebutuhan Biaya */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs text-slate-400 font-medium">Estimasi Biaya Pengadaan</p>
            <h3 className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              Rp {Math.round(totalEstimasiOrder).toLocaleString('id-ID')}
            </h3>
            <span className="text-[11px] text-slate-400">Total usulan rencana beli</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. ACTION CONTROLS & SEARCH BAR */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Action Buttons Left */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/30 border border-rose-400/30 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Obat Defekta</span>
            </button>

            <button
              onClick={handleSyncFromMaster}
              title="Periksa dan masukkan semua obat di Master yang stoknya kosong atau di bawah batas minimum"
              className="px-3.5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <span>Sinkron dari Master Obat</span>
            </button>

            <button
              onClick={handleTransferSelected}
              disabled={defektaList.length === 0}
              className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>Masukkan ke Perhitungan Transaksi</span>
            </button>
          </div>

          {/* Action Buttons Right (Export/Import) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Ekspor daftar defekta ke Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Cetak Buku Defekta ke PDF formal"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>PDF Siap Cetak</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Impor dari berkas Excel"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Impor Excel</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {defektaList.length > 0 && (
              <button
                onClick={() =>
                  openConfirmDialog(
                    'Reset Buku Defekta',
                    'Apakah Anda yakin ingin mengosongkan seluruh daftar obat di buku defekta?',
                    onResetDefektaList
                  )
                }
                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
                title="Kosongkan buku defekta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obat defekta (nama, SKU, PBF, pabrik)..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-hidden"
            />
          </div>

          {/* Status Quick Pills */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({defektaList.length})
            </button>
            <button
              onClick={() => setFilterStatus('habis')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'habis' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Habis ({habisCount})
            </button>
            <button
              onClick={() => setFilterStatus('menipis')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'menipis' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Menipis ({menipisCount})
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-indigo-400 focus:outline-hidden cursor-pointer"
          >
            <option value="all" className="bg-slate-900 text-white">Semua Kategori</option>
            <option value="reguler" className="bg-slate-900 text-white">Reguler</option>
            <option value="oot" className="bg-slate-900 text-white">OOT</option>
            <option value="prekursor" className="bg-slate-900 text-white">Prekursor</option>
            <option value="psikotropika" className="bg-slate-900 text-white">Psikotropika</option>
            <option value="narkotika" className="bg-slate-900 text-white">Narkotika</option>
          </select>
        </div>
      </div>

      {/* 3. TABLE OF DEFEKTA ITEMS */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {/* Batch Selection Banner if active */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-4 py-2 flex items-center justify-between text-xs">
            <span className="text-indigo-200">
              <strong className="text-white">{selectedIds.length}</strong> obat dipilih dari daftar.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTransferSelected}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
              >
                Pindahkan ke Transaksi
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950/80 text-slate-300 font-semibold border-b border-white/10">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 text-center w-10">NO</th>
                <th className="p-3 min-w-[200px]">NAMA OBAT & KODE SKU</th>
                <th className="p-3 min-w-[90px] text-center">STATUS STOK</th>
                <th className="p-3 min-w-[80px] text-center">STOK SAAT INI</th>
                <th className="p-3 min-w-[80px] text-center">MIN STOK</th>
                <th className="p-3 min-w-[90px] text-center">USULAN BELI</th>
                <th className="p-3 min-w-[80px]">SATUAN</th>
                <th className="p-3 min-w-[120px]">PBF LANGGANAN</th>
                <th className="p-3 min-w-[110px] text-right">EST. HPP (+PPN)</th>
                <th className="p-3 min-w-[90px] text-center">PRIORITAS</th>
                <th className="p-3 text-center w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="font-semibold text-sm text-slate-300">Tidak ada data obat di buku Defekta</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Semua stok obat dalam kondisi aman, atau klik "Tambah Obat Defekta" / "Sinkron dari Master Obat" untuk mencatat obat yang perlu dipesan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isHabis = item.stok <= 0;
                  const isMenipis = item.stok > 0 && item.stok <= item.minStok;
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isSelected ? 'bg-indigo-500/[0.05]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="p-3 text-center text-slate-500 font-mono font-bold">{idx + 1}</td>

                      {/* Nama Obat & SKU */}
                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{item.nama}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-indigo-300">{item.sku}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-white/5 border border-white/10 rounded text-slate-400">
                            {item.kategori}
                          </span>
                        </div>
                      </td>

                      {/* Status Stok */}
                      <td className="p-3 text-center">
                        {isHabis ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            HABIS
                          </span>
                        ) : isMenipis ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            MENIPIS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            AMAN
                          </span>
                        )}
                      </td>

                      {/* Stok Saat Ini (Inline editable) */}
                      <td className="p-3 text-center font-mono">
                        <input
                          type="number"
                          min="0"
                          value={item.stok}
                          onChange={(e) => {
                            const newStok = parseInt(e.target.value, 10) || 0;
                            onUpdateDefektaItem({
                              ...item,
                              stok: newStok,
                              status: newStok <= 0 ? 'habis' : newStok <= item.minStok ? 'menipis' : 'aman',
                            });
                          }}
                          className={`w-14 mx-auto px-1 py-1 rounded-lg text-center font-bold text-xs border focus:outline-hidden ${
                            isHabis
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : isMenipis
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-white/5 border-white/10 text-slate-200'
                          }`}
                        />
                      </td>

                      {/* Min Stok */}
                      <td className="p-3 text-center font-mono text-slate-400">
                        <input
                          type="number"
                          min="0"
                          value={item.minStok}
                          onChange={(e) => {
                            const newMin = parseInt(e.target.value, 10) || 0;
                            onUpdateDefektaItem({
                              ...item,
                              minStok: newMin,
                              status: item.stok <= 0 ? 'habis' : item.stok <= newMin ? 'menipis' : 'aman',
                            });
                          }}
                          className="w-14 mx-auto px-1 py-1 bg-white/5 border border-white/10 rounded-lg text-center text-slate-300 text-xs focus:border-indigo-400 focus:outline-hidden"
                        />
                      </td>

                      {/* Usulan Beli */}
                      <td className="p-3 text-center font-mono">
                        <input
                          type="number"
                          min="1"
                          value={item.jumlahUsul || 1}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value, 10) || 1;
                            onUpdateDefektaItem({ ...item, jumlahUsul: newQty });
                          }}
                          className="w-14 mx-auto px-1 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center font-extrabold text-emerald-300 text-xs focus:border-emerald-400 focus:outline-hidden"
                        />
                      </td>

                      {/* Satuan */}
                      <td className="p-3 text-slate-300 font-semibold">{item.satuan || 'Box'}</td>

                      {/* PBF */}
                      <td className="p-3 text-indigo-300 truncate max-w-[140px]">{item.pbf || '-'}</td>

                      {/* HPP */}
                      <td className="p-3 text-right font-mono font-bold text-slate-200">
                        Rp {Math.round(item.hpp || (item.hna || 0) * 1.11).toLocaleString('id-ID')}
                      </td>

                      {/* Prioritas */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            item.prioritas === 'cito'
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                              : item.prioritas === 'urgent'
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                          }`}
                        >
                          {item.prioritas}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                            title="Ubah data obat defekta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteDefektaItem(item.id)}
                            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Hapus dari buku defekta"
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

      {/* 4. MODAL DIALOG TAMBAH / UBAH OBAT DEFEKTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>{editingItem ? 'Ubah Obat Defekta' : 'Tambah Obat ke Buku Defekta'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              {/* Nama Obat */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Obat & Dosis *</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Misal: Paracetamol 500mg, Amoxicillin 500mg"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold focus:border-indigo-400 focus:outline-hidden"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori Obat</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as DrugCategory)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-hidden cursor-pointer"
                  >
                    <option value="reguler" className="bg-slate-900">Reguler</option>
                    <option value="oot" className="bg-slate-900">OOT</option>
                    <option value="prekursor" className="bg-slate-900">Prekursor</option>
                    <option value="psikotropika" className="bg-slate-900">Psikotropika</option>
                    <option value="narkotika" className="bg-slate-900">Narkotika</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="Box, Strip, Botol, Tube, Vial, Pcs"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Stok Saat Ini & Min Stok */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-rose-300">Stok Sekarang</label>
                  <input
                    type="number"
                    min="0"
                    value={formStok}
                    onChange={(e) => setFormStok(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-bold font-mono focus:border-rose-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batas Min Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinStok}
                    onChange={(e) => setFormMinStok(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 font-mono focus:border-indigo-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-emerald-300">Usul Beli</label>
                  <input
                    type="number"
                    min="1"
                    value={formJumlahUsul}
                    onChange={(e) => setFormJumlahUsul(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold font-mono focus:border-emerald-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* PBF & Prioritas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Distributor / PBF</label>
                  <input
                    type="text"
                    value={formPbf}
                    onChange={(e) => setFormPbf(e.target.value)}
                    placeholder="Contoh: PT. Enseval / PT. APL"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prioritas Pesanan</label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-hidden cursor-pointer"
                  >
                    <option value="cito" className="bg-slate-900">CITO (Sangat Mendesak)</option>
                    <option value="urgent" className="bg-slate-900">Urgent / Penting</option>
                    <option value="rutin" className="bg-slate-900">Rutin</option>
                  </select>
                </div>
              </div>

              {/* Estimasi Harga HNA & Diskon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estimasi HNA Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formHna}
                    onChange={(e) => setFormHna(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 14000"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estimasi Diskon (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formDiskon}
                    onChange={(e) => setFormDiskon(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 5"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Defekta</label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Misal: Pasien langganan menunggu, segera order hari ini"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer"
                >
                  Simpan ke Defekta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
