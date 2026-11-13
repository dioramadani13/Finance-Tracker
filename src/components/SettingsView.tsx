import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Save } from 'lucide-react';
import { CURRENCIES, UserProfile } from '../shared/finance.ts';

interface SettingsViewProps {
  user: UserProfile;
  onSaveSettings: (payload: {
    displayName: string;
    initialBalance: number;
    currency: string;
    monthlyBudget: number;
    autoSyncPrompt: boolean;
  }) => Promise<void>;
}

export function SettingsView({ user, onSaveSettings }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [initialBalance, setInitialBalance] = useState(String(user.initialBalance));
  const [currency, setCurrency] = useState(user.currency || 'IDR');
  const [monthlyBudget, setMonthlyBudget] = useState(String(user.monthlyBudget));
  const [autoSyncPrompt, setAutoSyncPrompt] = useState(user.autoSyncPrompt);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.displayName);
    setInitialBalance(String(user.initialBalance));
    setCurrency(user.currency || 'IDR');
    setMonthlyBudget(String(user.monthlyBudget));
    setAutoSyncPrompt(user.autoSyncPrompt);
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
        autoSyncPrompt,
      });
      setSavedNotice(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
              Nama Tampilan
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
              Email Akun Google
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            />
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

          <div className="flex items-start gap-3 pt-6">
            <input
              id="auto-sync-prompt"
              type="checkbox"
              checked={autoSyncPrompt}
              onChange={(e) => setAutoSyncPrompt(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="auto-sync-prompt" className="text-xs leading-relaxed text-slate-700">
              <span className="block font-medium text-slate-900">
                Pengingat Sinkronisasi Google Sheets
              </span>
              Tampilkan indikator saat ada transaksi baru atau perubahan yang belum disinkronkan
              ke spreadsheet.
            </label>
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

      {/* Configuration & Deployment Documentation (PRD Section 10) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-slate-700" />
          <h3 className="text-base font-semibold text-slate-900">
            Dokumentasi Arsitektur, Keamanan &amp; Deployment
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 text-xs leading-relaxed text-slate-600 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="font-semibold text-slate-900">Penyimpanan &amp; Keamanan</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Seluruh transaksi disimpan di PostgreSQL (Cloud SQL) dan diisolasi per
                pengguna melalui verifikasi Firebase ID Token di sisi server.
              </li>
              <li>
                • Kredensial Google OAuth dikelola oleh Firebase Auth; token akses Google
                Sheets hanya disimpan di memori browser dan tidak pernah ditulis ke
                localStorage atau database.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="font-semibold text-slate-900">Build &amp; Deployment</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Pengembangan lokal: jalankan <span className="font-mono">npm run dev</span>{' '}
                (Express + Vite middleware pada port 3000).
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
