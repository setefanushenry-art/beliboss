import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  User,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink,
  Percent,
  Clock,
  FileText,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SupplierItem } from '../../types';
import { createEmptySupplier } from '../../utils/db';
import { FileSystemManager } from '../../utils/fileSystem';

interface SupplierManagerProps {
  suppliers: SupplierItem[];
  onAddSupplier: (supplier: SupplierItem) => void;
  onUpdateSupplier: (supplier: SupplierItem) => void;
  onDeleteSupplier: (id: string) => void;
  onSyncAllDetectedPbfs?: () => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info', detail?: string) => void;
  openConfirmDialog: (title: string, message: string, onConfirm: () => void, icon?: 'help' | 'warning' | 'danger') => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onSyncAllDetectedPbfs,
  showToast,
  openConfirmDialog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [formData, setFormData] = useState<SupplierItem>(createEmptySupplier());

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.nama.toLowerCase().includes(q) ||
      s.kode.toLowerCase().includes(q) ||
      (s.salesNama && s.salesNama.toLowerCase().includes(q)) ||
      (s.alamat && s.alamat.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(createEmptySupplier());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: SupplierItem) => {
    setEditingSupplier(supplier);
    setFormData({ ...supplier });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode.trim() || !formData.nama.trim()) {
      showToast('Kode PBF dan Nama Resmi PBF wajib diisi.', 'warning');
      return;
    }

    if (editingSupplier) {
      onUpdateSupplier(formData);
      showToast(`Data PBF ${formData.kode} berhasil diperbarui!`, 'success');
    } else {
      // Check duplicate kode
      if (suppliers.some((s) => s.kode.toUpperCase() === formData.kode.toUpperCase())) {
        showToast(`Kode PBF "${formData.kode.toUpperCase()}" sudah terdaftar.`, 'warning');
        return;
      }
      onAddSupplier({ ...formData, kode: formData.kode.toUpperCase() });
      showToast(`PBF ${formData.nama} berhasil ditambahkan!`, 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (s: SupplierItem) => {
    openConfirmDialog(
      'Hapus Distributor PBF',
      `Apakah Anda yakin ingin menghapus "${s.nama}" (${s.kode}) dari daftar rekanan PBF?`,
      () => {
        onDeleteSupplier(s.id);
        showToast(`PBF ${s.kode} berhasil dihapus.`, 'info');
      },
      'danger'
    );
  };

  const handleExportExcel = async () => {
    const exportData = suppliers.map((s, idx) => ({
      No: idx + 1,
      'Kode PBF': s.kode,
      'Nama Distributor (PBF)': s.nama,
      'Nama Sales / PIC': s.salesNama || '-',
      'Kontak / WhatsApp': s.salesKontak || '-',
      'Jatuh Tempo (Hari)': s.tempoHari || 30,
      'Min Order (Rp)': s.minOrder || 0,
      'Diskon COD Default (%)': s.diskonCODDefault || 0,
      'Alamat Kantor/Gudang': s.alamat || '-',
      Catatan: s.catatan || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar PBF Supplier');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `Master_PBF_Distributor_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = await FileSystemManager.saveBlobToInternalStorage(blob, fileName, 'Data PBF Excel (.xlsx)', '.xlsx');
    if (res.success) {
      showToast('Daftar PBF berhasil diekspor ke Excel!', 'success', res.savedPath);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & METRICS BAR */}
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Master Data PBF / Distributor Supplier Farmasi
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Kelola rekanan Pedagang Besar Farmasi (PBF), kontak sales WhatsApp, syarat jatuh tempo (TOP), dan diskon tunai/COD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>

            {onSyncAllDetectedPbfs && (
              <button
                id="sync-detected-pbfs-btn"
                onClick={onSyncAllDetectedPbfs}
                className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/45 text-indigo-200 border border-indigo-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer backdrop-blur-md"
                title="Pindai dan daftarkan semua PBF yang terdeteksi dari Usulan SP, Perhitungan, Master, atau Price List"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Sinkronkan PBF Terdeteksi</span>
              </button>
            )}

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 border border-amber-400/40 transition cursor-pointer backdrop-blur-md"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Tambah PBF Baru</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            <span className="text-[11px] text-slate-400 font-medium">Total Rekanan PBF</span>
            <p className="text-lg font-black text-white font-mono mt-0.5">{suppliers.length} PBF</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            <span className="text-[11px] text-slate-400 font-medium">PBF dengan Diskon COD</span>
            <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
              {suppliers.filter((s) => (s.diskonCODDefault || 0) > 0).length} PBF
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            <span className="text-[11px] text-slate-400 font-medium">Rata-rata Tempo (TOP)</span>
            <p className="text-lg font-black text-sky-300 font-mono mt-0.5">
              {Math.round(
                suppliers.reduce((acc, curr) => acc + (curr.tempoHari || 30), 0) / (suppliers.length || 1)
              )}{' '}
              Hari
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            <span className="text-[11px] text-slate-400 font-medium">PBF dengan Kontak Sales</span>
            <p className="text-lg font-black text-emerald-300 font-mono mt-0.5">
              {suppliers.filter((s) => s.salesKontak).length} Sales
            </p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode PBF (SMA, TSJ, APL), nama PT, sales, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-2xl text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-400 focus:bg-slate-900/80 backdrop-blur-xl transition"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Menampilkan <span className="text-white font-bold">{filteredSuppliers.length}</span> dari {suppliers.length} PBF
        </div>
      </div>

      {/* 3. SUPPLIER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full bg-slate-900/40 border border-white/10 rounded-3xl p-10 text-center text-slate-400 space-y-3 backdrop-blur-xl">
            <Truck className="w-10 h-10 mx-auto text-slate-500/50" />
            <p className="text-sm font-semibold text-slate-300">Tidak ada data PBF yang cocok dengan pencarian.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekanan PBF Baru</span>
            </button>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900/70 backdrop-blur-2xl border border-white/10 hover:border-amber-400/40 rounded-3xl p-5 text-white shadow-xl flex flex-col justify-between space-y-4 transition duration-200 group"
            >
              <div className="space-y-3">
                {/* Header Card */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-lg text-[11px] font-black tracking-wider uppercase font-mono">
                      {s.kode}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition line-clamp-1 pt-1">
                      {s.nama}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      title="Edit Data PBF"
                      className="p-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      title="Hapus Rekanan PBF"
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Info List */}
                <div className="space-y-2 text-xs pt-1 border-t border-white/5">
                  {/* Sales & Contact */}
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      Sales PIC:
                    </span>
                    <span className="font-semibold text-white">{s.salesNama || '-'}</span>
                  </div>

                  {s.salesKontak && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Kontak:
                      </span>
                      <a
                        href={`https://wa.me/${s.salesKontak.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-emerald-300 hover:text-emerald-200 hover:underline flex items-center gap-1"
                      >
                        {s.salesKontak}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Terms / TOP & COD */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Jatuh Tempo (TOP)</span>
                      <span className="font-mono font-bold text-sky-300">{s.tempoHari || 30} Hari</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Diskon Tunai (COD)</span>
                      <span className="font-mono font-bold text-amber-300">
                        {s.diskonCODDefault ? `${s.diskonCODDefault}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {s.minOrder && s.minOrder > 0 ? (
                    <div className="text-[11px] text-slate-300 flex justify-between">
                      <span className="text-slate-400">Minimal Order:</span>
                      <span className="font-mono text-slate-200 font-semibold">
                        Rp {s.minOrder.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ) : null}

                  {s.alamat && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-1 border-t border-white/5">
                      {s.alamat}
                    </p>
                  )}

                  {s.catatan && (
                    <div className="bg-amber-500/10 border border-amber-400/20 p-2 rounded-xl text-[11px] text-amber-200">
                      <span className="font-bold">Ket: </span>
                      {s.catatan}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. MODAL TAMBAH / EDIT PBF */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                {editingSupplier ? 'Edit Rekanan PBF / Supplier' : 'Tambah Rekanan PBF Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-200 mb-1">Kode PBF *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: SMA"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold uppercase focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-200 mb-1">Nama PT / Distributor PBF *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: PT. Sari Mutu Farma"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Nama Sales / PIC</label>
                  <input
                    type="text"
                    placeholder="misal: Bpk. Doni"
                    value={formData.salesNama || ''}
                    onChange={(e) => setFormData({ ...formData, salesNama: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">No. HP / WhatsApp Sales</label>
                  <input
                    type="text"
                    placeholder="misal: 0812-3456-7890"
                    value={formData.salesKontak || ''}
                    onChange={(e) => setFormData({ ...formData, salesKontak: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Jatuh Tempo (Hari)</label>
                  <input
                    type="number"
                    value={formData.tempoHari || 30}
                    onChange={(e) => setFormData({ ...formData, tempoHari: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-sky-300 font-mono font-bold focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Diskon COD (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.diskonCODDefault || 0}
                    onChange={(e) => setFormData({ ...formData, diskonCODDefault: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-amber-300 font-mono font-bold focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Min. Order (Rp)</label>
                  <input
                    type="number"
                    value={formData.minOrder || 0}
                    onChange={(e) => setFormData({ ...formData, minOrder: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 font-mono focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Alamat Kantor / Gudang PBF</label>
                <textarea
                  rows={2}
                  placeholder="Alamat distributor cabang atau gudang..."
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:bg-white/10 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Catatan Khusus / Syarat Order</label>
                <input
                  type="text"
                  placeholder="misal: Free ongkir min 500rb, jadwal kirim Selasa & Kamis..."
                  value={formData.catatan || ''}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:bg-white/10 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{editingSupplier ? 'Simpan Perubahan' : 'Tambah PBF'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
