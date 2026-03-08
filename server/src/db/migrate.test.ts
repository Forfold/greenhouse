import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config, readings } from './schema';

const skip = !process.env.DATABASE_URL;

describe.skipIf(skip)('database migrations', () => {
  let pool: mysql.Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = mysql.createPool(url);
    db = drizzle(pool, { schema: { readings, config }, mode: 'default' });
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('runs migrations without error', () => {
    // if beforeAll didn't throw, migrations succeeded
    expect(true).toBe(true);
  });

  it('inserts and retrieves a reading', async () => {
    const configs = await db.select().from(config);
    const tempConfig = configs.find((c) => c.readingName === 'temperature');
    const humidityConfig = configs.find((c) => c.readingName === 'humidity');
    if (!tempConfig || !humidityConfig) throw new Error('Seed config missing');

    const tempId = randomUUID();
    const humidityId = randomUUID();
    const now = new Date();

    await db.insert(readings).values([
      {
        id: tempId,
        sensor: 'sensor1',
        configID: tempConfig.id,
        value: 72.5,
        unit: 'fahrenheit',
        recordedAt: now,
      },
      {
        id: humidityId,
        sensor: 'sensor1',
        configID: humidityConfig.id,
        value: 45.2,
        unit: 'percentage',
        recordedAt: now,
      },
    ]);

    const rows = await db
      .select()
      .from(readings)
      .where(eq(readings.sensor, 'sensor1'));
    expect(rows).toHaveLength(2);

    const tempRow = rows.find((r) => r.id === tempId);
    const humidityRow = rows.find((r) => r.id === humidityId);

    if (!tempRow || !humidityRow) throw new Error('Inserted rows not found');

    expect(tempRow.value).toBe(72.5);
    expect(tempRow.unit).toBe('fahrenheit');

    expect(humidityRow.value).toBe(45.2);
    expect(humidityRow.unit).toBe('percentage');
  });
});
