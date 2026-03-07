import { LogEntry } from './saveLogRecord';

export class SendExceedanceNotification {
  constructor(private readonly logEntry: LogEntry) {

  }

  async execute() {
    this.checkPeriod()
  }

  private async checkPeriod() {
    const l = this.logEntry
    
    // call db limits table

    // todo: if period exceeds range or threshold, send notification
    if (false) {
      this.sendNotification()
    }
  }

  private async sendNotification() {

  }
}