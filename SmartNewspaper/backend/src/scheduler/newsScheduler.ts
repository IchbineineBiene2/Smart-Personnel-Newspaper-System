import cron from 'node-cron';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { fetchAllCategories } from '../collectors/newsApiCollector';
import { fetchGuardianArticles } from '../collectors/guardianCollector';
import { fetchCalendarificHolidays } from '../collectors/calendarificCollector';
import { concertCollector } from '../collectors/concertCollector';
import { enrichArticlesWithContent } from '../collectors/scraper';
import { filterDuplicates, clearCache, loadSeenIdsFromDb } from '../processors/duplicateDetector';
import { upsertArticles } from '../db/articleRepository';
import { query } from '../db/index';
import { findAndSaveSimilarArticles } from '../processors/similarity-processor';
import { findAndSaveSimilarArticlesV2 } from '../processors/similarityProcessorV2';
import { computeAndSaveEmbeddingsV2 } from '../processors/embeddingV2';

const STARTUP_NEWSAPI_DELAY_MS = 10 * 60 * 1000;
const MIN_NEWSAPI_STARTUP_INTERVAL_MS = 2 * 60 * 60 * 1000;
let lastNewsApiRunAt: number | null = null;

export interface CollectionResult {
  success: boolean;
  collected: number;
  unique: number;
  inserted: number;
  skipped: number;
  durationMs: number;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLastNewsApiRunAt(): Promise<number | null> {
  let lastRunAt = lastNewsApiRunAt;

  try {
    const result = await query<{ started_at: Date | string }>(
      `SELECT started_at
       FROM collection_runs
       WHERE 'newsapi' = ANY(source_types)
       ORDER BY started_at DESC
       LIMIT 1`
    );
    const dbStartedAt = result.rows[0]?.started_at;
    if (dbStartedAt) {
      const dbTime = new Date(dbStartedAt).getTime();
      lastRunAt = lastRunAt === null ? dbTime : Math.max(lastRunAt, dbTime);
    }
  } catch (err) {
    console.warn('[Scheduler] Son NewsAPI çalışması DBden okunamadı:', (err as Error).message);
  }

  return lastRunAt;
}

async function runStartupNewsApiCollection(): Promise<void> {
  await delay(STARTUP_NEWSAPI_DELAY_MS);

  const lastRunAt = await getLastNewsApiRunAt();
  if (lastRunAt !== null && Date.now() - lastRunAt < MIN_NEWSAPI_STARTUP_INTERVAL_MS) {
    console.log('[Scheduler] Startup NewsAPI çalışması atlandı: son çalışma 2 saatten yeni.');
    return;
  }

  await runCollection(true);
}

async function runCalendarificCollection(): Promise<void> {
  if (!process.env.CALENDARIFIC_API_KEY || process.env.CALENDARIFIC_API_KEY === 'your_key_here') return;

  try {
    const inserted = await fetchCalendarificHolidays();
    console.log(`[Calendarific] ${inserted} holiday event inserted.`);
  } catch (err) {
    console.error('[Calendarific] Holiday collection failed:', err);
  }
}

async function runConcertCollection(): Promise<void> {
  try {
    console.log('[Concert Collector] Konser, tiyatro ve stand-up etkinlikleri toplanıyor...');
    const concerts = await concertCollector.collectAll();
    
    if (concerts.length === 0) {
      console.log('[Concert Collector] Konser bulunamadı.');
      return;
    }

    // Şimdilik konser verilerini logluyoruz (DB'ye kaydetmek için API route'unda handle edilecek)
    console.log(`[Concert Collector] ✅ ${concerts.length} etkinlik toplandı`);
    
    // TODO: concerts verisini Event table'ına kaydet
    // Şimdilik API endpoint'leri üzerinden kullanıcıya sunulacak
  } catch (err) {
    console.error('[Concert Collector] Konser toplama hatası:', err);
  }
}

// NewsAPI developer planı: 100 istek/24s → sadece her 6 saatte bir çalışır
export async function runCollection(includeNewsApi = false): Promise<CollectionResult> {
  console.log(`[Scheduler] Haber toplama başladı: ${new Date().toISOString()}`);
  const startTime = Date.now();
  const newsApiKey = includeNewsApi ? process.env.NEWS_API_KEY : undefined;
  const guardianKey = process.env.GUARDIAN_API_KEY;
  if (newsApiKey) lastNewsApiRunAt = startTime;

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

    const { inserted, skipped } = await upsertArticles(finalArticles);

    // Compute embeddings — eski model (geçiş için) + v2 (multilingual-e5-large)
    if (inserted > 0) {
      console.log('[Scheduler] Generating embeddings for new articles...');
      try {
        const { computeAndSaveEmbeddings } = require('../processors/embedding');
        await computeAndSaveEmbeddings();
      } catch(e) {
        console.error('[Embedding Error]', e);
      }
      try {
        await computeAndSaveEmbeddingsV2({ limit: 200, onlyMissing: true });
      } catch(e) {
        console.error('[EmbeddingV2 Error]', e);
      }
    }

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

    return {
      success: true,
      collected: allArticles.length,
      unique: unique.length,
      inserted,
      skipped,
      durationMs: duration,
    };
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
    return {
      success: false,
      collected: 0,
      unique: 0,
      inserted: 0,
      skipped: 0,
      durationMs: Date.now() - startTime,
      error: (err as Error).message,
    };
  }
}

export function startScheduler(): void {
  runCalendarificCollection();
  runConcertCollection(); // Başlangıçta konserler toplanır

  // RSS + Guardian: her 10 dakikada bir (NewsAPI dahil değil)
  cron.schedule('*/10 * * * *', () => runCollection(false));

  // NewsAPI: her 6 saatte bir (00:00, 06:00, 12:00, 18:00) — günde 4 × 16 = 64 istek
  cron.schedule('0 0,6,12,18 * * *', () => runCollection(true));

  // Konserler: her 6 saatte bir (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 1,7,13,19 * * *', () => runConcertCollection());

  // Calendarific holidays: weekly on Sunday at 00:00
  cron.schedule('0 0 * * 0', () => runCalendarificCollection());

  // Her gece saat 03:00'da in-memory duplicate setini sıfırla
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Günlük sıfırlama: in-memory duplicate set temizleniyor...');
    clearCache();
    await loadSeenIdsFromDb().catch((e) =>
      console.warn('[Scheduler] ID yeniden yükleme hatası:', e.message)
    );
  });

  console.log('[Scheduler] Zamanlayıcılar başlatıldı (RSS her 10dk | NewsAPI her 6s | Konser her 6s | sıfırlama 03:00)');

  // V1 (eski 384-dim) — geçiş döneminde paralel çalışsın. v2 stabil olduğunda kaldırılacak.
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Benzerlik analizi (v1) başlatılıyor...');
    try {
      await findAndSaveSimilarArticles();
    } catch (e) {
      console.error('[Scheduler] V1 Benzerlik analizi hatası:', e);
    }
  });

  // V2 (multilingual-e5-large + iki katmanlı + entity guard) — her 30dk incremental
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Scheduler] Benzerlik analizi (v2) başlatılıyor (incremental)...');
    try {
      await findAndSaveSimilarArticlesV2({ sinceMinutes: 45 });
    } catch (e) {
      console.error('[Scheduler] V2 Benzerlik analizi hatası:', e);
    }
  });

  // V2 full sweep — gece bir kez tüm 3 günlük pencereyi yeniden tara
  cron.schedule('30 4 * * *', async () => {
    console.log('[Scheduler] Benzerlik analizi (v2 fullSweep) başlatılıyor...');
    try {
      await findAndSaveSimilarArticlesV2({ fullSweep: true });
    } catch (e) {
      console.error('[Scheduler] V2 fullSweep hatası:', e);
    }
  });

  // Başlangıçta DB'den ID'leri yükle, sonra RSS+NewsAPI ile haber topla
  loadSeenIdsFromDb()
    .then(() => {
      runCollection(false).catch((err) =>
        console.error('[Scheduler] Startup RSS collection failed:', err)
      );
      console.log('[Scheduler] Startup NewsAPI collection delayed by 10 minutes.');
      runStartupNewsApiCollection().catch((err) =>
        console.error('[Scheduler] Startup NewsAPI collection failed:', err)
      );
    })
    .catch(() => runCollection(false));
}
