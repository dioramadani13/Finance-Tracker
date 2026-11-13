import 'dotenv/config';
import express, { Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, updateUserSettings } from './src/db/users.ts';
import {
  createExpense,
  createIncome,
  deleteExpense,
  deleteIncome,
  getAllUserTransactions,
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
import {
  SheetsApiError,
  createFinanceSpreadsheet,
  getSpreadsheetMetadata,
  syncFinanceDataToSheets,
} from './src/services/googleSheetsServer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

async function resolveCurrentUser(req: AuthRequest) {
  const uid = req.user!.uid;
  const email = req.user!.email || 'user@example.com';
  const displayName = (req.user!.name as string | undefined) || '';
  const photoUrl = (req.user!.picture as string | undefined) || '';
  return await getOrCreateUser(uid, email, displayName, photoUrl);
}

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed;
}

function handleRouteError(res: Response, error: unknown, fallback: string) {
  if (error instanceof SheetsApiError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// User profile & settings
app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
    res.json({ user });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memuat profil pengguna.');
  }
});

app.put('/api/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await resolveCurrentUser(req);
    const { displayName, initialBalance, currency, monthlyBudget, autoSyncPrompt } =
      req.body ?? {};

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
    if (typeof autoSyncPrompt === 'boolean') {
      updates.autoSyncPrompt = autoSyncPrompt;
    }

    const updated = await updateUserSettings(req.user!.uid, updates);
    res.json({ user: updated });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memperbarui pengaturan.');
  }
});

// Dashboard & Financial Summary
app.get('/api/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

// Expenses CRUD
app.get('/api/expenses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.post('/api/expenses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.put('/api/expenses/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.delete('/api/expenses/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

// Incomes CRUD
app.get('/api/incomes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.post('/api/incomes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.put('/api/incomes/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

app.delete('/api/incomes/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
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

// Google Sheets Integration Endpoints (bearer token forwarded via X-Google-Access-Token)
app.post('/api/sheets/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
    const googleToken = req.header('X-Google-Access-Token');
    if (!googleToken) {
      return res.status(401).json({
        error: 'Token akses Google Sheets belum tersedia. Silakan login ulang.',
        code: 'SHEETS_AUTH_EXPIRED',
      });
    }

    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 100)
        : `Personal Finance Tracker — ${user.displayName || user.email}`;

    const meta = await createFinanceSpreadsheet(googleToken, title);
    const { expenses: allExpenses, incomes: allIncomes } =
      await getAllUserTransactions(user.id);
    const now = new Date();
    const summary = await getFinancialSummary(
      user.id,
      user.initialBalance,
      now.getMonth() + 1,
      now.getFullYear()
    );

    const syncResult = await syncFinanceDataToSheets(googleToken, meta.spreadsheetId, {
      incomes: allIncomes,
      expenses: allExpenses,
      monthlySummaryRows: summary.monthlySummaryRows,
    });

    const updatedUser = await updateUserSettings(user.uid, {
      spreadsheetId: syncResult.spreadsheetId,
      spreadsheetUrl: syncResult.spreadsheetUrl,
      spreadsheetName: syncResult.spreadsheetName,
      lastSyncedAt: new Date(),
      hasUnsyncedChanges: false,
    });

    res.json({ user: updatedUser, syncResult });
  } catch (error) {
    handleRouteError(res, error, 'Gagal membuat Google Spreadsheet.');
  }
});

app.post('/api/sheets/connect', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
    const googleToken = req.header('X-Google-Access-Token');
    if (!googleToken) {
      return res.status(401).json({
        error: 'Token akses Google Sheets belum tersedia. Silakan login ulang.',
        code: 'SHEETS_AUTH_EXPIRED',
      });
    }

    const rawId = typeof req.body?.spreadsheetId === 'string' ? req.body.spreadsheetId : '';
    const spreadsheetId = extractSpreadsheetId(rawId);
    if (!spreadsheetId || spreadsheetId.length < 10) {
      return res.status(400).json({ error: 'ID atau URL Google Spreadsheet tidak valid.' });
    }

    const meta = await getSpreadsheetMetadata(googleToken, spreadsheetId);
    const updatedUser = await updateUserSettings(user.uid, {
      spreadsheetId: meta.spreadsheetId,
      spreadsheetUrl: meta.spreadsheetUrl,
      spreadsheetName: meta.title,
      hasUnsyncedChanges: true,
    });

    res.json({ user: updatedUser, metadata: meta });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menghubungkan Google Spreadsheet.');
  }
});

app.post('/api/sheets/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
    const googleToken = req.header('X-Google-Access-Token');
    if (!googleToken) {
      return res.status(401).json({
        error: 'Token akses Google Sheets kedaluwarsa. Silakan hubungkan ulang akun Google.',
        code: 'SHEETS_AUTH_EXPIRED',
      });
    }

    if (!user.spreadsheetId) {
      return res.status(400).json({
        error: 'Belum ada Google Spreadsheet yang terhubung.',
        code: 'NO_SPREADSHEET_LINKED',
      });
    }

    const { expenses: allExpenses, incomes: allIncomes } =
      await getAllUserTransactions(user.id);
    const now = new Date();
    const summary = await getFinancialSummary(
      user.id,
      user.initialBalance,
      now.getMonth() + 1,
      now.getFullYear()
    );

    const syncResult = await syncFinanceDataToSheets(
      googleToken,
      user.spreadsheetId,
      {
        incomes: allIncomes,
        expenses: allExpenses,
        monthlySummaryRows: summary.monthlySummaryRows,
      }
    );

    const updatedUser = await updateUserSettings(user.uid, {
      spreadsheetName: syncResult.spreadsheetName,
      spreadsheetUrl: syncResult.spreadsheetUrl,
      lastSyncedAt: new Date(),
      hasUnsyncedChanges: false,
    });

    res.json({ user: updatedUser, syncResult });
  } catch (error) {
    handleRouteError(res, error, 'Gagal menyinkronkan data ke Google Sheets.');
  }
});

app.post('/api/sheets/disconnect', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await resolveCurrentUser(req);
    const updatedUser = await updateUserSettings(user.uid, {
      spreadsheetId: '',
      spreadsheetUrl: '',
      spreadsheetName: '',
      hasUnsyncedChanges: false,
    });
    res.json({ user: updatedUser });
  } catch (error) {
    handleRouteError(res, error, 'Gagal memutus koneksi spreadsheet.');
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
