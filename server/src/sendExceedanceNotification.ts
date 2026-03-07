import { LogEntry } from './saveLogRecord'

// todo: need cleanup of old limit_windows
export class SendExceedanceNotification {
  constructor (private readonly logEntry: LogEntry) {}

  async execute () {
    this.checkPeriod()
  }

  private async checkPeriod () {
    const l = this.logEntry

    // todo: make new LimitManager() with the following:
    //   todo: function to call db limits table, returning limit info for current log
    //   todo: function to update limit_window for current log entry as necessary
    //   todo: function to check log against its limit and current limit_window
    //          (handling rate vs threshold appropriately)

    // todo: check log value against limitManager.checkLimit
    // which if failed, will notify if limit condition met and
    // limit hasn't yet been triggered for the period
    if (!l.configID) {
      this.sendNotification()
    }
  }

  private async sendNotification () {
    // get email address from .env -> EMAIL
    // todo: send email to config value
    //   notifying of limit exceeded as subject
    //   body is subject again then log entry information
  }
}
