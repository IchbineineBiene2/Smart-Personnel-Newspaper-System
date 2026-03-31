import cron from 'node-cron';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { fetchAllCategories } from '../collectors/newsApiCollector';
import { fetchGuardianArticles } from '../collectors/guardianCollector';
import { enrichArticlesWithContent } from '../collectors/scraper';
import { filterDuplicates, clearCache, loadSeenIdsFromDb } from '../processors/duplicateDetector';
import { upsertArticles } from '../db/articleRepository';
import { query } from '../db/index';

// NewsAPI developer planı: 100 istek/24s → sadece her 6 saatte bir çalışır
async function runCollection(includeNewsApi = false): Promise<void> {
  console.log(`[Scheduler] Haber toplama başladı: ${new Date().toISOString()}`);
  const startTime = Date.now();
  const newsApiKey = includeNewsApi ? process.env.NEWS_API_KEY : undefined;
  const guardianKey = process.env.GUARDIAN_API_KEY;

  // collection_runs kaydı aç
  let runId: number | null = null;
  try {
    const runResult = await query<{ id: number }>(
      `INSERT INTO collection_runs (source_types, status)
       VALUES ($1, 'running') RETURNING id`,
      [['rss', newsApiKey ? 'newsapi' : null, guardianKey ? 'guardian' : null].filter(Boolean)]
    );
    runId = runResult.rows[0].id;
  } catch (err) {
    console.warn('[Scheduler] collection_runs kaydı oluşturulamadı:', (err as Error).message);
  }

  try {
    const rssArticles = await fetchAllRssFeeds();
    const apiArticles = newsApiKey ? await fetchAllCategories(newsApiKey) : [];
    const guardianArticles = guardianKey ? await fetchGuardianArticles(guardianKey, 50) : [];

    const allArticles = [...rssArticles, ...apiArticles, ...guardianArticles];
    const unique = filterDuplicates(allArticles);

    // RSS haberleri için tam metin scraping (ilk 100 RSS haberi, batchSize=5)
    console.log('[Scheduler] RSS haberleri için scraping başlıyor...');
    const rssOnly = unique.filter((a) => a.source.type === 'rss').slice(0, 100);
    const enriched = await enrichArticlesWithContent(rssOnly, 5);
    const enrichedCount = enriched.filter((a) => a.content && a.content.length > 200).length;

    // Zenginleştirilmiş RSS haberleri + diğerleri
    const enrichedIds = new Set(enriched.map((a) => a.id));
    const finalArticles = [
      ...enriched,
      ...unique.filter((a) => !enrichedIds.has(a.id)),
    ];

    // DB'ye yaz
    const { inserted, skipped } = await upsertArticles(finalArticles);

    const duration = Date.now() - startTime;
    console.log(
      `[Scheduler] Toplandı: ${allArticles.length} haber, ${unique.length} tekrarsız, ` +
      `${enrichedCount} tam metin | DB: +${inserted} yeni, ${skipped} hata (${duration}ms)`
    );

    // collection_runs güncelle
    if (runId !== null) {
      await query(
        `UPDATE collection_runs SET
           completed_at = NOW(), status = 'success',
           articles_collected = $1, articles_new = $2,
           articles_duplicate = $3, duration_ms = $4
         WHERE id = $5`,
        [allArticles.length, inserted, allArticles.length - unique.length, duration, runId]
      ).catch(() => {});
    }
  } catch (err) {
    console.error('[Scheduler] Haber toplama hatası:', err);
    if (runId !== null) {
      await query(
        `UPDATE collection_runs SET
           completed_at = NOW(), status = 'failed',
           error_message = $1, duration_ms = $2
         WHERE id = $3`,
        [(err as Error).message, Date.now() - startTime, runId]
      ).catch(() => {});
    }
  }
}

export function startScheduler(): void {
  // RSS + Guardian: her 10 dakikada bir (NewsAPI dahil değil)
  cron.schedule('*/10 * * * *', () => runCollection(false));

  // NewsAPI: her 6 saatte bir (00:00, 06:00, 12:00, 18:00) — günde 4 × 16 = 64 istek
  cron.schedule('0 0,6,12,18 * * *', () => runCollection(true));

  // Her gece saat 03:00'da in-memory duplicate setini sıfırla
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Günlük sıfırlama: in-memory duplicate set temizleniyor...');
    clearCache();
    await loadSeenIdsFromDb().catch((e) =>
      console.warn('[Scheduler] ID yeniden yükleme hatası:', e.message)
    );
  });

  console.log('[Scheduler] Zamanlayıcılar başlatıldı (RSS her 10dk | NewsAPI her 6s | sıfırlama 03:00)');

  // Başlangıçta DB'den ID'leri yükle, sonra RSS+NewsAPI ile haber topla
  loadSeenIdsFromDb()
    .then(() => runCollection(true))
    .catch(() => runCollection(false));
}
