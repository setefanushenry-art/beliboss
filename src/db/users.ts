import { db } from './index.ts';
import { users, pharmacyData } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user record with database.', { cause: error });
  }
}

export async function savePharmacyState(userId: string, namaApotek: string, stateJson: any) {
  try {
    const result = await db
      .insert(pharmacyData)
      .values({
        userId,
        namaApotek,
        stateJson,
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database savePharmacyState failed:', error);
    throw new Error('Failed to save pharmacy data to database.', { cause: error });
  }
}

export async function getLatestPharmacyState(userId: string) {
  try {
    const result = await db
      .select()
      .from(pharmacyData)
      .where(eq(pharmacyData.userId, userId))
      .orderBy(desc(pharmacyData.createdAt))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Database getLatestPharmacyState failed:', error);
    throw new Error('Failed to retrieve pharmacy data from database.', { cause: error });
  }
}
