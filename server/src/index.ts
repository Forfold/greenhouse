import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import express from "express";
import { db } from "./db/index";
import { runMigrations } from "./db/migrate";
import { config, limits, type NewLimit, readings, unitEnum } from "./db/schema";
import { type LogEntry, SaveLogRecord, ValidationError } from "./saveLogRecord";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
	console.error("ERROR: API_KEY environment variable is not set");
	process.exit(1);
}

function requireApiKey(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) {
	if (req.headers["x-api-key"] !== API_KEY) {
		res.status(401).json({ error: "unauthorized" });
		return;
	}
	next();
}

type Config = Record<
	string,
	{
		id: string;
		readingName: string;
		defaultUnit: LogEntry["unit"];
	}
>;

let appConfig: Config;

async function loadConfig(): Promise<Config> {
	const configs = await db.select().from(config);
	const temp = configs.find((c) => c.readingName === "temperature");
	const humidity = configs.find((c) => c.readingName === "humidity");
	if (!temp || !humidity)
		throw new Error("Missing config rows for temperature/humidity");

	return { temperature: temp, humidity };
}

// POST /readings
// Body: { sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
// Header: x-api-key: <API_KEY>
app.post("/readings", requireApiKey, async (req, res) => {
	const { sensor1, sensor2 } = req.body;

	if (!sensor1 || !sensor2) {
		return res.status(400).json({ error: "sensor1 and sensor2 are required" });
	}

	const now = new Date();
	const entries: LogEntry[] = [
		{
			id: randomUUID(),
			configID: appConfig.temperature.id,
			sensor: "sensor1",
			value: sensor1.tempF,
			unit: "fahrenheit",
			recordedAt: now,
		},
		{
			id: randomUUID(),
			configID: appConfig.humidity.id,
			sensor: "sensor1",
			value: sensor1.humidity,
			unit: "percentage",
			recordedAt: now,
		},
		{
			id: randomUUID(),
			configID: appConfig.temperature.id,
			sensor: "sensor2",
			value: sensor2.tempF,
			unit: "fahrenheit",
			recordedAt: now,
		},
		{
			id: randomUUID(),
			configID: appConfig.humidity.id,
			sensor: "sensor2",
			value: sensor2.humidity,
			unit: "percentage",
			recordedAt: now,
		},
	];

	try {
		const logRecordEntries = entries.map((entry) => new SaveLogRecord(entry));
		await db.transaction(async (tx) => {
			for (const logRecord of logRecordEntries) {
				await logRecord.execute(tx);
			}
		});
		for (const logRecord of logRecordEntries) {
			await logRecord.sendNotifications();
		}
		res.json({ ok: true });
	} catch (err) {
		if (err instanceof ValidationError) {
			res.status(400).json({ error: err.message });
		} else {
			console.error("Database error:", err);
			res.status(500).json({ error: "internal server error" });
		}
	}
});

// POST /limits
// Body: { configID, limitValue, limitUnit, period, periodCount?, type, direction }
const VALID_PERIODS = ["minute", "hour", "day", "month", "year"] as const;
const VALID_TYPES = ["threshold", "rate"] as const;
const VALID_DIRECTIONS = ["above", "below", "increase", "decrease"] as const;

app.post("/limits", requireApiKey, async (req, res) => {
	const {
		configID,
		limitValue,
		limitUnit,
		period,
		periodCount,
		type,
		direction,
	} = req.body;

	if (
		!configID ||
		typeof limitValue !== "number" ||
		!Number.isFinite(limitValue) ||
		!limitUnit ||
		!period ||
		!type ||
		!direction
	) {
		return res.status(400).json({
			error:
				"configID, limitValue, limitUnit, period, type, and direction are required",
		});
	}
	if (!unitEnum.includes(limitUnit))
		return res
			.status(400)
			.json({ error: `limitUnit must be one of: ${unitEnum.join(", ")}` });
	if (!VALID_PERIODS.includes(period))
		return res
			.status(400)
			.json({ error: `period must be one of: ${VALID_PERIODS.join(", ")}` });
	if (!VALID_TYPES.includes(type))
		return res
			.status(400)
			.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
	if (!VALID_DIRECTIONS.includes(direction))
		return res.status(400).json({
			error: `direction must be one of: ${VALID_DIRECTIONS.join(", ")}`,
		});

	if (
		periodCount !== undefined &&
		(!Number.isInteger(periodCount) || periodCount < 1)
	)
		return res
			.status(400)
			.json({ error: "periodCount must be a positive integer" });

	if (
		type === "threshold" &&
		(direction === "increase" || direction === "decrease")
	)
		return res
			.status(400)
			.json({ error: "threshold limits must use above or below direction" });
	if (type === "rate" && (direction === "above" || direction === "below"))
		return res
			.status(400)
			.json({ error: "rate limits must use increase or decrease direction" });

	try {
		const id = randomUUID();
		await db.insert(limits).values({
			id,
			configID,
			limitValue,
			limitUnit,
			period,
			periodCount: periodCount ?? 1,
			type,
			direction,
		});
		res.status(201).json({ id });
	} catch (err) {
		console.error("Database error:", err);
		res.status(500).json({ error: "internal server error" });
	}
});

// PATCH /limits/:id
// Body: any subset of { limitValue, limitUnit, period, periodCount, type, direction }
app.patch("/limits/:id", requireApiKey, async (req, res) => {
	const update: Partial<NewLimit> = {};
	if (req.body.limitUnit !== undefined) {
		if (!unitEnum.includes(req.body.limitUnit))
			return res
				.status(400)
				.json({ error: `limitUnit must be one of: ${unitEnum.join(", ")}` });
		update.limitUnit = req.body.limitUnit;
	}
	if (req.body.limitValue !== undefined) {
		if (
			typeof req.body.limitValue !== "number" ||
			!Number.isFinite(req.body.limitValue)
		)
			return res
				.status(400)
				.json({ error: "limitValue must be a finite number" });
		update.limitValue = req.body.limitValue;
	}
	if (req.body.period !== undefined) {
		if (!VALID_PERIODS.includes(req.body.period))
			return res
				.status(400)
				.json({ error: `period must be one of: ${VALID_PERIODS.join(", ")}` });
		update.period = req.body.period;
	}
	if (req.body.periodCount !== undefined) {
		if (!Number.isInteger(req.body.periodCount) || req.body.periodCount < 1)
			return res
				.status(400)
				.json({ error: "periodCount must be a positive integer" });
		update.periodCount = req.body.periodCount;
	}
	if (req.body.type !== undefined) {
		if (!VALID_TYPES.includes(req.body.type))
			return res
				.status(400)
				.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
		update.type = req.body.type;
	}
	if (req.body.direction !== undefined) {
		if (!VALID_DIRECTIONS.includes(req.body.direction))
			return res.status(400).json({
				error: `direction must be one of: ${VALID_DIRECTIONS.join(", ")}`,
			});
		update.direction = req.body.direction;
	}

	if (Object.keys(update).length === 0) {
		return res.status(400).json({ error: "no fields to update" });
	}

	try {
		// When only one of type/direction is being changed, fetch the existing row
		// so we can validate the final (merged) type+direction combination.
		let effectiveType = update.type;
		let effectiveDirection = update.direction;
		if (effectiveType === undefined || effectiveDirection === undefined) {
			const [existing] = await db
				.select()
				.from(limits)
				.where(eq(limits.id, req.params.id));
			if (!existing) return res.status(404).json({ error: "limit not found" });
			effectiveType ??= existing.type;
			effectiveDirection ??= existing.direction;
		}
		if (
			effectiveType === "threshold" &&
			(effectiveDirection === "increase" || effectiveDirection === "decrease")
		)
			return res
				.status(400)
				.json({ error: "threshold limits must use above or below direction" });
		if (
			effectiveType === "rate" &&
			(effectiveDirection === "above" || effectiveDirection === "below")
		)
			return res
				.status(400)
				.json({ error: "rate limits must use increase or decrease direction" });

		const [result] = await db
			.update(limits)
			.set(update)
			.where(eq(limits.id, req.params.id));
		if (result.affectedRows === 0)
			return res.status(404).json({ error: "limit not found" });
		res.json({ ok: true });
	} catch (err) {
		console.error("Database error:", err);
		res.status(500).json({ error: "internal server error" });
	}
});

// GET /readings?limit=100
app.get("/readings", async (req, res) => {
	const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 1000);
	const rows = await db
		.select()
		.from(readings)
		.orderBy(desc(readings.recordedAt))
		.limit(limit);
	res.json(rows);
});

runMigrations()
	.then(loadConfig)
	.then((cfg) => {
		appConfig = cfg;
	})
	.then(() => {
		app.listen(PORT, () => {
			console.log(`greenhouse server running on :${PORT}`);
		});
	})
	.catch((err) => {
		console.error("Failed to start server:", err);
		process.exit(1);
	});
