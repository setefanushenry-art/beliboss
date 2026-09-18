import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  ClipboardList,
  Plus,
  Search,
  Download,
  Upload,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Sparkles,
  Package,
  Store,
  Check,
  X,
  Copy,
  ChevronRight,
  Send,
  Zap,
  Tag,
  Share2,
} from 'lucide-react';
import {
  DrugCategory,
  MasterDrugItem,
  PharmacyProfile,
  SupplierItem,
  UsulanObatItem,
  PriceOfferItem,
} from '../../types';
import {
  findBestPriceForDrug,
  getDrugSuggestionsWithBestPrice,
  DrugSuggestionItem,
} from '../../utils/bestPriceHelper';
import { PbfAutocompleteInput } from '../Common/PbfAutocompleteInput';

interface UsulanObatViewProps {
  usulanList: UsulanObatItem[];
  outletsList: string[];
  pharmacyProfiles: PharmacyProfile[];
  suppliers: SupplierItem[];
  masterList: MasterDrugItem[];
  priceList?: PriceOfferItem[];
  settings: {
    namaApotek: string;
    alamatApotek: string;
    sipaNo: string;
    namaApoteker: string;
  };
  onAddUsulan: (item: UsulanObatItem) => void;
  onAddMultipleUsulan?: (items: UsulanObatItem[]) => void;
  onUpdateUsulan: (item: UsulanObatItem) => void;
  onDeleteUsulan: (id: string) => void;
  onAddOutlet: (namaOutlet: string) => void;
  onDeleteOutlet?: (namaOutlet: string, reassignToOutlet?: string) => void;
  onTransferToTransaction: (items: UsulanObatItem[]) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
}

export const UsulanObatView: React.FC<UsulanObatViewProps> = ({
  usulanList = [],
  outletsList = [],
  pharmacyProfiles = [],
  suppliers = [],
  masterList = [],
  priceList = [],
  settings,
  onAddUsulan,
  onAddMultipleUsulan,
  onUpdateUsulan,
  onDeleteUsulan,
  onAddOutlet,
  onDeleteOutlet,
  onTransferToTransaction,
  showToast,
  openConfirmDialog,
}) => {
  // Filters
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'menunggu' | 'disetujui' | 'dipesan' | 'selesai'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'cito' | 'urgent' | 'rutin'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | DrugCategory>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Quick Add Row State (Top Bar)
  const [quickNama, setQuickNama] = useState('');
  const [quickOutlet, setQuickOutlet] = useState(outletsList[0] || 'Apotek Utama');
  const [quickJumlah, setQuickJumlah] = useState<number>(5);
  const [quickSatuan, setQuickSatuan] = useState('Box');
  const [quickKategori, setQuickKategori] = useState<DrugCategory>('reguler');
  const [quickPrioritas, setQuickPrioritas] = useState<'cito' | 'urgent' | 'rutin'>('rutin');
  const [quickPemohon, setQuickPemohon] = useState('');
  const [quickCatatan, setQuickCatatan] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UsulanObatItem | null>(null);
  const [isAddOutletModalOpen, setIsAddOutletModalOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full Modal Form State
  const [formNama, setFormNama] = useState('');
  const [formOutlet, setFormOutlet] = useState('');
  const [formJumlah, setFormJumlah] = useState<number>(10);
  const [formSatuan, setFormSatuan] = useState('Box');
  const [formKategori, setFormKategori] = useState<DrugCategory>('reguler');
  const [formPrioritas, setFormPrioritas] = useState<'cito' | 'urgent' | 'rutin'>('rutin');
  const [formStatus, setFormStatus] = useState<'menunggu' | 'disetujui' | 'dipesan' | 'selesai'>('menunggu');
  const [formPemohon, setFormPemohon] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formPabrik, setFormPabrik] = useState('');
  const [formPbf, setFormPbf] = useState('');
  const [formHna, setFormHna] = useState<number>(0);

  // Autocomplete & Autosearch state for Quick Add
  const [quickSearchActive, setQuickSearchActive] = useState(false);
  const quickSuggestions: DrugSuggestionItem[] =
    quickNama.trim().length > 1
      ? getDrugSuggestionsWithBestPrice(quickNama, masterList, priceList)
      : [];
  const quickBestMatch =
    quickNama.trim().length > 1
      ? findBestPriceForDrug(quickNama, priceList)
      : null;

  // Autocomplete & Autosearch state for Full Modal
  const [modalSearchActive, setModalSearchActive] = useState(false);
  const modalSuggestions: DrugSuggestionItem[] =
    formNama.trim().length > 1
      ? getDrugSuggestionsWithBestPrice(formNama, masterList, priceList)
      : [];
  const modalBestMatch =
    formNama.trim().length > 1
      ? findBestPriceForDrug(formNama, priceList)
      : null;

  const handleSelectQuickSuggestion = (item: DrugSuggestionItem, offerIdx = 0) => {
    const offer = item.offers[offerIdx];
    const bestPbf = offer ? offer.pbf : item.bestPbf;
    const bestHna = offer ? offer.hna : item.bestHna;
    const bestDiskon = offer ? offer.diskon : item.bestDiskon;

    const cleanName = item.cleanNama || item.nama;
    const sediaanOrSatuan = item.dosageForm || item.satuan;

    setQuickNama(cleanName);
    if (item.kategori) setQuickKategori(item.kategori as DrugCategory);
    if (sediaanOrSatuan) setQuickSatuan(sediaanOrSatuan);
    const syncNote = `PBF Termurah: ${bestPbf} (HNA Rp ${Math.round(bestHna).toLocaleString('id-ID')}${bestDiskon > 0 ? ` Disc ${bestDiskon}%` : ''})`;
    setQuickCatatan(syncNote);
    setQuickSearchActive(false);
  };

  const handleQuickNamaBlur = () => {
    setTimeout(() => {
      setQuickSearchActive(false);
      if (quickBestMatch && quickBestMatch.hasMatch && !quickCatatan.trim()) {
        const syncNote = `PBF Termurah: ${quickBestMatch.bestPbfName} (HNA Rp ${Math.round(quickBestMatch.bestHna).toLocaleString('id-ID')}${quickBestMatch.bestDiskon > 0 ? ` Disc ${quickBestMatch.bestDiskon}%` : ''})`;
        setQuickCatatan(syncNote);
      }
    }, 250);
  };

  const handleSelectModalSuggestion = (item: DrugSuggestionItem, offerIdx = 0) => {
    const offer = item.offers[offerIdx];
    const bestPbf = offer ? offer.pbf : item.bestPbf;
    const bestHna = offer ? offer.hna : item.bestHna;
    const bestDiskon = offer ? offer.diskon : item.bestDiskon;

    const cleanName = item.cleanNama || item.nama;
    const sediaanOrSatuan = item.dosageForm || item.satuan;

    setFormNama(cleanName);
    if (item.kategori) setFormKategori(item.kategori as DrugCategory);
    if (sediaanOrSatuan) setFormSatuan(sediaanOrSatuan);
    if (item.pabrik) setFormPabrik(item.pabrik);
    setFormPbf(bestPbf);
    setFormHna(bestHna);
    if (!formCatatan.trim() || formCatatan.includes('PBF Termurah:')) {
      setFormCatatan(
        `PBF Termurah: ${bestPbf} (HNA Rp ${Math.round(bestHna).toLocaleString('id-ID')}${bestDiskon > 0 ? ` Disc ${bestDiskon}%` : ''})`
      );
    }
    setModalSearchActive(false);
  };

  const handleModalNamaBlur = () => {
    setTimeout(() => {
      setModalSearchActive(false);
      if (modalBestMatch && modalBestMatch.hasMatch) {
        if (!formPbf) setFormPbf(modalBestMatch.bestPbfName);
        if (!formHna || formHna === 0) setFormHna(modalBestMatch.bestHna);
        if (!formCatatan.trim()) {
          setFormCatatan(
            `PBF Termurah: ${modalBestMatch.bestPbfName} (HNA Rp ${Math.round(modalBestMatch.bestHna).toLocaleString('id-ID')}${modalBestMatch.bestDiskon > 0 ? ` Disc ${modalBestMatch.bestDiskon}%` : ''})`
          );
        }
      }
    }, 250);
  };

  // List of all outlets (outletsList is the primary managed list)
  const allOutlets = (outletsList && outletsList.length > 0)
    ? outletsList
    : Array.from(
        new Set([
          ...pharmacyProfiles.map((p) => p.namaApotek),
          ...usulanList.map((u) => u.apotekPeminta).filter(Boolean),
        ])
      ).filter(Boolean);

  // Calculate counts per outlet
  const outletCounts = allOutlets.reduce<Record<string, { total: number; cito: number; urgent: number }>>((acc, outlet) => {
    const items = usulanList.filter((u) => u.apotekPeminta === outlet);
    acc[outlet] = {
      total: items.length,
      cito: items.filter((i) => i.prioritas === 'cito').length,
      urgent: items.filter((i) => i.prioritas === 'urgent').length,
    };
    return acc;
  }, {});

  // Summary Metrics
  const totalUsulan = usulanList.length;
  const citoCount = usulanList.filter((u) => u.prioritas === 'cito').length;
  const urgentCount = usulanList.filter((u) => u.prioritas === 'urgent').length;
  const menungguCount = usulanList.filter((u) => u.status === 'menunggu').length;
  const disetujuiCount = usulanList.filter((u) => u.status === 'disetujui').length;

  // Filtered List
  const filteredList = usulanList.filter((item) => {
    // Outlet Filter
    if (selectedOutlet !== 'all' && item.apotekPeminta !== selectedOutlet) {
      return false;
    }

    // Status Filter
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }

    // Priority Filter
    if (filterPriority !== 'all' && item.prioritas !== filterPriority) {
      return false;
    }

    // Category Filter
    if (filterCategory !== 'all' && item.kategori !== filterCategory) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNama = (item.namaObat || '').toLowerCase().includes(q);
      const matchOutlet = (item.apotekPeminta || '').toLowerCase().includes(q);
      const matchPemohon = (item.pemohon || '').toLowerCase().includes(q);
      const matchCatatan = (item.catatan || '').toLowerCase().includes(q);
      if (!matchNama && !matchOutlet && !matchPemohon && !matchCatatan) {
        return false;
      }
    }

    return true;
  });

  // Handle Quick Add Submit
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNama.trim()) {
      showToast('Harap isi nama obat terlebih dahulu', 'warning');
      return;
    }

    const syncPbf = quickBestMatch?.hasMatch ? quickBestMatch.bestPbfName : '';
    const syncHna = quickBestMatch?.hasMatch ? quickBestMatch.bestHna : 0;
    const finalCatatan =
      quickCatatan.trim() ||
      (quickBestMatch?.hasMatch
        ? `PBF Termurah: ${quickBestMatch.bestPbfName} (HNA Rp ${Math.round(quickBestMatch.bestHna).toLocaleString('id-ID')}${quickBestMatch.bestDiskon > 0 ? ` Disc ${quickBestMatch.bestDiskon}%` : ''})`
        : '-');

    const newItem: UsulanObatItem = {
      id: `usul_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      namaObat: quickNama.trim(),
      apotekPeminta: quickOutlet || allOutlets[0] || 'Apotek Utama',
      jumlah: Number(quickJumlah) || 1,
      satuan: quickSatuan || 'Box',
      kategori: quickKategori,
      prioritas: quickPrioritas,
      status: 'menunggu',
      pemohon: quickPemohon.trim() || settings.namaApoteker || 'Staf Apotek',
      catatan: finalCatatan,
      pbf: syncPbf,
      perkiraanHna: syncHna,
      tanggal: new Date().toISOString().split('T')[0],
    };

    onAddUsulan(newItem);
    showToast(`Usulan "${newItem.namaObat}" untuk ${newItem.apotekPeminta} berhasil ditambahkan`, 'success');

    // Reset quick fields
    setQuickNama('');
    setQuickCatatan('');
    setQuickPemohon('');
    setQuickSearchActive(false);
  };

  // Open Add/Edit Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormNama('');
    setFormOutlet(selectedOutlet !== 'all' ? selectedOutlet : (allOutlets[0] || ''));
    setFormJumlah(10);
    setFormSatuan('Box');
    setFormKategori('reguler');
    setFormPrioritas('rutin');
    setFormStatus('menunggu');
    setFormPemohon(settings.namaApoteker || '');
    setFormCatatan('');
    setFormPabrik('');
    setFormPbf('');
    setFormHna(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: UsulanObatItem) => {
    setEditingItem(item);
    setFormNama(item.namaObat);
    setFormOutlet(item.apotekPeminta);
    setFormJumlah(item.jumlah);
    setFormSatuan(item.satuan);
    setFormKategori(item.kategori);
    setFormPrioritas(item.prioritas);
    setFormStatus(item.status);
    setFormPemohon(item.pemohon || '');
    setFormCatatan(item.catatan || '');
    setFormPabrik(item.pabrik || '');
    setFormPbf(item.pbf || '');
    setFormHna(item.perkiraanHna || 0);
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      showToast('Nama obat wajib diisi', 'warning');
      return;
    }

    const payload: UsulanObatItem = {
      id: editingItem ? editingItem.id : `usul_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      namaObat: formNama.trim(),
      apotekPeminta: formOutlet || allOutlets[0] || 'Apotek Utama',
      jumlah: Number(formJumlah) || 1,
      satuan: formSatuan || 'Box',
      kategori: formKategori,
      prioritas: formPrioritas,
      status: formStatus,
      pemohon: formPemohon.trim() || settings.namaApoteker || 'Staf Apotek',
      catatan: formCatatan.trim(),
      pabrik: formPabrik.trim(),
      pbf: formPbf.trim(),
      perkiraanHna: Number(formHna) || 0,
      tanggal: editingItem?.tanggal || new Date().toISOString().split('T')[0],
    };

    if (editingItem) {
      onUpdateUsulan(payload);
      showToast(`Usulan "${payload.namaObat}" berhasil diperbarui`, 'success');
    } else {
      onAddUsulan(payload);
      showToast(`Usulan "${payload.namaObat}" berhasil ditambahkan`, 'success');
    }

    setIsModalOpen(false);
  };

  // Add Outlet Submit
  const handleAddNewOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newOutletName.trim();
    if (!cleanName) {
      showToast('Nama outlet / apotek tidak boleh kosong', 'warning');
      return;
    }
    if (allOutlets.some((o) => o.toLowerCase() === cleanName.toLowerCase())) {
      showToast('Outlet dengan nama ini sudah ada', 'warning');
      return;
    }

    onAddOutlet(cleanName);
    setSelectedOutlet(cleanName);
    setQuickOutlet(cleanName);
    setNewOutletName('');
    setIsAddOutletModalOpen(false);
    showToast(`Outlet "${cleanName}" berhasil ditambahkan ke daftar`, 'success');
  };

  // Delete Outlet with Confirmation
  const handleDeleteOutletWithConfirm = (outletName: string) => {
    if (allOutlets.length <= 1) {
      showToast('Minimal harus ada 1 outlet terdaftar di sistem', 'warning');
      return;
    }

    const count = outletCounts[outletName]?.total || 0;
    const remaining = allOutlets.filter((o) => o !== outletName);
    const fallback = remaining[0] || 'Apotek Utama';

    const message =
      count > 0
        ? `Outlet "${outletName}" memiliki ${count} usulan obat. Jika dihapus, ${count} item usulan tersebut akan dialihkan ke outlet "${fallback}". Apakah Anda yakin ingin menghapus outlet ini?`
        : `Apakah Anda yakin ingin menghapus outlet "${outletName}" dari daftar pilihan usulan?`;

    openConfirmDialog('Hapus Outlet / Apotek', message, () => {
      if (onDeleteOutlet) {
        onDeleteOutlet(outletName, fallback);
      }
      if (selectedOutlet === outletName) {
        setSelectedOutlet('all');
      }
      if (quickOutlet === outletName) {
        setQuickOutlet(fallback);
      }
      if (formOutlet === outletName) {
        setFormOutlet(fallback);
      }
    });
  };

  // Quick Inline Status Change
  const handleStatusChange = (item: UsulanObatItem, newStatus: UsulanObatItem['status']) => {
    onUpdateUsulan({
      ...item,
      status: newStatus,
    });
    showToast(`Status "${item.namaObat}" diubah menjadi ${newStatus.toUpperCase()}`, 'info');
  };

  // Quick Duplicate
  const handleDuplicate = (item: UsulanObatItem) => {
    const duplicated: UsulanObatItem = {
      ...item,
      id: `usul_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'menunggu',
    };
    onAddUsulan(duplicated);
    showToast(`Usulan "${item.namaObat}" berhasil diduplikasi`, 'success');
  };

  // Transfer to Transaksi SP
  const handleTransferToSP = (itemsToTransfer: UsulanObatItem[]) => {
    if (itemsToTransfer.length === 0) {
      showToast('Pilih setidaknya satu obat untuk ditransfer ke Transaksi SP', 'warning');
      return;
    }

    openConfirmDialog(
      'Transfer ke Transaksi SP (Surat Pesanan)',
      `Pindahkan ${itemsToTransfer.length} item obat yang diusulkan ini ke lembar perhitungan Transaksi SP? Data akan otomatis disesuaikan per kategori obat.`,
      () => {
        onTransferToTransaction(itemsToTransfer);
        // Automatically mark transferred items as 'dipesan'
        itemsToTransfer.forEach((item) => {
          onUpdateUsulan({ ...item, status: 'dipesan' });
        });
        setSelectedIds([]);
        showToast(`${itemsToTransfer.length} obat berhasil ditransfer ke Transaksi SP & ditandai DIPESAN`, 'success');
      }
    );
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    openConfirmDialog(
      'Hapus Usulan Terpilih',
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} daftar usulan obat yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        selectedIds.forEach((id) => onDeleteUsulan(id));
        setSelectedIds([]);
        showToast(`${selectedIds.length} usulan obat berhasil dihapus`, 'success');
      }
    );
  };

  // Bulk Status Change
  const handleBulkStatusChange = (status: UsulanObatItem['status']) => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      const item = usulanList.find((u) => u.id === id);
      if (item) {
        onUpdateUsulan({ ...item, status });
      }
    });
    setSelectedIds([]);
    showToast(`${selectedIds.length} item berhasil ditandai ${status.toUpperCase()}`, 'success');
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredList.map((item, idx) => ({
      'No': idx + 1,
      'Nama Obat': item.namaObat,
      'Outlet / Apotek Peminta': item.apotekPeminta,
      'Jumlah': item.jumlah,
      'Satuan': item.satuan,
      'Kategori': item.kategori.toUpperCase(),
      'Prioritas': item.prioritas.toUpperCase(),
      'Status': item.status.toUpperCase(),
      'Pemohon': item.pemohon || '-',
      'Tanggal': item.tanggal,
      'Catatan': item.catatan || '-',
      'Pabrik / Principal': item.pabrik || '-',
      'Estimasi HNA (Rp)': item.perkiraanHna || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetTitle = selectedOutlet !== 'all' ? selectedOutlet.substring(0, 30) : 'Semua Outlet';
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Daftar_Usulan_Obat_${selectedOutlet !== 'all' ? selectedOutlet.replace(/\s+/g, '_') : 'Semua_Outlet'}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`File Excel ${filename} berhasil diunduh`, 'success');
  };

  // Print Document
  const handlePrint = () => {
    window.print();
  };

  const getPriorityBadge = (prioritas: 'cito' | 'urgent' | 'rutin') => {
    switch (prioritas) {
      case 'cito':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            CITO
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            URGENT
          </span>
        );
      case 'rutin':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Rutin
          </span>
        );
    }
  };

  const getStatusBadge = (status: UsulanObatItem['status']) => {
    switch (status) {
      case 'menunggu':
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <Clock className="w-2.5 h-2.5" />
            Menunggu
          </span>
        );
      case 'disetujui':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <Check className="w-2.5 h-2.5" />
            Disetujui
          </span>
        );
      case 'dipesan':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <Send className="w-2.5 h-2.5" />
            Dipesan di SP
          </span>
        );
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Selesai
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: DrugCategory) => {
    switch (cat) {
      case 'prekursor':
        return <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">PREKURSOR</span>;
      case 'oot':
        return <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">OOT</span>;
      case 'reguler':
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">REGULER</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-teal-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Menu Usulan Obat Apotek
                </h2>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Tulis Manual &amp; Filter Outlet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pencatatan manual daftar kebutuhan obat dari tiap outlet/apotek peminta dengan filter terpisah dan integrasi langsung ke Surat Pesanan (SP).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Usulan Lengkap</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 bg-white/10 hover:bg-white/15 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
              title="Cetak format cetak Surat Usulan Obat"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Cetak Usulan</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-emerald-500/30 cursor-pointer"
              title="Export daftar usulan ke Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-white/5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Usulan</span>
            <div className="text-lg font-bold text-white mt-0.5">{totalUsulan} <span className="text-xs font-normal text-slate-400">item</span></div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-2.5">
            <span className="text-[10px] text-rose-300 uppercase font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              CITO (Darurat)
            </span>
            <div className="text-lg font-bold text-rose-300 mt-0.5">{citoCount} <span className="text-xs font-normal text-rose-300/70">item</span></div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5">
            <span className="text-[10px] text-amber-300 uppercase font-semibold">Urgent</span>
            <div className="text-lg font-bold text-amber-300 mt-0.5">{urgentCount} <span className="text-xs font-normal text-amber-300/70">item</span></div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-2.5">
            <span className="text-[10px] text-yellow-300 uppercase font-semibold">Menunggu Proses</span>
            <div className="text-lg font-bold text-yellow-300 mt-0.5">{menungguCount} <span className="text-xs font-normal text-yellow-300/70">item</span></div>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-2.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-indigo-300 uppercase font-semibold">Outlet Terdaftar</span>
            <div className="text-lg font-bold text-indigo-300 mt-0.5">{allOutlets.length} <span className="text-xs font-normal text-indigo-300/70">apotek</span></div>
          </div>
        </div>
      </div>

      {/* 2. QUICK ADD BAR (TULIS MANUAL CEPAT LANGSUNG DI ATAS TABEL) */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/30 backdrop-blur-xl rounded-3xl p-3 sm:p-4 shadow-xl space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Tulis Cepat Usulan Obat Manual &amp; Autosearch PBF:
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Selesai ketik nama obat langsung cari PBF termurah &bull; Tekan <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white">Enter</kbd> untuk tambah
          </span>
        </div>

        {/* Row 1: Input Obat & Parameter Dasar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          {/* 1. Nama Obat Input with Autosearch & Dropdown */}
          <div className="sm:col-span-4 relative">
            <input
              type="text"
              required
              placeholder="Ketik Nama Obat & Sediaan (cth: Paracetamol 500mg)..."
              value={quickNama}
              onChange={(e) => {
                setQuickNama(e.target.value);
                setQuickSearchActive(true);
              }}
              onFocus={() => {
                if (quickNama.trim().length > 1) setQuickSearchActive(true);
              }}
              onBlur={handleQuickNamaBlur}
              className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none transition"
            />

            {/* Live Autocomplete Suggestions Popup */}
            {quickSearchActive && quickSuggestions.length > 0 && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                <div className="p-2 bg-white/5 border-b border-white/10 text-[10px] font-bold text-teal-300 flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    SARAN HARGA &amp; PBF TERMURAH
                    <span className="text-[8px] font-normal text-teal-200/70 bg-teal-500/20 px-1 py-0.2 rounded border border-teal-400/20">
                      Bentuk fisik terpisah
                    </span>
                  </span>
                  <button
                    type="button"
                    onMouseDown={() => setQuickSearchActive(false)}
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    &times;
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {quickSuggestions.map((sug, sIdx) => (
                    <div
                      key={sIdx}
                      onMouseDown={() => handleSelectQuickSuggestion(sug)}
                      className="p-2.5 hover:bg-white/10 transition cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs">
                            {sug.cleanNama || sug.nama}
                          </span>
                          {sug.dosageForm && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                              {sug.dosageForm}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-teal-300 font-mono font-bold bg-teal-500/20 px-1.5 py-0.5 rounded border border-teal-500/30 shrink-0">
                          {sug.bestPbf}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{sug.satuan || 'Box'} &bull; {sug.kategori || 'reguler'}</span>
                        <span className="text-emerald-300 font-mono font-bold">
                          HNA: Rp {Math.round(sug.bestHna).toLocaleString('id-ID')}
                          {sug.bestDiskon > 0 ? ` (Disc ${sug.bestDiskon}%)` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Outlet Peminta Selector */}
          <div className="sm:col-span-3">
            <select
              value={quickOutlet}
              onChange={(e) => setQuickOutlet(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2.5 py-2 text-white outline-none transition cursor-pointer"
            >
              {allOutlets.map((outlet) => (
                <option key={outlet} value={outlet} className="bg-slate-900 text-white">
                  🏢 {outlet}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Jumlah & Satuan */}
          <div className="sm:col-span-2 flex gap-1">
            <input
              type="number"
              min="1"
              required
              placeholder="Qty"
              value={quickJumlah || ''}
              onChange={(e) => setQuickJumlah(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2 py-2 text-white text-center outline-none transition"
            />
            <select
              value={quickSatuan}
              onChange={(e) => setQuickSatuan(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-1.5 py-2 text-white outline-none transition cursor-pointer"
            >
              <option value="Box">Box</option>
              <option value="Strip">Strip</option>
              <option value="Botol">Botol</option>
              <option value="Tube">Tube</option>
              <option value="Tablet">Tablet</option>
              <option value="Kapsul">Kapsul</option>
              <option value="Pcs">Pcs</option>
              <option value="Vial">Vial</option>
              <option value="Ampul">Ampul</option>
            </select>
          </div>

          {/* 4. Prioritas */}
          <div className="sm:col-span-2">
            <select
              value={quickPrioritas}
              onChange={(e) => setQuickPrioritas(e.target.value as any)}
              className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2.5 py-2 text-white outline-none transition cursor-pointer"
            >
              <option value="rutin">🟢 Rutin</option>
              <option value="urgent">🟠 Urgent</option>
              <option value="cito">🔴 CITO (Darurat)</option>
            </select>
          </div>

          {/* 5. Button Submit */}
          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full h-full min-h-[38px] bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-md shadow-indigo-600/30 cursor-pointer"
              title="Tambahkan Usulan Obat ke Daftar"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:hidden">Tambah</span>
            </button>
          </div>
        </div>

        {/* Live Recommendation Badge Bar */}
        {quickBestMatch && quickBestMatch.hasMatch && (
          <div className="flex items-center justify-between gap-2 text-[11px] bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-emerald-300">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                <strong>Rekomendasi PBF Termurah: {quickBestMatch.bestPbfName}</strong> &bull; HNA Rp {Math.round(quickBestMatch.bestHna).toLocaleString('id-ID')}
                {quickBestMatch.bestDiskon > 0 ? ` (Disc ${quickBestMatch.bestDiskon}%)` : ''} &bull; Hemat Rp {Math.round(quickBestMatch.savingsRp).toLocaleString('id-ID')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const note = `PBF Termurah: ${quickBestMatch.bestPbfName} (HNA Rp ${Math.round(quickBestMatch.bestHna).toLocaleString('id-ID')}${quickBestMatch.bestDiskon > 0 ? ` Disc ${quickBestMatch.bestDiskon}%` : ''})`;
                setQuickCatatan(note);
              }}
              className="px-2 py-0.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0"
            >
              Terapkan ke Catatan SP
            </button>
          </div>
        )}

        {/* Row 2: Kolom Keterangan / Catatan SP (Sinkron Pricelist) & Pemohon */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-1 border-t border-white/5">
          <div className="sm:col-span-8">
            <input
              type="text"
              placeholder="Kolom Keterangan / Catatan SP (otomatis tersinkronisasi rekomendasi PBF termurah)..."
              value={quickCatatan}
              onChange={(e) => setQuickCatatan(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-400 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 outline-none text-xs"
            />
          </div>
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Nama Pemohon / Petugas Apotek..."
              value={quickPemohon}
              onChange={(e) => setQuickPemohon(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-400 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 outline-none text-xs"
            />
          </div>
        </div>
      </form>

      {/* 3. MAIN SPLIT LAYOUT: LEFT SIDEBAR (FILTER OUTLET) & RIGHT TABLE (DAFTAR OBAT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* =========================================================================
            LEFT COLUMN: FILTER OUTLET ATAU APOTEK YANG MEMINTA (SIDEBAR)
            ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-xl space-y-3.5 sticky top-20">
            {/* Header & Add Outlet Button */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white text-xs tracking-wide">
                  Filter Outlet / Apotek
                </h3>
              </div>
              <button
                onClick={() => setIsAddOutletModalOpen(true)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-teal-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Kelola & Tambah/Hapus Outlet"
              >
                <Plus className="w-3 h-3" />
                <span>Kelola Outlet</span>
              </button>
            </div>

            {/* List Outlet Filter Buttons */}
            <div className="space-y-1.5">
              {/* Option: Semua Outlet */}
              <button
                onClick={() => setSelectedOutlet('all')}
                className={`w-full text-left px-3 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  selectedOutlet === 'all'
                    ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">⭐ Semua Outlet / Apotek</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  selectedOutlet === 'all' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  {usulanList.length}
                </span>
              </button>

              {/* Individual Outlets */}
              {allOutlets.map((outlet) => {
                const count = outletCounts[outlet]?.total || 0;
                const hasCito = (outletCounts[outlet]?.cito || 0) > 0;
                const isSelected = selectedOutlet === outlet;

                return (
                  <div
                    key={outlet}
                    className={`group w-full rounded-2xl flex items-center transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold border border-indigo-400/40'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedOutlet(outlet)}
                      className="flex-1 min-w-0 text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Store className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{outlet}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {hasCito && (
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" title="Ada usulan CITO" />
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                        }`}>
                          {count}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutletWithConfirm(outlet);
                      }}
                      className={`mr-1.5 p-1 rounded-lg opacity-40 group-hover:opacity-100 hover:opacity-100 transition cursor-pointer ${
                        isSelected
                          ? 'hover:bg-rose-500/30 text-rose-200 hover:text-white'
                          : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                      }`}
                      title={`Hapus outlet "${outlet}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sub-Filters: Status & Prioritas */}
            <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Filter Status &amp; Prioritas:
              </span>

              {/* Filter Status */}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Status Usulan:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Status ({usulanList.length})</option>
                  <option value="menunggu">⏳ Menunggu ({menungguCount})</option>
                  <option value="disetujui">✅ Disetujui ({disetujuiCount})</option>
                  <option value="dipesan">📦 Dipesan di SP</option>
                  <option value="selesai">🎉 Selesai</option>
                </select>
              </div>

              {/* Filter Prioritas */}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Tingkat Urgensi:</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Prioritas</option>
                  <option value="cito">🔴 CITO (Darurat)</option>
                  <option value="urgent">🟠 Urgent</option>
                  <option value="rutin">🟢 Rutin</option>
                </select>
              </div>

              {/* Filter Kategori */}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Kategori Obat:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Kategori (Reguler, Prekursor, OOT)</option>
                  <option value="reguler">Reguler</option>
                  <option value="prekursor">Prekursor</option>
                  <option value="oot">OOT (Obat-Obat Tertentu)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: DAFTAR OBAT YANG DITULIS SECARA MANUAL
            ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3">
          {/* Action Toolbar & Search */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-3 sm:p-4 shadow-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
              {/* Active Filter Title */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {selectedOutlet === 'all' ? 'Semua Usulan Obat' : `Usulan: ${selectedOutlet}`}
                  </h3>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.2 rounded-full font-mono font-bold">
                    {filteredList.length} Item
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {selectedOutlet === 'all'
                    ? 'Menampilkan seluruh usulan dari semua outlet apotek'
                    : `Daftar khusus permintaan obat dari outlet ${selectedOutlet}`}
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari obat, pemohon, catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Bulk Selection Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 animate-fade-in text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-lg text-[11px]">
                    {selectedIds.length} Obat Dipilih
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const selectedItems = usulanList.filter((u) => selectedIds.includes(u.id));
                      handleTransferToSP(selectedItems);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transfer ke Transaksi SP</span>
                  </button>

                  <button
                    onClick={() => handleBulkStatusChange('disetujui')}
                    className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-xl text-xs font-semibold transition border border-blue-400/30 cursor-pointer"
                  >
                    Tandai Disetujui
                  </button>

                  <button
                    onClick={() => handleBulkStatusChange('selesai')}
                    className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-xl text-xs font-semibold transition border border-emerald-400/30 cursor-pointer"
                  >
                    Tandai Selesai
                  </button>

                  <button
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 rounded-xl text-xs font-semibold transition border border-rose-400/30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabel Usulan Obat */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[11px] text-slate-300 font-bold uppercase tracking-wider select-none">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                        onChange={toggleSelectAll}
                        className="rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Nama Obat &amp; Sediaan</th>
                    <th className="p-3">Outlet / Apotek Peminta</th>
                    <th className="p-3 text-center">Jumlah</th>
                    <th className="p-3 text-center">Prioritas</th>
                    <th className="p-3 min-w-[170px]">Saran PBF Termurah (Pricelist)</th>
                    <th className="p-3 min-w-[180px]">Keterangan / Catatan SP</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <ClipboardList className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                        <p className="font-semibold text-white">Tidak ada usulan obat yang cocok</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Ketik nama obat di bar input cepat di atas untuk menambahkan usulan obat manual.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => {
                      const isSelected = selectedIds.includes(item.id);
                      const itemBestMatch = findBestPriceForDrug(item.namaObat, priceList);
                      const displayPbf = item.pbf || (itemBestMatch?.hasMatch ? itemBestMatch.bestPbfName : '');
                      const displayHna = (item.perkiraanHna && item.perkiraanHna > 0)
                        ? item.perkiraanHna
                        : (itemBestMatch?.hasMatch ? itemBestMatch.bestHna : 0);
                      const displayDiskon = itemBestMatch?.hasMatch ? itemBestMatch.bestDiskon : 0;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-white/5 transition-colors ${
                            isSelected ? 'bg-indigo-950/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.id)}
                              className="rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Nama Obat & Kategori */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <span className="font-bold text-white text-xs block">
                                {item.namaObat}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {getCategoryBadge(item.kategori)}
                                {item.pabrik && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                    {item.pabrik}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Outlet Peminta */}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 font-semibold text-xs">
                              <Store className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{item.apotekPeminta}</span>
                            </span>
                          </td>

                          {/* Jumlah & Satuan */}
                          <td className="p-3 text-center">
                            <div className="inline-block bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 font-bold text-white text-xs">
                              {item.jumlah} <span className="font-normal text-slate-400 text-[11px]">{item.satuan}</span>
                            </div>
                          </td>

                          {/* Prioritas */}
                          <td className="p-3 text-center">
                            {getPriorityBadge(item.prioritas)}
                          </td>

                          {/* Saran PBF Termurah (Pricelist) */}
                          <td className="p-3">
                            {displayPbf ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate max-w-[130px]">{displayPbf}</span>
                                </span>
                                {displayHna > 0 && (
                                  <div className="text-[10px] text-slate-300 font-mono">
                                    HNA Rp {Math.round(displayHna).toLocaleString('id-ID')}
                                    {displayDiskon > 0 && (
                                      <span className="text-teal-400 ml-1 font-bold">(-{displayDiskon}%)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Belum ada di pricelist</span>
                            )}
                          </td>

                          {/* Keterangan / Catatan SP */}
                          <td className="p-3">
                            <div className="space-y-1 max-w-[220px]">
                              <p className="text-xs text-slate-200 font-medium break-words">
                                {item.catatan || '-'}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                                {item.pemohon && (
                                  <span className="truncate">👤 {item.pemohon}</span>
                                )}
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {item.tanggal}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status Dropdown */}
                          <td className="p-3 text-center">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item, e.target.value as any)}
                              className="bg-slate-950/80 border border-white/15 rounded-xl px-2 py-1 text-[11px] text-slate-200 outline-none cursor-pointer"
                            >
                              <option value="menunggu">⏳ Menunggu</option>
                              <option value="disetujui">✅ Disetujui</option>
                              <option value="dipesan">📦 Dipesan di SP</option>
                              <option value="selesai">🎉 Selesai</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleTransferToSP([item])}
                                className="p-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 rounded-lg transition cursor-pointer"
                                title="Transfer ke Transaksi SP"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(item)}
                                className="p-1.5 bg-white/5 hover:bg-white/15 text-slate-300 rounded-lg transition cursor-pointer"
                                title="Duplikasi Usulan"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg transition cursor-pointer"
                                title="Edit Usulan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  openConfirmDialog(
                                    'Hapus Usulan Obat',
                                    `Hapus usulan obat "${item.namaObat}" dari daftar?`,
                                    () => {
                                      onDeleteUsulan(item.id);
                                      showToast(`Usulan "${item.namaObat}" dihapus`, 'success');
                                    }
                                  );
                                }}
                                className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg transition cursor-pointer"
                                title="Hapus Usulan"
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
        </div>
      </div>

      {/* =========================================================================
          MODAL: TAMBAH / EDIT USULAN OBAT LENGKAP
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {editingItem ? 'Edit Usulan Obat' : 'Tulis Usulan Obat Manual'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formulir pencatatan usulan pengadaan obat per outlet apotek
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              {/* Nama Obat with Autocomplete & Autosearch */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Nama Obat &amp; Sediaan <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-teal-400">
                    Tersinkronisasi otomatis dengan Pricelist
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paracetamol 500mg Tablet / Tremenza Tab"
                  value={formNama}
                  onChange={(e) => {
                    setFormNama(e.target.value);
                    setModalSearchActive(true);
                  }}
                  onFocus={() => {
                    if (formNama.trim().length > 1) setModalSearchActive(true);
                  }}
                  onBlur={handleModalNamaBlur}
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none"
                />

                {/* Modal Suggestions Popup */}
                {modalSearchActive && modalSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-full bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                    <div className="p-2 bg-white/5 border-b border-white/10 text-[10px] font-bold text-teal-300 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        PILIHAN OBAT &amp; PBF TERMURAH DARI PRICELIST
                        <span className="text-[8px] font-normal text-teal-200/70 bg-teal-500/20 px-1 py-0.2 rounded border border-teal-400/20">
                          Bentuk fisik terpisah
                        </span>
                      </span>
                      <button
                        type="button"
                        onMouseDown={() => setModalSearchActive(false)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="divide-y divide-white/5">
                      {modalSuggestions.map((sug, sIdx) => (
                        <div
                          key={sIdx}
                          onMouseDown={() => handleSelectModalSuggestion(sug)}
                          className="p-2 hover:bg-white/10 transition cursor-pointer flex flex-col gap-0.5"
                        >
                          <div className="flex justify-between items-center gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-xs">
                                {sug.cleanNama || sug.nama}
                              </span>
                              {sug.dosageForm && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                                  {sug.dosageForm}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-teal-300 font-mono font-bold bg-teal-500/20 px-1.5 py-0.5 rounded border border-teal-500/30 shrink-0">
                              {sug.bestPbf}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{sug.satuan || 'Box'} &bull; {sug.kategori || 'reguler'}</span>
                            <span className="text-emerald-300 font-mono font-bold">
                              HNA: Rp {Math.round(sug.bestHna).toLocaleString('id-ID')}
                              {sug.bestDiskon > 0 ? ` (-${sug.bestDiskon}%)` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendation Banner inside Modal */}
              {modalBestMatch && modalBestMatch.hasMatch && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-between gap-2 text-[11px] text-emerald-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      <strong>Saran PBF Termurah: {modalBestMatch.bestPbfName}</strong> (Rp {Math.round(modalBestMatch.bestHna).toLocaleString('id-ID')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormPbf(modalBestMatch.bestPbfName);
                      setFormHna(modalBestMatch.bestHna);
                      const note = `PBF Termurah: ${modalBestMatch.bestPbfName} (HNA Rp ${Math.round(modalBestMatch.bestHna).toLocaleString('id-ID')}${modalBestMatch.bestDiskon > 0 ? ` Disc ${modalBestMatch.bestDiskon}%` : ''})`;
                      setFormCatatan(note);
                    }}
                    className="px-2 py-0.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0"
                  >
                    Gunakan PBF Ini
                  </button>
                </div>
              )}

              {/* Outlet / Apotek Peminta */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Outlet / Apotek yang Meminta <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formOutlet}
                  onChange={(e) => setFormOutlet(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  {allOutlets.map((outlet) => (
                    <option key={outlet} value={outlet} className="bg-slate-900 text-white">
                      🏢 {outlet}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Qty, Satuan, Kategori */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jumlah Usul</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan</label>
                  <select
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="Box">Box</option>
                    <option value="Strip">Strip</option>
                    <option value="Botol">Botol</option>
                    <option value="Tube">Tube</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Kapsul">Kapsul</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Vial">Vial</option>
                    <option value="Ampul">Ampul</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="reguler">Reguler</option>
                    <option value="prekursor">Prekursor</option>
                    <option value="oot">OOT</option>
                  </select>
                </div>
              </div>

              {/* Grid: Prioritas, Status, Pemohon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prioritas</label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2.5 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="rutin">🟢 Rutin</option>
                    <option value="urgent">🟠 Urgent</option>
                    <option value="cito">🔴 CITO (Darurat)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2.5 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="menunggu">⏳ Menunggu</option>
                    <option value="disetujui">✅ Disetujui</option>
                    <option value="dipesan">📦 Dipesan di SP</option>
                    <option value="selesai">🎉 Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Pemohon</label>
                  <input
                    type="text"
                    placeholder="Nama Staf / Kasir"
                    value={formPemohon}
                    onChange={(e) => setFormPemohon(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-2.5 py-2 text-white outline-none"
                  />
                </div>
              </div>

              {/* Pabrik, Saran PBF & Estimasi HNA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Pabrik / Principal</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kimia Farma / Sanbe"
                    value={formPabrik}
                    onChange={(e) => setFormPabrik(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Saran PBF (Pricelist)</label>
                  <PbfAutocompleteInput
                    value={formPbf}
                    onChange={(val) => setFormPbf(val)}
                    onSelectOffer={(offer) => {
                      setFormPbf(offer.pbf);
                      if (offer.hna && !formHna) {
                        setFormHna(offer.hna);
                      }
                    }}
                    suppliers={suppliers || []}
                    priceList={priceList || []}
                    drugName={formNama}
                    placeholder="Contoh: Mensa / APL / KFTD"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estimasi HNA (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formHna || ''}
                    onChange={(e) => setFormHna(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              {/* Catatan / Alasan Kebutuhan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Kebutuhan / Alasan</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Stok sisa 1 box di etalase, permintaan resep dokter spesialis tinggi..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan Usulan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KELOLA OUTLET / APOTEK (TAMBAH & HAPUS)
          ========================================================================= */}
      {isAddOutletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Kelola Outlet / Apotek</h3>
                  <p className="text-[11px] text-slate-400">Tambah atau hapus outlet peminta usulan obat</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOutletModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Tambah Outlet Baru */}
            <form onSubmit={handleAddNewOutlet} className="space-y-2.5 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
              <label className="block text-slate-300 font-semibold text-xs">
                Tambah Outlet / Unit Peminta Baru
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Contoh: Apotek Cabang Buah Batu / Klinik IGD"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/15 focus:border-teal-400 rounded-xl px-3 py-2 text-white outline-none text-xs"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-600/30 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>

            {/* Daftar Outlet Terdaftar */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Daftar Outlet Terdaftar ({allOutlets.length})</span>
                <span className="text-[10px] text-slate-500">Total usulan per unit</span>
              </div>
              <div className="overflow-y-auto space-y-2 max-h-60 pr-1">
                {allOutlets.map((outlet) => {
                  const count = outletCounts[outlet]?.total || 0;
                  const isOnlyOne = allOutlets.length <= 1;

                  return (
                    <div
                      key={outlet}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Store className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="text-xs font-semibold text-white truncate">{outlet}</span>
                        {count > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono shrink-0">
                            {count} usulan
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOutletWithConfirm(outlet)}
                        disabled={isOnlyOne}
                        className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs shrink-0 ${
                          isOnlyOne
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-rose-400 hover:text-white hover:bg-rose-600/40 bg-rose-500/10'
                        }`}
                        title={
                          isOnlyOne
                            ? 'Minimal harus ada 1 outlet terdaftar'
                            : `Hapus outlet "${outlet}"`
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold hidden sm:inline">Hapus</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddOutletModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CETAK / PRINT SURAT USULAN OBAT PER APOTEK
          ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Cetak Surat Usulan Pengadaan Obat</h3>
                  <p className="text-xs text-slate-400">
                    Dokumen cetak resmi per outlet / apotek peminta
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sekarang</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Paper */}
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl space-y-5 font-sans">
              {/* Kop Surat */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase">
                  {selectedOutlet !== 'all' ? selectedOutlet : (settings.namaApotek || 'APOTEK SEHAT SEJAHTERA')}
                </h2>
                <p className="text-xs text-slate-600">
                  {settings.alamatApotek || 'Jl. Farmasi Raya No. 88, Jakarta Pusat'} | SIPA: {settings.sipaNo || '-'}
                </p>
                <div className="inline-block bg-slate-900 text-white font-bold px-3 py-0.5 rounded text-xs mt-1 uppercase tracking-wider">
                  SURAT USULAN PENGADAAN OBAT (DEFEKTA OUTLET)
                </div>
              </div>

              {/* Meta info */}
              <div className="flex justify-between text-xs text-slate-700">
                <div>
                  <p><strong>Outlet / Unit:</strong> {selectedOutlet === 'all' ? 'Seluruh Unit / Outlet Apotek' : selectedOutlet}</p>
                  <p><strong>Apoteker Penanggung Jawab:</strong> {settings.namaApoteker || 'apt. Setefanus Henry, S.Farm.'}</p>
                </div>
                <div className="text-right">
                  <p><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><strong>Jumlah Item:</strong> {filteredList.length} obat</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 border border-slate-400 font-bold">
                    <th className="border border-slate-400 p-2 text-center w-8">No</th>
                    <th className="border border-slate-400 p-2 text-left">Nama Obat &amp; Sediaan</th>
                    <th className="border border-slate-400 p-2 text-center">Outlet Peminta</th>
                    <th className="border border-slate-400 p-2 text-center">Jumlah</th>
                    <th className="border border-slate-400 p-2 text-center">Satuan</th>
                    <th className="border border-slate-400 p-2 text-center">Urgensi</th>
                    <th className="border border-slate-400 p-2 text-left">Catatan Kebutuhan</th>
                    <th className="border border-slate-400 p-2 text-center">Pemohon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => (
                    <tr key={item.id} className="border border-slate-300">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-bold">{item.namaObat}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.apotekPeminta}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{item.jumlah}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.satuan}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {item.prioritas.toUpperCase()}
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-600">{item.catatan || '-'}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.pemohon || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p>Pemohon / Kepala Unit Outlet,</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">
                    (..................................................)
                  </p>
                </div>
                <div>
                  <p>Apoteker Penanggung Jawab (SIPA),</p>
                  <div className="h-16" />
                  <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">
                    {settings.namaApoteker || 'apt. Setefanus Henry, S.Farm.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
