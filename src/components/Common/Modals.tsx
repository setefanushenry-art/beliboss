import React from 'react';
import { AlertCircle, CheckCircle, HelpCircle, Info, X, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: 'help' | 'warning' | 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
}

export const CustomDialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  message,
  icon = 'help',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    help: <HelpCircle className="w-7 h-7 text-indigo-400" />,
    warning: <AlertCircle className="w-7 h-7 text-amber-400" />,
    danger: <XCircle className="w-7 h-7 text-rose-400" />,
    success: <CheckCircle className="w-7 h-7 text-emerald-400" />,
    info: <Info className="w-7 h-7 text-sky-400" />,
  };

  const bgMap = {
    help: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    info: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/15 text-slate-100 shadow-indigo-950/50"
          id="custom-dialog-modal"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 backdrop-blur-xl ${bgMap[icon]}`}>
              {iconMap[icon]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              id="dialog-cancel-button"
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl transition cursor-pointer backdrop-blur-md"
            >
              {cancelText}
            </button>
            <button
              id="dialog-confirm-button"
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer backdrop-blur-md border ${
                icon === 'danger'
                  ? 'bg-rose-600/90 hover:bg-rose-600 border-rose-400/40 shadow-rose-600/25'
                  : 'bg-indigo-600/90 hover:bg-indigo-500 border-indigo-400/40 shadow-indigo-500/25'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const bg =
            t.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40'
              : t.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/30 text-rose-100 shadow-rose-950/40'
              : t.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500/30 text-amber-100 shadow-amber-950/40'
              : 'bg-slate-900/80 border-indigo-500/30 text-indigo-100 shadow-slate-950/40';

          const icon =
            t.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : t.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : t.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            );

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-3.5 rounded-2xl border shadow-2xl flex items-start gap-2.5 pointer-events-auto backdrop-blur-xl ${bg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight">{t.message}</p>
                {t.detail && <p className="text-[11px] opacity-80 mt-0.5 break-words">{t.detail}</p>}
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                className="opacity-60 hover:opacity-100 text-inherit p-0.5 rounded-lg transition cursor-pointer hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
