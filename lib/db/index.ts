import postgres from 'postgres';

/**
 * Works with any Postgres: Neon, Supabase, RDS, a local docker container.
 * When DATABASE_URL is missing we never get here, the store falls back to
 * in-memory demo data instead. See lib/store.ts.
 *
 * `transform: postgres.camel` maps snake_case columns to the camelCase fields
 * in lib/db/types.ts, both when reading rows and when passing objects to
 * inserts and updates.
 */
let _sql: postgres.Sql | null = null;

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);

export function getSql(): postgres.Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _sql = postgres(url, { prepare: false, transform: postgres.camel });
  }
  return _sql;
}
