import React, { useState } from 'react';
import {
  Home,
  Database,
  History,
  HardDrive,
  Settings,
  ClipboardList,
  Building2,
  Tag,
  ChevronUp,
  X,
} from 'lucide-react';
import { MainNavTab } from '../../types';

interface BottomNavBarProps {
  currentMainTab: MainNavTab;
  onSelectMainTab: (tab: MainNavTab) => void;
  onOpenSettings?: () => void;
  supplierCount?: number;
  priceListCount?: number;
  usulanCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentMainTab,
  onSelectMainTab,
  onOpenSettings,
  supplierCount = 0,
  priceListCount = 0,
  usulanCount = 0,
}) => {
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);

  // Determine if current tab is one of the data management modules
  const isDataMasterActive =
    currentMainTab === 'usulan_obat' ||
    currentMainTab === 'pbf' ||
    currentMainTab === 'pricelist' ||
    currentMainTab === 'master';

  const dataModules = [
    {
      id: 'usulan_obat' as MainNavTab,
      label: 'Usulan Obat',
      sublabel: 'Daftar usulan obat masuk',
      icon: ClipboardList,
      badge: usulanCount > 0 ? `${usulanCount} usulan` : null,
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-400/30',
      activeBorder: 'border-teal-400 bg-teal-500/15 text-teal-200',
    },
    {
      id: 'pbf' as MainNavTab,
      label: 'Data PBF / Distributor',
      sublabel: 'Direktori data supplier apotek',
      icon: Building2,
      badge: supplierCount > 0 ? `${supplierCount} PBF` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
      activeBorder: 'border-amber-400 bg-amber-500/15 text-amber-200',
    },
    {
      id: 'pricelist' as MainNavTab,
      label: 'Komparasi Harga PBF',
      sublabel: 'Analisis & perbandingan diskon',
      icon: Tag,
      badge: priceListCount > 0 ? `${priceListCount} item` : null,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
      activeBorder: 'border-purple-400 bg-purple-500/15 text-purple-200',
    },
    {
      id: 'master' as MainNavTab,
      label: 'Master SKU Obat',
      sublabel: 'Database katalog harga & HNA',
      icon: Database,
      badge: null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
      activeBorder: 'border-indigo-400 bg-indigo-500/15 text-indigo-200',
    },
  ];

  return (
    <>
      {/* Quick Switcher Sheet for Data Management Modules */}
      {isDataMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end no-print"
          onClick={() => setIsDataMenuOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-slate-900 border-t border-white/10 rounded-t-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(var(--sab, 0px) + 5rem)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Manajemen Data &amp; Logistik
                </span>
              </div>
              <button
                onClick={() => setIsDataMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dataModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = currentMainTab === mod.id;

                return (
                  <button
                    key={mod.id}
                    id={`mobile-quick-data-${mod.id}`}
                    onClick={() => {
                      onSelectMainTab(mod.id);
                      setIsDataMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isActive
                        ? mod.activeBorder
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white/15' : 'bg-black/30'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{mod.label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mod.sublabel}</p>
                      </div>
                    </div>
                    {mod.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5-Item Intuitive Mobile Bottom Navigation Bar */}
      <nav
        id="bottom-navigation-bar"
        aria-label="Bottom Navigation Menu"
        style={{ paddingBottom: 'calc(var(--sab, 0px) + 0.35rem)' }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl pt-1.5 px-2 sm:px-4 no-print select-none"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* 1. BERANDA (Transaksi Perhitungan & Usulan) */}
          <button
            id="bottom-nav-beranda"
            onClick={() => {
              setIsDataMenuOpen(false);
              onSelectMainTab('transaksi');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer relative group ${
              currentMainTab === 'transaksi'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full leading-tight">
              Beranda
            </span>
            {currentMainTab === 'transaksi' && (
              <span className="w-3 h-0.5 rounded-full bg-white/90 mt-0.5" />
            )}
          </button>

          {/* 2. DATA MASTER (Dropdown Popover) */}
          <button
            id="bottom-nav-datamaster"
            onClick={() => setIsDataMenuOpen((prev) => !prev)}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer relative group ${
              isDataMasterActive
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 border border-teal-400/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`}
          >
            <div className="relative">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150" />
              {(usulanCount > 0 || supplierCount > 0) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full leading-tight flex items-center gap-0.5">
              Data Master
              <ChevronUp className="w-2.5 h-2.5 opacity-60" />
            </span>
            {isDataMasterActive && (
              <span className="w-3 h-0.5 rounded-full bg-white/90 mt-0.5" />
            )}
          </button>

          {/* 3. RIWAYAT */}
          <button
            id="bottom-nav-riwayat"
            onClick={() => {
              setIsDataMenuOpen(false);
              onSelectMainTab('history');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer relative group ${
              currentMainTab === 'history'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border border-sky-400/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`}
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full leading-tight">
              Riwayat
            </span>
            {currentMainTab === 'history' && (
              <span className="w-3 h-0.5 rounded-full bg-white/90 mt-0.5" />
            )}
          </button>

          {/* 4. FILE TERSIMPAN */}
          <button
            id="bottom-nav-storage"
            onClick={() => {
              setIsDataMenuOpen(false);
              onSelectMainTab('storage');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer relative group ${
              currentMainTab === 'storage'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`}
          >
            <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full leading-tight">
              Tersimpan
            </span>
            {currentMainTab === 'storage' && (
              <span className="w-3 h-0.5 rounded-full bg-white/90 mt-0.5" />
            )}
          </button>

          {/* 5. PENGATURAN */}
          <button
            id="bottom-nav-pengaturan"
            onClick={() => {
              setIsDataMenuOpen(false);
              if (onOpenSettings) onOpenSettings();
            }}
            className="min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer text-slate-400 hover:text-amber-300 hover:bg-white/5 font-medium group"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 text-slate-400 group-hover:text-amber-400" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full leading-tight">
              Pengaturan
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
