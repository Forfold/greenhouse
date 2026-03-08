import { db } from './db';
import { readings, unitEnum } from './db/schema';
import { SendExceedanceNotification } from './sendExceedanceNotification';

// 1000ms * 60s * 60m * 24h * 30d
const THIRTY_DAYS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;

export type LogEntry = {
  id: string;
  configID: string;
  sensor: string;
  value: number;
  unit: (typeof unitEnum)[number];
  recordedAt: Date;
};

export class ValidationError extends Error {
  readonly statusCode = 400;
}

export class SaveLogRecord {
  constructor(private readonly logEntry: LogEntry) {}

  async execute(tx?: typeof db) {
    this.validateLogEntry();
    await this.persistLogEntry(this.logEntry, tx);
    await this.sendExceedanceNotifications();
  }

  // validates the log entry
  private validateLogEntry() {
    if (!this.logEntry.sensor) {
      throw new ValidationError('Log entry sensor name is required');
    }
    if (
      typeof this.logEntry.value !== 'number' ||
      Number.isNaN(this.logEntry.value)
    ) {
      throw new ValidationError('Log entry value must be a valid number');
    }
    if (!this.logEntry.unit) {
      throw new ValidationError('Log entry unit is required');
    }
    if (!unitEnum.includes(this.logEntry.unit)) {
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
  private async persistLogEntry(logEntry: LogEntry, tx?: typeof db) {
    const dbToUse = tx || db;
    await dbToUse.insert(readings).values(logEntry);
  }

  // sends the exceedance notifications
  private async sendExceedanceNotifications() {
    const sendExceedanceNotification = new SendExceedanceNotification(this.logEntry);
    sendExceedanceNotification.execute();
  }
}
