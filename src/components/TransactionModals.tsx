import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  ExpenseItem,
  INCOME_CATEGORIES,
  IncomeItem,
  PAYMENT_METHODS,
  isPositiveAmount,
  isValidDateString,
} from '../shared/finance.ts';
import { formatFirebaseErrorForUser } from '../lib/firestoreStore.ts';
import {
  LanguageCode,
  UI_TEXT,
  translateCategoryLabel,
  translatePaymentMethodLabel,
} from '../lib/i18n.ts';

const CUSTOM_CATEGORY_VALUE = '__CUSTOM__';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ExpenseModalProps {
  open: boolean;
  editing: ExpenseItem | null;
  currency: string;
  lang?: LanguageCode;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
}

export function ExpenseModal({
  open,
  editing,
  currency,
  lang = 'id',
  onClose,
  onSubmit,
}: ExpenseModalProps) {
  const t = UI_TEXT[lang].modals;
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryOption, setCategoryOption] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [subType, setSubType] = useState<string>('Tabungan');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setDescription(editing.description);
      setAmount(String(editing.amount));
      const matchedPreset = EXPENSE_CATEGORIES.find(
        (c) => c.toLowerCase() === editing.category.trim().toLowerCase()
      );
      if (matchedPreset) {
        setCategoryOption(matchedPreset);
        setCustomCategory('');
      } else {
        setCategoryOption(CUSTOM_CATEGORY_VALUE);
        setCustomCategory(editing.category);
      }
      setSubType(editing.subType || 'Tabungan');
      setPaymentMethod(editing.paymentMethod);
      setNotes(editing.notes || '');
    } else {
      setDate(getTodayDateString());
      setDescription('');
      setAmount('');
      setCategoryOption(EXPENSE_CATEGORIES[0]);
      setCustomCategory('');
      setSubType('Tabungan');
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNotes('');
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const isCustomCategory = categoryOption === CUSTOM_CATEGORY_VALUE;
  const effectiveCategory = isCustomCategory ? customCategory.trim() : categoryOption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidDateString(date)) {
      setError(t.errInvalidDate);
      return;
    }
    if (!description.trim()) {
      setError(t.errDescRequired);
      return;
    }
    if (!effectiveCategory) {
      setError(t.errExpenseCatRequired);
      return;
    }
    const parsedAmount = Number(amount);
    if (!isPositiveAmount(parsedAmount)) {
      setError(t.errExpenseAmount);
      return;
    }

    const isSavingCategory = /tabungan|investasi/i.test(effectiveCategory);

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        description: description.trim(),
        category: effectiveCategory,
        subType: isSavingCategory ? subType : '',
        paymentMethod,
        amount: parsedAmount,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(formatFirebaseErrorForUser(err, t.errSaveExpense));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="expense-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {editing ? t.editExpense : t.addExpense}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.expenseSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t.closeExpenseAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.dateTx}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.amountLabel} ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.descLabel}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.expenseCatLabel}
              </label>
              <select
                value={categoryOption}
                onChange={(e) => setCategoryOption(e.target.value)}
                aria-label={t.expenseCatLabel}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategoryLabel(cat, lang)}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY_VALUE}>{t.customOption}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.paymentMethodLabel}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {translatePaymentMethodLabel(pm, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomCategory && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.customCategoryLabel}
              </label>
              <input
                type="text"
                placeholder={t.customExpensePlaceholder}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                maxLength={40}
                required
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>
          )}

          {/tabungan|investasi/i.test(effectiveCategory) && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.allocationTypeLabel}
              </label>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(['Tabungan', 'Investasi'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSubType(type)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      subType === type
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {type === 'Investasi' ? t.investment : t.savings}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.notesOptional}
            </label>
            <textarea
              rows={2}
              placeholder={t.expenseNotesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {submitting ? t.saving : editing ? t.saveChanges : t.saveExpense}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IncomeModalProps {
  open: boolean;
  editing: IncomeItem | null;
  currency: string;
  lang?: LanguageCode;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
}

export function IncomeModal({
  open,
  editing,
  currency,
  lang = 'id',
  onClose,
  onSubmit,
}: IncomeModalProps) {
  const t = UI_TEXT[lang].modals;
  const [date, setDate] = useState(getTodayDateString());
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryOption, setCategoryOption] = useState<string>(INCOME_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setSource(editing.source);
      setAmount(String(editing.amount));
      const matchedPreset = INCOME_CATEGORIES.find(
        (c) => c.toLowerCase() === editing.category.trim().toLowerCase()
      );
      if (matchedPreset) {
        setCategoryOption(matchedPreset);
        setCustomCategory('');
      } else {
        setCategoryOption(CUSTOM_CATEGORY_VALUE);
        setCustomCategory(editing.category);
      }
      setNotes(editing.notes || '');
    } else {
      setDate(getTodayDateString());
      setSource('');
      setAmount('');
      setCategoryOption(INCOME_CATEGORIES[0]);
      setCustomCategory('');
      setNotes('');
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const isCustomCategory = categoryOption === CUSTOM_CATEGORY_VALUE;
  const effectiveCategory = isCustomCategory ? customCategory.trim() : categoryOption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidDateString(date)) {
      setError(t.errInvalidIncomeDate);
      return;
    }
    if (!source.trim()) {
      setError(t.errSourceRequired);
      return;
    }
    if (!effectiveCategory) {
      setError(t.errIncomeCatRequired);
      return;
    }
    const parsedAmount = Number(amount);
    if (!isPositiveAmount(parsedAmount)) {
      setError(t.errIncomeAmount);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        source: source.trim(),
        category: effectiveCategory,
        amount: parsedAmount,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(formatFirebaseErrorForUser(err, t.errSaveIncome));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="income-modal-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="income-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {editing ? t.editIncome : t.addIncome}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.incomeSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t.closeIncomeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.incomeDate}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.amountLabel} ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.sourceLabel}
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={140}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.incomeCatLabel}
            </label>
            <select
              value={categoryOption}
              onChange={(e) => setCategoryOption(e.target.value)}
              aria-label={t.incomeCatLabel}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {translateCategoryLabel(cat, lang)}
                </option>
              ))}
              <option value={CUSTOM_CATEGORY_VALUE}>{t.customOption}</option>
            </select>
          </div>

          {isCustomCategory && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.customCategoryLabel}
              </label>
              <input
                type="text"
                placeholder={t.customIncomePlaceholder}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                maxLength={40}
                required
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.notesOptional}
            </label>
            <textarea
              rows={2}
              placeholder={t.incomeNotesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? t.saving : editing ? t.saveChanges : t.saveIncome}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
