import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  ExpenseItem,
  INCOME_CATEGORIES,
  IncomeItem,
  MONTH_NAMES_ID,
  formatCurrency,
  formatDateShort,
} from '../shared/finance.ts';

interface TransactionsViewProps {
  mode: 'expenses' | 'income';
  onModeChange: (mode: 'expenses' | 'income') => void;
  currency: string;
  selectedMonth: number;
  selectedYear: number;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  loading: boolean;
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
  loading,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onFilterChange,
}: TransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useMonthScope, setUseMonthScope] = useState(true);

  useEffect(() => {
    setCategory('ALL');
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

  const categories = mode === 'expenses' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const activeCount = mode === 'expenses' ? expenses.length : incomes.length;
  const activeTotal = useMemo(() => {
    if (mode === 'expenses') {
      return expenses.reduce((sum, item) => sum + item.amount, 0);
    }
    return incomes.reduce((sum, item) => sum + item.amount, 0);
  }, [mode, expenses, incomes]);

  const hasCustomFilter =
    category !== 'ALL' || search.trim() !== '' || !useMonthScope || startDate || endDate;

  const handleReset = () => {
    setSearch('');
    setCategory('ALL');
    setStartDate('');
    setEndDate('');
    setUseMonthScope(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Segmented Mode + Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onModeChange('expenses')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'expenses'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengeluaran (Expenses)
          </button>
          <button
            type="button"
            onClick={() => onModeChange('income')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'income'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemasukan (Income)
          </button>
        </div>

        <button
          type="button"
          onClick={mode === 'expenses' ? onAddExpense : onAddIncome}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${
            mode === 'expenses'
              ? 'bg-slate-900 hover:bg-slate-800'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          {mode === 'expenses' ? 'Tambah Pengeluaran' : 'Tambah Pemasukan'}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                mode === 'expenses'
                  ? 'Cari deskripsi, catatan, metode...'
                  : 'Cari sumber pemasukan atau catatan...'
              }
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter kategori"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseMonthScope((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                useMonthScope
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {useMonthScope
                ? `Periode: ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`
                : 'Rentang Tanggal Kustom'}
            </button>

            {!useMonthScope && (
              <div className="flex flex-1 items-center gap-1.5 min-w-[220px]">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Tanggal mulai"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="Tanggal akhir"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}

            {hasCustomFilter && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Summary Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span>
            Menampilkan <strong className="text-slate-900 tabular-nums">{activeCount}</strong>{' '}
            {mode === 'expenses' ? 'transaksi pengeluaran' : 'catatan pemasukan'}
          </span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            Total: {mode === 'expenses' ? '-' : '+'}
            {formatCurrency(activeTotal, currency)}
          </span>
        </div>
      </div>

      {/* Data View */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-11 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : activeCount === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-800">
              {mode === 'expenses'
                ? 'Tidak ada pengeluaran pada filter ini'
                : 'Tidak ada pemasukan pada filter ini'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hasCustomFilter
                ? 'Coba ubah filter pencarian, kategori, atau rentang tanggal.'
                : mode === 'expenses'
                ? 'Catat pengeluaran harian Anda agar saldo dan laporan selalu akurat.'
                : 'Catat pemasukan bulanan Anda (gaji, freelance, bonus, atau lainnya).'}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {hasCustomFilter && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Filter
                </button>
              )}
              <button
                type="button"
                onClick={mode === 'expenses' ? onAddExpense : onAddIncome}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                {mode === 'expenses' ? 'Catat Pengeluaran' : 'Catat Pemasukan'}
              </button>
            </div>
          </div>
        ) : mode === 'expenses' ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {expenses.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateShort(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.description}</p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {item.category}
                        {item.subType ? ` · ${item.subType}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {item.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-rose-600 tabular-nums whitespace-nowrap">
                        -{formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditExpense(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Edit ${item.description}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${item.description}`}
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

            {/* Mobile Card List */}
            <div className="divide-y divide-slate-100 md:hidden">
              {expenses.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateShort(item.date)} · {item.category}
                        {item.subType ? ` (${item.subType})` : ''} · {item.paymentMethod}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-rose-600 tabular-nums">
                      -{formatCurrency(item.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEditExpense(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Table (Income) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-4 py-3">Sumber Pemasukan</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {incomes.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateShort(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.source}</p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                        +{formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditIncome(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Edit ${item.source}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteIncome(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${item.source}`}
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

            {/* Mobile Card List (Income) */}
            <div className="divide-y divide-slate-100 md:hidden">
              {incomes.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{item.source}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateShort(item.date)} · {item.category}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-emerald-600 tabular-nums">
                      +{formatCurrency(item.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEditIncome(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(item)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
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
