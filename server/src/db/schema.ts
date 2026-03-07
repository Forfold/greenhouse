import { mysqlTable, char, double, varchar, datetime } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const config = mysqlTable('config', {
  id:   char('id', { length: 36 }).primaryKey(),
  readingName: varchar('reading_name', { length: 50 }).notNull(),
  default_unit: varchar('default_unit', { length: 50 }).notNull(),
})

export type Config = typeof config.$inferSelect
export type NewConfig = typeof config.$inferInsert

export const readings = mysqlTable('readings', {
  id:          char('id', { length: 36 }).primaryKey(),
  sensor:      varchar('sensor', { length: 50 }).notNull(),
  configID:    char('config_id', { length: 36 }).references(() => config.id).notNull(),
  value:       double('value').notNull(),
  unit:        varchar('unit', { length: 50 }).notNull(),
  recordedAt:  datetime('recorded_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Reading = typeof readings.$inferSelect
export type NewReading = typeof readings.$inferInsert
