import express from 'express'
import { randomUUID } from 'crypto'
import { db } from './db/index'
import { runMigrations } from './db/migrate'
import { readings, config } from './db/schema'
import { desc } from 'drizzle-orm'

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

let tempConfigId: string
let humidityConfigId: string

async function loadConfig() {
  const configs = await db.select().from(config)
  const temp = configs.find(c => c.readingName === 'temperature')
  const humidity = configs.find(c => c.readingName === 'humidity')
  if (!temp || !humidity) throw new Error('Missing config rows for temperature/humidity')
  tempConfigId = temp.id
  humidityConfigId = humidity.id
}

// POST /readings
// Body: { sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
// Header: x-api-key: <API_KEY>
app.post('/readings', requireApiKey, async (req, res) => {
  const { sensor1, sensor2 } = req.body

  if (!sensor1 || !sensor2) {
    res.status(400).json({ error: 'sensor name missing' })
    return
  }

  await db.transaction(async (tx) => {
    await tx.insert(readings).values([
      { id: randomUUID(), configID: tempConfigId,     sensor: 'sensor1', value: sensor1.tempF,    unit: 'fahrenheit' },
      { id: randomUUID(), configID: humidityConfigId, sensor: 'sensor1', value: sensor1.humidity, unit: 'percentage' },
      { id: randomUUID(), configID: tempConfigId,     sensor: 'sensor2', value: sensor2.tempF,    unit: 'fahrenheit' },
      { id: randomUUID(), configID: humidityConfigId, sensor: 'sensor2', value: sensor2.humidity, unit: 'percentage' },
    ])
  })

  res.json({ ok: true })
})

// GET /readings?limit=100
app.get('/readings', async (_req, res) => {
  const rows = await db.select().from(readings).orderBy(desc(readings.recordedAt)).limit(100)
  res.json(rows)
})

runMigrations()
  .then(loadConfig)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`greenhouse server running on :${PORT}`)
    })
  })
