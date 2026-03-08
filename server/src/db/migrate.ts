import path from 'node:path';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from './index';

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
  console.log('migrations up to date');
}
