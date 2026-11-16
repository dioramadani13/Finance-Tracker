export const EXPENSE_CATEGORIES = [
  'Makan dan Minum',
  'Transportasi',
  'Bensin',
  'Investasi / tabungan',
  'Jajan dan Nongkrong',
  'Kebutuhan Sehari-hari',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_CATEGORIES = [
  'Uang Bulanan',
  'Investasi / tabungan',
  'Makan dan Minum',
  'Transportasi',
  'Bensin',
  'Jajan dan Nongkrong',
  'Kebutuhan Sehari-hari',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  'Tunai',
  'Transfer Bank',
  'QRIS',
  'E-Wallet',
  'Kartu Debit',
  'Kartu Kredit',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CURRENCIES = [
  { code: 'IDR', label: 'IDR (Rp)', locale: 'id-ID' },
  { code: 'USD', label: 'USD ($)', locale: 'en-US' },
  { code: 'SGD', label: 'SGD (S$)', locale: 'en-SG' },
  { code: 'MYR', label: 'MYR (RM)', locale: 'ms-MY' },
] as const;

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  initialBalance: number;
  currency: string;
  monthlyBudget: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  autoSyncPrompt: boolean;
  lastSyncedAt: string | null;
  hasUnsyncedChanges: boolean;
}

export interface ExpenseItem {
  id: number;
  docId?: string;
  externalId: string;
  userId: number;
  date: string;
  description: string;
  category: string;
  subType: string;
  paymentMethod: string;
  amount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeItem {
  id: number;
  docId?: string;
  externalId: string;
  userId: number;
  date: string;
  source: string;
  category: string;
  amount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrendPoint {
  key: string;
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
  netCashFlow: number;
}

export interface MonthlySummaryRow {
  month: number;
  monthName: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalInvestment: number;
  remainingBalance: number;
}

export interface FinancialSummaryResponse {
  period: {
    month: number;
    year: number;
  };
  currentTotalBalance: number;
  initialBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNetCashFlow: number;
  monthlySavings: number;
  monthlyInvestment: number;
  cumulativeEndingBalance: number;
  previousMonth: {
    month: number;
    year: number;
    income: number;
    expense: number;
    netCashFlow: number;
  };
  expenseByCategory: CategoryBreakdownItem[];
  monthlySeries: MonthlyTrendPoint[];
  monthlySummaryRows: MonthlySummaryRow[];
  allTimeCounts: {
    incomes: number;
    expenses: number;
  };
  recentTransactions: Array<{
    kind: 'expense' | 'income';
    id: number;
    externalId: string;
    date: string;
    title: string;
    category: string;
    paymentMethod?: string;
    amount: number;
    notes: string;
  }>;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function formatCurrency(amount: number, currency = 'IDR'): string {
  const entry = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  return new Intl.NumberFormat(entry.locale, {
    style: 'currency',
    currency: entry.code,
    maximumFractionDigits: entry.code === 'IDR' ? 0 : 2,
  }).format(amount);
}

export function formatDateShort(dateStr: string, lang: 'id' | 'en' = 'id'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
