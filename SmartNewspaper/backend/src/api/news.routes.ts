import { Router, Request, Response } from 'express';
import { getArticles, getArticleById } from '../db/articleRepository';
import { scrapeArticleDetails } from '../collectors/scraper';
import { query } from '../db';
import { generateArticleAnalysis } from '../services/articleAnalysis';
import { runCollection } from '../scheduler/newsScheduler';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

// In-memory cache for market rates (5 minutes cache expiration)
let cachedRates: any[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/news/market-rates - Canlı altın & döviz değerlerini getir
router.get('/market-rates', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedRates && (now - lastCacheTime < CACHE_DURATION_MS)) {
    return res.json({ rates: cachedRates, source: 'cache', timestamp: lastCacheTime });
  }

  try {
    const response = await axios.get('https://www.doviz.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    const $ = cheerio.load(response.data);
    
    const targetKeys: { [key: string]: string } = {
      'GRAM ALTIN': 'Gram Altın',
      'DOLAR': 'USD/TRY',
      'EURO': 'EUR/TRY',
      'BIST 100': 'BIST 100'
    };
    
    const rates: any[] = [];
    
    $('.market-data .item').each((_i, el) => {
      const rawName = $(el).find('.name').text().trim();
      if (targetKeys[rawName]) {
        const name = targetKeys[rawName];
        let value = $(el).find('.value').text().trim();
        const changeRateEl = $(el).find('.change-rate');
        let change = changeRateEl.text().trim();
        const up = changeRateEl.hasClass('up');
        
        if (name === 'Gram Altın' && !value.includes('₺')) {
          value += ' ₺';
        }
        
        // Clean and format percentage change safely, e.g. %-2,35 to -2.35%
        let formattedChange = change.replace('%', '').trim();
        formattedChange = formattedChange.replace('-', '').replace('+', '').trim(); // Remove any existing signs
        formattedChange = formattedChange.replace(',', '.'); // standard decimal representation
        formattedChange = (up ? '+' : '-') + formattedChange + '%';

        rates.push({
          name,
          value,
          change: formattedChange,
          up
        });
      }
    });

    if (rates.length === 0) {
      throw new Error('No rates scraped from source page');
    }

    // Sort to maintain standard order
    const order = ['Gram Altın', 'USD/TRY', 'EUR/TRY', 'BIST 100'];
    rates.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

    cachedRates = rates;
    lastCacheTime = now;
    
    return res.json({ rates, source: 'network', timestamp: now });
  } catch (err) {
    console.error('[NewsAPI] Market rates fetch error:', (err as Error).message);
    
    // Fallback to cache if available, even if expired
    if (cachedRates) {
      return res.json({ rates: cachedRates, source: 'stale-cache', timestamp: lastCacheTime });
    }

    // Default rates fallback if everything fails
    const fallbackRates = [
      { name: 'Gram Altın', value: '3.472 ₺', change: '+0.91%', up: true },
      { name: 'USD/TRY',    value: '38,45',    change: '+0.12%', up: true },
      { name: 'EUR/TRY',    value: '42,10',    change: '-0.28%', up: false },
      { name: 'BIST 100',   value: '10.412',   change: '+1.42%', up: true },
    ];
    return res.json({ rates: fallbackRates, source: 'fallback', timestamp: now });
  }
});


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
         AND published_at <= NOW() + INTERVAL '5 minutes'
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
         AND published_at <= NOW() + INTERVAL '5 minutes'
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
         AND published_at <= NOW() + INTERVAL '5 minutes'
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
    console.log(`[NewsAPI] full-content ${req.params.id}: scraped images count = ${scraped.images?.length ?? 0}`, scraped.images?.slice(0, 2));
    return res.json({
      id: article.id,
      content: scraped.content ?? article.content ?? article.description,
      images: scraped.images,
      fromSource: Boolean(scraped.content),
    });
  } catch (err) {
    console.error('[NewsAPI] full-content scrape error:', err);
    try {
      const article = await getArticleById(req.params.id);
      if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });
      console.log(`[NewsAPI] full-content ${req.params.id}: fallback to DB imageUrl`);
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

// GET /api/news/:id/analysis - Haber metninden AI yorum/analiz üret
router.get('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });

    return res.json(generateArticleAnalysis(article));
  } catch (err) {
    console.error('[NewsAPI] Haber analiz hatası:', err);
    return res.status(500).json({ error: 'Haber analizi üretilemedi' });
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
    const includeNewsApi = req.query.newsapi === 'true' || req.body?.newsapi === true;
    const result = await runCollection(includeNewsApi);

    if (!result.success) {
      return res.status(500).json({ error: 'Haber toplama basarisiz', details: result.error });
    }

    return res.json({
      fetched: result.collected,
      unique: result.unique,
      inserted: result.inserted,
      skipped: result.skipped,
      durationMs: result.durationMs,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Haber toplama basarisiz', details: (err as Error).message });
  }
});

export default router;
