import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ExpenseItem,
  FinancialSummaryResponse,
  IncomeItem,
  UserProfile,
  formatCurrency,
  formatDateShort,
} from '../shared/finance.ts';
import { MonthYearPicker } from './MonthYearPicker.tsx';
import {
  LanguageCode,
  MONTH_NAMES_BY_LANG,
  UI_TEXT,
  translateCategoryLabel,
  translatePaymentMethodLabel,
} from '../lib/i18n.ts';

interface MonthlyReportsViewProps {
  summary: FinancialSummaryResponse | null;
  user: UserProfile;
  monthlyExpenses: ExpenseItem[];
  monthlyIncomes: IncomeItem[];
  selectedMonth: number;
  selectedYear: number;
  onChangePeriod: (month: number, year: number) => void;
  loading: boolean;
  isDark: boolean;
  lang?: LanguageCode;
}

const CHART_COLORS_LIGHT = [
  '#0f172a',
  '#16a34a',
  '#334155',
  '#0284c7',
  '#d97706',
  '#e11d48',
  '#64748b',
  '#059669',
  '#475569',
  '#94a3b8',
];

const CHART_COLORS_DARK = [
  '#e2e8f0',
  '#22c55e',
  '#38bdf8',
  '#f59e0b',
  '#fb7185',
  '#a78bfa',
  '#34d399',
  '#94a3b8',
  '#60a5fa',
  '#cbd5e1',
];

export function MonthlyReportsView({
  summary,
  user,
  monthlyExpenses,
  monthlyIncomes,
  selectedMonth,
  selectedYear,
  onChangePeriod,
  loading,
  isDark,
  lang = 'id',
}: MonthlyReportsViewProps) {
  const t = UI_TEXT[lang].reports;
  const monthNames = MONTH_NAMES_BY_LANG[lang];
  const currency = user.currency || 'IDR';
  const periodLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  const chartColors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  const combinedTransactions = useMemo(() => {
    return [
      ...monthlyIncomes.map((i) => ({
        kind: 'income' as const,
        id: i.externalId,
        date: i.date,
        title: i.source,
        category: i.category,
        paymentMethod: '—',
        amount: i.amount,
        notes: i.notes,
      })),
      ...monthlyExpenses.map((e) => ({
        kind: 'expense' as const,
        id: e.externalId,
        date: e.date,
        title: e.description,
        category: e.category,
        paymentMethod: e.paymentMethod,
        amount: e.amount,
        notes: e.notes,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [monthlyIncomes, monthlyExpenses]);

  const handleExportCsv = () => {
    if (!summary) return;
    const escapeCell = (val: string | number) => {
      const s = String(val ?? '');
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [];
    lines.push(`${t.csvTitle},${escapeCell(periodLabel)}`);
    lines.push(`${t.csvCurrency},${currency}`);
    lines.push('');
    lines.push(t.csvSummaryHeader);
    lines.push(`${t.totalIncome},${summary.monthlyIncome}`);
    lines.push(`${t.totalExpense},${summary.monthlyExpense}`);
    lines.push(`${t.csvNetCashFlow},${summary.monthlyNetCashFlow}`);
    lines.push(`${t.csvEndingBalance},${summary.cumulativeEndingBalance}`);
    lines.push('');
    lines.push(t.csvDistHeader);
    for (const cat of summary.expenseByCategory) {
      lines.push(
        `${escapeCell(translateCategoryLabel(cat.category, lang))},${cat.amount},${cat.percentage.toFixed(2)}`
      );
    }
    lines.push('');
    lines.push(t.csvTxHeader);
    for (const tx of combinedTransactions) {
      lines.push(
        [
          escapeCell(tx.id),
          escapeCell(tx.date),
          tx.kind === 'income' ? t.typeIncome : t.typeExpense,
          escapeCell(tx.title),
          escapeCell(translateCategoryLabel(tx.category, lang)),
          escapeCell(
            tx.paymentMethod === '—'
              ? '—'
              : translatePaymentMethodLabel(tx.paymentMethod, lang)
          ),
          tx.kind === 'income' ? tx.amount : -tx.amount,
          escapeCell(tx.notes),
        ].join(',')
      );
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${t.csvFilePrefix}-${selectedYear}-${String(selectedMonth).padStart(
      2,
      '0'
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  if (!summary) return null;

  const tooltipStyle = {
    borderRadius: '10px',
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <MonthYearPicker
          month={selectedMonth}
          year={selectedYear}
          onChange={onChangePeriod}
          align="left"
          lang={lang}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            {t.exportCsv}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Printer className="h-3.5 w-3.5" />
            {t.printPdf}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.totalIncome}
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
            +{formatCurrency(summary.monthlyIncome, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.totalExpense}
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-rose-600 tabular-nums dark:text-rose-400">
            -{formatCurrency(summary.monthlyExpense, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.endingBalance}
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(summary.cumulativeEndingBalance, currency)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.chartBarTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.chartBarSubtitle} {periodLabel}
          </p>
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlySeries}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}${lang === 'en' ? 'M' : 'jt'}`
                      : val >= 1_000
                      ? `${(val / 1_000).toFixed(0)}${lang === 'en' ? 'k' : 'rb'}`
                      : String(val)
                  }
                />
                <Tooltip
                  cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                  contentStyle={tooltipStyle}
                  formatter={(val: unknown, name: unknown) => [
                    formatCurrency(Number(val) || 0, currency),
                    name === 'income' ? t.typeIncome : t.typeExpense,
                  ]}
                />
                <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.chartPieTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.chartPieSubtitle} {periodLabel}
          </p>

          {summary.expenseByCategory.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
              {t.noExpensePeriod} {periodLabel}.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.expenseByCategory}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {summary.expenseByCategory.map((entry, idx) => (
                        <Cell
                          key={entry.category}
                          fill={chartColors[idx % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: unknown, name: unknown) => [
                        formatCurrency(Number(val) || 0, currency),
                        translateCategoryLabel(String(name ?? ''), lang),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {summary.expenseByCategory.map((cat, idx) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: chartColors[idx % chartColors.length],
                        }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {translateCategoryLabel(cat.category, lang)}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.tableTitle} ({periodLabel})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.tableTotalPrefix} {combinedTransactions.length} {t.tableTotalSuffix}
          </p>
        </div>

        {combinedTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.emptyPeriod} {periodLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-5 py-3">{t.colId}</th>
                  <th className="px-4 py-3">{t.colDate}</th>
                  <th className="px-4 py-3">{t.colType}</th>
                  <th className="px-4 py-3">{t.colTitle}</th>
                  <th className="px-4 py-3">{t.colCategory}</th>
                  <th className="px-4 py-3">{t.colMethod}</th>
                  <th className="px-5 py-3 text-right">{t.colAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {combinedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap dark:text-slate-400">
                      {tx.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-300">
                      {formatDateShort(tx.date, lang)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          tx.kind === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {tx.kind === 'income' ? t.typeIncome : t.typeExpense}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {tx.title}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap dark:text-slate-300">
                      {translateCategoryLabel(tx.category, lang)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap dark:text-slate-400">
                      {tx.paymentMethod === '—'
                        ? '—'
                        : translatePaymentMethodLabel(tx.paymentMethod, lang)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        tx.kind === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.kind === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
