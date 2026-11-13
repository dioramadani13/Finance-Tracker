import {
  ExpenseItem,
  FinancialSummaryResponse,
  IncomeItem,
  MONTH_NAMES_ID,
  MonthlySummaryRow,
  UserProfile,
} from '../shared/finance.ts';

const STORAGE_KEY = 'pft_local_workspace_v1';

interface LocalWorkspaceData {
  profile: UserProfile;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  nextId: number;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 0,
  uid: 'local-guest',
  email: 'Mode Lokal (Belum Login)',
  displayName: 'Tamu',
  photoUrl: '',
  initialBalance: 0,
  currency: 'IDR',
  monthlyBudget: 0,
  spreadsheetId: '',
  spreadsheetUrl: '',
  spreadsheetName: '',
  autoSyncPrompt: true,
  lastSyncedAt: null,
  hasUnsyncedChanges: false,
};

function loadWorkspace(): LocalWorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalWorkspaceData;
      if (parsed && parsed.profile && Array.isArray(parsed.expenses) && Array.isArray(parsed.incomes)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted local storage
  }
  return {
    profile: { ...DEFAULT_PROFILE },
    expenses: [],
    incomes: [],
    nextId: 1,
  };
}

function saveWorkspace(data: LocalWorkspaceData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export const localStore = {
  getProfile(): UserProfile {
    return loadWorkspace().profile;
  },

  updateSettings(updates: {
    displayName?: string;
    initialBalance?: number;
    currency?: string;
    monthlyBudget?: number;
    autoSyncPrompt?: boolean;
  }): UserProfile {
    const ws = loadWorkspace();
    ws.profile = {
      ...ws.profile,
      ...updates,
    };
    saveWorkspace(ws);
    return ws.profile;
  },

  listExpenses(filters: {
    month?: number;
    year?: number;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): ExpenseItem[] {
    const ws = loadWorkspace();
    return ws.expenses
      .filter((item) => {
        if (filters.month && filters.year) {
          const prefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
          if (!item.date.startsWith(prefix)) return false;
        } else {
          if (filters.startDate && item.date < filters.startDate) return false;
          if (filters.endDate && item.date > filters.endDate) return false;
        }
        if (filters.category && filters.category !== 'ALL' && item.category !== filters.category) {
          return false;
        }
        if (filters.search && filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          const hay = `${item.description} ${item.notes} ${item.paymentMethod}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  },

  createExpense(payload: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }): ExpenseItem {
    const ws = loadWorkspace();
    const id = ws.nextId++;
    const now = new Date().toISOString();
    const item: ExpenseItem = {
      id,
      externalId: `EXP-LOC-${String(id).padStart(4, '0')}`,
      userId: 0,
      date: payload.date,
      description: payload.description.trim(),
      category: payload.category,
      subType:
        payload.category === 'Tabungan dan investasi' ? payload.subType || 'Tabungan' : '',
      paymentMethod: payload.paymentMethod,
      amount: payload.amount,
      notes: (payload.notes ?? '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    ws.expenses.push(item);
    saveWorkspace(ws);
    return item;
  },

  updateExpense(
    id: number,
    payload: {
      date: string;
      description: string;
      category: string;
      subType?: string;
      paymentMethod: string;
      amount: number;
      notes?: string;
    }
  ): ExpenseItem | null {
    const ws = loadWorkspace();
    const idx = ws.expenses.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated: ExpenseItem = {
      ...ws.expenses[idx],
      date: payload.date,
      description: payload.description.trim(),
      category: payload.category,
      subType:
        payload.category === 'Tabungan dan investasi' ? payload.subType || 'Tabungan' : '',
      paymentMethod: payload.paymentMethod,
      amount: payload.amount,
      notes: (payload.notes ?? '').trim(),
      updatedAt: new Date().toISOString(),
    };
    ws.expenses[idx] = updated;
    saveWorkspace(ws);
    return updated;
  },

  deleteExpense(id: number): boolean {
    const ws = loadWorkspace();
    const before = ws.expenses.length;
    ws.expenses = ws.expenses.filter((e) => e.id !== id);
    if (ws.expenses.length !== before) {
      saveWorkspace(ws);
      return true;
    }
    return false;
  },

  listIncomes(filters: {
    month?: number;
    year?: number;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): IncomeItem[] {
    const ws = loadWorkspace();
    return ws.incomes
      .filter((item) => {
        if (filters.month && filters.year) {
          const prefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
          if (!item.date.startsWith(prefix)) return false;
        } else {
          if (filters.startDate && item.date < filters.startDate) return false;
          if (filters.endDate && item.date > filters.endDate) return false;
        }
        if (filters.category && filters.category !== 'ALL' && item.category !== filters.category) {
          return false;
        }
        if (filters.search && filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          const hay = `${item.source} ${item.notes}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  },

  createIncome(payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }): IncomeItem {
    const ws = loadWorkspace();
    const id = ws.nextId++;
    const now = new Date().toISOString();
    const item: IncomeItem = {
      id,
      externalId: `INC-LOC-${String(id).padStart(4, '0')}`,
      userId: 0,
      date: payload.date,
      source: payload.source.trim(),
      category: payload.category,
      amount: payload.amount,
      notes: (payload.notes ?? '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    ws.incomes.push(item);
    saveWorkspace(ws);
    return item;
  },

  updateIncome(
    id: number,
    payload: {
      date: string;
      source: string;
      category: string;
      amount: number;
      notes?: string;
    }
  ): IncomeItem | null {
    const ws = loadWorkspace();
    const idx = ws.incomes.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated: IncomeItem = {
      ...ws.incomes[idx],
      date: payload.date,
      source: payload.source.trim(),
      category: payload.category,
      amount: payload.amount,
      notes: (payload.notes ?? '').trim(),
      updatedAt: new Date().toISOString(),
    };
    ws.incomes[idx] = updated;
    saveWorkspace(ws);
    return updated;
  },

  deleteIncome(id: number): boolean {
    const ws = loadWorkspace();
    const before = ws.incomes.length;
    ws.incomes = ws.incomes.filter((i) => i.id !== id);
    if (ws.incomes.length !== before) {
      saveWorkspace(ws);
      return true;
    }
    return false;
  },

  getSummary(month: number, year: number): {
    summary: FinancialSummaryResponse;
    user: UserProfile;
  } {
    const ws = loadWorkspace();
    const initialBalance = ws.profile.initialBalance || 0;
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

    for (const inc of ws.incomes) {
      const ym = inc.date.slice(0, 7);
      const [y, m] = ym.split('-').map(Number);
      allTimeIncome += inc.amount;
      if (ym <= selectedKey) cumulativeIncomeUpToSelected += inc.amount;
      if (ym === selectedKey) monthlyIncome += inc.amount;
      else if (ym === prevKey) prevIncome += inc.amount;
      if (y && m) ensureBucket(y, m).income += inc.amount;
    }

    for (const exp of ws.expenses) {
      const ym = exp.date.slice(0, 7);
      const [y, m] = ym.split('-').map(Number);
      allTimeExpense += exp.amount;
      if (ym <= selectedKey) cumulativeExpenseUpToSelected += exp.amount;

      const isSavingOrInvest = exp.category === 'Tabungan dan investasi';
      const isInvestment =
        isSavingOrInvest &&
        (exp.subType === 'Investasi' ||
          /invest|saham|reksadana|obligasi|crypto|emas/i.test(exp.description));

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
        label: `${MONTH_NAMES_ID[m - 1].slice(0, 3)} ${String(y).slice(2)}`,
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
      ...ws.expenses.map((e) => ({
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
      ...ws.incomes.map((i) => ({
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
      user: ws.profile,
      summary: {
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
          incomes: ws.incomes.length,
          expenses: ws.expenses.length,
        },
        recentTransactions,
      },
    };
  },
};
