import React, { useEffect, useState } from 'react';
import { Check, Database, Languages, Save } from 'lucide-react';
import { CURRENCIES, UserProfile } from '../shared/finance.ts';
import { formatFirebaseErrorForUser } from '../lib/firestoreStore.ts';
import { LANGUAGES, LanguageCode, UI_TEXT } from '../lib/i18n.ts';

interface SettingsViewProps {
  user: UserProfile;
  isCloudMode: boolean;
  lang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onSaveSettings: (payload: {
    displayName: string;
    initialBalance: number;
    currency: string;
    monthlyBudget: number;
  }) => Promise<void>;
}

export function SettingsView({
  user,
  isCloudMode,
  lang,
  onLanguageChange,
  onSaveSettings,
}: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [initialBalance, setInitialBalance] = useState(String(user.initialBalance));
  const [currency, setCurrency] = useState(user.currency || 'IDR');
  const [monthlyBudget, setMonthlyBudget] = useState(String(user.monthlyBudget));
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = UI_TEXT[lang].settings;

  useEffect(() => {
    setDisplayName(user.displayName);
    setInitialBalance(String(user.initialBalance));
    setCurrency(user.currency || 'IDR');
    setMonthlyBudget(String(user.monthlyBudget));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const parsedInitial = Number(initialBalance);
    const parsedBudget = Number(monthlyBudget);
    if (!Number.isFinite(parsedInitial) || parsedInitial < 0) {
      setError(t.errInitialBalance);
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError(t.errMonthlyBudget);
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        displayName: displayName.trim(),
        initialBalance: parsedInitial,
        currency,
        monthlyBudget: parsedBudget,
      });
      setSavedNotice(true);
    } catch (err: unknown) {
      setError(formatFirebaseErrorForUser(err, t.errSaveSettings));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.dbTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {isCloudMode
                  ? `${t.dbConnectedPrefix} ${user.email || user.displayName}. ${t.dbConnectedSuffix}`
                  : t.dbLocal}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.languageLabel}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.languageHelp}
              </p>
            </div>
          </div>

          <select
            value={lang}
            onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
            aria-label={t.languageLabel}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.profileTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.profileSubtitle}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.displayNameLabel}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.currencyLabel}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.initialBalanceLabel} ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t.initialBalanceFormula}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.monthlyBudgetLabel} ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t.monthlyBudgetHelp}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        {savedNotice && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            {t.savedNotice}
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Save className="h-4 w-4" />
            {saving ? t.saving : t.saveButton}
          </button>
        </div>
      </form>
    </div>
  );
}
