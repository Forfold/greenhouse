import express from 'express'
import { db } from './db/index'
import { runMigrations } from './db/migrate'
import { readings } from './db/schema'
import { desc } from 'drizzle-orm'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3000

// POST /readings
// Body: { board, sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
app.post('/readings', async (req, res) => {
  const { board, sensor1, sensor2 } = req.body

  if (!board || !sensor1 || !sensor2) {
    res.status(400).json({ error: 'missing fields' })
    return
  }

  await db.transaction(async (tx) => {
    await tx.insert(readings).values({ board, sensor: 'sensor1', tempF: sensor1.tempF, humidity: sensor1.humidity })
    await tx.insert(readings).values({ board, sensor: 'sensor2', tempF: sensor2.tempF, humidity: sensor2.humidity })
  })

  res.json({ ok: true })
})

// GET /readings?limit=100
app.get('/readings', async (_req, res) => {
  const rows = await db.select().from(readings).orderBy(desc(readings.recordedAt)).limit(100)
  res.json(rows)
})

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`greenhouse server running on :${PORT}`)
  })
})
