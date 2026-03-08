import { DateTime } from 'luxon';
import type { Limit, LimitWindow, Unit } from './db/schema';
import { LimitStore } from './limitStore';
import type { LogEntry } from './saveLogRecord';

// Convert a temperature value to Celsius for comparison
function toCanonicalTemperature(value: number, unit: Unit): number {
  if (unit === 'celsius') return value;
  if (unit === 'fahrenheit') return ((value - 32) * 5) / 9;
  throw new Error(`Not a temperature unit: ${unit}`);
}

// Convert a volume value to milliliters for comparison
function toCanonicalVolume(value: number, unit: Unit): number {
  const toML: Partial<Record<Unit, number>> = {
    milliliters: 1,
    liters: 1000,
    gallons: 3785.41,
    quarts: 946.353,
    pints: 473.176,
    cups: 236.588,
    'fluid ounces': 29.5735,
    tablespoons: 14.7868,
    teaspoons: 4.92892,
  };
  const factor = toML[unit];
  if (factor === undefined) throw new Error(`Not a volume unit: ${unit}`);
  return value * factor;
}

// Convert a percentage value (no-op; kept for symmetry)
function toCanonicalPercentage(value: number, unit: Unit): number {
  if (unit !== 'percentage') throw new Error(`Not a percentage unit: ${unit}`);
  return value;
}

function toComparable(value: number, unit: Unit): number {
  if (unit === 'fahrenheit' || unit === 'celsius')
    return toCanonicalTemperature(value, unit);
  if (unit === 'percentage') return toCanonicalPercentage(value, unit);
  return toCanonicalVolume(value, unit);
}

// Convert a delta (difference) value to canonical units for comparison.
// Temperature deltas must not apply the offset used for absolute conversion:
// a 10°F change = (10 * 5/9)°C ≈ 5.56°C, not ((10 - 32) * 5/9) = -12.22°C.
// Volume and percentage conversions are pure scale factors, so toComparable works for both.
function toDeltaComparable(value: number, unit: Unit): number {
  if (unit === 'fahrenheit') return (value * 5) / 9;
  return toComparable(value, unit);
}

const periodToDurationKey: Record<Limit['period'], string> = {
  minute: 'minutes',
  hour: 'hours',
  day: 'days',
  month: 'months',
  year: 'years',
};

function windowEndDate(
  periodStart: Date,
  period: Limit['period'],
  count: number,
): Date {
  return DateTime.fromJSDate(periodStart)
    .plus({ [periodToDurationKey[period]]: count })
    .toJSDate();
}

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
