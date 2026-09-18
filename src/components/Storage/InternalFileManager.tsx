import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderSync,
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
  Save,
  ArrowRight,
  ExternalLink,
  Layers,
  Settings,
  Sparkles,
  Search,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  Lock,
} from 'lucide-react';
import { AppStateData, LocalVaultFile } from '../../types';
import { FileSystemManager } from '../../utils/fileSystem';
import { SavedFilesManager } from './SavedFilesManager';
import {
  loginWithGoogle,
  logoutFirebase,
  saveAppStateToCloud,
  loadAppStateFromCloud,
} from '../../utils/firebase';

interface InternalFileManagerProps {
  appState: AppStateData;
  onUpdateAppState: (newState: AppStateData) => void;
  connectedFolder: { isConnected: boolean; folderName: string };
  onConnectFolder: () => void;
  onDisconnectFolder: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  onOpenFirebaseSync?: () => void;
  currentUser?: any;
  lastCloudSyncTime?: string | null;
  setLastCloudSyncTime?: (time: string | null) => void;
}

export const InternalFileManager: React.FC<InternalFileManagerProps> = ({
  appState,
  onUpdateAppState,
  connectedFolder,
  onConnectFolder,
  onDisconnectFolder,
  onShowToast,
  onOpenConfirmDialog,
  onOpenFirebaseSync,
  currentUser,
  lastCloudSyncTime,
  setLastCloudSyncTime,
}) => {
  const [deviceFiles, setDeviceFiles] = useState<Array<{ name: string; kind: string; size?: number; lastModified?: number }>>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [activeTab, setActiveTab] = useState<'vault' | 'firebase' | 'device' | 'export' | 'settings'>('vault');
  const [isDragOver, setIsDragOver] = useState(false);
  const [settingsForm, setSettingsForm] = useState(appState.settings);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);

  useEffect(() => {
    if (connectedFolder.isConnected) {
      loadDeviceFiles();
    }
  }, [connectedFolder.isConnected]);

  const loadDeviceFiles = async () => {
    setIsLoadingDirectory(true);
    try {
      const files = await FileSystemManager.listFilesInConnectedDirectory();
      setDeviceFiles(files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // Sync entire app state to the connected folder in one click
  const handleSyncAllToConnectedFolder = async () => {
    if (!connectedFolder.isConnected) {
      onConnectFolder();
      return;
    }

    onShowToast('Menyimpan semua data ke folder internal perangkat...', 'info');

    try {
      // 1. JSON full backup
      await FileSystemManager.exportAppStateToJSON(appState);
      // 2. Master list excel
      await FileSystemManager.exportMasterListToExcel(appState?.masterList || []);
      // 3. Price list excel
      await FileSystemManager.exportPriceListToExcel(appState?.priceList || []);

      await loadDeviceFiles();
      onShowToast(`Sinkronisasi selesai! Berkas telah tersimpan di folder "${connectedFolder.folderName}".`, 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast('Gagal melakukan sinkronisasi berkas.', 'error');
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target?.result as string);
            onOpenConfirmDialog(
              'Impor File Backup JSON',
              `File "${file.name}" terdeteksi. Ingin menerapkan data ini ke aplikasi?`,
              () => {
                onUpdateAppState({ ...appState, ...data });
                onShowToast('Database berhasil dipulihkan dari file JSON!', 'success');
              }
            );
          } catch (err) {
            onShowToast('Format file JSON tidak valid', 'error');
          }
        };
        reader.readAsText(file);
      } else {
        onShowToast(`File "${file.name}" terdeteksi. Gunakan fitur impor khusus pada masing-masing tab untuk Excel/PDF.`, 'info');
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppState({
      ...appState,
      settings: settingsForm,
    });
    onShowToast('Profil Apotek & Pengaturan SIPA berhasil diperbarui!', 'success');
  };

  const formatBytes = (bytes = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & INTUITIVE STATUS HERO */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-xs shadow-emerald-500/10">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Manajemen File Internal Perangkat
              </span>
              <span className="text-slate-400 text-xs font-mono">File System Access Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Akses Penyimpanan &amp; Berkas Perangkat
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hubungkan folder kerja di komputer atau gawai Anda untuk menyimpan laporan Excel, PDF, katalog SKU, dan cadangan database secara otomatis dan aman tanpa server luar (100% Offline-First).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {connectedFolder.isConnected ? (
              <div className="flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-500/30 p-2.5 rounded-2xl text-xs w-full sm:w-auto backdrop-blur-md shadow-lg shadow-emerald-950/40">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-1 shadow-sm shadow-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-emerald-300 uppercase font-semibold">Folder Aktif:</p>
                  <p className="font-bold text-white truncate max-w-[200px]">{connectedFolder.folderName}</p>
                </div>
                <button
                  id="btn-sync-all-folder"
                  onClick={handleSyncAllToConnectedFolder}
                  className="bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition cursor-pointer backdrop-blur-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan</span>
                </button>
                <button
                  id="btn-disconnect-folder"
                  onClick={onDisconnectFolder}
                  title="Putuskan sambungan folder"
                  className="p-1.5 hover:bg-rose-500/20 text-rose-300 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-connect-device-folder"
                onClick={onConnectFolder}
                className="bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition cursor-pointer active:scale-95 w-full sm:w-auto justify-center backdrop-blur-md"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Pilih &amp; Hubungkan Folder Lokal</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Storage Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-slate-400 text-[11px] font-medium">Total Master Obat</p>
            <p className="text-base font-bold text-indigo-300">{(appState?.masterList || []).length} SKU</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-slate-400 text-[11px] font-medium">Penawaran PBF</p>
            <p className="text-base font-bold text-amber-300">{(appState?.priceList || []).length} Penawaran</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-slate-400 text-[11px] font-medium">Riwayat Transaksi</p>
            <p className="text-base font-bold text-sky-300">{(appState?.history || []).length} Catatan</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-slate-400 text-[11px] font-medium">Snapshot Vault</p>
            <p className="text-base font-bold text-emerald-300">{(appState?.vaultFiles || []).length} Cadangan</p>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('vault')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'vault'
              ? 'border-indigo-400 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Berkas Tersimpan &amp; Snapshots</span>
          {(appState.vaultFiles || []).length > 0 && (
            <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {(appState.vaultFiles || []).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'firebase'
              ? 'border-amber-400 text-amber-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4 text-amber-400" />
          <span>Firebase Cloud Firestore</span>
          {currentUser && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('device')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'device'
              ? 'border-emerald-400 text-emerald-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderSync className="w-4 h-4 text-emerald-400" />
          <span>Folder Fisik Perangkat</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'export'
              ? 'border-amber-400 text-amber-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Pusat Ekspor &amp; Konversi Berkas</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-sky-400 text-sky-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4 text-sky-400" />
          <span>Profil Apotek &amp; SIPA</span>
        </button>
      </div>

      {/* 3. TAB 1: BERKAS FOLDER PERANGKAT (LIVE LOCAL DIRECTORY EXPLORER) */}
      {activeTab === 'device' && (
        <div className="space-y-4">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  Isi Folder Lokal Terhubung:{' '}
                  <span className="text-emerald-400">
                    {connectedFolder.isConnected ? connectedFolder.folderName : 'Belum Terhubung'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {connectedFolder.isConnected
                    ? 'Daftar berkas yang ada di dalam folder penyimpanan lokal yang Anda hubungkan di perangkat ini.'
                    : 'Pilih direktori folder pada perangkat (misal: "Dokumen/Apotek_Data") untuk mengaktifkan sinkronisasi otomatis.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {connectedFolder.isConnected && (
                  <button
                    onClick={loadDeviceFiles}
                    disabled={isLoadingDirectory}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition cursor-pointer backdrop-blur-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDirectory ? 'animate-spin' : ''}`} />
                    <span>Muat Ulang</span>
                  </button>
                )}
                <button
                  onClick={onConnectFolder}
                  className="px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition cursor-pointer backdrop-blur-md"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{connectedFolder.isConnected ? 'Ganti Folder' : 'Hubungkan Folder'}</span>
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`my-5 p-6 rounded-2xl border-2 border-dashed transition text-center backdrop-blur-md ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-500/10 text-indigo-200 shadow-lg shadow-indigo-500/20'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:border-indigo-400/50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-400/90" />
              <p className="text-xs font-semibold text-white">
                Tarik &amp; Lepaskan (Drag &amp; Drop) Berkas Cadangan JSON atau Excel di Sini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Sistem akan mengenali format data dan memproses sinkronisasi secara instan.
              </p>
            </div>

            {/* Directory Files List */}
            {connectedFolder.isConnected ? (
              <div className="overflow-x-auto mt-4 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                {deviceFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <p>Folder "{connectedFolder.folderName}" masih kosong atau belum ada berkas laporan.</p>
                    <button
                      onClick={handleSyncAllToConnectedFolder}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-500/20 border border-indigo-400/30"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Simpan Data Saat Ini ke Folder
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-950/80 backdrop-blur-xl text-slate-200 font-semibold border-b border-white/10">
                      <tr>
                        <th className="p-3">NAMA BERKAS</th>
                        <th className="p-3">TIPE</th>
                        <th className="p-3 text-right">UKURAN</th>
                        <th className="p-3 text-center">TERAKHIR DIUBAH</th>
                        <th className="p-3 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {deviceFiles.map((file, idx) => {
                        const isJson = file.name.endsWith('.json');
                        const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
                        const isPdf = file.name.endsWith('.pdf');

                        return (
                          <tr key={idx} className="hover:bg-white/[0.05] transition-colors">
                            <td className="p-3 font-semibold text-white flex items-center gap-2">
                              {isJson ? (
                                <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : isXlsx ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : isPdf ? (
                                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                              ) : (
                                <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                              )}
                              <span className="truncate max-w-xs">{file.name}</span>
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">
                              {isJson ? 'JSON Backup' : isXlsx ? 'Spreadsheet Excel' : isPdf ? 'Dokumen PDF' : 'Berkas'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-200">{formatBytes(file.size)}</td>
                            <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                              {file.lastModified ? new Date(file.lastModified).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-[11px] text-emerald-300 font-medium bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs shadow-emerald-500/10">
                                Tersimpan di Perangkat
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 space-y-3 backdrop-blur-md">
                <FolderSync className="w-10 h-10 mx-auto text-indigo-400/80 animate-pulse" />
                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-white">Folder Perangkat Belum Terhubung</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktifkan izin akses folder internal sekali saja. Setelah terhubung, berkas laporan usulan pembelian, perhitungan, dan master SKU akan otomatis tersimpan langsung di folder pilihan Anda.
                  </p>
                </div>
                <button
                  onClick={onConnectFolder}
                  className="px-5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer backdrop-blur-md"
                >
                  <FolderOpen className="w-4 h-4" />
                  Pilih Folder Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 1 (DEFAULT): DAFTAR & MANAJEMEN BERKAS TERSIMPAN (SNAPSHOTS & VAULT) */}
      {activeTab === 'vault' && (
        <SavedFilesManager
          appState={appState}
          onUpdateAppState={onUpdateAppState}
          onShowToast={onShowToast}
          onOpenConfirmDialog={onOpenConfirmDialog}
          connectedFolder={connectedFolder}
          onConnectFolder={onConnectFolder}
        />
      )}

      {/* 4.5. TAB FIREBASE: CLOUD FIRESTORE SYNCHRONIZATION */}
      {activeTab === 'firebase' && (
        <div className="space-y-4">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-amber-400" /> Google Cloud Firestore
                  </span>
                  <span className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> ABAC Rules Deployed
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Sinkronisasi Cloud Firestore Apotek
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Simpan dan pulihkan database apotek secara real-time ke Google Cloud Firestore. Akses master SKU, riwayat, dan pesanan obat Anda dari komputer kasir, apoteker, maupun smartphone secara aman.
                </p>
              </div>

              {onOpenFirebaseSync && (
                <button
                  onClick={onOpenFirebaseSync}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Buka Dialog Sinkronisasi</span>
                </button>
              )}
            </div>

            {/* Account Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    className="w-12 h-12 rounded-2xl border border-indigo-400/30 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Cloud className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">
                      {currentUser ? currentUser.displayName || 'Pengguna Apotek' : 'Belum Masuk ke Firebase'}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        currentUser
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {currentUser ? 'Akun Terhubung' : 'Offline Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser ? currentUser.email : 'Masuk dengan akun Google untuk mengaktifkan sinkronisasi cloud'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {currentUser ? (
                  <button
                    onClick={async () => {
                      try {
                        await logoutFirebase();
                        onShowToast('Logout Berhasil', 'info');
                      } catch (e: any) {
                        onShowToast(e.message, 'error');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const u = await loginWithGoogle();
                        onShowToast(`Berhasil Masuk: Selamat datang, ${u.displayName || u.email}!`, 'success');
                      } catch (e: any) {
                        onShowToast(`Gagal Masuk: ${e.message}`, 'error');
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Masuk dengan Google</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <CloudUpload className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white pt-1">Unggah ke Firestore Cloud</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Kirim snapshot database aktif ({appState.masterList.length} SKU Master, {appState.history.length} Riwayat) ke Firestore agar dapat diakses dari perangkat lain.
                  </p>
                </div>
                <button
                  disabled={!currentUser || isFirebaseSyncing}
                  onClick={async () => {
                    if (!currentUser) {
                      onShowToast('Silakan login dengan Google terlebih dahulu', 'warning');
                      return;
                    }
                    setIsFirebaseSyncing(true);
                    try {
                      await saveAppStateToCloud(currentUser.uid, appState, appState.settings.namaApotek);
                      const nowStr = new Date().toLocaleTimeString('id-ID');
                      if (setLastCloudSyncTime) setLastCloudSyncTime(nowStr);
                      onShowToast(`Database Berhasil Disimpan ke Cloud! (Pukul ${nowStr})`, 'success');
                    } catch (e: any) {
                      onShowToast(`Gagal Menyimpan ke Cloud: ${e.message}`, 'error');
                    } finally {
                      setIsFirebaseSyncing(false);
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{isFirebaseSyncing ? 'Mengunggah...' : 'Unggah Database Sekarang'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CloudDownload className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white pt-1">Pulihkan dari Firestore Cloud</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tarik dan timpa lembar kerja lokal dengan data master &amp; riwayat apotek terbaru yang tersimpan di cloud.
                  </p>
                </div>
                <button
                  disabled={!currentUser || isFirebaseSyncing}
                  onClick={async () => {
                    if (!currentUser) {
                      onShowToast('Silakan login dengan Google terlebih dahulu', 'warning');
                      return;
                    }
                    onOpenConfirmDialog(
                      'Pulihkan Data dari Firestore Cloud',
                      'Apakah Anda yakin ingin memuat data apotek terbaru dari cloud? Lembar kerja aktif saat ini akan diperbarui dengan data cloud.',
                      async () => {
                        setIsFirebaseSyncing(true);
                        try {
                          const cloudData = await loadAppStateFromCloud(currentUser.uid);
                          if (!cloudData) {
                            onShowToast('Data Cloud Kosong: Belum ada data apotek tersimpan di Firestore.', 'info');
                            return;
                          }
                          onUpdateAppState(cloudData);
                          const nowStr = new Date().toLocaleTimeString('id-ID');
                          if (setLastCloudSyncTime) setLastCloudSyncTime(nowStr);
                          onShowToast(`Database Berhasil Dipulihkan dari Cloud! (Pukul ${nowStr})`, 'success');
                        } catch (e: any) {
                          onShowToast(`Gagal Memuat dari Cloud: ${e.message}`, 'error');
                        } finally {
                          setIsFirebaseSyncing(false);
                        }
                      }
                    );
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>Pulihkan dari Cloud</span>
                </button>
              </div>
            </div>

            {/* Infrastructure Details */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Spesifikasi &amp; Infrastruktur Firebase</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Project ID:</span>
                  <span className="text-white font-bold">smooth-tractor-qd2jw</span>
                </div>
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Region:</span>
                  <span className="text-white font-bold">asia-southeast1</span>
                </div>
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Terakhir Sinkron:</span>
                  <span className="text-amber-300 font-bold">{lastCloudSyncTime || 'Belum ada'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: PUSAT EKSPOR & KONVERSI BERKAS */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Perhitungan Reguler */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Reguler
                </span>
                <span className="text-slate-400 text-xs font-mono">{appState.rows.reguler.length} Item</span>
              </div>
              <h4 className="text-sm font-bold text-white">Lembar Perhitungan Reguler</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ekspor rincian HNA, Diskon %, HPP 11%, dan kuantitas pesanan obat kategori reguler ke berkas Excel.
              </p>
            </div>
            <button
              onClick={() =>
                FileSystemManager.exportPerhitunganToExcel(
                  appState.rows.reguler,
                  'reguler',
                  appState.diskonCOD.reguler,
                  appState.settings.namaApotek
                )
              }
              className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-emerald-500/10"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Simpan Excel (.xlsx)</span>
            </button>
          </div>

          {/* Card 2: Usulan Pembelian PDF */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Dokumen Resmi
                </span>
                <span className="text-slate-400 text-xs font-mono">PDF Siap Cetak</span>
              </div>
              <h4 className="text-sm font-bold text-white">Usulan Pengadaan Resmi (PDF)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dokumen resmi pengadaan obat lengkap dengan kop apotek, SIPA, history harga, dan tanda tangan penanggung jawab.
              </p>
            </div>
            <button
              onClick={() =>
                FileSystemManager.exportUsulanToPDF(
                  appState.rows.reguler,
                  'reguler',
                  appState.diskonCOD.reguler,
                  appState.settings
                )
              }
              className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-rose-500/10"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Cetak &amp; Simpan PDF</span>
            </button>
          </div>

          {/* Card 3: Master Data & SKU */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Master SKU
                </span>
                <span className="text-slate-400 text-xs font-mono">{(appState?.masterList || []).length} SKU</span>
              </div>
              <h4 className="text-sm font-bold text-white">Katalog Master Obat &amp; SKU</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ekspor seluruh database obat, kode barcode SKU, pabrik, kemasan, supplier utama, dan sisa stok.
              </p>
            </div>
            <button
              onClick={() => FileSystemManager.exportMasterListToExcel(appState?.masterList || [])}
              className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-amber-500/10"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Simpan Master Excel</span>
            </button>
          </div>

          {/* Card 4: Price List Komparasi */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Komparasi PBF
                </span>
                <span className="text-slate-400 text-xs font-mono">{appState.priceList.length} Entri</span>
              </div>
              <h4 className="text-sm font-bold text-white">Daftar Penawaran Harga PBF</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ekspor komparasi penawaran harga distributor/PBF, diskon, HPP bersih, dan tanggal update.
              </p>
            </div>
            <button
              onClick={() => FileSystemManager.exportPriceListToExcel(appState.priceList)}
              className="w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-indigo-500/10"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>Simpan List Harga Excel</span>
            </button>
          </div>

          {/* Card 5: Riwayat Pembelian */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Riwayat
                </span>
                <span className="text-slate-400 text-xs font-mono">{appState.history.length} Transaksi</span>
              </div>
              <h4 className="text-sm font-bold text-white">Log Riwayat Pembelian</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rekapitulasi seluruh pembelanjaan obat yang telah disimpan ke riwayat untuk keperluan audit.
              </p>
            </div>
            <button
              onClick={() => FileSystemManager.exportHistoryToExcel(appState.history)}
              className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg shadow-sky-500/10"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>Simpan Riwayat Excel</span>
            </button>
          </div>

          {/* Card 6: Full JSON Backup */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase backdrop-blur-md">
                  Full Database
                </span>
                <span className="text-slate-400 text-xs font-mono">100% Komplit</span>
              </div>
              <h4 className="text-sm font-bold text-white">Cadangan Total JSON (Semua Modul)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mencakup 3 kategori obat, riwayat, master data, pengaturan apotek, dan penawaran harga.
              </p>
            </div>
            <button
              onClick={() => FileSystemManager.exportAppStateToJSON(appState)}
              className="w-full py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-500/20 border border-indigo-400/30 backdrop-blur-md"
            >
              <Download className="w-4 h-4" />
              <span>Simpan Cadangan JSON</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB 4: SETTINGS & APOTEK PROFILE */}
      {activeTab === 'settings' && (
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-7 max-w-2xl shadow-2xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <Settings className="w-4 h-4 text-sky-400" />
            Pengaturan Apotek &amp; Informasi SIPA
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">Nama Sarana Apotek / Klinik</label>
              <input
                type="text"
                value={settingsForm.namaApotek}
                onChange={(e) => setSettingsForm({ ...settingsForm, namaApotek: e.target.value })}
                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">Alamat Lengkap Apotek</label>
              <input
                type="text"
                value={settingsForm.alamatApotek}
                onChange={(e) => setSettingsForm({ ...settingsForm, alamatApotek: e.target.value })}
                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Nama Apoteker Pengelola (APA)</label>
                <input
                  type="text"
                  value={settingsForm.namaApoteker}
                  onChange={(e) => setSettingsForm({ ...settingsForm, namaApoteker: e.target.value })}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Nomor SIPA / STRA</label>
                <input
                  type="text"
                  value={settingsForm.sipaNo}
                  onChange={(e) => setSettingsForm({ ...settingsForm, sipaNo: e.target.value })}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden backdrop-blur-md"
                />
              </div>
            </div>

            <div className="pt-3.5 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition cursor-pointer backdrop-blur-md"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
