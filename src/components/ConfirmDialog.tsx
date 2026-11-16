import { AlertTriangle, X } from 'lucide-react';
import { LanguageCode, UI_TEXT } from '../lib/i18n.ts';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  lang?: LanguageCode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  loading = false,
  lang = 'id',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const t = UI_TEXT[lang].confirm;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                tone === 'danger'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:outline-slate-100"
            aria-label={t.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {details && details.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            {details.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {cancelLabel ?? t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
            }`}
          >
            {loading ? t.processing : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
