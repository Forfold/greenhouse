import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { db } from './db';
import {
  type Limit,
  type LimitWindow,
  limits,
  limitWindows,
  readings,
} from './db/schema';

export class LimitStore {
  async getLimitsForConfig(configID: string): Promise<Limit[]> {
    return db.select().from(limits).where(eq(limits.configID, configID));
  }

  async getLimitWindowsForLimits(limitIDs: string[]): Promise<LimitWindow[]> {
    if (limitIDs.length === 0) return [];
    return db
      .select()
      .from(limitWindows)
      .where(inArray(limitWindows.limitID, limitIDs));
  }

  async getFirstReadingInWindow(
    configID: string,
    sensor: string,
    periodStart: Date,
    recordedAt: Date,
    excludeId: string,
  ) {
    const [row] = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.configID, configID),
          eq(readings.sensor, sensor),
          gte(readings.recordedAt, periodStart),
          lte(readings.recordedAt, recordedAt),
          ne(readings.id, excludeId),
        ),
      )
      .orderBy(asc(readings.recordedAt))
      .limit(1);
    return row;
  }

  async createLimitWindow(limitId: string, periodStart: Date): Promise<LimitWindow> {
    const id = randomUUID();
    try {
      await db.insert(limitWindows).values({ id, limitID: limitId, periodStart });
      return { id, limitID: limitId, periodStart, triggeredAt: null };
    } catch (e) {
      if (
        e instanceof Error &&
        'errno' in e &&
        (e as NodeJS.ErrnoException).errno === 1062
      ) {
        // Race condition: another request created the window first
        const [existing] = await db
          .select()
          .from(limitWindows)
          .where(eq(limitWindows.limitID, limitId));
        if (existing) return existing;
      }
      throw e;
    }
  }

  async rollWindowToNewPeriod(windowId: string, periodStart: Date) {
    await db
      .update(limitWindows)
      .set({ periodStart, triggeredAt: null })
      .where(eq(limitWindows.id, windowId));
  }

  async markWindowTriggered(windowId: string, triggeredAt: Date) {
    await db
      .update(limitWindows)
      .set({ triggeredAt })
      .where(eq(limitWindows.id, windowId));
  }
}
