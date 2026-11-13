import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users, UserRecord } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName = '',
  photoUrl = ''
): Promise<UserRecord> {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName,
        photoUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          ...(photoUrl ? { photoUrl } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to retrieve or create user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string): Promise<UserRecord | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in getUserByUid:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function updateUserSettings(
  uid: string,
  updates: Partial<{
    displayName: string;
    initialBalance: number;
    currency: string;
    monthlyBudget: number;
    spreadsheetId: string;
    spreadsheetUrl: string;
    spreadsheetName: string;
    autoSyncPrompt: boolean;
    lastSyncedAt: Date;
    hasUnsyncedChanges: boolean;
  }>
): Promise<UserRecord> {
  try {
    const rows = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    if (!rows[0]) {
      throw new Error('User not found.');
    }
    return rows[0];
  } catch (error) {
    console.error('Database error in updateUserSettings:', error);
    throw new Error('Failed to update user settings.', { cause: error });
  }
}
