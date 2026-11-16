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
  Moon,
  Plus,
  Settings,
  Sun,
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
  UserProfile,
} from './shared/finance.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { MonthlyReportsView } from './components/MonthlyReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ExpenseModal, IncomeModal } from './components/TransactionModals.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { MonthYearPicker } from './components/MonthYearPicker.tsx';
import { LanguageCode, UI_TEXT, getInitialLanguage } from './lib/i18n.ts';

type NavTab = 'dashboard' | 'expenses' | 'income' | 'reports' | 'settings';
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('pft_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore storage errors
  }
  return 'light';
}

export default function App() {
  const now = new Date();

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isDark = theme === 'dark';
  const [lang, setLang] = useState<LanguageCode>(getInitialLanguage);
  const t = UI_TEXT[lang];

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
    category: '',
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('pft_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme, isDark]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('pft_lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

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
  const {
    profile,
    summary,
    expenses,
    incomes,
    monthlyExpenses,
    monthlyIncomes,
    availableExpenseCategories,
    availableIncomeCategories,
  } = useMemo(() => {
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
          selectedYear,
          lang
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
        availableExpenseCategories: Array.from(
          new Set(fbExpenses.map((e) => e.category).filter(Boolean))
        ).sort(),
        availableIncomeCategories: Array.from(
          new Set(fbIncomes.map((i) => i.category).filter(Boolean))
        ).sort(),
      };
    }

    // Local guest fallback when not signed in
    void localVersion;
    const localSummaryRes = localStore.getSummary(selectedMonth, selectedYear, lang);
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
      availableExpenseCategories: Array.from(
        new Set(localStore.listExpenses({}).map((e) => e.category).filter(Boolean))
      ).sort(),
      availableIncomeCategories: Array.from(
        new Set(localStore.listIncomes({}).map((i) => i.category).filter(Boolean))
      ).sort(),
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
    lang,
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

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-100">
            Personal Finance
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t.nav.closeMenu}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-3" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {t.nav.dashboard}
          </button>

          <div className="pt-2">
            <p className="px-3 pb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {t.nav.transactionsGroup}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('expenses');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 shrink-0" />
              {t.nav.expenses}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('income');
                setMobileMenuOpen(false);
              }}
              className={`mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'income'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 shrink-0" />
              {t.nav.income}
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
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              {t.nav.reports}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {t.nav.settings}
            </button>
          </div>
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4 space-y-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.displayName}
              className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {(profile.displayName || 'PF')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {profile.displayName || t.sidebar.guestName}
            </p>
            <p className="flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
              <Database className="h-3 w-3 shrink-0" />
              {isCloudMode ? t.sidebar.cloudMode : t.sidebar.localMode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex dark:bg-slate-950 dark:text-slate-100">
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block lg:sticky lg:top-0 lg:h-screen dark:border-slate-800 dark:bg-slate-900">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[82vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center lg:flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={t.nav.openMenu}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {(activeTab === 'dashboard' ||
            activeTab === 'expenses' ||
            activeTab === 'income') && (
            <div className="hidden md:flex items-center justify-center shrink-0">
              <MonthYearPicker
                month={selectedMonth}
                year={selectedYear}
                onChange={(m, y) => {
                  setSelectedMonth(m);
                  setSelectedYear(y);
                }}
                align="center"
                lang={lang}
              />
            </div>
          )}

          <div className="ml-auto flex items-center justify-end gap-2 shrink-0 lg:flex-1">
            {activeTab !== 'expenses' && activeTab !== 'income' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIncome(null);
                    setIncomeModalOpen(true);
                  }}
                  className="hidden sm:inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.header.addIncome}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{t.header.addExpensePrefix}</span>
                  {t.header.addExpense}
                </button>
              </>
            )}

            {isCloudMode ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authBusy}
                title={`${t.header.signedInAs} ${profile.email || profile.displayName}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.header.logout}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={authBusy}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {authBusy ? t.header.loggingIn : t.header.login}
                </span>
                <span className="sm:hidden">
                  {authBusy ? t.header.mobileLoggingIn : t.header.login}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? t.header.enableLight : t.header.enableDark}
              title={isDark ? t.header.lightMode : t.header.darkMode}
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {(activeTab === 'dashboard' ||
          activeTab === 'expenses' ||
          activeTab === 'income') && (
          <div className="no-print flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 md:hidden dark:border-slate-800 dark:bg-slate-900">
            <MonthYearPicker
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
              align="left"
              compact
              lang={lang}
            />
            {activeTab !== 'expenses' && activeTab !== 'income' && (
              <button
                type="button"
                onClick={() => {
                  setEditingIncome(null);
                  setIncomeModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap sm:hidden dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.header.addIncome}
              </button>
            )}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {dataError && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300"
            >
              <span className="break-words">{dataError}</span>
              <button
                type="button"
                onClick={() => setDataError(null)}
                className="shrink-0 font-semibold hover:underline"
              >
                {t.header.closeAlert}
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              user={profile}
              loading={loadingCloud}
              isDark={isDark}
              lang={lang}
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
              availableExpenseCategories={availableExpenseCategories}
              availableIncomeCategories={availableIncomeCategories}
              loading={loadingCloud}
              lang={lang}
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
              isDark={isDark}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={profile}
              isCloudMode={isCloudMode}
              lang={lang}
              onLanguageChange={setLang}
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
        lang={lang}
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
        lang={lang}
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
            ? t.confirm.deleteExpenseTitle
            : t.confirm.deleteIncomeTitle
        }
        description={
          deleteTarget?.kind === 'expense'
            ? t.confirm.deleteExpenseDesc(deleteTarget.item.description)
            : deleteTarget
            ? t.confirm.deleteIncomeDesc(deleteTarget.item.source)
            : ''
        }
        confirmLabel={t.confirm.confirmDelete}
        tone="danger"
        loading={deleting}
        lang={lang}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
