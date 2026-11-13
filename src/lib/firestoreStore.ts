import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  ExpenseItem,
  INCOME_CATEGORIES,
  IncomeItem,
  PAYMENT_METHODS,
  UserProfile,
  isPositiveAmount,
  isValidDateString,
} from '../shared/finance.ts';
import { auth, db } from './firebase.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFirebaseErrorForUser(
  error: unknown,
  fallback = 'Terjadi kesalahan saat menyimpan data ke Firebase.'
): string {
  if (!error) return fallback;

  const rawMessage = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';

  let parsedInfo: FirestoreErrorInfo | null = null;
  if (rawMessage.trim().startsWith('{')) {
    try {
      const candidate = JSON.parse(rawMessage) as Partial<FirestoreErrorInfo>;
      if (candidate && typeof candidate.error === 'string') {
        parsedInfo = candidate as FirestoreErrorInfo;
      }
    } catch {
      // ignore non-JSON message
    }
  }

  const effectiveMsg = parsedInfo?.error || rawMessage;
  const pathSuffix = parsedInfo?.path ? ` (path: ${parsedInfo.path})` : '';

  if (
    code === 'permission-denied' ||
    /permission[-_\s]?denied|missing or insufficient permissions/i.test(effectiveMsg)
  ) {
    return `Gagal mengakses Firestore${pathSuffix}: izin ditolak (permission-denied). Pastikan Firestore Rules di Firebase Console mengizinkan akses untuk pengguna yang login.`;
  }

  if (code === 'unauthenticated' || /unauthenticated/i.test(effectiveMsg)) {
    return 'Sesi login Anda belum aktif. Silakan masuk terlebih dahulu dengan Google.';
  }

  if (
    code === 'unavailable' ||
    /offline|failed to get document because the client is offline|network/i.test(effectiveMsg)
  ) {
    return 'Koneksi ke server Firebase terputus atau sedang offline. Periksa koneksi internet Anda lalu coba lagi.';
  }

  if (
    code === 'resource-exhausted' ||
    /quota exceeded/i.test(effectiveMsg)
  ) {
    return 'Kuota harian Firebase Firestore telah tercapai. Silakan coba lagi setelah kuota direset.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Domain aplikasi belum diizinkan di Firebase Authentication. Tambahkan domain ini pada Authorized Domains di Firebase Console.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Login Google belum diaktifkan di Firebase Authentication. Aktifkan provider Google di Firebase Console.';
  }

  if (code === 'auth/popup-blocked') {
    return 'Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.';
  }

  return effectiveMsg || fallback;
}

const MAX_MONETARY_AMOUNT = 1_000_000_000_000;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function assertValidId(value: string, label: string): string {
  if (!ID_PATTERN.test(value)) {
    throw new Error(`${label} tidak valid.`);
  }
  return value;
}

function generateExternalId(prefix: 'EXP' | 'INC'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`.slice(0, 64);
}

function hashToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function formatTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeCurrency(value: unknown): string {
  if (typeof value === 'string' && CURRENCIES.some((c) => c.code === value)) {
    return value;
  }
  return 'IDR';
}

function sanitizeNonNegative(value: unknown, label: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > MAX_MONETARY_AMOUNT) {
    throw new Error(`${label} harus berupa angka antara 0 dan ${MAX_MONETARY_AMOUNT}.`);
  }
  return num;
}

function sanitizePositive(value: unknown, label: string): number {
  const num = Number(value);
  if (!isPositiveAmount(num) || num > MAX_MONETARY_AMOUNT) {
    throw new Error(`${label} harus lebih besar dari 0.`);
  }
  return num;
}

function mapUserProfile(uid: string, data: Record<string, unknown>, photoUrl = ''): UserProfile {
  return {
    id: hashToNumber(uid),
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Pengguna',
    photoUrl,
    initialBalance: typeof data.initialBalance === 'number' ? data.initialBalance : 0,
    currency: sanitizeCurrency(data.currency),
    monthlyBudget: typeof data.monthlyBudget === 'number' ? data.monthlyBudget : 0,
    spreadsheetId: '',
    spreadsheetUrl: '',
    spreadsheetName: '',
    autoSyncPrompt: false,
    lastSyncedAt: formatTimestamp(data.updatedAt),
    hasUnsyncedChanges: false,
  };
}

function mapTransactionToExpense(
  docId: string,
  uid: string,
  data: Record<string, unknown>
): ExpenseItem {
  const note = typeof data.note === 'string' ? data.note : '';
  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title
      : typeof data.description === 'string' && data.description.trim()
      ? data.description
      : note || (typeof data.category === 'string' ? data.category : 'Pengeluaran');

  return {
    id: hashToNumber(docId),
    docId,
    externalId: typeof data.externalId === 'string' ? data.externalId : docId,
    userId: hashToNumber(uid),
    date: typeof data.date === 'string' ? data.date : '',
    description: title,
    category: typeof data.category === 'string' ? data.category : EXPENSE_CATEGORIES[0],
    subType: typeof data.subType === 'string' ? data.subType : '',
    paymentMethod:
      typeof data.paymentMethod === 'string' ? data.paymentMethod : PAYMENT_METHODS[0],
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
    notes: note,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

function mapTransactionToIncome(
  docId: string,
  uid: string,
  data: Record<string, unknown>
): IncomeItem {
  const note = typeof data.note === 'string' ? data.note : '';
  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title
      : typeof data.source === 'string' && data.source.trim()
      ? data.source
      : note || (typeof data.category === 'string' ? data.category : 'Pemasukan');

  return {
    id: hashToNumber(docId),
    docId,
    externalId: typeof data.externalId === 'string' ? data.externalId : docId,
    userId: hashToNumber(uid),
    date: typeof data.date === 'string' ? data.date : '',
    source: title,
    category: typeof data.category === 'string' ? data.category : INCOME_CATEGORIES[0],
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
    notes: note,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

export const firestoreStore = {
  async ensureUserProfile(authUser: User): Promise<UserProfile> {
    const uid = assertValidId(authUser.uid, 'User ID');
    const path = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    if (snap.exists()) {
      return mapUserProfile(uid, snap.data(), authUser.photoURL || '');
    }

    const email = sanitizeText(authUser.email || `${uid}@firebase.local`, 200);
    const displayName = sanitizeText(authUser.displayName || 'Pengguna', 80) || 'Pengguna';

    try {
      await setDoc(userRef, {
        uid,
        email,
        displayName,
        initialBalance: 0,
        currency: 'IDR',
        monthlyBudget: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    return {
      id: hashToNumber(uid),
      uid,
      email,
      displayName,
      photoUrl: authUser.photoURL || '',
      initialBalance: 0,
      currency: 'IDR',
      monthlyBudget: 0,
      spreadsheetId: '',
      spreadsheetUrl: '',
      spreadsheetName: '',
      autoSyncPrompt: false,
      lastSyncedAt: new Date().toISOString(),
      hasUnsyncedChanges: false,
    };
  },

  subscribeWorkspace(
    authUser: User,
    callbacks: {
      onProfile: (profile: UserProfile) => void;
      onTransactions: (data: { expenses: ExpenseItem[]; incomes: IncomeItem[] }) => void;
      onError: (err: Error) => void;
    }
  ): () => void {
    const uid = assertValidId(authUser.uid, 'User ID');
    const userPath = `users/${uid}`;
    const transactionsPath = `users/${uid}/transactions`;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        if (snapshot.exists()) {
          callbacks.onProfile(mapUserProfile(uid, snapshot.data(), authUser.photoURL || ''));
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, userPath);
        } catch (wrapped) {
          callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    const transactionsQuery = query(
      collection(db, 'users', uid, 'transactions'),
      where('userId', '==', uid)
    );
    const unsubTransactions = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const expenses: ExpenseItem[] = [];
        const incomes: IncomeItem[] = [];

        for (const d of snapshot.docs) {
          const data = d.data();
          if (data.type === 'income') {
            incomes.push(mapTransactionToIncome(d.id, uid, data));
          } else {
            expenses.push(mapTransactionToExpense(d.id, uid, data));
          }
        }

        callbacks.onTransactions({ expenses, incomes });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, transactionsPath);
        } catch (wrapped) {
          callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    return () => {
      unsubProfile();
      unsubTransactions();
    };
  },

  async updateSettings(
    authUser: User,
    payload: {
      displayName?: string;
      initialBalance?: number;
      currency?: string;
      monthlyBudget?: number;
    }
  ): Promise<void> {
    const uid = assertValidId(authUser.uid, 'User ID');
    const path = `users/${uid}`;
    const displayName = sanitizeText(payload.displayName ?? authUser.displayName ?? 'Pengguna', 80);
    const email = sanitizeText(authUser.email || `${uid}@firebase.local`, 200);
    const initialBalance = sanitizeNonNegative(payload.initialBalance ?? 0, 'Saldo awal');
    const monthlyBudget = sanitizeNonNegative(payload.monthlyBudget ?? 0, 'Anggaran bulanan');
    const currency = sanitizeCurrency(payload.currency);

    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName,
        email,
        initialBalance,
        currency,
        monthlyBudget,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async createExpense(
    uid: string,
    payload: {
      date: string;
      description: string;
      category: string;
      subType?: string;
      paymentMethod: string;
      amount: number;
      notes?: string;
    }
  ): Promise<void> {
    const validUid = assertValidId(uid, 'User ID');
    if (!isValidDateString(payload.date)) {
      throw new Error('Tanggal transaksi tidak valid.');
    }
    const title = sanitizeText(payload.description, 140);
    if (!title) {
      throw new Error('Deskripsi pengeluaran wajib diisi.');
    }
    if (!EXPENSE_CATEGORIES.includes(payload.category as (typeof EXPENSE_CATEGORIES)[number])) {
      throw new Error('Kategori pengeluaran tidak valid.');
    }
    if (!PAYMENT_METHODS.includes(payload.paymentMethod as (typeof PAYMENT_METHODS)[number])) {
      throw new Error('Metode pembayaran tidak valid.');
    }
    const subType =
      payload.category === 'Tabungan dan investasi'
        ? payload.subType === 'Investasi'
          ? 'Investasi'
          : 'Tabungan'
        : '';
    const amount = sanitizePositive(payload.amount, 'Nominal pengeluaran');
    const note = sanitizeText(payload.notes ?? '', 300);
    const externalId = generateExternalId('EXP');
    const path = `users/${validUid}/transactions/${externalId}`;

    try {
      await setDoc(doc(db, 'users', validUid, 'transactions', externalId), {
        type: 'expense',
        amount,
        category: payload.category,
        note,
        date: payload.date,
        title,
        subType,
        paymentMethod: payload.paymentMethod,
        externalId,
        userId: validUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateExpense(
    uid: string,
    txDocId: string,
    payload: {
      date: string;
      description: string;
      category: string;
      subType?: string;
      paymentMethod: string;
      amount: number;
      notes?: string;
    }
  ): Promise<void> {
    const validUid = assertValidId(uid, 'User ID');
    const validDocId = assertValidId(txDocId, 'Transaction ID');
    if (!isValidDateString(payload.date)) {
      throw new Error('Tanggal transaksi tidak valid.');
    }
    const title = sanitizeText(payload.description, 140);
    if (!title) {
      throw new Error('Deskripsi pengeluaran wajib diisi.');
    }
    if (!EXPENSE_CATEGORIES.includes(payload.category as (typeof EXPENSE_CATEGORIES)[number])) {
      throw new Error('Kategori pengeluaran tidak valid.');
    }
    if (!PAYMENT_METHODS.includes(payload.paymentMethod as (typeof PAYMENT_METHODS)[number])) {
      throw new Error('Metode pembayaran tidak valid.');
    }
    const subType =
      payload.category === 'Tabungan dan investasi'
        ? payload.subType === 'Investasi'
          ? 'Investasi'
          : 'Tabungan'
        : '';
    const amount = sanitizePositive(payload.amount, 'Nominal pengeluaran');
    const note = sanitizeText(payload.notes ?? '', 300);
    const path = `users/${validUid}/transactions/${validDocId}`;

    try {
      await updateDoc(doc(db, 'users', validUid, 'transactions', validDocId), {
        date: payload.date,
        title,
        category: payload.category,
        subType,
        paymentMethod: payload.paymentMethod,
        amount,
        note,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteTransaction(uid: string, txDocId: string): Promise<void> {
    const validUid = assertValidId(uid, 'User ID');
    const validDocId = assertValidId(txDocId, 'Transaction ID');
    const path = `users/${validUid}/transactions/${validDocId}`;

    try {
      await deleteDoc(doc(db, 'users', validUid, 'transactions', validDocId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async createIncome(
    uid: string,
    payload: {
      date: string;
      source: string;
      category: string;
      amount: number;
      notes?: string;
    }
  ): Promise<void> {
    const validUid = assertValidId(uid, 'User ID');
    if (!isValidDateString(payload.date)) {
      throw new Error('Tanggal pemasukan tidak valid.');
    }
    const title = sanitizeText(payload.source, 140);
    if (!title) {
      throw new Error('Sumber pemasukan wajib diisi.');
    }
    if (!INCOME_CATEGORIES.includes(payload.category as (typeof INCOME_CATEGORIES)[number])) {
      throw new Error('Kategori pemasukan tidak valid.');
    }
    const amount = sanitizePositive(payload.amount, 'Nominal pemasukan');
    const note = sanitizeText(payload.notes ?? '', 300);
    const externalId = generateExternalId('INC');
    const path = `users/${validUid}/transactions/${externalId}`;

    try {
      await setDoc(doc(db, 'users', validUid, 'transactions', externalId), {
        type: 'income',
        amount,
        category: payload.category,
        note,
        date: payload.date,
        title,
        subType: '',
        paymentMethod: '',
        externalId,
        userId: validUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateIncome(
    uid: string,
    txDocId: string,
    payload: {
      date: string;
      source: string;
      category: string;
      amount: number;
      notes?: string;
    }
  ): Promise<void> {
    const validUid = assertValidId(uid, 'User ID');
    const validDocId = assertValidId(txDocId, 'Transaction ID');
    if (!isValidDateString(payload.date)) {
      throw new Error('Tanggal pemasukan tidak valid.');
    }
    const title = sanitizeText(payload.source, 140);
    if (!title) {
      throw new Error('Sumber pemasukan wajib diisi.');
    }
    if (!INCOME_CATEGORIES.includes(payload.category as (typeof INCOME_CATEGORIES)[number])) {
      throw new Error('Kategori pemasukan tidak valid.');
    }
    const amount = sanitizePositive(payload.amount, 'Nominal pemasukan');
    const note = sanitizeText(payload.notes ?? '', 300);
    const path = `users/${validUid}/transactions/${validDocId}`;

    try {
      await updateDoc(doc(db, 'users', validUid, 'transactions', validDocId), {
        date: payload.date,
        title,
        category: payload.category,
        amount,
        note,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};
