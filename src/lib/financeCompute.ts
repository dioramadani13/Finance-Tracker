import {
  ExpenseItem,
  FinancialSummaryResponse,
  IncomeItem,
  MonthlySummaryRow,
  UserProfile,
} from '../shared/finance.ts';
import { LanguageCode, MONTH_NAMES_BY_LANG } from './i18n.ts';

export interface TransactionFilterParams {
  month?: number;
  year?: number;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function filterExpensesList(
  items: ExpenseItem[],
  filters: TransactionFilterParams
): ExpenseItem[] {
  return items
    .filter((item) => {
      if (filters.month && filters.year) {
        const prefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
        if (!item.date.startsWith(prefix)) return false;
      } else {
        if (filters.startDate && item.date < filters.startDate) return false;
        if (filters.endDate && item.date > filters.endDate) return false;
      }
      if (filters.category && filters.category !== 'ALL' && filters.category.trim()) {
        const catQuery = filters.category.trim().toLowerCase();
        if (!item.category.toLowerCase().includes(catQuery)) {
          return false;
        }
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const hay = `${item.description} ${item.notes} ${item.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function filterIncomesList(
  items: IncomeItem[],
  filters: TransactionFilterParams
): IncomeItem[] {
  return items
    .filter((item) => {
      if (filters.month && filters.year) {
        const prefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
        if (!item.date.startsWith(prefix)) return false;
      } else {
        if (filters.startDate && item.date < filters.startDate) return false;
        if (filters.endDate && item.date > filters.endDate) return false;
      }
      if (filters.category && filters.category !== 'ALL' && filters.category.trim()) {
        const catQuery = filters.category.trim().toLowerCase();
        if (!item.category.toLowerCase().includes(catQuery)) {
          return false;
        }
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const hay = `${item.source} ${item.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function computeFinancialSummary(
  profile: UserProfile,
  expenses: ExpenseItem[],
  incomes: IncomeItem[],
  month: number,
  year: number,
  lang: LanguageCode = 'id'
): FinancialSummaryResponse {
  const monthNames = MONTH_NAMES_BY_LANG[lang];
  const initialBalance = profile.initialBalance || 0;
  const selectedKey = `${year}-${String(month).padStart(2, '0')}`;
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const prevMonth = prevDate.getUTCMonth() + 1;
  const prevYear = prevDate.getUTCFullYear();
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  let allTimeIncome = 0;
  let allTimeExpense = 0;
  let cumulativeIncomeUpToSelected = 0;
  let cumulativeExpenseUpToSelected = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let monthlySavings = 0;
  let monthlyInvestment = 0;
  let prevIncome = 0;
  let prevExpense = 0;

  const categoryTotals = new Map<string, { amount: number; count: number }>();
  const monthlyBucket = new Map<
    string,
    {
      year: number;
      month: number;
      income: number;
      expense: number;
      savings: number;
      investment: number;
    }
  >();

  const ensureBucket = (y: number, m: number) => {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    let existing = monthlyBucket.get(key);
    if (!existing) {
      existing = { year: y, month: m, income: 0, expense: 0, savings: 0, investment: 0 };
      monthlyBucket.set(key, existing);
    }
    return existing;
  };

  for (const inc of incomes) {
    const ym = inc.date.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    allTimeIncome += inc.amount;
    if (ym <= selectedKey) cumulativeIncomeUpToSelected += inc.amount;
    if (ym === selectedKey) monthlyIncome += inc.amount;
    else if (ym === prevKey) prevIncome += inc.amount;
    if (y && m) ensureBucket(y, m).income += inc.amount;
  }

  for (const exp of expenses) {
    const ym = exp.date.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    allTimeExpense += exp.amount;
    if (ym <= selectedKey) cumulativeExpenseUpToSelected += exp.amount;

    const isSavingOrInvest = /tabungan|investasi/i.test(exp.category);
    const isInvestment =
      isSavingOrInvest &&
      (exp.subType === 'Investasi' ||
        /invest|saham|reksadana|obligasi|crypto|emas/i.test(`${exp.category} ${exp.description}`));

    if (ym === selectedKey) {
      monthlyExpense += exp.amount;
      if (isSavingOrInvest) {
        if (isInvestment) monthlyInvestment += exp.amount;
        else monthlySavings += exp.amount;
      }
      const prevCat = categoryTotals.get(exp.category) ?? { amount: 0, count: 0 };
      categoryTotals.set(exp.category, {
        amount: prevCat.amount + exp.amount,
        count: prevCat.count + 1,
      });
    } else if (ym === prevKey) {
      prevExpense += exp.amount;
    }

    if (y && m) {
      const bucket = ensureBucket(y, m);
      bucket.expense += exp.amount;
      if (isSavingOrInvest) {
        if (isInvestment) bucket.investment += exp.amount;
        else bucket.savings += exp.amount;
      }
    }
  }

  const expenseByCategory = Array.from(categoryTotals.entries())
    .map(([category, info]) => ({
      category,
      amount: info.amount,
      percentage: monthlyExpense > 0 ? (info.amount / monthlyExpense) * 100 : 0,
      count: info.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthlySeries = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const bucket = monthlyBucket.get(key);
    const inc = bucket?.income ?? 0;
    const exp = bucket?.expense ?? 0;
    monthlySeries.push({
      key,
      month: m,
      year: y,
      label: `${monthNames[m - 1].slice(0, 3)} ${String(y).slice(2)}`,
      income: inc,
      expense: exp,
      netCashFlow: inc - exp,
    });
  }

  const sortedBuckets = Array.from(monthlyBucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b]) => b);

  let runningBalance = initialBalance;
  const monthlySummaryRows: MonthlySummaryRow[] = sortedBuckets.map((b) => {
    runningBalance += b.income - b.expense;
    return {
      month: b.month,
      monthName: monthNames[b.month - 1],
      year: b.year,
      totalIncome: b.income,
      totalExpense: b.expense,
      totalSavings: b.savings,
      totalInvestment: b.investment,
      remainingBalance: runningBalance,
    };
  });

  const recentTransactions = [
    ...expenses.map((e) => ({
      kind: 'expense' as const,
      id: e.id,
      externalId: e.externalId,
      date: e.date,
      title: e.description,
      category: e.category,
      paymentMethod: e.paymentMethod,
      amount: e.amount,
      notes: e.notes,
    })),
    ...incomes.map((i) => ({
      kind: 'income' as const,
      id: i.id,
      externalId: i.externalId,
      date: i.date,
      title: i.source,
      category: i.category,
      amount: i.amount,
      notes: i.notes,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 8);

  return {
    period: { month, year },
    currentTotalBalance: initialBalance + allTimeIncome - allTimeExpense,
    initialBalance,
    monthlyIncome,
    monthlyExpense,
    monthlyNetCashFlow: monthlyIncome - monthlyExpense,
    monthlySavings,
    monthlyInvestment,
    cumulativeEndingBalance:
      initialBalance + cumulativeIncomeUpToSelected - cumulativeExpenseUpToSelected,
    previousMonth: {
      month: prevMonth,
      year: prevYear,
      income: prevIncome,
      expense: prevExpense,
      netCashFlow: prevIncome - prevExpense,
    },
    expenseByCategory,
    monthlySeries,
    monthlySummaryRows,
    allTimeCounts: {
      incomes: incomes.length,
      expenses: expenses.length,
    },
    recentTransactions,
  };
}
