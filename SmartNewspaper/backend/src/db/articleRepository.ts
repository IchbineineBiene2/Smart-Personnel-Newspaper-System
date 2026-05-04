import { query } from './index';
import { Article } from '../models/Article';

interface ArticleRow {
  id: string;
  title: string;
  description: string;
  content: string | null;
  url: string;
  image_url: string | null;
  published_at: Date;
  language: string;
  category: string | null;
  source_name: string;
  source_url: string | null;
  source_type: string;
  is_scraped: boolean;
}

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? undefined,
    url: row.url,
    imageUrl: row.image_url ?? undefined,
    publishedAt: row.published_at,
    language: row.language,
    category: row.category ?? undefined,
    source: {
      name: row.source_name,
      url: row.source_url ?? '',
      type: row.source_type as Article['source']['type'],
    },
  };
}

/** Makaleyi DB'ye ekler; URL zaten varsa günceller (UPSERT) */
export async function upsertArticle(article: Article): Promise<void> {
  await query(
    `INSERT INTO articles
       (id, title, description, content, url, image_url, published_at,
        language, category, source_name, source_url, source_type,
        is_scraped, scraped_at, updated_at)
     VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        CASE WHEN $13 THEN NOW() ELSE NULL END,
        NOW())
     ON CONFLICT (id) DO UPDATE SET
       content      = COALESCE(EXCLUDED.content, articles.content),
       image_url    = COALESCE(EXCLUDED.image_url, articles.image_url),
       is_scraped   = EXCLUDED.is_scraped OR articles.is_scraped,
       scraped_at   = CASE WHEN EXCLUDED.is_scraped THEN NOW() ELSE articles.scraped_at END,
       updated_at   = NOW()`,
    [
      article.id,
      article.title,
      article.description,
      article.content ?? null,
      article.url,
      article.imageUrl ?? null,
      article.publishedAt,
      article.language,
      article.category ?? null,
      article.source.name,
      article.source.url,
      // 'scraper' DB constraint'te yok — RSS zenginleştirmesi olduğu için 'rss' olarak kaydedilir
      article.source.type === 'scraper' ? 'rss' : article.source.type,
      Boolean(article.content && article.content.length > 200),
    ]
  );
}

/** Birden fazla makaleyi tek transaction içinde toplu ekler */
export async function upsertArticles(articles: Article[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const article of articles) {
    try {
      await upsertArticle(article);
      inserted++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ArticleRepo] UPSERT atlandı (${article.id}): ${msg}`);
      skipped++;
    }
  }

  return { inserted, skipped };
}

/** DB'deki makalelerin URL hash setini döndürür — duplicate tespiti için */
export async function getExistingIds(): Promise<Set<string>> {
  const result = await query<{ id: string }>('SELECT id FROM articles');
  return new Set(result.rows.map((r) => r.id));
}

/** Filtreli haber listesi */
export async function getArticles(params: {
  category?: string;
  language?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; articles: Article[] }> {
  const { category, language, source, limit = 50, offset = 0 } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (category) { conditions.push(`category = $${idx++}`); values.push(category); }
  if (language) { conditions.push(`language = $${idx++}`); values.push(language); }
  if (source)   { conditions.push(`source_name ILIKE $${idx++}`); values.push(`%${source}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM articles ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Dil filtresi yoksa dengeli interleave (tr/en/de)
  let rows: ArticleRow[];
  if (!language) {
    const langResult = await query<ArticleRow>(
      `SELECT * FROM articles ${where} ORDER BY published_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit * 3, offset]
    );
    rows = interleaveByLanguage(langResult.rows, limit, offset);
  } else {
    const result = await query<ArticleRow>(
      `SELECT * FROM articles ${where} ORDER BY published_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );
    rows = result.rows;
  }

  return { total, articles: rows.map(rowToArticle) };
}

/** Tek makale */
export async function getArticleById(id: string): Promise<Article | null> {
  const result = await query<ArticleRow>(
    'SELECT * FROM articles WHERE id = $1',
    [id]
  );
  return result.rows[0] ? rowToArticle(result.rows[0]) : null;
}

function interleaveByLanguage(rows: ArticleRow[], limit: number, _offset: number): ArticleRow[] {
  const byLang = new Map<string, ArticleRow[]>();
  for (const row of rows) {
    const lang = row.language ?? 'other';
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(row);
  }
  const lanes = [...byLang.values()];
  const maxLen = Math.max(...lanes.map((l) => l.length));
  const interleaved: ArticleRow[] = [];
  for (let i = 0; i < maxLen && interleaved.length < limit; i++) {
    for (const lane of lanes) {
      if (lane[i] && interleaved.length < limit) interleaved.push(lane[i]);
    }
  }
  return interleaved;
}
