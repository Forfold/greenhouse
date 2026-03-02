import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const readings = sqliteTable('readings', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  board:      text('board').notNull(),
  sensor:     text('sensor').notNull(),
  tempF:      real('temp_f').notNull(),
  humidity:   real('humidity').notNull(),
  recordedAt: integer('recorded_at').notNull().default(sql`(unixepoch())`),
})

export type Reading = typeof readings.$inferSelect
export type NewReading = typeof readings.$inferInsert
