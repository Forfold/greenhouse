import { mysqlTable, char, double, varchar, datetime } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const readings = mysqlTable('readings', {
  id:         char('id', { length: 36 }).primaryKey(),
  board:      varchar('board', { length: 50 }).notNull(),
  sensor:     varchar('sensor', { length: 50 }).notNull(),
  tempF:      double('temp_f').notNull(),
  humidity:   double('humidity').notNull(),
  recordedAt: datetime('recorded_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Reading = typeof readings.$inferSelect
export type NewReading = typeof readings.$inferInsert
