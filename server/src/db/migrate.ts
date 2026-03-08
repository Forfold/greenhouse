import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from './index';
import path from 'path';

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
  console.log('migrations up to date');
}
