import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default('').notNull(),
  photoUrl: text('photo_url').default('').notNull(),
  initialBalance: doublePrecision('initial_balance').default(0).notNull(),
  currency: text('currency').default('IDR').notNull(),
  monthlyBudget: doublePrecision('monthly_budget').default(0).notNull(),
  spreadsheetId: text('spreadsheet_id').default('').notNull(),
  spreadsheetUrl: text('spreadsheet_url').default('').notNull(),
  spreadsheetName: text('spreadsheet_name').default('').notNull(),
  autoSyncPrompt: boolean('auto_sync_prompt').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  hasUnsyncedChanges: boolean('has_unsynced_changes').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  description: text('description').notNull(),
  category: text('category').notNull(),
  subType: text('sub_type').default('').notNull(), // 'Tabungan' | 'Investasi' | ''
  paymentMethod: text('payment_method').notNull(),
  amount: doublePrecision('amount').notNull(),
  notes: text('notes').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const incomes = pgTable('incomes', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  source: text('source').notNull(),
  category: text('category').notNull(),
  amount: doublePrecision('amount').notNull(),
  notes: text('notes').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  incomes: many(incomes),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

export type UserRecord = typeof users.$inferSelect;
export type ExpenseRecord = typeof expenses.$inferSelect;
export type IncomeRecord = typeof incomes.$inferSelect;
