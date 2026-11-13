import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getOrCreateUser, updateUserSettings } from './src/db/users.ts';
import {
  createExpense,
  createIncome,
  deleteExpense,
  deleteIncome,
  getFinancialSummary,
  listExpenses,
  listIncomes,
  updateExpense,
  updateIncome,
} from './src/db/transactions.ts';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  isPositiveAmount,
  isValidDateString,
} from './src/shared/finance.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WORKSPACE_UID = 'default-workspace';
const DEFAULT_WORKSPACE_EMAIL = 'workspace@local';

const app = express();
app.use(express.json());

async function resolveWorkspaceUser() {
  return await getOrCreateUser(
    DEFAULT_WORKSPACE_UID,
    DEFAULT_WORKSPACE_EMAIL,
    'Personal Finance'
  );
}

function handleRouteError(res: Response, error: unknown, fallback: string) {
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/me', async (_req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    res.json({ user });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memuat profil pengguna.');
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    await resolveWorkspaceUser();
    const { displayName, initialBalance, currency, monthlyBudget } = req.body ?? {};

    const updates: Parameters<typeof updateUserSettings>[1] = {};
    if (typeof displayName === 'string') updates.displayName = displayName.trim().slice(0, 80);
    if (typeof initialBalance === 'number' && Number.isFinite(initialBalance) && initialBalance >= 0) {
      updates.initialBalance = initialBalance;
    }
    if (typeof currency === 'string' && ['IDR', 'USD', 'SGD', 'MYR'].includes(currency)) {
      updates.currency = currency;
    }
    if (typeof monthlyBudget === 'number' && Number.isFinite(monthlyBudget) && monthlyBudget >= 0) {
      updates.monthlyBudget = monthlyBudget;
    }

    const updated = await updateUserSettings(DEFAULT_WORKSPACE_UID, updates);
    res.json({ user: updated });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memperbarui pengaturan.');
  }
});

app.get('/api/summary', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Periode bulan/tahun tidak valid.' });
    }

    const summary = await getFinancialSummary(
      user.id,
      user.initialBalance,
      month,
      year
    );
    res.json({ summary, user });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menghitung ringkasan keuangan.');
  }
});

app.get('/api/expenses', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const category =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const startDate =
      typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    const rows = await listExpenses(user.id, {
      month,
      year,
      category,
      search,
      startDate,
      endDate,
    });
    res.json({ expenses: rows });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memuat pengeluaran.');
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const { date, description, category, subType, paymentMethod, amount, notes } =
      req.body ?? {};

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Deskripsi pengeluaran wajib diisi.' });
    }
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Kategori pengeluaran tidak valid.' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }
    if (!isPositiveAmount(Number(amount))) {
      return res.status(400).json({ error: 'Nominal pengeluaran harus lebih dari 0.' });
    }

    const created = await createExpense(user.id, {
      date,
      description,
      category,
      subType: typeof subType === 'string' ? subType : '',
      paymentMethod,
      amount: Number(amount),
      notes: typeof notes === 'string' ? notes : '',
    });
    res.status(201).json({ expense: created });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menambahkan pengeluaran.');
  }
});

app.put('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID transaksi tidak valid.' });
    }

    const { date, description, category, subType, paymentMethod, amount, notes } =
      req.body ?? {};

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Deskripsi pengeluaran wajib diisi.' });
    }
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Kategori pengeluaran tidak valid.' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }
    if (!isPositiveAmount(Number(amount))) {
      return res.status(400).json({ error: 'Nominal pengeluaran harus lebih dari 0.' });
    }

    const updated = await updateExpense(user.id, id, {
      date,
      description,
      category,
      subType: typeof subType === 'string' ? subType : '',
      paymentMethod,
      amount: Number(amount),
      notes: typeof notes === 'string' ? notes : '',
    });
    if (!updated) {
      return res.status(404).json({ error: 'Transaksi pengeluaran tidak ditemukan.' });
    }
    res.json({ expense: updated });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memperbarui pengeluaran.');
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID transaksi tidak valid.' });
    }
    const deleted = await deleteExpense(user.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaksi pengeluaran tidak ditemukan.' });
    }
    res.json({ deleted: true });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menghapus pengeluaran.');
  }
});

app.get('/api/incomes', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const category =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const startDate =
      typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    const rows = await listIncomes(user.id, {
      month,
      year,
      category,
      search,
      startDate,
      endDate,
    });
    res.json({ incomes: rows });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memuat pemasukan.');
  }
});

app.post('/api/incomes', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const { date, source, category, amount, notes } = req.body ?? {};

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
    }
    if (typeof source !== 'string' || !source.trim()) {
      return res.status(400).json({ error: 'Sumber pemasukan wajib diisi.' });
    }
    if (!INCOME_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Kategori pemasukan tidak valid.' });
    }
    if (!isPositiveAmount(Number(amount))) {
      return res.status(400).json({ error: 'Nominal pemasukan harus lebih dari 0.' });
    }

    const created = await createIncome(user.id, {
      date,
      source,
      category,
      amount: Number(amount),
      notes: typeof notes === 'string' ? notes : '',
    });
    res.status(201).json({ income: created });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menambahkan pemasukan.');
  }
});

app.put('/api/incomes/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID pemasukan tidak valid.' });
    }

    const { date, source, category, amount, notes } = req.body ?? {};

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
    }
    if (typeof source !== 'string' || !source.trim()) {
      return res.status(400).json({ error: 'Sumber pemasukan wajib diisi.' });
    }
    if (!INCOME_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Kategori pemasukan tidak valid.' });
    }
    if (!isPositiveAmount(Number(amount))) {
      return res.status(400).json({ error: 'Nominal pemasukan harus lebih dari 0.' });
    }

    const updated = await updateIncome(user.id, id, {
      date,
      source,
      category,
      amount: Number(amount),
      notes: typeof notes === 'string' ? notes : '',
    });
    if (!updated) {
      return res.status(404).json({ error: 'Data pemasukan tidak ditemukan.' });
    }
    res.json({ income: updated });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memperbarui pemasukan.');
  }
});

app.delete('/api/incomes/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveWorkspaceUser();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID pemasukan tidak valid.' });
    }
    const deleted = await deleteIncome(user.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Data pemasukan tidak ditemukan.' });
    }
    res.json({ deleted: true });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menghapus pemasukan.');
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Personal Finance Tracker listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
