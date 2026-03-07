import { LogEntry } from './saveLogRecord';

export class SendExceedanceNotification {
  constructor(private readonly logEntry: LogEntry) {

  }

  async execute() {
    this.checkPeriod()
  }

  private async checkPeriod() {
    const l = this.logEntry
    
    // todo: call db limits table, getting limit info for current log
    // todo: check log value against limit condition
    // todo: if period fails condition, send notification
    if (false) {
      this.sendNotification()
    }
  }

  private async sendNotification() {

  }
}