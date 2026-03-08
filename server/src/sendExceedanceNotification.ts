import { Resend } from 'resend';
import { LimitManager } from './limitManager';
import type { LogEntry } from './saveLogRecord';

export class SendExceedanceNotification {
  constructor(private readonly logEntry: LogEntry) {}

  async execute() {
    await this.checkPeriod();
  }

  private async checkPeriod() {
    const log = this.logEntry;
    const lm = new LimitManager(log);

    // a log could have more than 1 limit associated with it
    // e.g. yearly quota and up to daily alert for same unit
    const limits = await lm.getLimitsForLog();
    const limitWindows = await lm.getLimitWindowsForLogLimits(limits);

    const windowsByLimitID = Object.fromEntries(
      limitWindows.map((w) => [w.limitID, w]),
    );

    for (const limit of limits) {
      const window = windowsByLimitID[limit.id];

      const ok = await lm.checkLogWithinLimitAndWindow(limit, window);
      if (!ok) {
        // this.sendNotification();
      }
    }
  }

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: <stub>
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
