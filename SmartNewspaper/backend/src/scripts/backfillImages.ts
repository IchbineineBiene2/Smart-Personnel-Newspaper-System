/**
 * Mevcut haberlerden image_url eksik olanları og:image meta tagından doldurur.
 * Kullanım: npx ts-node src/scripts/backfillImages.ts [--source "CNN Türk"] [--limit 500]
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { query } from '../db';

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;

async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    const url = match?.[1];
    return url?.startsWith('http') ? url : undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((_, i) => args[i - 1] === '--source');
  const limitArg = args.find((_, i) => args[i - 1] === '--limit');
  const limit = limitArg ? parseInt(limitArg, 10) : 200;

  const whereSource = sourceArg ? `AND LOWER(source_name) = LOWER('${sourceArg.replace(/'/g, "''")}')` : '';

  const { rows } = await query<{ id: string; url: string; source_name: string }>(
    `SELECT id, url, source_name FROM articles
     WHERE image_url IS NULL ${whereSource}
     ORDER BY published_at DESC
     LIMIT $1`,
    [limit]
  );

  console.log(`[backfill] ${rows.length} haber işlenecek (limit: ${limit})${sourceArg ? ` [kaynak: ${sourceArg}]` : ''}`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (row) => {
        const imageUrl = await fetchOgImage(row.url);
        if (imageUrl) {
          await query('UPDATE articles SET image_url = $1 WHERE id = $2', [imageUrl, row.id]);
          updated++;
        } else {
          failed++;
        }
      })
    );
    process.stdout.write(`\r[backfill] ${i + batch.length}/${rows.length} — güncellendi: ${updated}, bulunamadı: ${failed}`);
  }

  console.log(`\n[backfill] Tamamlandı. Güncellenen: ${updated}, Bulunamayan: ${failed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[backfill] Hata:', e.message);
  process.exit(1);
});
