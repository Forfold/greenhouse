import { db } from "./db";
import { readings, unitEnum } from "./db/schema";
import { SendExceedanceNotification } from "./sendExceedanceNotification";
import { THIRTY_DAYS_IN_MILLISECONDS } from "./utils";

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
	}

	async sendNotifications() {
		await this.sendExceedanceNotifications();
	}

	// validates the log entry
	private validateLogEntry() {
		if (!this.logEntry.configID) {
			throw new ValidationError("Log entry configID is required");
		}
		if (!this.logEntry.sensor) {
			throw new ValidationError("Log entry sensor name is required");
		}
		if (
			typeof this.logEntry.value !== "number" ||
			!Number.isFinite(this.logEntry.value)
		) {
			// covers NaN, Infinity, and -Infinity as invalid numbers as well
			throw new ValidationError("Log entry value must be a finite number");
		}
		if (!this.logEntry.unit) {
			throw new ValidationError("Log entry unit is required");
		}
		if (!unitEnum.includes(this.logEntry.unit)) {
			throw new ValidationError("Log entry unit is not supported");
		}
		if (!this.logEntry.recordedAt) {
			throw new ValidationError("Log entry date is required");
		}
		if (this.logEntry.recordedAt.getTime() > Date.now()) {
			throw new ValidationError("Log entry date is in the future");
		}
		if (
			this.logEntry.recordedAt.getTime() <
			Date.now() - THIRTY_DAYS_IN_MILLISECONDS
		) {
			throw new ValidationError("Log entry date is too old");
		}

		// note: let notification system handle high values - could be a real system issue
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
		const sendExceedanceNotification = new SendExceedanceNotification(
			this.logEntry,
		);
		await sendExceedanceNotification.execute();
	}
}
