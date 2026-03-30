import cron from 'node-cron';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { fetchAllCategories } from '../collectors/newsApiCollector';
import { fetchGuardianArticles } from '../collectors/guardianCollector';
import { enrichArticlesWithContent } from '../collectors/scraper';
import { filterDuplicates, clearCache } from '../processors/duplicateDetector';
import { Article } from '../models/Article';

// Bellekte tutulan haber önbelleği (production'da DB'ye yazılmalı)
let articleCache: Article[] = [];

export function getArticleCache(): Article[] {
  return articleCache;
}

async function runCollection(): Promise<void> {
  console.log(`[Scheduler] Haber toplama başladı: ${new Date().toISOString()}`);
  const newsApiKey = process.env.NEWS_API_KEY;
  const guardianKey = process.env.GUARDIAN_API_KEY;

  try {
    const rssArticles = await fetchAllRssFeeds();
    const apiArticles = newsApiKey ? await fetchAllCategories(newsApiKey) : [];
    const guardianArticles = guardianKey ? await fetchGuardianArticles(guardianKey, 50) : [];

    const allArticles = [...rssArticles, ...apiArticles, ...guardianArticles];
    const unique = filterDuplicates(allArticles);

    // RSS haberleri için tam metin scraping (ilk 100 RSS haberi, batchSize=5)
    // BBC, DW, Tagesschau ve Türk kaynakları dahil
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

    // Yeni haberleri cache'e ekle, toplamda max 2000 tut
    articleCache = [...finalArticles, ...articleCache].slice(0, 2000);

    console.log(`[Scheduler] Toplandı: ${allArticles.length} haber, ${unique.length} tekrarsız, ${enrichedCount} tam metin`);
  } catch (err) {
    console.error('[Scheduler] Haber toplama hatası:', err);
  }
}

export function startScheduler(): void {
  // Her 10 dakikada bir haber topla (daha sık)
  cron.schedule('*/10 * * * *', runCollection);

  // Her gece saat 03:00'da cache ve duplicate set'i sıfırla
  cron.schedule('0 3 * * *', () => {
    console.log('[Scheduler] Günlük sıfırlama yapılıyor...');
    clearCache();
    articleCache = [];
  });

  console.log('[Scheduler] Zamanlayıcılar başlatıldı (her 10dk + gece 03:00 sıfırlama)');

  // Başlangıçta hemen bir kez çalıştır
  runCollection();
}
