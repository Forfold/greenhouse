import { Resend } from "resend";
import type { Limit } from "./db/schema";
import { LimitManager } from "./limitManager";
import type { LogEntry } from "./saveLogRecord";

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
			let window = await lm.ensureLimitWindow(
				limit,
				windowsByLimitID[limit.id],
			);
			window = await lm.advanceWindowIfExpired(limit, window);

			const exceeded = await lm.checkLogWithinLimitAndWindow(limit, window);
			if (exceeded) {
				await lm.markWindowTriggered(window);
				await this.sendNotification(limit);
			}
		}
	}

	private async sendNotification(limit: Limit) {
		const email = process.env.EMAIL;
		if (!email) {
			throw new Error("EMAIL not set in environment");
		}

		const resendKey = process.env.RESEND_API_KEY;
		if (!resendKey) {
			throw new Error("RESEND_API_KEY not set in environment");
		}

		const log = this.logEntry;
		const directionLabel =
			limit.direction === "above" || limit.direction === "increase"
				? "exceeded"
				: "dropped below";

		const subject = `Greenhouse Alert: ${log.sensor} ${directionLabel} ${limit.limitValue} ${limit.limitUnit}`;
		const html = `
      <h2>Greenhouse Limit Alert</h2>
      <p>Sensor <strong>${log.sensor}</strong> has ${directionLabel} its configured limit.</p>
      <table>
        <tr><td><strong>Sensor</strong></td><td>${log.sensor}</td></tr>
        <tr><td><strong>Reading</strong></td><td>${log.value} ${log.unit}</td></tr>
        <tr><td><strong>Limit</strong></td><td>${limit.limitValue} ${limit.limitUnit}</td></tr>
        <tr><td><strong>Limit type</strong></td><td>${limit.type} (${limit.direction})</td></tr>
        <tr><td><strong>Period</strong></td><td>${limit.periodCount} ${limit.period}(s)</td></tr>
        <tr><td><strong>Recorded at</strong></td><td>${log.recordedAt.toISOString()}</td></tr>
      </table>
    `;

		const resend: Resend = new Resend(resendKey);
		await resend.emails.send({
			from: "alerts@forfold.com",
			to: email,
			subject,
			html,
		});
	}
}
