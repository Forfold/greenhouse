import type { Limit, LimitWindow } from './db/schema';
import type { LogEntry } from './saveLogRecord';

// note: might not need all the params in the current stubs, remove as needed
export class LimitManager {
  constructor(private readonly logEntry: LogEntry) {}
  // todo: need function to cleanup old limit_windows

  async getLimit(log: LogEntry): Promise<Limit> {
    // todo: get limit from db

    return {
      configID: log.configID, // stub
    } as Limit;
  }

  async getLimitWindow(log: LogEntry, limit: Limit): Promise<LimitWindow> {
    // todo: get limit window from db

    return {
      limitID: limit.id, // stub
    } as LimitWindow;
  }

  // assertLog checks if the log value fails limit condition (e.g. temp > 100F within an hour)
  async checkLogLimitAndWindow(
    log: LogEntry,
    limit: Limit,
    window: LimitWindow,
  ): Promise<boolean> {
    // todo: check log against its limit and current limit_window
    // handling rate vs threshold appropriately
    return false;
  }

  async updateLimitWindow(log: LogEntry, limit: Limit, window: LimitWindow) {
    // todo: update limit_window in db for current log entry
  }
}
