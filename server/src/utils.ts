import { DateTime } from 'luxon';
import type { Limit, Unit } from './db/schema';

// 1000ms * 60s * 60m * 24h * 30d
export const THIRTY_DAYS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;

// Convert a temperature value to Celsius for comparison
export function toCanonicalTemperature(value: number, unit: Unit): number {
  if (unit === 'celsius') return value;
  if (unit === 'fahrenheit') return ((value - 32) * 5) / 9;
  throw new Error(`Not a temperature unit: ${unit}`);
}

// Convert a volume value to milliliters for comparison
export function toCanonicalVolume(value: number, unit: Unit): number {
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
export function toCanonicalPercentage(value: number, unit: Unit): number {
  if (unit !== 'percentage') throw new Error(`Not a percentage unit: ${unit}`);
  return value;
}

export function toComparable(value: number, unit: Unit): number {
  if (unit === 'fahrenheit' || unit === 'celsius')
    return toCanonicalTemperature(value, unit);
  if (unit === 'percentage') return toCanonicalPercentage(value, unit);
  return toCanonicalVolume(value, unit);
}

// Convert a delta (difference) value to canonical units for comparison.
// Temperature deltas must not apply the offset used for absolute conversion:
// a 10°F change = (10 * 5/9)°C ≈ 5.56°C, not ((10 - 32) * 5/9) = -12.22°C.
// Volume and percentage conversions are pure scale factors, so toComparable works for both.
export function toDeltaComparable(value: number, unit: Unit): number {
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

export function windowEndDate(
  periodStart: Date,
  period: Limit['period'],
  count: number,
): Date {
  return DateTime.fromJSDate(periodStart)
    .plus({ [periodToDurationKey[period]]: count })
    .toJSDate();
}
