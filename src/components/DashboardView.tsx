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
  UserProfile,
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

interface DashboardViewProps {
  summary: FinancialSummaryResponse | null;
  user: UserProfile;
  loading: boolean;
  isDark: boolean;
  lang?: LanguageCode;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onNavigate: (tab: 'expenses' | 'income' | 'reports') => void;
}

export function DashboardView({
  summary,
  user,
  loading,
  isDark,
  lang = 'id',
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
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-8 dark:border-slate-800 dark:bg-slate-900" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-4 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const t = UI_TEXT[lang].dashboard;
  const tReport = UI_TEXT[lang].reports;
  const monthNames = MONTH_NAMES_BY_LANG[lang];
  const currency = user.currency || 'IDR';
  const periodLabel = `${monthNames[summary.period.month - 1]} ${summary.period.year}`;
  const budgetUsedPct =
    user.monthlyBudget > 0
      ? Math.min(100, (summary.monthlyExpense / user.monthlyBudget) * 100)
      : 0;
  const isOverBudget =
    user.monthlyBudget > 0 && summary.monthlyExpense > user.monthlyBudget;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.totalBalance}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(summary.currentTotalBalance, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {t.initialBalance} {formatCurrency(summary.initialBalance, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.incomeLabel} ({periodLabel})
            </p>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
            +{formatCurrency(summary.monthlyIncome, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {t.lastMonth} {formatCurrency(summary.previousMonth.income, currency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.expenseLabel} ({periodLabel})
            </p>
            <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-rose-600 tabular-nums dark:text-rose-400">
            -{formatCurrency(summary.monthlyExpense, currency)}
          </p>
          {user.monthlyBudget > 0 ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    isOverBudget
                      ? 'font-medium text-rose-600 dark:text-rose-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {budgetUsedPct.toFixed(0)}
                  {t.budgetPct}
                </span>
                <span className="font-mono text-slate-500 tabular-nums dark:text-slate-400">
                  {formatCurrency(user.monthlyBudget, currency)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    isOverBudget
                      ? 'bg-rose-600 dark:bg-rose-500'
                      : 'bg-slate-800 dark:bg-slate-200'
                  }`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {t.lastMonth} {formatCurrency(summary.previousMonth.expense, currency)}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.cashFlowLabel} ({periodLabel})
          </p>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
              summary.monthlyNetCashFlow >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.monthlyNetCashFlow >= 0 ? '+' : ''}
            {formatCurrency(summary.monthlyNetCashFlow, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {t.lastMonth} {formatCurrency(summary.previousMonth.netCashFlow, currency)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.chartTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.chartSubtitle} {periodLabel}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                {t.incomeLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                {t.expenseLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.monthlySeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
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
                  width={72}
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
                  contentStyle={{
                    borderRadius: '10px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(Number(value) || 0, currency),
                    name === 'income' ? t.incomeLabel : t.expenseLabel,
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.categoryTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {periodLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t.detail}
            </button>
          </div>

          {summary.expenseByCategory.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.noExpenseMonth}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.noExpenseMonthDesc}
              </p>
              <button
                type="button"
                onClick={onAddExpense}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.recordExpense}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {summary.expenseByCategory.slice(0, 6).map((item) => (
                <div key={item.category}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {translateCategoryLabel(item.category, lang)}
                    </span>
                    <span className="shrink-0 font-mono text-slate-700 tabular-nums dark:text-slate-300">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-800 dark:bg-slate-200"
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.recentTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.recentSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t.allExpenses}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t.allIncomes}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t.noTxYet}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.noTxDesc}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onAddIncome}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.firstIncome}
              </button>
              <button
                type="button"
                onClick={onAddExpense}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.firstExpense}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.recentTransactions.map((tx) => (
              <div
                key={`${tx.kind}-${tx.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {tx.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">{formatDateShort(tx.date, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{translateCategoryLabel(tx.category, lang)}</span>
                    {tx.paymentMethod && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{translatePaymentMethodLabel(tx.paymentMethod, lang)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      tx.kind === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {tx.kind === 'income' ? tReport.typeIncome : tReport.typeExpense}
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
