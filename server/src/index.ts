import express from 'express'
import { randomUUID } from 'crypto'
import { db } from './db/index'
import { runMigrations } from './db/migrate'
import { readings, config } from './db/schema'
import { desc } from 'drizzle-orm'
import { SaveLogRecord, ValidationError } from './saveLogRecord'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3000
const API_KEY = process.env.API_KEY

if (!API_KEY) {
  console.error('ERROR: API_KEY environment variable is not set')
  process.exit(1)
}

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-api-key'] !== API_KEY) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  next()
}

type Config = Record<string, {
  id: string;
  readingName: string;
  defaultUnit: string;
}>

let appConfig: Config

async function loadConfig(): Promise<Config> {
  const configs = await db.select().from(config)
  const temp = configs.find(c => c.readingName === 'temperature')
  const humidity = configs.find(c => c.readingName === 'humidity')
  if (!temp || !humidity) throw new Error('Missing config rows for temperature/humidity')

  return { temperature: temp, humidity: humidity }
}

// POST /readings
// Body: { sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
// Header: x-api-key: <API_KEY>
app.post('/readings', requireApiKey, async (req, res) => {
  const { sensor1, sensor2 } = req.body
  const now = new Date()
  const entries = [
    { id: randomUUID(), configID: appConfig.temperature.id, sensor: 'sensor1', value: sensor1.tempF,    unit: 'fahrenheit', recordedAt: now },
    { id: randomUUID(), configID: appConfig.humidity.id,    sensor: 'sensor1', value: sensor1.humidity, unit: 'percentage',  recordedAt: now },
    { id: randomUUID(), configID: appConfig.temperature.id, sensor: 'sensor2', value: sensor2.tempF,    unit: 'fahrenheit', recordedAt: now },
    { id: randomUUID(), configID: appConfig.humidity.id,    sensor: 'sensor2', value: sensor2.humidity, unit: 'percentage',  recordedAt: now },
  ]

  try {
    for (const entry of entries) {
      await new SaveLogRecord(entry).execute()
    }
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'internal server error' })
    }
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
