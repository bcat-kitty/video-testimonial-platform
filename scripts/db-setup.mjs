#!/usr/bin/env node
/**
 * Applies lib/db/schema.sql to DATABASE_URL. Run once when you attach a real
 * database, and again any time schema.sql changes (it is all IF NOT EXISTS,
 * so re-running is safe).
 *
 * Reads DATABASE_URL from the environment, .env.local, or .env, in that
 * order, so it works with the same file `next dev` uses.
 */
import { existsSync, readFileSync } from 'node:fs';
import postgres from 'postgres';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^(["'])(.*)\1$/, '$2');
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Put it in .env.local (or the environment) and re-run.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, onnotice: () => {} });
const schema = readFileSync(new URL('../lib/db/schema.sql', import.meta.url), 'utf8');

try {
  await sql.unsafe(schema);
  console.log('Schema applied: testimonials, testimonial_requests.');
} catch (err) {
  console.error(`Failed to apply schema: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
