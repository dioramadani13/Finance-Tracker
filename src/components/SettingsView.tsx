import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Database, LogIn, LogOut, Save } from 'lucide-react';
import { CURRENCIES, UserProfile } from '../shared/finance.ts';
import { formatFirebaseErrorForUser } from '../lib/firestoreStore.ts';

interface SettingsViewProps {
  user: UserProfile;
  isCloudMode: boolean;
  authBusy: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSaveSettings: (payload: {
    displayName: string;
    initialBalance: number;
    currency: string;
    monthlyBudget: number;
  }) => Promise<void>;
}

export function SettingsView({
  user,
  isCloudMode,
  authBusy,
  onSignIn,
  onSignOut,
  onSaveSettings,
}: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [initialBalance, setInitialBalance] = useState(String(user.initialBalance));
  const [currency, setCurrency] = useState(user.currency || 'IDR');
  const [monthlyBudget, setMonthlyBudget] = useState(String(user.monthlyBudget));
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.displayName);
    setInitialBalance(String(user.initialBalance));
    setCurrency(user.currency || 'IDR');
    setMonthlyBudget(String(user.monthlyBudget));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const parsedInitial = Number(initialBalance);
    const parsedBudget = Number(monthlyBudget);
    if (!Number.isFinite(parsedInitial) || parsedInitial < 0) {
      setError('Saldo awal harus berupa angka 0 atau lebih besar.');
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError('Anggaran bulanan harus berupa angka 0 atau lebih besar.');
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        displayName: displayName.trim(),
        initialBalance: parsedInitial,
        currency,
        monthlyBudget: parsedBudget,
      });
      setSavedNotice(true);
    } catch (err: unknown) {
      setError(formatFirebaseErrorForUser(err, 'Gagal menyimpan pengaturan.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Database Firebase Firestore
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isCloudMode
                  ? `Terhubung sebagai ${user.email || user.displayName}. Data transaksi disinkronkan secara real-time ke Firebase Firestore.`
                  : 'Saat ini menggunakan penyimpanan lokal browser. Masuk untuk menyimpan dan menyinkronkan data ke Firebase Firestore.'}
              </p>
            </div>
          </div>

          {isCloudMode ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authBusy}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar Akun
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authBusy}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              <LogIn className="h-3.5 w-3.5" />
              {authBusy ? 'Menghubungkan...' : 'Masuk dengan Google'}
            </button>
          )}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Profil &amp; Konfigurasi Keuangan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Atur saldo awal sebagai dasar perhitungan sisa saldo serta batas anggaran bulanan.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Nama Profil
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Mata Uang Utama
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Saldo Awal ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Rumus: Remaining Balance = Saldo Awal + Total Pemasukan − Total Pengeluaran.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Target / Batas Anggaran Pengeluaran Bulanan ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Isi 0 jika tidak ingin menampilkan indikator batas anggaran di dashboard.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        {savedNotice && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            Pengaturan berhasil disimpan.
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-slate-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Dokumentasi Konfigurasi &amp; Deployment
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 text-xs leading-relaxed text-slate-600 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="font-semibold text-slate-900">Penyimpanan Database</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Data transaksi disimpan di Firebase Firestore pada path{' '}
                <span className="font-mono">users/&#123;uid&#125;/transactions</span> secara
                real-time.
              </li>
              <li>
                • Jika belum masuk akun, data tetap bisa dicoba menggunakan penyimpanan lokal
                browser, serta laporan bulanan dapat diekspor ke CSV dan PDF.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="font-semibold text-slate-900">Build &amp; Deployment</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Pengembangan lokal: jalankan <span className="font-mono">npm run dev</span>{' '}
                (Express + Vite pada port 3000).
              </li>
              <li>
                • Produksi: bangun bundle dengan{' '}
                <span className="font-mono">npm run build</span> lalu jalankan server
                dengan <span className="font-mono">npm start</span>.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
