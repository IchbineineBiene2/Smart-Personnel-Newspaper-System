import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

(async () => {
  const r = await query<{ udt_name: string; dim: number | null; atttypmod: number }>(`
    SELECT a.attname,
           t.typname AS udt_name,
           a.atttypmod
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relname = 'articles'
      AND a.attname IN ('embedding', 'embedding_v2', 'embedding_v2_input_hash')
      AND a.attnum > 0
  `);
  console.log(r.rows);
  // migrations table
  const m = await query(`SELECT version FROM schema_migrations WHERE version LIKE '021%' ORDER BY version`);
  console.log('Applied 021 migrations:', m.rows);
  await pool.end();
})();
