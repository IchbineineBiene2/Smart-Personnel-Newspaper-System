-- Migration 018: Store archived article ids as text and prevent duplicate editions
ALTER TABLE archive_editions
  ALTER COLUMN selected_articles TYPE TEXT[]
  USING COALESCE(selected_articles::TEXT[], '{}'::TEXT[]);

UPDATE archive_editions
SET selected_articles = ARRAY(
  SELECT article_id
  FROM unnest(selected_articles) AS article_id
  ORDER BY article_id
);

CREATE INDEX IF NOT EXISTS idx_archive_editions_selected_articles
  ON archive_editions(user_id, selected_articles);
