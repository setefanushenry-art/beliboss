import React, { useState, useMemo } from 'react';
import {
  Database,
  FileSpreadsheet,
  FileText,
  FileCode,
  HardDrive,
  Download,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  RefreshCw,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Eye,
  Copy,
  Plus,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { AppStateData, LocalVaultFile } from '../../types';
import { FileSystemManager } from '../../utils/fileSystem';

interface SavedFilesManagerProps {
  appState: AppStateData;
  onUpdateAppState: (newState: AppStateData) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  connectedFolder?: { isConnected: boolean; folderName: string };
  onConnectFolder?: () => void;
}

export const SavedFilesManager: React.FC<SavedFilesManagerProps> = ({
  appState,
  onUpdateAppState,
  onShowToast,
  onOpenConfirmDialog,
  connectedFolder,
  onConnectFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'backup' | 'json' | 'xlsx' | 'pdf'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [previewFile, setPreviewFile] = useState<LocalVaultFile | null>(null);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Format bytes helper
  const formatBytes = (bytes = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const vaultFiles = appState.vaultFiles || [];

  // Filter & Sort files
  const filteredAndSortedFiles = useMemo(() => {
    return vaultFiles
      .filter((file) => {
        const matchesType = filterType === 'all' || file.type === filterType;
        const matchesSearch =
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (file.category && file.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
          file.timestamp.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
        if (sortBy === 'oldest') return a.id.localeCompare(b.id);
        // Default: newest first
        return b.id.localeCompare(a.id);
      });
  }, [vaultFiles, filterType, searchQuery, sortBy]);

  // Create Snapshot / Save File
  const handleCreateSnapshot = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
    const cleanLabel = newSnapshotLabel.trim() || `Snapshot_${appState.settings?.namaApotek?.replace(/[^a-zA-Z0-9]/g, '_') || 'Apotek'}_${todayStr}_${timeStr}`;
    const fileName = cleanLabel.endsWith('.json') ? cleanLabel : `${cleanLabel}.json`;

    const totalItems =
      (appState.rows?.reguler?.length || 0) +
      (appState.rows?.prekursor?.length || 0) +
      (appState.rows?.oot?.length || 0) +
      (appState.masterList?.length || 0) +
      (appState.priceList?.length || 0);

    const newVaultFile: LocalVaultFile = {
      id: 'vf_' + Date.now(),
      name: fileName,
      size: JSON.stringify(appState).length,
      type: 'backup',
      timestamp: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      category: 'Cadangan Database Komplit',
      itemCount: totalItems,
      jsonData: JSON.parse(JSON.stringify(appState)),
    };

    const updatedVault = [newVaultFile, ...vaultFiles];
    onUpdateAppState({
      ...appState,
      vaultFiles: updatedVault,
    });

    setNewSnapshotLabel('');
    setIsCreatingSnapshot(false);
    onShowToast(`Berkas cadangan "${fileName}" berhasil dibuat dan disimpan di Vault!`, 'success');
  };

  // Start Renaming File
  const handleStartRename = (file: LocalVaultFile) => {
    setEditingFileId(file.id);
    setNewFileName(file.name);
  };

  // Save Renamed File
  const handleSaveRename = (fileId: string) => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      onShowToast('Nama berkas tidak boleh kosong', 'warning');
      return;
    }

    const currentFile = vaultFiles.find((f) => f.id === fileId);
    let finalName = trimmed;
    // Retain extension if missing
    if (currentFile && currentFile.name.includes('.') && !finalName.includes('.')) {
      const ext = currentFile.name.split('.').pop();
      finalName = `${finalName}.${ext}`;
    }

    const updated = vaultFiles.map((f) => (f.id === fileId ? { ...f, name: finalName } : f));
    onUpdateAppState({
      ...appState,
      vaultFiles: updated,
    });

    setEditingFileId(null);
    onShowToast(`Nama berkas berhasil diubah menjadi "${finalName}"`, 'success');
  };

  // Cancel Renaming
  const handleCancelRename = () => {
    setEditingFileId(null);
    setNewFileName('');
  };

  // Delete Single File
  const handleDeleteFile = (file: LocalVaultFile) => {
    onOpenConfirmDialog(
      'Hapus Berkas Tersimpan',
      `Apakah Anda yakin ingin menghapus berkas "${file.name}" yang tersimpan pada ${file.timestamp}? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        const updated = vaultFiles.filter((f) => f.id !== file.id);
        onUpdateAppState({
          ...appState,
          vaultFiles: updated,
        });
        if (previewFile?.id === file.id) setPreviewFile(null);
        onShowToast(`Berkas "${file.name}" telah dihapus dari daftar tersimpan.`, 'info');
      }
    );
  };

  // Bulk Clear All Files
  const handleClearAllFiles = () => {
    if (vaultFiles.length === 0) return;
    onOpenConfirmDialog(
      'Hapus Semua Berkas Tersimpan',
      `Apakah Anda yakin ingin mengosongkan seluruh (${vaultFiles.length}) berkas cadangan dan snapshot dari Vault Internal?`,
      () => {
        onUpdateAppState({
          ...appState,
          vaultFiles: [],
        });
        setPreviewFile(null);
        onShowToast('Seluruh berkas cadangan di Vault berhasil dikosongkan.', 'info');
      }
    );
  };

  // Restore State from Vault File
  const handleRestoreFile = (file: LocalVaultFile) => {
    if (!file.jsonData) {
      onShowToast('Data snapshot tidak memiliki struktur valid', 'error');
      return;
    }

    onOpenConfirmDialog(
      'Pulihkan Data Apotek',
      `Ingin menerapkan seluruh data obat, master SKU, riwayat, dan penawaran dari "${file.name}"? Data di lembar kerja aktif akan diperbarui sesuai snapshot ini.`,
      () => {
        onUpdateAppState({
          ...file.jsonData,
          vaultFiles: vaultFiles, // keep vault history intact
        });
        onShowToast(`Database apotek berhasil dipulihkan dari "${file.name}"!`, 'success');
      }
    );
  };

  // Download Individual Saved File to Device
  const handleDownloadFile = (file: LocalVaultFile) => {
    try {
      const dataToDownload = file.jsonData || file.dataBase64 || appState;
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      FileSystemManager.triggerDirectDownload(blob, file.name || `Backup_${file.id}.json`);
      onShowToast(`Berkas "${file.name}" telah diunduh ke perangkat Anda.`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal mengunduh berkas.', 'error');
    }
  };

  // Total vault storage size
  const totalVaultBytes = vaultFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & STORAGE METRICS */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" /> Vault &amp; Berkas Tersimpan
              </span>
              <span className="text-slate-400 text-xs font-mono">100% Offline Safe</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              Daftar &amp; Manajemen Berkas Tersimpan
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kelola titik pemulihan database apotek, ganti nama berkas cadangan, unduh laporan, atau hapus cadangan lama dengan aman.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-create-snapshot"
              onClick={() => setIsCreatingSnapshot((prev) => !prev)}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition cursor-pointer active:scale-95 backdrop-blur-md"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Cadangan Baru</span>
            </button>
          </div>
        </div>

        {/* Create Snapshot Inline Panel */}
        {isCreatingSnapshot && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              placeholder={`Contoh: Backup_Apotek_AkhirBulan (Opsional)`}
              value={newSnapshotLabel}
              onChange={(e) => setNewSnapshotLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSnapshot();
                if (e.key === 'Escape') setIsCreatingSnapshot(false);
              }}
              className="w-full sm:flex-1 px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-400"
              autoFocus
            />
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsCreatingSnapshot(false)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* Metric Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-0.5">Total Berkas Vault</span>
            <span className="text-base font-extrabold text-indigo-300 font-mono">
              {vaultFiles.length} Berkas
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-0.5">Ruang Penyimpanan</span>
            <span className="text-base font-extrabold text-emerald-300 font-mono">
              {formatBytes(totalVaultBytes)}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-0.5">Status Folder Lokal</span>
            <span className="text-xs font-bold text-slate-200 truncate block">
              {connectedFolder?.isConnected ? connectedFolder.folderName : 'Belum Terhubung'}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Pembersihan</span>
              <span className="text-xs text-slate-300 font-semibold">Kelola Ruang</span>
            </div>
            {vaultFiles.length > 0 && (
              <button
                onClick={handleClearAllFiles}
                className="text-[10px] text-rose-300 hover:text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 px-2 py-1 rounded-lg transition cursor-pointer font-bold"
                title="Hapus semua berkas di Vault"
              >
                Kosongkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SEARCH, FILTER, AND SORT TOOLBAR */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-3.5 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama berkas, tanggal, atau tipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-hidden focus:border-indigo-400 focus:bg-white/10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({vaultFiles.length})
            </button>
            <button
              onClick={() => setFilterType('backup')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                filterType === 'backup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Snapshot ({vaultFiles.filter((f) => f.type === 'backup').length})
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-semibold focus:outline-hidden focus:border-indigo-400 cursor-pointer"
            >
              <option value="newest" className="bg-slate-900 text-white">Terbaru</option>
              <option value="oldest" className="bg-slate-900 text-white">Terlama</option>
              <option value="name" className="bg-slate-900 text-white">Nama (A-Z)</option>
              <option value="size" className="bg-slate-900 text-white">Ukuran Terbesar</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. SAVED FILES LIST / CARDS */}
      <div className="space-y-3">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-white">Belum Ada Berkas Tersimpan</h3>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? `Tidak ada berkas yang cocok dengan pencarian "${searchQuery}".`
                  : 'Buat cadangan (snapshot) data apotek Anda sekarang agar selalu aman dan dapat dipulihkan kapan saja.'}
              </p>
            </div>
            <button
              onClick={() => setIsCreatingSnapshot(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Snapshot Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredAndSortedFiles.map((file) => {
              const isEditing = editingFileId === file.id;
              const isJson = file.name.endsWith('.json') || file.type === 'backup' || file.type === 'json';
              const isXlsx = file.name.endsWith('.xlsx') || file.type === 'xlsx';
              const isPdf = file.name.endsWith('.pdf') || file.type === 'pdf';

              return (
                <div
                  key={file.id}
                  className="bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-2xl border border-white/10 hover:border-indigo-400/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-xl group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Icon & File Details */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {isJson ? (
                        <FileCode className="w-5 h-5 text-indigo-400" />
                      ) : isXlsx ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      ) : isPdf ? (
                        <FileText className="w-5 h-5 text-rose-400" />
                      ) : (
                        <HardDrive className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-full max-w-md">
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(file.id);
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            className="w-full px-2.5 py-1 bg-slate-900 border border-indigo-400 rounded-lg text-white font-semibold text-xs focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(file.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                            title="Simpan nama baru (Enter)"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition cursor-pointer"
                            title="Batal (Esc)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-xs sm:text-sm tracking-tight truncate max-w-[280px] sm:max-w-md">
                            {file.name}
                          </h4>
                          <button
                            onClick={() => handleStartRename(file)}
                            className="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-indigo-300 p-0.5 transition cursor-pointer"
                            title="Ganti nama berkas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Sub-info metadata */}
                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {file.timestamp}
                        </span>
                        <span>&bull;</span>
                        <span className="text-slate-300">{formatBytes(file.size)}</span>
                        {file.itemCount !== undefined && file.itemCount > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded text-[10px] font-bold">
                              {file.itemCount} Item SKU
                            </span>
                          </>
                        )}
                        {file.category && (
                          <span className="text-slate-400 bg-white/5 px-1.5 py-0.2 rounded text-[10px]">
                            {file.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Restore, Download, Preview, Delete) */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {/* Preview Button */}
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1"
                      title="Lihat rincian snapshot"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden md:inline">Detail</span>
                    </button>

                    {/* Restore Button (for snapshot JSONs) */}
                    {file.jsonData && (
                      <button
                        onClick={() => handleRestoreFile(file)}
                        className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-500/30 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Pulihkan database dari snapshot ini"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Pulihkan</span>
                      </button>
                    )}

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1"
                      title="Unduh berkas ke perangkat"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden md:inline">Unduh</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1.5 sm:p-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition cursor-pointer"
                      title="Hapus berkas ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FILE DETAILS & PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-6 max-w-xl w-full text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <Database className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">{previewFile.name}</h3>
                  <p className="text-[11px] text-slate-400">{previewFile.timestamp} &bull; {formatBytes(previewFile.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content summary */}
            {previewFile.jsonData ? (
              <div className="space-y-3 text-xs">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-300 block uppercase tracking-wider">
                    Ringkasan Isi Snapshot Database:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Apotek: </span>
                      <strong className="text-white">{previewFile.jsonData.settings?.namaApotek || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Apoteker APA: </span>
                      <strong className="text-white">{previewFile.jsonData.settings?.namaApoteker || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Master Obat: </span>
                      <strong className="text-emerald-300 font-mono">{previewFile.jsonData.masterList?.length || 0} SKU</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Penawaran PBF: </span>
                      <strong className="text-amber-300 font-mono">{previewFile.jsonData.priceList?.length || 0} Entri</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Riwayat Pengadaan: </span>
                      <strong className="text-sky-300 font-mono">{previewFile.jsonData.history?.length || 0} Transaksi</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Data PBF Supplier: </span>
                      <strong className="text-purple-300 font-mono">{previewFile.jsonData.suppliers?.length || 0} Supplier</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 max-h-40 overflow-y-auto font-mono text-[10px] text-slate-300">
                  <pre>{JSON.stringify(previewFile.jsonData, null, 2).slice(0, 1500)}...</pre>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                Berkas ini tidak menyertakan rincian JSON langsung.
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <button
                onClick={() => handleDownloadFile(previewFile)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas</span>
              </button>

              <div className="flex items-center gap-2">
                {previewFile.jsonData && (
                  <button
                    onClick={() => {
                      const f = previewFile;
                      setPreviewFile(null);
                      handleRestoreFile(f);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Terapkan Pemulihan</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
