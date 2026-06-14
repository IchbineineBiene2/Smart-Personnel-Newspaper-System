import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { query } from '../db';

async function main() {
  const version = process.argv[2];
  if (!version) { console.error('Usage: npx ts-node src/scripts/markMigration.ts <migration_name>'); process.exit(1); }
  await query(
    'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [version, `Manually marked as applied`]
  );
  console.log(`[OK] ${version} schema_migrations tablosuna eklendi.`);
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
