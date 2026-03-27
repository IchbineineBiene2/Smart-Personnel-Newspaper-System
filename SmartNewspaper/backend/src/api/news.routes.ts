import { Router, Request, Response } from 'express';
import { getArticleCache } from '../scheduler/newsScheduler';
import { fetchAllRssFeeds } from '../collectors/rssCollector';
import { filterDuplicates } from '../processors/duplicateDetector';

const router = Router();

// GET /api/news - Tüm haberleri getir (filtreli)
router.get('/', (req: Request, res: Response) => {
  let articles = getArticleCache();

  const { category, language, source, limit = '50', offset = '0' } = req.query;

  if (category) articles = articles.filter((a) => a.category === category);
  if (language) articles = articles.filter((a) => a.language === language);
  if (source) articles = articles.filter((a) => a.source.name.toLowerCase().includes(String(source).toLowerCase()));

  // Dil filtresi uygulanmamışsa, farklı dilleri karıştır (tr/en/de dengeli dağılım)
  if (!language) {
    const byLang = new Map<string, typeof articles>();
    articles.forEach((a) => {
      const lang = a.language ?? 'other';
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang)!.push(a);
    });
    const lanes = [...byLang.values()];
    const maxLen = Math.max(...lanes.map((l) => l.length));
    const interleaved: typeof articles = [];
    for (let i = 0; i < maxLen; i++) {
      lanes.forEach((lane) => { if (lane[i]) interleaved.push(lane[i]); });
    }
    articles = interleaved;
  }

  const total = articles.length;
  const paginated = articles.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ total, articles: paginated });
});

// GET /api/news/:id - Tek haber getir
router.get('/:id', (req: Request, res: Response) => {
  const article = getArticleCache().find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });
  return res.json(article);
});

// POST /api/news/fetch - Manuel tetikleme (admin için)
router.post('/fetch', async (req: Request, res: Response) => {
  try {
    const [rssArticles] = await Promise.all([fetchAllRssFeeds()]);
    const unique = filterDuplicates(rssArticles);
    res.json({ fetched: rssArticles.length, unique: unique.length });
  } catch (err) {
    res.status(500).json({ error: 'Haber toplama başarısız' });
  }
});

export default router;
