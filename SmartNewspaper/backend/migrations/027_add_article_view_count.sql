-- Migration 027: Global article click/view counter

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

UPDATE articles a
SET view_count = COALESCE(v.count, 0)
FROM (
  SELECT article_id, COUNT(*)::int AS count
  FROM article_views
  GROUP BY article_id
) v
WHERE a.id = v.article_id;

CREATE INDEX IF NOT EXISTS idx_articles_view_count
  ON articles(view_count DESC, published_at DESC);
