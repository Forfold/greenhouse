import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { describe, it, expect, beforeEach } from 'vitest'
import { readings } from './schema'
import path from 'path'

function makeTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema: { readings } })
  migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') })
  return db
}

describe('migrations', () => {
  it('runs without error on a fresh db', () => {
    expect(() => makeTestDb()).not.toThrow()
  })

  it('creates the readings table', () => {
    const db = makeTestDb()
    const result = db.select().from(readings).all()
    expect(result).toEqual([])
  })

  it('inserts and retrieves a reading', () => {
    const db = makeTestDb()
    db.insert(readings).values({
      board: 'temp',
      sensor: 'sensor1',
      tempF: 72.5,
      humidity: 45.2,
    }).run()

    const [row] = db.select().from(readings).all()
    expect(row.board).toBe('temp')
    expect(row.sensor).toBe('sensor1')
    expect(row.tempF).toBe(72.5)
    expect(row.humidity).toBe(45.2)
    expect(row.recordedAt).toBeTypeOf('number')
  })
})
