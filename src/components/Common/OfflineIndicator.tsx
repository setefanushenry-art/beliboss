import React from 'react';
import { WifiOff, Zap } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center justify-between sm:justify-start gap-2.5 bg-amber-500/90 text-slate-950 font-bold px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md border border-amber-300/40 text-xs animate-bounce">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-slate-950" />
        <span>Mode Offline Aktif</span>
      </div>
      <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-lg font-normal">
        Data tersimpan aman di perangkat lokal
      </span>
    </div>
  );
};
