import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { UserProfile } from '../shared/finance.ts';
import { ConfirmDialog } from './ConfirmDialog.tsx';

interface GoogleSheetsViewProps {
  user: UserProfile;
  hasGoogleToken: boolean;
  totalIncomeCount: number;
  totalExpenseCount: number;
  totalSummaryMonths: number;
  onRefreshToken: () => Promise<void>;
  onCreateSpreadsheet: (title?: string) => Promise<void>;
  onConnectSpreadsheet: (spreadsheetIdOrUrl: string) => Promise<void>;
  onSyncNow: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

type PendingAction =
  | { type: 'create'; title: string }
  | { type: 'sync' }
  | { type: 'disconnect' }
  | null;

export function GoogleSheetsView({
  user,
  hasGoogleToken,
  totalIncomeCount,
  totalExpenseCount,
  totalSummaryMonths,
  onRefreshToken,
  onCreateSpreadsheet,
  onConnectSpreadsheet,
  onSyncNow,
  onDisconnect,
}: GoogleSheetsViewProps) {
  const [newTitle, setNewTitle] = useState('Personal Finance Tracker');
  const [connectInput, setConnectInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isLinked = Boolean(user.spreadsheetId);

  const handleRefresh = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await onRefreshToken();
      setStatusMessage({
        type: 'success',
        text: 'Izin akses Google Sheets aktif untuk sesi ini.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memperbarui izin Google.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectInput.trim()) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      await onConnectSpreadsheet(connectInput.trim());
      setConnectInput('');
      setStatusMessage({
        type: 'success',
        text: 'Spreadsheet berhasil dihubungkan. Klik "Sinkronkan Sekarang" untuk menulis data.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal menghubungkan spreadsheet. Periksa ID/URL atau izin Google.',
      });
    } finally {
      setBusy(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      if (pendingAction.type === 'create') {
        await onCreateSpreadsheet(pendingAction.title);
        setStatusMessage({
          type: 'success',
          text: 'Spreadsheet baru berhasil dibuat dan seluruh data keuangan telah disinkronkan.',
        });
      } else if (pendingAction.type === 'sync') {
        await onSyncNow();
        setStatusMessage({
          type: 'success',
          text: 'Seluruh data Pemasukan, Pengeluaran, dan Ringkasan Bulanan berhasil disinkronkan ke Google Sheets.',
        });
      } else if (pendingAction.type === 'disconnect') {
        await onDisconnect();
        setStatusMessage({
          type: 'success',
          text: 'Koneksi spreadsheet dari aplikasi telah dilepas (file di Google Drive Anda tetap aman).',
        });
      }
      setPendingAction(null);
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat berkomunikasi dengan Google Sheets.',
      });
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  };

  const syncStatusLabel = !isLinked
    ? 'Belum Terhubung'
    : !hasGoogleToken
    ? 'Perlu Hubungkan Ulang Sesi Google'
    : user.hasUnsyncedChanges
    ? 'Perlu Sinkronisasi (Ada Perubahan Baru)'
    : 'Tersinkronisasi';

  return (
    <div className="space-y-6">
      {/* Connection & Sync Status Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isLinked && !user.hasUnsyncedChanges && hasGoogleToken
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Status Integrasi Google Sheets
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {isLinked && !user.hasUnsyncedChanges && hasGoogleToken ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {syncStatusLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {syncStatusLabel}
                  </span>
                )}
                {user.lastSyncedAt && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">
                      Sinkron terakhir:{' '}
                      {new Date(user.lastSyncedAt).toLocaleString('id-ID')}
                    </span>
                  </>
                )}
              </div>
              {isLinked && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-medium text-slate-800">
                    Spreadsheet: {user.spreadsheetName || user.spreadsheetId}
                  </span>
                  {user.spreadsheetUrl && (
                    <a
                      href={user.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                    >
                      Buka di Google Sheets
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasGoogleToken && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={busy}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aktifkan Sesi Google Sheets
              </button>
            )}

            {isLinked && (
              <>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'sync' })}
                  disabled={busy || !hasGoogleToken}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sinkronkan Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'disconnect' })}
                  disabled={busy}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Putus Koneksi
                </button>
              </>
            )}
          </div>
        </div>

        {!hasGoogleToken && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
            Demi keamanan, token akses Google Sheets hanya disimpan di memori sesi dan tidak
            pernah disimpan permanen di browser atau database. Klik{' '}
            <strong>Aktifkan Sesi Google Sheets</strong> di atas jika Anda baru memuat ulang
            halaman.
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </section>

      {/* Setup Options */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Buat Spreadsheet Baru Otomatis
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Membuat file Google Sheets baru di akun Google Anda dengan 3 lembar terorganisir
            (Income, Expenses, Monthly Summary) dan langsung menyalin seluruh transaksi saat ini.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Nama File Spreadsheet
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setPendingAction({
                  type: 'create',
                  title: newTitle.trim() || 'Personal Finance Tracker',
                })
              }
              disabled={busy || !hasGoogleToken}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Buat &amp; Sinkronkan Spreadsheet Baru
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Hubungkan Spreadsheet yang Sudah Ada
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Tempelkan URL atau ID Google Spreadsheet milik Anda. Sistem akan memverifikasi
            akses dan menyiapkan tab Income, Expenses, serta Monthly Summary saat sinkronisasi.
          </p>

          <form onSubmit={handleConnectExisting} className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                URL atau Spreadsheet ID
              </label>
              <input
                type="text"
                value={connectInput}
                onChange={(e) => setConnectInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1ABC..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !hasGoogleToken || !connectInput.trim()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <Link2 className="h-3.5 w-3.5" />
              Hubungkan Spreadsheet
            </button>
          </form>
        </section>
      </div>

      {/* Spreadsheet Schema Reference */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900">
          Struktur Lembar Spreadsheet (Sesuai Standar Backup)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Setiap transaksi menggunakan ID unik (<span className="font-mono">INC-*</span> /{' '}
          <span className="font-mono">EXP-*</span>) untuk mencegah duplikasi saat sinkronisasi.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold text-slate-900">1. Sheet: Income</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {totalIncomeCount} baris siap disinkronkan
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-slate-700">
              <li>ID</li>
              <li>Date</li>
              <li>Source</li>
              <li>Category</li>
              <li>Amount</li>
              <li>Notes</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold text-slate-900">2. Sheet: Expenses</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {totalExpenseCount} baris siap disinkronkan
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-slate-700">
              <li>ID</li>
              <li>Date</li>
              <li>Description</li>
              <li>Category</li>
              <li>Payment Method</li>
              <li>Amount</li>
              <li>Notes</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold text-slate-900">
              3. Sheet: Monthly Summary
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {totalSummaryMonths} rekap bulanan siap disinkronkan
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-slate-700">
              <li>Month</li>
              <li>Year</li>
              <li>Total Income</li>
              <li>Total Expense</li>
              <li>Total Savings</li>
              <li>Total Investment</li>
              <li>Remaining Balance</li>
            </ul>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === 'create'
            ? 'Buat & Tulis Spreadsheet Baru?'
            : pendingAction?.type === 'sync'
            ? 'Sinkronkan Data ke Google Sheets?'
            : 'Putus Koneksi Spreadsheet?'
        }
        description={
          pendingAction?.type === 'create'
            ? `Aplikasi akan membuat spreadsheet baru berjudul "${pendingAction.title}" di Google Drive Anda dan mengisi lembar Income, Expenses, dan Monthly Summary.`
            : pendingAction?.type === 'sync'
            ? `Operasi ini akan memperbarui isi tab Income, Expenses, dan Monthly Summary pada spreadsheet "${
                user.spreadsheetName || user.spreadsheetId
              }" agar sesuai dengan data terbaru di aplikasi.`
            : 'Koneksi spreadsheet akan dilepas dari aplikasi. File di Google Drive Anda tidak akan dihapus.'
        }
        details={
          pendingAction?.type === 'disconnect'
            ? undefined
            : [
                `${totalIncomeCount} catatan Pemasukan pada sheet Income`,
                `${totalExpenseCount} catatan Pengeluaran pada sheet Expenses`,
                `${totalSummaryMonths} periode pada sheet Monthly Summary`,
              ]
        }
        confirmLabel={
          pendingAction?.type === 'create'
            ? 'Buat & Sinkronkan'
            : pendingAction?.type === 'sync'
            ? 'Ya, Sinkronkan Data'
            : 'Putus Koneksi'
        }
        tone={pendingAction?.type === 'disconnect' ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={executeConfirmedAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
