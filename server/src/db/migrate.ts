import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';
import { db } from './index';

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
  console.log('migrations up to date');
}
