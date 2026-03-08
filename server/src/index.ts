import express from 'express'
import { randomUUID } from 'crypto'
import { db } from './db/index'
import { runMigrations } from './db/migrate'
import { readings, config, limits, NewLimit, unitEnum } from './db/schema'
import { desc, eq } from 'drizzle-orm'
import { SaveLogRecord, ValidationError, LogEntry } from './saveLogRecord'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3000
const API_KEY = process.env.API_KEY

if (!API_KEY) {
  console.error('ERROR: API_KEY environment variable is not set')
  process.exit(1)
}

function requireApiKey (req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-api-key'] !== API_KEY) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  next()
}

type Config = Record<string, {
  id: string;
  readingName: string;
  defaultUnit: LogEntry['unit'];
}>

let appConfig: Config

async function loadConfig (): Promise<Config> {
  const configs = await db.select().from(config)
  const temp = configs.find(c => c.readingName === 'temperature')
  const humidity = configs.find(c => c.readingName === 'humidity')
  if (!temp || !humidity) throw new Error('Missing config rows for temperature/humidity')

  return { temperature: temp, humidity }
}

// POST /readings
// Body: { sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
// Header: x-api-key: <API_KEY>
app.post('/readings', requireApiKey, async (req, res) => {
  const { sensor1, sensor2 } = req.body

  // Validate input
  if (!sensor1 || !sensor2) {
    return res.status(400).json({ error: 'sensor1 and sensor2 are required' })
  }
  if (typeof sensor1.tempF !== 'number' || typeof sensor1.humidity !== 'number' ||
      typeof sensor2.tempF !== 'number' || typeof sensor2.humidity !== 'number') {
    return res.status(400).json({ error: 'tempF and humidity must be numbers' })
  }

  const now = new Date()
  const entries: LogEntry[] = [
    { id: randomUUID(), configID: appConfig.temperature.id, sensor: 'sensor1', value: sensor1.tempF, unit: 'fahrenheit', recordedAt: now },
    { id: randomUUID(), configID: appConfig.humidity.id, sensor: 'sensor1', value: sensor1.humidity, unit: 'percentage', recordedAt: now },
    { id: randomUUID(), configID: appConfig.temperature.id, sensor: 'sensor2', value: sensor2.tempF, unit: 'fahrenheit', recordedAt: now },
    { id: randomUUID(), configID: appConfig.humidity.id, sensor: 'sensor2', value: sensor2.humidity, unit: 'percentage', recordedAt: now },
  ]

  try {
    await db.transaction(async (tx) => {
      for (const entry of entries) {
        const recorder = new SaveLogRecord(entry)
        await recorder.execute(tx)
      }
    })
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message })
    } else {
      console.error('Database error:', err)
      res.status(500).json({ error: 'internal server error' })
    }
  }
})

// POST /limits
// Body: { configID, limitValue, limitUnit, period, periodCount?, type, direction }
const VALID_PERIODS = ['minute', 'hour', 'day', 'month', 'year'] as const
const VALID_TYPES = ['threshold', 'rate'] as const
const VALID_DIRECTIONS = ['above', 'below', 'increase', 'decrease'] as const

app.post('/limits', requireApiKey, async (req, res) => {
  const { configID, limitValue, limitUnit, period, periodCount, type, direction } = req.body

  if (!configID || typeof limitValue !== 'number' || !limitUnit || !period || !type || !direction) {
    return res.status(400).json({ error: 'configID, limitValue, limitUnit, period, type, and direction are required' })
  }
  if (!unitEnum.includes(limitUnit)) return res.status(400).json({ error: `limitUnit must be one of: ${unitEnum.join(', ')}` })
  if (!VALID_PERIODS.includes(period)) return res.status(400).json({ error: `period must be one of: ${VALID_PERIODS.join(', ')}` })
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` })
  if (!VALID_DIRECTIONS.includes(direction)) return res.status(400).json({ error: `direction must be one of: ${VALID_DIRECTIONS.join(', ')}` })

  // todo: validate threshold with above/below and rate with increase/decrease

  try {
    const id = randomUUID()
    await db.insert(limits).values({ id, configID, limitValue, limitUnit, period, periodCount: periodCount ?? 1, type, direction })
    res.status(201).json({ id })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ error: 'internal server error' })
  }
})

// PATCH /limits/:id
// Body: any subset of { limitValue, limitUnit, period, periodCount, type, direction }
app.patch('/limits/:id', requireApiKey, async (req, res) => {
  const update: Partial<NewLimit> = {}
  if (req.body.limitValue !== undefined) update.limitValue = req.body.limitValue
  if (req.body.limitUnit !== undefined) {
    if (!unitEnum.includes(req.body.limitUnit)) return res.status(400).json({ error: `limitUnit must be one of: ${unitEnum.join(', ')}` })
    update.limitUnit = req.body.limitUnit
  }
  if (req.body.period !== undefined) update.period = req.body.period
  if (req.body.periodCount !== undefined) update.periodCount = req.body.periodCount
  if (req.body.type !== undefined) update.type = req.body.type
  if (req.body.direction !== undefined) update.direction = req.body.direction

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'no fields to update' })
  }

  try {
    await db.update(limits).set(update).where(eq(limits.id, req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ error: 'internal server error' })
  }
})

// GET /readings?limit=100
app.get('/readings', async (_req, res) => {
  const rows = await db.select().from(readings).orderBy(desc(readings.recordedAt)).limit(100)
  res.json(rows)
})

runMigrations()
  .then(loadConfig)
  .then(cfg => { appConfig = cfg })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`greenhouse server running on :${PORT}`)
    })
  })
