import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Works with any Postgres: Neon, Supabase, RDS, a local docker container.
 * When DATABASE_URL is missing we never get here, the store falls back to
 * in-memory demo data instead. See lib/store.ts.
 */
let _db: PostgresJsDatabase<typeof schema> | null = null;

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _db = drizzle(postgres(url, { prepare: false }), { schema });
  }
  return _db;
}
