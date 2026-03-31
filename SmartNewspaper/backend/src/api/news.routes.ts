import { Router, Request, Response } from 'express';
import { getArticles, getArticleById } from '../db/articleRepository';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { filterDuplicates } from '../processors/duplicateDetector';
import { scrapeArticleDetails } from '../collectors/scraper';

const router = Router();

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
