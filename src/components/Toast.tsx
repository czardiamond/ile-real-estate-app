// src/components/Toast.tsx
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 w-full max-w-sm rounded-xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 pointer-events-auto ${
        isSuccess
          ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
          : isError
          ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
          : 'bg-blue-50/95 dark:bg-blue-950/95 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-100'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-tight">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{message}</p>
      </div>

      <button
        onClick={() => onClose(id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
