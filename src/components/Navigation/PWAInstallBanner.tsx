import React, { useState } from 'react';
import { Smartphone, Download, X, CheckCircle2, Share, PlusSquare, Sparkles, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onShowToast }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running standalone (as installed app) or dismissed, don't show the prominent top banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success && onShowToast) {
        onShowToast('Aplikasi FarmasiPro berhasil dipasang ke perangkat Anda!', 'success');
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Sleek Android App Banner (Sticky under header or top of mobile) */}
      <aside 
        aria-label="Pemasangan Aplikasi Android"
        className="w-full bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-teal-900/90 border-b border-indigo-500/30 backdrop-blur-xl px-3 py-2.5 sm:px-4 text-xs shadow-lg relative z-30 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <img src="/icon.svg" alt="App Icon" className="w-full h-full rounded-[10px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white tracking-wide text-xs">FarmasiPro Android App</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold shrink-0">
                  {isAndroid ? 'Android Ready' : 'Mobile PWA'}
                </span>
                <span className="bg-indigo-500/20 text-indigo-200 text-[9px] px-1.5 py-0.2 rounded-md hidden md:inline-flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-amber-300" /> Ringan &amp; Cepat
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Pasang di layar utama HP untuk akses instan full-screen, offline-first, dan tanpa lag.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 border border-white/20 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstallable ? 'Pasang App' : 'Cara Pasang'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Tutup banner"
              aria-label="Tutup banner pemasangan aplikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Android & Mobile Install Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Pasang ke Layar Utama Android</h3>
                  <p className="text-xs text-slate-400">Pengalaman aplikasi native tanpa lewat Play Store</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="font-semibold text-white flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Keunggulan Model Android App:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li><strong className="text-indigo-300">Responsif &amp; Ringan:</strong> Ukuran hanya beberapa KB dengan loading ultra-cepat.</li>
                  <li><strong className="text-emerald-300">Offline-First:</strong> Tetap bisa menghitung HPP &amp; akses data tanpa kuota internet.</li>
                  <li><strong className="text-teal-300">Full-Screen:</strong> Tanpa address bar browser yang mengganggu pandangan.</li>
                  <li><strong className="text-amber-300">Simpan Lokal Aman:</strong> Data apotek tersimpan di perangkat lokal Anda.</li>
                </ul>
              </div>

              {/* Steps based on browser */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-white text-xs">Langkah Pemasangan di Google Chrome / Browser HP:</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                    <p>Buka menu browser dengan menekan ikon <strong>Titik Tiga (&#8942;)</strong> di kanan atas atau ikon <strong>Bagikan</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                    <p>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong> (<em>Add to Home Screen</em>).</p>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                    <p>Tekan <strong>Install / Tambah</strong>. Ikon <strong>FarmasiPro</strong> akan langsung muncul di beranda HP Anda.</p>
                  </div>
                </div>
              </div>

              {isIOS && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Share className="w-3.5 h-3.5" /> Untuk Pengguna iPhone / iPad (Safari):
                  </span>
                  <p className="text-slate-300">
                    Tekan tombol <strong>Share</strong> (ikon kotak dengan panah atas) di toolbar Safari bawah, lalu gulir ke bawah dan pilih <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Saya Mengerti &amp; Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
