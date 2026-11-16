import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Search, Tag, Trash2, X } from 'lucide-react';
import {
  ExpenseItem,
  IncomeItem,
  formatCurrency,
  formatDateShort,
} from '../shared/finance.ts';
import {
  LanguageCode,
  MONTH_NAMES_BY_LANG,
  UI_TEXT,
  translateCategoryLabel,
  translatePaymentMethodLabel,
} from '../lib/i18n.ts';

interface TransactionsViewProps {
  mode: 'expenses' | 'income';
  onModeChange: (mode: 'expenses' | 'income') => void;
  currency: string;
  selectedMonth: number;
  selectedYear: number;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  availableExpenseCategories: string[];
  availableIncomeCategories: string[];
  loading: boolean;
  lang?: LanguageCode;
  onAddExpense: () => void;
  onEditExpense: (item: ExpenseItem) => void;
  onDeleteExpense: (item: ExpenseItem) => void;
  onAddIncome: () => void;
  onEditIncome: (item: IncomeItem) => void;
  onDeleteIncome: (item: IncomeItem) => void;
  onFilterChange: (filters: {
    category: string;
    search: string;
    startDate: string;
    endDate: string;
    useMonthScope: boolean;
  }) => void;
}

export function TransactionsView({
  mode,
  onModeChange,
  currency,
  selectedMonth,
  selectedYear,
  expenses,
  incomes,
  availableExpenseCategories,
  availableIncomeCategories,
  loading,
  lang = 'id',
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onFilterChange,
}: TransactionsViewProps) {
  const t = UI_TEXT[lang].transactions;
  const monthNames = MONTH_NAMES_BY_LANG[lang];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useMonthScope, setUseMonthScope] = useState(true);

  useEffect(() => {
    setCategory('');
    setSearch('');
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        category,
        search,
        startDate,
        endDate,
        useMonthScope,
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [category, search, startDate, endDate, useMonthScope, onFilterChange]);

  const categories =
    mode === 'expenses' ? availableExpenseCategories : availableIncomeCategories;
  const activeCount = mode === 'expenses' ? expenses.length : incomes.length;
  const activeTotal = useMemo(() => {
    if (mode === 'expenses') {
      return expenses.reduce((sum, item) => sum + item.amount, 0);
    }
    return incomes.reduce((sum, item) => sum + item.amount, 0);
  }, [mode, expenses, incomes]);

  const hasCustomFilter =
    category.trim() !== '' || search.trim() !== '' || !useMonthScope || startDate || endDate;

  const handleReset = () => {
    setSearch('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setUseMonthScope(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onModeChange('expenses')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'expenses'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.tabExpenses}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('income')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'income'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.tabIncome}
          </button>
        </div>

        <button
          type="button"
          onClick={mode === 'expenses' ? onAddExpense : onAddIncome}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${
            mode === 'expenses'
              ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          {mode === 'expenses' ? t.addExpense : t.addIncome}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                mode === 'expenses'
                  ? t.searchExpensePlaceholder
                  : t.searchIncomePlaceholder
              }
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
            />
          </div>

          <div className="relative md:col-span-3">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list={`category-search-options-${mode}`}
              placeholder={t.searchCategoryPlaceholder}
              aria-label={t.searchCategoryAria}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
            />
            {category && (
              <button
                type="button"
                onClick={() => setCategory('')}
                aria-label={t.clearCategorySearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <datalist id={`category-search-options-${mode}`}>
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseMonthScope((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                useMonthScope
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {useMonthScope
                ? `${t.periodPrefix} ${monthNames[selectedMonth - 1]} ${selectedYear}`
                : t.customDateRange}
            </button>

            {!useMonthScope && (
              <div className="flex flex-1 items-center gap-1.5 min-w-[220px]">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label={t.startDateAria}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label={t.endDateAria}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {hasCustomFilter && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.reset}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span>
            {t.showing}{' '}
            <strong className="text-slate-900 tabular-nums dark:text-slate-100">
              {activeCount}
            </strong>{' '}
            {mode === 'expenses' ? t.expenseCountSuffix : t.incomeCountSuffix}
          </span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {t.total} {mode === 'expenses' ? '-' : '+'}
            {formatCurrency(activeTotal, currency)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : activeCount === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {mode === 'expenses' ? t.emptyExpenseFilter : t.emptyIncomeFilter}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hasCustomFilter
                ? t.emptyFilterHint
                : mode === 'expenses'
                ? t.emptyExpenseHint
                : t.emptyIncomeHint}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {hasCustomFilter && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t.resetFilter}
                </button>
              )}
              <button
                type="button"
                onClick={mode === 'expenses' ? onAddExpense : onAddIncome}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {mode === 'expenses' ? t.recordExpense : t.recordIncome}
              </button>
            </div>
          </div>
        ) : mode === 'expenses' ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                    <th className="px-5 py-3">{t.colDate}</th>
                    <th className="px-4 py-3">{t.colDesc}</th>
                    <th className="px-4 py-3">{t.colCategory}</th>
                    <th className="px-4 py-3">{t.colMethod}</th>
                    <th className="px-4 py-3 text-right">{t.colAmount}</th>
                    <th className="px-5 py-3 text-right">{t.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {expenses.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-300">
                        {formatDateShort(item.date, lang)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.description}
                        </p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap dark:text-slate-300">
                        {translateCategoryLabel(item.category, lang)}
                        {item.subType
                          ? ` · ${
                              item.subType === 'Investasi'
                                ? UI_TEXT[lang].modals.investment
                                : UI_TEXT[lang].modals.savings
                            }`
                          : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap dark:text-slate-400">
                        {translatePaymentMethodLabel(item.paymentMethod, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-rose-600 tabular-nums whitespace-nowrap dark:text-rose-400">
                        -{formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditExpense(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            aria-label={`${t.edit} ${item.description}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                            aria-label={`${t.delete} ${item.description}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {expenses.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateShort(item.date, lang)} ·{' '}
                        {translateCategoryLabel(item.category, lang)}
                        {item.subType
                          ? ` (${
                              item.subType === 'Investasi'
                                ? UI_TEXT[lang].modals.investment
                                : UI_TEXT[lang].modals.savings
                            })`
                          : ''}{' '}
                        · {translatePaymentMethodLabel(item.paymentMethod, lang)}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                      -{formatCurrency(item.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEditExpense(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-900/70 dark:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                    <th className="px-5 py-3">{t.colDate}</th>
                    <th className="px-4 py-3">{t.colSource}</th>
                    <th className="px-4 py-3">{t.colCategory}</th>
                    <th className="px-4 py-3 text-right">{t.colAmount}</th>
                    <th className="px-5 py-3 text-right">{t.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {incomes.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-300">
                        {formatDateShort(item.date, lang)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.source}
                        </p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap dark:text-slate-300">
                        {translateCategoryLabel(item.category, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-600 tabular-nums whitespace-nowrap dark:text-emerald-400">
                        +{formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditIncome(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            aria-label={`${t.edit} ${item.source}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteIncome(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                            aria-label={`${t.delete} ${item.source}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {incomes.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateShort(item.date, lang)} ·{' '}
                        {translateCategoryLabel(item.category, lang)}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      +{formatCurrency(item.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEditIncome(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-900/70 dark:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
