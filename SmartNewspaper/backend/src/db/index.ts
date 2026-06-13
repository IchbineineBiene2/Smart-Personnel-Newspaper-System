import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const DB_MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS ?? 10);
const DB_IDLE_TIMEOUT_MS = Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10000);
const DB_CONNECTION_TIMEOUT_MS = Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 15000);
const DB_QUERY_RETRIES = Number(process.env.DB_QUERY_RETRIES ?? 2);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS ?? 300);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  return (
    message.includes('connection terminated') ||
    message.includes('connection timeout') ||
    message.includes('timeout exceeded') ||
    message.includes('econnreset') ||
    message.includes('terminating connection')
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  ssl: false,
});

pool.on('error', (err) => {
  console.error('[DB] Beklenmedik baglanti hatasi:', err.message);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  let attempt = 0;

  while (true) {
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`[DB] Yavas sorgu (${duration}ms):`, text.slice(0, 120));
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < DB_QUERY_RETRIES && isRetryableDbError(err)) {
        attempt++;
        console.warn(`[DB] Sorgu tekrar deneniyor (${attempt}/${DB_QUERY_RETRIES}):`, message);
        await sleep(DB_RETRY_DELAY_MS * attempt);
        continue;
      }

      console.error('[DB] Sorgu hatasi:', message, '\nSQL:', text.slice(0, 200));
      throw err;
    }
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<void> {
  const result = await query<{ now: string }>('SELECT NOW() AS now');
  console.log('[DB] Baglanti basarili. Sunucu zamani:', result.rows[0].now);
}

export default pool;
