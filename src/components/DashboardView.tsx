import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FinancialSummaryResponse,
  MONTH_NAMES_ID,
  UserProfile,
  formatCurrency,
  formatDateShort,
} from '../shared/finance.ts';

interface DashboardViewProps {
  summary: FinancialSummaryResponse | null;
  user: UserProfile;
  loading: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onNavigate: (tab: 'expenses' | 'income' | 'reports') => void;
}

export function DashboardView({
  summary,
  user,
  loading,
  onAddExpense,
  onAddIncome,
  onNavigate,
}: DashboardViewProps) {
  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-8" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const currency = user.currency || 'IDR';
  const periodLabel = `${MONTH_NAMES_ID[summary.period.month - 1]} ${summary.period.year}`;
  const budgetUsedPct =
    user.monthlyBudget > 0
      ? Math.min(100, (summary.monthlyExpense / user.monthlyBudget) * 100)
      : 0;
  const isOverBudget =
    user.monthlyBudget > 0 && summary.monthlyExpense > user.monthlyBudget;

  return (
    <div className="space-y-6">
      {/* 4-column KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Saldo Saat Ini</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(summary.currentTotalBalance, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            Saldo awal: {formatCurrency(summary.initialBalance, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Pemasukan ({periodLabel})
            </p>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums">
            +{formatCurrency(summary.monthlyIncome, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            Bulan lalu: {formatCurrency(summary.previousMonth.income, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Pengeluaran ({periodLabel})
            </p>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-rose-600 tabular-nums">
            -{formatCurrency(summary.monthlyExpense, currency)}
          </p>
          {user.monthlyBudget > 0 ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className={isOverBudget ? 'font-medium text-rose-600' : 'text-slate-500'}>
                  {budgetUsedPct.toFixed(0)}% dari anggaran
                </span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {formatCurrency(user.monthlyBudget, currency)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    isOverBudget ? 'bg-rose-600' : 'bg-slate-800'
                  }`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500 tabular-nums">
              Bulan lalu: {formatCurrency(summary.previousMonth.expense, currency)}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Sisa Uang / Cash Flow ({periodLabel})
          </p>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
              summary.monthlyNetCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {summary.monthlyNetCashFlow >= 0 ? '+' : ''}
            {formatCurrency(summary.monthlyNetCashFlow, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {summary.monthlyNetCashFlow >= 0
              ? 'Surplus · Pemasukan melebihi pengeluaran'
              : 'Defisit · Pengeluaran melebihi pemasukan'}
          </p>
        </div>
      </div>

      {/* Main Analytics Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Income vs Expense Comparison Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Perbandingan Pemasukan &amp; Pengeluaran
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tren arus kas 6 bulan terakhir hingga {periodLabel}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                Pengeluaran
              </span>
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.monthlySeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
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
                  width={72}
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
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(Number(value) || 0, currency),
                    name === 'income' ? 'Pemasukan' : 'Pengeluaran',
                  ]}
                />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="#e11d48"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pengeluaran per Kategori
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{periodLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Detail
            </button>
          </div>

          {summary.expenseByCategory.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                Belum ada pengeluaran bulan ini
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Catat pengeluaran harian untuk melihat distribusi kategori.
              </p>
              <button
                type="button"
                onClick={onAddExpense}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Catat Pengeluaran
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {summary.expenseByCategory.slice(0, 6).map((item) => (
                <div key={item.category}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-800">
                      {item.category}
                    </span>
                    <span className="shrink-0 font-mono text-slate-700 tabular-nums">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800"
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] text-slate-500 tabular-nums">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Transactions */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Riwayat Transaksi Terbaru
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Gabungan catatan pemasukan dan pengeluaran terkini
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Semua Pengeluaran
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Semua Pemasukan
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              Belum ada transaksi yang tercatat
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Mulai dengan mencatat pemasukan bulanan atau pengeluaran harian pertama Anda.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onAddIncome}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Catat Pemasukan Pertama
              </button>
              <button
                type="button"
                onClick={onAddExpense}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Catat Pengeluaran Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.recentTransactions.map((tx) => (
              <div
                key={`${tx.kind}-${tx.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {tx.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="tabular-nums">{formatDateShort(tx.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{tx.category}</span>
                    {tx.paymentMethod && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{tx.paymentMethod}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      tx.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {tx.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
