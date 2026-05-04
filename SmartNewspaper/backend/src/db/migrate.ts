import fs from 'fs';
import path from 'path';
import { query, testConnection } from './index';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

interface MigrationRow {
  version: string;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await query<MigrationRow>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return new Set(result.rows.map((r) => r.version));
  } catch {
    // Tablo henüz yok — ilk migration oluşturacak
    return new Set();
  }
}

async function applyMigration(file: string, sql: string): Promise<void> {
  const version = path.basename(file, '.sql');
  console.log(`[Migrate] Uygulanıyor: ${version}`);
  await query('BEGIN');
  try {
    await query(sql);
    await query(
      'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [version, `Auto-applied: ${file}`]
    );
    await query('COMMIT');
    console.log(`[Migrate] Tamamlandı: ${version}`);
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}

export async function runMigrations(): Promise<void> {
  console.log('[Migrate] Migration kontrolü başlatılıyor...');
  await testConnection();

  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    await applyMigration(file, sql);
    count++;
  }

  if (count === 0) {
    console.log('[Migrate] Tüm migration\'lar zaten uygulanmış.');
  } else {
    console.log(`[Migrate] ${count} migration uygulandı.`);
  }
}
