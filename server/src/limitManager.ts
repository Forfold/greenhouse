import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { type Limit, type LimitWindow, limits, limitWindows } from './db/schema';
import type { LogEntry } from './saveLogRecord';

export class LimitManager {
  constructor(private readonly log: LogEntry) {}
  // todo: need function to cleanup old limit_windows

  async getLimitWindowsForLogLimits(lims: Limit[]): Promise<LimitWindow[]> {
    const rows = await db
      .select()
      .from(limitWindows)
      .where(
        inArray(
          limitWindows.limitID,
          lims.map((l) => l.id),
        ),
      );
    return rows;
  }

  async getLimitsForLog(): Promise<Limit[]> {
    const rows: Limit[] = await db
      .select()
      .from(limits)
      .where(eq(limits.configID, this.log.configID));
    return rows;
  }

  // assertLog checks if the log value fails limit condition (e.g. temp > 100F within an hour)
  async checkLogWithinLimitAndWindow(
    _limit: Limit,
    _window: LimitWindow,
  ): Promise<boolean> {
    // todo: check log against its limit and current limit_window
    // handling rate vs threshold appropriately
    return false;
  }

  async updateLimitWindow(_limit: Limit, _window: LimitWindow) {
    // todo: update limit_window in db for current log entry
  }
}
