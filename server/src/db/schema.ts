import { mysqlTable, char, double, varchar, datetime, mysqlEnum, int, uniqueIndex } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const config = mysqlTable('config', {
  id:   char('id', { length: 36 }).primaryKey(),
  readingName: varchar('reading_name', { length: 50 }).notNull(),
  defaultUnit: varchar('default_unit', { length: 50 }).notNull(),
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

export const limits = mysqlTable('limits', {
  id:          char('id', { length: 36 }).primaryKey(),
  configID:    char('config_id', { length: 36 }).references(() => config.id).notNull(),
  limitValue:  double('limit_value').notNull(),
  limitUnit:   varchar('limit_unit', { length: 50 }).notNull(),
  period:      mysqlEnum('period', ['minute', 'hour', 'day', 'month', 'year']).notNull(),
  periodCount: int('period_count').notNull().default(1),
  
  type: mysqlEnum('type', ['threshold', 'rate']).notNull(), // e.g. [temp over 99F[] or [a change in > 10F within a minute]
  direction: mysqlEnum('direction', ['above', 'below', 'increase', 'decrease']).notNull(),
})

export type Limit = typeof limits.$inferSelect
export type NewLimit = typeof limits.$inferInsert

export const limitWindows = mysqlTable('limit_windows', {
  id:             char('id', { length: 36 }).primaryKey(),
  limitID:        char('limit_id', { length: 36 }).references(() => limits.id).notNull(),
  periodStart:    datetime('period_start').notNull(),
  triggeredAt:    datetime('triggered_at'),        // null = not yet triggered; set to avoid re-notifying
}, (t) => ({
  limitIDIdx: uniqueIndex('limit_id_idx').on(t.limitID),
}))

export type LimitWindow = typeof limitWindows.$inferSelect
export type NewLimitWindow = typeof limitWindows.$inferInsert