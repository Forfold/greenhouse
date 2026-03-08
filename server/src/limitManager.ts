import type { Limit, LimitWindow } from './db/schema';
import { LimitStore } from './limitStore';
import type { LogEntry } from './saveLogRecord';
import { toComparable, toDeltaComparable, windowEndDate } from './utils';

export class LimitManager {
  private readonly store = new LimitStore();

  constructor(private readonly log: LogEntry) {}
  // todo: need function to cleanup old limit_windows

  async getLimitWindowsForLogLimits(lims: Limit[]): Promise<LimitWindow[]> {
    return this.store.getLimitWindowsForLimits(lims.map((l) => l.id));
  }

  async getLimitsForLog(): Promise<Limit[]> {
    return this.store.getLimitsForConfig(this.log.configID);
  }

  async ensureLimitWindow(
    limit: Limit,
    window: LimitWindow | undefined,
  ): Promise<LimitWindow> {
    if (window) return window;
    return this.store.createLimitWindow(limit.id, this.log.recordedAt);
  }

  // checkLogWithinLimitAndWindow returns true if the log value violates the limit
  // within the current window (and the window has not already been triggered).
  async checkLogWithinLimitAndWindow(
    limit: Limit,
    window: LimitWindow,
  ): Promise<boolean> {
    // Already triggered this window, skip to avoid duplicate notifications
    if (window.triggeredAt) return false;

    const windowEnd = windowEndDate(
      window.periodStart,
      limit.period,
      limit.periodCount,
    );
    if (this.log.recordedAt >= windowEnd) return false;

    const logValue = toComparable(this.log.value, this.log.unit);

    if (limit.type === 'threshold') {
      const limitValue = toComparable(limit.limitValue, limit.limitUnit);
      if (limit.direction === 'above') return logValue > limitValue;
      if (limit.direction === 'below') return logValue < limitValue;
    }

    if (limit.type === 'rate') {
      // Find the earliest reading in this window (excluding current log) to compute delta
      const startReading = await this.store.getFirstReadingInWindow(
        this.log.configID,
        this.log.sensor,
        window.periodStart,
        this.log.recordedAt,
        this.log.id,
      );
      if (!startReading) return false;

      const startValue = toComparable(startReading.value, startReading.unit);
      const delta = logValue - startValue;
      const limitValue = toDeltaComparable(limit.limitValue, limit.limitUnit);

      if (limit.direction === 'increase') return delta > limitValue;
      if (limit.direction === 'decrease') return delta < -limitValue;
    }

    return false;
  }

  // advanceWindowIfExpired rolls the window to the current period if it has expired,
  // and returns the (possibly updated) window. Always call this before checking limits.
  async advanceWindowIfExpired(
    limit: Limit,
    window: LimitWindow,
  ): Promise<LimitWindow> {
    const windowEnd = windowEndDate(
      window.periodStart,
      limit.period,
      limit.periodCount,
    );
    if (this.log.recordedAt >= windowEnd) {
      await this.store.rollWindowToNewPeriod(window.id, this.log.recordedAt);
      return { ...window, periodStart: this.log.recordedAt, triggeredAt: null };
    }
    return window;
  }

  async markWindowTriggered(window: LimitWindow) {
    await this.store.markWindowTriggered(window.id, this.log.recordedAt);
  }
}
