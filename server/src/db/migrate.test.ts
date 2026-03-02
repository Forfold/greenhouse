import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { readings } from './schema'
import path from 'path'

const skip = !process.env.DATABASE_URL

describe.skipIf(skip)('database migrations', () => {
  let pool: mysql.Pool
  let db: ReturnType<typeof drizzle>

  beforeAll(async () => {
    pool = mysql.createPool(process.env.DATABASE_URL!)
    db = drizzle(pool, { schema: { readings }, mode: 'default' })
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') })
  })

  afterAll(async () => {
    await pool.end()
  })

  it('runs migrations without error', () => {
    // if beforeAll didn't throw, migrations succeeded
    expect(true).toBe(true)
  })

  it('inserts and retrieves a reading', async () => {
    await db.insert(readings).values({
      board: 'temp',
      sensor: 'sensor1',
      tempF: 72.5,
      humidity: 45.2,
    })

    const rows = await db.select().from(readings)
    const row = rows.find(r => r.board === 'temp' && r.sensor === 'sensor1')
    expect(row).toBeDefined()
    expect(row!.tempF).toBe(72.5)
    expect(row!.humidity).toBe(45.2)
  })
})
