import { getFirebaseIdToken, getGoogleAccessToken } from './firebase.ts';
import {
  ExpenseItem,
  FinancialSummaryResponse,
  IncomeItem,
  UserProfile,
} from '../shared/finance.ts';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  includeGoogleToken = false
): Promise<T> {
  const idToken = await getFirebaseIdToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (includeGoogleToken) {
    const googleToken = getGoogleAccessToken();
    if (googleToken) {
      headers['X-Google-Access-Token'] = googleToken;
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.error || 'Terjadi kesalahan pada server.',
      response.status,
      data.code
    );
  }
  return data as T;
}

export const api = {
  getMe: () => apiFetch<{ user: UserProfile }>('/api/me'),

  updateSettings: (payload: {
    displayName?: string;
    initialBalance?: number;
    currency?: string;
    monthlyBudget?: number;
    autoSyncPrompt?: boolean;
  }) =>
    apiFetch<{ user: UserProfile }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getSummary: (month: number, year: number) =>
    apiFetch<{ summary: FinancialSummaryResponse; user: UserProfile }>(
      `/api/summary?month=${month}&year=${year}`
    ),

  listExpenses: (params: {
    month?: number;
    year?: number;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', String(params.month));
    if (params.year) qs.set('year', String(params.year));
    if (params.category && params.category !== 'ALL') qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return apiFetch<{ expenses: ExpenseItem[] }>(`/api/expenses?${qs.toString()}`);
  },

  createExpense: (payload: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }) =>
    apiFetch<{ expense: ExpenseItem }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateExpense: (
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
  ) =>
    apiFetch<{ expense: ExpenseItem }>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteExpense: (id: number) =>
    apiFetch<{ deleted: boolean }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    }),

  listIncomes: (params: {
    month?: number;
    year?: number;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', String(params.month));
    if (params.year) qs.set('year', String(params.year));
    if (params.category && params.category !== 'ALL') qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return apiFetch<{ incomes: IncomeItem[] }>(`/api/incomes?${qs.toString()}`);
  },

  createIncome: (payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }) =>
    apiFetch<{ income: IncomeItem }>('/api/incomes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateIncome: (
    id: number,
    payload: {
      date: string;
      source: string;
      category: string;
      amount: number;
      notes?: string;
    }
  ) =>
    apiFetch<{ income: IncomeItem }>(`/api/incomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteIncome: (id: number) =>
    apiFetch<{ deleted: boolean }>(`/api/incomes/${id}`, {
      method: 'DELETE',
    }),

  createSpreadsheet: (title?: string) =>
    apiFetch<{
      user: UserProfile;
      syncResult: {
        spreadsheetId: string;
        spreadsheetUrl: string;
        spreadsheetName: string;
        syncedCounts: { incomes: number; expenses: number; monthlySummaries: number };
      };
    }>(
      '/api/sheets/create',
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      },
      true
    ),

  connectSpreadsheet: (spreadsheetId: string) =>
    apiFetch<{
      user: UserProfile;
      metadata: {
        spreadsheetId: string;
        title: string;
        spreadsheetUrl: string;
      };
    }>(
      '/api/sheets/connect',
      {
        method: 'POST',
        body: JSON.stringify({ spreadsheetId }),
      },
      true
    ),

  syncSpreadsheet: () =>
    apiFetch<{
      user: UserProfile;
      syncResult: {
        spreadsheetId: string;
        spreadsheetUrl: string;
        spreadsheetName: string;
        syncedCounts: { incomes: number; expenses: number; monthlySummaries: number };
      };
    }>(
      '/api/sheets/sync',
      {
        method: 'POST',
      },
      true
    ),

  disconnectSpreadsheet: () =>
    apiFetch<{ user: UserProfile }>('/api/sheets/disconnect', {
      method: 'POST',
    }),
};
