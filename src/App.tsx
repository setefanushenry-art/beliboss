import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { RotateCcw } from 'lucide-react';
import {
  AppStateData,
  DefektaItem,
  DrugCalculationRow,
  DrugCategory,
  MainNavTab,
  MasterDrugItem,
  PriceOfferItem,
  PurchaseHistoryItem,
  SubNavTab,
  PharmacyProfile,
  SupplierItem,
  UsulanObatItem,
} from './types';
import {
  createEmptyCalculationRow,
  generateSKU,
  loadAppState,
  saveAppState,
  autoRegisterSupplierHelper,
  syncAllDetectedPbfs,
  getAllDistinctUnits,
  DEFAULT_UNITS_LIST,
} from './utils/db';
import { applyBestPriceToAllRows, findBestPriceForDrug, findLastPurchaseInfo, calculateDrugSimilarity, parseDrugNameAndDosage } from './utils/bestPriceHelper';
import {
  performFullMasterPriceSync,
  syncOfferToMaster,
  syncMasterToPriceList,
} from './utils/masterPriceSync';
import { FileSystemManager } from './utils/fileSystem';
import { Navbar } from './components/Navigation/Navbar';
import { BottomNavBar } from './components/Navigation/BottomNavBar';
import { PWAInstallBanner } from './components/Navigation/PWAInstallBanner';
import { OfflineIndicator } from './components/Common/OfflineIndicator';
import { PerhitunganView } from './components/Perhitungan/PerhitunganView';
import { UsulanView } from './components/Usulan/UsulanView';
import { UsulanObatView } from './components/UsulanObat/UsulanObatView';
import { PriceListView } from './components/PriceList/PriceListView';
import { MasterView } from './components/Master/MasterView';
import { HistoryView } from './components/History/HistoryView';
import { SupplierManager } from './components/Supplier/SupplierManager';
import { InternalFileManager } from './components/Storage/InternalFileManager';
import { CustomDialog, ToastContainer, ToastMessage } from './components/Common/Modals';
import { SettingsModal } from './components/Common/SettingsModal';
import { UnitsManagerModal } from './components/Common/UnitsManagerModal';
import { FirebaseSyncModal } from './components/Common/FirebaseSyncModal';
import { testConnection, auth, onAuthStateChanged, User } from './utils/firebase';

export default function App() {
  const [appState, setAppState] = useState<AppStateData>(loadAppState);
  const [currentCategory, setCurrentCategory] = useState<DrugCategory>('reguler');
  const [currentMainTab, setCurrentMainTab] = useState<MainNavTab>('transaksi');
  const [currentSubTab, setCurrentSubTab] = useState<SubNavTab>('perhitungan');

  // Device Folder State
  const [connectedFolder, setConnectedFolder] = useState<{ isConnected: boolean; folderName: string }>({
    isConnected: false,
    folderName: '',
  });

  // Online / Offline State Tracking
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi Pulih (Online)', 'success', 'Sistem online dan data siap disinkronkan.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode Offline Aktif', 'info', 'Aplikasi tetap berjalan normal 100% tanpa internet & data tersimpan di perangkat.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // UI States
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnitsManagerOpen, setIsUnitsManagerOpen] = useState(false);

  // Firebase Firestore & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseSyncOpen, setIsFirebaseSyncOpen] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Compute all distinct units across master, calculation rows, defekta, usulan, and unitsList
  const allDistinctUnits = useMemo(() => {
    return getAllDistinctUnits(appState);
  }, [appState]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    icon?: 'help' | 'warning' | 'danger' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    icon: 'help',
    onConfirm: () => {},
  });

  // Hidden File Inputs
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const calcExcelInputRef = useRef<HTMLInputElement>(null);
  const priceListExcelInputRef = useRef<HTMLInputElement>(null);
  const masterExcelInputRef = useRef<HTMLInputElement>(null);
  const historyExcelInputRef = useRef<HTMLInputElement>(null);

  // Autosave & Session Recovery States
  const SESSION_DRAFT_KEY = 'farmasipro_daily_draft_session';
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [showRecoverBanner, setShowRecoverBanner] = useState<boolean>(false);
  const [sessionDraftInfo, setSessionDraftInfo] = useState<{
    timestamp: number;
    timeStr: string;
    dateStr: string;
    itemCount: number;
    category: DrugCategory;
  } | null>(null);

  // Check on mount if a previous session draft exists in sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.appState && parsed.timestamp) {
          const draftCat: DrugCategory = parsed.category || 'reguler';
          const draftRows = parsed.appState.rows?.[draftCat] || [];
          const validCount = draftRows.filter((r: any) => r.nama && r.nama.trim().length > 0).length;

          setSessionDraftInfo({
            timestamp: parsed.timestamp,
            timeStr: parsed.timeStr || new Date(parsed.timestamp).toLocaleTimeString('id-ID'),
            dateStr: parsed.dateStr || new Date(parsed.timestamp).toLocaleDateString('id-ID'),
            itemCount: validCount,
            category: draftCat,
          });
          setShowRecoverBanner(true);
        }
      }
    } catch (e) {
      console.warn('Error reading session draft on mount:', e);
    }
  }, []);

  // Immediate Autosave whenever user types in manual inputs or state changes
  useEffect(() => {
    saveAppState(appState);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');
    setLastSavedTime(timeStr);
    setIsAutosaving(true);
    const timer = setTimeout(() => setIsAutosaving(false), 500);
    return () => clearTimeout(timer);
  }, [appState]);

  // Periodic 30-Second Draft Autosave to sessionStorage
  useEffect(() => {
    const saveSessionDraft = () => {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID');
        const dateStr = now.toLocaleDateString('id-ID');
        const currentRows = appState.rows[currentCategory] || [];
        const validRowCount = currentRows.filter((r) => r.nama && r.nama.trim().length > 0).length;

        const draftData = {
          timestamp: Date.now(),
          timeStr,
          dateStr,
          category: currentCategory,
          subTab: currentSubTab,
          appState,
          validRowCount,
        };
        sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(draftData));
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Failed to save draft to sessionStorage:', err);
      }
    };

    // Save initial snapshot
    saveSessionDraft();

    // 30 seconds interval
    const interval = setInterval(saveSessionDraft, 30000);

    // Emergency snapshot before page unloads or refreshes
    const handleBeforeUnload = () => {
      saveSessionDraft();
      saveAppState(appState);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [appState, currentCategory, currentSubTab]);

  // Recover Last Session Handler
  const handleRecoverLastSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_DRAFT_KEY);
      if (!raw) {
        showToast('Tidak ada draf sesi yang tersimpan di sessionStorage.', 'info');
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && parsed.appState) {
        setAppState(parsed.appState);
        saveAppState(parsed.appState);
        if (parsed.category) {
          setCurrentCategory(parsed.category);
        }
        if (parsed.subTab) {
          setCurrentSubTab(parsed.subTab);
        }
        setShowRecoverBanner(false);
        confetti({ particleCount: 50, spread: 65, origin: { y: 0.7 } });
        showToast(
          '✨ Sesi Terakhir Berhasil Dipulihkan!',
          'success',
          `Draf dokumen otomatis dari pukul ${parsed.timeStr || ''} (${parsed.dateStr || ''}) berhasil dipulihkan.`
        );
      }
    } catch (err) {
      console.error('Failed to restore session draft:', err);
      showToast('Gagal memulihkan draf sesi.', 'error');
    }
  };

  // Toast Notification helper
  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', detail?: string) => {
    const id = 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message, detail }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    icon: 'help' | 'warning' | 'danger' | 'success' | 'info' = 'warning'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      icon,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  // Connect to Local Device Directory (File System Access API)
  const handleConnectDeviceFolder = async () => {
    const res = await FileSystemManager.pickAndConnectDirectory();
    if (res.success) {
      setConnectedFolder({
        isConnected: true,
        folderName: res.name,
      });
      showToast(res.message, 'success', 'Folder ini akan digunakan untuk menyimpan dokumen dan cadangan database.');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } else {
      if (res.message) {
        showToast(res.message, 'info');
      }
    }
  };

  const handleDisconnectDeviceFolder = () => {
    FileSystemManager.disconnectDirectory();
    setConnectedFolder({ isConnected: false, folderName: '' });
    showToast('Folder perangkat diputuskan.', 'info');
  };

  // Perhitungan Row Handlers (supports single field or atomic partial update)
  const handleUpdateCalculationRow = (
    id: string,
    fieldOrUpdates: keyof DrugCalculationRow | Partial<DrugCalculationRow>,
    value?: any
  ) => {
    setAppState((prev) => {
      const rows = prev.rows[currentCategory].map((r) => {
        if (r.id === id) {
          let updated: DrugCalculationRow;
          if (typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null) {
            updated = { ...r, ...fieldOrUpdates };
          } else {
            updated = { ...r, [fieldOrUpdates as string]: value };
          }

          // If name is typed and no SKU yet, ensure SKU
          const isNameUpdated =
            fieldOrUpdates === 'nama' || (typeof fieldOrUpdates === 'object' && 'nama' in fieldOrUpdates);
          if (isNameUpdated && updated.nama && !updated.sku) {
            updated.sku = generateSKU(currentCategory);
          }

          // Otomatis isi History Harga, Tanggal Beli Terakhir, dan PBF Terakhir dari Riwayat, Master, atau Pricelist
          if (isNameUpdated && updated.nama && updated.nama.trim().length > 1) {
            const last = findLastPurchaseInfo(updated, prev.history, prev.masterList, prev.priceList);
            if ((!updated.historyHarga || updated.historyHarga === 0) && last.historyHarga > 0) {
              updated.historyHarga = last.historyHarga;
            }
            if ((!updated.tanggal || updated.tanggal.trim() === '' || updated.tanggal === '-') && last.tanggal) {
              updated.tanggal = last.tanggal;
            }
            // Auto-fill PBF from active category targetPbf if available and not yet set
            const activeTargetPbf = (prev.targetPbfOrder?.[currentCategory] || '').trim();
            if (activeTargetPbf && activeTargetPbf !== '-') {
              if (!updated.pbf || updated.pbf.trim() === '') {
                updated.pbf = activeTargetPbf;
              }
            } else if (!updated.pbf && last.pbf && last.pbf !== '-') {
              updated.pbf = last.pbf;
            }

            // PBF Terakhir Beli specifically pulls from historical purchase info
            if ((!updated.pbfTerakhir || updated.pbfTerakhir.trim() === '') && last.pbf && last.pbf !== '-') {
              updated.pbfTerakhir = last.pbf;
            }
          }

          // Automatically sync hargaJadi if hna, diskonPct, or includePpn changed
          const isPpn = updated.includePpn !== false;
          const diskonRp = (updated.hna || 0) * ((updated.diskonPct || 0) / 100);
          const nettoHna = (updated.hna || 0) - diskonRp;
          const computedHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

          // If hargaJadi was not explicitly given in the update object, sync to computed
          if (typeof fieldOrUpdates !== 'object' || !('hargaJadi' in fieldOrUpdates)) {
            updated.hargaJadi = computedHargaJadi;
          }

          return updated;
        }
        return r;
      });
      return {
        ...prev,
        rows: {
          ...prev.rows,
          [currentCategory]: rows,
        },
      };
    });
  };

  const handleAddCalculationRow = (presetPbf?: string | any) => {
    // 1. Determine active target PBF for this category safely
    // Guard against React SyntheticEvent when onAddRow is invoked from onClick without arguments
    const safePresetPbf = typeof presetPbf === 'string' ? presetPbf.trim() : '';
    const categoryTarget =
      typeof appState.targetPbfOrder?.[currentCategory] === 'string'
        ? appState.targetPbfOrder[currentCategory].trim()
        : '';
    const activeTargetPbf = safePresetPbf || categoryTarget;
    let defaultPbf = '';
    if (activeTargetPbf && activeTargetPbf !== '-') {
      defaultPbf = activeTargetPbf;
    } else {
      // If targetPbfOrder is not explicitly set, inherit from existing rows in currentCategory
      const currentRows = appState.rows[currentCategory] || [];
      const rowsWithPbf = currentRows.filter(
        (r) => r.pbf && typeof r.pbf === 'string' && r.pbf.trim() && r.pbf.trim() !== '-'
      );
      if (rowsWithPbf.length > 0) {
        defaultPbf = (rowsWithPbf[rowsWithPbf.length - 1].pbf || '').trim();
      }
    }

    const newRow = createEmptyCalculationRow(currentCategory, {
      pbf: defaultPbf,
      pbfTerakhir: '',
    });

    setAppState((prev) => {
      const updatedRows = [...(prev.rows[currentCategory] || []), newRow];
      const updated = {
        ...prev,
        rows: {
          ...prev.rows,
          [currentCategory]: updatedRows,
        },
        targetPbfOrder: defaultPbf
          ? {
              ...(prev.targetPbfOrder || { reguler: '', oot: '', prekursor: '', psikotropika: '', narkotika: '' }),
              [currentCategory]: defaultPbf,
            }
          : prev.targetPbfOrder,
      };
      saveAppState(updated);
      return updated;
    });

    showToast(
      defaultPbf
        ? `Baris baru ditambahkan (PBF otomatis: ${defaultPbf}).`
        : 'Baris baru ditambahkan ke lembar perhitungan.',
      'info'
    );
  };

  const handleRemoveCalculationRow = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [currentCategory]: prev.rows[currentCategory].filter((r) => r.id !== id),
      },
    }));
    showToast('Baris telah dihapus.', 'info');
  };

  const handleDuplicateCalculationRow = (row: DrugCalculationRow) => {
    const activeTargetPbf = (appState.targetPbfOrder?.[currentCategory] || '').trim();
    const resolvedPbf = row.pbf || (activeTargetPbf && activeTargetPbf !== '-' ? activeTargetPbf : '');
    const duplicate: DrugCalculationRow = {
      ...row,
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sku: generateSKU(currentCategory),
      pbf: resolvedPbf,
      pbfTerakhir: resolvedPbf,
    };
    setAppState((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [currentCategory]: [...prev.rows[currentCategory], duplicate],
      },
    }));
    showToast(`Baris "${row.nama || 'Obat'}" diduplikasi.`, 'info');
  };

  const handleUpdateDiskonCOD = (val: number) => {
    setAppState((prev) => ({
      ...prev,
      diskonCOD: {
        ...prev.diskonCOD,
        [currentCategory]: val,
      },
    }));
  };

  const handleSelectMasterDrug = (rowId: string, master: MasterDrugItem) => {
    setAppState((prev) => {
      const activeCategoryTargetPbf = (prev.targetPbfOrder?.[currentCategory] || '').trim();
      const currentCategoryRows = prev.rows[currentCategory] || [];
      const currentRow = currentCategoryRows.find((r) => r.id === rowId);

      // Determine active PBF to retain: targetPbfOrder takes precedence if set, then row.pbf, then master.pbf
      const targetPbf = (activeCategoryTargetPbf && activeCategoryTargetPbf !== '-')
        ? activeCategoryTargetPbf
        : (currentRow?.pbf && currentRow.pbf.trim() && currentRow.pbf.trim() !== '-' ? currentRow.pbf.trim() : (master.pbf || ''));

      // Check if priceList or history has a specific offer/purchase for this drug
      let chosenHna = master.hna;
      let chosenDiskon = 0;
      let chosenDate = master.tanggal || '';
      let chosenPbf = targetPbf;
      let lastPurchasePbf = master.pbf || '';
      let chosenHistoryHarga = master.historyHarga || 0;

      // 1. Check purchase history for real historical discount and previous purchase price
      if (prev.history && prev.history.length > 0) {
        const drugClean = master.nama.trim().toLowerCase();
        const matchedHist = prev.history.filter((h) => {
          if (master.sku && h.sku && h.sku.trim().toLowerCase() === master.sku.trim().toLowerCase()) return true;
          if (h.nama) {
            const hClean = h.nama.trim().toLowerCase();
            return hClean === drugClean || calculateDrugSimilarity(drugClean, hClean) >= 0.65;
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
          if (latest.diskon) chosenDiskon = latest.diskon;
          if (latest.hna && latest.hna > 0) chosenHna = latest.hna;
          if (latest.tgl) chosenDate = latest.tgl;
          if (latest.pbf) {
            lastPurchasePbf = latest.pbf;
            chosenPbf = targetPbf || latest.pbf;
          }
          if (latest.hpp > 0) chosenHistoryHarga = latest.hpp;
        }
      }

      // 2. Check if priceList has an offer from targetPbf or best offer
      if (targetPbf && prev.priceList && prev.priceList.length > 0) {
        const pbfLower = targetPbf.toLowerCase();
        const drugClean = master.nama.trim().toLowerCase();
        const matchedOffer = prev.priceList.find(
          (pl) =>
            (pl.pbf || '').trim().toLowerCase() === pbfLower &&
            ((pl.nama || '').trim().toLowerCase() === drugClean ||
              calculateDrugSimilarity(drugClean, (pl.nama || '').trim().toLowerCase()) >= 0.65)
        );
        if (matchedOffer) {
          chosenHna = matchedOffer.hna;
          const offerDisc = (matchedOffer as any).diskonPct ?? matchedOffer.diskon ?? 0;
          if (offerDisc > 0) chosenDiskon = offerDisc;
        }
      }

      // 3. If still no discount, check if master.historyHarga implies a discount
      if (chosenDiskon === 0 && master.historyHarga > 0 && master.hna > 0 && master.historyHarga < master.hna * 1.11) {
        chosenDiskon = Math.max(0, Math.round(((master.hna * 1.11 - master.historyHarga) / (master.hna * 1.11)) * 1000) / 10);
      }

      const isPpn = currentRow ? currentRow.includePpn !== false : true;
      const hnaPlusPpn = isPpn ? Math.round(chosenHna * 1.11) : chosenHna;
      const discFactor = (100 - chosenDiskon) / 100;
      const nettoHna = chosenHna * discFactor;
      const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
      if (chosenHistoryHarga <= 0) chosenHistoryHarga = hargaJadi;

      const parsed = parseDrugNameAndDosage(master.nama);
      const cleanName = parsed.cleanNama || master.nama;
      const sediaan = parsed.dosageForm || master.satuan || '';

      const pbfNote = `PBF: ${chosenPbf || master.pbf || '-'} (HNA Rp ${Math.round(chosenHna).toLocaleString('id-ID')}${chosenDiskon > 0 ? ` Disc ${chosenDiskon}%` : ''})`;

      const rows = prev.rows[currentCategory].map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            sku: master.sku,
            nama: cleanName,
            bentukSediaan: sediaan || r.bentukSediaan || '',
            kemasan: master.kemasan || sediaan || r.kemasan || 'Box',
            satuan: master.satuan || sediaan || r.satuan || 'Box',
            pabrik: master.pabrik || r.pabrik || '-',
            hna: chosenHna,
            hnaPlusPpn,
            diskonPct: chosenDiskon,
            hargaJadi,
            pbf: chosenPbf || master.pbf || '',
            pbfTerakhir: lastPurchasePbf || master.pbf || '',
            historyHarga: chosenHistoryHarga,
            tanggal: chosenDate,
            stok: master.stok !== undefined ? master.stok : r.stok,
            catatan: r.catatan && !r.catatan.includes('PBF:') ? r.catatan : pbfNote,
          };
        }
        return r;
      });
      return {
        ...prev,
        rows: {
          ...prev.rows,
          [currentCategory]: rows,
        },
      };
    });
    showToast(`Obat "${master.nama}" (${master.sku}) dipilih dari Master. Riwayat diskon & harga terisi otomatis.`, 'success');
  };

  const handleResetSheet = () => {
    openConfirmDialog(
      'Reset Lembar Kerja',
      `Apakah Anda yakin ingin mengosongkan seluruh baris di kategori ${currentCategory.toUpperCase()}? Data pada kategori lain tidak akan terpengaruh.`,
      () => {
        setAppState((prev) => ({
          ...prev,
          rows: {
            ...prev.rows,
            [currentCategory]: [
              createEmptyCalculationRow(currentCategory),
              createEmptyCalculationRow(currentCategory),
              createEmptyCalculationRow(currentCategory),
            ],
          },
        }));
        showToast(`Sheet ${currentCategory.toUpperCase()} berhasil direset.`, 'info');
      },
      'danger'
    );
  };

  // Auto Best-Price Optimizer: Optimizes active category calculation & purchase proposal rows to lowest PBF price
  const handleApplyBestPricesToActiveCategory = (customPriceList?: PriceOfferItem[]) => {
    const listToUse = customPriceList || appState.priceList;
    const currentRows = appState.rows[currentCategory] || [];
    const validRows = currentRows.filter((r) => r.nama && r.nama.trim().length > 0);

    if (validRows.length === 0) {
      showToast('Lembar kerja aktif masih kosong. Tambahkan obat terlebih dahulu.', 'warning');
      return;
    }

    if (listToUse.length === 0) {
      showToast('Belum ada data penawaran harga PBF. Unggah PDF atau tambahkan penawaran di tab Komparasi PBF.', 'warning');
      return;
    }

    const { updatedRows, optimizedCount, totalSavingsRp, optimizedDetails } = applyBestPriceToAllRows(
      currentRows,
      listToUse
    );

    if (optimizedCount > 0) {
      setAppState((prev) => ({
        ...prev,
        rows: {
          ...prev.rows,
          [currentCategory]: updatedRows,
        },
      }));
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.65 } });
      showToast(
        `✨ Auto Best-Price Berhasil: ${optimizedCount} obat dioptimalkan ke PBF termurah!`,
        'success',
        `Estimasi Penghematan Belanja: Rp ${Math.round(totalSavingsRp).toLocaleString('id-ID')} (${optimizedDetails.slice(0, 2).map((d) => `${d.nama}: ${d.pbf}`).join(', ')})`
      );
    } else {
      showToast(
        'Seluruh obat di lembar ini sudah menggunakan harga termurah / belum ada penawaran baru yang lebih murah.',
        'info'
      );
    }
  };

  // Commit Active Requisitions into Purchase History and Master List
  const handleCommitTransactionToHistory = () => {
    const validRows = appState.rows[currentCategory].filter((r) => r.nama && r.beli > 0);
    if (validRows.length === 0) {
      showToast('Tidak ada obat dengan kuantitas pesanan > 0 untuk disimpan.', 'warning');
      return;
    }

    openConfirmDialog(
      'Simpan ke Riwayat Pembelian',
      `Simpan ${validRows.length} item usulan obat (${currentCategory.toUpperCase()}) ke Riwayat Pembelian resmi dan sinkronkan data ke Master SKU?`,
      () => {
        const today = new Date().toISOString().split('T')[0];
        const newHistoryItems: PurchaseHistoryItem[] = [];
        const updatedMaster = [...appState.masterList];

        validRows.forEach((r) => {
          const isPpn = r.includePpn !== false;
          const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
          const nettoHna = (r.hna || 0) - diskonRp;
          const hpp = r.hargaJadi && r.hargaJadi > 0 ? r.hargaJadi : Math.round(isPpn ? nettoHna * 1.11 : nettoHna);
          const total = hpp * (r.beli || 0);
          const skuVal = r.sku || generateSKU(currentCategory);

          newHistoryItems.push({
            id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            sku: skuVal,
            tgl: today,
            kategori: currentCategory,
            nama: r.nama,
            pbf: r.pbf || '-',
            hna: r.hna,
            diskon: r.diskonPct,
            hpp,
            qty: r.beli,
            total,
            noSp: `SP-${currentCategory.toUpperCase().substring(0, 3)}-${today.replace(/-/g, '')}`,
          });

          // Ensure master entry
          const masterIdx = updatedMaster.findIndex((m) => m.nama.toLowerCase().trim() === r.nama.toLowerCase().trim());
          if (masterIdx !== -1) {
            updatedMaster[masterIdx].historyHarga = hpp;
            updatedMaster[masterIdx].hna = r.hna;
            updatedMaster[masterIdx].tanggal = today;
            if (r.pbf) updatedMaster[masterIdx].pbf = r.pbf;
          } else {
            updatedMaster.push({
              id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
              sku: skuVal,
              nama: r.nama,
              kategori: currentCategory,
              pabrik: r.pabrik || '-',
              kemasan: r.kemasan || '-',
              pbf: r.pbf || '-',
              hna: r.hna,
              historyHarga: hpp,
              tanggal: today,
              stok: Number(r.stok) || 0,
            });
          }
        });

        setAppState((prev) => ({
          ...prev,
          history: [...newHistoryItems, ...prev.history],
          masterList: updatedMaster,
        }));

        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        showToast(
          `${newHistoryItems.length} obat berhasil dicatat ke Riwayat Pembelian & Master SKU!`,
          'success',
          `Buka tab Riwayat untuk melihat rincian pengadaan.`
        );
      },
      'success'
    );
  };

  // Export handlers
  const handleExportPerhitunganExcel = async () => {
    const res = await FileSystemManager.exportPerhitunganToExcel(
      appState.rows[currentCategory],
      currentCategory,
      appState.diskonCOD[currentCategory],
      appState.settings.namaApotek
    );
    if (res.success) {
      showToast(`Berkas Perhitungan ${currentCategory.toUpperCase()} berhasil disimpan!`, 'success', res.path);
    }
  };

  const handleExportUsulanExcel = async () => {
    const targetPbf = appState.targetPbfOrder?.[currentCategory] || '';
    const res = await FileSystemManager.exportUsulanToExcel(
      appState.rows[currentCategory],
      currentCategory,
      appState.diskonCOD[currentCategory],
      appState.settings.namaApotek,
      targetPbf,
      appState.history,
      appState.masterList,
      appState.priceList
    );
    if (res.success) {
      showToast(`Dokumen Usulan Pembelian Excel berhasil disimpan!`, 'success', res.path);
    }
  };

  // Pharmacy Profiles & Supplier Handlers
  const activePharmacyProfile =
    appState.pharmacyProfiles?.find((p) => p.id === appState.activePharmacyId) ||
    appState.pharmacyProfiles?.[0];

  const handleSaveSettings = (newSettings: AppStateData['settings']) => {
    setAppState((prev) => ({ ...prev, settings: newSettings }));
    showToast('Parameter sistem berhasil diperbarui!', 'success');
  };

  const handleSelectPharmacy = (pharmacyId: string) => {
    const target = appState.pharmacyProfiles?.find((p) => p.id === pharmacyId);
    setAppState((prev) => ({
      ...prev,
      activePharmacyId: pharmacyId,
      settings: target
        ? {
            ...prev.settings,
            namaApotek: target.namaApotek,
            alamatApotek: target.alamatApotek,
            sipaNo: target.sipaNo,
            namaApoteker: target.namaApoteker,
            siaNo: target.siaNo,
            teleponApotek: target.telepon,
          }
        : prev.settings,
    }));
    showToast(`Sarana Apotek Aktif beralih ke: ${target?.namaApotek || pharmacyId}`, 'success');
  };

  const handleSavePharmacyProfiles = (profiles: PharmacyProfile[], activeId: string) => {
    const active = profiles.find((p) => p.id === activeId) || profiles[0];
    setAppState((prev) => ({
      ...prev,
      pharmacyProfiles: profiles,
      activePharmacyId: activeId,
      settings: active
        ? {
            ...prev.settings,
            namaApotek: active.namaApotek,
            alamatApotek: active.alamatApotek,
            sipaNo: active.sipaNo,
            namaApoteker: active.namaApoteker,
            siaNo: active.siaNo,
            teleponApotek: active.telepon,
          }
        : prev.settings,
    }));
    showToast('Profil Sarana Apotek berhasil disimpan!', 'success');
  };

  const handleAddSupplier = (supplier: SupplierItem) => {
    setAppState((prev) => ({
      ...prev,
      suppliers: [supplier, ...(prev.suppliers || [])],
    }));
  };

  const handleUpdateSupplier = (supplier: SupplierItem) => {
    setAppState((prev) => ({
      ...prev,
      suppliers: (prev.suppliers || []).map((s) => (s.id === supplier.id ? supplier : s)),
    }));
  };

  const handleDeleteSupplier = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      suppliers: (prev.suppliers || []).filter((s) => s.id !== id),
    }));
  };

  // Auto-register PBF from any manual input across the app
  const handleAutoRegisterPbf = useCallback((pbfName: string) => {
    if (!pbfName || !pbfName.trim()) return;
    setAppState((prev) => {
      const res = autoRegisterSupplierHelper(pbfName, prev.suppliers || []);
      if (res.newSupplier) {
        const updated = {
          ...prev,
          suppliers: res.updatedSuppliers,
        };
        saveAppState(updated);
        showToast(
          `PBF "${pbfName.trim()}" otomatis terdaftar di Menu PBF (${res.newSupplier.kode})!`,
          'success',
          'Terkoneksi & tersinkronisasi otomatis dengan Master, Usulan & Price List.'
        );
        return updated;
      }
      return prev;
    });
  }, []);

  // Sync all PBFs detected across rows, master, price list, and history
  const handleSyncAllDetectedPbfs = useCallback(() => {
    setAppState((prev) => {
      const result = syncAllDetectedPbfs(prev);
      if (result.newlyAddedCount > 0) {
        const updated = {
          ...prev,
          suppliers: result.updatedSuppliers,
        };
        saveAppState(updated);
        showToast(
          `${result.newlyAddedCount} PBF baru berhasil didaftarkan ke Menu PBF!`,
          'success',
          `PBF terdeteksi: ${result.newPbfNames.join(', ')}`
        );
        return updated;
      } else {
        showToast('Semua PBF dari transaksi, master, usulan, dan pricelist sudah terdaftar di Menu PBF.', 'info');
        return prev;
      }
    });
  }, []);

  // Save new unit (satuan) manually or from inputs
  const handleSaveUnit = useCallback((newUnit: string) => {
    if (!newUnit || !newUnit.trim()) return;
    const clean = newUnit.trim();
    setAppState((prev) => {
      const list = prev.unitsList || DEFAULT_UNITS_LIST;
      const exists = list.some((u) => u.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      const updated = {
        ...prev,
        unitsList: [...list, clean],
      };
      saveAppState(updated);
      showToast(`Satuan "${clean}" berhasil disimpan ke daftar master satuan!`, 'success');
      return updated;
    });
  }, []);

  // Delete unit from master units list
  const handleDeleteUnit = useCallback((unitToDelete: string) => {
    setAppState((prev) => {
      const currentList = prev.unitsList || DEFAULT_UNITS_LIST;
      const updatedList = currentList.filter(
        (u) => u.toLowerCase() !== unitToDelete.toLowerCase()
      );
      const updated = {
        ...prev,
        unitsList: updatedList,
      };
      saveAppState(updated);
      return updated;
    });
  }, []);

  // Reset units to default list
  const handleResetUnits = useCallback(() => {
    setAppState((prev) => {
      const updated = {
        ...prev,
        unitsList: [...DEFAULT_UNITS_LIST],
      };
      saveAppState(updated);
      return updated;
    });
  }, []);

  // Update entire units list
  const handleSaveUnitsList = useCallback((newList: string[]) => {
    setAppState((prev) => {
      const updated = {
        ...prev,
        unitsList: newList,
      };
      saveAppState(updated);
      return updated;
    });
    showToast('Daftar master satuan berhasil diperbarui!', 'success');
  }, []);

  const handleAddUsulan = (item: UsulanObatItem) => {
    setAppState((prev) => ({
      ...prev,
      usulanObatList: [item, ...(prev.usulanObatList || [])],
    }));
    showToast(`Usulan obat "${item.namaObat}" berhasil ditambahkan!`, 'success');
  };

  const handleAddMultipleUsulan = (items: UsulanObatItem[]) => {
    setAppState((prev) => ({
      ...prev,
      usulanObatList: [...items, ...(prev.usulanObatList || [])],
    }));
    showToast(`${items.length} usulan obat berhasil ditambahkan!`, 'success');
  };

  const handleUpdateUsulan = (item: UsulanObatItem) => {
    setAppState((prev) => ({
      ...prev,
      usulanObatList: (prev.usulanObatList || []).map((u) => (u.id === item.id ? item : u)),
    }));
    showToast('Usulan obat berhasil diperbarui!', 'success');
  };

  const handleDeleteUsulan = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      usulanObatList: (prev.usulanObatList || []).filter((u) => u.id !== id),
    }));
    showToast('Usulan obat dihapus.', 'info');
  };

  const handleAddOutlet = (namaOutlet: string) => {
    if (!namaOutlet.trim()) return;
    setAppState((prev) => ({
      ...prev,
      outletsList: Array.from(new Set([...(prev.outletsList || []), namaOutlet.trim()])),
    }));
    showToast(`Outlet "${namaOutlet}" berhasil ditambahkan!`, 'success');
  };

  const handleDeleteOutlet = (namaOutlet: string, reassignToOutlet?: string) => {
    if (!namaOutlet) return;
    setAppState((prev) => {
      const currentList = prev.outletsList || [];
      const updatedList = currentList.filter((o) => o !== namaOutlet);
      const fallbackOutlet = reassignToOutlet || updatedList[0] || 'Apotek Utama';

      const updatedUsulan = (prev.usulanObatList || []).map((u) => {
        if (u.apotekPeminta === namaOutlet) {
          return {
            ...u,
            apotekPeminta: fallbackOutlet,
          };
        }
        return u;
      });

      return {
        ...prev,
        outletsList: updatedList,
        usulanObatList: updatedUsulan,
      };
    });
    showToast(`Outlet "${namaOutlet}" berhasil dihapus dari daftar.`, 'info');
  };

  const handleTransferUsulanToTransaction = (items: UsulanObatItem[]) => {
    if (items.length === 0) return;

    const firstCat = items[0]?.kategori;
    const targetCategory: DrugCategory =
      firstCat === 'prekursor' || firstCat === 'oot' ? firstCat : 'reguler';

    const newRows: DrugCalculationRow[] = items.map((item) => {
      const bestMatch = findBestPriceForDrug(item.namaObat, appState.priceList);
      const hna = item.perkiraanHna && item.perkiraanHna > 0
        ? item.perkiraanHna
        : (bestMatch.hasMatch ? bestMatch.bestHna : 0);
      const diskon = bestMatch.hasMatch ? bestMatch.bestDiskon : 0;
      const pbf = item.pbf || (bestMatch.hasMatch ? bestMatch.bestPbfName : '');
      const catatan = item.catatan && item.catatan !== '-'
        ? item.catatan
        : (bestMatch.hasMatch
            ? `PBF Termurah: ${bestMatch.bestPbfName} (HNA Rp ${Math.round(bestMatch.bestHna).toLocaleString('id-ID')})`
            : '');
      const qty = item.jumlah || 1;
      const isPpn = true;
      const hnaPlusPpn = isPpn ? Math.round(hna * 1.11) : hna;
      const discFactor = (100 - diskon) / 100;
      const nettoHna = hna * discFactor;
      const hargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

      return createEmptyCalculationRow(targetCategory, {
        nama: item.namaObat,
        satuan: item.satuan || 'Box',
        kemasan: item.satuan || 'Box',
        pabrik: item.pabrik || '',
        minta: qty,
        beli: qty,
        hna,
        hnaPlusPpn,
        diskonPct: diskon,
        hargaJadi,
        pbf,
        catatan,
        sku: bestMatch.bestOffer?.sku || generateSKU(targetCategory),
        includePpn: isPpn,
      });
    });

    const transferredIds = new Set(items.map((i) => i.id));
    setAppState((prev) => {
      const existingRows = prev.rows[targetCategory] || [];
      const isOnlyBlank =
        existingRows.length === 1 && !existingRows[0].nama.trim() && existingRows[0].hna === 0;

      const mergedRows = isOnlyBlank ? newRows : [...existingRows, ...newRows];

      return {
        ...prev,
        rows: {
          ...prev.rows,
          [targetCategory]: mergedRows,
        },
        usulanObatList: (prev.usulanObatList || []).map((u) =>
          transferredIds.has(u.id) ? { ...u, status: 'disetujui' } : u
        ),
      };
    });

    setCurrentCategory(targetCategory);
    setCurrentMainTab('transaksi');
    setCurrentSubTab('perhitungan');
    showToast(
      `Berhasil mentransfer ${items.length} usulan obat ke Perhitungan / SP ${targetCategory.toUpperCase()}!`,
      'success'
    );
  };

  const handleExportUsulanPDF = async (orientation: 'portrait' | 'landscape' = 'portrait') => {
    showToast(`Menyiapkan & menyinkronkan dokumen PDF (${orientation.toUpperCase()})...`, 'info');

    // Auto-sync master & pricelist to ensure data integrity
    const { syncedMasterList, syncedPriceList } = performFullMasterPriceSync(
      appState.masterList,
      appState.priceList
    );
    setAppState((prev) => ({
      ...prev,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    });

    const effectiveSettings = activePharmacyProfile
      ? {
          ...appState.settings,
          namaApotek: activePharmacyProfile.namaApotek,
          alamatApotek: activePharmacyProfile.alamatApotek,
          sipaNo: activePharmacyProfile.sipaNo,
          namaApoteker: activePharmacyProfile.namaApoteker,
          siaNo: activePharmacyProfile.siaNo,
          teleponApotek: activePharmacyProfile.telepon,
        }
      : appState.settings;

    const targetPbf = appState.targetPbfOrder?.[currentCategory] || '';
    const res = await FileSystemManager.exportUsulanToPDF(
      appState.rows[currentCategory],
      currentCategory,
      appState.diskonCOD[currentCategory],
      effectiveSettings,
      orientation,
      targetPbf,
      appState.history,
      appState.masterList,
      appState.priceList
    );
    if (res.success) {
      showToast(`Dokumen Usulan PDF (${orientation}) berhasil dicetak & disimpan! Data tersinkronisasi.`, 'success', res.path);
    }
  };

  const handleExportUsulanPNG = async (orientation: 'portrait' | 'landscape' = 'portrait') => {
    const el = document.getElementById('printable-usulan-document');
    showToast(`Memproses gambar PNG dokumen usulan (${orientation.toUpperCase()})...`, 'info');
    try {
      // Auto-sync master & pricelist
      const { syncedMasterList, syncedPriceList } = performFullMasterPriceSync(
        appState.masterList,
        appState.priceList
      );
      setAppState((prev) => ({
        ...prev,
        masterList: syncedMasterList,
        priceList: syncedPriceList,
      }));
      saveAppState({
        ...appState,
        masterList: syncedMasterList,
        priceList: syncedPriceList,
      });

      const today = new Date().toISOString().split('T')[0];
      const fileName = `Usulan_Pembelian_${currentCategory.toUpperCase()}_${orientation.toUpperCase()}_${today}.png`;
      const effectiveSettings = activePharmacyProfile
        ? {
            ...appState.settings,
            namaApotek: activePharmacyProfile.namaApotek,
            alamatApotek: activePharmacyProfile.alamatApotek,
            sipaNo: activePharmacyProfile.sipaNo,
            namaApoteker: activePharmacyProfile.namaApoteker,
            siaNo: activePharmacyProfile.siaNo,
            teleponApotek: activePharmacyProfile.telepon,
          }
        : appState.settings;

      const targetPbf = appState.targetPbfOrder?.[currentCategory] || '';
      const res = await FileSystemManager.exportUsulanToPNG(
        el,
        appState.rows[currentCategory],
        currentCategory,
        effectiveSettings,
        appState.diskonCOD[currentCategory] || 0,
        orientation,
        fileName,
        targetPbf,
        appState.history,
        appState.masterList,
        appState.priceList
      );
      if (res.success) {
        showToast(`Gambar dokumen usulan PNG (${orientation}) berhasil disimpan utuh & tajam!`, 'success', res.path);
      } else {
        showToast('Gagal memproses gambar PNG. Anda dapat menggunakan opsi "Cetak PDF" sebagai alternatif dokumen resmi.', 'warning');
      }
    } catch (err: any) {
      console.error('PNG export exception:', err);
      showToast('Terjadi kesalahan saat memproses PNG: ' + (err?.message || 'Gagal merender gambar'), 'error');
    }
  };

  const handleUpdateTargetPbf = (category: DrugCategory, pbfName: string) => {
    setAppState((prev) => {
      const updated = {
        ...prev,
        targetPbfOrder: {
          ...(prev.targetPbfOrder || { reguler: '', oot: '', prekursor: '', psikotropika: '', narkotika: '' }),
          [category]: pbfName,
        },
      };
      saveAppState(updated);
      return updated;
    });
  };

  const handleApplyTargetPbfToAllRows = (category: DrugCategory, pbfName: string) => {
    const targetValue = !pbfName || pbfName.trim() === '' || pbfName.trim() === '-' ? '-' : pbfName.trim();
    setAppState((prev) => {
      const currentCategoryRows = prev.rows[category] || [];
      const targetLower = targetValue.toLowerCase();

      const updatedRows = currentCategoryRows.map((row) => {
        // Set PBF and pbfTerakhir on EVERY single row (both named and empty rows)
        const updatedRow: DrugCalculationRow = {
          ...row,
          pbfTerakhir: targetValue,
          pbf: targetValue,
        };

        // If a real PBF is selected, try to automatically sync HNA and Diskon from priceList for this drug
        if (targetValue !== '-' && targetValue !== '' && row.nama && prev.priceList && prev.priceList.length > 0) {
          const cleanDrug = (row.nama || '').trim().toLowerCase();
          const matchedOffer = prev.priceList.find(
            (pl) =>
              (pl.pbf || '').trim().toLowerCase() === targetLower &&
              ((pl.nama || '').trim().toLowerCase() === cleanDrug ||
                cleanDrug.includes((pl.nama || '').trim().toLowerCase()) ||
                (pl.nama || '').trim().toLowerCase().includes(cleanDrug) ||
                calculateDrugSimilarity(cleanDrug, (pl.nama || '').trim().toLowerCase()) >= 0.65)
          );

          if (matchedOffer) {
            const disc = (matchedOffer as any).diskonPct ?? matchedOffer.diskon ?? 0;
            const isPpn = row.includePpn !== false;
            const hnaPlusPpn = isPpn ? Math.round(matchedOffer.hna * 1.11) : matchedOffer.hna;
            const discFactor = (100 - disc) / 100;
            const nettoHna = matchedOffer.hna * discFactor;
            const newHargaJadi = Math.round(isPpn ? nettoHna * 1.11 : nettoHna);

            updatedRow.hna = matchedOffer.hna;
            updatedRow.diskonPct = disc;
            updatedRow.hnaPlusPpn = hnaPlusPpn;
            updatedRow.hargaJadi = newHargaJadi;
            if (matchedOffer.sku && !updatedRow.sku) {
              updatedRow.sku = matchedOffer.sku;
            }
          }
        }

        return updatedRow;
      });

      const updated = {
        ...prev,
        rows: {
          ...prev.rows,
          [category]: updatedRows,
        },
        targetPbfOrder: {
          ...(prev.targetPbfOrder || { reguler: '', oot: '', prekursor: '', psikotropika: '', narkotika: '' }),
          [category]: targetValue,
        },
      };
      saveAppState(updated);
      return updated;
    });
    if (targetValue === '-') {
      showToast(`PBF pada seluruh baris pemesanan ${category.toUpperCase()} telah dikosongkan (-)`, 'info');
    } else {
      showToast(`Berhasil menyetel PBF "${targetValue}" ke seluruh baris pemesanan ${category.toUpperCase()}!`, 'success');
    }
  };

  const handlePrint = () => {
    // Auto-sync master and price list and persist state before printing
    const { syncedMasterList, syncedPriceList } = performFullMasterPriceSync(
      appState.masterList,
      appState.priceList
    );
    setAppState((prev) => ({
      ...prev,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    });
    window.print();
  };

  // Full App JSON Backup & Restore
  const handleExportBackupJSON = async () => {
    const res = await FileSystemManager.exportAppStateToJSON(appState);
    if (res.success) {
      showToast('Cadangan database JSON lengkap berhasil disimpan!', 'success', res.path);
    }
  };

  const handleImportBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && (parsed.masterList || parsed.rows)) {
          openConfirmDialog(
            'Pulihkan Database JSON',
            `Apakah Anda yakin ingin memulihkan seluruh data aplikasi dari file "${file.name}"? Data saat ini akan digantikan.`,
            () => {
              setAppState((prev) => ({
                ...prev,
                ...parsed,
              }));
              showToast('Database berhasil dipulihkan dari file JSON!', 'success');
            }
          );
        } else {
          showToast('Format berkas JSON tidak sesuai struktur data apotek.', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca berkas JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Excel Importers
  const handleImportCalculationExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheetRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        const importedRows: DrugCalculationRow[] = [];
        sheetRows.forEach((r) => {
          const nama = r['Nama Obat'] || r['nama'] || r['Nama'];
          if (nama) {
            const hnaVal = parseFloat(r['HNA Satuan (Rp)'] || r['HNA (Rp)'] || r['HNA'] || 0);
            importedRows.push({
              id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              sku: r['Kode SKU'] || r['SKU'] || generateSKU(currentCategory),
              nama: nama.toString().trim(),
              hnaPlusPpn: parseFloat(r['HNA + PPN 11% (Rp)'] || r['HNA + PPN (Rp)'] || (hnaVal * 1.11)),
              hna: hnaVal,
              diskonPct: parseFloat(r['Diskon (%)'] || r['Diskon'] || 0),
              minta: parseInt(r['Kuantitas Beli'] || r['Minta/Beli'] || r['Qty'] || 1),
              beli: parseInt(r['Kuantitas Beli'] || r['Minta/Beli'] || r['Qty'] || 1),
              pabrik: r['Pabrik / Produsen'] || r['Pabrik'] || '',
              kemasan: r['Kemasan'] || '',
              pbf: r['PBF Rekomendasi'] || r['PBF'] || '',
              historyHarga: hnaVal,
              tanggal: new Date().toISOString().split('T')[0],
              stok: 0,
            });
          }
        });

        if (importedRows.length > 0) {
          setAppState((prev) => ({
            ...prev,
            rows: {
              ...prev.rows,
              [currentCategory]: importedRows,
            },
          }));
          showToast(`Berhasil memuat ${importedRows.length} baris ke Perhitungan ${currentCategory.toUpperCase()}!`, 'success');
        } else {
          showToast('Tidak ada data obat valid dalam berkas Excel.', 'warning');
        }
      } catch (err) {
        showToast('Gagal memproses berkas Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportMasterExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheetRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        let importedCount = 0;
        const currentList = [...appState.masterList];

        sheetRows.forEach((r) => {
          const nama = r['Nama Obat'] || r['nama'] || r['Nama'];
          if (nama) {
            const rawCat = (r['Kategori'] || 'reguler').toString().toLowerCase();
            const cat: DrugCategory = rawCat === 'prekursor' ? 'prekursor' : rawCat === 'oot' ? 'oot' : 'reguler';
            const skuVal = r['Kode SKU'] || r['SKU'] || generateSKU(cat);
            const hnaVal = parseFloat(r['HNA Terakhir (Rp)'] || r['HNA'] || 0);

            const existingIdx = currentList.findIndex((m) => m.nama.toLowerCase().trim() === nama.toString().toLowerCase().trim());
            if (existingIdx !== -1) {
              currentList[existingIdx].sku = skuVal;
              currentList[existingIdx].hna = hnaVal || currentList[existingIdx].hna;
              currentList[existingIdx].pabrik = r['Pabrik'] || currentList[existingIdx].pabrik;
              currentList[existingIdx].kemasan = r['Kemasan'] || currentList[existingIdx].kemasan;
              currentList[existingIdx].pbf = r['PBF Rekomendasi'] || r['PBF'] || currentList[existingIdx].pbf;
            } else {
              currentList.push({
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                sku: skuVal,
                nama: nama.toString().trim(),
                kategori: cat,
                pabrik: r['Pabrik'] || '-',
                kemasan: r['Kemasan'] || '-',
                pbf: r['PBF Rekomendasi'] || r['PBF'] || '-',
                hna: hnaVal,
                historyHarga: parseFloat(r['History Harga Terakhir'] || hnaVal),
                tanggal: r['Tanggal Pembelian'] || new Date().toISOString().split('T')[0],
                stok: parseInt(r['Sisa Stok'] || r['Stok'] || 0),
                minStok: parseInt(r['Stok Minimum'] || 5),
              });
            }
            importedCount++;
          }
        });

        const { syncedMasterList, syncedPriceList, stats } = performFullMasterPriceSync(
          currentList,
          appState.priceList
        );

        setAppState((prev) => ({
          ...prev,
          masterList: syncedMasterList,
          priceList: syncedPriceList,
        }));
        saveAppState({
          ...appState,
          masterList: syncedMasterList,
          priceList: syncedPriceList,
        });
        showToast(
          `Berhasil mengimpor ${importedCount} data Master SKU!`,
          'success',
          `Otomatis disinkronkan ke Price List (${stats.newlyAddedToPriceList} penawaran baru terdaftar).`
        );
      } catch (err) {
        showToast('Gagal memproses berkas Excel Master.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportPriceListExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheetRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        let importedCount = 0;
        const currentList = [...appState.priceList];

        sheetRows.forEach((r) => {
          const nama = r['Nama Obat'] || r['nama'];
          if (nama) {
            const hna = parseFloat(r['HNA Satuan (Rp)'] || r['HNA (Rp)'] || r['HNA'] || 0);
            const diskon = parseFloat(r['Diskon (%)'] || r['Diskon'] || 0);
            const statusPpnStr = (r['Status PPN'] || r['PPN'] || '').toString().toLowerCase();
            const isNonPpn = statusPpnStr.includes('non') || statusPpnStr.includes('netto') || statusPpnStr.includes('tanpa');
            const hpp = isNonPpn ? (hna - hna * (diskon / 100)) : (hna - hna * (diskon / 100)) * 1.11;
            const stokVal = parseInt(r['Stok PBF'] || r['Stok'] || r['stok'] || 0, 10) || 0;

            currentList.push({
              id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              sku: r['Kode SKU'] || generateSKU('reguler'),
              nama: nama.toString().trim(),
              pbf: (r['PBF / Supplier'] || r['PBF'] || 'Distributor').toString().trim(),
              hna,
              diskon,
              hpp,
              includePpn: !isNonPpn,
              stok: stokVal,
              tglUpdate: r['Tanggal Update'] || new Date().toISOString().split('T')[0],
              kontakPbf: r['Kontak'] || '',
              catatan: r['Catatan'] || '',
            });
            importedCount++;
          }
        });

        const { syncedMasterList, syncedPriceList, stats } = performFullMasterPriceSync(
          appState.masterList,
          currentList
        );

        setAppState((prev) => ({
          ...prev,
          masterList: syncedMasterList,
          priceList: syncedPriceList,
        }));
        saveAppState({
          ...appState,
          masterList: syncedMasterList,
          priceList: syncedPriceList,
        });
        showToast(
          `Berhasil mengimpor ${importedCount} penawaran harga PBF!`,
          'success',
          `Otomatis disinkronkan ke Master (${stats.newlyAddedToMaster} obat baru dicatat, ${stats.masterPricesOptimized} harga dioptimalkan).`
        );
      } catch (err) {
        showToast('Gagal memproses berkas Excel Price List.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportHistoryExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheetRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        let importedCount = 0;
        const currentList = [...appState.history];

        sheetRows.forEach((r) => {
          const nama = r['Nama Obat'] || r['nama'];
          if (nama) {
            const rawCat = (r['Kategori'] || 'reguler').toString().toLowerCase();
            const cat: DrugCategory = rawCat === 'prekursor' ? 'prekursor' : rawCat === 'oot' ? 'oot' : 'reguler';
            const hna = parseFloat(r['HNA Satuan (Rp)'] || r['HNA'] || 0);

            currentList.unshift({
              id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              tgl: r['Tanggal Transaksi'] || new Date().toISOString().split('T')[0],
              noSp: r['No. SP / Faktur'] || '',
              kategori: cat,
              sku: r['Kode SKU'] || generateSKU(cat),
              nama: nama.toString().trim(),
              pbf: r['PBF / Supplier'] || '-',
              hna,
              diskon: parseFloat(r['Diskon (%)'] || 0),
              hpp: parseFloat(r['HPP (+PPN 11%) (Rp)'] || (hna * 1.11)),
              qty: parseInt(r['Jumlah Pesanan'] || r['Qty'] || 1),
              total: parseFloat(r['Total Pembayaran (Rp)'] || r['Total'] || 0),
            });
            importedCount++;
          }
        });

        setAppState((prev) => ({
          ...prev,
          history: currentList,
        }));
        showToast(`Berhasil mengimpor ${importedCount} catatan riwayat!`, 'success');
      } catch (err) {
        showToast('Gagal memproses berkas Excel Riwayat.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Quick Inject Price List item to Calculation Sheet
  const handleUsePriceOfferInCalc = (offer: PriceOfferItem) => {
    const isOfferPpn = offer.includePpn !== false;
    const newRow = createEmptyCalculationRow(currentCategory, {
      sku: offer.sku,
      nama: offer.nama,
      hna: offer.hna,
      includePpn: isOfferPpn,
      hnaPlusPpn: isOfferPpn ? Math.round(offer.hna * 1.11) : offer.hna,
      diskonPct: offer.diskon,
      pbf: offer.pbf,
      minta: 1,
      beli: 1,
    });

    setAppState((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [currentCategory]: [...prev.rows[currentCategory], newRow],
      },
    }));

    setCurrentMainTab('transaksi');
    setCurrentSubTab('perhitungan');
    showToast(`Obat "${offer.nama}" (${offer.pbf}) ditambahkan ke lembar perhitungan.`, 'success');
  };

  // Master & Price List Automatic Synchronizers
  const handleFullMasterPriceSync = () => {
    const { syncedMasterList, syncedPriceList, stats } = performFullMasterPriceSync(
      appState.masterList,
      appState.priceList
    );
    setAppState((prev) => ({
      ...prev,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    });
    showToast(
      'Sinkronisasi Master & Price List Selesai!',
      'success',
      `${stats.skusUnified} SKU disatukan, ${stats.masterPricesOptimized} harga terbaik diterapkan, ${stats.newlyAddedToMaster} obat baru dicatat di Master.`
    );
  };

  const handleApplyCheapestPricesToMaster = () => {
    const { syncedMasterList, syncedPriceList, stats } = performFullMasterPriceSync(
      appState.masterList,
      appState.priceList
    );
    setAppState((prev) => ({
      ...prev,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: syncedMasterList,
      priceList: syncedPriceList,
    });
    showToast(
      'Harga Termurah PBF Diterapkan ke Master!',
      'success',
      `${stats.masterPricesOptimized} obat di Master kini disinkronkan ke harga dan distributor termurah.`
    );
  };

  const handleSetDefaultMasterPbf = (sku: string, pbf: string, hna: number) => {
    setAppState((prev) => {
      const updatedMaster = prev.masterList.map((m) =>
        m.sku === sku ? { ...m, pbf, hna, historyHarga: m.hna || hna } : m
      );
      saveAppState({ ...prev, masterList: updatedMaster });
      return { ...prev, masterList: updatedMaster };
    });
    showToast(`PBF Utama untuk SKU ${sku} diatur ke ${pbf}!`, 'success');
  };

  const handleAddMasterItem = (item: MasterDrugItem) => {
    const updatedMaster = [item, ...appState.masterList];
    const { updatedPriceList } = syncMasterToPriceList(item, appState.priceList);
    setAppState((prev) => ({
      ...prev,
      masterList: updatedMaster,
      priceList: updatedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: updatedMaster,
      priceList: updatedPriceList,
    });
    showToast(`Obat "${item.nama}" berhasil ditambahkan & otomatis disinkronkan ke Price List!`, 'success');
  };

  const handleUpdateMasterItem = (item: MasterDrugItem) => {
    const updatedMaster = appState.masterList.map((m) => (m.id === item.id ? item : m));
    const { updatedPriceList } = syncMasterToPriceList(item, appState.priceList);
    setAppState((prev) => ({
      ...prev,
      masterList: updatedMaster,
      priceList: updatedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: updatedMaster,
      priceList: updatedPriceList,
    });
    showToast(`Data "${item.nama}" berhasil diperbarui & otomatis disinkronkan!`, 'success');
  };

  const handleDeleteMasterItem = (id: string) => {
    setAppState((prev) => {
      const updatedMaster = prev.masterList.filter((m) => m.id !== id);
      saveAppState({ ...prev, masterList: updatedMaster });
      return { ...prev, masterList: updatedMaster };
    });
    showToast('Data obat berhasil dihapus dari Master.', 'info');
  };

  const handleAddPriceOffer = (offer: PriceOfferItem) => {
    const { updatedMasterList, syncedOffer } = syncOfferToMaster(offer, appState.masterList);
    const updatedPriceList = [syncedOffer, ...appState.priceList];
    setAppState((prev) => ({
      ...prev,
      masterList: updatedMasterList,
      priceList: updatedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: updatedMasterList,
      priceList: updatedPriceList,
    });
    showToast(`Penawaran "${offer.nama}" (${offer.pbf}) berhasil ditambahkan & otomatis disinkronkan ke Master!`, 'success');
  };

  const handleAddMultiplePriceOffers = (offers: PriceOfferItem[], autoApplyBestPrice?: boolean) => {
    let currentMaster = [...appState.masterList];
    const unifiedOffers: PriceOfferItem[] = [];

    offers.forEach((offer) => {
      const res = syncOfferToMaster(offer, currentMaster);
      currentMaster = res.updatedMasterList;
      unifiedOffers.push(res.syncedOffer);
    });

    const mergedPriceList = [...unifiedOffers, ...appState.priceList];
    setAppState((prev) => ({
      ...prev,
      masterList: currentMaster,
      priceList: mergedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: currentMaster,
      priceList: mergedPriceList,
    });

    showToast(`${offers.length} penawaran harga otomatis disinkronkan ke Master & Price List!`, 'success');

    if (autoApplyBestPrice) {
      setTimeout(() => {
        handleApplyBestPricesToActiveCategory(mergedPriceList);
      }, 100);
    }
  };

  const handleUpdatePriceOffer = (offer: PriceOfferItem) => {
    const { updatedMasterList, syncedOffer } = syncOfferToMaster(offer, appState.masterList);
    const updatedPriceList = appState.priceList.map((p) => (p.id === offer.id ? syncedOffer : p));
    setAppState((prev) => ({
      ...prev,
      masterList: updatedMasterList,
      priceList: updatedPriceList,
    }));
    saveAppState({
      ...appState,
      masterList: updatedMasterList,
      priceList: updatedPriceList,
    });
    showToast(`Penawaran "${offer.nama}" berhasil diperbarui & otomatis disinkronkan ke Master!`, 'success');
  };

  const handleDeletePriceOffer = (id: string) => {
    setAppState((prev) => {
      const updatedPriceList = prev.priceList.filter((p) => p.id !== id);
      saveAppState({ ...prev, priceList: updatedPriceList });
      return { ...prev, priceList: updatedPriceList };
    });
    showToast('Penawaran harga dihapus.', 'info');
  };

  const handleResetPriceList = () => {
    openConfirmDialog(
      'Reset Penawaran Harga PBF',
      'Apakah Anda yakin ingin mengosongkan seluruh data penawaran harga distributor/PBF?',
      () => {
        setAppState((prev) => {
          saveAppState({ ...prev, priceList: [] });
          return { ...prev, priceList: [] };
        });
        showToast('Daftar penawaran harga berhasil direset.', 'info');
      }
    );
  };

  // Defekta Handlers
  const handleAddDefektaItem = (item: DefektaItem) => {
    setAppState((prev) => ({
      ...prev,
      defektaList: [item, ...(prev.defektaList || [])],
    }));
  };

  const handleAddMultipleDefektaItems = (newItems: DefektaItem[]) => {
    setAppState((prev) => ({
      ...prev,
      defektaList: [...newItems, ...(prev.defektaList || [])],
    }));
  };

  const handleUpdateDefektaItem = (item: DefektaItem) => {
    setAppState((prev) => ({
      ...prev,
      defektaList: (prev.defektaList || []).map((d) => (d.id === item.id ? item : d)),
    }));
  };

  const handleDeleteDefektaItem = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      defektaList: (prev.defektaList || []).filter((d) => d.id !== id),
    }));
    showToast('Obat berhasil dihapus dari buku defekta.', 'info');
  };

  const handleResetDefektaList = () => {
    setAppState((prev) => ({ ...prev, defektaList: [] }));
    showToast('Buku Defekta berhasil dikosongkan.', 'info');
  };

  // Transfer Defekta items into Calculation Rows
  const handleTransferDefektaToTransaction = (items: DefektaItem[]) => {
    if (!items || items.length === 0) return;

    setAppState((prev) => {
      const updatedRows = { ...prev.rows };

      items.forEach((item) => {
        const cat = item.kategori || currentCategory;
        const currentCatRows = [...(updatedRows[cat] || [])];
        const existingIdx = currentCatRows.findIndex(
          (r) => (r.sku && r.sku === item.sku) || r.nama.toLowerCase() === item.nama.toLowerCase()
        );

        const orderQty = item.jumlahUsul || (item.minStok > item.stok ? item.minStok * 2 - item.stok : 1);
        const hna = item.hna || 0;
        const diskon = item.diskon || 0;
        const diskonRp = hna * (diskon / 100);
        const hnaPlusPpn = Math.round((hna - diskonRp) * 1.11);

        if (existingIdx >= 0) {
          currentCatRows[existingIdx] = {
            ...currentCatRows[existingIdx],
            minta: orderQty,
            beli: orderQty,
            stok: item.stok,
            kemasan: item.satuan || currentCatRows[existingIdx].kemasan,
            pbf: item.pbf || currentCatRows[existingIdx].pbf,
            hna: hna > 0 ? hna : currentCatRows[existingIdx].hna,
            diskonPct: diskon > 0 ? diskon : currentCatRows[existingIdx].diskonPct,
            hnaPlusPpn: hna > 0 ? hnaPlusPpn : currentCatRows[existingIdx].hnaPlusPpn,
          };
        } else {
          currentCatRows.push({
            id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sku: item.sku || generateSKU(cat, item.nama),
            nama: item.nama,
            hna: hna,
            diskonPct: diskon,
            hnaPlusPpn: hnaPlusPpn,
            minta: orderQty,
            beli: orderQty,
            pabrik: item.pabrik || '',
            kemasan: item.satuan || 'Box',
            pbf: item.pbf || '',
            historyHarga: hnaPlusPpn,
            tanggal: new Date().toISOString().split('T')[0],
            stok: item.stok,
            catatan: item.catatan || 'Dari Buku Defekta',
          });
        }

        updatedRows[cat] = currentCatRows;
      });

      return { ...prev, rows: updatedRows };
    });

    // If all items belong to a specific category, switch to it
    if (items.length > 0) {
      setCurrentCategory(items[0].kategori || 'reguler');
    }
    setCurrentMainTab('transaksi');
    setCurrentSubTab('perhitungan');
  };

  // Active Rows & Total Estimation for active category
  const activeRows = appState.rows[currentCategory] || [];
  let totalEstimasiCurrent = 0;
  activeRows.forEach((r) => {
    const diskonRp = (r.hna || 0) * ((r.diskonPct || 0) / 100);
    const hppPpn = ((r.hna || 0) - diskonRp) * 1.11;
    totalEstimasiCurrent += hppPpn * (r.beli || 0);
  });
  const codDiscountRp = totalEstimasiCurrent * ((appState.diskonCOD[currentCategory] || 0) / 100);
  totalEstimasiCurrent -= codDiscountRp;

  // Defekta alerts count
  const defektaListState = appState.defektaList || [];
  const defektaAlertCount = defektaListState.filter((d) => d.stok <= (d.minStok !== undefined ? d.minStok : 5) || d.stok <= 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-zinc-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background light orbs for frosted glass depth */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 1. TOP RESPONSIVE OPTIMIZED NAVBAR */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={(cat) => setCurrentCategory(cat)}
        currentMainTab={currentMainTab}
        onSelectMainTab={(tab) => setCurrentMainTab(tab)}
        currentSubTab={currentSubTab}
        onSelectSubTab={(sub) => setCurrentSubTab(sub)}
        connectedFolder={connectedFolder}
        onConnectFolder={handleConnectDeviceFolder}
        onExportBackupJSON={handleExportBackupJSON}
        onImportBackupJSON={() => jsonFileInputRef.current?.click()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activePharmacy={activePharmacyProfile}
        supplierCount={appState.suppliers?.length || 0}
        defektaCount={defektaListState.length}
        defektaAlertCount={defektaAlertCount}
        isOnline={isOnline}
        // Sub-actions
        onAddRow={() => handleAddCalculationRow()}
        onResetSheet={handleResetSheet}
        onCommitHistory={handleCommitTransactionToHistory}
        onExportExcel={currentSubTab === 'perhitungan' ? handleExportPerhitunganExcel : handleExportUsulanExcel}
        onExportPDF={handleExportUsulanPDF}
        onExportPNG={handleExportUsulanPNG}
        onPrint={handlePrint}
        onImportExcelPerhitungan={() => calcExcelInputRef.current?.click()}
        lastSavedTime={lastSavedTime}
        isAutosaving={isAutosaving}
        onRecoverSession={sessionDraftInfo ? handleRecoverLastSession : undefined}
        hasSessionDraft={!!sessionDraftInfo}
        activeRowCount={activeRows.filter((r) => r.nama).length}
        totalEstimasiValue={totalEstimasiCurrent}
        onOpenFirebaseSync={() => setIsFirebaseSyncOpen(true)}
        currentUser={currentUser}
      />

      {/* Auto-save Session Recovery Notification Banner */}
      {showRecoverBanner && sessionDraftInfo && (
        <div
          id="recover-session-banner"
          className="bg-gradient-to-r from-amber-600/95 via-indigo-950/95 to-slate-900/95 border-b border-amber-400/40 px-3 sm:px-6 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md relative z-20"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/20 rounded-lg border border-amber-300/30 text-amber-300">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>Draf Sesi Sebelumnya Ditemukan</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-black">
                  AUTOSAVE DRAFT
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Tersimpan pada <strong>{sessionDraftInfo.timeStr}</strong> ({sessionDraftInfo.dateStr}) &bull; Kategori: <strong className="uppercase">{sessionDraftInfo.category}</strong> ({sessionDraftInfo.itemCount} item aktif)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="banner-recover-session-btn"
              onClick={handleRecoverLastSession}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recover Last Session</span>
            </button>
            <button
              onClick={() => setShowRecoverBanner(false)}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg transition hover:bg-white/10 cursor-pointer"
              title="Abaikan draf sesi ini"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* Android PWA Install Banner */}
      <PWAInstallBanner onShowToast={showToast} />

      {/* Offline Status Floating Indicator */}
      <OfflineIndicator />

      {/* 2. MAIN VIEW CONTAINER */}
      <main className="max-w-7xl mx-auto p-3 sm:p-5 pb-28 sm:pb-24 flex-1 w-full space-y-4 relative z-10">
        {/* VIEW 1: TRANSAKSI (PERHITUNGAN & USULAN) */}
        {currentMainTab === 'transaksi' && (
          <div>
            {currentSubTab === 'perhitungan' && (
              <PerhitunganView
                category={currentCategory}
                rows={activeRows}
                diskonCOD={appState.diskonCOD[currentCategory] || 0}
                masterList={appState.masterList}
                priceList={appState.priceList}
                history={appState.history}
                suppliers={appState.suppliers || []}
                unitsList={appState.unitsList || DEFAULT_UNITS_LIST}
                allDistinctUnits={allDistinctUnits}
                targetPbf={appState.targetPbfOrder?.[currentCategory] || ''}
                onUpdateTargetPbf={(pbf) => handleUpdateTargetPbf(currentCategory, pbf)}
                onApplyTargetPbfToAllRows={(pbf) => handleApplyTargetPbfToAllRows(currentCategory, pbf)}
                onSaveUnit={handleSaveUnit}
                onAutoRegisterPbf={handleAutoRegisterPbf}
                onOpenUnitsManager={() => setIsUnitsManagerOpen(true)}
                onUpdateRow={handleUpdateCalculationRow}
                onAddRow={(preset) => handleAddCalculationRow(typeof preset === 'string' ? preset : undefined)}
                onRemoveRow={handleRemoveCalculationRow}
                onDuplicateRow={handleDuplicateCalculationRow}
                onUpdateDiskonCOD={handleUpdateDiskonCOD}
                onSelectMasterDrug={handleSelectMasterDrug}
                onApplyAllBestPrices={() => handleApplyBestPricesToActiveCategory()}
                onSwitchToUsulan={() => setCurrentSubTab('usulan')}
                onCommitHistory={handleCommitTransactionToHistory}
              />
            )}

            {currentSubTab === 'usulan' && (
              <UsulanView
                category={currentCategory}
                rows={activeRows}
                diskonCOD={appState.diskonCOD[currentCategory] || 0}
                settings={appState.settings}
                activePharmacy={activePharmacyProfile}
                suppliers={appState.suppliers || []}
                priceList={appState.priceList}
                history={appState.history}
                masterList={appState.masterList}
                unitsList={appState.unitsList || DEFAULT_UNITS_LIST}
                allDistinctUnits={allDistinctUnits}
                targetPbf={appState.targetPbfOrder?.[currentCategory] || ''}
                onUpdateTargetPbf={(pbf) => handleUpdateTargetPbf(currentCategory, pbf)}
                onApplyTargetPbfToAllRows={(pbf) => handleApplyTargetPbfToAllRows(currentCategory, pbf)}
                onSaveUnit={handleSaveUnit}
                onAutoRegisterPbf={handleAutoRegisterPbf}
                onOpenUnitsManager={() => setIsUnitsManagerOpen(true)}
                onApplyAllBestPrices={() => handleApplyBestPricesToActiveCategory()}
                onUpdateRow={handleUpdateCalculationRow}
                onAddRow={() => handleAddCalculationRow()}
                onRemoveRow={handleRemoveCalculationRow}
                onDuplicateRow={handleDuplicateCalculationRow}
                onExportExcel={handleExportUsulanExcel}
                onExportPDF={handleExportUsulanPDF}
                onExportPNG={handleExportUsulanPNG}
                onPrint={handlePrint}
                onResetSheet={handleResetSheet}
                onCommitHistory={handleCommitTransactionToHistory}
                lastSavedTime={lastSavedTime}
                isAutosaving={isAutosaving}
                onRecoverSession={sessionDraftInfo ? handleRecoverLastSession : undefined}
                hasSessionDraft={!!sessionDraftInfo}
              />
            )}
          </div>
        )}

        {/* VIEW: USULAN OBAT MANUAL (DARI OUTLET/APOTEK) */}
        {currentMainTab === 'usulan_obat' && (
          <UsulanObatView
            usulanList={appState.usulanObatList || []}
            outletsList={appState.outletsList || []}
            pharmacyProfiles={appState.pharmacyProfiles || []}
            suppliers={appState.suppliers || []}
            masterList={appState.masterList || []}
            priceList={appState.priceList || []}
            settings={appState.settings}
            onAddUsulan={handleAddUsulan}
            onAddMultipleUsulan={handleAddMultipleUsulan}
            onUpdateUsulan={handleUpdateUsulan}
            onDeleteUsulan={handleDeleteUsulan}
            onAddOutlet={handleAddOutlet}
            onDeleteOutlet={handleDeleteOutlet}
            onTransferToTransaction={handleTransferUsulanToTransaction}
            showToast={showToast}
            openConfirmDialog={openConfirmDialog}
          />
        )}

        {/* VIEW 2: DATA PBF / DISTRIBUTOR SUPPLIER */}
        {currentMainTab === 'pbf' && (
          <SupplierManager
            suppliers={appState.suppliers || []}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSyncAllDetectedPbfs={handleSyncAllDetectedPbfs}
            showToast={showToast}
            openConfirmDialog={openConfirmDialog}
          />
        )}

        {/* VIEW 3: KOMPARASI HARGA PBF */}
        {currentMainTab === 'pricelist' && (
          <PriceListView
            priceList={appState.priceList}
            masterList={appState.masterList}
            suppliers={appState.suppliers || []}
            onAutoRegisterPbf={handleAutoRegisterPbf}
            onAddPriceOffer={handleAddPriceOffer}
            onAddMultiplePriceOffers={handleAddMultiplePriceOffers}
            onUpdatePriceOffer={handleUpdatePriceOffer}
            onDeletePriceOffer={handleDeletePriceOffer}
            onResetPriceList={handleResetPriceList}
            onUseInCalculation={handleUsePriceOfferInCalc}
            onApplyBestPricesToTransactions={() => handleApplyBestPricesToActiveCategory()}
            onExportExcel={() => FileSystemManager.exportPriceListToExcel(appState.priceList)}
            onImportExcel={handleImportPriceListExcel}
            onShowToast={showToast}
            onFullSync={handleFullMasterPriceSync}
            onSetDefaultMasterPbf={handleSetDefaultMasterPbf}
          />
        )}

        {/* VIEW 4: MASTER DATA OBAT & SKU */}
        {currentMainTab === 'master' && (
          <MasterView
            masterList={appState.masterList}
            priceList={appState.priceList}
            suppliers={appState.suppliers || []}
            unitsList={appState.unitsList || DEFAULT_UNITS_LIST}
            allDistinctUnits={allDistinctUnits}
            onSaveUnit={handleSaveUnit}
            onAutoRegisterPbf={handleAutoRegisterPbf}
            onOpenUnitsManager={() => setIsUnitsManagerOpen(true)}
            onAddMasterItem={handleAddMasterItem}
            onUpdateMasterItem={handleUpdateMasterItem}
            onDeleteMasterItem={handleDeleteMasterItem}
            onExportExcel={() => FileSystemManager.exportMasterListToExcel(appState.masterList)}
            onImportExcel={handleImportMasterExcel}
            onShowToast={showToast}
            onFullSync={handleFullMasterPriceSync}
            onApplyCheapestPricesToMaster={handleApplyCheapestPricesToMaster}
            onAddPriceOffer={handleAddPriceOffer}
          />
        )}

        {/* VIEW 5: RIWAYAT PEMBELIAN */}
        {currentMainTab === 'history' && (
          <HistoryView
            history={appState.history}
            onDeleteHistoryItem={(id) =>
              setAppState((prev) => {
                const updatedHistory = prev.history.filter((h) => h.id !== id);
                const updated = { ...prev, history: updatedHistory };
                saveAppState(updated);
                return updated;
              })
            }
            onDeleteMultipleItems={(ids) =>
              setAppState((prev) => {
                const idSet = new Set(ids);
                const updatedHistory = prev.history.filter((h) => !idSet.has(h.id));
                const updated = { ...prev, history: updatedHistory };
                saveAppState(updated);
                return updated;
              })
            }
            onClearHistory={() =>
              setAppState((prev) => {
                const updated = { ...prev, history: [] };
                saveAppState(updated);
                return updated;
              })
            }
            onClearCategoryHistory={(cat) =>
              setAppState((prev) => {
                const updatedHistory = prev.history.filter((h) => h.kategori !== cat);
                const updated = { ...prev, history: updatedHistory };
                saveAppState(updated);
                return updated;
              })
            }
            onSaveHistory={() => {
              saveAppState(appState);
              showToast('Data riwayat pembelian berhasil disimpan permanen!', 'success');
            }}
            onExportExcel={() => FileSystemManager.exportHistoryToExcel(appState.history)}
            onImportExcel={handleImportHistoryExcel}
            onNavigateToTransaksi={() => {
              setCurrentMainTab('transaksi');
              setCurrentSubTab('perhitungan');
            }}
          />
        )}

        {/* VIEW 6: MANAJEMEN BERKAS INTERNAL & DISK ENGINE */}
        {currentMainTab === 'storage' && (
          <InternalFileManager
            appState={appState}
            onUpdateAppState={(newState) => {
              setAppState(newState);
              saveAppState(newState);
            }}
            connectedFolder={connectedFolder}
            onConnectFolder={handleConnectDeviceFolder}
            onDisconnectFolder={handleDisconnectDeviceFolder}
            onShowToast={showToast}
            onOpenConfirmDialog={openConfirmDialog}
            onOpenFirebaseSync={() => setIsFirebaseSyncOpen(true)}
            currentUser={currentUser}
            lastCloudSyncTime={lastCloudSyncTime}
            setLastCloudSyncTime={setLastCloudSyncTime}
          />
        )}
      </main>

      {/* 3. ANDROID & MOBILE BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        currentMainTab={currentMainTab}
        onSelectMainTab={(tab) => setCurrentMainTab(tab)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        supplierCount={appState.suppliers?.length || 0}
        priceListCount={appState.priceList?.length || 0}
        usulanCount={appState.usulanObatList?.length || 0}
      />

      {/* 4. HIDDEN FILE INPUTS */}
      <input
        type="file"
        ref={jsonFileInputRef}
        accept=".json,application/json"
        onChange={handleImportBackupJSON}
        className="hidden"
      />
      <input
        type="file"
        ref={calcExcelInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportCalculationExcel}
        className="hidden"
      />
      <input
        type="file"
        ref={masterExcelInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportMasterExcel}
        className="hidden"
      />
      <input
        type="file"
        ref={priceListExcelInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportPriceListExcel}
        className="hidden"
      />
      <input
        type="file"
        ref={historyExcelInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportHistoryExcel}
        className="hidden"
      />

      {/* 4. MODALS & DIALOGS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appState.settings}
        pharmacyProfiles={appState.pharmacyProfiles || []}
        activePharmacyId={appState.activePharmacyId || 'pharm_sehat'}
        onSaveSettings={handleSaveSettings}
        onSelectPharmacy={handleSelectPharmacy}
        onSavePharmacyProfiles={handleSavePharmacyProfiles}
        showToast={showToast}
      />

      <CustomDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <UnitsManagerModal
        isOpen={isUnitsManagerOpen}
        onClose={() => setIsUnitsManagerOpen(false)}
        unitsList={appState.unitsList || DEFAULT_UNITS_LIST}
        allDistinctUnits={allDistinctUnits}
        appState={appState}
        onAddUnit={handleSaveUnit}
        onDeleteUnit={handleDeleteUnit}
        onResetUnits={handleResetUnits}
        showToast={showToast}
      />

      <FirebaseSyncModal
        isOpen={isFirebaseSyncOpen}
        onClose={() => setIsFirebaseSyncOpen(false)}
        appState={appState}
        onApplyCloudState={(state) => {
          setAppState(state);
          saveAppState(state);
        }}
        onShowToast={showToast}
        currentUser={currentUser}
        lastCloudSyncTime={lastCloudSyncTime}
        setLastCloudSyncTime={setLastCloudSyncTime}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
