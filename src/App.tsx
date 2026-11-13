import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  getGoogleAccessToken,
  googleSignIn,
  logout,
  refreshGoogleSheetsToken,
  subscribeAuth,
} from './lib/firebase.ts';
import { api, ApiError } from './lib/api.ts';
import {
  ExpenseItem,
  FinancialSummaryResponse,
  IncomeItem,
  MONTH_NAMES_ID,
  UserProfile,
} from './shared/finance.ts';
import { AuthScreen } from './components/AuthScreen.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { MonthlyReportsView } from './components/MonthlyReportsView.tsx';
import { GoogleSheetsView } from './components/GoogleSheetsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ExpenseModal, IncomeModal } from './components/TransactionModals.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';

type NavTab = 'dashboard' | 'expenses' | 'income' | 'reports' | 'sheets' | 'settings';

export default function App() {
  const now = new Date();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseItem[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<IncomeItem[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [txFilters, setTxFilters] = useState({
    category: 'ALL',
    search: '',
    startDate: '',
    endDate: '',
    useMonthScope: true,
  });

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'expense'; item: ExpenseItem }
    | { kind: 'income'; item: IncomeItem }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const loadCoreData = useCallback(
    async (month: number, year: number) => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [summaryRes, mExpensesRes, mIncomesRes] = await Promise.all([
          api.getSummary(month, year),
          api.listExpenses({ month, year }),
          api.listIncomes({ month, year }),
        ]);
        setSummary(summaryRes.summary);
        setProfile(summaryRes.user);
        setMonthlyExpenses(mExpensesRes.expenses);
        setMonthlyIncomes(mIncomesRes.incomes);
      } catch (err: unknown) {
        setDataError(
          err instanceof Error ? err.message : 'Gagal memuat data keuangan.'
        );
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  const loadFilteredTransactions = useCallback(
    async (
      mode: 'expenses' | 'income',
      month: number,
      year: number,
      filters: typeof txFilters
    ) => {
      try {
        const params = filters.useMonthScope
          ? {
              month,
              year,
              category: filters.category,
              search: filters.search,
            }
          : {
              startDate: filters.startDate || undefined,
              endDate: filters.endDate || undefined,
              category: filters.category,
              search: filters.search,
            };

        if (mode === 'expenses') {
          const res = await api.listExpenses(params);
          setExpenses(res.expenses);
        } else {
          const res = await api.listIncomes(params);
          setIncomes(res.incomes);
        }
      } catch (err: unknown) {
        setDataError(
          err instanceof Error ? err.message : 'Gagal memuat daftar transaksi.'
        );
      }
    },
    []
  );

  useEffect(() => {
    const unsub = subscribeAuth(
      (user) => {
        setAuthUser(user);
        setHasGoogleToken(Boolean(getGoogleAccessToken()));
        setAuthReady(true);
      },
      () => {
        setAuthUser(null);
        setProfile(null);
        setSummary(null);
        setHasGoogleToken(false);
        setAuthReady(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    loadCoreData(selectedMonth, selectedYear);
  }, [authUser, selectedMonth, selectedYear, loadCoreData]);

  useEffect(() => {
    if (!authUser) return;
    if (activeTab === 'expenses' || activeTab === 'income') {
      loadFilteredTransactions(activeTab, selectedMonth, selectedYear, txFilters);
    }
  }, [
    authUser,
    activeTab,
    selectedMonth,
    selectedYear,
    txFilters,
    loadFilteredTransactions,
  ]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      setAuthUser(res.user);
      setHasGoogleToken(Boolean(res.googleAccessToken));
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan popup tidak diblokir.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    setProfile(null);
    setSummary(null);
    setHasGoogleToken(false);
  };

  const handleRefreshAll = async () => {
    await loadCoreData(selectedMonth, selectedYear);
    if (activeTab === 'expenses' || activeTab === 'income') {
      await loadFilteredTransactions(activeTab, selectedMonth, selectedYear, txFilters);
    }
  };

  const handleSaveExpense = async (payload: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }) => {
    if (editingExpense) {
      await api.updateExpense(editingExpense.id, payload);
    } else {
      await api.createExpense(payload);
    }
    await handleRefreshAll();
  };

  const handleSaveIncome = async (payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }) => {
    if (editingIncome) {
      await api.updateIncome(editingIncome.id, payload);
    } else {
      await api.createIncome(payload);
    }
    await handleRefreshAll();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'expense') {
        await api.deleteExpense(deleteTarget.item.id);
      } else {
        await api.deleteIncome(deleteTarget.item.id);
      }
      setDeleteTarget(null);
      await handleRefreshAll();
    } catch (err: unknown) {
      setDataError(err instanceof Error ? err.message : 'Gagal menghapus transaksi.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = useCallback(
    (next: {
      category: string;
      search: string;
      startDate: string;
      endDate: string;
      useMonthScope: boolean;
    }) => {
      setTxFilters(next);
    },
    []
  );

  const handleSheetsTokenRefresh = async () => {
    await refreshGoogleSheetsToken();
    setHasGoogleToken(true);
  };

  const handleSheetsError = (err: unknown) => {
    if (err instanceof ApiError && err.code === 'SHEETS_AUTH_EXPIRED') {
      setHasGoogleToken(false);
    }
    throw err;
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Memuat Personal Finance Tracker...
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen onSignIn={handleSignIn} loading={authLoading} error={authError} />
    );
  }

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const pageTitleMap: Record<NavTab, string> = {
    dashboard: 'Dashboard',
    expenses: 'Transactions / Expenses',
    income: 'Transactions / Income',
    reports: 'Monthly Reports',
    sheets: 'Google Sheets Integration',
    settings: 'Settings',
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Personal Finance
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-3" aria-label="Menu utama">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </button>

          <div className="pt-2">
            <p className="px-3 pb-1.5 text-xs font-semibold text-slate-400">
              Transactions
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('expenses');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 shrink-0" />
              Expenses
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('income');
                setMobileMenuOpen(false);
              }}
              className={`mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'income'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 shrink-0" />
              Income
            </button>
          </div>

          <div className="pt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('reports');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              Monthly Reports
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sheets');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'sheets'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Google Sheets
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </button>
          </div>
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          {authUser.photoURL ? (
            <img
              src={authUser.photoURL}
              alt={authUser.displayName || 'Profil Pengguna'}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {(authUser.displayName || authUser.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {profile?.displayName || authUser.displayName || 'Pengguna'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{authUser.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar Akun
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[82vw] border-r border-slate-200 bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              {pageTitleMap[activeTab]}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(activeTab === 'dashboard' ||
              activeTab === 'expenses' ||
              activeTab === 'income') && (
              <div className="hidden sm:flex items-center gap-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  aria-label="Pilih bulan"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  {MONTH_NAMES_ID.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label="Pilih tahun"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingIncome(null);
                setIncomeModalOpen(true);
              }}
              className="hidden sm:inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Pemasukan
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setExpenseModalOpen(true);
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Catat </span>Pengeluaran
            </button>
          </div>
        </header>

        {/* Mobile Period Selector Bar */}
        {(activeTab === 'dashboard' ||
          activeTab === 'expenses' ||
          activeTab === 'income') && (
          <div className="no-print flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 sm:hidden">
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="Pilih bulan"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Pilih tahun"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingIncome(null);
                setIncomeModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Pemasukan
            </button>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {dataError && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
            >
              <span>{dataError}</span>
              <button
                type="button"
                onClick={() => setDataError(null)}
                className="font-semibold hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {profile &&
            profile.spreadsheetId &&
            profile.autoSyncPrompt &&
            profile.hasUnsyncedChanges &&
            activeTab !== 'sheets' && (
              <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Ada perubahan transaksi baru yang belum disinkronkan ke{' '}
                    <strong className="text-slate-900">
                      {profile.spreadsheetName || 'Google Sheets'}
                    </strong>
                    .
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('sheets')}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Sinkronkan Sekarang
                </button>
              </div>
            )}

          {activeTab === 'dashboard' && profile && (
            <DashboardView
              summary={summary}
              user={profile}
              loading={loadingData}
              onAddExpense={() => {
                setEditingExpense(null);
                setExpenseModalOpen(true);
              }}
              onAddIncome={() => {
                setEditingIncome(null);
                setIncomeModalOpen(true);
              }}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {(activeTab === 'expenses' || activeTab === 'income') && profile && (
            <TransactionsView
              mode={activeTab}
              onModeChange={(nextMode) => setActiveTab(nextMode)}
              currency={profile.currency || 'IDR'}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              expenses={expenses}
              incomes={incomes}
              loading={loadingData}
              onAddExpense={() => {
                setEditingExpense(null);
                setExpenseModalOpen(true);
              }}
              onEditExpense={(item) => {
                setEditingExpense(item);
                setExpenseModalOpen(true);
              }}
              onDeleteExpense={(item) => setDeleteTarget({ kind: 'expense', item })}
              onAddIncome={() => {
                setEditingIncome(null);
                setIncomeModalOpen(true);
              }}
              onEditIncome={(item) => {
                setEditingIncome(item);
                setIncomeModalOpen(true);
              }}
              onDeleteIncome={(item) => setDeleteTarget({ kind: 'income', item })}
              onFilterChange={handleFilterChange}
            />
          )}

          {activeTab === 'reports' && profile && (
            <MonthlyReportsView
              summary={summary}
              user={profile}
              monthlyExpenses={monthlyExpenses}
              monthlyIncomes={monthlyIncomes}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChangePeriod={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
              loading={loadingData}
            />
          )}

          {activeTab === 'sheets' && profile && (
            <GoogleSheetsView
              user={profile}
              hasGoogleToken={hasGoogleToken}
              totalIncomeCount={summary?.allTimeCounts.incomes ?? 0}
              totalExpenseCount={summary?.allTimeCounts.expenses ?? 0}
              totalSummaryMonths={summary?.monthlySummaryRows.length ?? 0}
              onRefreshToken={handleSheetsTokenRefresh}
              onCreateSpreadsheet={async (title) => {
                try {
                  const res = await api.createSpreadsheet(title);
                  setProfile(res.user);
                } catch (err) {
                  handleSheetsError(err);
                }
              }}
              onConnectSpreadsheet={async (idOrUrl) => {
                try {
                  const res = await api.connectSpreadsheet(idOrUrl);
                  setProfile(res.user);
                } catch (err) {
                  handleSheetsError(err);
                }
              }}
              onSyncNow={async () => {
                try {
                  const res = await api.syncSpreadsheet();
                  setProfile(res.user);
                } catch (err) {
                  handleSheetsError(err);
                }
              }}
              onDisconnect={async () => {
                const res = await api.disconnectSpreadsheet();
                setProfile(res.user);
              }}
            />
          )}

          {activeTab === 'settings' && profile && (
            <SettingsView
              user={profile}
              onSaveSettings={async (payload) => {
                const res = await api.updateSettings(payload);
                setProfile(res.user);
                await loadCoreData(selectedMonth, selectedYear);
              }}
            />
          )}
        </main>
      </div>

      {/* Add/Edit Expense Modal */}
      <ExpenseModal
        open={expenseModalOpen}
        editing={editingExpense}
        currency={profile?.currency || 'IDR'}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSaveExpense}
      />

      {/* Add/Edit Income Modal */}
      <IncomeModal
        open={incomeModalOpen}
        editing={editingIncome}
        currency={profile?.currency || 'IDR'}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSubmit={handleSaveIncome}
      />

      {/* Delete Transaction Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'expense'
            ? 'Hapus Catatan Pengeluaran?'
            : 'Hapus Catatan Pemasukan?'
        }
        description={
          deleteTarget?.kind === 'expense'
            ? `Pengeluaran "${deleteTarget.item.description}" akan dihapus permanen dan saldo akan dihitung ulang.`
            : deleteTarget
            ? `Pemasukan "${deleteTarget.item.source}" akan dihapus permanen dan saldo akan dihitung ulang.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        tone="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
