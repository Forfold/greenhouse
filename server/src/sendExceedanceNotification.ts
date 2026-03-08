import { Resend } from 'resend';
import { LimitManager } from './limitManager';
import type { LogEntry } from './saveLogRecord';

export class SendExceedanceNotification {
  constructor(private readonly logEntry: LogEntry) {}

  async execute() {
    await this.checkPeriod();
  }

  private async checkPeriod() {
    const l = this.logEntry;
    const lm = new LimitManager(l);
    const lim = await lm.getLimit(l);
    const lw = await lm.getLimitWindow(l, lim);

    if (await lm.checkLogLimitAndWindow(l, lim, lw)) {
      this.sendNotification();
    }
  }

  private async sendNotification() {
    const email = process.env.EMAIL;
    if (!email) {
      throw new Error('EMAIL not set in environment');
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not set in environment');
    }

    const resend: Resend = new Resend(resendKey);
    resend.emails.send({
      from: 'alerts@forfold.com',
      to: email,
      // todo: subject is limit exceeded string
      subject: 'Hello World',
      // todo: include subject string + log entry info
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
    });
  }
}
