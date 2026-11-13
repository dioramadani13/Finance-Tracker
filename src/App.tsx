import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Database,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import {
  signInWithFirebaseGoogle,
  signOutFirebase,
  subscribeAuthState,
} from './lib/firebase.ts';
import {
  firestoreStore,
  formatFirebaseErrorForUser,
} from './lib/firestoreStore.ts';
import {
  computeFinancialSummary,
  filterExpensesList,
  filterIncomesList,
} from './lib/financeCompute.ts';
import { localStore } from './lib/localStore.ts';
import {
  ExpenseItem,
  IncomeItem,
  MONTH_NAMES_ID,
  UserProfile,
} from './shared/finance.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { MonthlyReportsView } from './components/MonthlyReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ExpenseModal, IncomeModal } from './components/TransactionModals.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';

type NavTab = 'dashboard' | 'expenses' | 'income' | 'reports' | 'settings';

export default function App() {
  const now = new Date();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  // Firestore reactive state (when authenticated)
  const [fbProfile, setFbProfile] = useState<UserProfile | null>(null);
  const [fbExpenses, setFbExpenses] = useState<ExpenseItem[]>([]);
  const [fbIncomes, setFbIncomes] = useState<IncomeItem[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Local workspace revision trigger (when signed out)
  const [localVersion, setLocalVersion] = useState(0);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dataError, setDataError] = useState<string | null>(null);

  const [txFilters, setTxFilters] = useState({
    category: 'ALL',
    search: '',
    startDate: '',
    endDate: '',
    useMonthScope: true,
  });

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'expense'; item: ExpenseItem }
    | { kind: 'income'; item: IncomeItem }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Subscribe to Firebase Auth State
  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setFbProfile(null);
        setFbExpenses([]);
        setFbIncomes([]);
        setLoadingCloud(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Attach Firestore real-time onSnapshot listeners ONLY when authenticated
  useEffect(() => {
    if (!authReady || !authUser) return;

    let cancelled = false;
    let unsubscribeWorkspace: (() => void) | null = null;
    setLoadingCloud(true);
    setDataError(null);

    firestoreStore
      .ensureUserProfile(authUser)
      .then((initialProfile) => {
        if (cancelled) return;
        setFbProfile(initialProfile);
        unsubscribeWorkspace = firestoreStore.subscribeWorkspace(authUser, {
          onProfile: (nextProfile) => {
            if (!cancelled) {
              setFbProfile(nextProfile);
              setLoadingCloud(false);
            }
          },
          onTransactions: ({ expenses: nextExpenses, incomes: nextIncomes }) => {
            if (!cancelled) {
              setFbExpenses(nextExpenses);
              setFbIncomes(nextIncomes);
              setLoadingCloud(false);
            }
          },
          onError: (err) => {
            if (!cancelled) {
              setLoadingCloud(false);
              setDataError(
                formatFirebaseErrorForUser(err, 'Gagal membaca data real-time dari Firestore.')
              );
            }
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadingCloud(false);
          setDataError(
            formatFirebaseErrorForUser(err, 'Gagal menghubungkan ke Firebase Firestore.')
          );
        }
      });

    return () => {
      cancelled = true;
      if (unsubscribeWorkspace) {
        unsubscribeWorkspace();
      }
    };
  }, [authReady, authUser]);

  const isCloudMode = Boolean(authUser);

  // Derived active profile, summary, and filtered lists
  const { profile, summary, expenses, incomes, monthlyExpenses, monthlyIncomes } = useMemo(() => {
    if (isCloudMode) {
      const activeProfile: UserProfile = fbProfile ?? {
        id: 1,
        uid: authUser!.uid,
        email: authUser!.email || '',
        displayName: authUser!.displayName || 'Pengguna',
        photoUrl: authUser!.photoURL || '',
        initialBalance: 0,
        currency: 'IDR',
        monthlyBudget: 0,
        spreadsheetId: '',
        spreadsheetUrl: '',
        spreadsheetName: '',
        autoSyncPrompt: false,
        lastSyncedAt: null,
        hasUnsyncedChanges: false,
      };
      const filterParams = txFilters.useMonthScope
        ? {
            month: selectedMonth,
            year: selectedYear,
            category: txFilters.category,
            search: txFilters.search,
          }
        : {
            startDate: txFilters.startDate || undefined,
            endDate: txFilters.endDate || undefined,
            category: txFilters.category,
            search: txFilters.search,
          };

      return {
        profile: activeProfile,
        summary: computeFinancialSummary(
          activeProfile,
          fbExpenses,
          fbIncomes,
          selectedMonth,
          selectedYear
        ),
        expenses: filterExpensesList(fbExpenses, filterParams),
        incomes: filterIncomesList(fbIncomes, filterParams),
        monthlyExpenses: filterExpensesList(fbExpenses, {
          month: selectedMonth,
          year: selectedYear,
        }),
        monthlyIncomes: filterIncomesList(fbIncomes, {
          month: selectedMonth,
          year: selectedYear,
        }),
      };
    }

    // Local guest fallback when not signed in
    void localVersion;
    const localSummaryRes = localStore.getSummary(selectedMonth, selectedYear);
    const filterParams = txFilters.useMonthScope
      ? {
          month: selectedMonth,
          year: selectedYear,
          category: txFilters.category,
          search: txFilters.search,
        }
      : {
          startDate: txFilters.startDate || undefined,
          endDate: txFilters.endDate || undefined,
          category: txFilters.category,
          search: txFilters.search,
        };

    return {
      profile: localSummaryRes.user,
      summary: localSummaryRes.summary,
      expenses: localStore.listExpenses(filterParams),
      incomes: localStore.listIncomes(filterParams),
      monthlyExpenses: localStore.listExpenses({ month: selectedMonth, year: selectedYear }),
      monthlyIncomes: localStore.listIncomes({ month: selectedMonth, year: selectedYear }),
    };
  }, [
    isCloudMode,
    authUser,
    fbProfile,
    fbExpenses,
    fbIncomes,
    localVersion,
    selectedMonth,
    selectedYear,
    txFilters,
  ]);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setDataError(null);
    try {
      await signInWithFirebaseGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setDataError(formatFirebaseErrorForUser(err, 'Gagal masuk ke akun Google Firebase.'));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setDataError(null);
    try {
      await signOutFirebase();
    } catch (err: unknown) {
      setDataError(formatFirebaseErrorForUser(err, 'Gagal keluar dari akun.'));
    } finally {
      setAuthBusy(false);
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
    if (authUser) {
      try {
        if (editingExpense) {
          const docId = editingExpense.docId || editingExpense.externalId;
          await firestoreStore.updateExpense(authUser.uid, docId, payload);
        } else {
          await firestoreStore.createExpense(authUser.uid, payload);
        }
        setDataError(null);
      } catch (err: unknown) {
        const readable = formatFirebaseErrorForUser(err, 'Gagal menyimpan pengeluaran ke Firestore.');
        setDataError(readable);
        throw new Error(readable);
      }
      return;
    }

    if (editingExpense) {
      localStore.updateExpense(editingExpense.id, payload);
    } else {
      localStore.createExpense(payload);
    }
    setLocalVersion((v) => v + 1);
  };

  const handleSaveIncome = async (payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }) => {
    if (authUser) {
      try {
        if (editingIncome) {
          const docId = editingIncome.docId || editingIncome.externalId;
          await firestoreStore.updateIncome(authUser.uid, docId, payload);
        } else {
          await firestoreStore.createIncome(authUser.uid, payload);
        }
        setDataError(null);
      } catch (err: unknown) {
        const readable = formatFirebaseErrorForUser(err, 'Gagal menyimpan pemasukan ke Firestore.');
        setDataError(readable);
        throw new Error(readable);
      }
      return;
    }

    if (editingIncome) {
      localStore.updateIncome(editingIncome.id, payload);
    } else {
      localStore.createIncome(payload);
    }
    setLocalVersion((v) => v + 1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (authUser) {
        const docId = deleteTarget.item.docId || deleteTarget.item.externalId;
        await firestoreStore.deleteTransaction(authUser.uid, docId);
      } else {
        if (deleteTarget.kind === 'expense') {
          localStore.deleteExpense(deleteTarget.item.id);
        } else {
          localStore.deleteIncome(deleteTarget.item.id);
        }
        setLocalVersion((v) => v + 1);
      }
      setDeleteTarget(null);
      setDataError(null);
    } catch (err: unknown) {
      setDataError(formatFirebaseErrorForUser(err, 'Gagal menghapus transaksi dari Firestore.'));
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

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const pageTitleMap: Record<NavTab, string> = {
    dashboard: 'Dashboard',
    expenses: 'Transactions / Expenses',
    income: 'Transactions / Income',
    reports: 'Monthly Reports',
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

      <div className="border-t border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.displayName}
              className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {(profile.displayName || 'PF')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {profile.displayName || 'Personal Finance'}
            </p>
            <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
              <Database className="h-3 w-3 shrink-0" />
              {isCloudMode ? 'Firebase Firestore' : 'Penyimpanan Lokal'}
            </p>
          </div>
        </div>

        {isCloudMode ? (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authBusy}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={authBusy}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            <LogIn className="h-3.5 w-3.5" />
            {authBusy ? 'Menghubungkan...' : 'Masuk dengan Google'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
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
              <div className="hidden md:flex items-center gap-1.5">
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

            {isCloudMode ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authBusy}
                title={`Masuk sebagai ${profile.email || profile.displayName}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={authBusy}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {authBusy ? 'Memproses...' : 'Login Google'}
                </span>
                <span className="sm:hidden">{authBusy ? '...' : 'Login'}</span>
              </button>
            )}
          </div>
        </header>

        {(activeTab === 'dashboard' ||
          activeTab === 'expenses' ||
          activeTab === 'income') && (
          <div className="no-print flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
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
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap sm:hidden"
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
              <span className="break-words">{dataError}</span>
              <button
                type="button"
                onClick={() => setDataError(null)}
                className="shrink-0 font-semibold hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              user={profile}
              loading={loadingCloud}
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

          {(activeTab === 'expenses' || activeTab === 'income') && (
            <TransactionsView
              mode={activeTab}
              onModeChange={(nextMode) => setActiveTab(nextMode)}
              currency={profile.currency || 'IDR'}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              expenses={expenses}
              incomes={incomes}
              loading={loadingCloud}
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

          {activeTab === 'reports' && (
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
              loading={loadingCloud}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={profile}
              isCloudMode={isCloudMode}
              authBusy={authBusy}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onSaveSettings={async (payload) => {
                if (authUser) {
                  await firestoreStore.updateSettings(authUser, payload);
                  return;
                }
                localStore.updateSettings(payload);
                setLocalVersion((v) => v + 1);
              }}
            />
          )}
        </main>
      </div>

      <ExpenseModal
        open={expenseModalOpen}
        editing={editingExpense}
        currency={profile.currency || 'IDR'}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSaveExpense}
      />

      <IncomeModal
        open={incomeModalOpen}
        editing={editingIncome}
        currency={profile.currency || 'IDR'}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSubmit={handleSaveIncome}
      />

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
