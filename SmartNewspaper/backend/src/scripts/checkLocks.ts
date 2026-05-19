/**
 * Diagnostic: show currently active queries and blocking locks.
 * No row data — only PIDs, query text, lock state.
 */
import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

async function main() {
  const active = await query(`
    SELECT pid,
           state,
           wait_event_type,
           wait_event,
           EXTRACT(EPOCH FROM age(now(), query_start))::int AS age_s,
           client_addr::text AS client,
           application_name AS app,
           LEFT(query, 120) AS query
    FROM pg_stat_activity
    WHERE state != 'idle'
      AND pid <> pg_backend_pid()
      AND datname = current_database()
    ORDER BY query_start
  `);
  console.log('=== ACTIVE QUERIES ===');
  if (active.rowCount === 0) console.log('(no active queries)');
  for (const r of active.rows as any[]) {
    console.log(`pid=${r.pid} state=${r.state} wait=${r.wait_event_type}/${r.wait_event} age=${r.age_s}s client=${r.client} app=${r.app}`);
    console.log(`  query: ${String(r.query).replace(/\s+/g, ' ')}`);
  }

  console.log('\n=== BLOCKING (waiter <- blocker) ===');
  const blocked = await query(`
    SELECT blocked.pid AS waiter_pid,
           blocking.pid AS blocker_pid,
           blocked.wait_event AS waiter_event,
           LEFT(blocked.query, 100) AS waiter_query,
           LEFT(blocking.query, 100) AS blocker_query,
           age(now(), blocked.query_start) AS waiter_age,
           age(now(), blocking.query_start) AS blocker_age
    FROM pg_stat_activity blocked
    JOIN pg_stat_activity blocking
      ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
    WHERE NOT pg_blocking_pids(blocked.pid) IS NULL
      AND pg_blocking_pids(blocked.pid) <> '{}'
  `);
  if (blocked.rowCount === 0) console.log('(no blocking detected)');
  for (const r of blocked.rows) {
    console.log(`waiter pid=${r.waiter_pid} (${r.waiter_age}, ${r.waiter_event}) blocked by pid=${r.blocker_pid} (${r.blocker_age})`);
    console.log(`  waiter:  ${String(r.waiter_query).replace(/\s+/g, ' ')}`);
    console.log(`  blocker: ${String(r.blocker_query).replace(/\s+/g, ' ')}`);
  }

  console.log('\n=== LONG-RUNNING (>30s) ===');
  const long = await query(`
    SELECT pid, state, age(now(), query_start) AS age, LEFT(query, 150) AS query
    FROM pg_stat_activity
    WHERE state = 'active'
      AND query_start < now() - interval '30 seconds'
      AND pid <> pg_backend_pid()
  `);
  if (long.rowCount === 0) console.log('(none)');
  for (const r of long.rows) {
    console.log(`pid=${r.pid} age=${r.age} ${String(r.query).replace(/\s+/g, ' ').slice(0, 140)}`);
  }

  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
