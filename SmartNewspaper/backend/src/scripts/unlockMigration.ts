/**
 * Cancel long-running similarity sweeps that block Migration 021.
 * Then check post-state.
 */
import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

async function main() {
  // Cancel ALL Migration 021 attempts (slow WAL on prod disk; rewriting migration cheaper)
  const blockers = await query<{ pid: number; q: string }>(`
    SELECT pid, LEFT(query, 80) AS q
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND query LIKE '%Migration 021%'
  `);
  console.log(`Found ${blockers.rowCount} long-running non-migration queries:`);
  for (const r of blockers.rows) {
    console.log(`  pid=${r.pid} ${r.q.replace(/\s+/g, ' ')}`);
  }

  // 2) cancel them
  for (const r of blockers.rows) {
    const res = await query<{ ok: boolean }>(`SELECT pg_cancel_backend($1) AS ok`, [r.pid]);
    console.log(`  pg_cancel_backend(${r.pid}) -> ${res.rows[0]?.ok}`);
  }

  // wait a moment
  await new Promise((r) => setTimeout(r, 1500));

  // 3) re-check
  const after = await query(`
    SELECT pid, state, LEFT(query, 80) AS q, age(now(), query_start)::text AS age
    FROM pg_stat_activity
    WHERE state != 'idle' AND datname = current_database() AND pid <> pg_backend_pid()
    ORDER BY query_start
  `);
  console.log(`\nAfter cancel — ${after.rowCount} active queries:`);
  for (const r of after.rows as any[]) {
    console.log(`  pid=${r.pid} state=${r.state} age=${r.age} ${String(r.q).replace(/\s+/g, ' ')}`);
  }

  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
