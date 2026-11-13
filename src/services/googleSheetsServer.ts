import { ExpenseRecord, IncomeRecord } from '../db/schema.ts';
import { MonthlySummaryRow } from '../shared/finance.ts';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

export class SheetsApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'SHEETS_API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function sheetsFetch<T>(
  accessToken: string,
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let parsedMessage = 'Koneksi ke Google Sheets gagal.';
    try {
      const parsed = JSON.parse(bodyText);
      parsedMessage = parsed?.error?.message || parsedMessage;
    } catch {
      // ignore non-json error body
    }

    if (response.status === 401 || response.status === 403) {
      throw new SheetsApiError(
        'Sesi izin Google Sheets kedaluwarsa atau akses ditolak. Silakan hubungkan ulang akun Google.',
        response.status,
        'SHEETS_AUTH_EXPIRED'
      );
    }

    if (response.status === 404) {
      throw new SheetsApiError(
        'Spreadsheet tidak ditemukan. Periksa kembali ID atau URL spreadsheet.',
        404,
        'SPREADSHEET_NOT_FOUND'
      );
    }

    throw new SheetsApiError(parsedMessage, response.status, 'SHEETS_API_ERROR');
  }

  return (await response.json()) as T;
}

export async function createFinanceSpreadsheet(
  accessToken: string,
  title: string
): Promise<SpreadsheetMetadata> {
  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(accessToken, SHEETS_API_BASE, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Income', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Expenses', gridProperties: { frozenRowCount: 1 } } },
        {
          properties: {
            title: 'Monthly Summary',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: data.sheets.map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(
    accessToken,
    `${SHEETS_API_BASE}/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets || []).map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };
}

async function ensureRequiredTabs(
  accessToken: string,
  spreadsheetId: string,
  existingSheets: Array<{ sheetId: number; title: string }>
): Promise<Array<{ sheetId: number; title: string }>> {
  const requiredTabs = ['Income', 'Expenses', 'Monthly Summary'];
  const existingTitles = new Set(existingSheets.map((s) => s.title));
  const missingTabs = requiredTabs.filter((t) => !existingTitles.has(t));

  if (missingTabs.length === 0) {
    return existingSheets;
  }

  await sheetsFetch(
    accessToken,
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTabs.map((title) => ({
          addSheet: {
            properties: {
              title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        })),
      }),
    }
  );

  const refreshed = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  return refreshed.sheets;
}

export async function syncFinanceDataToSheets(
  accessToken: string,
  spreadsheetId: string,
  payload: {
    incomes: IncomeRecord[];
    expenses: ExpenseRecord[];
    monthlySummaryRows: MonthlySummaryRow[];
  }
) {
  const meta = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const sheets = await ensureRequiredTabs(accessToken, spreadsheetId, meta.sheets);

  // Deduplicate by externalId and sort chronologically for clean ledger order
  const uniqueIncomes = Array.from(
    new Map(payload.incomes.map((item) => [item.externalId, item])).values()
  ).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const uniqueExpenses = Array.from(
    new Map(payload.expenses.map((item) => [item.externalId, item])).values()
  ).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const incomeValues = [
    ['ID', 'Date', 'Source', 'Category', 'Amount', 'Notes'],
    ...uniqueIncomes.map((i) => [
      i.externalId,
      i.date,
      i.source,
      i.category,
      i.amount,
      i.notes,
    ]),
  ];

  const expenseValues = [
    ['ID', 'Date', 'Description', 'Category', 'Payment Method', 'Amount', 'Notes'],
    ...uniqueExpenses.map((e) => [
      e.externalId,
      e.date,
      e.description,
      e.category,
      e.paymentMethod,
      e.amount,
      e.notes,
    ]),
  ];

  const summaryValues = [
    [
      'Month',
      'Year',
      'Total Income',
      'Total Expense',
      'Total Savings',
      'Total Investment',
      'Remaining Balance',
    ],
    ...payload.monthlySummaryRows.map((row) => [
      row.monthName,
      row.year,
      row.totalIncome,
      row.totalExpense,
      row.totalSavings,
      row.totalInvestment,
      row.remainingBalance,
    ]),
  ];

  // Clear existing sheet contents first so removed transactions don't remain stale
  await sheetsFetch(
    accessToken,
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: ['Income!A:F', 'Expenses!A:G', 'Monthly Summary!A:G'],
      }),
    }
  );

  // Write updated structured datasets
  await sheetsFetch(
    accessToken,
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Income!A1', values: incomeValues },
          { range: 'Expenses!A1', values: expenseValues },
          { range: 'Monthly Summary!A1', values: summaryValues },
        ],
      }),
    }
  );

  // Bold header rows on all 3 tabs
  const targetSheetIds = sheets
    .filter((s) => ['Income', 'Expenses', 'Monthly Summary'].includes(s.title))
    .map((s) => s.sheetId);

  if (targetSheetIds.length > 0) {
    await sheetsFetch(
      accessToken,
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: targetSheetIds.map((sheetId) => ({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          })),
        }),
      }
    );
  }

  return {
    spreadsheetId: meta.spreadsheetId,
    spreadsheetUrl: meta.spreadsheetUrl,
    spreadsheetName: meta.title,
    syncedCounts: {
      incomes: uniqueIncomes.length,
      expenses: uniqueExpenses.length,
      monthlySummaries: payload.monthlySummaryRows.length,
    },
  };
}
