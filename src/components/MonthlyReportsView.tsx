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
  MONTH_NAMES_ID,
  UserProfile,
  formatCurrency,
  formatDateShort,
} from '../shared/finance.ts';

interface MonthlyReportsViewProps {
  summary: FinancialSummaryResponse | null;
  user: UserProfile;
  monthlyExpenses: ExpenseItem[];
  monthlyIncomes: IncomeItem[];
  selectedMonth: number;
  selectedYear: number;
  onChangePeriod: (month: number, year: number) => void;
  loading: boolean;
}

const CHART_COLORS = [
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

function formatDeltaPct(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? '0%' : 'Baru bulan ini';
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function MonthlyReportsView({
  summary,
  user,
  monthlyExpenses,
  monthlyIncomes,
  selectedMonth,
  selectedYear,
  onChangePeriod,
  loading,
}: MonthlyReportsViewProps) {
  const currency = user.currency || 'IDR';
  const periodLabel = `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`;
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

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
    lines.push(`Laporan Keuangan Bulanan,${escapeCell(periodLabel)}`);
    lines.push(`Mata Uang,${currency}`);
    lines.push('');
    lines.push('Ringkasan,Nominal');
    lines.push(`Total Pemasukan,${summary.monthlyIncome}`);
    lines.push(`Total Pengeluaran,${summary.monthlyExpense}`);
    lines.push(`Total Tabungan,${summary.monthlySavings}`);
    lines.push(`Total Investasi,${summary.monthlyInvestment}`);
    lines.push(`Net Cash Flow,${summary.monthlyNetCashFlow}`);
    lines.push(`Sisa Saldo Akhir Periode,${summary.cumulativeEndingBalance}`);
    lines.push('');
    lines.push('Distribusi Kategori Pengeluaran,Nominal,Persentase (%)');
    for (const cat of summary.expenseByCategory) {
      lines.push(
        `${escapeCell(cat.category)},${cat.amount},${cat.percentage.toFixed(2)}`
      );
    }
    lines.push('');
    lines.push('ID,Tanggal,Tipe,Deskripsi/Sumber,Kategori,Metode Pembayaran,Nominal,Catatan');
    for (const tx of combinedTransactions) {
      lines.push(
        [
          escapeCell(tx.id),
          escapeCell(tx.date),
          tx.kind === 'income' ? 'Pemasukan' : 'Pengeluaran',
          escapeCell(tx.title),
          escapeCell(tx.category),
          escapeCell(tx.paymentMethod),
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
    link.download = `Laporan-Keuangan-${selectedYear}-${String(selectedMonth).padStart(
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
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!summary) return null;

  const prevPeriodLabel = `${MONTH_NAMES_ID[summary.previousMonth.month - 1]} ${
    summary.previousMonth.year
  }`;

  return (
    <div className="space-y-6">
      {/* Period Controls & Export */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => onChangePeriod(Number(e.target.value), selectedYear)}
            aria-label="Pilih bulan laporan"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {MONTH_NAMES_ID.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => onChangePeriod(selectedMonth, Number(e.target.value))}
            aria-label="Pilih tahun laporan"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Report Metrics Summary (5 items from PRD 3.D) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Pemasukan</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-emerald-600 tabular-nums">
            +{formatCurrency(summary.monthlyIncome, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Pengeluaran</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-rose-600 tabular-nums">
            -{formatCurrency(summary.monthlyExpense, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Tabungan</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.monthlySavings, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Investasi</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.monthlyInvestment, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Sisa Saldo Periode</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.cumulativeEndingBalance, currency)}
          </p>
        </div>
      </div>

      {/* Month-over-Month Comparison */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Perbandingan dengan Bulan Sebelumnya
          </h2>
          <p className="text-xs text-slate-500">
            {periodLabel} vs {prevPeriodLabel}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="text-xs text-slate-500">Perubahan Pemasukan</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {summary.monthlyIncome - summary.previousMonth.income >= 0 ? '+' : ''}
              {formatCurrency(
                summary.monthlyIncome - summary.previousMonth.income,
                currency
              )}
            </p>
            <p className="mt-1 text-xs text-slate-600 tabular-nums">
              {formatDeltaPct(summary.monthlyIncome, summary.previousMonth.income)} dari{' '}
              {formatCurrency(summary.previousMonth.income, currency)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="text-xs text-slate-500">Perubahan Pengeluaran</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {summary.monthlyExpense - summary.previousMonth.expense >= 0 ? '+' : ''}
              {formatCurrency(
                summary.monthlyExpense - summary.previousMonth.expense,
                currency
              )}
            </p>
            <p className="mt-1 text-xs text-slate-600 tabular-nums">
              {formatDeltaPct(summary.monthlyExpense, summary.previousMonth.expense)} dari{' '}
              {formatCurrency(summary.previousMonth.expense, currency)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="text-xs text-slate-500">Perubahan Cash Flow Bersih</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {summary.monthlyNetCashFlow - summary.previousMonth.netCashFlow >= 0
                ? '+'
                : ''}
              {formatCurrency(
                summary.monthlyNetCashFlow - summary.previousMonth.netCashFlow,
                currency
              )}
            </p>
            <p className="mt-1 text-xs text-slate-600 tabular-nums">
              Bulan lalu: {formatCurrency(summary.previousMonth.netCashFlow, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Two Charts: Income vs Expense & Expense Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">
            Grafik Pemasukan &amp; Pengeluaran
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Perbandingan 6 bulan berakhir pada {periodLabel}
          </p>
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}jt`
                      : val >= 1_000
                      ? `${(val / 1_000).toFixed(0)}rb`
                      : String(val)
                  }
                />
                <Tooltip
                  formatter={(val: unknown, name: unknown) => [
                    formatCurrency(Number(val) || 0, currency),
                    name === 'income' ? 'Pemasukan' : 'Pengeluaran',
                  ]}
                />
                <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="text-base font-semibold text-slate-900">
            Diagram Distribusi Pengeluaran
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Persentase pengeluaran per kategori pada {periodLabel}
          </p>

          {summary.expenseByCategory.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center text-xs text-slate-500">
              Belum ada data pengeluaran pada periode {periodLabel}.
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
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) =>
                        formatCurrency(Number(val) || 0, currency)
                      }
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
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                      <span className="truncate text-slate-700">{cat.category}</span>
                    </div>
                    <span className="shrink-0 font-mono font-medium text-slate-900 tabular-nums">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Monthly Transaction History Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Tabel Riwayat Transaksi Bulanan ({periodLabel})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Total {combinedTransactions.length} transaksi tercatat pada periode ini
          </p>
        </div>

        {combinedTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-500">
            Belum ada transaksi pemasukan maupun pengeluaran pada {periodLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Deskripsi / Sumber</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-5 py-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {combinedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateShort(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          tx.kind === 'income' ? 'text-emerald-700' : 'text-rose-600'
                        }
                      >
                        {tx.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {tx.title}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {tx.paymentMethod}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        tx.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'
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
