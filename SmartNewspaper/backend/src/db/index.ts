import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Connection pool — uygulama boyunca tek bir pool örneği kullanılır
const pool = new Pool({
  host:              process.env.DB_HOST,
  port:              Number(process.env.DB_PORT ?? 5432),
  database:          process.env.DB_NAME,
  user:              process.env.DB_USER,
  password:          process.env.DB_PASSWORD,
  max:               Number(process.env.DB_MAX_CONNECTIONS ?? 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS  ?? 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
  ssl: false,
});

pool.on('error', (err) => {
  console.error('[DB] Beklenmedik bağlantı hatası:', err.message);
});

/** Parametreli sorgu çalıştırır, sonuçları döndürür */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[DB] Yavaş sorgu (${duration}ms):`, text.slice(0, 120));
    }
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DB] Sorgu hatası:', message, '\nSQL:', text.slice(0, 200));
    throw err;
  }
}

/** Transaction için client alır; kullanımdan sonra mutlaka release() çağrılmalı */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/** Transaction yardımcısı — callback başarılıysa COMMIT, hata varsa ROLLBACK yapar */
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

/** DB bağlantısını test eder */
export async function testConnection(): Promise<void> {
  const result = await query<{ now: string }>('SELECT NOW() AS now');
  console.log('[DB] Bağlantı başarılı. Sunucu zamanı:', result.rows[0].now);
}

export default pool;
