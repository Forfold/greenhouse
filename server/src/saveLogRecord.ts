import { db } from './db';
import { readings } from './db/schema';

export const UNITS = [
  'liters',
  'milliliters',
  'gallons',
  'quarts',
  'pints',
  'cups',
  'fluid ounces',
  'tablespoons',
  'teaspoons',
  'percentage',
  'fahrenheit',
  'celsius'
];

const THIRTY_DAYS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;

type LogEntry = {
  id: string;
  configID: string;
  sensor: string;
  value: number;
  unit: string;
  recordedAt: Date;
};

export class ValidationError extends Error {
  readonly statusCode = 400;
}

export class SaveLogRecord {
  constructor(private readonly logEntry: LogEntry) {}

  async execute() {
    this.validateLogEntry();
    await this.persistLogEntry(this.logEntry);
    await this.sendExceedanceNotifications();
  }

  // validates the log entry
  private validateLogEntry() {
    if (!this.logEntry.sensor) {
      throw new ValidationError('Log entry sensor name is required');
    }
    if (!this.logEntry.value) {
      throw new ValidationError('Log entry value is required');
    }
    if (!this.logEntry.unit) {
      throw new ValidationError('Log entry unit is required');
    }
    if (!UNITS.includes(this.logEntry.unit)) {
      throw new ValidationError('Log entry unit is not supported');
    }
    if (!this.logEntry.recordedAt) {
      throw new ValidationError('Log entry date is required');
    }
    if (this.logEntry.recordedAt.getTime() > Date.now()) {
      throw new ValidationError('Log entry date is in the future');
    }
    if (
      this.logEntry.recordedAt.getTime() <
      Date.now() - THIRTY_DAYS_IN_MILLISECONDS
    ) {
      throw new ValidationError('Log entry date is too old');
    }

    // TODO: validate logEntry depending on unit
    // if (this.logEntry.value > 500) {
    //   throw new ValidationError('Log entry value is way too high');
    // }
    // if (this.logEntry.value > 100) {
    //   throw new ValidationError('Log entry value is too high');
    // }
  }

  // persists the log entry
  private async persistLogEntry(logEntry: LogEntry) {
    await db.insert(readings).values(logEntry);
  }

  // sends the exceedance notifications
  private async sendExceedanceNotifications() {
    // @ts-expect-error - TODO: implement this
    const sendExceedanceNotification = new SendExceedanceNotification(
      this.logEntry,
    );
    sendExceedanceNotification.execute();
  }
}
