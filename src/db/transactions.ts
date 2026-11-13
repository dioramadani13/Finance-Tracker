import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from './index.ts';
import {
  expenses,
  incomes,
  users,
  ExpenseRecord,
  IncomeRecord,
} from './schema.ts';
import {
  FinancialSummaryResponse,
  MONTH_NAMES_ID,
  MonthlySummaryRow,
} from '../shared/finance.ts';

export interface TransactionFilters {
  month?: number;
  year?: number;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

function getMonthDateRange(month: number, year: number) {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

async function markUnsynced(userId: number) {
  await db
    .update(users)
    .set({ hasUnsyncedChanges: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function listExpenses(
  userId: number,
  filters: TransactionFilters = {}
): Promise<ExpenseRecord[]> {
  try {
    const conditions = [eq(expenses.userId, userId)];

    if (filters.month && filters.year) {
      const { start, end } = getMonthDateRange(filters.month, filters.year);
      conditions.push(gte(expenses.date, start), lte(expenses.date, end));
    } else {
      if (filters.startDate) conditions.push(gte(expenses.date, filters.startDate));
      if (filters.endDate) conditions.push(lte(expenses.date, filters.endDate));
    }

    if (filters.category && filters.category !== 'ALL') {
      conditions.push(eq(expenses.category, filters.category));
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(expenses.description, term),
        ilike(expenses.notes, term),
        ilike(expenses.paymentMethod, term)
      );
      if (searchCond) conditions.push(searchCond);
    }

    return await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date), desc(expenses.id));
  } catch (error) {
    console.error('Database error in listExpenses:', error);
    throw new Error('Gagal memuat daftar pengeluaran.', { cause: error });
  }
}

export async function createExpense(
  userId: number,
  data: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }
): Promise<ExpenseRecord> {
  try {
    const externalId = `EXP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [created] = await db
      .insert(expenses)
      .values({
        externalId,
        userId,
        date: data.date,
        description: data.description.trim(),
        category: data.category,
        subType: data.category === 'Tabungan dan investasi' ? data.subType || 'Tabungan' : '',
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        notes: (data.notes ?? '').trim(),
      })
      .returning();

    await markUnsynced(userId);
    return created;
  } catch (error) {
    console.error('Database error in createExpense:', error);
    throw new Error('Gagal menyimpan data pengeluaran.', { cause: error });
  }
}

export async function updateExpense(
  userId: number,
  id: number,
  data: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }
): Promise<ExpenseRecord | null> {
  try {
    const [updated] = await db
      .update(expenses)
      .set({
        date: data.date,
        description: data.description.trim(),
        category: data.category,
        subType: data.category === 'Tabungan dan investasi' ? data.subType || 'Tabungan' : '',
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        notes: (data.notes ?? '').trim(),
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();

    if (updated) {
      await markUnsynced(userId);
    }
    return updated ?? null;
  } catch (error) {
    console.error('Database error in updateExpense:', error);
    throw new Error('Gagal memperbarui data pengeluaran.', { cause: error });
  }
}

export async function deleteExpense(userId: number, id: number): Promise<boolean> {
  try {
    const deleted = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });

    if (deleted.length > 0) {
      await markUnsynced(userId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Database error in deleteExpense:', error);
    throw new Error('Gagal menghapus data pengeluaran.', { cause: error });
  }
}

export async function listIncomes(
  userId: number,
  filters: TransactionFilters = {}
): Promise<IncomeRecord[]> {
  try {
    const conditions = [eq(incomes.userId, userId)];

    if (filters.month && filters.year) {
      const { start, end } = getMonthDateRange(filters.month, filters.year);
      conditions.push(gte(incomes.date, start), lte(incomes.date, end));
    } else {
      if (filters.startDate) conditions.push(gte(incomes.date, filters.startDate));
      if (filters.endDate) conditions.push(lte(incomes.date, filters.endDate));
    }

    if (filters.category && filters.category !== 'ALL') {
      conditions.push(eq(incomes.category, filters.category));
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(incomes.source, term),
        ilike(incomes.notes, term)
      );
      if (searchCond) conditions.push(searchCond);
    }

    return await db
      .select()
      .from(incomes)
      .where(and(...conditions))
      .orderBy(desc(incomes.date), desc(incomes.id));
  } catch (error) {
    console.error('Database error in listIncomes:', error);
    throw new Error('Gagal memuat daftar pemasukan.', { cause: error });
  }
}

export async function createIncome(
  userId: number,
  data: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }
): Promise<IncomeRecord> {
  try {
    const externalId = `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [created] = await db
      .insert(incomes)
      .values({
        externalId,
        userId,
        date: data.date,
        source: data.source.trim(),
        category: data.category,
        amount: data.amount,
        notes: (data.notes ?? '').trim(),
      })
      .returning();

    await markUnsynced(userId);
    return created;
  } catch (error) {
    console.error('Database error in createIncome:', error);
    throw new Error('Gagal menyimpan data pemasukan.', { cause: error });
  }
}

export async function updateIncome(
  userId: number,
  id: number,
  data: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }
): Promise<IncomeRecord | null> {
  try {
    const [updated] = await db
      .update(incomes)
      .set({
        date: data.date,
        source: data.source.trim(),
        category: data.category,
        amount: data.amount,
        notes: (data.notes ?? '').trim(),
        updatedAt: new Date(),
      })
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning();

    if (updated) {
      await markUnsynced(userId);
    }
    return updated ?? null;
  } catch (error) {
    console.error('Database error in updateIncome:', error);
    throw new Error('Gagal memperbarui data pemasukan.', { cause: error });
  }
}

export async function deleteIncome(userId: number, id: number): Promise<boolean> {
  try {
    const deleted = await db
      .delete(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning({ id: incomes.id });

    if (deleted.length > 0) {
      await markUnsynced(userId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Database error in deleteIncome:', error);
    throw new Error('Gagal menghapus data pemasukan.', { cause: error });
  }
}

export async function getAllUserTransactions(userId: number) {
  try {
    const [allExpenses, allIncomes] = await Promise.all([
      db
        .select()
        .from(expenses)
        .where(eq(expenses.userId, userId))
        .orderBy(desc(expenses.date), desc(expenses.id)),
      db
        .select()
        .from(incomes)
        .where(eq(incomes.userId, userId))
        .orderBy(desc(incomes.date), desc(incomes.id)),
    ]);

    return { expenses: allExpenses, incomes: allIncomes };
  } catch (error) {
    console.error('Database error in getAllUserTransactions:', error);
    throw new Error('Gagal memuat seluruh data transaksi.', { cause: error });
  }
}

export async function getFinancialSummary(
  userId: number,
  initialBalance: number,
  month: number,
  year: number
): Promise<FinancialSummaryResponse> {
  const { expenses: allExpenses, incomes: allIncomes } =
    await getAllUserTransactions(userId);

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
      existing = {
        year: y,
        month: m,
        income: 0,
        expense: 0,
        savings: 0,
        investment: 0,
      };
      monthlyBucket.set(key, existing);
    }
    return existing;
  };

  for (const inc of allIncomes) {
    const ym = inc.date.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    allTimeIncome += inc.amount;
    if (ym <= selectedKey) {
      cumulativeIncomeUpToSelected += inc.amount;
    }
    if (ym === selectedKey) {
      monthlyIncome += inc.amount;
    } else if (ym === prevKey) {
      prevIncome += inc.amount;
    }
    if (y && m) {
      ensureBucket(y, m).income += inc.amount;
    }
  }

  for (const exp of allExpenses) {
    const ym = exp.date.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    allTimeExpense += exp.amount;
    if (ym <= selectedKey) {
      cumulativeExpenseUpToSelected += exp.amount;
    }

    const isSavingOrInvest = exp.category === 'Tabungan dan investasi';
    const isInvestment =
      isSavingOrInvest &&
      (exp.subType === 'Investasi' ||
        /invest|saham|reksadana|obligasi|crypto|emas/i.test(exp.description));

    if (ym === selectedKey) {
      monthlyExpense += exp.amount;
      if (isSavingOrInvest) {
        if (isInvestment) {
          monthlyInvestment += exp.amount;
        } else {
          monthlySavings += exp.amount;
        }
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
        if (isInvestment) {
          bucket.investment += exp.amount;
        } else {
          bucket.savings += exp.amount;
        }
      }
    }
  }

  const currentTotalBalance = initialBalance + allTimeIncome - allTimeExpense;
  const cumulativeEndingBalance =
    initialBalance + cumulativeIncomeUpToSelected - cumulativeExpenseUpToSelected;

  const expenseByCategory = Array.from(categoryTotals.entries())
    .map(([category, info]) => ({
      category,
      amount: info.amount,
      percentage: monthlyExpense > 0 ? (info.amount / monthlyExpense) * 100 : 0,
      count: info.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Build trailing 6-month series ending at selected month/year
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
      label: `${MONTH_NAMES_ID[m - 1].slice(0, 3)} ${String(y).slice(2)}`,
      income: inc,
      expense: exp,
      netCashFlow: inc - exp,
    });
  }

  // Build chronological Monthly Summary rows for all recorded months
  const sortedBuckets = Array.from(monthlyBucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b]) => b);

  let runningBalance = initialBalance;
  const monthlySummaryRows: MonthlySummaryRow[] = sortedBuckets.map((b) => {
    runningBalance += b.income - b.expense;
    return {
      month: b.month,
      monthName: MONTH_NAMES_ID[b.month - 1],
      year: b.year,
      totalIncome: b.income,
      totalExpense: b.expense,
      totalSavings: b.savings,
      totalInvestment: b.investment,
      remainingBalance: runningBalance,
    };
  });

  const recentTransactions = [
    ...allExpenses.map((e) => ({
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
    ...allIncomes.map((i) => ({
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
    currentTotalBalance,
    initialBalance,
    monthlyIncome,
    monthlyExpense,
    monthlyNetCashFlow: monthlyIncome - monthlyExpense,
    monthlySavings,
    monthlyInvestment,
    cumulativeEndingBalance,
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
      incomes: allIncomes.length,
      expenses: allExpenses.length,
    },
    recentTransactions,
  };
}
