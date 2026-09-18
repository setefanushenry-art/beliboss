import React, { useState } from 'react';
import {
  Pill,
  Package,
  Activity,
  AlertCircle,
  AlertTriangle,
  Tag,
  Database,
  History,
  HardDrive,
  FolderSync,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  Plus,
  FileSpreadsheet,
  FileText,
  Image,
  Printer,
  Settings,
  FolderOpen,
  Sparkles,
  Truck,
  Building2,
  ChevronDown,
  Menu,
  X,
  Wifi,
  WifiOff,
  Smartphone,
  Layers,
  ClipboardList,
  Home,
  Cloud,
} from 'lucide-react';
import { DrugCategory, MainNavTab, SubNavTab, PharmacyProfile } from '../../types';

interface NavbarProps {
  currentCategory: DrugCategory;
  onSelectCategory: (cat: DrugCategory) => void;
  currentMainTab: MainNavTab;
  onSelectMainTab: (tab: MainNavTab) => void;
  currentSubTab: SubNavTab;
  onSelectSubTab: (sub: SubNavTab) => void;
  connectedFolder: { isConnected: boolean; folderName: string };
  onConnectFolder: () => void;
  onExportBackupJSON: () => void;
  onImportBackupJSON: () => void;
  onOpenSettings: () => void;
  activePharmacy?: PharmacyProfile;
  supplierCount?: number;
  defektaCount?: number;
  defektaAlertCount?: number;
  usulanCount?: number;
  isOnline?: boolean;
  // Transaksi actions
  onAddRow?: () => void;
  onResetSheet?: () => void;
  onCommitHistory?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onExportPNG?: () => void;
  onPrint?: () => void;
  onImportExcelPerhitungan?: () => void;
  // Autosave & Session recovery
  lastSavedTime?: string;
  isAutosaving?: boolean;
  onRecoverSession?: () => void;
  hasSessionDraft?: boolean;
  // Stats
  activeRowCount: number;
  totalEstimasiValue: number;
  // Firebase Cloud Sync
  onOpenFirebaseSync?: () => void;
  currentUser?: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  currentMainTab,
  onSelectMainTab,
  currentSubTab,
  onSelectSubTab,
  connectedFolder,
  onConnectFolder,
  onExportBackupJSON,
  onImportBackupJSON,
  onOpenSettings,
  activePharmacy,
  supplierCount = 0,
  defektaCount = 0,
  defektaAlertCount = 0,
  usulanCount = 0,
  isOnline = true,
  onAddRow,
  onResetSheet,
  onCommitHistory,
  onExportExcel,
  onExportPDF,
  onExportPNG,
  onPrint,
  onImportExcelPerhitungan,
  lastSavedTime,
  isAutosaving,
  onRecoverSession,
  hasSessionDraft,
  activeRowCount,
  totalEstimasiValue,
  onOpenFirebaseSync,
  currentUser,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 text-slate-100 shadow-2xl no-print">
        {/* 1. TOP BRAND & QUICK STATUS BAR */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex justify-between items-center gap-2 border-b border-white/5">
          {/* App Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-indigo-600/40 backdrop-blur-xl flex items-center justify-center border border-indigo-400/30 shadow-lg shadow-indigo-500/20 text-white font-black shrink-0">
              <Pill className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  FarmasiPro
                </h1>
                {/* Online / Offline status badge */}
                <div
                  title={
                    isOnline
                      ? 'Koneksi Online: Data lokal otomatis disinkronkan'
                      : 'Mode Offline: 100% Berjalan Mandiri Tanpa Internet & Data Tersimpan Aman di Perangkat'
                  }
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border backdrop-blur-md transition-all ${
                    isOnline
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                  }`}
                >
                  {isOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5 text-amber-300" />
                      <span>Offline Mode</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal truncate max-w-[210px] sm:max-w-none">
                Perhitungan HNA/HPP &amp; Pengadaan Obat Apotek
              </p>
            </div>
          </div>

          {/* Active Pharmacy Chip, Storage & Settings Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Active Pharmacy Profile Chip */}
            <button
              onClick={onOpenSettings}
              title="Klik untuk mengganti sarana apotek aktif atau mengedit SIPA"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-400/30 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 backdrop-blur-xl cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="max-w-[100px] sm:max-w-[180px] truncate font-bold text-[11px]">
                {activePharmacy?.namaApotek || 'Apotek Aktif'}
              </span>
              <ChevronDown className="w-3 h-3 text-indigo-300/80 shrink-0" />
            </button>

            {/* Internal Device Directory Connection Chip (Desktop) */}
            <button
              id="navbar-connect-folder-btn"
              onClick={onConnectFolder}
              title="Klik untuk memilih folder lokal di perangkat sebagai direktori penyimpanan otomatis"
              className={`hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-2 transition border backdrop-blur-xl cursor-pointer ${
                connectedFolder.isConnected
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 shadow-lg shadow-emerald-500/10'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <FolderSync className={`w-3.5 h-3.5 ${connectedFolder.isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="max-w-[120px] sm:max-w-[160px] truncate text-[11px]">
                {connectedFolder.isConnected ? connectedFolder.folderName : 'Folder Perangkat'}
              </span>
            </button>

            {/* Backup / Import JSON Dropdown (Desktop) */}
            <div className="hidden md:flex items-center bg-white/5 backdrop-blur-xl rounded-xl p-0.5 border border-white/10">
              <button
                id="navbar-export-backup-btn"
                onClick={onExportBackupJSON}
                title="Simpan Cadangan Database JSON Lengkap"
                className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-medium pr-1">Backup</span>
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                id="navbar-import-backup-btn"
                onClick={onImportBackupJSON}
                title="Muat Cadangan Database JSON dari File Manager"
                className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium pr-1">Restore</span>
              </button>
            </div>

            {/* Firebase Cloud Firestore Sync Button (Desktop) */}
            {onOpenFirebaseSync && (
              <button
                id="navbar-firebase-sync-btn"
                onClick={onOpenFirebaseSync}
                title={
                  currentUser
                    ? `Firebase Firestore: Terhubung (${currentUser.displayName || currentUser.email}) - Klik untuk sinkronisasi`
                    : 'Firebase Cloud Firestore: Masuk untuk sinkronisasi cloud real-time'
                }
                className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 transition border backdrop-blur-xl cursor-pointer ${
                  currentUser
                    ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25 shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 ${currentUser ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold">
                  {currentUser ? 'Cloud Sync' : 'Firebase'}
                </span>
                {currentUser && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            )}

            {/* Real-time Autosave Status Indicator */}
            <div
              title="Autosave Aktif: Setiap ketikan di input manual langsung tersimpan otomatis ke penyimpanan lokal tanpa perlu klik tombol simpan"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold select-none"
            >
              <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-[11px]">{isAutosaving ? 'Menyimpan...' : 'Autosave Aktif'}</span>
              {lastSavedTime && (
                <span className="font-mono text-[10px] text-emerald-400/80 font-normal">
                  ({lastSavedTime})
                </span>
              )}
            </div>

            {/* Recover Last Session Button */}
            {onRecoverSession && (
              <button
                id="navbar-recover-session-btn"
                onClick={onRecoverSession}
                title="Pulihkan draf dokumen harian terakhir dari sesi browser (Recover Last Session)"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-amber-400/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 backdrop-blur-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[11px]">Recover Session</span>
              </button>
            )}

            {/* Settings button */}
            <button
              id="navbar-settings-btn"
              onClick={onOpenSettings}
              title="Pengaturan Apotek Pilihan & Parameter Sistem"
              className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-xl backdrop-blur-xl transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Mobile Menu Drawer Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="sm:hidden p-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-white rounded-xl backdrop-blur-xl transition cursor-pointer"
              title="Buka Menu & Opsi Mobile"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. DESKTOP PRIMARY NAVIGATION TABS (INTUITIVE DATA MANAGEMENT NAV) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 hidden sm:flex items-center justify-between overflow-x-auto scrollbar-none pt-1">
          <nav className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold py-1">
            {/* 1. BERANDA (Transaksi Perhitungan & Usulan SP) */}
            <button
              id="nav-tab-beranda"
              onClick={() => onSelectMainTab('transaksi')}
              className={`px-3.5 py-2 rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'transaksi'
                  ? 'bg-indigo-600/30 text-indigo-200 font-bold border-b-2 border-indigo-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Beranda: Perhitungan Pengadaan & Usulan SP"
            >
              <Home className="w-4 h-4 text-indigo-400" />
              <span>BERANDA</span>
              {activeRowCount > 0 && (
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {activeRowCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-white/10 self-center mx-1" />

            {/* 2. LOGISTIK & DATA MASTER MODULES */}
            <button
              id="nav-tab-usulan-obat"
              onClick={() => onSelectMainTab('usulan_obat')}
              className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'usulan_obat'
                  ? 'bg-teal-500/25 text-teal-200 font-bold border-b-2 border-teal-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Daftar Usulan Obat Masuk"
            >
              <ClipboardList className="w-4 h-4 text-teal-400" />
              <span>USULAN OBAT</span>
              {usulanCount > 0 && (
                <span className="bg-teal-500/30 text-teal-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {usulanCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-pbf"
              onClick={() => onSelectMainTab('pbf')}
              className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'pbf'
                  ? 'bg-amber-500/20 text-amber-200 font-bold border-b-2 border-amber-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Direktori Data PBF / Supplier"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>DATA PBF</span>
              {supplierCount > 0 && (
                <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {supplierCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-pricelist"
              onClick={() => onSelectMainTab('pricelist')}
              className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'pricelist'
                  ? 'bg-purple-500/20 text-purple-200 font-bold border-b-2 border-purple-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Komparasi & Analisis Harga PBF"
            >
              <Tag className="w-4 h-4 text-purple-400" />
              <span>KOMPARASI PBF</span>
            </button>

            <button
              id="nav-tab-master"
              onClick={() => onSelectMainTab('master')}
              className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'master'
                  ? 'bg-indigo-500/25 text-indigo-200 font-bold border-b-2 border-indigo-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Master SKU & Katalog Obat"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>MASTER SKU</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onSelectMainTab('history')}
              className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'history'
                  ? 'bg-sky-500/25 text-sky-200 font-bold border-b-2 border-sky-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Riwayat Pembelian & Log Audit Pengadaan"
            >
              <History className="w-4 h-4 text-sky-400" />
              <span>RIWAYAT</span>
            </button>

            <div className="w-px h-5 bg-white/10 self-center mx-1" />

            {/* 3. FILE TERSIMPAN (Internal Disk & Vault) */}
            <button
              id="nav-tab-storage"
              onClick={() => onSelectMainTab('storage')}
              className={`px-3.5 py-2 rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap backdrop-blur-md ${
                currentMainTab === 'storage'
                  ? 'bg-emerald-500/25 text-emerald-200 font-bold border-b-2 border-emerald-400 shadow-inner'
                  : 'text-emerald-400/90 hover:text-emerald-200 hover:bg-white/5'
              }`}
              title="File Tersimpan: Penyimpanan Internal Berkas & Cadangan"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="flex items-center gap-1.5">
                FILE TERSIMPAN
                <span className="bg-emerald-500/30 text-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                  DISK
                </span>
              </span>
            </button>

            {/* 4. PENGATURAN (Settings) */}
            <button
              id="nav-tab-settings"
              onClick={onOpenSettings}
              className="px-3.5 py-2 rounded-t-xl text-slate-400 hover:text-amber-200 hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap backdrop-blur-md"
              title="Pengaturan Apotek Pilihan, SIPA & Sistem"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>PENGATURAN</span>
            </button>
          </nav>
        </div>

        {/* 3. SUB-NAV BAR (BERANDA: TRANSAKSI PERHITUNGAN & USULAN) */}
        {currentMainTab === 'transaksi' && (
          <div className="bg-slate-900/60 backdrop-blur-xl border-t border-white/5 px-3 sm:px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2.5">
              {/* Category selector on both desktop & mobile */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
                  Kategori:
                </span>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                  <button
                    id="nav-tab-reguler"
                    onClick={() => onSelectCategory('reguler')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      currentCategory === 'reguler'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Reguler</span>
                  </button>
                  <button
                    id="nav-tab-prekursor"
                    onClick={() => onSelectCategory('prekursor')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      currentCategory === 'prekursor'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Prekursor</span>
                  </button>
                  <button
                    id="nav-tab-oot"
                    onClick={() => onSelectCategory('oot')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      currentCategory === 'oot'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>OOT</span>
                  </button>
                </div>
              </div>

              {/* Sheet Segmented Toggle */}
              <div className="flex bg-white/5 backdrop-blur-xl p-1 rounded-2xl w-full md:w-auto border border-white/10">
                <button
                  id="subtab-btn-perhitungan"
                  onClick={() => onSelectSubTab('perhitungan')}
                  className={`flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentSubTab === 'perhitungan'
                      ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>1. Perhitungan Obat</span>
                  <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-mono text-indigo-200">
                    {activeRowCount}
                  </span>
                </button>

                <button
                  id="subtab-btn-usulan"
                  onClick={() => onSelectSubTab('usulan')}
                  className={`flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentSubTab === 'usulan'
                      ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>2. Usulan SP</span>
                  <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-mono text-indigo-200">
                    Rp {Math.round(totalEstimasiValue).toLocaleString('id-ID')}
                  </span>
                </button>
              </div>

              {/* Sub-Actions Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
                {currentSubTab === 'perhitungan' && (
                  <>
                    <button
                      id="calc-export-excel-btn"
                      onClick={onExportExcel}
                      title="Ekspor Perhitungan ke Excel dan Simpan ke Folder"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel</span>
                    </button>
                    <button
                      id="calc-import-excel-btn"
                      onClick={onImportExcelPerhitungan}
                      title="Impor Data Perhitungan dari File Excel"
                      className="bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-300" />
                      <span className="hidden sm:inline">Impor</span>
                    </button>
                  </>
                )}

                {currentSubTab === 'usulan' && (
                  <>
                    <button
                      id="usulan-export-excel-btn"
                      onClick={onExportExcel}
                      title="Simpan Dokumen Usulan ke Excel"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel</span>
                    </button>
                    <button
                      id="usulan-export-pdf-btn"
                      onClick={onExportPDF}
                      title="Cetak & Simpan Dokumen Usulan Resmi ke PDF"
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      id="usulan-print-btn"
                      onClick={onPrint}
                      title="Cetak Langsung Dokumen Pengadaan"
                      className="bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-300" />
                      <span className="hidden sm:inline">Cetak</span>
                    </button>
                  </>
                )}

                <button
                  id="reset-sheet-btn"
                  onClick={onResetSheet}
                  title="Kosongkan Lembar Kerja Kategori Ini"
                  className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  id="commit-history-btn"
                  onClick={onCommitHistory}
                  title="Simpan Hasil Usulan Obat ke Riwayat Pembelian Resmi"
                  className="bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Catat Riwayat</span>
                </button>

                {currentSubTab === 'perhitungan' && (
                  <button
                    id="add-row-btn"
                    onClick={() => onAddRow?.()}
                    title="Tambah Baris Obat Baru"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Baris</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. CONTEXTUAL SUB-NAV BAR (FILE TERSIMPAN) */}
        {currentMainTab === 'storage' && (
          <div className="bg-slate-900/60 backdrop-blur-xl border-t border-white/5 px-3 sm:px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">File Tersimpan</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Penyimpanan Berkas Internal &amp; Cadangan Vault Sistem</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onConnectFolder}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{connectedFolder.isConnected ? `Folder: ${connectedFolder.folderName}` : 'Pilih Folder'}</span>
                </button>
                <button
                  onClick={onExportBackupJSON}
                  className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Backup JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. CONTEXTUAL SUB-NAV BAR (RIWAYAT) */}
        {currentMainTab === 'history' && (
          <div className="bg-slate-900/60 backdrop-blur-xl border-t border-white/5 px-3 sm:px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <History className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white">Riwayat Pengadaan</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Audit &amp; Log Transaksi Riwayat Pembelian Apotek</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MOBILE DRAWER SLIDE-OVER MODAL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end no-print animate-fadeIn">
          <div className="w-5/6 max-w-sm bg-slate-900 border-l border-white/10 h-full p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-white text-base">Menu FarmasiPro</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Online/Offline Info Card */}
              <div
                className={`p-3 rounded-2xl border text-xs ${
                  isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  <span>{isOnline ? 'Status: Online' : 'Status: Mode Offline'}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isOnline
                    ? 'Semua data otomatis tersinkronisasi di memori lokal dan siap beroperasi kapan saja.'
                    : 'Aplikasi berjalan 100% offline. Perhitungan, komparasi, dan ekspor tetap berfungsi penuh tanpa sinyal internet.'}
                </p>
              </div>

              {/* Navigasi Utama (Beranda, File Tersimpan, Pengaturan) */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Navigasi Utama
                </span>
                
                {/* 1. Beranda */}
                <button
                  onClick={() => {
                    onSelectMainTab('transaksi');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'transaksi'
                      ? 'bg-indigo-600/30 border-indigo-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold">Beranda (Perhitungan &amp; SP)</span>
                  </span>
                  {activeRowCount > 0 && (
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono font-bold">
                      {activeRowCount} item
                    </span>
                  )}
                </button>

                {/* 2. File Tersimpan */}
                <button
                  onClick={() => {
                    onSelectMainTab('storage');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'storage'
                      ? 'bg-emerald-600/30 border-emerald-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">File Tersimpan &amp; Vault</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    DISK
                  </span>
                </button>

                {/* 3. Pengaturan */}
                <button
                  onClick={() => {
                    onOpenSettings();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span className="font-bold">Pengaturan Apotek &amp; SIPA</span>
                  </span>
                </button>
              </div>

              {/* Kategori Obat Picker */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Kategori Pengadaan
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onSelectCategory('reguler');
                      onSelectMainTab('transaksi');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                      currentCategory === 'reguler' && currentMainTab === 'transaksi'
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Reguler</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectCategory('prekursor');
                      onSelectMainTab('transaksi');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                      currentCategory === 'prekursor' && currentMainTab === 'transaksi'
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Prekursor</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectCategory('oot');
                      onSelectMainTab('transaksi');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                      currentCategory === 'oot' && currentMainTab === 'transaksi'
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>OOT</span>
                  </button>
                </div>
              </div>

              {/* Modul Data Logistik & Master */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Manajemen Data &amp; Logistik
                </span>

                <button
                  onClick={() => {
                    onSelectMainTab('usulan_obat');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'usulan_obat'
                      ? 'bg-teal-600/30 border-teal-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-teal-400" />
                    <span>Usulan Obat Apotek</span>
                  </span>
                  {usulanCount > 0 && (
                    <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full font-mono font-bold">
                      {usulanCount} usulan
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSelectMainTab('pricelist');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'pricelist'
                      ? 'bg-amber-600/30 border-amber-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Komparasi Harga PBF</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSelectMainTab('pbf');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'pbf'
                      ? 'bg-amber-600/30 border-amber-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>Data PBF / Distributor</span>
                  </span>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono text-amber-300">
                    {supplierCount} PBF
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSelectMainTab('master');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'master'
                      ? 'bg-indigo-600/30 border-indigo-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Master SKU Obat</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSelectMainTab('history');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    currentMainTab === 'history'
                      ? 'bg-sky-600/30 border-sky-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-400" />
                    <span>Riwayat Pengadaan</span>
                  </span>
                </button>
              </div>

              {/* Data Backup & Perangkat Actions */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Penyimpanan &amp; Cadangan
                </span>

                {/* Mobile Autosave Status */}
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span className="font-semibold">{isAutosaving ? 'Menyimpan...' : 'Autosave Aktif'}</span>
                  </div>
                  {lastSavedTime && <span className="font-mono text-[10px] text-emerald-400/80">{lastSavedTime}</span>}
                </div>

                {onRecoverSession && (
                  <button
                    onClick={() => {
                      onRecoverSession();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Recover Last Session</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onConnectFolder();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
                >
                  <FolderSync className="w-4 h-4 text-emerald-400" />
                  <span className="truncate">
                    {connectedFolder.isConnected ? `Folder: ${connectedFolder.folderName}` : 'Pilih Folder Perangkat'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onExportBackupJSON();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/30"
                  >
                    <Download className="w-4 h-4" />
                    <span>Backup JSON</span>
                  </button>

                  <button
                    onClick={() => {
                      onImportBackupJSON();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restore JSON</span>
                  </button>
                </div>

                {onOpenFirebaseSync && (
                  <button
                    onClick={() => {
                      onOpenFirebaseSync();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                      currentUser
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-amber-400" />
                      <span>Firebase Cloud Firestore Sync</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      currentUser ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'
                    }`}>
                      {currentUser ? 'Terhubung' : 'Login'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom drawer footer */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                <Settings className="w-4 h-4" />
                <span>Pengaturan Apotek &amp; SIPA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
