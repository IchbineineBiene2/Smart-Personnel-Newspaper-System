-- Migration 026: Backend-synced bookmarks.
--
-- Mevcut user_preferences.bookmarks (INT[]) tipi article id'sini (VARCHAR(64) MD5)
-- tutamadığı için ayrı tablo kuruyoruz. user_preferences.bookmarks artık kullanılmıyor;
-- temizlemek için sonraki migration'da düşürülebilir.

CREATE TABLE IF NOT EXISTS saved_articles (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id  VARCHAR(64)  NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_articles_user_recent
  ON saved_articles(user_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_articles_article
  ON saved_articles(article_id);

COMMENT ON TABLE saved_articles IS 'Kullanıcı bookmarks''ı — cihazlar arası senkron.';
