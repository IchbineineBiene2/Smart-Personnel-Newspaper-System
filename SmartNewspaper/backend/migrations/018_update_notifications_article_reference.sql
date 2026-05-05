-- Migration 018: Match notification article references with article ids
ALTER TABLE notifications
  ALTER COLUMN related_article_id TYPE VARCHAR(32)
  USING related_article_id::text;

CREATE INDEX IF NOT EXISTS idx_notifications_related_article_id
  ON notifications(related_article_id);
