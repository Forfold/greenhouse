import { mysqlTable, int, double, varchar, bigint } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const readings = mysqlTable('readings', {
  id:         int('id').primaryKey().autoincrement(),
  board:      varchar('board', { length: 50 }).notNull(),
  sensor:     varchar('sensor', { length: 50 }).notNull(),
  tempF:      double('temp_f').notNull(),
  humidity:   double('humidity').notNull(),
  recordedAt: bigint('recorded_at', { mode: 'number' }).notNull().default(sql`(UNIX_TIMESTAMP())`),
})

export type Reading = typeof readings.$inferSelect
export type NewReading = typeof readings.$inferInsert
