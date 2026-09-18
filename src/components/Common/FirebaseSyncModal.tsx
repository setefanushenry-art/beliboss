import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  LogIn,
  ShieldCheck,
  Database,
  Lock,
  X,
  User as UserIcon,
} from 'lucide-react';
import { type User } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  logoutFirebase,
  saveAppStateToCloud,
  loadAppStateFromCloud,
  testConnection,
} from '../../utils/firebase';
import { AppStateData } from '../../types';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppStateData;
  onApplyCloudState: (state: AppStateData) => void;
  onShowToast: (title: string, type?: 'success' | 'warning' | 'error' | 'info', subtitle?: string) => void;
  currentUser: User | null;
  lastCloudSyncTime: string | null;
  setLastCloudSyncTime: (time: string | null) => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  appState,
  onApplyCloudState,
  onShowToast,
  currentUser,
  lastCloudSyncTime,
  setLastCloudSyncTime,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      testConnection()
        .then(() => setConnectionStatus('connected'))
        .catch(() => setConnectionStatus('error'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const user = await loginWithGoogle();
      onShowToast('Login Berhasil', 'success', `Selamat datang, ${user.displayName || user.email}!`);
    } catch (err: any) {
      console.error('Google login error:', err);
      const msg = err?.message || 'Gagal login dengan Google.';
      setErrorMessage(msg);
      onShowToast('Gagal Login', 'error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    try {
      await logoutFirebase();
      onShowToast('Logout Berhasil', 'info', 'Anda telah keluar dari akun Firebase.');
    } catch (err: any) {
      onShowToast('Gagal Logout', 'error', err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadToCloud = async () => {
    if (!currentUser) {
      onShowToast('Perlu Login', 'warning', 'Silakan login terlebih dahulu untuk menyinkronkan data.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await saveAppStateToCloud(currentUser.uid, appState, appState.settings?.namaApotek);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastCloudSyncTime(nowStr);
      onShowToast('Data Berhasil Disimpan ke Cloud', 'success', `Semua master, riwayat, dan transaksi tersimpan aman di Firestore (${nowStr})`);
    } catch (err: any) {
      console.error('Error saving to cloud:', err);
      const msg = err?.message || 'Gagal menyimpan data ke Firestore.';
      setErrorMessage(msg);
      onShowToast('Gagal Sinkronisasi Cloud', 'error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!currentUser) {
      onShowToast('Perlu Login', 'warning', 'Silakan login terlebih dahulu.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const cloudState = await loadAppStateFromCloud(currentUser.uid);
      if (!cloudState) {
        onShowToast('Data Cloud Kosong', 'info', 'Belum ada data apotek yang tersimpan di cloud untuk akun ini.');
        return;
      }
      onApplyCloudState(cloudState);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastCloudSyncTime(nowStr);
      onShowToast('Data Cloud Berhasil Dimuat', 'success', `Aplikasi disinkronkan dengan data terbaru dari Firestore (${nowStr})`);
      onClose();
    } catch (err: any) {
      console.error('Error loading from cloud:', err);
      const msg = err?.message || 'Gagal memuat data dari Firestore.';
      setErrorMessage(msg);
      onShowToast('Gagal Memuat dari Cloud', 'error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/40 text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Firebase Cloud Firestore
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cloud Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan cloud real-time &amp; sinkronisasi multi-perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* User Auth Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status Akun Firebase
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Aturan Keamanan ABAC Aktif</span>
              </div>
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full border border-indigo-400/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentUser.displayName || 'Pengguna Apotek'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Masuk dengan akun Google untuk mengaktifkan sinkronisasi otomatis database apotek ke Google Cloud Firestore.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                  ) : (
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
                  )}
                  <span>Masuk dengan Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Operations */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Aksi Sinkronisasi Firestore
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Upload Button */}
              <button
                onClick={handleUploadToCloud}
                disabled={!currentUser || isProcessing}
                className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 transition text-left flex flex-col justify-between gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                    <CloudUpload className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Lokal ➜ Cloud
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Unggah ke Cloud</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Simpan seluruh data kalkulasi, master SKU &amp; riwayat apotek ke Firestore
                  </p>
                </div>
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownloadFromCloud}
                disabled={!currentUser || isProcessing}
                className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition text-left flex flex-col justify-between gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                    <CloudDownload className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Cloud ➜ Lokal
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Pulihkan dari Cloud</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ambil data cadangan terbaru dari Firestore untuk perangkat ini
                  </p>
                </div>
              </button>
            </div>

            {/* Last Sync Info */}
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Terakhir Disinkronkan:</span>
              </span>
              <span className="font-semibold text-slate-200">
                {lastCloudSyncTime ? `${lastCloudSyncTime}` : 'Belum pernah disinkronkan'}
              </span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 break-words">
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="mt-0.5 text-rose-200/80">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Privacy & Storage Architecture Note */}
          <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Privasi &amp; Isolasi Data Apotek</span>
            </div>
            <p className="leading-relaxed">
              Data apotek Anda disimpan dalam partisi dokumen aman berdasar User ID di Google Cloud Firestore. Hanya akun Google yang terautentikasi dan memiliki ID pemilik yang berhak membaca atau memperbarui data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
