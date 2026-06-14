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
  source_logo_url: string | null;
  source_type: string;
  is_scraped: boolean;
  view_count: number;
  like_count: number;
}

const ARTICLE_LIST_COLUMNS = `
  articles.id,
  articles.title,
  articles.description,
  NULL::text AS content,
  articles.url,
  articles.image_url,
  articles.published_at,
  articles.language,
  articles.category,
  articles.source_name,
  articles.source_url,
  articles.source_logo_url,
  articles.source_type,
  articles.is_scraped,
  articles.view_count
`;

const ARTICLE_DETAIL_COLUMNS = ARTICLE_LIST_COLUMNS.replace('NULL::text AS content', 'articles.content');

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
      logoUrl: row.source_logo_url ?? undefined,
    },
    viewCount: row.view_count ?? 0,
    likeCount: row.like_count ?? 0,
  };
}

/** Makaleyi DB'ye ekler; URL zaten varsa günceller (UPSERT) */
function normalizePublishedAt(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();

  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return parsed.getTime() > fiveMinutesFromNow ? new Date() : parsed;
}

export async function upsertArticle(article: Article): Promise<void> {
  const publishedAt = normalizePublishedAt(article.publishedAt);

  await query(
    `INSERT INTO articles
       (id, title, description, content, url, image_url, published_at,
        language, category, source_name, source_url, source_logo_url, source_type,
        is_scraped, scraped_at, updated_at)
     VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        CASE WHEN $14 THEN NOW() ELSE NULL END,
        NOW())
     ON CONFLICT (id) DO UPDATE SET
       content         = COALESCE(EXCLUDED.content, articles.content),
       image_url       = COALESCE(EXCLUDED.image_url, articles.image_url),
       source_logo_url = COALESCE(EXCLUDED.source_logo_url, articles.source_logo_url),
       is_scraped      = EXCLUDED.is_scraped OR articles.is_scraped,
       scraped_at      = CASE WHEN EXCLUDED.is_scraped THEN NOW() ELSE articles.scraped_at END,
       updated_at      = NOW()`,
    [
      article.id,
      article.title,
      article.description,
      article.content ?? null,
      article.url,
      article.imageUrl ?? null,
      publishedAt,
      article.language,
      article.category ?? null,
      article.source.name,
      article.source.url,
      article.source.logoUrl ?? null,
      // 'scraper' DB constraint'te yok — RSS zenginleştirmesi olduğu için 'rss' olarak kaydedilir
      article.source.type === 'scraper' ? 'rss' : article.source.type,
      Boolean(article.content && article.content.length > 200),
    ]
  );

  await ensurePublisherSystemUser(article.source.name);
}

async function ensurePublisherSystemUser(sourceName: string): Promise<void> {
  const trimmed = sourceName.trim();
  if (!trimmed) return;

  // Explicit ::text cast on every $1 — different functions (LOWER/REGEXP_REPLACE/MD5)
  // make Postgres' type inference inconsistent and the INSERT errors out.
  await query(
    `INSERT INTO users (username, email, password_hash, role, status)
     VALUES (
       $1::text,
       CONCAT(
         LOWER(REGEXP_REPLACE($1::text, '[^a-zA-Z0-9]+', '-', 'g')),
         '-',
         SUBSTRING(MD5($1::text) FROM 1 FOR 10),
         '@publisher.local'
       ),
       'system-managed-publisher',
       'publisher',
       'active'
     )
     ON CONFLICT (username) DO NOTHING`,
    [trimmed]
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
  const result = await query<{ id: string }>(
    `SELECT id
     FROM articles
     WHERE published_at >= NOW() - INTERVAL '30 days'`
  );
  return new Set(result.rows.map((r) => r.id));
}

/** Filtreli haber listesi */
export async function getArticles(params: {
  category?: string;
  language?: string;
  source?: string;
  /** Multi-value filters (mutually exclusive ile single-value: array verilirse override). */
  categories?: string[];
  languages?: string[];
  sources?: string[];
  mutedSources?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ total: number; articles: Article[] }> {
  const {
    category,
    language,
    source,
    categories,
    languages,
    sources,
    mutedSources,
    limit = 50,
    offset = 0,
  } = params;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 150);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // categories: array override > single value
  if (Array.isArray(categories) && categories.length > 0) {
    conditions.push(`category = ANY($${idx++})`);
    values.push(categories);
  } else if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }

  // languages: array override > single value
  const hasLanguagesArray = Array.isArray(languages) && languages.length > 0;
  if (hasLanguagesArray) {
    conditions.push(`language = ANY($${idx++})`);
    values.push(languages);
  } else if (language) {
    conditions.push(`language = $${idx++}`);
    values.push(language);
  }

  if (Array.isArray(sources) && sources.length > 0) {
    conditions.push(`source_name = ANY($${idx++})`);
    values.push(sources);
  } else if (source) {
    conditions.push(`source_name ILIKE $${idx++}`);
    values.push(`%${source}%`);
  }

  if (Array.isArray(mutedSources) && mutedSources.length > 0) {
    conditions.push(`source_name <> ALL($${idx++})`);
    values.push(mutedSources);
  }

  conditions.push(`published_at <= NOW() + INTERVAL '6 hours'`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const pageWithLikesSql = (pageLimitParam: number, offsetParam: number) => `
    WITH page AS (
      SELECT ${ARTICLE_LIST_COLUMNS}
      FROM articles
      ${where}
      ORDER BY published_at DESC
      LIMIT $${pageLimitParam} OFFSET $${offsetParam}
    ),
    like_counts AS (
      SELECT article_id, COUNT(*)::int AS like_count
      FROM article_likes
      WHERE article_id IN (SELECT id FROM page)
      GROUP BY article_id
    )
    SELECT page.*, COALESCE(like_counts.like_count, 0) AS like_count
    FROM page
    LEFT JOIN like_counts ON like_counts.article_id = page.id
    ORDER BY page.published_at DESC`;

  // Tek dil yoksa (ne single language ne 1-elemanlı languages array), dengeli interleave (tr/en/de)
  const singleLang = language || (hasLanguagesArray && languages!.length === 1);
  let rows: ArticleRow[];
  if (!singleLang) {
    const langResult = await query<ArticleRow>(
      pageWithLikesSql(idx, idx + 1),
      [...values, safeLimit * 3, safeOffset],
    );
    rows = interleaveByLanguage(langResult.rows, safeLimit, safeOffset);
  } else {
    const result = await query<ArticleRow>(
      pageWithLikesSql(idx, idx + 1),
      [...values, safeLimit, safeOffset],
    );
    rows = result.rows;
  }

  return { total: safeOffset + rows.length, articles: rows.map(rowToArticle) };
}

/** Tek makale */
export async function getArticleById(id: string): Promise<Article | null> {
  const result = await query<ArticleRow>(
    `SELECT ${ARTICLE_DETAIL_COLUMNS}, COALESCE(_lc.like_count, 0) AS like_count
     FROM articles
     LEFT JOIN (SELECT article_id, COUNT(*)::int AS like_count FROM article_likes GROUP BY article_id) _lc ON _lc.article_id = articles.id
     WHERE articles.id = $1`,
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
