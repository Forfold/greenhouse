import { LogEntry } from './saveLogRecord'

// todo: need cleanup of old limit_windows
export class SendExceedanceNotification {
  constructor (private readonly logEntry: LogEntry) {

  }

  async execute () {
    this.checkPeriod()
  }

  private async checkPeriod () {
    const l = this.logEntry

    // todo: call db limits table, getting limit info for current log
    // todo: check log value against limit condition    // todo: if period fails condition, send notification
    if (!l.configID) {
      // todo: check against limit_windows
      //   if window already met (triggered_at set), don't notify
      this.sendNotification()
    }
  }

  private async sendNotification () {
    // todo: send email to config value
    //   notifying of limit exceeded as subject
    //   body is subject again then log entry information
  }
}
