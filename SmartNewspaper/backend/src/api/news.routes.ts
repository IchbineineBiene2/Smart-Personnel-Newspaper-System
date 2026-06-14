import { Router, Request, Response } from 'express';
import { getArticles, getArticleById } from '../db/articleRepository';
import { isLikelyArticleContent, scrapeArticleDetails } from '../collectors/scraper';
import { query } from '../db';
import { generateArticleAnalysis } from '../services/articleAnalysis';
import { runCollection } from '../scheduler/newsScheduler';
import { optionalAuth, authMiddleware } from '../middleware/authMiddleware';
import { getInterestVector } from '../services/userInterest';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Light cache for user preferences — avoid hitting the DB on every /api/news call.
 * Invalidated when the preferences PUT route updates a row (no live invalidation yet,
 * just a 30-second TTL — preference changes show up within half a minute).
 */
type UserPrefs = {
  preferredCategories: string[];
  preferredLanguages: string[];
  preferredSources: string[];
  mutedSources: string[];
};
const prefsCache = new Map<number, { prefs: UserPrefs; ts: number }>();
const PREFS_TTL_MS = 30 * 1000;
const NEWS_LIST_CACHE_TTL_MS = 60 * 1000;
const newsListCache = new Map<string, { ts: number; data: unknown }>();
const newsListPending = new Map<string, Promise<unknown>>();

/**
 * Maximal Marginal Relevance (MMR) re-rank.
 *
 * Input: cosine-ordered candidates, each with `interest_score` (sim to user)
 *        and `embedding_text` (pgvector text form '[0.1, ...]').
 * Output: top-K diversified picks.
 *
 * pick_i+1 = argmax_{c ∉ S}  λ * sim(c, user)  -  (1-λ) * max_{p ∈ S} sim(c, p)
 *
 * λ ≈ 0.7 → biraz çeşitlilik, çoğunlukla alaka. Aynı haber/duplicate'ları
 * topun başına yığmaktan kaçınmak için iyi default.
 */
function parsePgVector(text: string): Float32Array {
  // pgvector text form: "[0.1,0.2,...]" — basit parse
  const trimmed = text.replace(/[\[\]\s]/g, '');
  const parts = trimmed.split(',');
  const arr = new Float32Array(parts.length);
  for (let i = 0; i < parts.length; i++) arr[i] = parseFloat(parts[i]);
  return arr;
}

function cosineNorm(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

function mmrRerank<T extends { interest_score: number; embedding_text: string; source_name?: string }>(
  candidates: T[],
  k: number,
  lambda: number,
): T[] {
  const vecs: Float32Array[] = candidates.map((c) => parsePgVector(c.embedding_text));
  const picked: number[] = [];
  const remaining = new Set<number>(candidates.map((_, i) => i));

  // İlk pick — en yüksek interest_score
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (const i of remaining) {
    if (candidates[i].interest_score > bestScore) {
      bestScore = candidates[i].interest_score;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return [];
  picked.push(bestIdx);
  remaining.delete(bestIdx);

  // Geri kalan k-1 pick
  while (picked.length < k && remaining.size > 0) {
    let bestI = -1;
    let bestMmr = -Infinity;
    for (const i of remaining) {
      // max similarity to any already-picked
      let maxSim = -Infinity;
      for (const p of picked) {
        const s = cosineNorm(vecs[i], vecs[p]);
        if (s > maxSim) maxSim = s;
      }
      const mmr = lambda * candidates[i].interest_score - (1 - lambda) * maxSim;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestI = i;
      }
    }
    if (bestI < 0) break;
    picked.push(bestI);
    remaining.delete(bestI);
  }

  return picked.map((i) => candidates[i]);
}

async function loadUserPrefs(userId: number): Promise<UserPrefs | null> {
  const cached = prefsCache.get(userId);
  if (cached && Date.now() - cached.ts < PREFS_TTL_MS) return cached.prefs;
  try {
    const r = await query<{
      preferred_categories: string[] | null;
      preferred_languages: string[] | null;
      preferred_sources: string[] | null;
      muted_sources: string[] | null;
    }>(
      `SELECT preferred_categories, preferred_languages, preferred_sources, muted_sources
         FROM user_preferences WHERE user_id = $1`,
      [userId],
    );
    if (r.rowCount === 0) return null;
    const prefs: UserPrefs = {
      preferredCategories: r.rows[0].preferred_categories ?? [],
      preferredLanguages: r.rows[0].preferred_languages ?? [],
      preferredSources: r.rows[0].preferred_sources ?? [],
      mutedSources: r.rows[0].muted_sources ?? [],
    };
    prefsCache.set(userId, { prefs, ts: Date.now() });
    return prefs;
  } catch (e) {
    console.warn('[NewsAPI] preferences load failed for user', userId, (e as Error).message);
    return null;
  }
}

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
      `SELECT id, title, description, url, image_url, published_at,
              language, category, source_name, source_url, source_type, source_logo_url,
         (
           CASE WHEN image_url IS NOT NULL THEN 30 ELSE 0 END
           + GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600)
         ) AS score
       FROM articles
       WHERE published_at > NOW() - INTERVAL '48 hours'
         AND published_at <= NOW() + INTERVAL '6 hours'
       ORDER BY score DESC, published_at DESC
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
      source: { name: r.source_name, url: r.source_url ?? '', type: r.source_type, logoUrl: r.source_logo_url ?? undefined },
    }));
    res.json({ articles });
  } catch (err) {
    console.error('[NewsAPI] Trending hatası:', err);
    res.status(500).json({ error: 'Trend haberler alınamadı' });
  }
});

// GET /api/news/trending-topics - Son 48 saatteki haber başlıklarından en çok geçen kelimeleri/etiketleri çıkar
router.get('/trending-topics', async (_req: Request, res: Response) => {
  try {
    const result = await query<any>(
      `SELECT category AS tag, COUNT(*)::int AS count
       FROM articles
       WHERE published_at > NOW() - INTERVAL '48 hours'
         AND category IS NOT NULL AND category <> ''
       GROUP BY category
       ORDER BY count DESC
       LIMIT 15`
    );
    res.json({ topics: result.rows });
  } catch (err) {
    console.error('[NewsAPI] Trending topics hatası:', err);
    res.status(500).json({ error: 'Trend konular alınamadı' });
  }
});

// GET /api/news/breaking - Son 6 saatteki en yeni haberler (manşet ticker için)
router.get('/breaking', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 8), 20);
    const result = await query<any>(
      `SELECT id, title, description, url, image_url, published_at,
              language, category, source_name, source_url, source_type, source_logo_url
       FROM articles
       WHERE published_at > NOW() - INTERVAL '12 hours'
         AND published_at <= NOW() + INTERVAL '6 hours'
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
      source: { name: r.source_name, url: r.source_url ?? '', type: r.source_type, logoUrl: r.source_logo_url ?? undefined },
    }));
    res.json({ articles });
  } catch (err) {
    console.error('[NewsAPI] Breaking hatası:', err);
    res.status(500).json({ error: 'Son dakika haberleri alınamadı' });
  }
});

// GET /api/news/for-you - Kişiselleştirilmiş feed (auth zorunlu).
// Kullanıcının interest_vector'ına en yakın güncel (3 günlük) makaleleri sıralar.
// Soğuk başlangıç (henüz like/view yoksa): trending davranışına düşer.
router.get('/for-you', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'auth required' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit ?? 30), 1), 100);
    const lookbackDays = Math.min(Math.max(Number(req.query.days ?? 3), 1), 14);

    const interest = await getInterestVector(req.user.userId);

    // mutedSources hard filter — preferences kayıtlıysa uygula
    const prefsRow = await query<{ muted_sources: string[] | null }>(
      `SELECT muted_sources FROM user_preferences WHERE user_id = $1`,
      [req.user.userId],
    );
    const muted = prefsRow.rows[0]?.muted_sources ?? [];

    // Cold start: vector yok → tipik akış (popüler/güncel)
    if (!interest.vector || interest.sampleCount === 0) {
      const fallback = await query<any>(
        `SELECT id, title, description, content, url, image_url, published_at,
                category, language, source_name, source_url
           FROM articles
          WHERE published_at >= NOW() - INTERVAL '${lookbackDays} days'
            AND embedding_v2 IS NOT NULL
            ${muted.length ? `AND source_name <> ALL($2)` : ''}
          ORDER BY published_at DESC
          LIMIT $1`,
        muted.length ? [limit, muted] : [limit],
      );
      return res.json({
        cold: true,
        sampleCount: 0,
        articles: fallback.rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? '',
          content: r.content ?? undefined,
          url: r.url,
          imageUrl: r.image_url ?? undefined,
          publishedAt: r.published_at,
          language: r.language,
          category: r.category ?? undefined,
          source: { name: r.source_name, url: r.source_url ?? '', type: 'rss', logoUrl: r.source_logo_url ?? undefined },
        })),
      });
    }

    // Personalized: cosine similarity sort, then MMR re-rank for diversity.
    // ?mmr=0 ile devre dışı bırakılabilir (default açık).
    const mmrEnabled = String(req.query.mmr ?? '1') !== '0';
    // MMR için top-N kandidat çek (limit'in 3 katı, max 90); cosine'a göre sırala.
    const candidateLimit = mmrEnabled ? Math.min(limit * 3, 90) : limit;

    const personalized = await query<any>(
      `SELECT id, title, description, content, url, image_url, published_at,
              category, language, source_name, source_url,
              embedding_v2::text AS embedding_text,
              (1 - (embedding_v2 <=> $1::vector)) AS interest_score
         FROM articles
        WHERE published_at >= NOW() - INTERVAL '${lookbackDays} days'
          AND embedding_v2 IS NOT NULL
          ${muted.length ? `AND source_name <> ALL($3)` : ''}
        ORDER BY embedding_v2 <=> $1::vector
        LIMIT $2`,
      muted.length ? [interest.vector, candidateLimit, muted] : [interest.vector, candidateLimit],
    );

    let ranked = personalized.rows as Array<any>;
    if (mmrEnabled && ranked.length > limit) {
      ranked = mmrRerank(ranked, limit, /*lambda*/ 0.7);
    } else {
      ranked = ranked.slice(0, limit);
    }
    // embedding_text alanını response'tan at — gereksiz payload
    for (const r of ranked) delete r.embedding_text;

    return res.json({
      cold: false,
      sampleCount: interest.sampleCount,
      freshness: interest.freshness,
      mmr: mmrEnabled,
      articles: ranked.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? '',
        content: r.content ?? undefined,
        url: r.url,
        imageUrl: r.image_url ?? undefined,
        publishedAt: r.published_at,
        language: r.language,
        category: r.category ?? undefined,
        source: { name: r.source_name, url: r.source_url ?? '', type: 'rss', logoUrl: r.source_logo_url ?? undefined },
        interestScore: r.interest_score,
      })),
    });
  } catch (err) {
    console.error('[NewsAPI] for-you hatası:', err);
    return res.status(500).json({ error: 'For-you feed alınamadı' });
  }
});

// (route stays above the /:id catch-all routes so it isn't shadowed)
// POST /api/news/:id/view - Görüntüleme kaydeder. Anonim kullanıcılar view_count'u artırır; auth'lular article_views'e de eklenir.
router.post('/:id/view', optionalAuth, async (req: Request, res: Response) => {
  try {
    const articleId = req.params.id;
    const dwellMs = Number.isFinite(Number(req.body?.dwellMs)) ? Math.max(0, Math.floor(Number(req.body.dwellMs))) : null;
    const scrollPct = Number.isFinite(Number(req.body?.scrollPct))
      ? Math.max(0, Math.min(100, Math.floor(Number(req.body.scrollPct))))
      : null;
    const sourceCtx = typeof req.body?.sourceCtx === 'string' ? req.body.sourceCtx.slice(0, 50) : null;

    // Herkese (anonim dahil) view_count artır
    void query(`UPDATE articles SET view_count = view_count + 1 WHERE id = $1`, [articleId]).catch(() => {});

    if (req.user) {
      const r = await query(
        `INSERT INTO article_views (user_id, article_id, viewed_at, dwell_ms, scroll_pct, source_ctx)
         VALUES ($1, $2, NOW(), $3, $4, $5)
         ON CONFLICT (user_id, article_id) DO UPDATE
           SET viewed_at  = NOW(),
               dwell_ms   = GREATEST(COALESCE(article_views.dwell_ms, 0), COALESCE(EXCLUDED.dwell_ms, 0)),
               scroll_pct = GREATEST(COALESCE(article_views.scroll_pct, 0), COALESCE(EXCLUDED.scroll_pct, 0)),
               source_ctx = COALESCE(EXCLUDED.source_ctx, article_views.source_ctx)
         RETURNING id`,
        [req.user.userId, articleId, dwellMs, scrollPct, sourceCtx],
      );
      void query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [req.user.userId]).catch(() => {});
      return res.json({ ok: true, viewId: r.rows[0]?.id });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[NewsAPI] view kaydı hatası:', err);
    return res.status(500).json({ error: 'View kaydedilemedi' });
  }
});

// GET /api/news/recent-views - Kullanıcının son okuduğu makaleler ("kaldığın yerden")
router.get('/recent-views', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);
    const r = await query<any>(
      `SELECT a.id, a.title, a.description, a.url, a.image_url, a.published_at,
              a.category, a.language, a.source_name, a.source_url,
              v.viewed_at, v.dwell_ms, v.scroll_pct
         FROM article_views v
         JOIN articles a ON a.id = v.article_id
        WHERE v.user_id = $1
        ORDER BY v.viewed_at DESC
        LIMIT $2`,
      [req.user.userId, limit],
    );
    return res.json({ articles: r.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      url: r.url,
      imageUrl: r.image_url ?? undefined,
      publishedAt: r.published_at,
      language: r.language,
      category: r.category ?? undefined,
      source: { name: r.source_name, url: r.source_url ?? '', type: 'rss', logoUrl: r.source_logo_url ?? undefined },
      viewedAt: r.viewed_at,
      dwellMs: r.dwell_ms,
      scrollPct: r.scroll_pct,
    }))});
  } catch (err) {
    console.error('[NewsAPI] recent-views hatası:', err);
    return res.status(500).json({ error: 'Görüntülenen haberler alınamadı' });
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
         AND published_at <= NOW() + INTERVAL '6 hours'
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

// GET /api/news/source-stats?source=BBC+News — kaynak bazlı gerçek istatistikler
// article_count: DB'deki gerçek makale sayısı (son 30 gün)
// reader_count: bu kaynaktan makale okuyan tekil kullanıcı sayısı
router.get('/source-stats', async (req: Request, res: Response) => {
  try {
    const sourceName = String(req.query.source ?? '').trim();
    if (!sourceName) return res.status(400).json({ error: 'source parametresi gerekli' });

    const [articleRes, readerRes] = await Promise.all([
      query<{ article_count: number }>(
        `SELECT COUNT(*)::int AS article_count
         FROM articles
         WHERE LOWER(source_name) = LOWER($1)`,
        [sourceName]
      ),
      query<{ reader_count: number }>(
        `SELECT COUNT(DISTINCT av.user_id)::int AS reader_count
         FROM article_views av
         JOIN articles a ON a.id = av.article_id
         WHERE LOWER(a.source_name) = LOWER($1)`,
        [sourceName]
      ),
    ]);

    return res.json({
      article_count: articleRes.rows[0]?.article_count ?? 0,
      reader_count: readerRes.rows[0]?.reader_count ?? 0,
    });
  } catch (err) {
    console.error('[NewsAPI] source-stats hatası:', err);
    return res.status(500).json({ error: 'Kaynak istatistikleri alınamadı' });
  }
});

// GET /api/news/search?q=keyword&limit=30 - Türkçe karakter normalize ederek haber arama
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      return res.json({ articles: [] });
    }
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    const result = await query<any>(
      `SELECT id, title, description, url, image_url, published_at, language, category, source_name, source_url, source_logo_url
       FROM articles
       WHERE translate(lower(title), 'çğışöü', 'cgisou') ILIKE '%' || translate(lower($1), 'çğışöü', 'cgisou') || '%'
          OR translate(lower(COALESCE(description, '')), 'çğışöü', 'cgisou') ILIKE '%' || translate(lower($1), 'çğışöü', 'cgisou') || '%'
          OR lower(source_name) ILIKE '%' || lower($1) || '%'
          OR lower(COALESCE(category, '')) ILIKE '%' || lower($1) || '%'
       ORDER BY published_at DESC
       LIMIT $2`,
      [q, limit]
    );

    return res.json({
      articles: result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? '',
        url: r.url,
        imageUrl: r.image_url ?? undefined,
        publishedAt: r.published_at,
        language: r.language,
        category: r.category ?? undefined,
        source: { name: r.source_name, url: r.source_url ?? '', type: 'rss', logoUrl: r.source_logo_url ?? undefined },
      })),
    });
  } catch (err) {
    console.error('[NewsAPI] Arama hatası:', err);
    return res.status(500).json({ error: 'Arama başarısız' });
  }
});

// GET /api/news/trending-topics - Son 48 saatteki en fazla haber üretilen kategoriler
router.get('/trending-topics', async (_req: Request, res: Response) => {
  try {
    const result = await query<any>(
      `SELECT category AS tag, COUNT(*)::int AS count
       FROM articles
       WHERE published_at > NOW() - INTERVAL '48 hours'
         AND category IS NOT NULL AND category <> ''
       GROUP BY category
       ORDER BY count DESC
       LIMIT 15`
    );
    return res.json({ topics: result.rows });
  } catch (err) {
    console.error('[NewsAPI] Trending topics hatası:', err);
    return res.status(500).json({ error: 'Trending konular alınamadı' });
  }
});

// GET /api/news - Tüm haberleri getir (filtreli + opsiyonel kişiselleştirme).
//
// Guests: query string filtreleri (category, language, source) çalışır.
// Authenticated: ek olarak `?personalized=1` verilirse kullanıcının tercih
// dilleri/kaynakları/kategorileri filtreye eklenir. mutedSources her zaman
// uygulanır (auth'lu kullanıcı için).
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, language, source, limit = '50', offset = '0' } = req.query;
    const personalized = String(req.query.personalized ?? '') === '1' || String(req.query.personalized ?? '') === 'true';
    const cacheKey = JSON.stringify({
      userId: req.user?.userId ?? null,
      category: category ? String(category) : '',
      language: language ? String(language) : '',
      source: source ? String(source) : '',
      limit: String(limit),
      offset: String(offset),
      personalized,
    });
    const cached = newsListCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < NEWS_LIST_CACHE_TTL_MS) {
      return res.json(cached.data);
    }
    const pending = newsListPending.get(cacheKey);
    if (pending) {
      return res.json(await pending);
    }

    let prefs: UserPrefs | null = null;
    if (req.user) {
      prefs = await loadUserPrefs(req.user.userId);
    }

    // Query-string filter > user prefs filter (kullanıcı UI'da bir filtreyi
    // override etmek istiyorsa direk request'le geçsin).
    const useUserCategories = personalized && prefs && prefs.preferredCategories.length > 0 && !category;
    const useUserLanguages = personalized && prefs && prefs.preferredLanguages.length > 0 && !language;
    const useUserSources = personalized && prefs && prefs.preferredSources.length > 0 && !source;
    const useMutedSources = !!prefs && prefs.mutedSources.length > 0;

    const resultPromise = getArticles({
        category: category ? String(category) : undefined,
        language: language ? String(language) : undefined,
        source: source ? String(source) : undefined,
        categories: useUserCategories ? prefs!.preferredCategories : undefined,
        languages: useUserLanguages ? prefs!.preferredLanguages : undefined,
        sources: useUserSources ? prefs!.preferredSources : undefined,
        mutedSources: useMutedSources ? prefs!.mutedSources : undefined,
        limit: Number(limit),
        offset: Number(offset),
      })
      .then((result) => {
        newsListCache.set(cacheKey, { ts: Date.now(), data: result });
        return result;
      })
      .finally(() => {
        newsListPending.delete(cacheKey);
      });

    newsListPending.set(cacheKey, resultPromise);
    const result = await resultPromise;

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
    const fallbackContent = isLikelyArticleContent(article.content)
      ? article.content
      : null;
    const content = scraped.content ?? fallbackContent;

    return res.json({
      id: article.id,
      content,
      images: scraped.images,
      fromSource: Boolean(scraped.content),
      available: Boolean(content),
    });
  } catch (err) {
    console.error('[NewsAPI] full-content scrape error:', err);
    try {
      const article = await getArticleById(req.params.id);
      if (!article) return res.status(404).json({ error: 'Haber bulunamadı' });
      console.log(`[NewsAPI] full-content ${req.params.id}: fallback to DB imageUrl`);
      return res.json({
        id: article.id,
        content: isLikelyArticleContent(article.content) ? article.content : null,
        images: article.imageUrl ? [article.imageUrl] : [],
        fromSource: false,
        available: isLikelyArticleContent(article.content),
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
