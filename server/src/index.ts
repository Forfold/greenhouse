import express from 'express'
import { db } from './db/index'
import { runMigrations } from './db/migrate'
import { readings } from './db/schema'
import { desc } from 'drizzle-orm'

runMigrations()

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3000

// POST /readings
// Body: { board, sensor1: { tempF, humidity }, sensor2: { tempF, humidity } }
app.post('/readings', (req, res) => {
  const { board, sensor1, sensor2 } = req.body

  if (!board || !sensor1 || !sensor2) {
    res.status(400).json({ error: 'missing fields' })
    return
  }

  db.transaction((tx) => {
    tx.insert(readings).values({ board, sensor: 'sensor1', tempF: sensor1.tempF, humidity: sensor1.humidity }).run()
    tx.insert(readings).values({ board, sensor: 'sensor2', tempF: sensor2.tempF, humidity: sensor2.humidity }).run()
  })

  res.json({ ok: true })
})

// GET /readings?limit=100
app.get('/readings', (_req, res) => {
  const rows = db.select().from(readings).orderBy(desc(readings.recordedAt)).limit(100).all()
  res.json(rows)
})

app.listen(PORT, () => {
  console.log(`greenhouse server running on :${PORT}`)
})
