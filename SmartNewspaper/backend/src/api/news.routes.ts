import { Router, Request, Response } from 'express';
import { getArticles, getArticleById } from '../db/articleRepository';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { filterDuplicates } from '../processors/duplicateDetector';
import { scrapeArticleDetails } from '../collectors/scraper';
import { query } from '../db';

const router = Router();

// GET /api/news/trending - "En çok okunanlar" için son 24 saatteki en güncel/popüler haberler
// Popülerlik proxy'si: yayın tarihi yakınlığı + içerik zenginliği (image var mı, content uzunluğu)
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const result = await query<any>(
      `SELECT *,
         (
           CASE WHEN image_url IS NOT NULL THEN 30 ELSE 0 END
           + CASE WHEN content IS NOT NULL AND LENGTH(content) > 400 THEN 25 ELSE 0 END
           + GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600)
         ) AS score
       FROM articles
       WHERE published_at > NOW() - INTERVAL '48 hours'
       ORDER BY score DESC, published_at DESC
       LIMIT $1`,
      [limit]
    );
    const articles = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      content: r.content ?? undefined,
      url: r.url,
      imageUrl: r.image_url ?? undefined,
      publishedAt: r.published_at,
      language: r.language,
      category: r.category ?? undefined,
      source: { name: r.source_name, url: r.source_url ?? '', type: r.source_type },
    }));
    res.json({ articles });
  } catch (err) {
    console.error('[NewsAPI] Trending hatası:', err);
    res.status(500).json({ error: 'Trend haberler alınamadı' });
  }
});

// GET /api/news/breaking - Son 6 saatteki en yeni haberler (manşet ticker için)
router.get('/breaking', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 8), 20);
    const result = await query<any>(
      `SELECT * FROM articles
       WHERE published_at > NOW() - INTERVAL '12 hours'
       ORDER BY published_at DESC
       LIMIT $1`,
      [limit]
    );
    const articles = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      url: r.url,
      imageUrl: r.image_url ?? undefined,
      publishedAt: r.published_at,
      language: r.language,
      category: r.category ?? undefined,
      source: { name: r.source_name, url: r.source_url ?? '', type: r.source_type },
    }));
    res.json({ articles });
  } catch (err) {
    console.error('[NewsAPI] Breaking hatası:', err);
    res.status(500).json({ error: 'Son dakika haberleri alınamadı' });
  }
});

// GET /api/news/sources - Aktif yayıncı/kaynak listesi (her kaynaktan en son haber + sayım)
router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const result = await query<any>(
      `SELECT source_name, source_url,
              COUNT(*)::int AS article_count,
              MAX(published_at) AS latest_at
       FROM articles
       WHERE published_at > NOW() - INTERVAL '7 days'
       GROUP BY source_name, source_url
       ORDER BY latest_at DESC
       LIMIT 24`
    );
    res.json({ sources: result.rows });
  } catch (err) {
    console.error('[NewsAPI] Sources hatası:', err);
    res.status(500).json({ error: 'Kaynaklar alınamadı' });
  }
});

// GET /api/news - Tüm haberleri getir (filtreli)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, language, source, limit = '50', offset = '0' } = req.query;

    const result = await getArticles({
      category: category ? String(category) : undefined,
      language: language ? String(language) : undefined,
      source: source ? String(source) : undefined,
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json(result);
  } catch (err) {
    console.error('[NewsAPI] Haber listesi hatası:', err);
    res.status(500).json({ error: 'Haberler alınamadı' });
  }
});

// GET /api/news/:id/full-content - Haberin tam metnini kaynak siteden çek
router.get('/:id/full-content', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });

    const scraped = await scrapeArticleDetails(article.url, {
      title: article.title,
      description: article.description,
    });
    return res.json({
      id: article.id,
      content: scraped.content ?? article.content ?? article.description,
      images: scraped.images,
      fromSource: Boolean(scraped.content),
    });
  } catch {
    try {
      const article = await getArticleById(req.params.id);
      if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });
      return res.json({
        id: article.id,
        content: article.content ?? article.description,
        images: article.imageUrl ? [article.imageUrl] : [],
        fromSource: false,
      });
    } catch {
      return res.status(500).json({ error: 'İçerik alınamadı' });
    }
  }
});

// GET /api/news/:id - Tek haber getir
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });
    return res.json(article);
  } catch (err) {
    console.error('[NewsAPI] Haber detay hatası:', err);
    return res.status(500).json({ error: 'Haber alınamadı' });
  }
});

// POST /api/news/fetch - Manuel tetikleme (admin için)
router.post('/fetch', async (req: Request, res: Response) => {
  try {
    const rssArticles = await fetchAllRssFeeds();
    const unique = filterDuplicates(rssArticles);
    res.json({ fetched: rssArticles.length, unique: unique.length });
  } catch {
    res.status(500).json({ error: 'Haber toplama başarısız' });
  }
});

export default router;
