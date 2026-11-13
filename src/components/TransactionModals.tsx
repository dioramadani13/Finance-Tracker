import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  ExpenseItem,
  INCOME_CATEGORIES,
  IncomeItem,
  PAYMENT_METHODS,
  isPositiveAmount,
  isValidDateString,
} from '../shared/finance.ts';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ExpenseModalProps {
  open: boolean;
  editing: ExpenseItem | null;
  currency: string;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    description: string;
    category: string;
    subType?: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
}

export function ExpenseModal({
  open,
  editing,
  currency,
  onClose,
  onSubmit,
}: ExpenseModalProps) {
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [subType, setSubType] = useState<string>('Tabungan');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setDescription(editing.description);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setSubType(editing.subType || 'Tabungan');
      setPaymentMethod(editing.paymentMethod);
      setNotes(editing.notes || '');
    } else {
      setDate(getTodayDateString());
      setDescription('');
      setAmount('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setSubType('Tabungan');
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNotes('');
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidDateString(date)) {
      setError('Tanggal transaksi tidak valid.');
      return;
    }
    if (!description.trim()) {
      setError('Nama atau deskripsi pengeluaran wajib diisi.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!isPositiveAmount(parsedAmount)) {
      setError('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        description: description.trim(),
        category,
        subType: category === 'Tabungan dan investasi' ? subType : '',
        paymentMethod,
        amount: parsedAmount,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengeluaran.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="expense-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {editing ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Data akan memperbarui saldo dan ringkasan keuangan secara otomatis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup form pengeluaran"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Nominal ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Contoh: 45000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Nama / Deskripsi Pengeluaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Makan siang, Isi bensin, Tagihan listrik"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Kategori Pengeluaran
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Tabungan dan investasi' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Jenis Alokasi
              </label>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['Tabungan', 'Investasi'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSubType(type)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      subType === type
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Detail tambahan jika diperlukan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting
                ? 'Menyimpan...'
                : editing
                ? 'Simpan Perubahan'
                : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IncomeModalProps {
  open: boolean;
  editing: IncomeItem | null;
  currency: string;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    source: string;
    category: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
}

export function IncomeModal({
  open,
  editing,
  currency,
  onClose,
  onSubmit,
}: IncomeModalProps) {
  const [date, setDate] = useState(getTodayDateString());
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setSource(editing.source);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setNotes(editing.notes || '');
    } else {
      setDate(getTodayDateString());
      setSource('');
      setAmount('');
      setCategory(INCOME_CATEGORIES[0]);
      setNotes('');
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidDateString(date)) {
      setError('Tanggal pemasukan tidak valid.');
      return;
    }
    if (!source.trim()) {
      setError('Sumber pemasukan wajib diisi.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!isPositiveAmount(parsedAmount)) {
      setError('Nominal pemasukan harus lebih besar dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        source: source.trim(),
        category,
        amount: parsedAmount,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pemasukan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="income-modal-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="income-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {editing ? 'Edit Pemasukan' : 'Catat Pemasukan'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Catat beberapa sumber pemasukan dalam satu bulan dengan rapi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup form pemasukan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Tanggal Pemasukan
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Nominal ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Contoh: 8500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Sumber Pemasukan
            </label>
            <input
              type="text"
              placeholder="Contoh: Gaji Bulanan PT Maju, Proyek UI Design"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={140}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Kategori Pemasukan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting
                ? 'Menyimpan...'
                : editing
                ? 'Simpan Perubahan'
                : 'Simpan Pemasukan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
